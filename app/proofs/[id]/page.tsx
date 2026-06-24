"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Fingerprint,
  Info,
  ShieldCheck
} from "lucide-react";
import { AI_USAGE_COPY, CREATOR_TRUST_COPY, PROOF_STATUS_COPY } from "@/lib/labels";
import type { ProofStatus, ReceiptSummary } from "@/lib/types";

const clientProofsStorageKey = "contentseal.clientProofs.v1";

interface ClientStoredProof {
  receipt: ReceiptSummary;
  previewDataUrl?: string;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 16)}...${hash.slice(-12)}`;
}

function effectiveProofStatus(receipt: {
  expiryDate?: string;
  proofStatus?: ProofStatus;
}): ProofStatus {
  if (receipt.expiryDate && new Date(receipt.expiryDate).getTime() < Date.now()) {
    return "expired";
  }
  return receipt.proofStatus ?? "active";
}

function readLocalProof(receiptId: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(clientProofsStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    return (
      parsed.find((item): item is ClientStoredProof => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const proof = item as Partial<ClientStoredProof>;
        return proof.receipt?.id === receiptId;
      }) ?? null
    );
  } catch {
    return null;
  }
}

function DetailRow({
  label,
  value
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/10 py-3 last:border-0">
      <span className="text-sm text-ink/60">{label}</span>
      <span className="max-w-[62%] break-words text-right text-sm font-medium text-ink">
        {value == null || value === "" ? "Not available" : String(value)}
      </span>
    </div>
  );
}

export default function ProofPage() {
  const params = useParams<{ id: string }>();
  const receiptId = params.id;
  const [receipt, setReceipt] = useState<ReceiptSummary | null>(null);
  const [imageSrc, setImageSrc] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadReceipt() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/proofs/${receiptId}`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as {
            receipt: ReceiptSummary;
            media_url: string;
          };
          if (!cancelled) {
            setReceipt(data.receipt);
            setImageSrc(data.media_url);
          }
          return;
        }
      } catch {
        // Fall back to the browser proof cache below.
      }

      const localProof = readLocalProof(receiptId);
      if (!cancelled && localProof) {
        setReceipt(localProof.receipt);
        setImageSrc(localProof.previewDataUrl ?? `/api/media/${localProof.receipt.mediaId}`);
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void loadReceipt().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
        <p className="rounded-md border border-ink/10 bg-white px-4 py-3 text-sm font-medium">
          Loading proof receipt...
        </p>
      </main>
    );
  }

  if (!receipt) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
        <div className="max-w-md rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm">
          <FileText className="mx-auto text-moss" size={28} />
          <h1 className="mt-4 text-2xl font-semibold">Proof receipt not found</h1>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            This proof is not available in the shared proof database or the browser fallback cache.
            Create a proof first, then open the proof page again.
          </p>
          <a
            className="mt-5 inline-flex min-h-10 items-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
            href="/create"
          >
            Create proof
          </a>
        </div>
      </main>
    );
  }

  const status = effectiveProofStatus(receipt);

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
          <a className="inline-flex items-center gap-3 text-ink" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <ShieldCheck size={22} />
            </span>
            <span>
              <span className="block text-xl font-semibold">ContentSeal</span>
              <span className="block text-sm text-ink/60">Public proof receipt</span>
            </span>
          </a>
          <span className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium">
            <FileText size={16} />
            {PROOF_STATUS_COPY[status]}
          </span>
        </header>

        <section className="grid gap-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <div>
              <p className="text-sm font-medium text-moss">Receipt</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal">{receipt.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
                This proof page records provenance and accountability signals for the uploaded media. It does
                not certify that every claim in the content is true.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-ink/10 bg-paper/60 p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck size={16} />
                  Human Accountability
                </h2>
                <DetailRow label="Creator claim" value={receipt.creatorClaim} />
                <DetailRow
                  label="Creator trust"
                  value={CREATOR_TRUST_COPY[receipt.creatorTrustLevel ?? "self_declared"]}
                />
                <DetailRow label="Organisation" value={receipt.organisationName} />
                <DetailRow
                  label="Declared AI usage"
                  value={AI_USAGE_COPY[receipt.aiUsageDeclaration ?? "unknown"]}
                />
              </div>

              <div className="rounded-md border border-ink/10 bg-paper/60 p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock size={16} />
                  Official Context
                </h2>
                <DetailRow label="Proof status" value={PROOF_STATUS_COPY[status]} />
                <DetailRow label="Version" value={receipt.versionNumber} />
                <DetailRow label="Expiry" value={receipt.expiryDate} />
                <DetailRow label="Intended channel" value={receipt.intendedChannel} />
                <DetailRow label="Intended audience" value={receipt.intendedAudience} />
              </div>
            </div>

            {receipt.officialSourceUrl ? (
              <a
                className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-mint"
                href={receipt.officialSourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={16} />
                Open official source
              </a>
            ) : null}

            <div className="rounded-md border border-ink/10 bg-white p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Fingerprint size={16} />
                Technical Proof Summary
              </h2>
              <DetailRow label="Receipt ID" value={receipt.id} />
              <DetailRow label="Created" value={new Date(receipt.proofCreatedAt).toLocaleString()} />
              <DetailRow label="SHA-256" value={shortHash(receipt.sha256)} />
              <DetailRow label="Metadata" value={receipt.metadataStatus} />
              <DetailRow
                label="Dimensions"
                value={receipt.width && receipt.height ? `${receipt.width} x ${receipt.height}` : null}
              />
              <DetailRow label="Media ID" value={receipt.mediaId} />
            </div>

            <div className="rounded-md border border-amber/30 bg-amber/10 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Info size={16} />
                Verification Limits
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Origin proof is not truth proof. Creator identity is self-declared unless a stronger trust level
                is shown. Missing C2PA or metadata should not be treated as proof that content is fake.
              </p>
            </div>
          </div>

          <aside className="rounded-md bg-ink/5 p-3">
            <div className="grid h-80 place-items-center overflow-hidden rounded-md bg-white">
              {imageSrc ? (
                <img alt={receipt.title} className="h-full w-full object-contain" src={imageSrc} />
              ) : (
                <p className="px-4 text-center text-sm text-ink/55">Media preview is not available.</p>
              )}
            </div>
            {receipt.warningNote ? (
              <p className="mt-3 rounded-md border border-clay/20 bg-clay/10 px-3 py-2 text-sm font-medium text-clay">
                {receipt.warningNote}
              </p>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
