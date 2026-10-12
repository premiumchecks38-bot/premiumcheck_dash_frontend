import type { Metadata } from "next";
import { Suspense } from "react";

import { ServicesView } from "@/components/dashboard/catalog/services-view";

export const metadata: Metadata = { title: "Services" };

export default function Page() {
  return (
    <Suspense>
      <ServicesView />
    </Suspense>
  );
}

