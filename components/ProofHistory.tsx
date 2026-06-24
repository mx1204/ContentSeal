"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { PROOF_STATUS_COPY } from "@/lib/labels";
import type { ProofStatus } from "@/lib/types";

interface Receipt {
  id: string;
  title: string;
  creatorClaim: string;
  proofCreatedAt: string;
  mediaId: string;
  sha256: string;
  metadataStatus: string;
  proofStatus?: ProofStatus;
  versionNumber?: string;
  officialSourceUrl?: string;
  expiryDate?: string;
}

interface ClientStoredProof {
  receipt: Receipt;
  storedAt: string;
}

const clientProofsStorageKey = "contentseal.clientProofs.v1";

function readClientProofs(): ClientStoredProof[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(clientProofsStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is ClientStoredProof => {
      if (typeof item !== "object" || item === null) {
        return false;
      }
      const proof = item as Partial<ClientStoredProof>;
      return Boolean(proof.receipt?.id && proof.receipt.title && proof.receipt.sha256);
    });
  } catch {
    return [];
  }
}

function removeClientProof(receiptId: string) {
  if (typeof window === "undefined") {
    return;
  }
  const next = readClientProofs().filter((proof) => proof.receipt.id !== receiptId);
  window.localStorage.setItem(clientProofsStorageKey, JSON.stringify(next));
}

function proofStatus(receipt: Receipt): ProofStatus {
  if (receipt.expiryDate && new Date(receipt.expiryDate).getTime() < Date.now()) {
    return "expired";
  }
  return receipt.proofStatus ?? "active";
}

function mergeReceipts(serverReceipts: Receipt[]) {
  const receiptsById = new Map<string, Receipt>();
  for (const proof of readClientProofs()) {
    receiptsById.set(proof.receipt.id, proof.receipt);
  }
  for (const receipt of serverReceipts) {
    receiptsById.set(receipt.id, receipt);
  }
  return Array.from(receiptsById.values()).sort(
    (left, right) =>
      new Date(right.proofCreatedAt).getTime() - new Date(left.proofCreatedAt).getTime()
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

export function ProofHistory() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState("");
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);

  async function refreshReceipts() {
    const response = await fetch("/api/proofs", { cache: "no-store" });
    if (!response.ok) {
      setReceipts(mergeReceipts([]));
      return;
    }
    const data = (await response.json()) as { receipts: Receipt[] };
    setReceipts(mergeReceipts(data.receipts));
  }

  useEffect(() => {
    refreshReceipts().catch(() => setReceipts(mergeReceipts([])));
  }, []);

  async function deleteReceipt(receipt: Receipt) {
    const confirmed = window.confirm(
      `Delete the proof receipt "${receipt.title}"? Future scans will no longer match this proof.`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingReceiptId(receipt.id);
    try {
      const response = await fetch(`/api/proofs/${receipt.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok && response.status !== 404) {
        throw new Error(data.error ?? "Proof deletion failed.");
      }
      removeClientProof(receipt.id);
      await refreshReceipts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Proof deletion failed.");
    } finally {
      setDeletingReceiptId(null);
    }
  }

  return (
    <main className="min-h-screen bg-void text-frost">
      <SiteNav tone="dark" />

      <section className="border-b border-white/10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-md border border-wire/30 bg-wire/10 px-3 py-2 text-sm font-semibold text-wire">
            <FileText size={16} />
            Proof history
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
            Manage sealed sources without cluttering the scan console.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-frost/68">
            Open proof pages, inspect issuer context, or delete receipts. Deleting a proof removes it from future
            source recovery matches.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4">
          {error ? (
            <p className="rounded-md border border-clay/40 bg-clay/12 px-3 py-2 text-sm text-clay">
              {error}
            </p>
          ) : null}

          {receipts.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-panel p-6">
              <ShieldCheck className="text-wire" size={24} />
              <h2 className="mt-4 text-xl font-semibold">No proof receipts yet</h2>
              <p className="mt-2 text-sm leading-6 text-frost/65">
                Create a proof first, then this page becomes the clean receipt management surface.
              </p>
              <a
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-pulse px-4 py-2 text-sm font-bold text-void hover:bg-wire"
                href="/create"
              >
                Seal Source
              </a>
            </div>
          ) : null}

          {receipts.map((receipt) => (
            <article
              className="grid gap-4 rounded-md border border-white/10 bg-panel p-4 shadow-2xl shadow-wire/5 lg:grid-cols-[minmax(0,1fr)_220px]"
              key={receipt.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-wire/25 bg-wire/10 px-3 py-1 text-xs font-semibold text-wire">
                    {PROOF_STATUS_COPY[proofStatus(receipt)]}
                  </span>
                  <span className="font-mono text-xs text-frost/45">
                    {receipt.versionNumber || "no version"}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-frost">{receipt.title}</h2>
                <p className="mt-1 text-sm text-frost/62">{receipt.creatorClaim}</p>
                <div className="mt-4 grid gap-2 text-sm text-frost/60 sm:grid-cols-2 xl:grid-cols-4">
                  <p>
                    <span className="block text-xs uppercase text-frost/35">Receipt ID</span>
                    <span className="font-mono">{receipt.id}</span>
                  </p>
                  <p>
                    <span className="block text-xs uppercase text-frost/35">SHA-256</span>
                    <span className="font-mono">{shortHash(receipt.sha256)}</span>
                  </p>
                  <p>
                    <span className="block text-xs uppercase text-frost/35">Metadata</span>
                    {receipt.metadataStatus}
                  </p>
                  <p>
                    <span className="block text-xs uppercase text-frost/35">Created</span>
                    {new Date(receipt.proofCreatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid content-start gap-2">
                <a
                  className="interactive-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-pulse px-3 py-2 text-sm font-bold text-void hover:bg-wire"
                  href={`/proofs/${receipt.id}`}
                >
                  <ExternalLink size={16} />
                  Open Proof
                </a>
                <button
                  className="interactive-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-clay/35 bg-clay/10 px-3 py-2 text-sm font-bold text-clay hover:bg-clay hover:text-void disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deletingReceiptId === receipt.id}
                  type="button"
                  onClick={() => void deleteReceipt(receipt)}
                >
                  {deletingReceiptId === receipt.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete Proof
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
