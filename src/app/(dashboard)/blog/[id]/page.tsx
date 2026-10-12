import type { Metadata } from "next";
import { Suspense } from "react";

import { BlogEditor } from "../blog-editor";

export const metadata: Metadata = { title: "Edit Article" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense>
      <BlogEditor postId={id} />
    </Suspense>
  );
}
