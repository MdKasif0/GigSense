type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLength = 1200): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => safeText(item, 300));
  return items.every((item): item is string => item !== null) ? items : null;
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
  const payment = nullableNumber(value.payment);
  const distanceKm = nullableNumber(value.distanceKm);
  const durationMinutes = nullableNumber(value.durationMinutes);
  const vehicleCostPerKm = nullableNumber(value.vehicleCostPerKm);
  const additionalExpenses = nullableNumber(value.additionalExpenses);
  const missingFields = stringList(value.missingFields);
  const assumptions = stringList(value.assumptions);
  if ([payment, distanceKm, durationMinutes, vehicleCostPerKm, additionalExpenses].some((item) => item === undefined) || !missingFields || !assumptions) return null;
  return { payment: payment ?? null, distanceKm: distanceKm ?? null, durationMinutes: durationMinutes ?? null, vehicleCostPerKm: vehicleCostPerKm ?? null, additionalExpenses: additionalExpenses ?? null, missingFields, assumptions };
}

export function parseVoiceIncidentExtraction(value: unknown): VoiceIncidentExtraction | null {
  if (!isRecord(value)) return null;
  const title = safeText(value.title, 180);
  const workerStatement = safeText(value.workerStatement, 8000);
  const eventDescription = safeText(value.eventDescription, 1200);
  const eventDateTime = value.eventDateTime === null ? null : safeText(value.eventDateTime, 100);
  const missingInformation = stringList(value.missingInformation);
  const followUpQuestions = stringList(value.followUpQuestions);
  if (!title || !workerStatement || !eventDescription || !(value.eventDateTime === null || typeof eventDateTime === "string") || !missingInformation || !followUpQuestions) return null;
  return { title, workerStatement, eventDescription, eventDateTime, missingInformation, followUpQuestions };
}
