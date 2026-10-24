"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { listDeliveries, listIncidents } from "@/lib/db";
import { getProfitabilityVerdict } from "@/lib/calculations";
import type { DeliveryAnalysis } from "@/types/delivery";
import type { IncidentRecord } from "@/types/incident";

// ── Icons Matching Reference Images ──────────────────────────────────────────

function IconImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconDocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}

function IconMeetingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconNoteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconArrowUpRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function IconMic({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
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

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return "";
  }
}

// Sample records when IndexedDB is empty
const SAMPLE_DELIVERIES: Partial<DeliveryAnalysis>[] = [
  {
    id: "sample-1",
    platform: "Zomato",
    offeredPayment: 95,
    estimatedDistanceKm: 7.5,
    estimatedDurationMinutes: 28,
    calculatedVehicleCost: 26.25,
    estimatedContribution: 68.75,
    estimatedContributionPerHour: 147.32,
    createdAt: "2026-10-24T06:00:00.000Z",
    analysisMode: "sample",
  },
  {
    id: "sample-2",
    platform: "Swiggy",
    offeredPayment: 42,
    estimatedDistanceKm: 6.2,
    estimatedDurationMinutes: 32,
    calculatedVehicleCost: 21.7,
    estimatedContribution: 20.3,
    estimatedContributionPerHour: 38.06,
    createdAt: "2026-10-24T04:00:00.000Z",
    analysisMode: "sample",
  },
];

// ── Main Dashboard Component ──────────────────────────────────────────────────

export function DashboardClient() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryAnalysis[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [quickInput, setQuickInput] = useState("");
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [activeTabLabel, setActiveTabLabel] = useState<string>("Make trendy image");

  useEffect(() => {
    Promise.all([listDeliveries(), listIncidents()])
      .then(([d, i]) => { setDeliveries(d); setIncidents(i); })
      .catch(console.error);
  }, []);

  const recentDeliveries = deliveries.length > 0 ? deliveries.slice(0, 3) : (SAMPLE_DELIVERIES as DeliveryAnalysis[]);
  const recentIncidents = incidents.slice(0, 2);

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickInput.trim()) {
      router.push("/route-reality");
      return;
    }
    const num = parseFloat(quickInput);
    if (!isNaN(num) && num > 0) {
      router.push(`/route-reality?pay=${num}`);
    } else {
      router.push("/route-reality");
    }
  }

  function handlePresetClick(label: string, pay: string, km: string, mins: string, platform: string) {
    setActiveTabLabel(label);
    router.push(`/route-reality?pay=${pay}&km=${km}&mins=${mins}&platform=${encodeURIComponent(platform)}`);
  }

  return (
    <div className="relative min-h-[90vh]">
      {/* ── Background Subtle Wave Curves (Exact Match to Mockups) ── */}
      <div
        className="pointer-events-none absolute -top-8 left-0 right-0 h-96 opacity-60 bg-no-repeat bg-top bg-cover z-0"
        style={{ backgroundImage: "url('/brand/wave-bg.svg')" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-xl mx-auto space-y-6 md:space-y-7 pb-24">
        {/* ── Top Header: Try Premium Pill (Alex logo removed) ── */}
        <div className="flex items-center justify-end pt-2">
          {/* Try Premium Orange Glowing Gradient Pill on Right */}
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="gs-premium-btn"
            id="btn-try-premium"
          >
            <IconCrown />
            <span>Try premium</span>
          </button>
        </div>

        {/* ── Greeting Heading ── */}
        <div className="pt-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1D20] leading-none">
            Hello Kasif, 👋
          </h1>
          <div className="mt-2 text-2xl sm:text-[28px] font-bold tracking-tight text-[#1A1D20] leading-tight">
            Make anything you want,
            <br />
            whenever you want.
          </div>
        </div>

        {/* ── 2x2 Action Cards Grid (Exact Layout from Mockup) ── */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4.5">
          {/* Card 1: Generating Image ➔ RouteReality */}
          <ActionCard
            href="/route-reality"
            icon={<IconImageIcon />}
            title="Generating Image"
            subtitle="Evaluate route profit"
            id="dash-action-route-reality"
          />

          {/* Card 2: Creating Image ➔ GigProof */}
          <ActionCard
            href="/gig-proof"
            icon={<IconDocumentIcon />}
            title="Creating Image"
            subtitle="Document incident"
            id="dash-action-gig-proof"
          />

          {/* Card 3: Scheduling Meeting ➔ History */}
          <ActionCard
            href="/history"
            icon={<IconMeetingIcon />}
            title="Scheduling Meeting"
            subtitle="Review past trips"
            id="dash-action-history"
          />

          {/* Card 4: Writing Note ➔ Opens Voice Chat Modal */}
          <button
            type="button"
            onClick={() => setIsVoiceChatOpen(true)}
            id="dash-action-voice"
            className="gs-card-modern p-4 sm:p-5 flex flex-col justify-between no-underline group text-left cursor-pointer transition-all"
            style={{ minHeight: "140px" }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 bg-[#F6F8FC]">
                <IconNoteIcon />
              </div>
              <div className="gs-arrow-btn" aria-hidden="true">
                <IconArrowUpRight />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm sm:text-base font-bold text-[#1A1D20] leading-tight">
                Writing Note
              </h3>
              <p className="text-[11px] mt-0.5 text-[#7E8895] font-medium leading-none">
                AI voice assistant
              </p>
            </div>
          </button>
        </div>

        {/* ── Chat history / Recent checks section ── */}
        <div className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-lg font-bold text-[#1A1D20]">
              Chat history
            </h2>
            <Link
              href="/history"
              className="text-sm font-medium text-[#7E8895] hover:text-[#1A1D20] no-underline transition-colors"
            >
              See all
            </Link>
          </div>

          {/* ── Preset Chips (Exact Match to Mockup) ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handlePresetClick("Make trendy image", "85", "8", "30", "Zomato")}
              className={`gs-chip shrink-0 ${activeTabLabel === "Make trendy image" ? "!border-[#0066FF] !text-[#0066FF] !bg-[#F4F8FF]" : ""}`}
            >
              Make trendy image
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick("Give me viral Image prompt", "140", "12", "40", "Swiggy")}
              className={`gs-chip shrink-0 ${activeTabLabel === "Give me viral Image prompt" ? "!border-[#0066FF] !text-[#0066FF] !bg-[#F4F8FF]" : ""}`}
            >
              Give me viral Image prompt
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick("DoorDash $18", "220", "18", "60", "DoorDash")}
              className="gs-chip shrink-0"
            >
              DoorDash $18 • 6km
            </button>
          </div>

          {/* ── Recent Items List ── */}
          <div className="space-y-2 mt-3">
            {recentDeliveries.map((rec) => {
              const v = getProfitabilityVerdict(rec.estimatedContributionPerHour);
              const vColor = v === "good" ? "#10B981" : v === "marginal" ? "#F59E0B" : "#EF4444";
              const vBg = v === "good" ? "#ECFDF5" : v === "marginal" ? "#FFFBEB" : "#FEF2F2";
              return (
                <Link
                  key={rec.id}
                  href="/route-reality"
                  className="gs-card-modern p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline transition-all block"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: vBg, color: vColor }}
                    >
                      <IconImageIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1A1D20] truncate">
                        {rec.platform || "Delivery Offer"} · {fmtCurrency(rec.offeredPayment)}
                      </p>
                      <p className="text-xs text-[#7E8895] mt-0.5 truncate">
                        {rec.estimatedDistanceKm} km · {rec.estimatedDurationMinutes} mins · {fmtCurrency(rec.estimatedContributionPerHour)}/hr
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: vBg, color: vColor }}
                    >
                      {v === "good" ? "Profitable" : v === "marginal" ? "Marginal" : "Low"}
                    </span>
                  </div>
                </Link>
              );
            })}

            {recentIncidents.length > 0 && (
              <div className="pt-1 space-y-2">
                {recentIncidents.map((inc) => (
                  <Link
                    key={inc.id}
                    href="/gig-proof"
                    className="gs-card-modern p-3.5 sm:p-4 flex items-center justify-between gap-3 no-underline transition-all block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-[#F4F6FB] text-[#0066FF]">
                        <IconDocumentIcon />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A1D20] truncate">
                          {inc.title}
                        </p>
                        <p className="text-xs text-[#7E8895] mt-0.5">
                          {inc.platform ? `${inc.platform} · ` : ""}{inc.evidence.length} evidence · {fmtDate(inc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#7E8895]">
                      Documented
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Floating Input Dock (Exact Match to Mockup) ── */}
        <div className="pt-2">
          <form
            onSubmit={handleQuickSubmit}
            className="gs-input-pill p-3 sm:p-3.5 flex flex-col gap-2.5 shadow-xl"
            role="search"
            aria-label="Ask anything input"
          >
            {/* Input Field */}
            <input
              type="text"
              placeholder="Ask anything..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-base text-[#1A1D20] placeholder-[#8C97A8] px-1"
            />

            {/* Bottom Actions Row: + button on left, mic + blue send button on right */}
            <div className="flex items-center justify-between pt-1">
              {/* Plus Button */}
              <button
                type="button"
                onClick={() => router.push("/route-reality")}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F4F6FC] hover:bg-[#E9EDF8] text-[#556987] transition-colors cursor-pointer"
                title="New Calculation / Upload Evidence"
              >
                <span className="text-xl font-light leading-none">+</span>
              </button>

              {/* Right Side: Mic + Send Button */}
              <div className="flex items-center gap-2.5">
                {/* Mic Button: Launches Voice Chat Screen */}
                <button
                  type="button"
                  onClick={() => setIsVoiceChatOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#E8ECF4] text-[#556987] hover:border-[#0066FF] hover:text-[#0066FF] shadow-xs transition-all cursor-pointer"
                  title="Voice Chat"
                >
                  <IconMic size={18} />
                </button>

                {/* Send Button: Vibrant Cobalt Blue with Drop Shadow */}
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[#0066FF] hover:bg-[#0055D6] text-white shadow-md shadow-blue-500/40 transition-transform active:scale-95 cursor-pointer"
                  title="Submit Offer Check"
                >
                  <IconSend />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Voice Chat Screen (Exact Match to Image 3) ── */}
      {isVoiceChatOpen && (
        <div className="fixed inset-0 z-50 bg-[#F8F9FE] flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200">
          {/* Subtle Wave Background in Voice Chat */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60 bg-no-repeat bg-top bg-cover z-0"
            style={{ backgroundImage: "url('/brand/wave-bg.svg')" }}
            aria-hidden="true"
          />

          {/* Top Bar: Back button on left, "Voice chat" centered */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-md mx-auto pt-2">
            <button
              type="button"
              onClick={() => setIsVoiceChatOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F2F4F8] hover:bg-[#E5E9F2] text-[#1A1D20] transition-colors cursor-pointer"
              aria-label="Back to dashboard"
            >
              <IconChevronLeft />
            </button>
            <h2 className="text-base font-bold text-[#1A1D20]">
              Voice chat
            </h2>
            <div className="w-10" aria-hidden="true" />
          </div>

          {/* Center Content: Floating 3D Orb + Speech Prompt */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto my-auto text-center space-y-8">
            {/* 3D Periwinkle Lavender Glowing Orb with Float Animation */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              {/* Soft glow behind orb */}
              <div className="absolute inset-0 rounded-full bg-blue-300/30 blur-2xl animate-pulse-ring" />
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl animate-float-orb">
                <Image
                  src="/brand/luna-sphere.jpg"
                  alt="AI Assistant 3D Orb"
                  width={256}
                  height={256}
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Speech Bubble Prompt */}
            <div className="space-y-3 px-4">
              <p className="text-base sm:text-lg font-semibold text-[#1A1D20] leading-relaxed">
                “Hello 👋 I can help you answer questions, explain topics, write content, or just chat casually. Ask me anything!”
              </p>
              <p className="text-sm font-medium text-[#0066FF] tracking-wide animate-pulse">
                listening...
              </p>
            </div>
          </div>

          {/* Bottom Controls: Chat icon, Glowing Blue Mic, Close X */}
          <div className="relative z-10 flex items-center justify-center gap-6 max-w-md mx-auto pb-4">
            {/* Chat Bubble Button */}
            <button
              type="button"
              onClick={() => {
                setIsVoiceChatOpen(false);
                router.push("/route-reality");
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-[#F2F4F8] hover:bg-[#E5E9F2] text-[#1A1D20] transition-colors cursor-pointer"
              title="Open text analyzer"
            >
              <IconChatBubble />
            </button>

            {/* Glowing Big Blue Mic Button */}
            <button
              type="button"
              className="w-18 h-18 rounded-full flex items-center justify-center bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-xl shadow-blue-500/40 ring-8 ring-blue-100/70 transition-transform active:scale-95 cursor-pointer"
              title="Speak to Luna / GigSense"
            >
              <IconMic size={28} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsVoiceChatOpen(false)}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-[#F2F4F8] hover:bg-[#E5E9F2] text-[#1A1D20] transition-colors cursor-pointer"
              title="Close Voice Chat"
            >
              <IconClose />
            </button>
          </div>
        </div>
      )}

      {/* ── Onboarding / Luna Welcome Screen (Exact Match to Image 1) ── */}
      {isOnboardingOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#DCE6FF] via-[#EEF3FF] to-[#FFFFFF] flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200">
          <div
            className="pointer-events-none absolute inset-0 opacity-50 bg-no-repeat bg-top bg-cover z-0"
            style={{ backgroundImage: "url('/brand/wave-bg.svg')" }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center justify-end w-full max-w-md mx-auto pt-2">
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/70 hover:bg-white text-[#1A1D20] shadow-xs cursor-pointer"
              aria-label="Close onboarding preview"
            >
              <IconClose />
            </button>
          </div>

          {/* Top Half: Giant Luminous 3D Orb */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto my-auto text-center space-y-6">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-300/40 blur-3xl animate-pulse-ring" />
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl animate-float-orb">
                <Image
                  src="/brand/luna-sphere.jpg"
                  alt="Luna AI 3D Orb"
                  width={288}
                  height={288}
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-3 px-4 pt-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                Luna AI
              </h2>
              <p className="text-base text-[#4B5565] max-w-xs mx-auto leading-relaxed">
                At Luna, think that your voice has the ability to change the way you work.
              </p>
            </div>
          </div>

          {/* Bottom Button: Vibrant Blue "Get Started" Pill */}
          <div className="relative z-10 w-full max-w-md mx-auto pb-4">
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(false)}
              className="w-full py-4 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-lg shadow-lg shadow-blue-500/40 transition-transform active:scale-98 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: 2x2 Action Card ─────────────────────────────────────────────

function ActionCard({
  href, icon, title, subtitle, id,
}: {
  href: string; icon: React.ReactNode; title: string; subtitle: string; id: string;
}) {
  return (
    <Link
      id={id}
      href={href}
      className="gs-card-modern p-4 sm:p-5 flex flex-col justify-between no-underline group block"
      style={{ minHeight: "140px" }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 bg-[#F6F8FC]">
          {icon}
        </div>
        <div className="gs-arrow-btn" aria-hidden="true">
          <IconArrowUpRight />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm sm:text-base font-bold text-[#1A1D20] leading-tight">
          {title}
        </h3>
        <p className="text-[11px] mt-0.5 text-[#7E8895] font-medium leading-none">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
