"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building,
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { LeadsTabs } from "@/components/dashboard/leads/leads-tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookingDraft, QuoteRequest, QuoteRequestStatus } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatTime } from "@/lib/utils/format";

type StatusFilter = "all" | QuoteRequestStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All requests" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export default function QuoteRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("leads");

  const [search, setSearch] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<StatusFilter>("all");
  const [selectedQuote, setSelectedQuote] = React.useState<QuoteRequest | null>(null);
  const [convertingId, setConvertingId] = React.useState<string | null>(null);

  const quotesQuery = useQuery({
    queryKey: ["admin", "leads", "quotes", filterTab, search],
    queryFn: () =>
      adminPage<QuoteRequest[]>("/leads/quotes", {
        query: {
          search: search.trim() || undefined,
          status: filterTab === "all" ? undefined : filterTab,
          page_size: 100,
        },
      }),
  });

  const quotes = quotesQuery.data?.data ?? [];

  async function handleStatusChange(quoteId: string, newStatus: QuoteRequestStatus) {
    try {
      const updated = await admin<QuoteRequest>(`/leads/quotes/${quoteId}`, {
        method: "PATCH",
        json: { status: newStatus },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote(updated);
      }
      toast.success(`Quote status updated to ${newStatus}`);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleConvertToBooking(quote: QuoteRequest) {
    setConvertingId(quote.id);
    try {
      const draft = await admin<BookingDraft>(`/leads/quotes/${quote.id}/convert`, {
        method: "POST",
      });

      const searchParams = new URLSearchParams();
      const customer = draft.customer as Record<string, string | undefined>;
      if (customer?.full_name) searchParams.set("name", customer.full_name);
      if (customer?.email) searchParams.set("email", customer.email);
      if (customer?.phone) searchParams.set("phone", customer.phone);
      if (draft.postcode) searchParams.set("postcode", draft.postcode);
      if (draft.internal_notes) searchParams.set("notes", draft.internal_notes);

      if (Array.isArray(draft.items) && draft.items.length > 0) {
        const itemsParam = draft.items
          .map((item: any) => `${item.price_option_id}:${item.quantity || 1}`)
          .join(",");
        searchParams.set("items", itemsParam);
      }

      if (draft.unmatched_services && draft.unmatched_services.length > 0) {
        toast.info(
          `Please manually configure prices for: ${draft.unmatched_services.join(", ")}`,
        );
      } else {
        toast.success("Draft created! Redirecting to booking form...");
      }

      router.push(`/bookings/new?${searchParams.toString()}`);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Quote requests"
        description="Website quote requests from landlords, businesses, and homeowners."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/leads/quotes/export.csv" download>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
        }
      />

      <LeadsTabs />

      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search name, email, company or postcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterTab(filter.id)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors whitespace-nowrap",
                  filterTab === filter.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-surface-alt text-text-muted hover:text-text",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quotes List */}
        {quotesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : quotesQuery.isError ? (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage(quotesQuery.error)}</span>
          </Alert>
        ) : quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface">
            <FileText className="mx-auto h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm font-medium text-text">No quote requests found</p>
            <p className="text-xs text-text-muted mt-1">
              {search || filterTab !== "all"
                ? "Try adjusting your search terms or filter."
                : "New quote enquiries submitted on the website will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-surface-alt/40"
              >
                <div
                  className="flex-1 cursor-pointer space-y-1 min-w-0"
                  onClick={() => setSelectedQuote(quote)}
                >
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-semibold text-text">
                      {quote.full_name}
                    </span>
                    {quote.company_name && (
                      <span className="text-text-muted">
                        · {quote.company_name}
                      </span>
                    )}
                    {quote.customer_type && (
                      <span className="text-xs text-text-subtle font-mono">
                        ({quote.customer_type.replace(/_/g, " ").toLowerCase()})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                    <span className="font-mono">{quote.email}</span>
                    {quote.phone && <span>· {quote.phone}</span>}
                    {quote.postcode && <span className="font-medium text-text">· {quote.postcode}</span>}
                    {quote.property_count && quote.property_count > 1 ? (
                      <span>· {quote.property_count} properties</span>
                    ) : null}
                  </div>

                  {/* Services Requested - clean text */}
                  {quote.services_requested && quote.services_requested.length > 0 && (
                    <div className="text-xs text-text-subtle pt-0.5">
                      <span className="text-text-muted">Services: </span>
                      <span className="font-medium text-text">
                        {quote.services_requested.map((s) => s.replace(/_/g, " ")).join(", ")}
                      </span>
                    </div>
                  )}

                  {quote.message && (
                    <p className="line-clamp-1 text-xs text-text-muted italic pt-0.5">
                      &quot;{quote.message}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0 pt-2 sm:pt-0">
                  <div className="text-right text-text-muted font-mono text-caption">
                    <div>{formatDate(quote.created_at, "short")}</div>
                    <div className="opacity-70">{formatTime(quote.created_at)}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Status dropdown */}
                    {canEdit && (
                      <select
                        value={quote.status}
                        onChange={(e) =>
                          handleStatusChange(quote.id, e.target.value as QuoteRequestStatus)
                        }
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="quoted">Quoted</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    )}

                    {/* Convert to booking */}
                    <Button
                      variant="outline"
                      size="sm"
                      title="Convert to booking"
                      disabled={convertingId === quote.id}
                      onClick={() => handleConvertToBooking(quote)}
                      className="hidden sm:inline-flex h-8 text-xs font-medium"
                    >
                      <CalendarPlus className="mr-1.5 h-3.5 w-3.5 text-accent" />
                      Book
                    </Button>

                    {/* View full page */}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="View full quote details"
                      className="h-8 w-8 p-0 text-text-muted hover:text-text"
                    >
                      <Link href={`/leads/quotes/${quote.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Detail Sheet */}
      {selectedQuote && (
        <QuoteDetailSheet
          quote={selectedQuote}
          canEdit={canEdit}
          open={Boolean(selectedQuote)}
          onClose={() => setSelectedQuote(null)}
          onStatusChange={(newStatus) => handleStatusChange(selectedQuote.id, newStatus)}
          onConvertToBooking={() => handleConvertToBooking(selectedQuote)}
          converting={convertingId === selectedQuote.id}
        />
      )}
    </>
  );
}

function QuoteDetailSheet({
  quote,
  canEdit,
  open,
  onClose,
  onStatusChange,
  onConvertToBooking,
  converting,
}: {
  quote: QuoteRequest;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onStatusChange: (status: QuoteRequestStatus) => void;
  onConvertToBooking: () => void;
  converting: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>Quote request</SheetTitle>
            <StatusBadge kind="lead" status={quote.status} />
          </div>
          <SheetDescription className="font-mono text-xs">
            Received on {formatDate(quote.created_at, "long")} at {formatTime(quote.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-xs">
          {/* Status selector */}
          {canEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-alt/50 p-3">
              <span className="font-medium text-text">Status</span>
              <select
                value={quote.status}
                onChange={(e) => onStatusChange(e.target.value as QuoteRequestStatus)}
                className="rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-text"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="quoted">Quoted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          )}

          {/* Customer details */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
            <h4 className="font-semibold text-text uppercase tracking-wider text-caption">
              Customer Information
            </h4>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-text-muted block text-caption">Full name</span>
                <span className="font-medium text-text">{quote.full_name}</span>
              </div>
              {quote.company_name && (
                <div>
                  <span className="text-text-muted block text-caption">Company</span>
                  <span className="font-medium text-text">{quote.company_name}</span>
                </div>
              )}
              <div>
                <span className="text-text-muted block text-caption">Email</span>
                <a
                  href={`mailto:${quote.email}`}
                  className="font-mono text-accent hover:underline break-all"
                >
                  {quote.email}
                </a>
              </div>
              {quote.phone && (
                <div>
                  <span className="text-text-muted block text-caption">Phone</span>
                  <a href={`tel:${quote.phone}`} className="font-mono text-text hover:underline">
                    {quote.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Scope details */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
            <h4 className="font-semibold text-text uppercase tracking-wider text-caption">
              Property & Requirements
            </h4>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-text-muted block text-caption">Postcode</span>
                <span className="font-mono font-semibold text-text">
                  {quote.postcode || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-caption">Properties</span>
                <span className="font-medium text-text">
                  {quote.property_count ? `${quote.property_count} properties` : "1 property"}
                </span>
              </div>
            </div>

            {quote.services_requested && quote.services_requested.length > 0 && (
              <div className="pt-2">
                <span className="text-text-muted block text-caption mb-1.5">Services Requested</span>
                <div className="flex flex-wrap gap-1.5">
                  {quote.services_requested.map((svc) => (
                    <span
                      key={svc}
                      className="inline-flex items-center gap-1 rounded bg-surface-alt border border-border-subtle px-2 py-0.5 text-caption font-medium text-text"
                    >
                      <Wrench className="h-3 w-3 text-accent" />
                      {svc.replace(/_/g, " ").toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          {quote.message && (
            <div className="space-y-1.5">
              <h4 className="font-semibold text-text">Message / Requirements</h4>
              <div className="rounded-md border border-border bg-surface-alt/40 p-4 leading-relaxed whitespace-pre-wrap text-text">
                {quote.message}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                disabled={converting}
                onClick={onConvertToBooking}
              >
                <CalendarPlus className="mr-1.5 h-4 w-4" />
                Convert to booking
              </Button>

              <Button asChild variant="outline">
                <Link href={`/leads/quotes/${quote.id}`}>
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Full page
                </Link>
              </Button>
            </div>

            <Button asChild variant="ghost" size="sm" className="w-full text-text-muted">
              <a
                href={`mailto:${quote.email}?subject=${encodeURIComponent(
                  `Quote request from Premium Property Checks`,
                )}`}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Email customer
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
