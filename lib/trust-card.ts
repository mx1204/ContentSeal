import { AI_USAGE_COPY, CREATOR_TRUST_COPY, PROOF_STATUS_COPY } from "./labels";
import type { TrustCard, TrustLabel, VerificationEvidence } from "./types";

const CARD_SUMMARIES: Record<TrustLabel, string> = {
  verified_original:
    "This file exactly matches a ContentSeal proof receipt. The original source was recovered with deterministic file-level evidence.",
  modified_copy:
    "This image is visually linked to a known ContentSeal proof receipt, but it is not the exact original file. Treat it as a changed copy until the proof page is checked.",
  screenshot_repost_match:
    "Metadata may be stripped, but ContentSeal recovered a visually related proof receipt. This looks like a screenshot, crop, or repost rather than the original file.",
  expired_content:
    "ContentSeal recovered a known proof receipt, but that receipt is expired or no longer current.",
  older_verified_version:
    "ContentSeal recovered an older verified receipt. A newer version may be available from the official source.",
  no_verified_origin_found:
    "ContentSeal could not recover a trusted source for this upload from the current proof database.",
  conflicting_signals:
    "ContentSeal recovered a related proof receipt, but one or more signals conflict with the stored original."
};

export function generateTrustCard(evidence: VerificationEvidence): TrustCard {
  const verified: string[] = [];
  const unverified: string[] = [];

  if (evidence.exactHashMatch) {
    verified.push("The uploaded file hash exactly matches a stored ContentSeal proof receipt.");
  } else {
    unverified.push("The uploaded file is not the exact original stored in the proof receipt.");
  }

  if (evidence.matchedReceipt && evidence.visualSimilarityScore != null) {
    if (evidence.visualSimilarityScore >= 0.85) {
      verified.push("A trusted source was recovered through visual similarity, even if metadata is missing.");
    } else {
      unverified.push("Only a weak or possible visual relationship was found.");
    }
    verified.push(`The matched receipt was created for "${evidence.matchedReceipt.title}".`);
  } else {
    unverified.push("No matching proof receipt was found for this media.");
  }

  if (evidence.creatorClaim) {
    verified.push("The matched receipt includes a creator or publisher claim.");
  }

  if (evidence.creatorTrustLevel) {
    const trustLevel = CREATOR_TRUST_COPY[evidence.creatorTrustLevel];
    verified.push(`Creator trust level on the matched receipt: ${trustLevel}.`);
    if (evidence.creatorTrustLevel === "self_declared") {
      unverified.push("Creator identity is self-declared and has not been independently verified.");
    }
  }

  if (evidence.aiUsageDeclaration) {
    verified.push(
      `Declared AI usage on the matched receipt: ${AI_USAGE_COPY[evidence.aiUsageDeclaration]}.`
    );
    unverified.push("Declared AI usage is creator-provided context unless supported by C2PA or tool metadata.");
  }

  if (evidence.proofStatus) {
    const status = PROOF_STATUS_COPY[evidence.proofStatus];
    verified.push(`Proof status on the matched receipt: ${status}.`);
    if (evidence.proofStatus !== "active") {
      unverified.push("The matched proof receipt should not be treated as the current active version.");
    }
  }

  if (evidence.versionNumber) {
    verified.push(`Receipt version: ${evidence.versionNumber}.`);
  }

  if (evidence.officialSourceUrl) {
    verified.push("The matched receipt includes an official source URL for follow-up.");
  }

  if (evidence.metadataStatus === "missing") {
    unverified.push("Metadata is missing or stripped, so the sharing path cannot be trusted by metadata alone.");
  } else if (evidence.metadataStatus === "partial") {
    unverified.push("Only partial metadata was available for this file.");
  } else {
    verified.push("Basic public metadata was extracted and reviewed.");
  }

  if (evidence.c2paStatus === "present") {
    verified.push("Content Credentials were detected and included as a provenance signal.");
  } else if (evidence.c2paStatus === "invalid" || evidence.c2paStatus === "unreadable") {
    unverified.push("Content Credentials were present but could not be treated as a valid provenance signal.");
  } else if (evidence.c2paStatus === "missing") {
    unverified.push("No Content Credentials were found in this upload.");
  } else {
    unverified.push("C2PA inspection was not configured for this environment.");
  }

  if (evidence.aiSignal) {
    unverified.push("An AI-origin signal was detected and should be considered alongside stronger proof evidence.");
  }

  if (evidence.editSignal) {
    unverified.push("An edit, repost, crop, compression, or re-export signal was detected.");
  }

  if (evidence.ocrConflict) {
    unverified.push("Detected text appears materially different from the matched proof receipt.");
  }

  let recommended_action = "Review the evidence before sharing or relying on this media.";
  if (evidence.trustLabel === "verified_original") {
    recommended_action =
      "Open the proof receipt to review who issued the original and when it was sealed.";
  } else if (evidence.trustLabel === "expired_content") {
    recommended_action = "Check the latest official source before resharing this previously verified version.";
  } else if (evidence.trustLabel === "older_verified_version") {
    recommended_action = "Open the proof page or official source to find the newer current version.";
  } else if (evidence.trustLabel === "screenshot_repost_match") {
    recommended_action = "Open the recovered proof page before sharing this screenshot or repost.";
  } else if (evidence.trustLabel === "modified_copy") {
    recommended_action = "Compare this copy with the recovered original proof before sharing or acting on it.";
  } else if (evidence.trustLabel === "conflicting_signals") {
    recommended_action = "Treat this version cautiously and compare it with the original proof receipt.";
  } else if (evidence.trustLabel === "no_verified_origin_found") {
    recommended_action = "Do not treat this as a verdict. Ask the sender for the original source or a ContentSeal proof link.";
  }

  return {
    summary: CARD_SUMMARIES[evidence.trustLabel],
    what_we_verified: Array.from(new Set(verified)),
    what_we_could_not_verify: Array.from(new Set(unverified)),
    recommended_action
  };
}
