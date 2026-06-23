import type { TrustBadge, TrustLabel } from "./types";

export const TRUST_LABEL_COPY: Record<TrustLabel, string> = {
  verified_original: "Verified Original",
  modified_copy: "Modified Copy",
  screenshot_repost_match: "Screenshot / Repost Match",
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
