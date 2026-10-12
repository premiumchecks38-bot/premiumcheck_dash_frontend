"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export type { RichTextEditorProps } from "./rich-text-editor";

/**
 * The content editor, loaded only on pages that use it so every other page stays light.
 * Tiptap renders in the browser (immediatelyRender: false), so it is not server rendered.
 */
export const RichTextEditor = dynamic(() => import("./rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2 rounded-md border-thin border-border p-3" aria-busy="true">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
});
