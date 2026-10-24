import "server-only";

import { getAiApiKey, getAiModel, getAiProvider } from "@/lib/env";

export class AiServiceError extends Error {
  constructor(public readonly code: "AI_UNAVAILABLE" | "AI_PROVIDER_UNSUPPORTED" | "AI_REQUEST_FAILED" | "AI_INVALID_RESPONSE", message: string) {
    super(message);
  }
}

export async function requestAiJson(system: string, input: unknown): Promise<unknown> {
  const key = getAiApiKey();
  if (!key) throw new AiServiceError("AI_UNAVAILABLE", "Live AI is not configured. Add GIGSENSE_AI_API_KEY on the server to enable it.");
  const provider = getAiProvider();
  const model = getAiModel();
  if (!provider || !model) throw new AiServiceError("AI_UNAVAILABLE", "Live AI configuration is incomplete. Add the provider and text model on the server.");
  if (provider !== "groq" && provider !== "openai") throw new AiServiceError("AI_PROVIDER_UNSUPPORTED", "This build supports Groq or OpenAI-compatible providers only.");
  const baseUrl = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";

  const requestBody = {
    model,
    temperature: 0.1,
    max_tokens: 900,
    messages: [
      { role: "system", content: `${system}\nReturn one JSON object only. Do not add markdown, commentary, or omit required keys.` },
      { role: "user", content: JSON.stringify(input) },
    ],
  };
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ...requestBody, response_format: { type: "json_object" } }),
    });
    // Some OpenAI-compatible model configurations reject response_format.
    // The prompt still requires JSON, so retry once without that optional flag.
    if (response.status === 400) {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(requestBody),
      });
    }
  } catch {
    throw new AiServiceError("AI_REQUEST_FAILED", "The AI service could not be reached. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new AiServiceError("AI_REQUEST_FAILED", response.status === 401 ? "The server AI key was rejected. Check its configuration." : "The AI service returned an error. Please try again later.");
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AiServiceError("AI_INVALID_RESPONSE", "The AI service returned no usable result.");
  try {
    const cleaned = content.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "").trim();
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    return JSON.parse(objectStart >= 0 && objectEnd > objectStart ? cleaned.slice(objectStart, objectEnd + 1) : cleaned);
  } catch {
    throw new AiServiceError("AI_INVALID_RESPONSE", "The AI service returned an invalid structured result. Please retry.");
  }
}

export function configuredModel(): string {
  const model = getAiModel();
  if (!model) throw new AiServiceError("AI_UNAVAILABLE", "Live AI configuration is incomplete. Add the text model on the server.");
  return model;
}
