import { buildDecision } from "./decision";
import { computePHash, phashSimilarity } from "./phash";
import {
  findReceiptByHashStore,
  getAllReceiptPHashesStore,
  getAssetStore,
  getReceiptStore,
  insertVerificationWithTrustCardStore,
  readStoredMediaBuffer
} from "./store";
import { generateTrustCard } from "./trust-card";
import type {
  MediaAnalysis,
  PortableProofReceipt,
  SimilarityMatch,
  VerificationResult
} from "./types";

function receiptAspectRatio(match: SimilarityMatch) {
  const width = match.receipt.width;
  const height = match.receipt.height;
  return width && height && height > 0 ? width / height : null;
}

async function improveWithReceiptAspectCrop(
  analysis: MediaAnalysis,
  best: SimilarityMatch | null
): Promise<SimilarityMatch | null> {
  if (!best || !analysis.mediaId) {
    return best;
  }

  const aspectRatio = receiptAspectRatio(best);
  if (!aspectRatio || best.score >= 0.95) {
    return best;
  }

  const uploadedAsset = await readStoredMediaBuffer(analysis.mediaId);
  if (!uploadedAsset) {
    return best;
  }

  try {
    const cropped = await computePHash(uploadedAsset.buffer, "center_crop", aspectRatio);
    const storedReceiptHashes = (await getAllReceiptPHashesStore()).filter(
      (storedHash) => storedHash.receiptId === best.receipt.id
    );
    return storedReceiptHashes.reduce<SimilarityMatch>((currentBest, storedHash) => {
      const score = phashSimilarity(cropped.hash, storedHash.phash);
      if (score > currentBest.score) {
        return {
          receipt: best.receipt,
          score,
          uploadedVariant: "center_crop",
          receiptVariant: storedHash.variant
        };
      }
      return currentBest;
    }, best);
  } catch {
    return best;
  }
}

function findBestPortableVisualMatch(
  analysis: MediaAnalysis,
  portableProofs: PortableProofReceipt[]
): SimilarityMatch | null {
  let best: SimilarityMatch | null = null;

  for (const uploadedHash of analysis.pHashes) {
    for (const proof of portableProofs) {
      for (const storedHash of proof.pHashes) {
        const score = phashSimilarity(uploadedHash.hash, storedHash.hash);
        if (!best || score > best.score) {
          best = {
            receipt: proof.receipt,
            score,
            uploadedVariant: uploadedHash.variant,
            receiptVariant: storedHash.variant
          };
        }
      }
    }
  }

  return best;
}

export async function findBestVisualMatch(
  analysis: MediaAnalysis,
  portableProofs: PortableProofReceipt[] = []
): Promise<SimilarityMatch | null> {
  let best: SimilarityMatch | null = null;
  const receiptHashes = await getAllReceiptPHashesStore();

  for (const uploadedHash of analysis.pHashes) {
    for (const storedHash of receiptHashes) {
      const receipt = storedHash.receiptId ? await getReceiptStore(storedHash.receiptId) : null;
      if (!receipt) {
        continue;
      }
      const score = phashSimilarity(uploadedHash.hash, storedHash.phash);
      if (!best || score > best.score) {
        best = {
          receipt,
          score,
          uploadedVariant: uploadedHash.variant,
          receiptVariant: storedHash.variant
        };
      }
    }
  }

  const portableBest = findBestPortableVisualMatch(analysis, portableProofs);
  if (portableBest && (!best || portableBest.score > best.score)) {
    best = portableBest;
  }

  return improveWithReceiptAspectCrop(analysis, best);
}

function findPortableReceiptByHash(sha: string, portableProofs: PortableProofReceipt[]) {
  return portableProofs.find((proof) => proof.receipt.sha256 === sha)?.receipt ?? null;
}

export async function verifyAnalysis(
  analysis: MediaAnalysis,
  portableProofs: PortableProofReceipt[] = []
): Promise<VerificationResult> {
  const exactReceipt =
    (await findReceiptByHashStore(analysis.sha256)) ??
    findPortableReceiptByHash(analysis.sha256, portableProofs);
  const visualMatch = exactReceipt ? null : await findBestVisualMatch(analysis, portableProofs);
  const matchedReceiptForOcr = exactReceipt ?? visualMatch?.receipt ?? null;
  const matchedAssetForOcr = matchedReceiptForOcr
    ? await getAssetStore(matchedReceiptForOcr.mediaId)
    : null;
  const decision = buildDecision({
    analysis,
    exactReceipt,
    visualMatch,
    matchedAssetOcrText: matchedAssetForOcr?.ocrText
  });
  const card = generateTrustCard(decision.evidence);
  const matchedReceiptId = decision.evidence.matchedReceipt?.id ?? null;
  const matchedReceiptIdForStorage =
    matchedReceiptId && (await getReceiptStore(matchedReceiptId)) ? matchedReceiptId : null;
  const verificationId = await insertVerificationWithTrustCardStore({
    analysisId: analysis.id,
    matchedReceiptId: matchedReceiptIdForStorage,
    exactHashMatch: decision.evidence.exactHashMatch,
    similarityScore: decision.evidence.visualSimilarityScore,
    trustLabel: decision.trustLabel,
    badges: decision.badges,
    evidence: decision.evidence,
    card
  });

  return {
    id: verificationId,
    trust_label: decision.trustLabel,
    matched_receipt_id: matchedReceiptId,
    exact_hash_match: decision.evidence.exactHashMatch,
    similarity_score: decision.evidence.visualSimilarityScore,
    badges: decision.badges,
    evidence: decision.evidence,
    ai_trust_card: card,
    analysis
  };
}
