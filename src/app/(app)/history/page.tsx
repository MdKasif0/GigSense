import type { Metadata } from "next";
import { HistoryPanel } from "@/components/HistoryPanel";

export const metadata: Metadata = {
  title: "Work History",
  description: "All your saved delivery analyses and incident records.",
};

export default function HistoryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--gs-text-primary)" }}>
          Work History
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--gs-text-secondary)" }}>
          Your saved delivery analyses and incident records.
        </p>
      </div>
      <HistoryPanel />
    </div>
  );
}
