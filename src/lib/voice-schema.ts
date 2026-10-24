type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLength = 1200): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, 300)).filter((item): item is string => item !== null);
}

function firstDefined(record: UnknownRecord, names: string[]): unknown {
  for (const name of names) if (record[name] !== undefined) return record[name];
  return undefined;
}

export interface VoiceRouteExtraction {
  payment: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  vehicleCostPerKm: number | null;
  additionalExpenses: number | null;
  missingFields: string[];
  assumptions: string[];
}

export interface VoiceIncidentExtraction {
  title: string;
  workerStatement: string;
  eventDescription: string;
  eventDateTime: string | null;
  missingInformation: string[];
  followUpQuestions: string[];
}

export function parseVoiceRouteExtraction(value: unknown): VoiceRouteExtraction | null {
  if (!isRecord(value)) return null;
  const payment = nullableNumber(firstDefined(value, ["payment", "offeredPayment", "offerPayment"]));
  const distanceKm = nullableNumber(firstDefined(value, ["distanceKm", "estimatedDistanceKm", "distance"]));
  const durationMinutes = nullableNumber(firstDefined(value, ["durationMinutes", "estimatedDurationMinutes", "duration"]));
  const vehicleCostPerKm = nullableNumber(firstDefined(value, ["vehicleCostPerKm", "costPerKm", "vehicleCost"]));
  const additionalExpenses = nullableNumber(firstDefined(value, ["additionalExpenses", "extraExpenses", "expenses"]));
  const missingFields = stringList(value.missingFields);
  const assumptions = stringList(value.assumptions);
  const inferredMissing = [
    payment === null ? "Payment" : null,
    distanceKm === null ? "Distance" : null,
    durationMinutes === null ? "Duration" : null,
    vehicleCostPerKm === null ? "Vehicle cost per km" : null,
  ].filter((item): item is string => item !== null);
  return { payment, distanceKm, durationMinutes, vehicleCostPerKm, additionalExpenses, missingFields: [...new Set([...missingFields, ...inferredMissing])], assumptions };
}

export function parseVoiceIncidentExtraction(value: unknown, fallbackWorkerStatement?: string): VoiceIncidentExtraction | null {
  if (!isRecord(value)) return null;
  const workerStatement = safeText(firstDefined(value, ["workerStatement", "statement", "description"]), 8000) ?? safeText(fallbackWorkerStatement, 8000);
  const title = safeText(value.title, 180) ?? "Voice incident report";
  const eventDescription = safeText(firstDefined(value, ["eventDescription", "incidentSummary", "description"]), 1200) ?? workerStatement;
  const rawDateTime = value.eventDateTime === null || value.eventDateTime === undefined ? null : safeText(value.eventDateTime, 100);
  const eventDateTime = rawDateTime && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(rawDateTime) ? rawDateTime : null;
  const missingInformation = stringList(value.missingInformation);
  const followUpQuestions = stringList(value.followUpQuestions);
  if (!workerStatement || !eventDescription) return null;
  if (rawDateTime && !eventDateTime) missingInformation.push("Incident date and full time");
  return { title, workerStatement, eventDescription, eventDateTime, missingInformation, followUpQuestions };
}
