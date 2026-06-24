"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Database,
  ExternalLink,
  FileText,
  Fingerprint,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import {
  AI_USAGE_COPY,
  CREATOR_TRUST_COPY,
  PROOF_STATUS_COPY,
  TRUST_BADGE_COPY,
  TRUST_LABEL_COPY
} from "@/lib/labels";
import type {
  AiUsageDeclaration,
  CreatorTrustLevel,
  ProofStatus,
  TrustBadge,
  TrustLabel
} from "@/lib/types";

interface Receipt {
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
    exactHashMatch: boolean;
    visualSimilarityScore: number | null;
    matchedReceipt: Receipt | null;
    c2paStatus: string;
    watermarkStatus: string;
    metadataStatus: string;
    classifierStatus: string;
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

const demoCases = [
  {
    title: "Official Event Poster",
    label: "Create proof",
    src: "/demo/assets/01-original-proof.png"
  },
  {
    title: "Edited Copy",
    label: "Conflict demo",
    src: "/demo/assets/02-edited-copy.png"
  },
  {
    title: "Screenshot / Repost",
    label: "Similarity demo",
    src: "/demo/assets/03-screenshot-repost.png"
  }
];

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

function proofStatus(receipt?: Receipt | null): ProofStatus {
  if (receipt?.expiryDate && new Date(receipt.expiryDate).getTime() < Date.now()) {
    return "expired";
  }
  return receipt?.proofStatus ?? "active";
}

function labelTone(label: TrustLabel) {
  const tones: Record<TrustLabel, string> = {
    verified_original: "border-pulse/40 bg-pulse/12 text-pulse",
    modified_copy: "border-amber/40 bg-amber/15 text-amber",
    screenshot_repost_match: "border-wire/40 bg-wire/12 text-wire",
    expired_content: "border-clay/40 bg-clay/15 text-clay",
    older_verified_version: "border-amber/40 bg-amber/15 text-amber",
    no_verified_origin_found: "border-white/20 bg-white/8 text-frost",
    conflicting_signals: "border-clay/40 bg-clay/15 text-clay"
  };
  return tones[label];
}

function fieldBase() {
  return "rounded-md border border-white/12 bg-void/70 px-3 py-2 text-sm text-frost outline-none placeholder:text-frost/35 focus:border-wire focus:ring-2 focus:ring-wire/15";
}

function panelClass(extra = "") {
  return `rounded-md border border-white/10 bg-panel p-5 shadow-2xl shadow-wire/5 ${extra}`;
}

const summitDemoPreset: Record<string, string> = {
  title: "Official ContentSeal Summit Poster",
  creator_claim: "ContentSeal Events Team",
  creator_trust_level: "organisation_verified",
  ai_usage_declaration: "ai_assisted",
  organisation_name: "ContentSeal",
  official_source_url: "https://contentseal.example/events/summit-2026",
  intended_channel: "Instagram / campus email",
  intended_audience: "Students and event attendees",
  expiry_date: "2026-06-27",
  version_number: "v1.0",
  proof_status: "active",
  warning_note:
    "Use only the official event poster. Check the proof page before resharing edited copies."
};

function setFormValue(form: HTMLFormElement | null, name: string, value: string) {
  const field = form?.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function applySummitDemoPreset(form: HTMLFormElement | null) {
  Object.entries(summitDemoPreset).forEach(([name, value]) => {
    setFormValue(form, name, value);
  });
}

function TextField({
  name,
  label,
  placeholder,
  type = "text"
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-frost/78">{label}</span>
      <input className={fieldBase()} name={name} placeholder={placeholder} type={type} />
    </label>
  );
}

function SelectField<T extends string>({
  name,
  label,
  options,
  defaultValue
}: {
  name: string;
  label: string;
  options: Record<T, string>;
  defaultValue: T;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-frost/78">{label}</span>
      <select className={fieldBase()} defaultValue={defaultValue} name={name}>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text as string}
          </option>
        ))}
      </select>
    </label>
  );
}

function FileInput({ name, label, hint }: { name: string; label: string; hint?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-frost/78">{label}</span>
      <input
        className="block w-full rounded-md border border-white/12 bg-void/70 px-3 py-2 text-sm text-frost file:mr-3 file:rounded-md file:border-0 file:bg-pulse file:px-3 file:py-2 file:text-sm file:font-bold file:text-void"
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        required
      />
      {hint ? <span className="font-mono text-xs text-frost/45">{hint}</span> : null}
    </label>
  );
}

function EvidenceRow({
  label,
  value
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-0">
      <span className="text-sm text-frost/55">{label}</span>
      <span className="max-w-[62%] break-words text-right text-sm font-medium text-frost">
        {value == null || value === "" ? "Not available" : String(value)}
      </span>
    </div>
  );
}

function BadgePill({ badge }: { badge: TrustBadge }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-wire/25 bg-wire/10 px-3 py-1 text-xs font-medium text-wire">
      <BadgeCheck size={14} />
      {TRUST_BADGE_COPY[badge] ?? badge}
    </span>
  );
}

function ReceiptContext({ receipt }: { receipt: Receipt | null | undefined }) {
  if (!receipt) {
    return null;
  }

  const status = proofStatus(receipt);

  return (
    <div className="rounded-md border border-white/10 bg-void/55 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-frost">
        <ListChecks size={16} />
        Receipt Context
      </h3>
      <EvidenceRow label="Creator claim" value={receipt.creatorClaim} />
      <EvidenceRow
        label="Creator trust"
        value={CREATOR_TRUST_COPY[receipt.creatorTrustLevel ?? "self_declared"]}
      />
      <EvidenceRow
        label="Declared AI usage"
        value={AI_USAGE_COPY[receipt.aiUsageDeclaration ?? "unknown"]}
      />
      <EvidenceRow label="Organisation" value={receipt.organisationName} />
      <EvidenceRow label="Proof status" value={PROOF_STATUS_COPY[status]} />
      <EvidenceRow label="Version" value={receipt.versionNumber} />
      <EvidenceRow label="Expiry" value={receipt.expiryDate} />
      <EvidenceRow label="Official source" value={receipt.officialSourceUrl} />
      <EvidenceRow label="Warning note" value={receipt.warningNote} />
    </div>
  );
}

export function ContentSealApp({
  initialTab = "create"
}: {
  initialTab?: "create" | "verify";
}) {
  const [activeTab, setActiveTab] = useState<"create" | "verify">(initialTab);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [proofResult, setProofResult] = useState<ProofResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResponse | null>(null);
  const [proofError, setProofError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);

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

  async function deleteReceipt(receipt: Receipt) {
    const confirmed = window.confirm(
      `Delete the local proof receipt "${receipt.title}"? This removes the receipt from future scans.`
    );

    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setDeletingReceiptId(receipt.id);
    try {
      const response = await fetch(`/api/proofs/${receipt.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Proof deletion failed.");
      }
      if (proofResult?.receipt.id === receipt.id) {
        setProofResult(null);
      }
      if (verifyResult?.matched_receipt_id === receipt.id) {
        setVerifyResult(null);
      }
      await refreshReceipts();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Proof deletion failed.");
    } finally {
      setDeletingReceiptId(null);
    }
  }

  const latestReceipt = useMemo(() => receipts[0], [receipts]);
  const heroTitle =
    activeTab === "create"
      ? "Seal original media before it spreads."
      : "Scan any image for provenance evidence.";

  return (
    <main className="min-h-screen bg-void text-frost">
      <SiteNav tone="dark" />

      <section className="relative isolate overflow-hidden border-b border-white/10 interactive-grid-bg">
        <div className="absolute inset-0 proof-glare" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-wire/30 bg-wire/10 px-3 py-2 text-sm font-semibold text-wire">
              <ShieldCheck size={16} />
              Authenticity workflow
            </p>
            <h1 className="scan-title mt-5 max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-frost/70 sm:text-base">
              A2 asks for lightweight tools that help people verify what is real, human,
              and trustworthy. This flow turns that into a working proof receipt, creator
              accountability, declared AI usage, and an evidence card that keeps uncertainty visible.
            </p>
          </div>

          <aside className="relative overflow-hidden rounded-md border border-wire/25 bg-panel/95 p-5 shadow-2xl shadow-wire/10">
            <div className="scanner-sweep" />
            <div className="relative">
              <p className="font-mono text-xs uppercase text-wire">local proof buffer</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-void/60 p-3">
                  <p className="font-mono text-2xl font-semibold text-pulse">{receipts.length}</p>
                  <p className="mt-1 text-xs text-frost/60">receipts created</p>
                </div>
                <div className="rounded-md border border-white/10 bg-void/60 p-3">
                  <p className="font-mono text-2xl font-semibold text-wire">
                    {latestReceipt ? "active" : "ready"}
                  </p>
                  <p className="mt-1 text-xs text-frost/60">verification state</p>
                </div>
              </div>
              {latestReceipt ? (
                <a
                  className="interactive-button mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-wire/25 bg-wire/10 px-3 py-2 text-sm font-semibold text-wire hover:bg-wire hover:text-void"
                  href={`/proofs/${latestReceipt.id}`}
                >
                  <FileText size={16} />
                  Open latest proof
                </a>
              ) : (
                <p className="mt-4 rounded-md border border-white/10 bg-void/60 px-3 py-2 text-sm text-frost/62">
                  Create a receipt first, then verify exact, edited, and reposted media.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:px-8">
        <aside className="relative overflow-hidden rounded-md border border-wire/20 bg-panel/95 p-4 shadow-2xl shadow-wire/10">
          <div className="scanner-sweep" />
          <div className="relative">
            <div className="grid grid-cols-2 rounded-md border border-white/10 bg-void/70 p-1">
              <button
                aria-pressed={activeTab === "create"}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeTab === "create"
                    ? "bg-pulse text-void shadow-sm"
                    : "text-frost/60 hover:bg-white/8 hover:text-frost"
                }`}
                id="create"
                type="button"
                onClick={() => setActiveTab("create")}
              >
                <Upload size={16} />
                Create
              </button>
              <button
                aria-pressed={activeTab === "verify"}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeTab === "verify"
                    ? "bg-pulse text-void shadow-sm"
                    : "text-frost/60 hover:bg-white/8 hover:text-frost"
                }`}
                id="verify"
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
                <div className="scan-panel rounded-md border border-wire/20 bg-wire/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase text-wire">quick demo</p>
                      <p className="mt-1 text-sm leading-5 text-frost/68">
                        Fill the receipt context instantly. The media file still needs a manual pick.
                      </p>
                    </div>
                    <button
                      className="interactive-button inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-pulse px-3 py-2 text-sm font-bold text-void hover:bg-wire"
                      data-preset="summit-demo"
                      type="button"
                      onClick={(event) => applySummitDemoPreset(event.currentTarget.form)}
                    >
                      <BadgeCheck size={16} />
                      Load Demo
                    </button>
                  </div>
                  <p className="mt-3 rounded-md border border-white/10 bg-void/45 px-2 py-2 font-mono text-xs text-frost/50">
                    file: demo/assets/01-original-proof.png
                  </p>
                </div>
                <TextField
                  label="Receipt title"
                  name="title"
                  placeholder="Official event poster, recruitment notice"
                />
                <TextField
                  label="Creator display name"
                  name="creator_claim"
                  placeholder="Club, school, publisher, creator"
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <SelectField
                    defaultValue="self_declared"
                    label="Creator trust"
                    name="creator_trust_level"
                    options={CREATOR_TRUST_COPY}
                  />
                  <SelectField
                    defaultValue="unknown"
                    label="Declared AI usage"
                    name="ai_usage_declaration"
                    options={AI_USAGE_COPY}
                  />
                </div>
                <details className="rounded-md border border-white/10 bg-void/50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-frost">
                    Advanced proof context
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <TextField label="Organisation" name="organisation_name" placeholder="Optional" />
                    <TextField
                      label="Official source URL"
                      name="official_source_url"
                      placeholder="https://official.example/post"
                      type="url"
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <TextField label="Intended channel" name="intended_channel" placeholder="Instagram, email" />
                      <TextField
                        label="Intended audience"
                        name="intended_audience"
                        placeholder="Students, customers"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <TextField label="Expiry date" name="expiry_date" type="date" />
                      <TextField label="Version" name="version_number" placeholder="v1.0" />
                    </div>
                    <SelectField
                      defaultValue="active"
                      label="Proof status"
                      name="proof_status"
                      options={PROOF_STATUS_COPY}
                    />
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-frost/78">Allowed use / warning note</span>
                      <textarea
                        className={`${fieldBase()} min-h-20 resize-y`}
                        name="warning_note"
                        placeholder="Check the official source before resharing after the deadline."
                      />
                    </label>
                  </div>
                </details>
                <FileInput
                  hint="Demo file: demo/assets/01-original-proof.png"
                  label="Original media"
                  name="file"
                />
                <button
                  className="interactive-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pulse px-4 py-2.5 text-sm font-bold text-void hover:bg-wire disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Fingerprint size={16} />}
                  Create Proof Receipt
                </button>
                {proofError ? (
                  <p className="rounded-md border border-clay/40 bg-clay/12 px-3 py-2 text-sm text-clay">
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
                <div className="scan-panel rounded-md border border-wire/20 bg-wire/10 p-3">
                  <p className="font-mono text-xs uppercase text-wire">scan any image</p>
                  <h3 className="mt-2 text-base font-semibold text-frost">
                    Upload a saved web image, screenshot, poster, or AI-looking visual.
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-frost/68">
                    ContentSeal compares it with local proof receipts and separates exact hash,
                    visual similarity, metadata, C2PA, watermark, classifier, and human context.
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-frost/62">
                    <span className="rounded-md border border-white/10 bg-void/45 px-2 py-1">
                      1. Exact file check
                    </span>
                    <span className="rounded-md border border-white/10 bg-void/45 px-2 py-1">
                      2. Similar image / repost recovery
                    </span>
                    <span className="rounded-md border border-white/10 bg-void/45 px-2 py-1">
                      3. Content Trust Card with limits
                    </span>
                  </div>
                </div>
                <FileInput
                  hint="Use any JPEG, PNG, WebP, or AVIF saved from your device or the web."
                  label="Image to scan"
                  name="file"
                />
                <button
                  className="interactive-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pulse px-4 py-2.5 text-sm font-bold text-void hover:bg-wire disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isVerifying}
                  type="submit"
                >
                  {isVerifying ? <Loader2 className="animate-spin" size={16} /> : <SearchCheck size={16} />}
                  Scan Image
                </button>
                {verifyError ? (
                  <p className="rounded-md border border-clay/40 bg-clay/12 px-3 py-2 text-sm text-clay">
                    {verifyError}
                  </p>
                ) : null}
              </form>
            )}

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-frost">Recent Proof Receipts</h2>
                <span className="rounded-full bg-white/8 px-2 py-1 text-xs font-medium text-frost/60">
                  {receipts.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {receipts.slice(0, 4).map((receipt) => (
                  <div
                    className="scan-panel rounded-md border border-white/10 bg-void/55 p-3 text-sm hover:border-wire/35 hover:bg-wire/10"
                    key={receipt.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <a className="min-w-0 flex-1" href={`/proofs/${receipt.id}`}>
                        <span className="block truncate font-medium text-frost">{receipt.title}</span>
                        <span className="mt-1 block text-xs text-frost/55">
                          {PROOF_STATUS_COPY[proofStatus(receipt)]} / {receipt.versionNumber || "No version"}
                        </span>
                      </a>
                      <button
                        aria-label={`Delete ${receipt.title}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-clay/30 bg-clay/10 text-clay hover:bg-clay hover:text-void disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deletingReceiptId === receipt.id}
                        title="Delete local proof"
                        type="button"
                        onClick={() => void deleteReceipt(receipt)}
                      >
                        {deletingReceiptId === receipt.id ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {receipts.length === 0 ? (
                  <p className="rounded-md border border-white/10 bg-void/55 px-3 py-3 text-sm text-frost/58">
                    Proof receipts created in this local demo will appear here.
                  </p>
                ) : null}
                {deleteError ? (
                  <p className="rounded-md border border-clay/40 bg-clay/12 px-3 py-2 text-sm text-clay">
                    {deleteError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <section className="grid content-start gap-5">
          <div className={`${panelClass("relative overflow-hidden")}`}>
            <div className="scanner-sweep" />
            <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <p className="text-sm font-semibold text-wire">Authenticity in a synthetic world</p>
                <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-frost sm:text-4xl">
                  Create proof before content spreads. Verify origin later.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-frost/68">
                  ContentSeal creates lightweight proof receipts for official content, then gives viewers a
                  human-readable Content Trust Card showing origin signals, integrity, declared AI usage,
                  accountability context, and what remains uncertain.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="scan-panel rounded-md border border-white/10 bg-void/55 p-3">
                    <Fingerprint className="text-pulse" size={18} />
                    <p className="mt-2 text-sm font-semibold">File integrity</p>
                    <p className="mt-1 text-xs leading-5 text-frost/58">SHA-256 plus perceptual similarity.</p>
                  </div>
                  <div className="scan-panel rounded-md border border-white/10 bg-void/55 p-3">
                    <CalendarClock className="text-pulse" size={18} />
                    <p className="mt-2 text-sm font-semibold">Current status</p>
                    <p className="mt-1 text-xs leading-5 text-frost/58">Expiry, revocation, and updates.</p>
                  </div>
                  <div className="scan-panel rounded-md border border-white/10 bg-void/55 p-3">
                    <Info className="text-pulse" size={18} />
                    <p className="mt-2 text-sm font-semibold">No truth oracle</p>
                    <p className="mt-1 text-xs leading-5 text-frost/58">Evidence and limits stay visible.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                {demoCases.map((item) => (
                  <div
                    className="scan-panel grid grid-cols-[84px_minmax(0,1fr)] gap-3 rounded-md border border-white/10 bg-void/55 p-2"
                    key={item.title}
                  >
                    <img
                      alt={item.title}
                      className="h-20 w-20 rounded-md border border-white/10 object-cover"
                      src={item.src}
                    />
                    <div className="min-w-0 self-center">
                      <p className="truncate text-sm font-semibold text-frost">{item.title}</p>
                      <p className="mt-1 text-xs font-medium text-pulse">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {proofResult ? (
            <div className={panelClass("border-pulse/25 shadow-pulse/5")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-pulse">Proof Created</p>
                  <h2 className="mt-1 text-2xl font-semibold text-frost">{proofResult.receipt.title}</h2>
                  <p className="mt-1 text-sm text-frost/60">{proofResult.receipt.creatorClaim}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="interactive-button inline-flex min-h-10 items-center gap-2 rounded-md bg-pulse px-3 py-2 text-sm font-bold text-void hover:bg-wire"
                    href={proofResult.proof_url}
                  >
                    <FileText size={16} />
                    Open Proof Page
                  </a>
                  <button
                    className="interactive-button inline-flex min-h-10 items-center gap-2 rounded-md border border-clay/35 bg-clay/10 px-3 py-2 text-sm font-bold text-clay hover:bg-clay hover:text-void disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deletingReceiptId === proofResult.receipt.id}
                    type="button"
                    onClick={() => void deleteReceipt(proofResult.receipt)}
                  >
                    {deletingReceiptId === proofResult.receipt.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Delete Proof
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-white/10 bg-void/55 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-frost">
                      <Database size={16} />
                      Technical Proof
                    </h3>
                    <EvidenceRow label="Receipt ID" value={proofResult.receipt_id} />
                    <EvidenceRow label="SHA-256" value={shortHash(proofResult.file_hash)} />
                    <EvidenceRow label="Metadata" value={proofResult.metadata_status} />
                    <EvidenceRow label="pHash variants" value={proofResult.perceptual_hashes.length} />
                  </div>
                  <ReceiptContext receipt={proofResult.receipt} />
                </div>
                <div className="rounded-md border border-white/10 bg-void/55 p-3">
                  <div className="grid h-72 place-items-center overflow-hidden rounded-md bg-black/25">
                    <img
                      alt={proofResult.receipt.title}
                      className="h-full w-full object-contain"
                      src={`/api/media/${proofResult.receipt.mediaId}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {verifyResult ? (
            <div className={panelClass("border-wire/25")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-wire">Verification Result</p>
                  <h2
                    className={`mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xl font-semibold ${labelTone(
                      verifyResult.trust_label
                    )}`}
                  >
                    {verifyResult.trust_label === "conflicting_signals" ? (
                      <ShieldAlert size={22} />
                    ) : (
                      <ShieldCheck size={22} />
                    )}
                    {TRUST_LABEL_COPY[verifyResult.trust_label]}
                  </h2>
                </div>
                {verifyResult.evidence.officialSourceUrl ? (
                  <a
                    className="interactive-button inline-flex min-h-10 items-center gap-2 rounded-md border border-wire/25 bg-wire/10 px-3 py-2 text-sm font-semibold text-wire hover:bg-wire hover:text-void"
                    href={verifyResult.evidence.officialSourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink size={16} />
                    Official source
                  </a>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {verifyResult.badges.map((badge) => (
                  <BadgePill badge={badge} key={badge} />
                ))}
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-4">
                  <div className="rounded-md border border-white/10 bg-void/55 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-frost">
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

                  <div className="rounded-md border border-white/10 bg-void/55 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-frost">
                      <FileText size={16} />
                      Content Trust Card
                    </h3>
                    <p className="text-sm leading-6 text-frost/75">{verifyResult.ai_trust_card.summary}</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold text-frost">What is verified</p>
                        <ul className="mt-2 grid gap-2 text-sm text-frost/68">
                          {verifyResult.ai_trust_card.what_we_verified.map((item) => (
                            <li className="flex gap-2" key={item}>
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-frost">What is not verified</p>
                        <ul className="mt-2 grid gap-2 text-sm text-frost/68">
                          {verifyResult.ai_trust_card.what_we_could_not_verify.map((item) => (
                            <li className="flex gap-2" key={item}>
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="mt-4 rounded-md border border-wire/20 bg-wire/10 px-3 py-2 text-sm font-medium text-wire">
                      {verifyResult.ai_trust_card.recommended_action}
                    </p>
                  </div>

                  <ReceiptContext receipt={verifyResult.evidence.matchedReceipt} />
                </div>

                <div className="rounded-md border border-white/10 bg-void/55 p-3">
                  <div className="grid h-72 place-items-center overflow-hidden rounded-md bg-black/25">
                    <img
                      alt="Uploaded media verification preview"
                      className="h-full w-full object-contain"
                      src={`/api/media/${verifyResult.analysis.mediaId}`}
                    />
                  </div>
                  <div className="mt-3 rounded-md border border-white/10 bg-void/60 p-3">
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
            <div className={panelClass()}>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="grid h-14 w-14 place-items-center rounded-md border border-wire/30 bg-wire/10 text-wire">
                    <ImageIcon size={28} />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-frost">Ready for a proof or verification run</h2>
                  <p className="mt-2 text-sm leading-6 text-frost/68">
                    Use the create flow for original notices, posters, announcements, and official visuals.
                    Use the verify flow for screenshots, reposts, compressed copies, or suspicious edits.
                  </p>
                  <div className="mt-4 rounded-md border border-amber/30 bg-amber/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber">
                      <AlertTriangle size={16} />
                      Trust philosophy
                    </p>
                    <p className="mt-2 text-sm leading-6 text-frost/70">
                      A matching receipt shows provenance signals. It does not prove that every claim in the
                      content is true, and missing proof does not prove the content is fake.
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-void/55 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-frost">
                    <LinkIcon size={16} />
                    Demo path
                  </p>
                  <ol className="mt-3 grid gap-3 text-sm text-frost/68">
                    <li>1. Create a proof for the official poster.</li>
                    <li>2. Verify the same file for a deterministic match.</li>
                    <li>3. Verify an edited copy or screenshot to see uncertainty.</li>
                    <li>4. Open the public proof page for receipt context.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
