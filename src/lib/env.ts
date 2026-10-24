/**
 * Environment configuration for GigSense.
 *
 * AI provider credentials are NEVER exposed to the browser.
 * All secrets are accessed only in server-side code via this module.
 *
 * The application starts and functions without any AI configuration.
 * AI features degrade gracefully when no key is present.
 */

/** Server-side only. Returns the AI provider API key, or null if unconfigured. */
export function getAiApiKey(): string | null {
  // This module is safe to import in server components and API routes.
  // It must never be imported in client components.
  const key = process.env.GIGSENSE_AI_API_KEY;
  return key && key.length > 0 ? key : null;
}

/** The AI provider to use. Defaults to Groq if unconfigured. */
export function getAiProvider(): string {
  return process.env.GIGSENSE_AI_PROVIDER ?? "groq";
}

/** Model identifier for the AI provider. */
export function getAiModel(): string {
  return process.env.GIGSENSE_AI_MODEL ?? "openai/gpt-oss-120b";
}

/** Speech-to-text model identifier, used only by the server transcription route. */
export function getSttModel(): string {
  return process.env.GIGSENSE_STT_MODEL ?? "whisper-large-v3";
}

/** Returns true only when a valid AI API key has been configured. */
export function isAiConfigured(): boolean {
  return getAiApiKey() !== null;
}
