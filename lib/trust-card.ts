import type { TrustCard, TrustLabel, VerificationEvidence } from "./types";

const CARD_SUMMARIES: Record<TrustLabel, string> = {
  verified_original:
    "This file exactly matches a ContentSeal proof receipt. The file-level proof is deterministic, while origin proof should still be considered separately from the truth of the content.",
  modified_copy:
    "This image is visually similar to a known ContentSeal proof receipt, but it is not the exact original file.",
  screenshot_repost_match:
    "This appears to be a screenshot or repost of verified content, but it is not the exact original file.",
  no_verified_origin_found:
    "ContentSeal did not find an exact or strong visual match to a stored proof receipt for this upload.",
  conflicting_signals:
    "This upload is visually related to a proof receipt, but one or more signals conflict with the stored original."
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
      verified.push("The uploaded image is visually similar to a known ContentSeal proof receipt.");
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

  if (evidence.metadataStatus === "missing") {
    unverified.push("Metadata is missing, so the sharing path cannot be confirmed.");
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
    unverified.push("An edit or repost signal was detected.");
  }

  if (evidence.ocrConflict) {
    unverified.push("Detected text appears materially different from the matched proof receipt.");
  }

  let recommended_action = "Review the evidence before sharing or relying on this media.";
  if (evidence.trustLabel === "verified_original") {
    recommended_action =
      "Open the proof receipt to review who claimed the origin and when the receipt was created.";
  } else if (evidence.trustLabel === "screenshot_repost_match") {
    recommended_action = "Open the original proof page before sharing this reposted version.";
  } else if (evidence.trustLabel === "modified_copy") {
    recommended_action = "Compare this copy with the original proof receipt before sharing.";
  } else if (evidence.trustLabel === "conflicting_signals") {
    recommended_action = "Treat this version cautiously and compare it with the original proof receipt.";
  }

  return {
    summary: CARD_SUMMARIES[evidence.trustLabel],
    what_we_verified: Array.from(new Set(verified)),
    what_we_could_not_verify: Array.from(new Set(unverified)),
    recommended_action
  };
}
