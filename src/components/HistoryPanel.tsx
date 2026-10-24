"use client";

import { useState, useEffect } from "react";
import { listDeliveries, listIncidents, deleteDelivery, deleteIncident, addSampleData } from "@/lib/db";
import { getProfitabilityVerdict } from "@/lib/calculations";
import type { DeliveryAnalysis } from "@/types/delivery";
import type { IncidentRecord } from "@/types/incident";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = "deliveries" | "incidents";

export function HistoryPanel() {
  const [tab, setTab] = useState<Tab>("deliveries");
  const [deliveries, setDeliveries] = useState<DeliveryAnalysis[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listDeliveries(), listIncidents()])
      .then(([d, i]) => { setDeliveries(d); setIncidents(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDeleteDelivery(id: string) {
    await deleteDelivery(id);
    setDeliveries((d) => d.filter((x) => x.id !== id));
  }

  async function handleDeleteIncident(id: string) {
    await deleteIncident(id);
    setIncidents((i) => i.filter((x) => x.id !== id));
  }

  async function handleAddSamples() {
    await addSampleData();
    const [deliveries, incidents] = await Promise.all([listDeliveries(), listIncidents()]);
    setDeliveries(deliveries);
    setIncidents(incidents);
  }

  if (loading) {
    return (
      <div className="gs-card p-8 text-center text-sm" style={{ color: "var(--gs-text-muted)" }}>
        Loading history…
      </div>
    );
  }

  const total = deliveries.length + incidents.length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{ background: "var(--gs-surface-alt)", border: "1px solid var(--gs-border)" }}
        role="tablist"
        aria-label="History tabs"
      >
        <TabButton
          active={tab === "deliveries"}
          onClick={() => setTab("deliveries")}
          id="tab-deliveries"
          count={deliveries.length}
        >
          Delivery Analyses
        </TabButton>
        <TabButton
          active={tab === "incidents"}
          onClick={() => setTab("incidents")}
          id="tab-incidents"
          count={incidents.length}
        >
          Incident Records
        </TabButton>
      </div>

      <div className="flex justify-end">
        <button className="gs-btn-secondary" onClick={handleAddSamples} style={{ fontSize: "0.8rem", padding: "0.45rem 0.7rem" }}>
          Add clearly labelled demo data
        </button>
      </div>

      {/* Empty overall */}
      {total === 0 && (
        <div className="gs-card-modern p-8 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--gs-text-primary)" }}>No records yet</p>
          <p className="text-sm" style={{ color: "var(--gs-text-muted)" }}>
            Analyse a delivery or document an incident to see it here.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <a href="/route-reality" className="gs-btn-primary" style={{ fontSize: "0.875rem" }}>Analyse a Delivery</a>
            <a href="/gig-proof" className="gs-btn-secondary" style={{ fontSize: "0.875rem" }}>Document Incident</a>
          </div>
        </div>
      )}

      {/* Deliveries */}
      {tab === "deliveries" && (
        <div>
          {deliveries.length === 0 ? (
            <div className="gs-card p-6 text-sm" style={{ color: "var(--gs-text-muted)" }}>
              No delivery analyses saved yet.{" "}
              <a href="/route-reality" style={{ color: "var(--gs-green)" }}>Analyse a delivery →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.map((rec) => {
                const verdict = getProfitabilityVerdict(rec.estimatedContributionPerHour);
                return (
                  <DeliveryRow
                    key={rec.id}
                    record={rec}
                    verdict={verdict}
                    onDelete={() => handleDeleteDelivery(rec.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Incidents */}
      {tab === "incidents" && (
        <div>
          {incidents.length === 0 ? (
            <div className="gs-card p-6 text-sm" style={{ color: "var(--gs-text-muted)" }}>
              No incidents documented yet.{" "}
              <a href="/gig-proof" style={{ color: "var(--gs-green)" }}>Document an incident →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((rec) => (
                <IncidentRow
                  key={rec.id}
                  record={rec}
                  onDelete={() => handleDeleteIncident(rec.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, id, count, children,
}: {
  active: boolean; onClick: () => void; id: string; count: number; children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--gs-surface)" : "transparent",
        color: active ? "var(--gs-text-primary)" : "var(--gs-text-muted)",
        boxShadow: active ? "var(--gs-shadow-sm)" : "none",
      }}
    >
      {children}
      <span
        className="rounded-full text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center"
        style={{
          background: active ? "var(--gs-primary-subtle)" : "var(--gs-border)",
          color: active ? "var(--gs-primary)" : "var(--gs-text-muted)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function VerdictBadge({ verdict }: { verdict: "good" | "marginal" | "poor" }) {
  const map = {
    good: { cls: "gs-badge-good", text: "Good" },
    marginal: { cls: "gs-badge-warn", text: "Marginal" },
    poor: { cls: "gs-badge-error", text: "Poor" },
  };
  const { cls, text } = map[verdict];
  return <span className={cls}>{text}</span>;
}

function DeliveryRow({
  record, verdict, onDelete,
}: {
  record: DeliveryAnalysis; verdict: "good" | "marginal" | "poor"; onDelete: () => void;
}) {
  return (
    <div className="gs-card-modern px-4 py-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm" style={{ color: "var(--gs-text-primary)" }}>
            {record.platform || "Unnamed delivery"}
          </span>
          <VerdictBadge verdict={verdict} />
          {record.analysisMode === "sample" && (
            <span className="gs-badge-warn" style={{ fontSize: "0.7rem" }}>Sample</span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-muted)" }}>
          ₹{record.offeredPayment} offered ·{" "}
          {fmtCurrency(record.estimatedContributionPerHour)}/hr ·{" "}
          {record.estimatedDistanceKm} km · {fmtDate(record.createdAt)}
        </p>
      </div>
      <button
        aria-label="Delete delivery analysis"
        onClick={onDelete}
        className="shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--gs-surface-alt)]"
        style={{ color: "var(--gs-text-muted)" }}
      >
        <IconTrash />
      </button>
    </div>
  );
}

function IncidentRow({
  record, onDelete,
}: {
  record: IncidentRecord; onDelete: () => void;
}) {
  return (
    <div className="gs-card-modern px-4 py-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm" style={{ color: "var(--gs-text-primary)" }}>{record.title}</span>
          {record.platform && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "var(--gs-surface-alt)", color: "var(--gs-text-secondary)" }}
            >
              {record.platform}
            </span>
          )}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: record.analysisStatus === "complete" ? "var(--gs-success-bg)" : "var(--gs-surface-alt)",
              color: record.analysisStatus === "complete" ? "var(--gs-success)" : "var(--gs-text-muted)",
            }}
          >
            {record.analysisStatus === "pending" ? "Pending" : record.analysisStatus}
          </span>
          {record.analysisMode === "sample" && (
            <span className="gs-badge-warn" style={{ fontSize: "0.7rem" }}>Sample</span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-muted)" }}>
          {record.evidence.length} file{record.evidence.length !== 1 ? "s" : ""} · {fmtDate(record.createdAt)}
        </p>
      </div>
      <button
        aria-label={`Delete incident: ${record.title}`}
        onClick={onDelete}
        className="shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--gs-surface-alt)]"
        style={{ color: "var(--gs-text-muted)" }}
      >
        <IconTrash />
      </button>
    </div>
  );
}
