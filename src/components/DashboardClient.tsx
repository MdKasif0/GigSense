"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { listDeliveries, listIncidents } from "@/lib/db";
import { getProfitabilityVerdict } from "@/lib/calculations";
import type { DeliveryAnalysis } from "@/types/delivery";
import type { IncidentRecord } from "@/types/incident";

// ── Web Speech API Definitions ────────────────────────────────────────────────

type BrowserRecognitionResult = { transcript: string };
type BrowserRecognitionEvent = Event & {
  results: {
    length: number;
    [index: number]: { isFinal: boolean; [index: number]: BrowserRecognitionResult };
  };
};
type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;
type SpeechWindow = Window & {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

// ── Icons Matching Screenshot Exactly ─────────────────────────────────────────

function IconRoutePin({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19h4.5a4 4 0 0 0 4-4v0a4 4 0 0 0-4-4H9a4 4 0 0 1-4-4v0a4 4 0 0 1 4-4h6.5" />
    </svg>
  );
}

function IconShieldDoc({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Document outline with folded top-right corner */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M20 8v2" />
      <line x1="8" y1="12" x2="11" y2="12" />
      <line x1="8" y1="16" x2="10" y2="16" />
      {/* Shield on bottom-right */}
      <path d="M17 12a3.5 3.5 0 0 1 3.5 3.5c0 3-3.5 5.5-3.5 5.5s-3.5-2.5-3.5-5.5a3.5 3.5 0 0 1 3.5-3.5z" />
    </svg>
  );
}

function IconMic({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconArrowRight({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChatBubble() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
    return "Today, 2:12 PM";
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

  // Voice recognition handlers
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

  // Activity list items (defaults to the exact item shown in the reference image)
  const hasDynamicActivity = deliveries.length > 0 || incidents.length > 0;

  return (
    <div className="relative min-h-[85vh]">
      <div className="max-w-md mx-auto space-y-5 md:space-y-6 pb-4">
        {/* ── 1. Top Bar / App Header ── */}
        <div className="flex items-center justify-between pt-1">
          {/* Logo & GigSense Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
              <Image
                src="/brand/gigsense-logo.png"
                alt="GigSense"
                width={40}
                height={40}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-[22px] tracking-tight text-[#111827] leading-none">
              GigSense
            </span>
          </div>

          {/* User Profile Avatar Circle */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-full bg-[#F0F2F5] hover:bg-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
            aria-label="User Profile & Settings"
            title="Profile & Storage Info"
          >
            <IconUser />
          </button>
        </div>

        {/* ── 2. Greeting Section ── */}
        <div className="pt-1">
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#111827] leading-tight">
            Hello, Kasif 👋
          </h1>
          <p className="mt-1 text-[15px] sm:text-base font-normal text-[#6B7280]">
            Your work, made clearer.
          </p>
        </div>

        {/* ── 3. Primary Feature Cards (RouteReality & GigProof in 2 Columns) ── */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: RouteReality */}
          <div className="bg-white rounded-[26px] border border-[#EEF2F6] p-4.5 sm:p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden min-h-[215px] group hover:border-[#DCE4EC] transition-all">
            {/* Background subtle route watermark */}
            <svg
              className="absolute -right-4 bottom-10 w-28 h-28 pointer-events-none opacity-25 text-[#1D64F2]"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M 10 90 C 40 90, 30 50, 60 50 C 90 50, 70 10, 95 15" />
            </svg>

            <div className="relative z-10">
              {/* Top row: Icon badge + chevron */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#EEF5FF] text-[#1D64F2] flex items-center justify-center shrink-0">
                  <IconRoutePin />
                </div>
                <span className="text-[#9CA3AF]">
                  <IconChevronRight size={16} />
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5">
                <h3 className="text-base sm:text-[17px] font-bold text-[#111827] leading-tight">
                  RouteReality
                </h3>
                <p className="text-xs text-[#6B7280] leading-snug mt-1.5 min-h-[34px]">
                  Understand delivery costs before accepting an offer.
                </p>
              </div>
            </div>

            {/* Bottom Calculate Button */}
            <div className="pt-3 relative z-10">
              <Link
                href="/route-reality"
                className="w-full bg-[#EDF4FF] hover:bg-[#E2EEFF] text-[#1D64F2] font-semibold text-[13px] px-4 py-2.5 rounded-2xl flex items-center justify-between transition-colors no-underline"
                id="btn-action-route-reality"
              >
                <span>Calculate</span>
                <IconArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 2: GigProof */}
          <div className="bg-white rounded-[26px] border border-[#EEF2F6] p-4.5 sm:p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden min-h-[215px] group hover:border-[#DCE4EC] transition-all">
            {/* Background subtle document watermark */}
            <svg
              className="absolute -right-2 top-8 w-24 h-24 pointer-events-none opacity-20 text-[#94A3B8]"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="25" y="15" width="55" height="75" rx="6" />
              <line x1="38" y1="35" x2="68" y2="35" />
              <line x1="38" y1="50" x2="68" y2="50" />
              <line x1="38" y1="65" x2="55" y2="65" />
            </svg>

            <div className="relative z-10">
              {/* Top row: Icon badge + chevron */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#E8F8F0] text-[#111827] flex items-center justify-center shrink-0">
                  <IconShieldDoc />
                </div>
                <span className="text-[#9CA3AF]">
                  <IconChevronRight size={16} />
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5">
                <h3 className="text-base sm:text-[17px] font-bold text-[#111827] leading-tight">
                  GigProof
                </h3>
                <p className="text-xs text-[#6B7280] leading-snug mt-1.5 min-h-[34px]">
                  Organise incident evidence and prepare a report.
                </p>
              </div>
            </div>

            {/* Bottom Create report Button */}
            <div className="pt-3 relative z-10">
              <Link
                href="/gig-proof"
                className="w-full bg-[#EDF4FF] hover:bg-[#E2EEFF] text-[#1D64F2] font-semibold text-[13px] px-4 py-2.5 rounded-2xl flex items-center justify-between transition-colors no-underline"
                id="btn-action-gig-proof"
              >
                <span>Create report</span>
                <IconArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 4. Middle Banner: "Talk to GigSense" ── */}
        <button
          type="button"
          onClick={handleVoiceCardClick}
          id="btn-talk-gigsense"
          className="w-full rounded-[26px] border border-[#E2EEFC] p-4 sm:p-5 flex items-center justify-between gap-3 text-left transition-all cursor-pointer relative overflow-hidden shadow-[0_2px_14px_rgba(29,100,242,0.03)] hover:border-[#CADCF2]"
          style={{
            background: "linear-gradient(90deg, #F8FAFF 0%, #F3F7FE 60%, #EAF3FF 100%)",
          }}
        >
          {/* Subtle curved wave ribbons in background on the right */}
          <svg
            className="absolute right-0 top-0 bottom-0 h-full w-48 pointer-events-none opacity-30 text-[#93C5FD]"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M 0 50 Q 50 10, 100 50 T 200 40" />
            <path d="M 20 70 Q 70 30, 120 70 T 200 60" />
            <path d="M 10 30 Q 60 80, 110 30 T 200 20" />
          </svg>

          <div className="flex items-center gap-3.5 min-w-0 relative z-10">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#DCEBFF] text-[#1D64F2] flex items-center justify-center shrink-0">
              <IconMic size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#111827] leading-tight">
                Talk to GigSense
              </h3>
              <p className="text-xs text-[#6B7280] mt-1 truncate">
                Ask about delivery costs or incident reports.
              </p>
            </div>
          </div>

          {/* Blue Circular Action Arrow Button */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1D64F2] text-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(29,100,242,0.35)] relative z-10">
            <IconArrowRight size={18} />
          </div>
        </button>

        {/* ── 5. Recent Activity Section ── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-lg font-bold text-[#111827]">
              Recent activity
            </h2>
            <Link
              href="/history"
              className="text-sm font-medium text-[#6B7280] hover:text-[#111827] flex items-center gap-1 no-underline transition-colors"
            >
              <span>See all</span>
              <IconChevronRight size={15} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {hasDynamicActivity ? (
              <>
                {deliveries.slice(0, 2).map((rec) => {
                  const verdict = getProfitabilityVerdict(rec.estimatedContributionPerHour);
                  const isGood = verdict === "good";
                  return (
                    <Link
                      key={rec.id}
                      href="/route-reality"
                      className="bg-white rounded-[22px] border border-[#EEF2F6] p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#DCE4EC] transition-all block"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#EAF8F1] text-[#16A34A] flex items-center justify-center shrink-0">
                          <IconRoutePin />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#111827] truncate">
                            Delivery calculation
                          </p>
                          <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                            {fmtCurrency(rec.offeredPayment)} payment · {rec.estimatedDistanceKm} km · {rec.estimatedDurationMinutes} min
                          </p>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                            {fmtDate(rec.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#E6F7EE] text-[#16A34A] whitespace-nowrap">
                          {isGood ? "After vehicle costs" : `${fmtCurrency(rec.estimatedContributionPerHour)}/hr`}
                        </span>
                        <span className="text-[#9CA3AF]">
                          <IconChevronRight size={16} />
                        </span>
                      </div>
                    </Link>
                  );
                })}

                {incidents.slice(0, 1).map((inc) => (
                  <Link
                    key={inc.id}
                    href="/gig-proof"
                    className="bg-white rounded-[22px] border border-[#EEF2F6] p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#DCE4EC] transition-all block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#EEF5FF] text-[#1D64F2] flex items-center justify-center shrink-0">
                        <IconShieldDoc />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#111827] truncate">
                          {inc.title}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                          {inc.platform ? `${inc.platform} · ` : ""}{inc.evidence.length} evidence file{inc.evidence.length !== 1 ? "s" : ""}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          {fmtDate(inc.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EEF5FF] text-[#1D64F2] whitespace-nowrap">
                        Documented
                      </span>
                      <span className="text-[#9CA3AF]">
                        <IconChevronRight size={16} />
                      </span>
                    </div>
                  </Link>
                ))}
              </>
            ) : (
              /* Exact card matching the reference screenshot */
              <Link
                href="/route-reality"
                className="bg-white rounded-[22px] border border-[#EEF2F6] p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#DCE4EC] transition-all block"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF8F1] text-[#16A34A] flex items-center justify-center shrink-0">
                    <IconRoutePin />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111827] truncate">
                      Delivery calculation
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                      ₹85 payment · 8 km · 30 min
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Today, 2:12 PM
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#E6F7EE] text-[#16A34A] whitespace-nowrap">
                    After vehicle costs
                  </span>
                  <span className="text-[#9CA3AF]">
                    <IconChevronRight size={16} />
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── 6. Bottom Floating Chat Pill ("Ask GigSense anything...") ── */}
        <div className="pt-2">
          <form
            onSubmit={handleQuickSubmit}
            className="bg-white rounded-full border border-[#E5E9F0] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-2 pl-2.5 pr-2 flex items-center gap-2.5 transition-all focus-within:border-[#1D64F2] focus-within:shadow-[0_6px_24px_rgba(29,100,242,0.12)]"
            role="search"
            aria-label="Ask GigSense anything"
          >
            {/* Plus button */}
            <button
              type="button"
              onClick={() => router.push("/route-reality")}
              className="w-10 h-10 rounded-full bg-[#F0F4FA] hover:bg-[#E5ECF6] text-[#6B7280] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              title="New delivery offer entry"
              aria-label="New delivery offer entry"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Input placeholder */}
            <input
              type="text"
              placeholder="Ask GigSense anything..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#111827] placeholder-[#9CA3AF] px-1"
            />

            {/* Blue Microphone button */}
            <button
              type="button"
              onClick={handleVoiceCardClick}
              className="w-10 h-10 rounded-full bg-[#1D64F2] hover:bg-[#1557D6] text-white flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(29,100,242,0.35)] transition-transform active:scale-95 cursor-pointer"
              title="Voice assistant"
              aria-label="Voice assistant"
            >
              <IconMic size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* ── Voice Assistant Modal ── */}
      {isVoiceChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-between p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between max-w-md mx-auto w-full pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1D64F2] animate-ping" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                GigSense AI Voice
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopListening();
                setIsVoiceChatOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
            >
              <IconClose />
            </button>
          </div>

          <div className="max-w-md mx-auto w-full my-auto text-center space-y-6">
            <div className="space-y-2">
              {voiceState === "idle" && (
                <>
                  <p className="text-lg font-bold text-white">
                    “Tap the mic to describe a delivery offer or report an incident.”
                  </p>
                  <p className="text-xs text-white/75">
                    Example: “Got ₹120 for 8 km taking 25 minutes on Zomato”
                  </p>
                </>
              )}

              {voiceState === "listening" && (
                <>
                  <p className="text-xl font-bold text-white animate-pulse">
                    Listening to you...
                  </p>
                  <p className="text-xs text-white/75">
                    Speak your offer or incident details clearly.
                  </p>
                </>
              )}

              {voiceState === "processing" && (
                <p className="text-base font-semibold text-white">
                  Analyzing your details...
                </p>
              )}

              {voiceState === "ready" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#111827] bg-white p-4 rounded-2xl border border-[#EEF2F6] shadow-lg">
                    “{voiceTranscript}”
                  </p>
                  {parsedParams && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsVoiceChatOpen(false);
                        router.push(
                          `/route-reality?pay=${parsedParams.pay ?? ""}&km=${parsedParams.km ?? ""}&mins=${parsedParams.mins ?? ""}`
                        );
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#1D64F2] text-white text-xs font-semibold hover:bg-[#1557D6] shadow-md"
                    >
                      Calculate in RouteReality →
                    </button>
                  )}
                </div>
              )}

              {voiceState === "unsupported" && (
                <div className="space-y-3 bg-white p-5 rounded-2xl border border-[#EEF2F6] shadow-lg text-left">
                  <p className="text-xs text-[#6B7280]">
                    Speech recognition is not supported in this browser. Enter details below:
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. ₹95, 7 km, 20 mins"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-[#EEF2F6] rounded-xl outline-none focus:border-[#1D64F2]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsVoiceChatOpen(false);
                      handleQuickSubmit(e);
                    }}
                    className="w-full py-2.5 bg-[#1D64F2] text-white rounded-xl text-xs font-semibold"
                  >
                    Evaluate Offer →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 max-w-md mx-auto pb-4">
            <button
              type="button"
              onClick={() => {
                stopListening();
                setIsVoiceChatOpen(false);
                router.push("/route-reality");
              }}
              className="w-12 h-12 rounded-full bg-white text-[#111827] flex items-center justify-center shadow-lg cursor-pointer"
              title="Manual Calculator"
            >
              <IconChatBubble />
            </button>

            <button
              type="button"
              onClick={() => {
                if (voiceState === "listening") {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-transform active:scale-95 cursor-pointer ${
                voiceState === "listening"
                  ? "bg-[#EF4444] ring-8 ring-red-400/30"
                  : "bg-[#1D64F2] ring-8 ring-blue-400/30"
              }`}
              title={voiceState === "listening" ? "Stop Listening" : "Start Listening"}
            >
              <IconMic size={26} />
            </button>

            <button
              type="button"
              onClick={() => {
                stopListening();
                setIsVoiceChatOpen(false);
              }}
              className="w-12 h-12 rounded-full bg-white text-[#111827] flex items-center justify-center shadow-lg cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-[#EEF2F6] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#EEF5FF] text-[#1D64F2] flex items-center justify-center">
                  <IconUser />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Kasif</h3>
                  <p className="text-xs text-[#6B7280]">Gig Worker Partner</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F0F2F5] text-[#6B7280] hover:text-[#111827] flex items-center justify-center cursor-pointer"
              >
                <IconClose />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#6B7280]">
              <div className="flex items-center justify-between py-1 border-b border-[#EEF2F6]">
                <span>Storage mode:</span>
                <span className="font-semibold text-[#16A34A]">Local-First (IndexedDB)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#EEF2F6]">
                <span>Saved deliveries:</span>
                <span className="font-semibold text-[#111827]">{deliveries.length} records</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#EEF2F6]">
                <span>Documented incidents:</span>
                <span className="font-semibold text-[#111827]">{incidents.length} records</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Default vehicle cost:</span>
                <span className="font-semibold text-[#111827]">₹3.50 / km</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-full py-2.5 bg-[#1D64F2] text-white rounded-xl text-xs font-semibold hover:bg-[#1557D6] transition-colors cursor-pointer"
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
