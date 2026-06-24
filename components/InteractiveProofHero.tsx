"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Fingerprint,
  Radar,
  ScanLine,
  ShieldCheck
} from "lucide-react";

const signalStack = [
  {
    label: "SHA-256",
    value: "sealed original",
    score: 100,
    detail: "If the uploaded file is unchanged, the receipt matches byte-for-byte."
  },
  {
    label: "pHash",
    value: "screenshot recovery",
    score: 92,
    detail: "If metadata is stripped, visual fingerprints can still recover a likely source."
  },
  {
    label: "OCR diff",
    value: "changed claim",
    score: 88,
    detail: "Text conflict checks help flag changed dates, venues, links, and payment details."
  },
  {
    label: "Proof page",
    value: "human accountable",
    score: 76,
    detail: "The recovered source links back to who issued it, when, and whether it is still current."
  }
];

const readoutLines = [
  "metadata stripped by screenshot",
  "visual source recovered",
  "changed fields isolated",
  "proof page ready"
];

export function InteractiveProofHero() {
  const [activeSignal, setActiveSignal] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [typedLine, setTypedLine] = useState("");

  const active = signalStack[activeSignal];
  const currentLine = readoutLines[lineIndex];

  useEffect(() => {
    setTypedLine("");
    let character = 0;
    const typer = window.setInterval(() => {
      character += 1;
      setTypedLine(currentLine.slice(0, character));
      if (character >= currentLine.length) {
        window.clearInterval(typer);
      }
    }, 34);

    const nextLine = window.setTimeout(() => {
      setLineIndex((index) => (index + 1) % readoutLines.length);
    }, 2200);

    return () => {
      window.clearInterval(typer);
      window.clearTimeout(nextLine);
    };
  }, [currentLine]);

  useEffect(() => {
    const rotate = window.setInterval(() => {
      setActiveSignal((index) => (index + 1) % signalStack.length);
    }, 3600);

    return () => window.clearInterval(rotate);
  }, []);

  const signalSummary = useMemo(
    () => `${active.label}: ${active.value}`,
    [active.label, active.value]
  );

  return (
    <section
      className="relative isolate min-h-[78vh] overflow-hidden border-b border-white/10 interactive-grid-bg"
      onPointerMove={(event) => {
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--scan-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--scan-y", `${event.clientY - rect.top}px`);
      }}
    >
      <div className="absolute inset-0 proof-glare" />
      <div className="absolute inset-0 bg-void/35" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-void/80" />

      <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-wire/35 bg-wire/10 px-3 py-2 text-sm font-semibold text-wire">
            <ShieldCheck size={16} />
            Screenshot provenance recovery
          </div>

          <h1 className="scan-title max-w-4xl text-5xl font-semibold tracking-normal text-frost sm:text-6xl lg:text-7xl">
            When metadata disappears, recover the source.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-frost/75 sm:text-lg">
            ContentSeal helps ordinary people check a screenshot, repost, crop, compressed image,
            or direct image URL against lightweight proof receipts, then shows the recovered source,
            changed-copy risk, and what still cannot be proven.
          </p>

          <div className="mt-6 flex min-h-10 max-w-2xl items-center gap-3 rounded-md border border-white/10 bg-white/7 px-4 py-3 font-mono text-sm text-pulse">
            <ScanLine className="shrink-0 text-wire" size={18} />
            <span className="text-frost/50">scan:</span>
            <span className="scan-caret">{typedLine}</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="interactive-button inline-flex min-h-12 items-center gap-2 rounded-md bg-pulse px-5 py-3 text-sm font-bold text-void hover:bg-wire"
              href="/create"
            >
              Seal Original Source
              <ArrowRight size={18} />
            </a>
            <a
              className="interactive-button inline-flex min-h-12 items-center gap-2 rounded-md border border-white/18 bg-white/7 px-5 py-3 text-sm font-bold text-frost hover:bg-white/12"
              href="/verify"
            >
              Recover From Image
              <ScanLine size={18} />
            </a>
          </div>

          <div className="mt-8 grid max-w-5xl gap-3 sm:grid-cols-3">
            {[
              ["Exact original", "SHA-256 finds unchanged files"],
              ["Screenshot/repost", "pHash recovers source when bytes change"],
              ["Changed copy", "OCR and signals explain risk without fake claims"]
            ].map(([title, text]) => (
              <div
                className="scan-panel rounded-md border border-white/12 bg-white/7 p-4 backdrop-blur"
                key={title}
              >
                <p className="text-sm font-semibold text-frost">{title}</p>
                <p className="mt-1 text-xs leading-5 text-frost/60">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-md border border-wire/25 bg-panel/95 p-5 shadow-2xl shadow-wire/10">
          <div className="scanner-sweep" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase text-wire">Trust signal matrix</p>
                <h2 className="mt-2 text-2xl font-semibold">{signalSummary}</h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-md border border-wire/30 bg-wire/10 text-wire">
                <Radar size={24} />
              </div>
            </div>

            <p className="mt-4 min-h-12 text-sm leading-6 text-frost/68">{active.detail}</p>

            <div className="mt-6 grid gap-3">
              {signalStack.map((signal, index) => {
                const isActive = index === activeSignal;
                return (
                  <button
                    className={`group rounded-md border p-3 text-left transition ${
                      isActive
                        ? "border-wire/60 bg-wire/12"
                        : "border-white/10 bg-white/5 hover:border-wire/35 hover:bg-white/8"
                    }`}
                    key={signal.label}
                    onClick={() => setActiveSignal(index)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-frost/70">{signal.label}</span>
                      <span className="font-mono text-xs text-pulse">{signal.score}%</span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-pulse transition-all duration-700"
                        style={{ width: `${signal.score}%` }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-md border border-white/10 bg-void/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-wire">
                <Activity size={16} />
                Decision output
              </div>
              <p className="mt-3 font-mono text-sm leading-6 text-frost/72">
                recovered_source / metadata_stripped / proof_page_ready
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
