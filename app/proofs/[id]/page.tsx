import { notFound } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { getReceipt } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProofPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = getReceipt(id);
  if (!receipt) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
          <a className="inline-flex items-center gap-3 text-ink" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <ShieldCheck size={22} />
            </span>
            <span className="text-xl font-semibold">ContentSeal</span>
          </a>
          <span className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium">
            <FileText size={16} />
            Proof Receipt
          </span>
        </header>

        <section className="grid gap-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="text-sm font-medium text-moss">Receipt</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">{receipt.title}</h1>
            <p className="mt-2 text-sm text-ink/60">{receipt.creatorClaim}</p>

            <div className="mt-6 grid gap-3 rounded-md bg-mint/60 p-4">
              <div className="flex justify-between gap-4 border-b border-ink/10 pb-3 text-sm">
                <span className="text-ink/60">Receipt ID</span>
                <span className="max-w-[60%] break-words text-right font-medium">{receipt.id}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/10 pb-3 text-sm">
                <span className="text-ink/60">Created</span>
                <span className="font-medium">{new Date(receipt.proofCreatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/10 pb-3 text-sm">
                <span className="text-ink/60">SHA-256</span>
                <span className="max-w-[60%] break-words text-right font-medium">{receipt.sha256}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-ink/60">Metadata</span>
                <span className="font-medium">{receipt.metadataStatus}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-ink/5 p-3">
            <div className="grid h-80 place-items-center overflow-hidden rounded-md bg-white">
              <img
                alt=""
                className="h-full w-full object-contain"
                src={`/api/media/${receipt.mediaId}`}
              />
            </div>
            <div className="mt-3 rounded-md bg-white p-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-ink/10 pb-3">
                <span className="text-ink/60">Dimensions</span>
                <span className="font-medium">
                  {receipt.width && receipt.height ? `${receipt.width} x ${receipt.height}` : "Not available"}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-3">
                <span className="text-ink/60">Media ID</span>
                <span className="max-w-[60%] break-words text-right font-medium">{receipt.mediaId}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
