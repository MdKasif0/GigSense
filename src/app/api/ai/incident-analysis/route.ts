import { AiServiceError, configuredModel, requestAiJson } from "@/lib/ai-server";
import { parseIncidentAiResponse } from "@/lib/ai-schema";

const SYSTEM = `You create a cautious incident review from worker-provided text and optional manually entered notes about evidence. Return JSON only with keys summary, appealDraft, missingEvidence, extractedFacts, timeline, contradictions. Each extractedFact needs fact and source. Each timeline event needs description, timestamp (ISO string or null), evidenceIds, source (worker_statement|document|ai_inference|independently_verified), verificationStatus (worker_reported|documented|ai_inference|independently_verified|conflicting), confidence (high|medium|low|unknown). Use only supplied information. Do not invent timestamps, policy rules, commitments, or events. A worker statement is not verified. A manually entered document note is documented, not independently verified. Mention unresolved conflicts in summary and appeal. The appeal must be reviewable and factual, never automatically submitted.`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.title !== "string" || typeof body.workerStatement !== "string" || body.workerStatement.trim().length === 0 || !Array.isArray(body.evidence)) return Response.json({ error: "Invalid incident analysis payload." }, { status: 400 });
    const safeEvidence = body.evidence.slice(0, 20).map((item) => {
      if (!item || typeof item !== "object") return null;
      const evidence = item as Record<string, unknown>;
      return typeof evidence.id === "string" && typeof evidence.fileName === "string" && typeof evidence.description === "string"
        ? { id: evidence.id, fileName: evidence.fileName.slice(0, 200), description: evidence.description.slice(0, 3000) }
        : null;
    }).filter(Boolean);
    if (safeEvidence.length !== body.evidence.length) return Response.json({ error: "Invalid evidence payload." }, { status: 400 });
    const result = parseIncidentAiResponse(await requestAiJson(SYSTEM, { title: body.title.slice(0, 300), platform: typeof body.platform === "string" ? body.platform.slice(0, 100) : null, workerStatement: body.workerStatement.slice(0, 8000), evidence: safeEvidence, privacyNote: "Only worker statement, file metadata, and worker-entered evidence notes were supplied. The original binary files were not sent." }));
    if (!result) throw new AiServiceError("AI_INVALID_RESPONSE", "The AI service returned an invalid structured result. Please retry.");
    return Response.json({ ...result, model: configuredModel() });
  } catch (error) {
    if (error instanceof AiServiceError) return Response.json({ error: error.message, code: error.code }, { status: error.code === "AI_UNAVAILABLE" ? 503 : 502 });
    return Response.json({ error: "Unable to analyse this incident." }, { status: 400 });
  }
}
