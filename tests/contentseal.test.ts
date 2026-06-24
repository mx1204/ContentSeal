import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { analyseAndStoreMedia, InvalidImageError, inspectImageContent } from "@/lib/analysis";
import { buildDecision } from "@/lib/decision";
import { deleteProofReceipt, getReceipt, insertProofReceipt, resetDatabaseForTests } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { computePHashVariants, phashSimilarity } from "@/lib/phash";
import { generateTrustCard } from "@/lib/trust-card";
import { verifyAnalysis } from "@/lib/verification";
import type { MediaAnalysis, ReceiptSummary, VerificationEvidence } from "@/lib/types";

async function imageFromSvg(svg: string) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function proofPoster() {
  return imageFromSvg(`
    <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="600" fill="#f7f5ef"/>
      <rect x="60" y="60" width="780" height="480" fill="#345144"/>
      <text x="110" y="180" font-size="70" fill="#ffffff" font-family="Arial">ContentSeal Summit</text>
      <text x="110" y="290" font-size="48" fill="#dbeade" font-family="Arial">27 June 2026</text>
      <circle cx="720" cy="400" r="80" fill="#d89a35"/>
    </svg>
  `);
}

async function unrelatedImage() {
  return imageFromSvg(`
    <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="600" fill="#17211c"/>
      <circle cx="180" cy="160" r="120" fill="#b95f43"/>
      <circle cx="650" cy="430" r="160" fill="#dbeade"/>
      <path d="M80 520 L820 80" stroke="#ffffff" stroke-width="34"/>
    </svg>
  `);
}

function fakeReceipt(): ReceiptSummary {
  return {
    id: "receipt_1",
    title: "Original poster",
    creatorClaim: "ContentSeal Team",
    proofCreatedAt: "2026-06-23T00:00:00.000Z",
    mediaId: "missing_asset",
    sha256: "abc",
    metadataStatus: "present",
    width: 900,
    height: 600
  };
}

function fakeAnalysis(overrides: Partial<MediaAnalysis> = {}): MediaAnalysis {
  return {
    id: "analysis_1",
    sha256: "hash",
    mimeType: "image/png",
    sizeBytes: 10,
    metadata: {
      status: "missing",
      sizeBytes: 10,
      hasExif: false,
      redactedFields: [],
      publicFields: {}
    },
    pHashes: [],
    c2pa: { status: "not_checked", actions: [] },
    watermark: { status: "unavailable", explanation: "No detector configured." },
    classifier: {
      status: "not_run",
      detectedArtifacts: [],
      limitations: "No classifier configured."
    },
    ocrText: "",
    ocrStatus: "unavailable",
    createdAt: "2026-06-23T00:00:00.000Z",
    ...overrides
  };
}

describe("ContentSeal media detection", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  it("computes deterministic SHA-256 hashes", () => {
    const original = Buffer.from("contentseal");
    expect(sha256(original)).toBe(sha256(Buffer.from("contentseal")));
    expect(sha256(original)).not.toBe(sha256(Buffer.from("contentseal!")));
  });

  it("rejects files that cannot be decoded as images", async () => {
    await expect(inspectImageContent(Buffer.from("not an image"))).rejects.toBeInstanceOf(
      InvalidImageError
    );
    await expect(
      analyseAndStoreMedia({
        buffer: Buffer.from("not an image"),
        mimeType: "image/png",
        originalName: "fake.png"
      })
    ).rejects.toBeInstanceOf(InvalidImageError);
  });

  it("keeps pHash similarity high for recompressed copies and lower for unrelated images", async () => {
    const original = await proofPoster();
    const recompressed = await sharp(original).jpeg({ quality: 72 }).toBuffer();
    const unrelated = await unrelatedImage();

    const originalHash = (await computePHashVariants(original))[0].hash;
    const recompressedHash = (await computePHashVariants(recompressed))[0].hash;
    const unrelatedHash = (await computePHashVariants(unrelated))[0].hash;

    expect(phashSimilarity(originalHash, recompressedHash)).toBeGreaterThanOrEqual(0.85);
    expect(phashSimilarity(originalHash, unrelatedHash)).toBeLessThan(0.85);
  });

  it("prioritizes exact hash matches over AI signals", () => {
    const decision = buildDecision({
      analysis: fakeAnalysis({
        classifier: {
          status: "ai_signal_found",
          confidence: 0.9,
          detectedArtifacts: ["mock"],
          limitations: "mock"
        }
      }),
      exactReceipt: fakeReceipt(),
      visualMatch: null
    });

    expect(decision.trustLabel).toBe("verified_original");
    expect(decision.badges).toContain("ai_origin_signal_found");
  });

  it("does not turn missing metadata into AI or fake claims", () => {
    const evidence: VerificationEvidence = {
      exactHashMatch: false,
      visualSimilarityScore: null,
      matchedReceipt: null,
      c2paStatus: "missing",
      watermarkStatus: "unavailable",
      metadataStatus: "missing",
      classifierStatus: "not_run",
      trustLabel: "no_verified_origin_found",
      ocrConflict: false,
      editSignal: false,
      aiSignal: false
    };
    const card = generateTrustCard(evidence);
    const text = JSON.stringify(card).toLowerCase();

    expect(text).not.toContain("fake");
    expect(text).not.toContain("definitely");
    expect(text).toContain("metadata is missing");
  });

  it("creates a proof receipt and verifies the exact original", async () => {
    const original = await proofPoster();
    const proofAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster.png"
    });
    const receiptId = insertProofReceipt({
      title: "ContentSeal Summit",
      creatorClaim: "ContentSeal Team",
      mediaId: proofAnalysis.mediaId ?? ""
    });

    const uploadedAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster-copy.png"
    });
    const verification = await verifyAnalysis(uploadedAnalysis);

    expect(receiptId).toBeTruthy();
    expect(verification.trust_label).toBe("verified_original");
    expect(verification.exact_hash_match).toBe(true);
    expect(verification.matched_receipt_id).toBe(receiptId);
  });

  it("detects visually similar copies when file hash differs", async () => {
    const original = await proofPoster();
    const proofAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster.png"
    });
    insertProofReceipt({
      title: "ContentSeal Summit",
      creatorClaim: "ContentSeal Team",
      mediaId: proofAnalysis.mediaId ?? ""
    });

    const repost = await sharp(original).jpeg({ quality: 65 }).toBuffer();
    const repostAnalysis = await analyseAndStoreMedia({
      buffer: repost,
      mimeType: "image/jpeg",
      originalName: "poster-repost.jpg"
    });
    const verification = await verifyAnalysis(repostAnalysis);

    expect(verification.exact_hash_match).toBe(false);
    expect(verification.similarity_score).toBeGreaterThanOrEqual(0.85);
    expect(["modified_copy", "screenshot_repost_match"]).toContain(verification.trust_label);
  });

  it("matches screenshot-style padding with receipt-aspect center crop", async () => {
    const original = await proofPoster();
    const proofAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster.png"
    });
    insertProofReceipt({
      title: "ContentSeal Summit",
      creatorClaim: "ContentSeal Team",
      mediaId: proofAnalysis.mediaId ?? ""
    });

    const screenshot = await sharp({
      create: {
        width: 900,
        height: 700,
        channels: 4,
        background: "#222222"
      }
    })
      .composite([{ input: original, left: 0, top: 50 }])
      .png()
      .toBuffer();
    const screenshotAnalysis = await analyseAndStoreMedia({
      buffer: screenshot,
      mimeType: "image/png",
      originalName: "poster-screenshot.png"
    });
    const verification = await verifyAnalysis(screenshotAnalysis);

    expect(verification.exact_hash_match).toBe(false);
    expect(verification.similarity_score).toBeGreaterThanOrEqual(0.85);
    expect(verification.trust_label).toBe("screenshot_repost_match");
  });

  it("returns no verified origin for unrelated media", async () => {
    const original = await proofPoster();
    const proofAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster.png"
    });
    insertProofReceipt({
      title: "ContentSeal Summit",
      creatorClaim: "ContentSeal Team",
      mediaId: proofAnalysis.mediaId ?? ""
    });

    const unknown = await unrelatedImage();
    const unknownAnalysis = await analyseAndStoreMedia({
      buffer: unknown,
      mimeType: "image/png",
      originalName: "unknown.png"
    });
    const verification = await verifyAnalysis(unknownAnalysis);

    expect(verification.trust_label).toBe("no_verified_origin_found");
    expect(verification.exact_hash_match).toBe(false);
  });

  it("removes deleted proof receipts from future verification matches", async () => {
    const original = await proofPoster();
    const proofAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster.png"
    });
    const receiptId = insertProofReceipt({
      title: "ContentSeal Summit",
      creatorClaim: "ContentSeal Team",
      mediaId: proofAnalysis.mediaId ?? ""
    });

    const deletion = deleteProofReceipt(receiptId);
    expect(deletion.deleted).toBe(true);
    expect(getReceipt(receiptId)).toBeNull();

    const uploadedAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster-after-delete.png"
    });
    const verification = await verifyAnalysis(uploadedAnalysis);

    expect(verification.trust_label).toBe("no_verified_origin_found");
    expect(verification.matched_receipt_id).toBeNull();
  });

  it("verifies against portable proof receipts when server receipts are unavailable", async () => {
    const original = await proofPoster();
    const proofAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster.png"
    });
    const receiptId = insertProofReceipt({
      title: "ContentSeal Summit",
      creatorClaim: "ContentSeal Team",
      mediaId: proofAnalysis.mediaId ?? ""
    });
    const portableReceipt = getReceipt(receiptId);
    expect(portableReceipt).toBeTruthy();

    resetDatabaseForTests();

    const uploadedAnalysis = await analyseAndStoreMedia({
      buffer: original,
      mimeType: "image/png",
      originalName: "poster-portable.png"
    });
    const verification = await verifyAnalysis(uploadedAnalysis, [
      {
        receipt: portableReceipt!,
        pHashes: proofAnalysis.pHashes
      }
    ]);

    expect(verification.trust_label).toBe("verified_original");
    expect(verification.matched_receipt_id).toBe(receiptId);
    expect(verification.exact_hash_match).toBe(true);
  });
});
