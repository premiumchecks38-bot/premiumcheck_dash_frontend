"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  CalendarPlus,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { BookingDraft, QuoteRequest, QuoteRequestStatus } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { formatDate, formatTime } from "@/lib/utils/format";

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("leads");

  const id = typeof params?.id === "string" ? params.id : "";
  const [internalNotes, setInternalNotes] = React.useState("");
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const [isConverting, setIsConverting] = React.useState(false);

  const query = useQuery({
    queryKey: ["admin", "leads", "quotes", id],
    queryFn: () => admin<QuoteRequest>(`/leads/quotes/${id}`),
    enabled: Boolean(id),
  });

  const quote = query.data;

  // Sync internal notes state when quote data loads
  React.useEffect(() => {
    if (quote?.admin_notes !== undefined) {
      setInternalNotes(quote.admin_notes || "");
    }
  }, [quote?.admin_notes]);

  async function handleStatusChange(newStatus: QuoteRequestStatus) {
    if (!quote) return;
    try {
      await admin<QuoteRequest>(`/leads/quotes/${id}`, {
        method: "PATCH",
        json: { status: newStatus },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success(`Quote status changed to ${newStatus}`);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleSaveNotes() {
    if (!quote) return;
    setIsSavingNotes(true);
    try {
      await admin<QuoteRequest>(`/leads/quotes/${id}`, {
        method: "PATCH",
        json: { admin_notes: internalNotes },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Internal notes updated successfully");
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleConvertToBooking() {
    if (!quote) return;
    setIsConverting(true);
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
        toast.success("Draft generated! Opening booking form...");
      }

      router.push(`/bookings/new?${searchParams.toString()}`);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setIsConverting(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (query.isError || !quote) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <span>{query.error ? errorMessage(query.error) : "Quote request could not be found."}</span>
        </Alert>

        <Button asChild variant="outline">
          <Link href="/leads/quotes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to quote requests
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-text-muted hover:text-text">
          <Link href="/leads/quotes">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to all quote requests
          </Link>
        </Button>
      </div>

      <PageHeader
        title={quote.full_name}
        description={`Quote request submitted on ${formatDate(quote.created_at, "long")} at ${formatTime(quote.created_at)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge kind="lead" status={quote.status} />

            <Button
              size="sm"
              onClick={handleConvertToBooking}
              disabled={isConverting}
            >
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              {isConverting ? "Creating booking..." : "Convert to booking"}
            </Button>

            <Button asChild variant="outline" size="sm">
              <a
                href={`mailto:${quote.email}?subject=${encodeURIComponent(
                  `Quote enquiry - Premium Property Checks`,
                )}`}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
              </a>
            </Button>

            {quote.phone && (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${quote.phone}`}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                </a>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl">
        {/* Left Column: Details */}
        <div className="space-y-6 md:col-span-2">
          {/* Customer & Company Details */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h3 className="font-semibold text-text uppercase tracking-wider text-caption">
              Customer Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-caption text-text-muted flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Full Name
                </span>
                <p className="font-medium text-text text-small">{quote.full_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-caption text-text-muted flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </span>
                <a
                  href={`mailto:${quote.email}`}
                  className="font-mono text-accent hover:underline text-small block truncate"
                >
                  {quote.email}
                </a>
              </div>

              <div className="space-y-1">
                <span className="text-caption text-text-muted flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Phone Number
                </span>
                {quote.phone ? (
                  <a
                    href={`tel:${quote.phone}`}
                    className="font-mono text-text hover:underline text-small block"
                  >
                    {quote.phone}
                  </a>
                ) : (
                  <p className="text-text-muted italic text-caption">Not provided</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-caption text-text-muted flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" /> Company / Organisation
                </span>
                {quote.company_name ? (
                  <p className="font-medium text-text text-small">{quote.company_name}</p>
                ) : (
                  <p className="text-text-muted italic text-caption">Not provided</p>
                )}
              </div>

              {quote.customer_type && (
                <div className="space-y-1">
                  <span className="text-caption text-text-muted">Customer Type</span>
                  <p className="font-medium capitalize text-text text-small">
                    {quote.customer_type}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Property & Scope */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h3 className="font-semibold text-text uppercase tracking-wider text-caption">
              Property & Scope Requirements
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-caption text-text-muted flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Postcode
                </span>
                <p className="font-mono font-bold text-text text-small">
                  {quote.postcode || "Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-caption text-text-muted">Number of Properties</span>
                <p className="font-medium text-text text-small">
                  {quote.property_count ? `${quote.property_count} properties` : "1 property"}
                </p>
              </div>
            </div>

            {/* Requested Services */}
            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-caption text-text-muted block">Services Requested</span>
              {quote.services_requested && quote.services_requested.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {quote.services_requested.map((svc) => (
                    <span
                      key={svc}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-surface-alt border border-border-subtle px-3 py-1.5 text-small font-medium text-text"
                    >
                      <Wrench className="h-4 w-4 text-accent" />
                      {svc.replace(/_/g, " ").toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted italic text-caption">No specific services listed</p>
              )}
            </div>
          </div>

          {/* Customer Requirements / Message */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h3 className="font-semibold text-text uppercase tracking-wider text-caption">
              Client Message & Requirements
            </h3>

            {quote.message ? (
              <div className="rounded-lg border border-border-subtle bg-surface-alt/40 p-4 font-body text-small leading-relaxed text-text whitespace-pre-wrap">
                {quote.message}
              </div>
            ) : (
              <p className="text-text-muted italic text-caption">
                No additional message or special instructions provided.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Lead Status & Management */}
        <div className="space-y-6">
          {/* Status & Assignment Card */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h3 className="font-semibold text-text uppercase tracking-wider text-caption">
              Lead Management
            </h3>

            {canEdit ? (
              <div className="space-y-2">
                <label className="text-caption font-medium text-text block">Change Status</label>
                <select
                  value={quote.status}
                  onChange={(e) => handleStatusChange(e.target.value as QuoteRequestStatus)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-small font-semibold text-text focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="new">New (Needs review)</option>
                  <option value="contacted">Contacted (In touch)</option>
                  <option value="quoted">Quoted (Estimate sent)</option>
                  <option value="won">Won (Accepted / Booking ready)</option>
                  <option value="lost">Lost (Not proceeding)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-caption text-text-muted block">Status</span>
                <StatusBadge kind="lead" status={quote.status} />
              </div>
            )}

            {quote.assigned_admin_name && (
              <div className="space-y-1 pt-2 border-t border-border">
                <span className="text-caption text-text-muted block">Assigned Admin</span>
                <p className="font-medium text-text text-small">{quote.assigned_admin_name}</p>
              </div>
            )}

            <div className="pt-2 border-t border-border space-y-2">
              <Button
                className="w-full"
                onClick={handleConvertToBooking}
                disabled={isConverting}
              >
                <CalendarPlus className="mr-1.5 h-4 w-4" />
                Convert to booking
              </Button>
            </div>
          </div>

          {/* Internal Notes Card */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h3 className="font-semibold text-text uppercase tracking-wider text-caption">
              Internal Admin Notes
            </h3>

            <Textarea
              placeholder="Add internal notes about pricing discussions, client requirements, or follow-ups..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={5}
              disabled={!canEdit}
              className="text-small"
            />

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || internalNotes === (quote.admin_notes || "")}
                className="w-full"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isSavingNotes ? "Saving..." : "Save internal notes"}
              </Button>
            )}
          </div>

          {/* Meta & Timestamps */}
          <div className="rounded-xl border border-border bg-surface p-5 text-caption space-y-2 text-text-muted font-mono">
            <div className="flex justify-between">
              <span>Created</span>
              <span>
                {formatDate(quote.created_at, "short")} {formatTime(quote.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span>
                {formatDate(quote.updated_at, "short")} {formatTime(quote.updated_at)}
              </span>
            </div>
            <div className="flex justify-between truncate pt-1 border-t border-border text-[11px]">
              <span>ID</span>
              <span className="truncate ml-2">{quote.id}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
