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
const DB_VERSION = 1;

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
