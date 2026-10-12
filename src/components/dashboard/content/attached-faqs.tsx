"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2Off, Plus } from "lucide-react";
import { toast } from "sonner";

import { SelectField, TextField } from "@/components/dashboard/content/text-field";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Faq, FaqGroup } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cleanText } from "@/lib/text/clean";

export type FaqTarget = "service_id" | "area_id" | "blog_post_id" | "page_id";

const NO_TARGET = { service_id: null, area_id: null, blog_post_id: null, page_id: null };

/**
 * FAQs shown on one service, area, post or page: attach an existing (global) FAQ, write a new
 * one, detach (it becomes global again) and reorder. Uses the FAQs page permission.
 */
export function AttachedFaqs({
  target,
  id,
  canEdit,
  defaultGroup = "general",
}: {
  target: FaqTarget;
  id: string;
  canEdit: boolean;
  defaultGroup?: FaqGroup;
}) {
  const queryClient = useQueryClient();
  const attached = useQuery({
    queryKey: ["faqs", target, id],
    queryFn: () => admin<Faq[]>("/faqs", { query: { [target]: id } }),
  });
  const global = useQuery({
    queryKey: ["faqs", "global"],
    queryFn: () => admin<Faq[]>("/faqs", { query: { scope: "global" } }),
    enabled: canEdit,
  });
  const [pick, setPick] = React.useState("");
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["faqs"] });
  const act = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      await refresh();
      return true;
    } catch (error) {
      toast.error(actionErrorMessage(error));
      return false;
    }
  };

  const items = attached.data ?? [];

  return (
    <div className="space-y-5" data-testid="attached-faqs">
      {attached.isError ? <Alert variant="error">{errorMessage(attached.error)}</Alert> : null}
      {attached.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="font-body text-small text-text-muted">No FAQs here yet.</p>
      ) : (
        <SortableList
          items={items}
          getId={(f) => f.id}
          getLabel={(f) => f.question}
          disabled={!canEdit}
          label="FAQs on this page"
          onReorder={(next) =>
            void act(() => admin("/faqs/reorder", { json: reorderPayload(next, (f) => f.id) }), "Order saved.")
          }
          renderItem={(f, handle) => (
            <div className="flex items-start gap-3 rounded-md border-thin border-border bg-background px-3 py-2 font-body text-small">
              {handle}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{f.question}</p>
                <p className="line-clamp-2 text-caption text-text-muted">{f.answer}</p>
              </div>
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label={`Detach "${f.question}"`}
                  onClick={() =>
                    void act(
                      () => admin(`/faqs/${f.id}`, { method: "PATCH", json: NO_TARGET }),
                      "Detached. It is now a general FAQ.",
                    )
                  }
                >
                  <Link2Off className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          )}
        />
      )}

      {canEdit ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-md border-thin border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pick) return;
              void act(
                () => admin(`/faqs/${pick}`, { method: "PATCH", json: { ...NO_TARGET, [target]: id } }),
                "FAQ attached.",
              ).then((ok) => ok && setPick(""));
            }}
          >
            <h3 className="font-heading text-h5 font-bold text-primary">Attach an existing FAQ</h3>
            <SelectField
              id={`${target}-attach`}
              label="General FAQ"
              value={pick}
              onChange={setPick}
              placeholder={global.isPending ? "Loading..." : "Choose a question"}
              options={(global.data ?? []).map((f) => ({ value: f.id, label: f.question }))}
            />
            <Button type="submit" variant="outline" size="sm" disabled={!pick}>
              Attach
            </Button>
          </form>
          <form
            className="space-y-3 rounded-md border-thin border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim() || !answer.trim()) return;
              void act(
                () =>
                  admin("/faqs", {
                    json: {
                      question: cleanText(question.trim()),
                      answer: cleanText(answer.trim()),
                      group: defaultGroup,
                      [target]: id,
                    },
                  }),
                "FAQ added.",
              ).then((ok) => {
                if (ok) {
                  setQuestion("");
                  setAnswer("");
                }
              });
            }}
          >
            <h3 className="font-heading text-h5 font-bold text-primary">Write a new FAQ</h3>
            <TextField id={`${target}-new-q`} label="Question" value={question} onChange={setQuestion} maxLength={500} />
            <TextField id={`${target}-new-a`} label="Answer" value={answer} onChange={setAnswer} multiline rows={3} />
            <Button type="submit" variant="outline" size="sm" disabled={!question.trim() || !answer.trim()}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add FAQ
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
