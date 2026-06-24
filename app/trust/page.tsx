import {
  AlertTriangle,
  BadgeCheck,
  Binary,
  Database,
  FileSearch,
  Fingerprint,
  GitBranch,
  ScanLine,
  ShieldCheck
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";

const pipeline = [
  {
    title: "Media intake",
    text: "Validate any uploaded image, store the local file, extract safe public metadata, and generate a media ID.",
    icon: FileSearch
  },
  {
    title: "Integrity fingerprints",
    text: "Compute SHA-256 for exact identity and perceptual hashes for resized, compressed, cropped, or reposted media.",
    icon: Fingerprint
  },
  {
    title: "Signal inspection",
    text: "Read metadata, optional C2PA, watermark and classifier signals, then keep each signal explainable.",
    icon: Binary
  },
  {
    title: "Decision layer",
    text: "Classify verified original, modified copy, screenshot match, expired content, older version, unknown, or conflict.",
    icon: GitBranch
  },
  {
    title: "Content Trust Card",
    text: "Generate a human-readable summary with verified facts, uncertainty, and recommended action.",
    icon: ShieldCheck
  }
];

const labels = [
  ["Verified Original", "Exact file hash matches an active proof receipt."],
  ["Modified Copy", "Visual match exists, but the uploaded file differs."],
  ["Screenshot / Repost Match", "Looks related to verified content, but metadata and exact hash are missing."],
  ["Expired Content", "The receipt was valid before, but should not be treated as current."],
  ["Older Verified Version", "A known receipt exists, but a newer version should be checked."],
  ["No Verified Origin Found", "No matching proof receipt was found. This does not prove the content is fake."],
  ["Conflicting Signals", "Some signals match while others conflict with the proof receipt."]
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-void text-frost">
      <SiteNav tone="dark" />

      <section className="border-b border-white/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-wire">Trust Engine</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">
              Provenance signals, separated on purpose.
            </h1>
            <p className="mt-4 text-base leading-7 text-frost/70">
              ContentSeal does not compress trust into a vague score. It separates file integrity, visual
              similarity, creator accountability, declared AI usage, C2PA availability, and lifecycle status.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {pipeline.map((step, index) => {
              const Icon = step.icon;
              return (
                <div className="rounded-md border border-white/10 bg-panel p-5" key={step.title}>
                  <div className="flex items-center justify-between gap-4">
                    <Icon className="text-wire" size={22} />
                    <span className="font-mono text-xs text-frost/35">0{index + 1}</span>
                  </div>
                  <h2 className="mt-5 text-base font-semibold">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-frost/62">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-frost px-4 py-16 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <p className="text-sm font-semibold text-moss">Trust labels</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">Clear labels, cautious claims.</h2>
            <div className="mt-8 grid gap-3">
              {labels.map(([title, text]) => (
                <div className="rounded-md border border-ink/10 bg-white p-4" key={title}>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 shrink-0 text-moss" size={18} />
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-ink/65">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-md border border-ink/10 bg-void p-5 text-frost">
            <Database className="text-pulse" size={24} />
            <h2 className="mt-4 text-xl font-semibold">What the receipt stores</h2>
            <div className="mt-5 grid gap-3 text-sm text-frost/70">
              <p>Receipt ID, media ID, SHA-256 hash, perceptual hash variants, timestamp.</p>
              <p>Creator claim, creator trust level, organisation, official source URL.</p>
              <p>Declared AI usage, intended channel, audience, expiry, version, proof status.</p>
              <p>C2PA status, metadata status, evidence summary, and recommended action.</p>
            </div>
            <div className="mt-6 rounded-md border border-amber/35 bg-amber/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber">
                <AlertTriangle size={16} />
                Guardrail
              </p>
              <p className="mt-2 text-sm leading-6 text-frost/70">
                Origin proof is not truth proof. Missing proof is not proof of fakery. Identity is self-declared
                unless a stronger trust level is present.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-void px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 rounded-md border border-wire/25 bg-wire/10 p-6">
          <div>
            <p className="text-sm font-semibold text-wire">Try the engine</p>
            <h2 className="mt-1 text-2xl font-semibold">Scan any saved image through the proof console.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-pulse px-4 py-2 text-sm font-bold text-void hover:bg-wire" href="/create">
              Create Proof
              <Fingerprint size={17} />
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/7 px-4 py-2 text-sm font-bold text-frost hover:bg-white/12" href="/verify">
              Scan Any Image
              <ScanLine size={17} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
