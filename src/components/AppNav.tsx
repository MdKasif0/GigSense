"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// ── Icons Matching Bottom Nav in Screenshot ───────────────────────────────────

function IconOverview() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function IconRouteNav() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19h4.5a4 4 0 0 0 4-4v0a4 4 0 0 0-4-4H9a4 4 0 0 1-4-4v0a4 4 0 0 1 4-4h6.5" />
    </svg>
  );
}

function IconShieldNav() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconHistoryNav() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

// ── Nav Destinations ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Overview",     icon: <IconOverview /> },
  { href: "/route-reality", label: "RouteReality", icon: <IconRouteNav /> },
  { href: "/gig-proof",    label: "GigProof",     icon: <IconShieldNav /> },
  { href: "/history",      label: "History",      icon: <IconHistoryNav /> },
];

// ── Brand Wordmark Component ──────────────────────────────────────────────────

function GigSenseBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
        <Image
          src="/brand/gigsense-logo.png"
          alt="GigSense"
          width={32}
          height={32}
          priority
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-bold text-xl tracking-tight text-[#111827] leading-none">
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
        className="hidden md:flex items-center h-14 px-6 border-b border-[#EEF2F6] bg-white sticky top-0 z-40"
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
                  color: active ? "#1D64F2" : "#6B7280",
                  background: active ? "#EDF4FF" : "transparent",
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
        <div className="shrink-0 flex items-center gap-1.5 text-xs text-[#6B7280]" title="Local-first IndexedDB storage active">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          <span>Local mode</span>
        </div>
      </header>

      {/* ── Mobile: Bottom Navigation Bar (Exact match to reference image) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EEF2F6]"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.03)",
        }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-[62px]">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-1 flex-col items-center justify-center h-full pt-1.5 pb-1 gap-1 text-[11px] no-underline transition-colors"
                style={{
                  color: active ? "#1D64F2" : "#6B7280",
                  fontWeight: active ? 600 : 400,
                }}
                aria-current={active ? "page" : undefined}
              >
                {/* Active Indicator Top Blue Bar (As shown in screenshot above Overview) */}
                {active && (
                  <span
                    className="absolute top-0 w-8 h-[2.5px] bg-[#1D64F2] rounded-full"
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
