import {
  ArrowRight,
  BadgeCheck,
  Binary,
  CalendarClock,
  Database,
  FileText,
  Fingerprint,
  Link as LinkIcon,
  ScanLine,
  Sparkles
} from "lucide-react";
import { InteractiveProofHero } from "@/components/InteractiveProofHero";
import { SiteNav } from "@/components/SiteNav";

const trustSignals = [
  "Exact original match",
  "Screenshot recovery",
  "Crop and compression tolerance",
  "AI evidence explanation",
  "OCR conflict warning",
  "Proof lifecycle status",
  "Human-accountable issuer"
];

const routes = [
  {
    href: "/create",
    title: "Seal Source",
    text: "Issue a lightweight receipt for an original poster, notice, image, or public visual claim.",
    icon: Fingerprint
  },
  {
    href: "/verify",
    title: "Recover Source",
    text: "Upload a screenshot, repost, crop, compressed image, or paste a direct image URL to find a trusted source.",
    icon: ScanLine
  },
  {
    href: "/trust",
    title: "Trust Engine",
    text: "See how integrity, provenance, AI declaration, identity, and lifecycle signals stay separate.",
    icon: Database
  },
  {
    href: "/history",
    title: "Proof History",
    text: "Manage receipts, open proof pages, and delete proofs without cluttering the scan workflow.",
    icon: FileText
  },
  {
    href: "/demo",
    title: "Demo Cases",
    text: "Run the pitch story: original source, screenshot/repost, edited copy, unknown image, and deletion.",
    icon: Sparkles
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-void text-frost">
      <SiteNav tone="dark" />

      <InteractiveProofHero />

      <section className="border-b border-white/10 bg-graphite">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-7 lg:px-8">
          {trustSignals.map((signal) => (
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-void/45 px-3 py-3" key={signal}>
              <BadgeCheck className="text-pulse" size={16} />
              <span className="text-sm font-medium text-frost/80">{signal}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-void px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-wire">Product surface</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-frost">
                A lightweight recovery workflow for broken provenance.
              </h2>
            </div>
            <a className="inline-flex items-center gap-2 text-sm font-semibold text-pulse" href="/trust">
              Explore the trust model
              <ArrowRight size={16} />
            </a>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {routes.map((route) => {
              const Icon = route.icon;
              return (
                <a
                  className="group rounded-md border border-white/10 bg-panel p-5 transition hover:-translate-y-0.5 hover:border-wire/45 hover:bg-white/8"
                  href={route.href}
                  key={route.href}
                >
                  <div className="grid h-11 w-11 place-items-center rounded-md bg-white/8 text-wire group-hover:bg-wire group-hover:text-void">
                    <Icon size={21} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-frost">{route.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-frost/62">{route.text}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-pulse">
                    Open page
                    <ArrowRight size={16} />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-frost text-ink">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-moss">How the engine thinks</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              ContentSeal does not call something true. It shows why it can be trusted.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/70">
              The system separates deterministic proof from weaker context. A file can match a proof
              receipt exactly, look visually related after a screenshot, contain stripped metadata,
              include a self-declared issuer, or be expired. Those signals should not collapse into one vague score.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
              { icon: Fingerprint, title: "Recovery", text: "SHA-256 catches exact originals; pHash recovers screenshots, crops, and compressed reposts." },
              { icon: Binary, title: "Difference", text: "Metadata, OCR, C2PA, classifier, and watermark signals stay explainable." },
                { icon: CalendarClock, title: "Lifecycle", text: "Receipts can be active, expired, revoked, replaced, or deleted locally." },
                { icon: LinkIcon, title: "Proof page", text: "The proof link survives when platform metadata disappears." }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="rounded-md border border-ink/10 bg-white p-4" key={item.title}>
                    <Icon className="text-moss" size={20} />
                    <p className="mt-3 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-ink/10 bg-void p-3 text-frost">
            <img
              alt="Screenshot repost demo"
              className="h-64 w-full rounded-md object-cover"
              src="/demo/assets/03-screenshot-repost.png"
            />
            <div className="mt-3 grid gap-2 rounded-md bg-white/8 p-4">
              <p className="text-sm font-semibold text-wire">Source Recovered From Screenshot</p>
              <p className="text-sm leading-6 text-frost/70">
                Visually related to a known proof receipt, but not the original file. Metadata is gone,
                so users should open the recovered proof page before resharing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-void px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 rounded-md border border-wire/25 bg-wire/10 p-6">
          <div>
            <p className="text-sm font-semibold text-wire">Ready for the demo?</p>
            <h2 className="mt-1 text-2xl font-semibold text-frost">Seal the source first. Recover it from any copy later.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-pulse px-4 py-2 text-sm font-bold text-void hover:bg-wire" href="/create">
              Seal Source
              <Fingerprint size={17} />
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/7 px-4 py-2 text-sm font-bold text-frost hover:bg-white/12" href="/demo">
              View Demo Cases
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
