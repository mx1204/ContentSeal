export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

export type TrustLabel =
  | "verified_original"
  | "modified_copy"
  | "screenshot_repost_match"
  | "expired_content"
  | "older_verified_version"
  | "no_verified_origin_found"
  | "conflicting_signals";

export type TrustBadge =
  | "ai_origin_signal_found"
  | "edit_signal_found"
  | "visual_match_found"
  | "metadata_missing"
  | "c2pa_present"
  | "c2pa_invalid"
  | "watermark_unavailable"
  | "classifier_inconclusive";

export type C2paStatus =
  | "present"
  | "missing"
  | "invalid"
  | "unreadable"
  | "not_checked";

export type WatermarkStatus =
  | "found"
  | "not_found"
  | "weak_signal"
  | "unavailable";

export type ClassifierStatus =
  | "ai_signal_found"
  | "no_strong_signal"
  | "inconclusive"
  | "not_run";

export type MetadataStatus = "present" | "missing" | "partial";

export type CreatorTrustLevel =
  | "self_declared"
  | "email_verified"
  | "domain_verified"
  | "team_co_signed"
  | "organisation_verified";

export type AiUsageDeclaration =
  | "human_created"
  | "ai_assisted"
  | "ai_generated_human_review"
  | "fully_ai_generated"
  | "unknown";

export type ProofStatus =
  | "active"
  | "expired"
  | "revoked"
  | "disputed"
  | "updated_version_available";

export type PHashVariant = "full" | "trimmed" | "center_crop";

export type DetectionSignalType =
  | "c2pa"
  | "watermark"
  | "hash"
  | "phash"
  | "metadata"
  | "classifier"
  | "ocr";

export interface PHashResult {
  variant: PHashVariant;
  hash: string;
  width: number;
  height: number;
}

export interface RedactedMetadata {
  status: MetadataStatus;
  format?: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  density?: number;
  hasAlpha?: boolean;
  hasExif: boolean;
  cameraMake?: string;
  cameraModel?: string;
  software?: string;
  createdAt?: string;
  modifiedAt?: string;
  redactedFields: string[];
  publicFields: Record<string, string | number | boolean | null>;
}

export interface C2paInspection {
  status: C2paStatus;
  claimGenerator?: string;
  actions: string[];
  signatureStatus?: "valid" | "invalid" | "unknown";
  summary?: string;
  raw?: unknown;
}

export interface WatermarkInspection {
  status: WatermarkStatus;
  confidence?: number;
  provider?: string;
  explanation: string;
}

export interface ClassifierInspection {
  status: ClassifierStatus;
  confidence?: number;
  detectedArtifacts: string[];
  limitations: string;
}

export interface MediaAnalysis {
  id: string;
  mediaId?: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
  metadata: RedactedMetadata;
  pHashes: PHashResult[];
  c2pa: C2paInspection;
  watermark: WatermarkInspection;
  classifier: ClassifierInspection;
  ocrText: string;
  ocrStatus: "completed" | "empty" | "unavailable" | "failed";
  createdAt: string;
}

export interface TrustCard {
  summary: string;
  what_we_verified: string[];
  what_we_could_not_verify: string[];
  recommended_action: string;
}

export interface ReceiptSummary {
  id: string;
  title: string;
  creatorClaim: string;
  creatorTrustLevel?: CreatorTrustLevel;
  aiUsageDeclaration?: AiUsageDeclaration;
  organisationName?: string;
  officialSourceUrl?: string;
  intendedChannel?: string;
  intendedAudience?: string;
  expiryDate?: string;
  versionNumber?: string;
  warningNote?: string;
  proofStatus?: ProofStatus;
  proofCreatedAt: string;
  mediaId: string;
  sha256: string;
  metadataStatus: MetadataStatus;
  width?: number;
  height?: number;
}

export interface SimilarityMatch {
  receipt: ReceiptSummary;
  score: number;
  uploadedVariant: PHashVariant;
  receiptVariant: PHashVariant;
}

export interface VerificationEvidence {
  exactHashMatch: boolean;
  visualSimilarityScore: number | null;
  matchedReceipt: ReceiptSummary | null;
  c2paStatus: C2paStatus;
  watermarkStatus: WatermarkStatus;
  metadataStatus: MetadataStatus;
  classifierStatus: ClassifierStatus;
  trustLabel: TrustLabel;
  creatorClaim?: string;
  creatorTrustLevel?: CreatorTrustLevel;
  aiUsageDeclaration?: AiUsageDeclaration;
  proofStatus?: ProofStatus;
  expiryDate?: string;
  versionNumber?: string;
  officialSourceUrl?: string;
  proofCreatedAt?: string;
  ocrConflict: boolean;
  editSignal: boolean;
  aiSignal: boolean;
}

export interface VerificationResult {
  id: string;
  trust_label: TrustLabel;
  matched_receipt_id: string | null;
  exact_hash_match: boolean;
  similarity_score: number | null;
  badges: TrustBadge[];
  evidence: VerificationEvidence;
  ai_trust_card: TrustCard;
  analysis: MediaAnalysis;
}
