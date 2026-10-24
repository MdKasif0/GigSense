/**
 * IndexedDB persistence layer for GigSense.
 *
 * Two object stores:
 *   - deliveries: DeliveryAnalysis records (RouteReality)
 *   - incidents:  IncidentRecord records   (GigProof)
 *   - evidence_files: Raw binary blobs keyed by EvidenceItem.storageKey
 *
 * The interface is intentionally small so it can be replaced with a
 * backend API later without changing call sites significantly.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { DeliveryAnalysis } from "@/types/delivery";
import type { IncidentRecord } from "@/types/incident";

const DB_NAME = "gigsense";
const DB_VERSION = 2;

type GigSenseDB = {
  deliveries: {
    key: string;
    value: DeliveryAnalysis;
    indexes: { by_created: string };
  };
  incidents: {
    key: string;
    value: IncidentRecord;
    indexes: { by_created: string };
  };
  evidence_files: {
    key: string; // storageKey
    value: { key: string; blob: Blob };
  };
};

let _db: IDBPDatabase<GigSenseDB> | null = null;

async function getDB(): Promise<IDBPDatabase<GigSenseDB>> {
  if (_db) return _db;

  _db = await openDB<GigSenseDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Deliveries store
      if (!db.objectStoreNames.contains("deliveries")) {
        const deliveries = db.createObjectStore("deliveries", { keyPath: "id" });
        deliveries.createIndex("by_created", "createdAt");
      }

      // Incidents store
      if (!db.objectStoreNames.contains("incidents")) {
        const incidents = db.createObjectStore("incidents", { keyPath: "id" });
        incidents.createIndex("by_created", "createdAt");
      }

      // Evidence binary blobs
      if (!db.objectStoreNames.contains("evidence_files")) {
        db.createObjectStore("evidence_files", { keyPath: "key" });
      }
    },
  });

  return _db;
}

// ── Deliveries ────────────────────────────────────────────────────────────────

export async function saveDelivery(record: DeliveryAnalysis): Promise<void> {
  const db = await getDB();
  await db.put("deliveries", record);
}

export async function getDelivery(
  id: string
): Promise<DeliveryAnalysis | undefined> {
  const db = await getDB();
  return db.get("deliveries", id);
}

/** Return all delivery analyses, newest first. */
export async function listDeliveries(): Promise<DeliveryAnalysis[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("deliveries", "by_created");
  return all.reverse();
}

export async function deleteDelivery(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("deliveries", id);
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export async function saveIncident(record: IncidentRecord): Promise<void> {
  const db = await getDB();
  await db.put("incidents", record);
}

export async function getIncident(
  id: string
): Promise<IncidentRecord | undefined> {
  const db = await getDB();
  return db.get("incidents", id);
}

/** Return all incident records, newest first. */
export async function listIncidents(): Promise<IncidentRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("incidents", "by_created");
  return all.reverse();
}

export async function deleteIncident(id: string): Promise<void> {
  const db = await getDB();
  const incident = await db.get("incidents", id);
  if (incident) {
    const tx = db.transaction(["incidents", "evidence_files"], "readwrite");
    await Promise.all(incident.evidence.map((item) => tx.objectStore("evidence_files").delete(item.storageKey)));
    await tx.objectStore("incidents").delete(id);
    await tx.done;
    return;
  }
  await db.delete("incidents", id);
}

// ── Evidence files ────────────────────────────────────────────────────────────

/** Store a raw binary blob for an evidence item. */
export async function saveEvidenceBlob(
  storageKey: string,
  blob: Blob
): Promise<void> {
  const db = await getDB();
  await db.put("evidence_files", { key: storageKey, blob });
}

/** Retrieve the raw blob for an evidence item. */
export async function getEvidenceBlob(
  storageKey: string
): Promise<Blob | undefined> {
  const db = await getDB();
  const record = await db.get("evidence_files", storageKey);
  return record?.blob;
}

/** Delete a stored evidence blob. */
export async function deleteEvidenceBlob(storageKey: string): Promise<void> {
  const db = await getDB();
  await db.delete("evidence_files", storageKey);
}

/** Add the opt-in, clearly marked demonstration records. Never called automatically. */
export async function addSampleData(): Promise<void> {
  const db = await getDB();
  const existing = await Promise.all([
    db.get("deliveries", "sample-delivery-zomato"),
    db.get("deliveries", "sample-delivery-swiggy"),
    db.get("incidents", "sample-incident-delay"),
    db.get("incidents", "sample-incident-conflict"),
  ]);
  const now = "2026-10-24T06:00:00.000Z";
  const deliveries: DeliveryAnalysis[] = [
    { id: "sample-delivery-zomato", createdAt: now, platform: "Zomato", offeredPayment: 95, estimatedDistanceKm: 7.5, estimatedDurationMinutes: 28, vehicleCostPerKm: 3.5, additionalExpenses: 0, calculatedVehicleCost: 26.25, estimatedContribution: 68.75, estimatedContributionPerHour: 147.32, isCompleted: false, analysisMode: "sample" },
    { id: "sample-delivery-swiggy", createdAt: "2026-10-24T04:00:00.000Z", platform: "Swiggy", offeredPayment: 42, estimatedDistanceKm: 6.2, estimatedDurationMinutes: 32, vehicleCostPerKm: 3.5, additionalExpenses: 0, calculatedVehicleCost: 21.7, estimatedContribution: 20.3, estimatedContributionPerHour: 38.06, isCompleted: false, analysisMode: "sample" },
  ];
  const incidents: IncidentRecord[] = [
    { id: "sample-incident-delay", createdAt: now, updatedAt: now, title: "Sample: delayed pickup record", platform: "Zomato", workerStatement: "I arrived at the restaurant, waited for the order, and reported the pickup delay.", timeline: [
      { id: "sample-delay-1", timestamp: "2026-10-24T09:00:00.000Z", description: "Worker reports arriving at the restaurant.", evidenceIds: [], source: "worker_statement", verificationStatus: "worker_reported", confidence: "unknown" },
      { id: "sample-delay-2", timestamp: "2026-10-24T09:18:00.000Z", description: "Worker reports that the order was still not ready.", evidenceIds: [], source: "worker_statement", verificationStatus: "worker_reported", confidence: "unknown" },
      { id: "sample-delay-3", timestamp: "2026-10-24T09:24:00.000Z", description: "Worker reports pickup and departure.", evidenceIds: [], source: "worker_statement", verificationStatus: "worker_reported", confidence: "unknown" },
    ], evidence: [], extractedFacts: [], contradictions: [], generatedReport: null, draftAppeal: null, analysisStatus: "pending", analysisMode: "sample" },
    { id: "sample-incident-conflict", createdAt: now, updatedAt: now, title: "Sample: timestamp inconsistency", platform: "Swiggy", workerStatement: "This sample intentionally contains conflicting timestamps for testing.", timeline: [
      { id: "sample-conflict-1", timestamp: "2026-10-24T11:10:00.000Z", description: "Worker statement says pickup occurred at 11:10.", evidenceIds: [], source: "worker_statement", verificationStatus: "conflicting", confidence: "low" },
      { id: "sample-conflict-2", timestamp: "2026-10-24T11:05:00.000Z", description: "Documented screenshot timestamp says the delivery was completed at 11:05.", evidenceIds: [], source: "document", verificationStatus: "conflicting", confidence: "medium" },
    ], evidence: [], extractedFacts: [], contradictions: [{ id: "sample-conflict-note", description: "Intentional test conflict: completion precedes the reported pickup.", evidenceIds: [] }], generatedReport: null, draftAppeal: null, analysisStatus: "pending", analysisMode: "sample" },
  ];
  await Promise.all([
    ...deliveries.filter((_, index) => !existing[index]).map((record) => db.put("deliveries", record)),
    ...incidents.filter((_, index) => !existing[index + 2]).map((record) => db.put("incidents", record)),
  ]);
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Generate a UUID v4. Uses crypto.randomUUID() where available. */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
