"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { CheckField, TextField } from "@/components/dashboard/content/text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlogPostSummary, PageSummary, ServiceSummary } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";

export interface LinkValue {
  href: string;
  newTab: boolean;
}

export interface InternalLink {
  href: string;
  label: string;
  group: string;
}

/** Pages, services and posts the person can link to (lists they cannot open are skipped). */
export function useInternalLinks(enabled: boolean) {
  return useQuery({
    queryKey: ["internal-links"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<InternalLink[]> => {
      const [pages, services, posts] = await Promise.all([
        admin<PageSummary[]>("/pages").catch(() => []),
        adminPage<ServiceSummary[]>("/services", { query: { page_size: 100, is_active: true } })
          .then((r) => r.data)
          .catch(() => []),
        adminPage<BlogPostSummary[]>("/blog-posts", {
          query: { page_size: 100, status: "published" },
        })
          .then((r) => r.data)
          .catch(() => []),
      ]);
      return [
        ...pages
          .filter((p) => p.is_published)
          .map((p) => ({ href: p.slug === "home" ? "/" : p.path, label: p.title, group: "Pages" })),
        ...services.map((s) => ({ href: `/services/${s.slug}`, label: s.name, group: "Services" })),
        ...posts.map((p) => ({ href: p.path, label: p.title, group: "Blog and guides" })),
      ];
    },
  });
}

/**
 * Add or change a link: a page of this website (picked from a list, so it cannot be mistyped)
 * or a web address. The backend adds rel="noopener noreferrer" to external links.
 */
export function LinkDialog({
  open,
  onOpenChange,
  initial,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: LinkValue | null;
  onApply: (link: LinkValue | null) => void;
}) {
  const links = useInternalLinks(open);
  const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href);
  const [tab, setTab] = React.useState<"internal" | "external">("internal");
  const [internal, setInternal] = React.useState("");
  const [external, setExternal] = React.useState("");
  const [newTab, setNewTab] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wasOpen, setWasOpen] = React.useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const href = initial?.href ?? "";
      setTab(href && isExternal(href) ? "external" : "internal");
      setInternal(href && !isExternal(href) ? href : "");
      setExternal(href && isExternal(href) ? href : "");
      setNewTab(initial?.newTab ?? false);
      setError(null);
    }
  }

  const apply = () => {
    if (tab === "internal") {
      if (!internal) {
        setError("Choose a page");
        return;
      }
      onApply({ href: internal, newTab: false });
    } else {
      const href = external.trim();
      if (!/^(https:\/\/|http:\/\/|mailto:|tel:)/.test(href)) {
        setError("Enter a full address starting with https://, or mailto: or tel:");
        return;
      }
      onApply({ href, newTab });
    }
    onOpenChange(false);
  };

  const groups = [...new Set((links.data ?? []).map((l) => l.group))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Change link" : "Add a link"}</DialogTitle>
          <DialogDescription>Link the selected text to a page or a web address.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "internal" | "external")}>
          <TabsList className="mb-4">
            <TabsTrigger value="internal">Page on this website</TabsTrigger>
            <TabsTrigger value="external">Web address</TabsTrigger>
          </TabsList>
          <TabsContent value="internal">
            <label htmlFor="link-internal" className="font-body text-small font-semibold">
              Page
            </label>
            <select
              id="link-internal"
              className="mt-1.5 h-11 w-full rounded-md border-thin border-border bg-background px-3 font-body text-small text-text focus-visible:outline-focus focus-visible:outline-focus-ring"
              value={internal}
              onChange={(e) => setInternal(e.target.value)}
              data-testid="link-internal"
            >
              <option value="">{links.isPending ? "Loading pages..." : "Choose a page"}</option>
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {(links.data ?? [])
                    .filter((l) => l.group === group)
                    .map((l) => (
                      <option key={`${group}-${l.href}`} value={l.href}>
                        {l.label} ({l.href})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </TabsContent>
          <TabsContent value="external" className="space-y-4">
            <TextField
              id="link-external"
              label="Web address"
              type="url"
              value={external}
              onChange={setExternal}
              placeholder="https://www.gov.uk/..."
              raw
            />
            <CheckField
              id="link-new-tab"
              label="Open in a new tab"
              checked={newTab}
              onChange={setNewTab}
            />
          </TabsContent>
        </Tabs>
        {error ? (
          <p role="alert" className="font-body text-small text-error-text">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          {initial ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onApply(null);
                onOpenChange(false);
              }}
            >
              Remove link
            </Button>
          ) : null}
          <Button variant="accent" size="sm" onClick={apply} data-testid="link-apply">
            {initial ? "Update link" : "Add link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
