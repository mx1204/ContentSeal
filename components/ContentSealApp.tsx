"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Database,
  FileText,
  Fingerprint,
  Image as ImageIcon,
  Loader2,
  SearchCheck,
  ShieldCheck,
  Upload
} from "lucide-react";
import { TRUST_BADGE_COPY, TRUST_LABEL_COPY } from "@/lib/labels";
import type { TrustBadge, TrustLabel } from "@/lib/types";

interface Receipt {
  id: string;
  title: string;
  creatorClaim: string;
  proofCreatedAt: string;
  mediaId: string;
  sha256: string;
  metadataStatus: string;
  width?: number;
  height?: number;
}

interface ProofResponse {
  receipt_id: string;
  proof_url: string;
  file_hash: string;
  metadata_status: string;
  perceptual_hashes: Array<{ variant: string; hash: string }>;
  receipt: Receipt;
}

interface VerificationResponse {
  trust_label: TrustLabel;
  matched_receipt_id: string | null;
  exact_hash_match: boolean;
  similarity_score: number | null;
  badges: TrustBadge[];
  evidence: {
    matchedReceipt: Receipt | null;
    c2paStatus: string;
    watermarkStatus: string;
    metadataStatus: string;
    classifierStatus: string;
    ocrConflict: boolean;
    editSignal: boolean;
    aiSignal: boolean;
  };
  ai_trust_card: {
    summary: string;
    what_we_verified: string[];
    what_we_could_not_verify: string[];
    recommended_action: string;
  };
  analysis: {
    mediaId: string;
    sha256: string;
    metadata: {
      width?: number;
      height?: number;
      format?: string;
      sizeBytes: number;
      software?: string;
      redactedFields: string[];
    };
  };
}

function formatPercent(value: number | null) {
  if (value == null) {
    return "None";
  }
  return `${Math.round(value * 100)}%`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

function EvidenceRow({
  label,
  value
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/10 py-3 last:border-0">
      <span className="text-sm text-ink/60">{label}</span>
      <span className="max-w-[60%] break-words text-right text-sm font-medium text-ink">
        {value == null || value === "" ? "Not available" : String(value)}
      </span>
    </div>
  );
}

function BadgePill({ badge }: { badge: TrustBadge }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-medium text-ink">
      <BadgeCheck size={14} />
      {TRUST_BADGE_COPY[badge] ?? badge}
    </span>
  );
}

function FileInput({
  name,
  label
}: {
  name: string;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        className="block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-moss file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        required
      />
    </label>
  );
}

export function ContentSealApp() {
  const [activeTab, setActiveTab] = useState<"create" | "verify">("create");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [proofResult, setProofResult] = useState<ProofResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResponse | null>(null);
  const [proofError, setProofError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  async function refreshReceipts() {
    const response = await fetch("/api/proofs", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { receipts: Receipt[] };
      setReceipts(data.receipts);
    }
  }

  useEffect(() => {
    refreshReceipts().catch(() => undefined);
  }, []);

  async function createProof(formData: FormData) {
    setProofError("");
    setProofResult(null);
    setIsCreating(true);
    try {
      const response = await fetch("/api/proofs", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Proof creation failed.");
      }
      setProofResult(data as ProofResponse);
      await refreshReceipts();
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Proof creation failed.");
    } finally {
      setIsCreating(false);
    }
  }

  async function verifyMedia(formData: FormData) {
    setVerifyError("");
    setVerifyResult(null);
    setIsVerifying(true);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Verification failed.");
      }
      setVerifyResult(data as VerificationResponse);
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  }

  const latestReceipt = useMemo(() => receipts[0], [receipts]);

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-ink">ContentSeal</h1>
              <p className="text-sm text-ink/60">Proof receipts: {receipts.length}</p>
            </div>
          </div>
          {latestReceipt ? (
            <a
              className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-mint"
              href={`/proofs/${latestReceipt.id}`}
            >
              <FileText size={16} />
              Latest receipt
            </a>
          ) : null}
        </header>

        <div className="mt-5 grid flex-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 rounded-md bg-ink/5 p-1">
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "create" ? "bg-white text-ink shadow-sm" : "text-ink/60"
                }`}
                type="button"
                onClick={() => setActiveTab("create")}
              >
                <Upload size={16} />
                Create
              </button>
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "verify" ? "bg-white text-ink shadow-sm" : "text-ink/60"
                }`}
                type="button"
                onClick={() => setActiveTab("verify")}
              >
                <SearchCheck size={16} />
                Verify
              </button>
            </div>

            {activeTab === "create" ? (
              <form
                className="mt-5 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createProof(new FormData(event.currentTarget));
                }}
              >
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-ink">Title</span>
                  <input
                    className="rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-moss"
                    name="title"
                    placeholder="Event poster, source image, receipt title"
                    type="text"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-ink">Creator Claim</span>
                  <input
                    className="rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-moss"
                    name="creator_claim"
                    placeholder="Team, publisher, creator, or source"
                    type="text"
                  />
                </label>
                <FileInput label="Original Image" name="file" />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Fingerprint size={16} />}
                  Create Proof
                </button>
                {proofError ? (
                  <p className="rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
                    {proofError}
                  </p>
                ) : null}
              </form>
            ) : (
              <form
                className="mt-5 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verifyMedia(new FormData(event.currentTarget));
                }}
              >
                <FileInput label="Image To Verify" name="file" />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isVerifying}
                  type="submit"
                >
                  {isVerifying ? <Loader2 className="animate-spin" size={16} /> : <SearchCheck size={16} />}
                  Verify Media
                </button>
                {verifyError ? (
                  <p className="rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
                    {verifyError}
                  </p>
                ) : null}
              </form>
            )}
          </section>

          <section className="grid gap-5">
            {proofResult ? (
              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-moss">Proof Created</p>
                    <h2 className="mt-1 text-xl font-semibold text-ink">{proofResult.receipt.title}</h2>
                    <p className="mt-1 text-sm text-ink/60">{proofResult.receipt.creatorClaim}</p>
                  </div>
                  <a
                    className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-moss"
                    href={proofResult.proof_url}
                  >
                    <FileText size={16} />
                    Open Receipt
                  </a>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-md bg-mint/60 p-4">
                    <EvidenceRow label="SHA-256" value={shortHash(proofResult.file_hash)} />
                    <EvidenceRow label="Metadata" value={proofResult.metadata_status} />
                    <EvidenceRow label="pHash variants" value={proofResult.perceptual_hashes.length} />
                  </div>
                  <div className="overflow-hidden rounded-md bg-ink/5">
                    <img
                      alt=""
                      className="h-56 w-full object-contain"
                      src={`/api/media/${proofResult.receipt.mediaId}`}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {verifyResult ? (
              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-moss">Verification Result</p>
                    <h2 className="mt-1 text-2xl font-semibold text-ink">
                      {TRUST_LABEL_COPY[verifyResult.trust_label]}
                    </h2>
                  </div>
                  <div className="grid h-16 w-16 place-items-center rounded-md bg-mint text-moss">
                    {verifyResult.trust_label === "conflicting_signals" ? (
                      <AlertTriangle size={28} />
                    ) : (
                      <ShieldCheck size={28} />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {verifyResult.badges.map((badge) => (
                    <BadgePill badge={badge} key={badge} />
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4">
                    <div className="rounded-md bg-mint/60 p-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                        <Database size={16} />
                        Evidence
                      </h3>
                      <EvidenceRow label="Exact hash match" value={verifyResult.exact_hash_match} />
                      <EvidenceRow label="Similarity" value={formatPercent(verifyResult.similarity_score)} />
                      <EvidenceRow
                        label="Matched receipt"
                        value={verifyResult.evidence.matchedReceipt?.title}
                      />
                      <EvidenceRow label="C2PA" value={verifyResult.evidence.c2paStatus} />
                      <EvidenceRow label="Watermark" value={verifyResult.evidence.watermarkStatus} />
                      <EvidenceRow label="Metadata" value={verifyResult.evidence.metadataStatus} />
                      <EvidenceRow label="Classifier" value={verifyResult.evidence.classifierStatus} />
                      <EvidenceRow label="OCR conflict" value={verifyResult.evidence.ocrConflict} />
                    </div>

                    <div className="rounded-md bg-ink/5 p-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                        <FileText size={16} />
                        Trust Card
                      </h3>
                      <p className="text-sm leading-6 text-ink/80">{verifyResult.ai_trust_card.summary}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">Verified</p>
                          <ul className="mt-2 grid gap-2 text-sm text-ink/70">
                            {verifyResult.ai_trust_card.what_we_verified.map((item) => (
                              <li className="flex gap-2" key={item}>
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">Unverified</p>
                          <ul className="mt-2 grid gap-2 text-sm text-ink/70">
                            {verifyResult.ai_trust_card.what_we_could_not_verify.map((item) => (
                              <li className="flex gap-2" key={item}>
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="mt-4 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink">
                        {verifyResult.ai_trust_card.recommended_action}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md bg-ink/5 p-3">
                    <div className="grid h-72 place-items-center overflow-hidden rounded-md bg-white">
                      <img
                        alt=""
                        className="h-full w-full object-contain"
                        src={`/api/media/${verifyResult.analysis.mediaId}`}
                      />
                    </div>
                    <div className="mt-3 rounded-md bg-white p-3">
                      <EvidenceRow label="SHA-256" value={shortHash(verifyResult.analysis.sha256)} />
                      <EvidenceRow
                        label="Dimensions"
                        value={
                          verifyResult.analysis.metadata.width && verifyResult.analysis.metadata.height
                            ? `${verifyResult.analysis.metadata.width} x ${verifyResult.analysis.metadata.height}`
                            : null
                        }
                      />
                      <EvidenceRow label="Size" value={formatBytes(verifyResult.analysis.metadata.sizeBytes)} />
                      <EvidenceRow label="Software" value={verifyResult.analysis.metadata.software} />
                      <EvidenceRow
                        label="Redacted fields"
                        value={verifyResult.analysis.metadata.redactedFields.length}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {!proofResult && !verifyResult ? (
              <div className="grid min-h-[520px] place-items-center rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
                <div className="grid max-w-md justify-items-center gap-4 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-md bg-mint text-moss">
                    <ImageIcon size={30} />
                  </div>
                  <h2 className="text-xl font-semibold text-ink">No active result</h2>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
