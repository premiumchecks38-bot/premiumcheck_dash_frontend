"use client";

import { useQuery } from "@tanstack/react-query";

import type { Media } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";

import { imageValueOf, type ImageValue } from "./image-field";

/**
 * The preview of an image stored only by id (category image, settings logo, section image).
 * Without media page access the id is kept and a plain placeholder is shown.
 */
export function useImageById(id: string | null | undefined): ImageValue | null {
  const query = useQuery({
    queryKey: ["media", "item", id],
    enabled: Boolean(id),
    staleTime: 300_000,
    queryFn: () => admin<Media>(`/media/${id ?? ""}`),
    retry: false,
  });
  if (!id) return null;
  if (query.data) return imageValueOf(query.data);
  return { id, url: "", alt: null };
}
