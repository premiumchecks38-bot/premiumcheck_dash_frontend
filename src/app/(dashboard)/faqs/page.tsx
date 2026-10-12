"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { CheckField, SelectField, TextField } from "@/components/dashboard/content/text-field";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useSave } from "@/components/dashboard/use-save";
import { useUrlFilters } from "@/components/dashboard/use-url-filters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Faq, FaqGroup } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cleanDeep } from "@/lib/text/clean";

const KEYS = ["q", "group", "scope"] as const;

const FAQ_GROUPS: { value: FaqGroup; label: string }[] = [
  { value: "booking_payments", label: "Booking and payments" },
  { value: "certificates_compliance", label: "Certificates and compliance" },
  { value: "services", label: "Services" },
  { value: "areas", label: "Areas" },
  { value: "general", label: "General" },
];

export default function FaqsPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("faqs");
  const [filters, setFilters] = useUrlFilters(KEYS);

  const query = {
    search: filters.q || undefined,
    scope: filters.scope === "global" ? "global" : undefined,
  };

  const faqsQuery = useQuery({
    queryKey: ["faqs-list", query],
    queryFn: () => admin<Faq[]>("/faqs", { query }),
  });

  const [editingFaq, setEditingFaq] = React.useState<Faq | "new" | null>(null);
  const [deletingFaq, setDeletingFaq] = React.useState<Faq | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["faqs-list"] });

  let items = faqsQuery.data ?? [];
  if (filters.group) {
    items = items.filter((f) => f.group === filters.group);
  }

  const reorder = async (nextItems: Faq[]) => {
    queryClient.setQueryData(["faqs-list", query], nextItems);
    try {
      await admin("/faqs/reorder", {
        method: "POST",
        json: reorderPayload(nextItems, (f) => f.id),
      });
      toast.success("FAQ order saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Frequently asked questions"
        description="Global questions appearing on FAQs page, plus attached questions across services and areas."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Content" },
          { label: "FAQs" },
        ]}
        actions={
          canEdit ? (
            <Button size="sm" variant="accent" onClick={() => setEditingFaq("new")} data-testid="new-faq-btn">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add FAQ
            </Button>
          ) : null
        }
      />

      <div className="space-y-6" data-testid="faqs-view">
        <FilterBar
          search={{ value: filters.q, label: "Search", placeholder: "Search question or answer" }}
          selects={[
            { key: "group", label: "Category", value: filters.group, options: FAQ_GROUPS },
            {
              key: "scope",
              label: "Scope",
              value: filters.scope,
              options: [
                { value: "global", label: "Global FAQs only" },
                { value: "attached", label: "All attached" },
              ],
            },
          ]}
          onChange={(k, v) => setFilters({ [k]: v })}
          onReset={() => setFilters(Object.fromEntries(KEYS.map((k) => [k, null])))}
        />

        {faqsQuery.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <div className="rounded-lg border-thin border-border bg-background p-8 text-center text-text-muted">
            <p className="font-semibold text-text">No FAQs found</p>
            <p className="text-small">Adjust filters or create a new question.</p>
          </div>
        ) : (
          <SortableList
            items={items}
            getId={(f) => f.id}
            getLabel={(f) => f.question}
            onReorder={reorder}
            disabled={!canEdit}
            label="FAQs list"
            testId="faqs-sortable-list"
            renderItem={(faq, handle) => (
              <div className="flex items-start justify-between rounded-md border-thin border-border bg-background p-3.5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {handle}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-small text-text">{faq.question}</span>
                      <span className="rounded bg-surface-alt px-1.5 py-0.5 text-micro font-medium text-text-muted">
                        {FAQ_GROUPS.find((g) => g.value === faq.group)?.label ?? faq.group}
                      </span>
                      {faq.scope === "global" ? (
                        <span className="rounded bg-accent-subtle/40 px-1.5 py-0.5 text-micro text-accent-subtle-foreground">
                          Global
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-micro text-text-muted">
                          <Link2 className="h-3 w-3" aria-hidden="true" /> Attached
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-caption text-text-muted leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-3">
                  <StatusBadge
                    kind="content"
                    status={faq.is_active ? "active" : "inactive"}
                    label={faq.is_active ? "Active" : "Hidden"}
                  />
                  {canEdit ? (
                    <>
                      <Button variant="ghost" size="xs" onClick={() => setEditingFaq(faq)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setDeletingFaq(faq)}>
                        <Trash2 className="h-4 w-4 text-error-text" aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          />
        )}

        {editingFaq ? (
          <FaqEditDialog
            faq={editingFaq === "new" ? null : editingFaq}
            onClose={() => setEditingFaq(null)}
            onSaved={() => {
              setEditingFaq(null);
              void refresh();
            }}
          />
        ) : null}

        <ConfirmDialog
          open={deletingFaq !== null}
          onOpenChange={(open) => !open && setDeletingFaq(null)}
          title="Delete question?"
          description={`"${deletingFaq?.question}" will be deleted.`}
          confirmLabel="Delete FAQ"
          destructive
          onConfirm={async () => {
            if (deletingFaq) {
              try {
                await admin(`/faqs/${deletingFaq.id}`, { method: "DELETE" });
                toast.success("FAQ deleted.");
                await refresh();
              } catch (err) {
                toast.error(actionErrorMessage(err));
              }
            }
            setDeletingFaq(null);
          }}
        />
      </div>
    </>
  );
}

function FaqEditDialog({
  faq,
  onClose,
  onSaved,
}: {
  faq: Faq | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSave();
  const [question, setQuestion] = React.useState(faq?.question ?? "");
  const [answer, setAnswer] = React.useState(faq?.answer ?? "");
  const [group, setGroup] = React.useState<FaqGroup>(faq?.group ?? "general");
  const [isActive, setIsActive] = React.useState(faq?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    const payload = {
      ...cleanDeep({
        question: question.trim(),
        answer: answer.trim(),
      }),
      group,
      is_active: isActive,
    };

    await save.run(async () => {
      if (faq) {
        await admin(`/faqs/${faq.id}`, { method: "PATCH", json: payload });
        toast.success("FAQ updated.");
      } else {
        await admin("/faqs", { method: "POST", json: payload });
        toast.success("FAQ created.");
      }
      onSaved();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-dvh max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{faq ? "Edit FAQ" : "Add new FAQ"}</DialogTitle>
          <DialogDescription>
            Questions and clear answers for customer compliance and booking reassurance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            id="faq-q"
            label="Question"
            required
            value={question}
            onChange={setQuestion}
            maxLength={500}
          />
          <TextField
            id="faq-a"
            label="Answer"
            required
            multiline
            rows={5}
            value={answer}
            onChange={setAnswer}
          />
          <SelectField
            id="faq-group"
            label="Category group"
            value={group}
            onChange={(v) => setGroup(v as FaqGroup)}
            options={FAQ_GROUPS}
          />
          <CheckField
            id="faq-active"
            label="Active (visible on website)"
            checked={isActive}
            onChange={setIsActive}
          />

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" loading={save.busy}>
              {faq ? "Save FAQ" : "Create FAQ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
