import { hasEditSoftwareSignal, hasScreenshotOrPlatformMetadata } from "./metadata";
import { isMaterialOcrConflict } from "./ocr";
import type {
  C2paInspection,
  ClassifierInspection,
  MediaAnalysis,
  ReceiptSummary,
  SimilarityMatch,
  TrustBadge,
  TrustLabel,
  VerificationEvidence,
  WatermarkInspection
} from "./types";

function c2paHasAiSignal(c2pa: C2paInspection) {
  const haystack = [
    c2pa.claimGenerator,
    c2pa.summary,
    ...c2pa.actions
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /ai|generative|synthetic|midjourney|stable diffusion|dall|firefly/.test(haystack);
}

function c2paHasEditSignal(c2pa: C2paInspection) {
  const haystack = [c2pa.summary, ...c2pa.actions].filter(Boolean).join(" ").toLowerCase();
  return /edit|edited|crop|transform|resize|adjust|composite|export/.test(haystack);
}

function effectiveProofStatus(receipt: ReceiptSummary | null) {
  if (!receipt) {
    return null;
  }

  if (receipt.expiryDate && new Date(receipt.expiryDate).getTime() < Date.now()) {
    return "expired";
  }

  return receipt.proofStatus ?? "active";
}

function hasScreenshotTransformSignal(analysis: MediaAnalysis, receipt: ReceiptSummary | null) {
  if (!receipt?.width || !receipt.height || !analysis.metadata.width || !analysis.metadata.height) {
    return analysis.metadata.status === "missing";
  }

  const uploadedRatio = analysis.metadata.width / analysis.metadata.height;
  const receiptRatio = receipt.width / receipt.height;
  const ratioDelta = Math.abs(uploadedRatio - receiptRatio);
  const widthDelta = Math.abs(analysis.metadata.width - receipt.width);
  const heightDelta = Math.abs(analysis.metadata.height - receipt.height);
  const densitySignal = typeof analysis.metadata.density === "number" && analysis.metadata.density >= 140;
  const anyDimensionChange = widthDelta > 8 || heightDelta > 8;

  return (
    ratioDelta > 0.01 ||
    widthDelta > 24 ||
    heightDelta > 24 ||
    (anyDimensionChange && (densitySignal || analysis.metadata.status === "missing"))
  );
}

export function classifyAiSignal(input: {
  c2pa: C2paInspection;
  watermark: WatermarkInspection;
  classifier: ClassifierInspection;
}) {
  return (
    c2paHasAiSignal(input.c2pa) ||
    input.watermark.status === "found" ||
    input.watermark.status === "weak_signal" ||
    input.classifier.status === "ai_signal_found"
  );
}

export function buildDecision(input: {
  analysis: MediaAnalysis;
  exactReceipt: ReceiptSummary | null;
  visualMatch: SimilarityMatch | null;
  matchedAssetOcrText?: string;
}) {
  const { analysis, exactReceipt, visualMatch, matchedAssetOcrText } = input;
  const strongVisualMatch = Boolean(visualMatch && visualMatch.score >= 0.85);
  const possibleVisualMatch = Boolean(visualMatch && visualMatch.score >= 0.7);
  const matchedReceipt = exactReceipt ?? (possibleVisualMatch ? visualMatch?.receipt ?? null : null);
  const ocrConflict =
    Boolean(strongVisualMatch && matchedAssetOcrText) &&
    isMaterialOcrConflict(matchedAssetOcrText ?? "", analysis.ocrText);
  const screenshotTransformSignal = hasScreenshotTransformSignal(analysis, matchedReceipt);
  const screenshotRecoverySignal =
    strongVisualMatch &&
    !exactReceipt &&
    !ocrConflict &&
    (screenshotTransformSignal || hasScreenshotOrPlatformMetadata(analysis.metadata));

  const editSignal =
    hasEditSoftwareSignal(analysis.metadata) ||
    c2paHasEditSignal(analysis.c2pa) ||
    Boolean(strongVisualMatch && !exactReceipt && !screenshotRecoverySignal);
  const aiSignal = classifyAiSignal({
    c2pa: analysis.c2pa,
    watermark: analysis.watermark,
    classifier: analysis.classifier
  });
  const proofStatus = effectiveProofStatus(matchedReceipt);

  let trustLabel: TrustLabel = "no_verified_origin_found";
  if (proofStatus === "revoked" || proofStatus === "disputed") {
    trustLabel = "conflicting_signals";
  } else if (proofStatus === "expired") {
    trustLabel = "expired_content";
  } else if (proofStatus === "updated_version_available") {
    trustLabel = "older_verified_version";
  } else if (exactReceipt) {
    trustLabel = "verified_original";
  } else if (strongVisualMatch && (ocrConflict || analysis.c2pa.status === "invalid")) {
    trustLabel = "conflicting_signals";
  } else if (screenshotRecoverySignal) {
    trustLabel = "screenshot_repost_match";
  } else if (strongVisualMatch) {
    trustLabel = "modified_copy";
  }

  const badges = new Set<TrustBadge>();
  if (strongVisualMatch || exactReceipt) {
    badges.add("visual_match_found");
  }
  if (analysis.metadata.status === "missing") {
    badges.add("metadata_missing");
  }
  if (analysis.c2pa.status === "present") {
    badges.add("c2pa_present");
  }
  if (analysis.c2pa.status === "invalid") {
    badges.add("c2pa_invalid");
  }
  if (analysis.watermark.status === "unavailable") {
    badges.add("watermark_unavailable");
  }
  if (analysis.classifier.status === "inconclusive") {
    badges.add("classifier_inconclusive");
  }
  if (aiSignal) {
    badges.add("ai_origin_signal_found");
  }
  if (editSignal || ocrConflict) {
    badges.add("edit_signal_found");
  }

  const evidence: VerificationEvidence = {
    exactHashMatch: Boolean(exactReceipt),
    visualSimilarityScore: exactReceipt ? 1 : visualMatch?.score ?? null,
    matchedReceipt,
    c2paStatus: analysis.c2pa.status,
    watermarkStatus: analysis.watermark.status,
    metadataStatus: analysis.metadata.status,
    classifierStatus: analysis.classifier.status,
    trustLabel,
    creatorClaim: matchedReceipt?.creatorClaim,
    creatorTrustLevel: matchedReceipt?.creatorTrustLevel,
    aiUsageDeclaration: matchedReceipt?.aiUsageDeclaration,
    proofStatus: proofStatus ?? undefined,
    expiryDate: matchedReceipt?.expiryDate,
    versionNumber: matchedReceipt?.versionNumber,
    officialSourceUrl: matchedReceipt?.officialSourceUrl,
    proofCreatedAt: matchedReceipt?.proofCreatedAt,
    ocrConflict,
    editSignal,
    aiSignal
  };

  return {
    trustLabel,
    badges: Array.from(badges),
    evidence
  };
}
