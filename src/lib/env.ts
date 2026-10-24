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

/** The AI provider to use. Defaults to "openai" if unconfigured. */
export function getAiProvider(): string {
  return process.env.GIGSENSE_AI_PROVIDER ?? "openai";
}

/** Model identifier for the AI provider. */
export function getAiModel(): string {
  return process.env.GIGSENSE_AI_MODEL ?? "gpt-4o-mini";
}

/** Returns true only when a valid AI API key has been configured. */
export function isAiConfigured(): boolean {
  return getAiApiKey() !== null;
}
