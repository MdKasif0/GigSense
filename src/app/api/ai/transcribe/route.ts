import { getAiApiKey, getAiProvider, getSttModel } from "@/lib/env";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SUPPORTED_AUDIO = new Set(["audio/flac", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm", "audio/x-m4a"]);

export async function POST(request: Request) {
  const key = getAiApiKey();
  if (!key) return Response.json({ error: "Live transcription is not configured. Add GIGSENSE_AI_API_KEY on the server." }, { status: 503 });
  if (getAiProvider() !== "groq") return Response.json({ error: "Speech transcription is configured for Groq only." }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_AUDIO_BYTES || !SUPPORTED_AUDIO.has(file.type)) {
      return Response.json({ error: "Upload an MP3, MP4, M4A, OGG, WAV, WebM, or FLAC file under 25 MB." }, { status: 400 });
    }
    const upstreamForm = new FormData();
    upstreamForm.append("file", file, file.name);
    upstreamForm.append("model", getSttModel());
    upstreamForm.append("response_format", "json");
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstreamForm,
    });
    if (!response.ok) return Response.json({ error: response.status === 401 ? "The server AI key was rejected. Check its configuration." : "Groq could not transcribe this file. Try a supported audio format or enter notes manually." }, { status: 502 });
    const payload = await response.json() as { text?: unknown };
    if (typeof payload.text !== "string" || !payload.text.trim()) return Response.json({ error: "Groq returned an empty transcript. Enter relevant evidence notes manually." }, { status: 502 });
    return Response.json({ text: payload.text.trim(), model: getSttModel() });
  } catch {
    return Response.json({ error: "Unable to transcribe this audio. Check your connection and try again." }, { status: 502 });
  }
}
