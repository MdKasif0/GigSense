"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseVoiceIncidentExtraction,
  parseVoiceRouteExtraction,
  type VoiceIncidentExtraction,
  type VoiceRouteExtraction,
} from "@/lib/voice-schema";

type VoiceState = "idle" | "requesting_permission" | "listening" | "processing_transcription" | "processing_ai" | "needs_more_information" | "result_ready" | "error";

interface SpeechRecognitionEventLike extends Event {
  results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceAssistant({
  workflow,
  onClose,
  onRouteApply,
  onIncidentApply,
}: {
  workflow: "route" | "incident";
  onClose: () => void;
  onRouteApply?: (values: VoiceRouteExtraction) => void;
  onIncidentApply?: (values: VoiceIncidentExtraction) => void;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<VoiceRouteExtraction | null>(null);
  const [incidentResult, setIncidentResult] = useState<VoiceIncidentExtraction | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const title = workflow === "route" ? "RouteReality Voice Assistant" : "GigProof Voice Assistant";
  const status: Record<VoiceState, string> = {
    idle: "Tap the microphone and tell us what you need.",
    requesting_permission: "Requesting microphone access…",
    listening: "Listening…",
    processing_transcription: "Transcript ready — review it before continuing.",
    processing_ai: "Understanding your request…",
    needs_more_information: "A few details still need your review.",
    result_ready: "Your draft is ready to review.",
    error: error ?? "Something went wrong. Try again or use text input.",
  };

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function startListening() {
    setError(null);
    setInterim("");
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setState("error");
      setError("Speech recognition is unavailable in this browser. Type your request below instead.");
      return;
    }
    try {
      setState("requesting_permission");
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let finalText = "";
        let partialText = "";
        for (let index = 0; index < event.results.length; index += 1) {
          const item = event.results[index];
          if (item.isFinal) finalText += item[0].transcript;
          else partialText += item[0].transcript;
        }
        if (finalText) setTranscript((current) => `${current} ${finalText}`.trim());
        setInterim(partialText);
        setState("listening");
      };
      recognition.onerror = (event) => {
        const messages: Record<string, string> = {
          "not-allowed": "Microphone permission was denied. You can enable it in browser settings or type your request.",
          "no-speech": "No speech was detected. Try again or type your request.",
          "network": "Speech recognition needs a network connection in this browser. Use the text option instead.",
        };
        setError(messages[event.error] ?? "Speech recognition failed. Try again or use text input.");
        setState("error");
      };
      recognition.onend = () => {
        if (transcript.trim() || interim.trim()) setState("processing_transcription");
        else setState((current) => current === "error" ? current : "idle");
      };
      recognition.start();
      setState("listening");
    } catch {
      setState("error");
      setError("Microphone access could not be started. Try again or use text input.");
    }
  }

  async function understandTranscript() {
    const text = transcript.trim();
    if (!text) {
      setError("Add a transcript before continuing.");
      setState("error");
      return;
    }
    setState("processing_ai");
    setError(null);
    try {
      const response = await fetch("/api/ai/voice-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, transcript: text }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("result" in payload)) throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "The transcript could not be understood.");
      if (workflow === "route") {
        const result = parseVoiceRouteExtraction(payload.result);
        if (!result) throw new Error("The extracted offer details were invalid. Please edit the transcript and try again.");
        setRouteResult(result);
        setState(result.missingFields.length ? "needs_more_information" : "result_ready");
      } else {
        const result = parseVoiceIncidentExtraction(payload.result);
        if (!result) throw new Error("The extracted incident details were invalid. Please edit the transcript and try again.");
        setIncidentResult(result);
        setState(result.missingInformation.length ? "needs_more_information" : "result_ready");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The transcript could not be understood.");
      setState("error");
    }
  }

  function applyResult() {
    if (routeResult && onRouteApply) onRouteApply(routeResult);
    if (incidentResult && onIncidentApply) onIncidentApply(incidentResult);
  }

  const gaps = routeResult?.missingFields ?? incidentResult?.missingInformation ?? [];
  const questions = incidentResult?.followUpQuestions ?? [];

  return (
    <div className="gs-voice-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="gs-voice-panel">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#0866F5" }}>GigSense</p>
            <h2 className="text-lg font-semibold" style={{ color: "#17191F" }}>{title}</h2>
          </div>
          <button className="gs-voice-icon-button" onClick={onClose} aria-label="Close voice assistant">×</button>
        </header>

        <div className={`gs-voice-orb-wrap ${state === "listening" ? "is-listening" : ""}`} aria-hidden="true">
          <div className="gs-voice-orb"><span /></div>
        </div>
        <p className="text-center text-sm font-medium" style={{ color: "#17191F" }} aria-live="polite">{status[state]}</p>

        <div className="mt-5">
          <label className="gs-label" htmlFor="voice-transcript">Transcript <span style={{ color: "#687080", fontWeight: 400 }}>(editable)</span></label>
          <textarea id="voice-transcript" className="gs-input gs-voice-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder={workflow === "route" ? "For example: I got ₹50 for 7 km and it will take 35 minutes…" : "Describe what happened in your own words…"} />
          {interim && <p className="mt-2 text-xs" style={{ color: "#687080" }}>{interim}</p>}
        </div>

        {(routeResult || incidentResult) && (
          <div className="gs-voice-result mt-4">
            {routeResult ? <RoutePreview result={routeResult} /> : null}
            {incidentResult ? <IncidentPreview result={incidentResult} /> : null}
            {gaps.length > 0 && <div className="mt-3 text-sm" style={{ color: "#8a5c00" }}><strong>Needs review:</strong><ul className="list-disc list-inside">{gaps.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {questions.length > 0 && <div className="mt-3 text-sm" style={{ color: "#687080" }}>{questions.map((question) => <p key={question}>• {question}</p>)}</div>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {state === "listening" ? <button className="gs-voice-stop" onClick={stopListening}>Stop listening</button> : <button className="gs-voice-mic" onClick={startListening} aria-label="Start voice input"><MicIcon /></button>}
          <button className="gs-btn-secondary" onClick={understandTranscript} disabled={state === "processing_ai"}>{state === "processing_ai" ? "Understanding…" : "Use transcript"}</button>
          {(routeResult || incidentResult) && <button className="gs-btn-primary" onClick={applyResult}>Apply to {workflow === "route" ? "offer" : "incident"}</button>}
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: "#687080" }}>Your transcript is sent only when you choose “Use transcript”. Audio is not saved by GigSense.</p>
      </section>
    </div>
  );
}

function RoutePreview({ result }: { result: VoiceRouteExtraction }) {
  const rows = [["Payment", result.payment], ["Distance", result.distanceKm === null ? null : `${result.distanceKm} km`], ["Duration", result.durationMinutes === null ? null : `${result.durationMinutes} min`], ["Vehicle cost", result.vehicleCostPerKm === null ? null : `₹${result.vehicleCostPerKm}/km`], ["Other expenses", result.additionalExpenses === null ? "Not stated" : `₹${result.additionalExpenses}`]];
  return <div><p className="font-semibold text-sm" style={{ color: "#17191F" }}>Extracted offer details</p><div className="gs-voice-preview-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value === null ? "Not found" : label === "Payment" && typeof value === "number" ? `₹${value}` : value}</strong></div>)}</div>{result.assumptions.length > 0 && <p className="mt-3 text-xs" style={{ color: "#687080" }}>{result.assumptions.join(" ")}</p>}</div>;
}

function IncidentPreview({ result }: { result: VoiceIncidentExtraction }) {
  return <div><p className="font-semibold text-sm" style={{ color: "#17191F" }}>{result.title}</p><p className="mt-1 text-sm" style={{ color: "#687080" }}>{result.workerStatement}</p>{result.eventDateTime && <p className="mt-2 text-xs" style={{ color: "#687080" }}>Time mentioned: {result.eventDateTime}</p>}</div>;
}

function MicIcon() {
  return <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/></svg>;
}
