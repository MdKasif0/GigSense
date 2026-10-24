"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listDeliveries, listIncidents } from "@/lib/db";
import { getProfitabilityVerdict } from "@/lib/calculations";
import type { DeliveryAnalysis } from "@/types/delivery";
import type { IncidentRecord } from "@/types/incident";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconTrendUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>
    </svg>
  );
}

function IconArrowUpRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return "";
  }
}

// Sensible demo presets for quick testing
const QUICK_PRESETS = [
  { label: "₹85 · 8 km (Zomato)", pay: "85", km: "8", mins: "30", platform: "Zomato" },
  { label: "₹140 · 12 km (Swiggy)", pay: "140", km: "12", mins: "40", platform: "Swiggy" },
  { label: "₹220 · 18 km (Porter)", pay: "220", km: "18", mins: "65", platform: "Porter" },
  { label: "₹50 · 4 km (Zepto)", pay: "50", km: "4", mins: "18", platform: "Zepto" },
];

// Sample records when IndexedDB is empty (clearly labeled as sample)
const SAMPLE_DELIVERIES: Partial<DeliveryAnalysis>[] = [
  {
    id: "sample-1",
    platform: "Zomato",
    offeredPayment: 95,
    estimatedDistanceKm: 7.5,
    estimatedDurationMinutes: 28,
    calculatedVehicleCost: 26.25,
    estimatedContribution: 68.75,
    estimatedContributionPerHour: 147.32,
    createdAt: "2026-10-24T06:00:00.000Z",
    analysisMode: "sample",
  },
  {
    id: "sample-2",
    platform: "Swiggy",
    offeredPayment: 42,
    estimatedDistanceKm: 6.2,
    estimatedDurationMinutes: 32,
    calculatedVehicleCost: 21.7,
    estimatedContribution: 20.3,
    estimatedContributionPerHour: 38.06,
    createdAt: "2026-10-24T04:00:00.000Z",
    analysisMode: "sample",
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardClient() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryAnalysis[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickInput, setQuickInput] = useState("");

  useEffect(() => {
    Promise.all([listDeliveries(), listIncidents()])
      .then(([d, i]) => { setDeliveries(d); setIncidents(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const recentDeliveries = deliveries.length > 0 ? deliveries.slice(0, 3) : (SAMPLE_DELIVERIES as DeliveryAnalysis[]);
  const recentIncidents = incidents.slice(0, 3);
  const isShowingSample = deliveries.length === 0 && !loading;

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickInput.trim()) {
      router.push("/route-reality");
      return;
    }
    // Navigate with prefilled payment
    const num = parseFloat(quickInput);
    if (!isNaN(num) && num > 0) {
      router.push(`/route-reality?pay=${num}`);
    } else {
      router.push("/route-reality");
    }
  }

  function handlePresetClick(preset: typeof QUICK_PRESETS[0]) {
    router.push(`/route-reality?pay=${preset.pay}&km=${preset.km}&mins=${preset.mins}&platform=${encodeURIComponent(preset.platform)}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 pb-4">
      {/* ── Top Bar: Avatar + Badge (Matching Reference UI) ── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--gs-green), #1b4332)" }}
              aria-label="Gig worker profile"
            >
              GS
            </div>
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
              style={{ background: "var(--gs-green-light)" }}
              title="Device storage ready"
            />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--gs-text-muted)" }}>
              GigSense PWA
            </span>
            <div className="text-xs font-medium" style={{ color: "var(--gs-text-secondary)" }}>
              Driver & Courier Suite
            </div>
          </div>
        </div>

        {/* Local persistence status */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "var(--gs-green-subtle)",
            color: "var(--gs-green)",
            border: "1px solid rgba(45, 106, 79, 0.2)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gs-green)" }} />
          <span>Stored locally</span>
        </div>
      </div>

      {/* ── Welcome Heading (Matching Reference UI) ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight" style={{ color: "var(--gs-text-primary)" }}>
          Hello Partner, 👋
        </h1>
        <p className="mt-1 text-base sm:text-lg font-normal leading-snug" style={{ color: "var(--gs-text-secondary)" }}>
          Know your real earnings, whenever you ride.
        </p>
      </div>

      {/* ── 2x2 Grid of Action Cards (Faithfully Matching Reference UI) ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <ActionCard
          href="/route-reality"
          icon={<IconTrendUp />}
          title="Analyse Delivery"
          sub="Check real net profit"
          id="dash-action-route-reality"
        />
        <ActionCard
          href="/gig-proof"
          icon={<IconShield />}
          title="Document Incident"
          sub="Save evidence & log"
          id="dash-action-gig-proof"
        />
        <ActionCard
          href="/history"
          icon={<IconHistory />}
          title="Work History"
          sub="Saved analyses & timeline"
          id="dash-action-history"
        />
        <ActionCard
          href="/route-reality"
          icon={<IconCalculator />}
          title="Rate Calculator"
          sub="Fuel & vehicle cost guide"
          id="dash-action-rates"
        />
      </div>

      {/* ── Recent Activity / Quick Presets (Matching Reference UI) ── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--gs-text-primary)" }}>
            Quick Offer Check
          </h2>
          <Link href="/history" className="text-xs sm:text-sm font-medium no-underline hover:underline" style={{ color: "var(--gs-green)" }}>
            See all →
          </Link>
        </div>

        {/* Horizontal Chips / Preset Pills (Matching reference filter pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" tabIndex={0} aria-label="Quick preset delivery offers">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              type="button"
              className="gs-chip shrink-0 cursor-pointer"
              title={`Load ${preset.label} into RouteReality`}
            >
              <span>{preset.label}</span>
              <span className="text-[10px] opacity-60">↗</span>
            </button>
          ))}
        </div>

        {/* ── Recent Records List ── */}
        <div className="space-y-2 mt-2">
          {isShowingSample && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium" style={{ color: "var(--gs-text-muted)" }}>
                Sample records shown below:
              </span>
              <span className="gs-badge-warn text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                Sample Data
              </span>
            </div>
          )}

          {recentDeliveries.map((rec) => {
            const v = getProfitabilityVerdict(rec.estimatedContributionPerHour);
            const vColor = v === "good" ? "var(--gs-success)" : v === "marginal" ? "var(--gs-warning)" : "var(--gs-error)";
            const vBg = v === "good" ? "var(--gs-success-bg)" : v === "marginal" ? "var(--gs-warning-bg)" : "var(--gs-error-bg)";
            return (
              <Link
                key={rec.id}
                href="/route-reality"
                className="gs-card-modern p-3.5 flex items-center justify-between gap-3 no-underline transition-all block"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: vBg, color: vColor }}
                  >
                    <IconTrendUp />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--gs-text-primary)" }}>
                        {rec.platform || "Delivery Offer"} · {fmtCurrency(rec.offeredPayment)}
                      </p>
                      {rec.analysisMode === "sample" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-100 text-amber-800">
                          Sample
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-secondary)" }}>
                      {rec.estimatedDistanceKm} km · {rec.estimatedDurationMinutes} mins · {fmtCurrency(rec.estimatedContributionPerHour)}/hr contribution
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ background: vBg, color: vColor }}
                  >
                    {v === "good" ? "Profitable" : v === "marginal" ? "Marginal" : "Low"}
                  </span>
                </div>
              </Link>
            );
          })}

          {recentIncidents.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gs-text-muted)" }}>
                Recent Incidents
              </p>
              {recentIncidents.slice(0, 2).map((inc) => (
                <Link
                  key={inc.id}
                  href="/gig-proof"
                  className="gs-card-modern p-3.5 flex items-center justify-between gap-3 no-underline block"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--gs-surface-alt)", color: "var(--gs-green)" }}
                    >
                      <IconShield />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--gs-text-primary)" }}>
                        {inc.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-secondary)" }}>
                        {inc.platform ? `${inc.platform} · ` : ""}{inc.evidence.length} evidence file{inc.evidence.length !== 1 ? "s" : ""} · {fmtDate(inc.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--gs-text-muted)" }}>
                    Documented
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Quick Check Bar (Matching "Ask anything..." pill in Reference UI) ── */}
      <form
        onSubmit={handleQuickSubmit}
        className="gs-input-pill p-2 flex items-center gap-2"
        role="search"
        aria-label="Quick delivery offer lookup"
      >
        <button
          type="button"
          onClick={() => router.push("/route-reality")}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: "var(--gs-surface-alt)", color: "var(--gs-text-secondary)" }}
          title="New offer calculation"
          aria-label="New offer calculation"
        >
          <span className="text-lg font-light leading-none">+</span>
        </button>

        <input
          type="number"
          min="0"
          step="1"
          placeholder="Quick check: Enter payment ₹ (e.g. 110)..."
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm px-2"
          style={{ color: "var(--gs-text-primary)" }}
        />

        <button
          type="submit"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95"
          style={{ background: "var(--gs-green)", color: "#ffffff" }}
          aria-label="Analyse offer now"
          title="Analyse offer now"
        >
          <IconSend />
        </button>
      </form>

      {/* ── Value Proposition / Worker Protection Card (Screen 3 style) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "var(--gs-surface)",
          border: "1px solid var(--gs-border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "var(--gs-green-subtle)", color: "var(--gs-green)" }}
          >
            <IconShield />
          </div>
          <div className="text-sm leading-relaxed" style={{ color: "var(--gs-text-secondary)" }}>
            <span className="font-semibold text-[var(--gs-text-primary)]">GigSense protects your income. </span>
            RouteReality calculates your <strong>real hourly contribution</strong> after vehicle wear and fuel. GigProof organizes <strong>timestamped evidence</strong> and statements on your device for formal dispute appeals.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: 2x2 Action Card (Faithfully Matching Reference UI) ──────────

function ActionCard({
  href, icon, title, sub, id,
}: {
  href: string; icon: React.ReactNode; title: string; sub: string; id: string;
}) {
  return (
    <Link
      id={id}
      href={href}
      className="gs-card-modern p-4 sm:p-5 flex flex-col justify-between no-underline group block"
      style={{ minHeight: "135px" }}
    >
      {/* Top row: Icon on left, Diagonal arrow circle on right */}
      <div className="flex items-center justify-between w-full">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
          style={{
            background: "var(--gs-green-subtle)",
            color: "var(--gs-green)",
          }}
        >
          {icon}
        </div>
        <div className="gs-arrow-btn" aria-hidden="true">
          <IconArrowUpRight />
        </div>
      </div>

      {/* Bottom text: Title and sub-hint */}
      <div className="mt-3">
        <h3
          className="text-sm sm:text-base font-bold leading-tight"
          style={{ color: "var(--gs-text-primary)" }}
        >
          {title}
        </h3>
        <p className="text-[11px] sm:text-xs mt-0.5 font-medium leading-tight" style={{ color: "var(--gs-text-muted)" }}>
          {sub}
        </p>
      </div>
    </Link>
  );
}
