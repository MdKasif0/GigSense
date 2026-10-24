import type { Metadata } from "next";
import { DeliveryAnalyzer } from "@/components/DeliveryAnalyzer";
import { isAiConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "RouteReality",
  description: "Calculate the real profitability of a delivery offer before you accept.",
};

export default function RouteRealityPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--gs-text-primary)" }}>
          RouteReality
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--gs-text-secondary)" }}>
          Know your real contribution before you accept an offer.
        </p>
      </div>
      <DeliveryAnalyzer aiAvailable={isAiConfigured()} />
    </div>
  );
}
