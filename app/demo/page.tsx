import {
  ArrowRight,
  CalendarClock,
  Database,
  FileCheck2,
  Fingerprint,
  ScanLine,
  Sparkles
} from "lucide-react";
import { DemoFixtureScanner } from "@/components/DemoFixtureScanner";
import { SiteNav } from "@/components/SiteNav";

const cases = [
  {
    title: "Official Event Poster",
    result: "Verified Original",
    image: "/demo/assets/01-original-proof.png",
    file: "demo/assets/01-original-proof.png",
    command: "Create proof, then scan the same file",
    expected: "Hash match, trusted creator, AI-use declaration, active proof",
    text: "Baseline asset for the PRD promise: the original file carries a proof receipt with source, expiry, version, and human accountability."
  },
  {
    title: "Edited Copy",
    result: "Modified Copy / Conflicting Signals",
    image: "/demo/assets/02-edited-copy.png",
    file: "demo/assets/02-edited-copy.png",
    command: "Scan after the original proof exists",
    expected: "Hash mismatch, perceptual match, changed visible claim",
    text: "A controlled conflicting case. The date and trust signal change, so the result should warn instead of pretending the file is clean."
  },
  {
    title: "Screenshot Repost",
    result: "Screenshot / Repost Match",
    image: "/demo/assets/03-screenshot-repost.png",
    file: "demo/assets/03-screenshot-repost.png",
    command: "Scan a screenshot or reposted crop",
    expected: "Metadata missing, visual similarity still links to the original",
    text: "Shows why ContentSeal is stronger than file metadata alone: reposts can lose metadata but still retain visual evidence."
  },
  {
    title: "Unknown AI-Style Media",
    result: "No Verified Origin Found",
    image: "/demo/assets/04-unknown-ai-style.png",
    file: "demo/assets/04-unknown-ai-style.png",
    command: "Scan without a matching proof",
    expected: "No verified origin, clear limitation statement",
    text: "This case keeps the product honest. Missing proof is not a fake verdict; it is an accountable unknown state."
  }
];

const labSteps = [
  "Run demo:assets to regenerate deterministic fixtures.",
  "Create proof for 01-original-proof.png.",
  "Scan 01, 02, 03, and 04 in sequence.",
  "Use the Trust Engine page to explain the decision signals."
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-void text-frost">
      <SiteNav tone="dark" />

      <section className="border-b border-white/10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-wire/30 bg-wire/10 px-3 py-2 text-sm font-semibold text-wire">
              <Sparkles size={16} />
              Technical demo kit
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
              Provenance evidence that looks inspectable, not decorative.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-frost/70">
              This page is a controlled test library for ContentSeal. Each image is a fixture with a
              specific verification outcome, so judges can see exact-match proof, modified-copy
              warning, screenshot recovery, local proof deletion, and honest unknown handling.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-pulse px-5 py-3 text-sm font-bold text-void hover:bg-wire"
                href="/create"
              >
                Start with Create Proof
                <Fingerprint size={18} />
              </a>
              <a
                className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-frost hover:bg-white/10"
                href="/verify"
              >
                Scan Any Image
                <ScanLine size={18} />
              </a>
            </div>
          </div>

          <aside className="rounded-md border border-white/10 bg-panel p-5">
            <CalendarClock className="text-pulse" size={24} />
            <h2 className="mt-4 text-xl font-semibold">Three-minute pitch path</h2>
            <ol className="mt-5 grid gap-3 text-sm leading-6 text-frost/70">
              {labSteps.map((step, index) => (
                <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3" key={step}>
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 font-mono text-xs text-wire">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-wire">Verification cases</p>
              <h2 className="mt-2 text-2xl font-semibold">Fixture gallery</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-frost/60">
              The thumbnails are intentionally compact. They are not hero artwork; they are test
              inputs for the create and scan flows.
            </p>
          </div>

          <DemoFixtureScanner cases={cases} />
        </div>
      </section>

      <section className="border-y border-white/10 bg-frost px-4 py-14 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-moss">
              <Database size={16} />
              Test data library
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Where the demo data lives</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/70">
              The generator writes the same four PNG fixtures into a local upload folder and a public
              preview folder. Use the local files for upload testing, and the public files for page
              thumbnails.
            </p>
          </div>

          <div className="rounded-md border border-ink/10 bg-white p-5">
            <FileCheck2 className="text-moss" size={24} />
            <div className="mt-4 grid gap-3 text-sm">
              <p>
                <span className="font-mono font-semibold">source:</span> demo/assets/*.png
              </p>
              <p>
                <span className="font-mono font-semibold">preview:</span> public/demo/assets/*.png
              </p>
              <p>
                <span className="font-mono font-semibold">regenerate:</span> npm.cmd run demo:assets
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-void px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 rounded-md border border-wire/25 bg-wire/10 p-6">
          <div>
            <p className="text-sm font-semibold text-wire">Demo closing line</p>
            <h2 className="mt-1 max-w-3xl text-2xl font-semibold">
              Fake detection asks users to guess after content spreads. ContentSeal lets trustworthy
              content carry evidence before it spreads.
            </h2>
          </div>
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-pulse px-4 py-2 text-sm font-bold text-void hover:bg-wire"
            href="/trust"
          >
            See Trust Engine
            <ArrowRight size={17} />
          </a>
        </div>
      </section>
    </main>
  );
}
