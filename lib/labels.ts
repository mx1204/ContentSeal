import type {
  AiUsageDeclaration,
  CreatorTrustLevel,
  ProofStatus,
  TrustBadge,
  TrustLabel
} from "./types";

export const TRUST_LABEL_COPY: Record<TrustLabel, string> = {
  verified_original: "Verified Original",
  modified_copy: "Changed Copy Risk",
  screenshot_repost_match: "Source Recovered From Screenshot",
  expired_content: "Verified Previous Version / Expired",
  older_verified_version: "Older Verified Version",
  no_verified_origin_found: "No Verified Origin Found",
  conflicting_signals: "Conflicting Signals"
};

export const TRUST_BADGE_COPY: Record<TrustBadge, string> = {
  ai_origin_signal_found: "AI-Origin Signal Found",
  edit_signal_found: "Edit Signal Found",
  visual_match_found: "Visual Match Found",
  metadata_missing: "Metadata Missing",
  c2pa_present: "C2PA Present",
  c2pa_invalid: "C2PA Invalid",
  watermark_unavailable: "Watermark Unavailable",
  classifier_inconclusive: "Classifier Inconclusive"
};

export const CREATOR_TRUST_COPY: Record<CreatorTrustLevel, string> = {
  self_declared: "Self-declared",
  email_verified: "Email verified",
  domain_verified: "Domain verified",
  team_co_signed: "Team co-signed",
  organisation_verified: "Organisation verified"
};

export const AI_USAGE_COPY: Record<AiUsageDeclaration, string> = {
  human_created: "Human-created",
  ai_assisted: "AI-assisted",
  ai_generated_human_review: "AI-generated with human review",
  fully_ai_generated: "Fully AI-generated",
  unknown: "Unknown"
};

export const PROOF_STATUS_COPY: Record<ProofStatus, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
  disputed: "Disputed",
  updated_version_available: "Updated version available"
};
