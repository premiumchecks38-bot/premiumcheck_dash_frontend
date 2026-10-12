"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { AttachedFaqs } from "@/components/dashboard/content/attached-faqs";
import { PublishBar, type AutosaveState, type PublishStatus } from "@/components/dashboard/content/publish-bar";
import { SeoFields, seoPayload, seoValuesOf, useSeoMeta, type SeoValues } from "@/components/dashboard/content/seo-fields";
import { SlugField } from "@/components/dashboard/content/slug-field";
import { CheckField, SelectField, TextField } from "@/components/dashboard/content/text-field";
import { RichTextEditor } from "@/components/dashboard/editor";
import { ImageField, type ImageValue } from "@/components/dashboard/media/image-field";
import { usePermission, useSessionUser } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useSave } from "@/components/dashboard/use-save";
import { useUnsavedChanges } from "@/components/dashboard/use-unsaved-changes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlogPost } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { isDirty } from "@/lib/forms/unsaved";
import { cleanDeep } from "@/lib/text/clean";
import { websiteUrl } from "@/lib/website";

import { useBlogCategories } from "./blog-view";

export function BlogEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("blogs");
  const user = useSessionUser();
  const isNew = !postId;

  const postQuery = useQuery({
    queryKey: ["blog-post", postId],
    queryFn: () => admin<BlogPost>(`/blog-posts/${postId}`),
    enabled: Boolean(postId),
  });

  const categoriesQuery = useBlogCategories();
  const seoMeta = useSeoMeta("blog_post", postId);

  // Form states
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [excerpt, setExcerpt] = React.useState("");
  const [authorName, setAuthorName] = React.useState("Premium Property Checks Team");
  const [isComplianceHub, setIsComplianceHub] = React.useState(false);
  const [featuredImage, setFeaturedImage] = React.useState<ImageValue | null>(null);
  const [content, setContent] = React.useState<unknown>(null);
  const [seoValues, setSeoValues] = React.useState<SeoValues>(seoValuesOf(null));

  // Autosave state
  const [autosaveState, setAutosaveState] = React.useState<AutosaveState>("idle");
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);

  const save = useSave();

  React.useEffect(() => {
    if (postQuery.data) {
      const p = postQuery.data;
      setTitle(p.title);
      setSlug(p.slug);
      setCategoryId(p.category?.id ?? "");
      setExcerpt(p.excerpt ?? "");
      setAuthorName(p.author_name ?? "Premium Property Checks Team");
      setIsComplianceHub(p.is_compliance_hub);
      setContent(p.content);
      if (p.featured_image) {
        setFeaturedImage({
          id: p.featured_image_id ?? "",
          url: p.featured_image.urls.thumb,
          alt: p.featured_image.alt_text,
        });
      }
      setLastSaved(p.updated_at);
    }
  }, [postQuery.data]);

  React.useEffect(() => {
    if (seoMeta.data) {
      setSeoValues(seoValuesOf(seoMeta.data.meta));
    }
  }, [seoMeta.data]);

  // Autosave debounce for drafting existing posts
  React.useEffect(() => {
    if (isNew || !postId || postQuery.isPending) return;

    const timer = setTimeout(async () => {
      if (!title.trim()) return;
      try {
        setAutosaveState("saving");
        await admin(`/blog-posts/${postId}/autosave`, {
          method: "PATCH",
          json: {
            title: title.trim(),
            excerpt: excerpt.trim() || null,
            content: content && typeof content === "object" ? content : null,
          },
        });
        setAutosaveState("saved");
        setLastSaved(new Date().toISOString());
      } catch {
        setAutosaveState("error");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [title, excerpt, content, postId, isNew, postQuery.isPending]);

  const prefix = isComplianceHub ? "/compliance-hub/" : "/blog/";

  if (!isNew && postQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const post = postQuery.data;
  const status: PublishStatus = post ? (post.status as PublishStatus) : "draft";

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      save.setFieldErrors({ title: "Enter a title" });
      return;
    }

    const payload = {
      ...cleanDeep({
        title: title.trim(),
        slug: slug.trim() || null,
        category_id: categoryId || null,
        excerpt: excerpt.trim() || null,
        author_name: authorName.trim() || null,
      }),
      content: content && typeof content === "object" ? content : null,
      featured_image_id: featuredImage?.id ?? null,
      is_compliance_hub: isComplianceHub,
    };

    const res = await save.run(async () => {
      let saved: BlogPost;
      if (isNew) {
        saved = await admin<BlogPost>("/blog-posts", {
          method: "POST",
          json: payload,
        });
      } else {
        saved = await admin<BlogPost>(`/blog-posts/${postId}`, {
          method: "PATCH",
          json: payload,
        });
      }

      // Save SEO
      const seoBody = seoPayload(seoValues, user.role === "owner" || user.role === "admin");
      if (seoMeta.data?.meta?.id) {
        await admin(`/seo/${seoMeta.data.meta.id}`, { method: "PATCH", json: seoBody });
      } else if (seoValues.meta_title || seoValues.meta_description) {
        await admin("/seo", {
          method: "PUT",
          json: {
            ...seoBody,
            path: `${prefix}${saved.slug}`,
            entity_type: "blog_post",
            entity_id: saved.id,
          },
        });
      }

      return saved;
    }, isNew ? "Article created." : "Draft saved.");

    if (res) {
      await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      if (isNew) {
        router.push(`/blog/${res.id}` as Route);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["blog-post", postId] });
      }
    }
  };

  const handlePublish = async () => {
    if (isNew) {
      await handleSaveDraft();
      return;
    }

    await save.run(async () => {
      await admin(`/blog-posts/${postId}/publish`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["blog-post", postId] });
    }, "Post published to the live website.");
  };

  const handleUnpublish = async () => {
    if (!postId) return;
    await save.run(async () => {
      await admin(`/blog-posts/${postId}/unpublish`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["blog-post", postId] });
    }, "Post unpublished (reverted to draft).");
  };

  const handleSchedule = async (iso: string) => {
    if (!postId) return;
    await save.run(async () => {
      await admin(`/blog-posts/${postId}/schedule`, {
        method: "POST",
        json: { published_at: iso },
      });
      await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["blog-post", postId] });
    }, "Publishing scheduled.");
  };

  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const toc = (post?.toc as { id?: string; text?: string; level?: number }[] | undefined) ?? [];

  return (
    <div className="space-y-6 pb-20" data-testid="blog-editor">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={"/blog" as Route}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Articles
            </Link>
          </Button>
          <h1 className="font-heading text-h3 font-bold text-primary">
            {isNew ? "New article" : post?.title}
          </h1>
        </div>

        {post?.slug ? (
          <Button asChild variant="ghost" size="sm">
            <a
              href={websiteUrl(`${prefix}${post.slug}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> View on website
            </a>
          </Button>
        ) : null}
      </div>

      {save.error ? <Alert variant="error">{save.error}</Alert> : null}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Main Editor Column */}
        <div className="lg:col-span-8 space-y-6">
          <TextField
            id="post-title"
            label="Article title"
            required
            value={title}
            onChange={setTitle}
            maxLength={300}
            disabled={!canEdit}
            testId="post-title"
          />

          <SlugField
            id="post-slug"
            value={slug}
            onChange={setSlug}
            title={title}
            prefix={prefix}
            savedSlug={post?.slug ?? null}
            disabled={!canEdit}
          />

          <TextField
            id="post-excerpt"
            label="Excerpt / Summary"
            multiline
            rows={2}
            value={excerpt}
            onChange={setExcerpt}
            maxLength={500}
            disabled={!canEdit}
          />

          <div className="space-y-2">
            <label className="font-body text-small font-semibold">Article Content</label>
            <RichTextEditor
              id="post-content"
              label="Article content"
              output="json"
              value={content as any}
              onChange={setContent}
              folder="blogs"
              readOnly={!canEdit}
            />
          </div>

          <Tabs defaultValue="faqs">
            <TabsList>
              <TabsTrigger value="faqs">Attached FAQs</TabsTrigger>
              <TabsTrigger value="seo">SEO & Social</TabsTrigger>
            </TabsList>
            <TabsContent value="faqs" className="pt-4">
              {post ? (
                <AttachedFaqs target="blog_post_id" id={post.id} canEdit={canEdit} defaultGroup="general" />
              ) : (
                <p className="text-small text-text-muted">Save the article first to attach FAQs.</p>
              )}
            </TabsContent>
            <TabsContent value="seo" className="pt-4">
              <SeoFields
                idPrefix="blog-seo"
                values={seoValues}
                onChange={setSeoValues}
                path={`${prefix}${slug || "new"}`}
                fallbackTitle={title || "Article"}
                fallbackDescription={excerpt}
                disabled={!canEdit}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Metadata & Settings Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-lg border-thin border-border bg-background p-4 shadow-sm space-y-4">
            <h2 className="font-heading text-h5 font-bold text-primary">Publishing settings</h2>

            <CheckField
              id="compliance-toggle"
              label="Compliance hub guide"
              hint="Changes URL from /blog/ to /compliance-hub/"
              checked={isComplianceHub}
              onChange={setIsComplianceHub}
              disabled={!canEdit}
            />

            <SelectField
              id="post-category"
              label="Category"
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Uncategorised"
              disabled={!canEdit}
            />

            <TextField
              id="post-author"
              label="Author name"
              value={authorName}
              onChange={setAuthorName}
              disabled={!canEdit}
            />

            <ImageField
              id="post-image"
              label="Featured image"
              folder="blogs"
              value={featuredImage}
              onChange={setFeaturedImage}
              disabled={!canEdit}
              testId="post-featured-image"
            />
          </div>

          {/* Table of contents preview */}
          {toc.length > 0 ? (
            <div className="rounded-lg border-thin border-border bg-background p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-small">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                <span>Table of contents preview</span>
              </div>
              <ul className="space-y-1 text-caption text-text-muted">
                {toc.map((item, idx) => (
                  <li key={idx} className={item.level === 3 ? "pl-4" : ""}>
                    • {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating Bottom Publish Bar */}
      <PublishBar
        status={status}
        publishedAt={post?.published_at}
        lastSaved={lastSaved}
        autosave={autosaveState}
        dirty={false}
        busy={save.busy}
        canEdit={canEdit}
        previewUrl={post?.slug ? websiteUrl(`${prefix}${post.slug}`) : null}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
