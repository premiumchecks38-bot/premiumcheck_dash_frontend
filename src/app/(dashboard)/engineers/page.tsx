import type { Metadata } from "next";

import { EngineersPanel } from "@/components/dashboard/availability/engineers-panel";

export const metadata: Metadata = {
  title: "Engineers | Premium Property Checks",
};

export default function EngineersPage() {
  return (
    <div className="space-y-6">
      <EngineersPanel />
    </div>
  );
}
