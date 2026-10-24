"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function IconRoute() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
    </svg>
  );
}

// ── Nav data ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Overview",      icon: <IconDashboard /> },
  { href: "/route-reality", label: "RouteReality",  icon: <IconRoute /> },
  { href: "/gig-proof",    label: "GigProof",      icon: <IconShield /> },
  { href: "/history",      label: "History",       icon: <IconHistory /> },
];

// ── Wordmark ──────────────────────────────────────────────────────────────────

function GigSenseLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-black select-none"
        style={{ background: "var(--gs-green)", letterSpacing: "-0.02em" }}
        aria-hidden="true"
      >
        G
      </div>
      <div>
        <span
          className="font-bold text-base tracking-tight leading-none block"
          style={{ color: "var(--gs-text-primary)" }}
        >
          GigSense
        </span>
        <span className="text-[10px] leading-none block" style={{ color: "var(--gs-text-muted)" }}>
          For gig workers
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AppNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop: top nav bar ── */}
      <header
        className="hidden md:flex items-center h-14 px-5 border-b border-[var(--gs-border)] bg-[var(--gs-nav-bg)] sticky top-0 z-40"
        style={{ boxShadow: "0 1px 0 var(--gs-border)" }}
      >
        <Link href="/dashboard" className="no-underline mr-8 shrink-0" aria-label="GigSense — go to overview">
          <GigSenseLogo />
        </Link>

        <nav className="flex items-center gap-0.5 flex-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors no-underline"
                style={{
                  color: active ? "var(--gs-green)" : "var(--gs-text-secondary)",
                  background: active ? "var(--gs-green-subtle)" : "transparent",
                }}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* PWA / offline indicator — subtle, right side */}
        <div
          className="shrink-0 ml-4 flex items-center gap-1.5 text-xs"
          style={{ color: "var(--gs-text-muted)" }}
          title="Data stored locally on your device"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" opacity=".3"/>
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
          </svg>
          <span className="hidden lg:inline">Local</span>
        </div>
      </header>

      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--gs-border)] bg-[var(--gs-nav-bg)]"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -1px 0 var(--gs-border)",
        }}
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium no-underline transition-colors"
              style={{
                color: active ? "var(--gs-green)" : "var(--gs-text-muted)",
              }}
              aria-current={active ? "page" : undefined}
            >
              <span
                className="p-1 rounded-lg transition-colors"
                style={{ background: active ? "var(--gs-green-subtle)" : "transparent" }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
