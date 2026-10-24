"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { listDeliveries, listIncidents } from "@/lib/db";
import { getProfitabilityVerdict } from "@/lib/calculations";
import type { DeliveryAnalysis } from "@/types/delivery";
import type { IncidentRecord } from "@/types/incident";

type BrowserRecognitionResult = { transcript: string };
type BrowserRecognitionEvent = { results: { [index: number]: { [index: number]: BrowserRecognitionResult } } };
type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;
type SpeechWindow = Window & { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor };

// ── Icons Matching Refined Mobile System ─────────────────────────────────────

function IconRoute() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}

function IconShieldDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 11v6" />
      <path d="M9 14l3-3 3 3" />
    </svg>
  );
}

function IconMic({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChatBubble() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}, ${timeStr}`;
  } catch {
    return "Recent";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryAnalysis[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [quickInput, setQuickInput] = useState("");
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Voice Assistant interaction state
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "ready" | "unsupported">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [parsedParams, setParsedParams] = useState<{ pay?: number; km?: number; mins?: number } | null>(null);

  const recognitionRef = useRef<BrowserRecognition | null>(null);

  useEffect(() => {
    Promise.all([listDeliveries(), listIncidents()])
      .then(([d, i]) => {
        setDeliveries(d);
        setIncidents(i);
      })
      .catch(console.error);
  }, []);

  // Quick text input parser
  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = quickInput.trim();
    if (!text) {
      router.push("/route-reality");
      return;
    }

    // Check if input contains multiple numbers (e.g., "85, 8, 30" or "85 8km 30m")
    const nums = text.match(/\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 1) {
      const pay = nums[0];
      const km = nums.length >= 2 ? nums[1] : "";
      const mins = nums.length >= 3 ? nums[2] : "";
      let url = `/route-reality?pay=${pay}`;
      if (km) url += `&km=${km}`;
      if (mins) url += `&mins=${mins}`;
      router.push(url);
    } else {
      router.push("/route-reality");
    }
  }

  // Voice Recognition setup
  function startListening() {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechWindow;
    const SpeechRec = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceState("unsupported");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setVoiceState("listening");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setVoiceState("processing");

        // Parse delivery numbers from natural speech
        const numbers = transcript.match(/\d+(?:\.\d+)?/g);
        if (numbers && numbers.length >= 1) {
          const parsed = {
            pay: parseFloat(numbers[0]),
            km: numbers.length >= 2 ? parseFloat(numbers[1]) : undefined,
            mins: numbers.length >= 3 ? parseFloat(numbers[2]) : undefined,
          };
          setParsedParams(parsed);
        }
        setVoiceState("ready");
      };

      recognition.onerror = () => {
        setVoiceState("unsupported");
      };

      recognition.onend = () => {
        if (voiceState === "listening") {
          setVoiceState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceState("unsupported");
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setVoiceState("idle");
  }

  function handleVoiceCardClick() {
    setIsVoiceChatOpen(true);
    setVoiceTranscript("");
    setParsedParams(null);
    setVoiceState("idle");
  }

  const recentDeliveries = deliveries.slice(0, 3);
  const recentIncidents = incidents.slice(0, 2);
  const hasActivity = deliveries.length > 0 || incidents.length > 0;

  return (
    <div className="relative min-h-[85vh]">
      <div className="max-w-md mx-auto space-y-5 md:space-y-6 pb-2">
        {/* ── A. Header: Brand Wordmark + Profile Control ── */}
        <div className="flex items-center justify-between pt-1">
          {/* Brand Wordmark & Emblem */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
              style={{ background: "linear-gradient(135deg, #0866F5 0%, #6366F1 100%)" }}
            >
              <span className="text-white font-extrabold text-base leading-none">G</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-[#191B22] leading-none">
              GigSense
            </span>
          </div>

          {/* Profile / Settings Button */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-full bg-white border border-[#E7EAF1] hover:border-[#D5DBE7] flex items-center justify-center text-[#737B8C] hover:text-[#191B22] shadow-xs transition-colors cursor-pointer"
            aria-label="User Profile & Storage Status"
            title="Profile & Storage Info"
          >
            <IconUser />
          </button>
        </div>

        {/* ── B. Greeting Section ── */}
        <div className="pt-1">
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#191B22] leading-tight">
            Hello, Kasif 👋
          </h1>
          <p className="mt-1 text-sm sm:text-base font-normal text-[#737B8C]">
            Your work, made clearer.
          </p>
        </div>

        {/* ── C. Primary Feature Cards: RouteReality & GigProof (2-Column Grid) ── */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* RouteReality Card */}
          <div className="gs-card-clean p-4 sm:p-5 flex flex-col justify-between min-h-[195px] relative overflow-hidden">
            <div>
              {/* Top Row: Icon + Chevron */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#EDF3FF] text-[#0866F5] flex items-center justify-center">
                  <IconRoute />
                </div>
                <span className="text-[#9299A8]" aria-hidden="true">
                  <IconChevronRight size={16} />
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5">
                <h3 className="text-base font-bold text-[#191B22] leading-tight">
                  RouteReality
                </h3>
                <p className="text-[12.5px] mt-1 text-[#737B8C] leading-snug">
                  Understand delivery costs before accepting an offer.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-3">
              <Link
                href="/route-reality"
                className="gs-btn-pill-soft"
                id="btn-action-route-reality"
              >
                <span>Calculate</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* GigProof Card */}
          <div className="gs-card-clean p-4 sm:p-5 flex flex-col justify-between min-h-[195px] relative overflow-hidden">
            <div>
              {/* Top Row: Icon + Chevron */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#EAF8F0] text-[#16865B] flex items-center justify-center">
                  <IconShieldDoc />
                </div>
                <span className="text-[#9299A8]" aria-hidden="true">
                  <IconChevronRight size={16} />
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5">
                <h3 className="text-base font-bold text-[#191B22] leading-tight">
                  GigProof
                </h3>
                <p className="text-[12.5px] mt-1 text-[#737B8C] leading-snug">
                  Organise incident evidence and prepare a report.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-3">
              <Link
                href="/gig-proof"
                className="gs-btn-pill-soft"
                id="btn-action-gig-proof"
              >
                <span>Create report</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── D. AI Voice Assistant Card ("Talk to GigSense") ── */}
        <button
          type="button"
          onClick={handleVoiceCardClick}
          id="btn-talk-gigsense"
          className="w-full gs-card-clean p-4 sm:p-4.5 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
          style={{
            background: "linear-gradient(90deg, #F3F7FF 0%, #FFFFFF 100%)",
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Mic Circle */}
            <div className="w-12 h-12 rounded-full bg-[#EDF3FF] text-[#0866F5] flex items-center justify-center shrink-0">
              <IconMic size={22} />
            </div>

            {/* Text */}
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#191B22] leading-tight">
                Talk to GigSense
              </h3>
              <p className="text-[13px] text-[#737B8C] mt-0.5 truncate">
                Ask about delivery costs or incident reports.
              </p>
            </div>
          </div>

          {/* Right Blue Action Arrow Button */}
          <div className="w-10 h-10 rounded-full bg-[#0866F5] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
            <IconArrowRight size={16} />
          </div>
        </button>

        {/* ── E. Recent Activity Section (Data-Driven from IndexedDB) ── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-lg font-bold text-[#191B22]">
              Recent activity
            </h2>
            <Link
              href="/history"
              className="text-xs sm:text-sm font-medium text-[#737B8C] hover:text-[#191B22] flex items-center gap-0.5 no-underline transition-colors"
            >
              <span>See all</span>
              <IconChevronRight size={14} />
            </Link>
          </div>

          {/* Activity List or Honest Empty State */}
          {hasActivity ? (
            <div className="space-y-2.5">
              {recentDeliveries.map((rec) => {
                const v = getProfitabilityVerdict(rec.estimatedContributionPerHour);
                const isGood = v === "good";
                return (
                  <Link
                    key={rec.id}
                    href="/route-reality"
                    className="gs-card-clean p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mint route icon box */}
                      <div className="w-10 h-10 rounded-xl bg-[#EAF8F0] text-[#16865B] flex items-center justify-center shrink-0">
                        <IconRoute />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#191B22] truncate">
                          Delivery calculation
                        </p>
                        <p className="text-xs text-[#737B8C] mt-0.5 truncate">
                          {fmtCurrency(rec.offeredPayment)} payment · {rec.estimatedDistanceKm} km · {rec.estimatedDurationMinutes} min
                        </p>
                        <p className="text-[11px] text-[#9299A8] mt-0.5">
                          {fmtDate(rec.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EAF8F0] text-[#16865B]">
                        {isGood ? "After vehicle costs" : `${fmtCurrency(rec.estimatedContributionPerHour)}/hr`}
                      </span>
                      <span className="text-[#9299A8]">
                        <IconChevronRight size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}

              {recentIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  href="/gig-proof"
                  className="gs-card-clean p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline block"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF3FF] text-[#0866F5] flex items-center justify-center shrink-0">
                      <IconShieldDoc />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#191B22] truncate">
                        {inc.title}
                      </p>
                      <p className="text-xs text-[#737B8C] mt-0.5 truncate">
                        {inc.platform ? `${inc.platform} · ` : ""}{inc.evidence.length} evidence file{inc.evidence.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[11px] text-[#9299A8] mt-0.5">
                        {fmtDate(inc.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EDF3FF] text-[#0866F5]">
                      Documented
                    </span>
                    <span className="text-[#9299A8]">
                      <IconChevronRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Honest, Useful Empty State */
            <div className="gs-card-clean p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EDF3FF] text-[#0866F5] mx-auto flex items-center justify-center">
                <IconRoute />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#191B22]">No activity yet</h4>
                <p className="text-xs text-[#737B8C] max-w-xs mx-auto">
                  Your calculations and incident reports will appear here.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  href="/route-reality"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0866F5] text-white hover:bg-[#0654CC] transition-colors no-underline"
                >
                  <span>Calculate an offer</span>
                  <IconArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── F. Chat Composer ("Ask GigSense anything...") ── */}
        {/* Placed with dedicated bottom clearance so it NEVER overlaps with the bottom nav */}
        <div className="pt-2">
          <form
            onSubmit={handleQuickSubmit}
            className="gs-composer-pill p-1.5 pl-3 pr-1.5 flex items-center gap-2.5"
            role="search"
            aria-label="Ask GigSense anything"
          >
            {/* Left + Button */}
            <button
              type="button"
              onClick={() => router.push("/route-reality")}
              className="w-9 h-9 rounded-full bg-[#F0F3F9] hover:bg-[#E4E9F2] text-[#737B8C] flex items-center justify-center text-lg font-light shrink-0 transition-colors cursor-pointer"
              title="New delivery offer entry"
              aria-label="New delivery offer entry"
            >
              +
            </button>

            {/* Input Field */}
            <input
              type="text"
              placeholder="Ask GigSense anything..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#191B22] placeholder-[#9299A8]"
            />

            {/* Right Mic Button: Opens Voice Assistant */}
            <button
              type="button"
              onClick={handleVoiceCardClick}
              className="w-10 h-10 rounded-full bg-[#0866F5] hover:bg-[#0654CC] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 transition-transform active:scale-95 cursor-pointer"
              title="Voice assistant"
              aria-label="Voice assistant"
            >
              <IconMic size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* ── Voice Assistant Modal (Connected to RouteReality & GigProof) ── */}
      {isVoiceChatOpen && (
        <div className="fixed inset-0 z-50 bg-[#F7F8FC] flex flex-col justify-between p-5 sm:p-7 animate-in fade-in duration-150">
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full max-w-md mx-auto pt-1">
            <button
              type="button"
              onClick={() => {
                stopListening();
                setIsVoiceChatOpen(false);
              }}
              className="w-10 h-10 rounded-full bg-white border border-[#E7EAF1] flex items-center justify-center text-[#191B22] cursor-pointer shadow-xs"
              aria-label="Back to dashboard"
            >
              <IconChevronLeft />
            </button>
            <h2 className="text-base font-bold text-[#191B22]">
              Talk to GigSense
            </h2>
            <div className="w-10" aria-hidden="true" />
          </div>

          {/* Center: Luminous 3D Orb + Speech Feedback */}
          <div className="flex flex-col items-center justify-center max-w-md mx-auto my-auto text-center space-y-6 w-full">
            {/* Luminous Orb */}
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full bg-blue-400/25 blur-2xl transition-all duration-500 ${
                  voiceState === "listening" ? "scale-125 opacity-100" : "scale-100 opacity-40"
                }`}
              />
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-xl">
                <Image
                  src="/brand/luna-sphere.jpg"
                  alt="GigSense AI Voice Orb"
                  width={208}
                  height={208}
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* State Message */}
            <div className="space-y-2 px-4 max-w-sm">
              {voiceState === "idle" && (
                <>
                  <p className="text-base font-semibold text-[#191B22]">
                    “Tap the mic to describe a delivery offer or report an incident.”
                  </p>
                  <p className="text-xs text-[#737B8C]">
                    Example: “Got ₹120 for 8 km taking 25 minutes”
                  </p>
                </>
              )}

              {voiceState === "listening" && (
                <>
                  <p className="text-base font-semibold text-[#0866F5] animate-pulse">
                    Listening to you...
                  </p>
                  <p className="text-xs text-[#737B8C]">
                    Speak your offer or incident details clearly.
                  </p>
                </>
              )}

              {voiceState === "processing" && (
                <p className="text-sm font-semibold text-[#0866F5]">
                  Analyzing your details...
                </p>
              )}

              {voiceState === "ready" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#191B22] bg-white p-3 rounded-xl border border-[#E7EAF1]">
                    “{voiceTranscript}”
                  </p>
                  {parsedParams && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsVoiceChatOpen(false);
                          router.push(
                            `/route-reality?pay=${parsedParams.pay ?? ""}&km=${parsedParams.km ?? ""}&mins=${parsedParams.mins ?? ""}`
                          );
                        }}
                        className="px-4 py-2 rounded-xl bg-[#0866F5] text-white text-xs font-semibold hover:bg-[#0654CC]"
                      >
                        Calculate in RouteReality →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {voiceState === "unsupported" && (
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E7EAF1]">
                  <p className="text-xs text-[#737B8C]">
                    Microphone is unavailable or speech recognition is not supported in this browser. Enter details below:
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. ₹95, 7 km, 20 mins"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E7EAF1] rounded-xl outline-none focus:border-[#0866F5]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsVoiceChatOpen(false);
                      handleQuickSubmit(e);
                    }}
                    className="w-full py-2 bg-[#0866F5] text-white rounded-xl text-xs font-semibold"
                  >
                    Evaluate Offer →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Voice Controls */}
          <div className="flex items-center justify-center gap-6 max-w-md mx-auto pb-4">
            {/* Chat Switcher */}
            <button
              type="button"
              onClick={() => {
                stopListening();
                setIsVoiceChatOpen(false);
                router.push("/route-reality");
              }}
              className="w-12 h-12 rounded-full bg-white border border-[#E7EAF1] text-[#191B22] flex items-center justify-center shadow-xs cursor-pointer"
              title="Manual Calculator"
            >
              <IconChatBubble />
            </button>

            {/* Central Mic Button */}
            <button
              type="button"
              onClick={() => {
                if (voiceState === "listening") {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer ${
                voiceState === "listening"
                  ? "bg-[#EF4444] ring-8 ring-red-100"
                  : "bg-[#0866F5] ring-8 ring-blue-100/70"
              }`}
              title={voiceState === "listening" ? "Stop Listening" : "Start Listening"}
            >
              <IconMic size={26} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopListening();
                setIsVoiceChatOpen(false);
              }}
              className="w-12 h-12 rounded-full bg-white border border-[#E7EAF1] text-[#191B22] flex items-center justify-center shadow-xs cursor-pointer"
              title="Close Voice Assistant"
            >
              <IconClose />
            </button>
          </div>
        </div>
      )}

      {/* ── User Profile & Local Storage Modal ── */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7EAF1] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E7EAF1] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#EDF3FF] text-[#0866F5] flex items-center justify-center">
                  <IconUser />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#191B22]">Kasif</h3>
                  <p className="text-xs text-[#737B8C]">Gig Worker Partner</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F3F8] text-[#737B8C] hover:text-[#191B22] flex items-center justify-center cursor-pointer"
              >
                <IconClose />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#737B8C]">
              <div className="flex items-center justify-between py-1 border-b border-[#E7EAF1]/60">
                <span>Storage mode:</span>
                <span className="font-semibold text-[#16865B]">Local-First (IndexedDB)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E7EAF1]/60">
                <span>Saved deliveries:</span>
                <span className="font-semibold text-[#191B22]">{deliveries.length} records</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E7EAF1]/60">
                <span>Documented incidents:</span>
                <span className="font-semibold text-[#191B22]">{incidents.length} records</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Default vehicle cost:</span>
                <span className="font-semibold text-[#191B22]">₹3.50 / km</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-full py-2.5 bg-[#0866F5] text-white rounded-xl text-xs font-semibold hover:bg-[#0654CC] transition-colors"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
