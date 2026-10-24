import { AiServiceError, configuredModel, requestAiJson } from "@/lib/ai-server";
import { parseDeliveryAiResponse } from "@/lib/ai-schema";
import { validateDeliveryInputs } from "@/lib/calculations";

const SYSTEM = `You interpret a delivery estimate. Return JSON only with keys summary, mainConsideration, recommendation, uncertainty. Do not calculate, change, or dispute provided arithmetic. Never call contribution net profit. State that it is an estimate where costs, taxes, unpaid time, or route uncertainty are missing. Do not claim current demand or platform policy. Ground every statement in supplied values.`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const values = body.values as Record<string, unknown> | undefined;
    if (!values || !["offeredPayment", "distanceKm", "durationMinutes", "vehicleCostPerKm", "additionalExpenses", "vehicleCost", "contribution", "contributionPerHour"].every((key) => typeof values[key] === "number" && Number.isFinite(values[key]))) {
      return Response.json({ error: "Invalid delivery analysis payload." }, { status: 400 });
    }
    const validation = validateDeliveryInputs(values.offeredPayment as number, values.distanceKm as number, values.durationMinutes as number, values.vehicleCostPerKm as number, values.additionalExpenses as number);
    if (validation) return Response.json({ error: validation }, { status: 400 });
    const result = parseDeliveryAiResponse(await requestAiJson(SYSTEM, { values, assumptions: Array.isArray(body.assumptions) ? body.assumptions.slice(0, 10) : [] }));
    if (!result) throw new AiServiceError("AI_INVALID_RESPONSE", "The AI service returned an invalid structured result. Please retry.");
    return Response.json({ ...result, model: configuredModel() });
  } catch (error) {
    if (error instanceof AiServiceError) return Response.json({ error: error.message, code: error.code }, { status: error.code === "AI_UNAVAILABLE" ? 503 : error.code === "AI_RATE_LIMITED" ? 429 : 502 });
    return Response.json({ error: "Unable to analyse this delivery." }, { status: 400 });
  }
}
