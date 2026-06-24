"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Fingerprint, ScanLine } from "lucide-react";

type DemoFixture = {
  title: string;
  result: string;
  image: string;
  file: string;
  command: string;
  expected: string;
  text: string;
};

export function DemoFixtureScanner({ cases }: { cases: DemoFixture[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const active = cases[activeIndex];

  useEffect(() => {
    setScanProgress(0);
    const timer = window.setInterval(() => {
      setScanProgress((progress) => {
        if (progress >= 100) {
          window.clearInterval(timer);
          return 100;
        }
        return progress + 4;
      });
    }, 42);

    return () => window.clearInterval(timer);
  }, [activeIndex]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="rounded-md border border-white/10 bg-panel p-4">
        <div className="fixture-screen relative overflow-hidden rounded-md border border-wire/20 bg-void">
          <img
            alt={active.title}
            className="aspect-[16/10] h-auto w-full object-cover opacity-90"
            src={active.image}
          />
          <div className="fixture-scan-line" />
          <div className="absolute left-3 top-3 rounded-md border border-wire/35 bg-void/80 px-3 py-2 font-mono text-xs text-wire backdrop-blur">
            scanning fixture {String(activeIndex + 1).padStart(2, "0")}
          </div>
          <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/10 bg-void/82 p-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3 font-mono text-xs">
              <span className="text-frost/60">analysis progress</span>
              <span className="text-pulse">{scanProgress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-pulse transition-all duration-100"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          {cases.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                className={`rounded-md border p-2 text-left transition ${
                  isActive
                    ? "border-wire/60 bg-wire/12"
                    : "border-white/10 bg-white/5 hover:border-wire/35 hover:bg-white/8"
                }`}
                key={item.title}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <img
                  alt=""
                  className="aspect-[4/3] w-full rounded border border-white/10 object-cover"
                  src={item.image}
                />
                <span className="mt-2 block truncate text-xs font-semibold text-frost">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <article className="rounded-md border border-white/10 bg-panel p-5">
        <p className="inline-flex items-center gap-2 rounded-md border border-wire/25 bg-wire/10 px-3 py-1.5 text-xs font-semibold text-wire">
          <CheckCircle2 size={14} />
          {active.result}
        </p>
        <h3 className="mt-5 text-3xl font-semibold">{active.title}</h3>
        <p className="mt-3 text-sm leading-6 text-frost/70">{active.text}</p>

        <div className="mt-6 grid gap-3 text-sm">
          {[
            ["file", active.file],
            ["action", active.command],
            ["expect", active.expected]
          ].map(([label, value]) => (
            <div
              className="rounded-md border border-white/10 bg-void/60 p-3"
              key={label}
            >
              <p className="font-mono text-xs uppercase text-pulse">{label}</p>
              <p className="mt-1 leading-6 text-frost/72">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="interactive-button inline-flex min-h-11 items-center gap-2 rounded-md bg-pulse px-4 py-2 text-sm font-bold text-void hover:bg-wire"
            href="/verify"
          >
            Verify this case
            <ScanLine size={17} />
          </a>
          <a
            className="interactive-button inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/7 px-4 py-2 text-sm font-bold text-frost hover:bg-white/12"
            href="/create"
          >
            Create first proof
            <Fingerprint size={17} />
            <ArrowRight size={17} />
          </a>
        </div>
      </article>
    </div>
  );
}
