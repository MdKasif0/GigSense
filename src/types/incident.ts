/**
 * Incident record types for the GigProof module.
 *
 * IMPORTANT: Worker-provided statements are captured as raw testimony.
 * Facts are extracted and labelled by their source. Nothing in this schema
 * should be treated as independently verified evidence.
 */

import type { AnalysisMode } from "./delivery";

/** Supported evidence file types. */
export type EvidenceType =
  | "screenshot"
  | "document"
  | "photo"
  | "video"
  | "audio"
  | "other";

/** Metadata for a single piece of attached evidence. */
export interface EvidenceItem {
  /** UUID v4. */
  id: string;

  /** ISO 8601 timestamp when the evidence was added to the record. */
  addedAt: string;

  /** Type of evidence. */
  type: EvidenceType;

  /** Original file name. */
  fileName: string;

  /** MIME type of the file. */
  mimeType: string;

  /** Size in bytes. */
  sizeBytes: number;

  /**
   * Storage key or reference.
   * In the MVP this is a key into IndexedDB's binary store.
   * In a future backend version this would be a URL or S3 key.
   */
  storageKey: string;

  /** Optional description provided by the worker. */
  description?: string;
}

/** A single event in the incident timeline as described by the worker. */
export interface TimelineEvent {
  /** UUID v4. */
  id: string;

  /** ISO 8601 date/time when known. Undefined means the timing is unknown. */
  timestamp?: string;

  /** Worker's description of what happened at this point. */
  description: string;

  /** Evidence items that are specifically relevant to this event. */
  evidenceIds: string[];

  /** Where this event comes from; it is never silently treated as verified. */
  source: "worker_statement" | "document" | "ai_inference" | "independently_verified";

  /** Whether the event has been independently checked. */
  verificationStatus: "worker_reported" | "documented" | "ai_inference" | "independently_verified" | "conflicting";

  /** A plain-language confidence marker; uncertainty remains visible. */
  confidence: "high" | "medium" | "low" | "unknown";
}

/**
 * A fact extracted from the evidence or worker statement.
 * The source field is mandatory so consumers always know the origin.
 */
export interface ExtractedFact {
  /** UUID v4. */
  id: string;

  /** The fact text. */
  fact: string;

  /**
   * Source of the fact.
   * - "worker_statement": the worker said so in their narrative.
   * - "evidence:<evidenceId>": derived from a specific evidence item.
   * - "ai_inference": suggested by the AI – treat as unverified.
   */
  source: string;
}

/** A detected contradiction or gap in the evidence. */
export interface Contradiction {
  /** UUID v4. */
  id: string;

  /** Description of the contradiction or missing information. */
  description: string;

  /** Evidence IDs relevant to this contradiction, if any. */
  evidenceIds: string[];
}

/** A complete incident record. */
export interface IncidentRecord {
  /** UUID v4 – generated client-side on creation. */
  id: string;

  /** ISO 8601 timestamp when the record was created. */
  createdAt: string;

  /** ISO 8601 timestamp of the last modification. */
  updatedAt: string;

  /** Short title for the incident (e.g. "Order 4829 – Missing item dispute"). */
  title: string;

  /** Platform associated with the incident. Optional. */
  platform?: string;

  /**
   * The worker's own account of what happened.
   * This is testimony, not verified fact.
   */
  workerStatement: string;

  /** Chronological sequence of events as described or inferred. */
  timeline: TimelineEvent[];

  /** Metadata for all attached evidence files. */
  evidence: EvidenceItem[];

  /** Facts extracted from statements and evidence, each labelled by source. */
  extractedFacts: ExtractedFact[];

  /** Contradictions or gaps identified in the record. */
  contradictions: Contradiction[];

  /**
   * Generated narrative report combining the timeline and evidence.
   * Null until the AI analysis has been run.
   */
  generatedReport: string | null;

  /**
   * Draft appeal text the worker can copy, edit, and submit.
   * Null until generated.
   */
  draftAppeal: string | null;

  /** Processing status of the AI analysis. */
  analysisStatus: "pending" | "processing" | "complete" | "error";

  /** Whether this is a real user record or sample/demo data. */
  analysisMode: AnalysisMode;
}

/** Fields required to create a new incident record. */
export type CreateIncidentInput = Pick<
  IncidentRecord,
  "title" | "platform" | "workerStatement"
> & {
  analysisMode?: AnalysisMode;
};
