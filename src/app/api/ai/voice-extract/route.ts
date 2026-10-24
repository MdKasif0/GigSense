import { AiServiceError, configuredModel, requestAiJson } from "@/lib/ai-server";
import { parseVoiceIncidentExtraction, parseVoiceRouteExtraction } from "@/lib/voice-schema";

const ROUTE_SYSTEM = `Extract one to three delivery offers from the worker's transcript. Return JSON only: payment, distanceKm, durationMinutes, vehicleCostPerKm, additionalExpenses, offers, missingFields, assumptions. offers must be an array with up to three objects, each containing label, payment, and distanceKm. Numeric fields must be finite numbers or null. Interpret monetary values as INR only when the worker clearly describes them as rupees; do not guess ambiguous values. For a single offer, populate both offers with one object and the top-level payment/distanceKm. additionalExpenses is null when not mentioned, not zero. Only payment and distance are required: list either in missingFields only when unavailable. Duration, vehicle cost, and other expenses are optional and must not be listed as missing. Do not choose an offer or calculate financial outcomes.`;

const INCIDENT_SYSTEM = `Turn a worker's spoken incident description into a cautious editable intake draft. Return JSON only: title, workerStatement, eventDescription, eventDateTime, missingInformation, followUpQuestions. Keep workerStatement faithful to the supplied transcript. eventDateTime must be an ISO date-time only when both a date and time are explicitly supplied; otherwise null. Never invent evidence, dates, order IDs, or verification. State missing details and concise follow-up questions.`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const workflow = body.workflow;
    const transcript = typeof body.transcript === "string" ? body.transcript.trim().slice(0, 8000) : "";
    if ((workflow !== "route" && workflow !== "incident") || !transcript) return Response.json({ error: "Provide a voice workflow and transcript." }, { status: 400 });
    const result = await requestAiJson(workflow === "route" ? ROUTE_SYSTEM : INCIDENT_SYSTEM, { transcript });
    const parsed = workflow === "route" ? parseVoiceRouteExtraction(result) : parseVoiceIncidentExtraction(result, transcript);
    if (!parsed) throw new AiServiceError("AI_INVALID_RESPONSE", "The AI response could not be validated. Please edit the transcript and try again.");
    return Response.json({ workflow, result: parsed, model: configuredModel() });
  } catch (error) {
    if (error instanceof AiServiceError) return Response.json({ error: error.message, code: error.code }, { status: error.code === "AI_UNAVAILABLE" ? 503 : 502 });
    return Response.json({ error: "Unable to understand this transcript. Please edit it and try again." }, { status: 400 });
  }
}
