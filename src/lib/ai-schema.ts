import type { IncidentAiProvenance, TimelineEvent } from "@/types/incident";
import type { DeliveryAiInterpretation } from "@/types/delivery";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength = 1200): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

export type DeliveryAiResponse = Omit<DeliveryAiInterpretation, "mode" | "createdAt">;

export function parseDeliveryAiResponse(value: unknown): DeliveryAiResponse | null {
  if (!isRecord(value)) return null;
  const summary = text(value.summary);
  const mainConsideration = text(value.mainConsideration);
  const recommendation = text(value.recommendation);
  const uncertainty = text(value.uncertainty);
  const model = text(value.model, 200);
  return summary && mainConsideration && recommendation && uncertainty && model
    ? { summary, mainConsideration, recommendation, uncertainty, model }
    : null;
}

export interface IncidentAiResponse {
  model: string;
  summary: string;
  appealDraft: string;
  missingEvidence: string[];
  extractedFacts: Array<{ fact: string; source: string }>;
  timeline: Array<Omit<TimelineEvent, "id">>;
  contradictions: Array<{ description: string; evidenceIds: string[] }>;
}

const sources = new Set<TimelineEvent["source"]>(["worker_statement", "document", "ai_inference", "independently_verified"]);
const statuses = new Set<TimelineEvent["verificationStatus"]>(["worker_reported", "documented", "ai_inference", "independently_verified", "conflicting"]);
const confidences = new Set<TimelineEvent["confidence"]>(["high", "medium", "low", "unknown"]);

export function parseIncidentAiResponse(value: unknown): IncidentAiResponse | null {
  if (!isRecord(value)) return null;
  const model = text(value.model, 200);
  const summary = text(value.summary, 4000);
  const appealDraft = text(value.appealDraft, 5000);
  if (!model || !summary || !appealDraft || !Array.isArray(value.missingEvidence) || !Array.isArray(value.extractedFacts) || !Array.isArray(value.timeline) || !Array.isArray(value.contradictions)) return null;

  const missingEvidence = value.missingEvidence.map((item) => text(item, 500)).filter((item): item is string => Boolean(item));
  const extractedFacts = value.extractedFacts.map((item) => {
    if (!isRecord(item)) return null;
    const fact = text(item.fact, 1200);
    const source = text(item.source, 200);
    return fact && source ? { fact, source } : null;
  }).filter((item): item is { fact: string; source: string } => Boolean(item));
  const timeline: Array<Omit<TimelineEvent, "id">> = [];
  for (const item of value.timeline) {
    if (!isRecord(item)) return null;
    const description = text(item.description, 1200);
    const source = item.source;
    const verificationStatus = item.verificationStatus;
    const confidence = item.confidence;
    const timestamp = item.timestamp === null || item.timestamp === undefined ? undefined : text(item.timestamp, 100);
    const evidenceIds = Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((id): id is string => typeof id === "string" && id.length <= 200) : null;
    if (!description || typeof source !== "string" || !sources.has(source as TimelineEvent["source"]) || typeof verificationStatus !== "string" || !statuses.has(verificationStatus as TimelineEvent["verificationStatus"]) || typeof confidence !== "string" || !confidences.has(confidence as TimelineEvent["confidence"]) || !evidenceIds) return null;
    timeline.push({ ...(timestamp ? { timestamp } : {}), description, evidenceIds, source: source as TimelineEvent["source"], verificationStatus: verificationStatus as TimelineEvent["verificationStatus"], confidence: confidence as TimelineEvent["confidence"] });
  }
  const contradictions = value.contradictions.map((item) => {
    if (!isRecord(item)) return null;
    const description = text(item.description, 1200);
    const evidenceIds = Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((id): id is string => typeof id === "string" && id.length <= 200) : null;
    return description && evidenceIds ? { description, evidenceIds } : null;
  }).filter((item): item is { description: string; evidenceIds: string[] } => Boolean(item));

  // Any malformed entry makes the response unsafe to render as a report.
  if (missingEvidence.length !== value.missingEvidence.length || extractedFacts.length !== value.extractedFacts.length || timeline.length !== value.timeline.length || contradictions.length !== value.contradictions.length) return null;
  return { model, summary, appealDraft, missingEvidence, extractedFacts, timeline, contradictions };
}

export function incidentProvenance(model: string): IncidentAiProvenance {
  return { mode: "live_ai", model, createdAt: new Date().toISOString(), evidenceScope: "worker_statement_and_manual_evidence_notes" };
}
