import type { Metadata } from "next";
import { IncidentDocumenter } from "@/components/IncidentDocumenter";

export const metadata: Metadata = {
  title: "GigProof",
  description: "Document gig work incidents, organise evidence, and build your appeal.",
};

export default function GigProofPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--gs-text-primary)" }}>
          GigProof
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--gs-text-secondary)" }}>
          Document incidents, attach evidence, and prepare your case.
        </p>
      </div>
      <IncidentDocumenter />
    </div>
  );
}
