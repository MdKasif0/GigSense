"use client";

import { useState, useEffect } from "react";
import { saveIncident, listIncidents, deleteIncident, saveEvidenceBlob, generateId } from "@/lib/db";
import { incidentProvenance, parseIncidentAiResponse } from "@/lib/ai-schema";
import type { IncidentRecord, EvidenceItem } from "@/types/incident";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
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
function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORMS = ["Zomato", "Swiggy", "Porter", "Dunzo", "Blinkit", "Zepto", "Rapido", "Urban Company", "Other"];
const MAX_EVIDENCE_FILE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_EVIDENCE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
  "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function evidenceTypeFromMime(mime: string): EvidenceItem["type"] {
  if (mime.startsWith("image/")) return "screenshot";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text")) return "document";
  return "other";
}

function isSupportedEvidence(file: File): boolean {
  if (SUPPORTED_EVIDENCE_TYPES.has(file.type)) return true;
  return /\.(jpe?g|png|webp|gif|pdf|txt|docx?)$/i.test(file.name);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  platform: string;
  platformCustom: string;
  workerStatement: string;
  eventDescription: string;
  eventDateTime: string;
}

interface FormErrors {
  title?: string;
  workerStatement?: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  platform: "",
  platformCustom: "",
  workerStatement: "",
  eventDescription: "",
  eventDateTime: "",
};

interface PendingEvidence {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  blob: Blob;
  type: EvidenceItem["type"];
  description: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function IncidentDocumenter() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRecord, setSavedRecord] = useState<IncidentRecord | null>(null);
  const [history, setHistory] = useState<IncidentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [openedRecord, setOpenedRecord] = useState<IncidentRecord | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    listIncidents()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  function setField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setSaved(false);
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Incident title is required.";
    if (!form.workerStatement.trim()) errs.workerStatement = "Please describe what happened.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const added: PendingEvidence[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!isSupportedEvidence(file)) {
        rejected.push(`${file.name}: use an image, PDF, TXT, DOC, or DOCX file.`);
        continue;
      }
      if (file.size === 0 || file.size > MAX_EVIDENCE_FILE_BYTES) {
        rejected.push(`${file.name}: files must be between 1 byte and 15 MB.`);
        continue;
      }
      const storageKey = `evidence-${generateId()}`;
      added.push({
        id: generateId(),
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey,
        blob: file,
        type: evidenceTypeFromMime(file.type),
        description: "",
      });
    }
    setPendingEvidence((p) => [...p, ...added]);
    setFileError(rejected.length ? rejected.join(" ") : null);
  }

  function removeEvidence(id: string) {
    setPendingEvidence((p) => p.filter((e) => e.id !== id));
  }

  function setEvidenceDescription(id: string, description: string) {
    setPendingEvidence((items) => items.map((item) => item.id === id ? { ...item, description } : item));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      // Save evidence blobs
      const evidenceItems: EvidenceItem[] = [];
      for (const pe of pendingEvidence) {
        await saveEvidenceBlob(pe.storageKey, pe.blob);
        evidenceItems.push({
          id: pe.id,
          addedAt: new Date().toISOString(),
          type: pe.type,
          fileName: pe.fileName,
          mimeType: pe.mimeType,
          sizeBytes: pe.sizeBytes,
          storageKey: pe.storageKey,
          description: pe.description || undefined,
        });
      }

      const platform =
        form.platform === "Other" ? form.platformCustom.trim() || undefined
        : form.platform || undefined;

      const record: IncidentRecord = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: form.title.trim(),
        platform,
        workerStatement: form.workerStatement.trim(),
        timeline: [
          {
            id: generateId(),
            timestamp: form.eventDateTime ? new Date(form.eventDateTime).toISOString() : undefined,
            description: form.eventDescription.trim() || form.workerStatement.trim(),
            evidenceIds: [],
            source: "worker_statement",
            verificationStatus: "worker_reported",
            confidence: "unknown",
          },
        ],
        evidence: evidenceItems,
        extractedFacts: [{
          id: generateId(),
          fact: form.workerStatement.trim(),
          source: "worker_statement",
        }],
        contradictions: [],
        generatedReport: null,
        draftAppeal: null,
        analysisStatus: "pending",
        analysisMode: "real",
      };

      await saveIncident(record);
      setHistory((h) => [record, ...h]);
      setSavedRecord(record);
      setOpenedRecord(record);
      setSaved(true);
      // Reset form
      setForm(INITIAL_FORM);
      setPendingEvidence([]);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteIncident(id);
    setHistory((h) => h.filter((x) => x.id !== id));
    if (openedRecord?.id === id) setOpenedRecord(null);
  }

  async function handleAiAnalysis(record: IncidentRecord) {
    setAiState("loading");
    setAiError(null);
    try {
      const response = await fetch("/api/ai/incident-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: record.title,
          platform: record.platform,
          workerStatement: record.workerStatement,
          evidence: record.evidence.map((item) => ({ id: item.id, fileName: item.fileName, description: item.description ?? "" })),
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null) throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Live AI analysis is unavailable.");
      const parsed = parseIncidentAiResponse(payload);
      if (!parsed) throw new Error("The AI response could not be validated. Please retry.");
      const updated: IncidentRecord = {
        ...record,
        updatedAt: new Date().toISOString(),
        generatedReport: `${parsed.summary}\n\nMissing evidence to consider:\n${parsed.missingEvidence.map((item) => `• ${item}`).join("\n") || "• None identified from the supplied information."}`,
        draftAppeal: parsed.appealDraft,
        extractedFacts: parsed.extractedFacts.map((fact) => ({ id: generateId(), ...fact })),
        timeline: parsed.timeline.map((event) => ({ id: generateId(), ...event })),
        contradictions: parsed.contradictions.map((item) => ({ id: generateId(), ...item })),
        analysisStatus: "complete",
        aiProvenance: incidentProvenance(parsed.model),
      };
      await saveIncident(updated);
      setHistory((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSavedRecord((item) => item?.id === updated.id ? updated : item);
      setOpenedRecord(updated);
      setAiState("idle");
    } catch (error) {
      setAiState("error");
      setAiError(error instanceof Error ? error.message : "Live AI analysis is unavailable.");
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setPendingEvidence([]);
    setErrors({});
    setSaved(false);
    setSavedRecord(null);
    setOpenedRecord(null);
    setFileError(null);
    setAiState("idle");
    setAiError(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Form card ── */}
      <div className="gs-card-modern p-6 sm:p-7">
        <h2 className="text-base font-semibold mb-5" style={{ color: "var(--gs-text-primary)" }}>
          Incident Details
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="gp-title" className="gs-label">Incident Title</label>
            <input
              id="gp-title"
              className={`gs-input${errors.title ? " border-[var(--gs-error)]" : ""}`}
              placeholder="e.g. Order #4829 – Missing item dispute, Account deactivation"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
            />
            {errors.title && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.title}</p>}
          </div>

          {/* Platform */}
          <div>
            <label htmlFor="gp-platform" className="gs-label">Platform <span style={{ color: "var(--gs-text-muted)", fontWeight: 400 }}>(optional)</span></label>
            <select
              id="gp-platform"
              className="gs-input"
              value={form.platform}
              onChange={(e) => setField("platform", e.target.value)}
            >
              <option value="">Select platform…</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {form.platform === "Other" && (
            <div>
              <label htmlFor="gp-platform-custom" className="gs-label">Platform Name</label>
              <input
                id="gp-platform-custom"
                className="gs-input"
                placeholder="Enter platform name"
                value={form.platformCustom}
                onChange={(e) => setField("platformCustom", e.target.value)}
              />
            </div>
          )}

          {/* Statement */}
          <div>
            <label htmlFor="gp-statement" className="gs-label">
              Your Description of What Happened
            </label>
            <textarea
              id="gp-statement"
              rows={5}
              className={`gs-input resize-y${errors.workerStatement ? " border-[var(--gs-error)]" : ""}`}
              placeholder="Describe the incident in your own words. Include dates, times, order numbers, or any relevant context. This is your statement — not independently verified evidence."
              value={form.workerStatement}
              onChange={(e) => setField("workerStatement", e.target.value)}
            />
            {errors.workerStatement && <p className="mt-1 text-xs" style={{ color: "var(--gs-error)" }}>{errors.workerStatement}</p>}
            <p className="mt-1 text-xs" style={{ color: "var(--gs-text-muted)" }}>
              Your description is recorded as a worker statement, not independently verified evidence.
            </p>
          </div>

          <div className="rounded-lg p-4" style={{ background: "var(--gs-surface-alt)", border: "1px solid var(--gs-border)" }}>
            <p className="gs-label">Evidence Timeline <span style={{ color: "var(--gs-text-muted)", fontWeight: 400 }}>(time optional)</span></p>
            <p className="text-xs mb-3" style={{ color: "var(--gs-text-muted)" }}>This event is saved as a worker statement, not independently verified evidence.</p>
            <input id="gp-event-time" type="datetime-local" className="gs-input mb-2" value={form.eventDateTime} onChange={(e) => setField("eventDateTime", e.target.value)} />
            <textarea id="gp-event-description" rows={2} className="gs-input resize-y" placeholder="Optional key event, e.g. 'Arrived at restaurant and waited for the order.'" value={form.eventDescription} onChange={(e) => setField("eventDescription", e.target.value)} />
          </div>

          {/* File Upload */}
          <div>
            <p className="gs-label">Evidence Files <span style={{ color: "var(--gs-text-muted)", fontWeight: 400 }}>(optional)</span></p>
            <div
              id="gp-upload-zone"
              className="rounded-lg p-6 text-center cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${isDragging ? "var(--gs-green)" : "var(--gs-border-strong)"}`,
                background: isDragging ? "var(--gs-green-subtle)" : "var(--gs-surface-alt)",
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("gp-file-input")?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload evidence files"
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("gp-file-input")?.click()}
            >
              <input
                id="gp-file-input"
                type="file"
                multiple
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.txt"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="flex justify-center mb-2" style={{ color: "var(--gs-text-muted)" }}>
                <IconUpload />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--gs-text-secondary)" }}>
                Drop files here or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--gs-text-muted)" }}>
                Images · PDFs · TXT · DOC · DOCX · up to 15 MB per file
              </p>
            </div>
            {fileError && <p className="mt-2 text-xs" style={{ color: "var(--gs-error)" }}>{fileError}</p>}
          </div>

          {/* Evidence list */}
          {pendingEvidence.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium" style={{ color: "var(--gs-text-secondary)" }}>
                {pendingEvidence.length} file{pendingEvidence.length > 1 ? "s" : ""} ready to upload
              </p>
              {pendingEvidence.map((pe) => (
                <div
                  key={pe.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "var(--gs-surface-alt)", border: "1px solid var(--gs-border)" }}
                >
                  <span style={{ color: "var(--gs-green)" }}><IconFile /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--gs-text-primary)" }}>{pe.fileName}</p>
                    <p className="text-xs" style={{ color: "var(--gs-text-muted)" }}>{pe.type} · {formatBytes(pe.sizeBytes)}</p>
                    <input
                      className="gs-input mt-2"
                      style={{ fontSize: "0.75rem", padding: "0.4rem 0.55rem" }}
                      value={pe.description}
                      onChange={(e) => setEvidenceDescription(pe.id, e.target.value)}
                      placeholder="Optional: manually enter relevant facts from this file for AI review"
                      aria-label={`Evidence notes for ${pe.fileName}`}
                    />
                  </div>
                  <button
                    aria-label={`Remove ${pe.fileName}`}
                    onClick={() => removeEvidence(pe.id)}
                    className="p-1.5 rounded-md hover:bg-[var(--gs-border)]"
                    style={{ color: "var(--gs-text-muted)" }}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy notice */}
        <div
          className="mt-5 flex items-start gap-2 rounded-lg px-3 py-3 text-xs"
          style={{ background: "var(--gs-green-subtle)", color: "var(--gs-success)" }}
        >
          <span className="mt-0.5 shrink-0"><IconShield /></span>
          <span>Supported files are stored as binary data in IndexedDB on this device, never as base64 in local storage. Files are treated as evidence only and are not executed.</span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            id="gp-save-btn"
            className="gs-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Incident Record"}
          </button>
          <button className="gs-btn-secondary" onClick={handleReset} type="button">
            Clear
          </button>
        </div>

        {/* Saved confirmation */}
        {saved && savedRecord && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--gs-success-bg)", color: "var(--gs-success)", border: "1px solid var(--gs-green-light)" }}
          >
            <p className="font-semibold">Incident recorded: {savedRecord.title}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-secondary)" }}>
              {savedRecord.evidence.length} evidence file{savedRecord.evidence.length !== 1 ? "s" : ""} and {savedRecord.timeline.length} timeline event saved locally.
            </p>
            <div className="mt-3">
              <button className="gs-btn-secondary" onClick={() => handleAiAnalysis(savedRecord)} disabled={aiState === "loading"}>
                {aiState === "loading" ? "Reviewing evidence…" : "Generate AI incident review"}
              </button>
              <p className="text-xs mt-2" style={{ color: "var(--gs-text-muted)" }}>Only your statement, file metadata, and the manual evidence notes above are sent for AI review. Original files stay on this device.</p>
              {aiError && <p className="text-xs mt-2" style={{ color: "var(--gs-error)" }}>{aiError} You can keep the incident record and add relevant facts manually.</p>}
            </div>
          </div>
        )}
      </div>

      {openedRecord && (
        <section className="gs-card-modern p-5" aria-label="Incident timeline">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--gs-text-primary)" }}>Timeline: {openedRecord.title}</h2>
              <p className="text-xs mt-1" style={{ color: "var(--gs-text-muted)" }}>Sources and uncertainty are preserved; no event is marked independently verified unless explicitly recorded as such.</p>
            </div>
            <button className="gs-btn-secondary" style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }} onClick={() => setOpenedRecord(null)}>Close</button>
          </div>
          <div className="space-y-2">
            {openedRecord.timeline.map((event) => (
              <div key={event.id} className="rounded-lg p-3" style={{ background: "var(--gs-surface-alt)", border: "1px solid var(--gs-border)" }}>
                <p className="text-sm" style={{ color: "var(--gs-text-primary)" }}>{event.description}</p>
                <p className="text-xs mt-1" style={{ color: "var(--gs-text-muted)" }}>
                  {event.timestamp ? fmtDate(event.timestamp) : "Time unknown"} · {event.source?.replace("_", " ") ?? "worker statement"} · {event.verificationStatus?.replace("_", " ") ?? "worker reported"} · confidence: {event.confidence ?? "unknown"}
                </p>
              </div>
            ))}
          </div>
          {openedRecord.generatedReport && (
            <div className="mt-4 rounded-lg p-3" style={{ background: "var(--gs-green-subtle)", border: "1px solid var(--gs-green-light)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--gs-success)" }}>AI incident summary</p>
              <p className="text-sm whitespace-pre-line mt-1" style={{ color: "var(--gs-text-secondary)" }}>{openedRecord.generatedReport}</p>
              {openedRecord.aiProvenance && <p className="text-xs mt-2" style={{ color: "var(--gs-text-muted)" }}>Live model review ({openedRecord.aiProvenance.model}); based on worker-entered text and manual evidence notes only.</p>}
            </div>
          )}
          {openedRecord.draftAppeal && (
            <div className="mt-3 rounded-lg p-3" style={{ background: "var(--gs-surface-alt)", border: "1px solid var(--gs-border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--gs-text-primary)" }}>Draft for your review — not submitted</p>
              <p className="text-sm whitespace-pre-line mt-1" style={{ color: "var(--gs-text-secondary)" }}>{openedRecord.draftAppeal}</p>
            </div>
          )}
          {!openedRecord.generatedReport && (
            <div className="mt-4">
              <button className="gs-btn-secondary" onClick={() => handleAiAnalysis(openedRecord)} disabled={aiState === "loading"}>{aiState === "loading" ? "Reviewing evidence…" : "Generate AI incident review"}</button>
              {aiError && <p className="text-xs mt-2" style={{ color: "var(--gs-error)" }}>{aiError} Add the relevant facts manually and keep this record as your source of truth.</p>}
            </div>
          )}
        </section>
      )}

      {/* ── History ── */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--gs-text-primary)" }}>
          Recorded Incidents
        </h2>
        {historyLoading ? (
          <div className="gs-card p-5 text-sm" style={{ color: "var(--gs-text-muted)" }}>Loading…</div>
        ) : history.length === 0 ? (
          <div className="gs-card p-5 text-sm" style={{ color: "var(--gs-text-muted)" }}>
            No incidents recorded yet. Use the form above to document your first incident.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => (
              <div key={rec.id} className="gs-card-modern px-4 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: "var(--gs-text-primary)" }}>{rec.title}</span>
                    {rec.platform && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--gs-surface-alt)", color: "var(--gs-text-secondary)" }}>
                        {rec.platform}
                      </span>
                    )}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: rec.analysisStatus === "complete" ? "var(--gs-success-bg)" : "var(--gs-surface-alt)",
                        color: rec.analysisStatus === "complete" ? "var(--gs-success)" : "var(--gs-text-muted)",
                      }}
                    >
                      {rec.analysisStatus === "pending" ? "Awaiting analysis" : rec.analysisStatus}
                    </span>
                    {rec.analysisMode === "sample" && (
                      <span className="gs-badge-warn" style={{ fontSize: "0.7rem" }}>Sample</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--gs-text-muted)" }}>
                    {rec.evidence.length} file{rec.evidence.length !== 1 ? "s" : ""} · {fmtDate(rec.createdAt)}
                  </p>
                </div>
                <button
                  aria-label={`Open incident: ${rec.title}`}
                  onClick={() => setOpenedRecord(rec)}
                  className="gs-btn-secondary shrink-0"
                  style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
                >
                  Open
                </button>
                <button
                  aria-label={`Delete incident: ${rec.title}`}
                  onClick={() => handleDelete(rec.id)}
                  className="shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--gs-surface-alt)]"
                  style={{ color: "var(--gs-text-muted)" }}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
