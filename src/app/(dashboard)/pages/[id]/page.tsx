import type { Metadata } from "next";
import { Suspense } from "react";

import { PageEditor } from "../page-editor";

export const metadata: Metadata = { title: "Edit Page" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPagePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense>
      <PageEditor pageId={id} />
    </Suspense>
  );
}
