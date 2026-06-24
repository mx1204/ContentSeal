import { ArrowRight, Fingerprint, SearchCheck, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Seal Source" },
  { href: "/verify", label: "Recover Source" },
  { href: "/trust", label: "Trust Engine" },
  { href: "/demo", label: "Demo" }
];

export function SiteNav({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const isDark = tone === "dark";

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur ${
        isDark
          ? "border-white/10 bg-void/85 text-frost"
          : "border-ink/10 bg-paper/90 text-ink"
      }`}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a className="flex items-center gap-3" href="/">
          <span
            className={`grid h-10 w-10 place-items-center rounded-md ${
              isDark ? "bg-frost text-void" : "bg-ink text-white"
            }`}
          >
            <ShieldCheck size={22} />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-normal">ContentSeal</span>
            <span className={`block text-xs ${isDark ? "text-frost/55" : "text-ink/55"}`}>
              Screenshot provenance recovery
            </span>
          </span>
        </a>

        <nav
          className={`order-3 flex w-full gap-1 overflow-x-auto border-t py-2 md:order-none md:w-auto md:border-0 md:py-0 ${
            isDark ? "border-white/10" : "border-ink/10"
          }`}
        >
          {navItems.map((item) => (
            <a
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                isDark ? "text-frost/70 hover:bg-white/10 hover:text-frost" : "text-ink/70 hover:bg-white"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            className={`hidden min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold sm:inline-flex ${
              isDark
                ? "border-white/15 bg-white/5 text-frost hover:bg-white/10"
                : "border-ink/15 bg-white text-ink hover:bg-mint"
            }`}
            href="/verify"
          >
            <SearchCheck size={16} />
            Recover
          </a>
          <a
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
              isDark ? "bg-pulse text-void hover:bg-wire" : "bg-ink text-white hover:bg-moss"
            }`}
            href="/create"
          >
            <Fingerprint size={16} />
            Create
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}
