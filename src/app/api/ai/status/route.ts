import { isAiConfigured } from "@/lib/env";

/** Runtime-only capability check. It intentionally returns no configuration values. */
export async function GET() {
  return Response.json({ available: isAiConfigured() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
