import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PagesView } from "./pages-view";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage() {
  return (
    <>
      <PageHeader
        title="Pages"
        description="Modular website pages, content sections, legal policies and the home page."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Content" },
          { label: "Pages" },
        ]}
      />
      <Suspense>
        <PagesView />
      </Suspense>
    </>
  );
}
