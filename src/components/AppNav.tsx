"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Icons Matching Mobile Spec & Screenshot ──────────────────────────────────

function IconLayoutGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function IconRoute() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

// ── Nav Destinations ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Overview",     icon: <IconLayoutGrid /> },
  { href: "/route-reality", label: "RouteReality", icon: <IconRoute /> },
  { href: "/gig-proof",    label: "GigProof",     icon: <IconShieldCheck /> },
  { href: "/history",      label: "History",      icon: <IconHistory /> },
];

// ── Wordmark / Brand Symbol ───────────────────────────────────────────────────

function GigSenseBrand() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Sleek brand icon matching screenshot (blue-purple gradient squircle with white G) */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs" style={{ background: "linear-gradient(135deg, #0866F5 0%, #6366F1 100%)" }}>
        <span className="text-white font-extrabold text-base leading-none">G</span>
      </div>
      <span className="font-bold text-lg tracking-tight text-[#191B22] leading-none">
        GigSense
      </span>
    </div>
  );
}

// ── Main AppNav Component ─────────────────────────────────────────────────────

export function AppNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop: Top Navigation Bar ── */}
      <header
        className="hidden md:flex items-center h-14 px-6 border-b border-[#E7EAF1] bg-white sticky top-0 z-40"
      >
        <Link href="/dashboard" className="no-underline mr-8 shrink-0" aria-label="GigSense — go to overview">
          <GigSenseBrand />
        </Link>

        <nav className="flex items-center gap-1 flex-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline"
                style={{
                  color: active ? "#0866F5" : "#737B8C",
                  background: active ? "#EDF3FF" : "transparent",
                }}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Local / Offline status */}
        <div className="shrink-0 flex items-center gap-1.5 text-xs text-[#737B8C]" title="Local-first IndexedDB storage active">
          <span className="w-2 h-2 rounded-full bg-[#16865B]" />
          <span>Local mode</span>
        </div>
      </header>

      {/* ── Mobile: Bottom Navigation Bar (Matching Screenshot Exactly) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E7EAF1]"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-[58px]">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-1 flex-col items-center justify-center h-full gap-1 text-[11px] font-medium no-underline transition-colors"
                style={{
                  color: active ? "#0866F5" : "#737B8C",
                }}
                aria-current={active ? "page" : undefined}
              >
                {/* Active Indicator Top Blue Bar (As shown in screenshot above Overview) */}
                {active && (
                  <span
                    className="absolute top-0 left-6 right-6 h-[2.5px] bg-[#0866F5] rounded-full"
                    aria-hidden="true"
                  />
                )}
                <span className="shrink-0">
                  {item.icon}
                </span>
                <span className="tracking-tight leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
