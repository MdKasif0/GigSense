"use client";

import { useState, useEffect, useRef } from "react";
import {
  calculateDeliveryProfitability,
  getProfitabilityVerdict,
  formatDuration,
  validateDeliveryInputs,
} from "@/lib/calculations";
import { saveDelivery, listDeliveries, deleteDelivery, generateId } from "@/lib/db";
import type { DeliveryAnalysis } from "@/types/delivery";

// ── Icons ────────────────────────────────────────────────────────────────────

function IconRoute() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconRupee() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12M6 8h12M10 21 6 8"/><path d="M6 13h3a4 4 0 0 0 0-8"/>
    </svg>
  );
}
function IconCar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 17H5V9l3-6h8l3 6Z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function verdictLabel(v: "good" | "marginal" | "poor") {
  if (v === "good") return { text: "Good", cls: "gs-badge-good" };
  if (v === "marginal") return { text: "Marginal", cls: "gs-badge-warn" };
  return { text: "Poor", cls: "gs-badge-error" };
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${mins}`;
  } catch {
    return "";
  }
}

function parseNumericInput(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  platform: string;
  offeredPayment: string;
  estimatedDistanceKm: string;
  estimatedDurationMinutes: string;
  vehicleCostPerKm: string;
  additionalExpenses: string;
}

interface FormErrors {
  offeredPayment?: string;
  estimatedDistanceKm?: string;
  estimatedDurationMinutes?: string;
  vehicleCostPerKm?: string;
  additionalExpenses?: string;
}

const INITIAL_FORM: FormState = {
  platform: "",
  offeredPayment: "85",
  estimatedDistanceKm: "8",
  estimatedDurationMinutes: "30",
  vehicleCostPerKm: "3.50",
  additionalExpenses: "0",
};

// ── Main Component ────────────────────────────────────────────────────────────

export function DeliveryAnalyzer() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<DeliveryAnalysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<DeliveryAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listDeliveries()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));

    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const pay = p.get("pay");
      const km = p.get("km");
      const mins = p.get("mins");
      const platform = p.get("platform");
      if (pay || km || mins || platform) {
        window.setTimeout(() => {
          setForm((f) => ({
            ...f,
            ...(pay ? { offeredPayment: pay } : {}),
            ...(km ? { estimatedDistanceKm: km } : {}),
            ...(mins ? { estimatedDurationMinutes: mins } : {}),
            ...(platform ? { platform } : {}),
          }));
        }, 0);
      }
    }
  }, []);

  function setField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    if (result) { setResult(null); setSaved(false); }
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    const pay = parseNumericInput(form.offeredPayment);
    const dist = parseNumericInput(form.estimatedDistanceKm);
    const dur = parseNumericInput(form.estimatedDurationMinutes);
    const cost = parseNumericInput(form.vehicleCostPerKm);
    const extra = form.additionalExpenses.trim() === "" ? 0 : parseNumericInput(form.additionalExpenses);
    const error = validateDeliveryInputs(pay, dist, dur, cost, extra);
    if (error) {
      if (isNaN(pay) || pay < 0) errs.offeredPayment = "Enter a nonnegative payment amount.";
      if (isNaN(dist) || dist <= 0) errs.estimatedDistanceKm = "Enter a distance greater than zero.";
      if (isNaN(dur) || dur <= 0) errs.estimatedDurationMinutes = "Enter a duration greater than zero.";
      if (isNaN(cost) || cost < 0) errs.vehicleCostPerKm = "Enter a nonnegative cost per km.";
      if (isNaN(extra) || extra < 0) errs.additionalExpenses = "Enter nonnegative additional expenses.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function analyse() {
    if (!validate()) return;
    const pay = parseNumericInput(form.offeredPayment);
    const dist = parseNumericInput(form.estimatedDistanceKm);
    const dur = parseNumericInput(form.estimatedDurationMinutes);
    const cost = parseNumericInput(form.vehicleCostPerKm);
    const extra = form.additionalExpenses.trim() === "" ? 0 : parseNumericInput(form.additionalExpenses);
    const calc = calculateDeliveryProfitability(pay, dist, dur, cost, extra);
    const record: DeliveryAnalysis = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      platform: form.platform || undefined,
      offeredPayment: pay,
      estimatedDistanceKm: dist,
      estimatedDurationMinutes: dur,
      vehicleCostPerKm: cost,
      additionalExpenses: extra,
      ...calc,
      isCompleted: false,
      analysisMode: "real",
    };
    setResult(record);
    setSaved(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await saveDelivery(result);
      setHistory((h) => [result, ...h.filter((x) => x.id !== result.id)]);
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteDelivery(id);
    setHistory((h) => h.filter((x) => x.id !== id));
  }

  function handleOpen(record: DeliveryAnalysis) {
    setForm({
      platform: record.platform ?? "",
      offeredPayment: String(record.offeredPayment),
      estimatedDistanceKm: String(record.estimatedDistanceKm),
      estimatedDurationMinutes: String(record.estimatedDurationMinutes),
      vehicleCostPerKm: String(record.vehicleCostPerKm),
      additionalExpenses: String(record.additionalExpenses ?? 0),
    });
    setResult(record);
    setSaved(true);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setResult(null);
    setSaved(false);
    setErrors({});
  }

  const verdict = result ? getProfitabilityVerdict(result.estimatedContributionPerHour) : null;

  return (
    <div className="space-y-6">
      {/* ── Form card ── */}
      <div className="gs-card-modern p-6 sm:p-7">
        <h2 className="text-base font-semibold mb-5" style={{ color: "var(--gs-text-primary)" }}>
          Offer Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Platform */}
          <div className="sm:col-span-2">
            <label htmlFor="rr-platform" className="gs-label">Platform <span style={{ color: "var(--gs-text-muted)", fontWeight: 400 }}>(optional)</span></label>
            <input
              id="rr-platform"
              className="gs-input"
              placeholder="e.g. Zomato, Swiggy, Porter"
              value={form.platform}
              onChange={(e) => setField("platform", e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Payment */}
          <div>
            <label htmlFor="rr-payment" className="gs-label">
              <span className="flex items-center gap-1.5"><IconRupee />Offered Payment (₹)</span>
            </label>
            <input
              id="rr-payment"
              className={`gs-input${errors.offeredPayment ? " border-[var(--gs-error)]" : ""}`}
              type="number"
              min="0"
              step="0.5"
              placeholder="85"
              value={form.offeredPayment}
              onChange={(e) => setField("offeredPayment", e.target.value)}
            />
            {errors.offeredPayment && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.offeredPayment}</p>}
          </div>

          {/* Distance */}
          <div>
            <label htmlFor="rr-distance" className="gs-label">
              <span className="flex items-center gap-1.5"><IconRoute />Total Distance (km)</span>
            </label>
            <input
              id="rr-distance"
              className={`gs-input${errors.estimatedDistanceKm ? " border-[var(--gs-error)]" : ""}`}
              type="number"
              min="0.1"
              step="0.1"
              placeholder="8"
              value={form.estimatedDistanceKm}
              onChange={(e) => setField("estimatedDistanceKm", e.target.value)}
            />
            {errors.estimatedDistanceKm && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.estimatedDistanceKm}</p>}
            <p className="mt-1 text-xs" style={{ color: "var(--gs-text-muted)" }}>User-provided estimate — no live route service is connected.</p>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="rr-duration" className="gs-label">
              <span className="flex items-center gap-1.5"><IconClock />Estimated Duration (min)</span>
            </label>
            <input
              id="rr-duration"
              className={`gs-input${errors.estimatedDurationMinutes ? " border-[var(--gs-error)]" : ""}`}
              type="number"
              min="1"
              step="1"
              placeholder="30"
              value={form.estimatedDurationMinutes}
              onChange={(e) => setField("estimatedDurationMinutes", e.target.value)}
            />
            {errors.estimatedDurationMinutes && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.estimatedDurationMinutes}</p>}
            <p className="mt-1 text-xs" style={{ color: "var(--gs-text-muted)" }}>User-provided estimate.</p>
          </div>

          {/* Cost/km */}
          <div>
            <label htmlFor="rr-costpkm" className="gs-label">
              <span className="flex items-center gap-1.5"><IconCar />Vehicle Cost / km (₹)</span>
            </label>
            <input
              id="rr-costpkm"
              className={`gs-input${errors.vehicleCostPerKm ? " border-[var(--gs-error)]" : ""}`}
              type="number"
              min="0"
              step="0.1"
              placeholder="3.50"
              value={form.vehicleCostPerKm}
              onChange={(e) => setField("vehicleCostPerKm", e.target.value)}
            />
            {errors.vehicleCostPerKm && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.vehicleCostPerKm}</p>}
            <p className="mt-1 text-xs" style={{ color: "var(--gs-text-muted)" }}>Fuel + wear. ≈ ₹3–4 for two-wheeler.</p>
          </div>

          {/* Extra expenses */}
          <div className="sm:col-span-2">
            <label htmlFor="rr-extras" className="gs-label">Additional Expenses <span style={{ color: "var(--gs-text-muted)", fontWeight: 400 }}>(tolls, parking – optional)</span></label>
            <input
              id="rr-extras"
              className={`gs-input${errors.additionalExpenses ? " border-[var(--gs-error)]" : ""}`}
              type="number"
              min="0"
              step="0.5"
              placeholder="0"
              value={form.additionalExpenses}
              onChange={(e) => setField("additionalExpenses", e.target.value)}
            />
            {errors.additionalExpenses && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.additionalExpenses}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            id="rr-analyse-btn"
            className="gs-btn-primary"
            onClick={analyse}
          >
            Analyse Delivery
          </button>
          <button
            className="gs-btn-secondary"
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Results card ── */}
      {result && verdict && (
        <div ref={resultsRef} className="gs-card-modern p-6 sm:p-7" id="rr-results">
          <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--gs-text-primary)" }}>
                Analysis Result
                {result.platform && <span className="ml-2 text-sm font-normal" style={{ color: "var(--gs-text-muted)" }}>· {result.platform}</span>}
              </h2>
            </div>
            <span className={verdictLabel(verdict).cls} style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem" }}>
              {verdictLabel(verdict).text} Rate
            </span>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <MetricTile label="Offered" value={fmtCurrency(result.offeredPayment)} />
            <MetricTile label="Vehicle Cost" value={fmtCurrency(result.calculatedVehicleCost)} dimmed />
            {result.additionalExpenses ? <MetricTile label="Other Expenses" value={fmtCurrency(result.additionalExpenses)} dimmed /> : null}
            <MetricTile label="Estimated contribution after entered expenses" value={fmtCurrency(result.estimatedContribution)} highlight={result.estimatedContribution >= 0} />
            <MetricTile label="Estimated contribution / hour" value={`${fmtCurrency(result.estimatedContributionPerHour)}/hr`} highlight />
            <MetricTile label="Estimated duration" value={formatDuration(result.estimatedDurationMinutes)} />
          </div>

          {/* Assumptions note */}
          <div
            className="rounded-lg px-4 py-3 text-sm mb-5"
            style={{ background: "var(--gs-surface-alt)", color: "var(--gs-text-secondary)", border: "1px solid var(--gs-border)" }}
          >
            <p className="font-medium mb-1" style={{ color: "var(--gs-text-primary)" }}>Assumptions</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All results are estimates based only on the values entered above.</li>
              <li>Contribution is not net profit: taxes, unpaid time, and costs you did not enter are not included.</li>
              <li>Vehicle cost of ₹{result.vehicleCostPerKm}/km and entered extra expenses are deducted.</li>
            </ul>
          </div>

          {/* Save action */}
          {!saved ? (
            <button
              id="rr-save-btn"
              className="gs-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Analysis"}
            </button>
          ) : (
            <p className="gs-badge-good" style={{ display: "inline-flex" }}>
              ✓ Saved to your history
            </p>
          )}
        </div>
      )}

      {/* ── History ── */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--gs-text-primary)" }}>
          Recent Analyses
        </h2>
        {historyLoading ? (
          <div className="gs-card p-5 text-sm" style={{ color: "var(--gs-text-muted)" }}>Loading…</div>
        ) : history.length === 0 ? (
          <div className="gs-card p-5 text-sm" style={{ color: "var(--gs-text-muted)" }}>
            No saved analyses yet. Run your first analysis and save it.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => {
              const v = getProfitabilityVerdict(rec.estimatedContributionPerHour);
              const vl = verdictLabel(v);
              return (
                <div key={rec.id} className="gs-card-modern px-4 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: "var(--gs-text-primary)" }}>
                        {rec.platform || "Unnamed"}
                      </span>
                      <span className={vl.cls}>{vl.text}</span>
                      {rec.analysisMode === "sample" && (
                        <span className="gs-badge-warn" style={{ fontSize: "0.7rem" }}>Sample</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-muted)" }}>
                      {fmtCurrency(rec.offeredPayment)} offer · {fmtCurrency(rec.estimatedContributionPerHour)}/hr · {fmtDate(rec.createdAt)}
                    </p>
                  </div>
                  <button
                    aria-label={`Open analysis for ${rec.platform || "unnamed"}`}
                    onClick={() => handleOpen(rec)}
                    className="gs-btn-secondary shrink-0"
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
                  >
                    Open
                  </button>
                  <button
                    aria-label={`Delete analysis for ${rec.platform || "unnamed"}`}
                    onClick={() => handleDelete(rec.id)}
                    className="shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--gs-surface-alt)]"
                    style={{ color: "var(--gs-text-muted)" }}
                  >
                    <IconTrash />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricTile({ label, value, highlight, dimmed }: { label: string; value: string; highlight?: boolean; dimmed?: boolean }) {
  return (
    <div
      className="rounded-lg px-3 py-3"
      style={{
        background: highlight ? "var(--gs-green-subtle)" : "var(--gs-surface-alt)",
        border: `1px solid ${highlight ? "var(--gs-green-light)" : "var(--gs-border)"}`,
      }}
    >
      <p className="text-xs mb-1" style={{ color: dimmed ? "var(--gs-text-muted)" : "var(--gs-text-secondary)" }}>{label}</p>
      <p
        className="text-base font-semibold"
        style={{ color: highlight ? "var(--gs-success)" : dimmed ? "var(--gs-text-muted)" : "var(--gs-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
