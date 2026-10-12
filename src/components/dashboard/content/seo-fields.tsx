"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { useSessionUser } from "@/components/dashboard/session-context";
import { ImageField, type ImageValue } from "@/components/dashboard/media/image-field";
import { Alert } from "@/components/ui/alert";
import type { SeoEntityType, SeoMeta, SeoResult, SiteSettings } from "@/lib/api/schemas";
import { admin, ApiError } from "@/lib/client/api";
import {
  DESCRIPTION_LIMITS,
  fullTitle,
  LENGTH_MESSAGES,
  lengthState,
  QUICK_ANSWER_LIMITS,
  TITLE_LIMITS,
  truncate,
  type LengthState,
} from "@/lib/seo/counters";
import { cleanDeep } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";
import { websiteUrl } from "@/lib/website";

import { CheckField, TextField } from "./text-field";

/** What SeoFields edits. Empty strings mean "not set" (the website uses its defaults). */
export interface SeoValues {
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  noindex: boolean;
  og_image: ImageValue | null;
  focus_keyword: string;
  /** JSON text; only owners and admins see and change it. */
  schema_overrides: string;
}

export const EMPTY_SEO: SeoValues = {
  meta_title: "",
  meta_description: "",
  canonical_url: "",
  noindex: false,
  og_image: null,
  focus_keyword: "",
  schema_overrides: "",
};

export function seoValuesOf(meta: SeoMeta | null | undefined): SeoValues {
  if (!meta) return EMPTY_SEO;
  return {
    meta_title: meta.meta_title ?? "",
    meta_description: meta.meta_description ?? "",
    canonical_url: meta.canonical_url ?? "",
    noindex: meta.noindex,
    og_image:
      meta.og_image_id && meta.og_image
        ? { id: meta.og_image_id, url: meta.og_image.thumb, alt: null }
        : null,
    focus_keyword: meta.focus_keyword ?? "",
    schema_overrides: meta.schema_overrides ? JSON.stringify(meta.schema_overrides, null, 2) : "",
  };
}

/** Schema overrides must be a JSON object; returns the parsed value or an error. */
export function parseSchemaOverrides(text: string): {
  value: Record<string, unknown> | null;
  error: string | null;
} {
  if (!text.trim()) return { value: null, error: null };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {
        value: null,
        error: 'Schema overrides must be a JSON object, like {"@type": "Service"}',
      };
    return { value: parsed as Record<string, unknown>, error: null };
  } catch {
    return { value: null, error: "This is not valid JSON. Check the commas, quotes and brackets." };
  }
}

/** The body for PATCH /admin/seo/{id} or PUT /admin/seo. */
export function seoPayload(values: SeoValues, includeSchema: boolean) {
  const body: Record<string, unknown> = cleanDeep({
    meta_title: values.meta_title.trim() || null,
    meta_description: values.meta_description.trim() || null,
    focus_keyword: values.focus_keyword.trim() || null,
  });
  body.canonical_url = values.canonical_url.trim() || null;
  body.noindex = values.noindex;
  body.og_image_id = values.og_image?.id ?? null;
  if (includeSchema) body.schema_overrides = parseSchemaOverrides(values.schema_overrides).value;
  return body;
}

/** The SEO meta of an entity (created with defaults by the backend when content is created). */
export function useSeoMeta(entityType: SeoEntityType, entityId: string | null | undefined) {
  return useQuery({
    queryKey: ["seo", entityType, entityId],
    enabled: Boolean(entityId),
    queryFn: async () => {
      try {
        return await admin<SeoResult>("/seo/lookup", {
          query: { entity_type: entityType, entity_id: entityId ?? undefined },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

/** Save SEO values for a path; returns the backend's warnings. */
export async function saveSeo(
  meta: SeoMeta | null | undefined,
  values: SeoValues,
  includeSchema: boolean,
  target: { path: string; entity_type: SeoEntityType; entity_id: string | null },
): Promise<SeoResult> {
  const body = seoPayload(values, includeSchema);
  if (meta) return admin<SeoResult>(`/seo/${meta.id}`, { method: "PATCH", json: body });
  return admin<SeoResult>("/seo", { method: "PUT", json: { ...body, ...target } });
}

/** The site's title suffix for the preview (owners and admins can read settings). */
function useTitleSuffix(): string {
  const user = useSessionUser();
  const settings = useQuery({
    queryKey: ["settings"],
    enabled: user.role === "owner" || user.role === "admin",
    queryFn: () => admin<SiteSettings>("/settings"),
    staleTime: 300_000,
  });
  return settings.data?.seo?.title_suffix ?? "Premium Property Checks";
}

const STATE_CLASS: Record<LengthState, string> = {
  empty: "text-text-muted",
  short: "text-warning-text",
  good: "text-success-text",
  long: "text-error-text",
};

function Counter({
  id,
  text,
  limits,
}: {
  id: string;
  text: string;
  limits: { min: number; max: number };
}) {
  const state = lengthState(text, limits);
  return (
    <p id={id} className={cn("mt-1 font-body text-caption", STATE_CLASS[state])} data-state={state}>
      {text.trim().length} characters. {LENGTH_MESSAGES[state]} (aim for {limits.min} to{" "}
      {limits.max}).
    </p>
  );
}

/**
 * Meta title and description with live counters, a Google style preview, canonical address,
 * noindex, sharing (OG) image, focus keyword and the quick answer (the short summary search
 * and answer engines quote). Schema overrides are for owners and admins only.
 */
export function SeoFields({
  idPrefix,
  values,
  onChange,
  path,
  fallbackTitle,
  fallbackDescription,
  warnings = [],
  quickAnswer,
  disabled,
}: {
  idPrefix: string;
  values: SeoValues;
  onChange: (values: SeoValues) => void;
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  warnings?: string[];
  quickAnswer?: { value: string; onChange: (value: string) => void };
  disabled?: boolean;
}) {
  const user = useSessionUser();
  const suffix = useTitleSuffix();
  const canSchema = user.role === "owner" || user.role === "admin";
  const set = <K extends keyof SeoValues>(key: K, value: SeoValues[K]) =>
    onChange({ ...values, [key]: value });
  const schema = parseSchemaOverrides(values.schema_overrides);
  const title = fullTitle(values.meta_title || fallbackTitle, suffix);
  const description = values.meta_description.trim()
    ? values.meta_description
    : (fallbackDescription ?? "");

  return (
    <div className="space-y-6" data-testid="seo-fields">
      {warnings.length ? (
        <Alert variant="warning" title="Search advice" data-testid="seo-warnings">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div>
        <TextField
          id={`${idPrefix}-meta-title`}
          label="Meta title"
          hint={`Shown as the link in search results. "| ${suffix}" is added after it.`}
          value={values.meta_title}
          onChange={(v) => set("meta_title", v)}
          maxLength={TITLE_LIMITS.hardMax}
          placeholder={fallbackTitle}
          disabled={disabled}
          testId="seo-meta-title"
        />
        <Counter id={`${idPrefix}-title-count`} text={values.meta_title} limits={TITLE_LIMITS} />
      </div>
      <div>
        <TextField
          id={`${idPrefix}-meta-description`}
          label="Meta description"
          hint="The summary under the link in search results."
          value={values.meta_description}
          onChange={(v) => set("meta_description", v)}
          multiline
          rows={3}
          maxLength={DESCRIPTION_LIMITS.hardMax}
          placeholder={fallbackDescription}
          disabled={disabled}
          testId="seo-meta-description"
        />
        <Counter
          id={`${idPrefix}-description-count`}
          text={values.meta_description}
          limits={DESCRIPTION_LIMITS}
        />
      </div>

      <section
        aria-label="Search result preview"
        className="rounded-md border-thin border-border bg-background p-4"
        data-testid="seo-preview"
      >
        <p className="font-body text-caption text-text-muted">Search result preview</p>
        <p className="mt-2 truncate font-body text-caption text-text">{websiteUrl(path)}</p>
        <p className="font-body text-lead text-info-text">{truncate(title, 65)}</p>
        <p className="font-body text-small text-text-muted">
          {description
            ? truncate(description, 160)
            : "Search engines will pick text from the page."}
        </p>
      </section>

      {quickAnswer ? (
        <div>
          <TextField
            id={`${idPrefix}-quick-answer`}
            label="Quick answer"
            hint="Two or three sentences that answer the main question directly. Answer engines and Google quote it."
            value={quickAnswer.value}
            onChange={quickAnswer.onChange}
            multiline
            rows={3}
            maxLength={QUICK_ANSWER_LIMITS.hardMax}
            disabled={disabled}
          />
          <Counter
            id={`${idPrefix}-quick-count`}
            text={quickAnswer.value}
            limits={QUICK_ANSWER_LIMITS}
          />
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          id={`${idPrefix}-focus`}
          label="Focus keyword"
          hint="The phrase people search for. Used for advice only."
          value={values.focus_keyword}
          onChange={(v) => set("focus_keyword", v)}
          maxLength={200}
          disabled={disabled}
        />
        <TextField
          id={`${idPrefix}-canonical`}
          label="Canonical address"
          hint="Only when another page is the main version. Leave empty normally."
          value={values.canonical_url}
          onChange={(v) => set("canonical_url", v)}
          type="url"
          raw
          maxLength={1000}
          disabled={disabled}
        />
      </div>

      <CheckField
        id={`${idPrefix}-noindex`}
        label="Hide from search engines (noindex)"
        hint="The page stays on the website but search engines are asked not to list it."
        checked={values.noindex}
        onChange={(v) => set("noindex", v)}
        disabled={disabled}
      />

      <ImageField
        id={`${idPrefix}-og`}
        label="Sharing image"
        hint="Shown when the page is shared on social media or in messages (1200 by 630 works best)."
        value={values.og_image}
        onChange={(v) => set("og_image", v)}
        folder="seo"
        disabled={disabled}
        testId="seo-og-image"
      />

      {canSchema ? (
        <div>
          <TextField
            id={`${idPrefix}-schema`}
            label="Structured data overrides (JSON)"
            hint="Owners and admins only. Merged into the page's structured data. Leave empty unless you know you need it."
            value={values.schema_overrides}
            onChange={(v) => set("schema_overrides", v)}
            multiline
            rows={6}
            raw
            error={schema.error}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
