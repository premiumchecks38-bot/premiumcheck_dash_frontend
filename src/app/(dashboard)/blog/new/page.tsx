import type { Metadata } from "next";
import { Suspense } from "react";

import { BlogEditor } from "../blog-editor";

export const metadata: Metadata = { title: "New Article" };

export default function NewBlogPage() {
  return (
    <Suspense>
      <BlogEditor />
    </Suspense>
  );
}
