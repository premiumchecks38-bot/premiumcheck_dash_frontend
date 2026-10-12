"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";

import { DateTimeText } from "@/components/dashboard/date-time-text";
import { dateInputClass, selectClass } from "@/components/dashboard/field-styles";
import { Panel } from "@/components/dashboard/panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { BookingDetail, CertificateSignature } from "@/lib/api/schemas";
import { CERTIFICATE_TYPE_LABELS } from "@/lib/bookings/labels";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { londonToday } from "@/lib/dates";
import { cn } from "@/lib/utils/cn";

const MAX_BYTES = 20 * 1024 * 1024;

/** A likely certificate type from a service name ("EICR Domestic" to eicr). */
export function guessCertificateType(serviceName: string): string {
  const name = serviceName.toLowerCase();
  if (name.includes("eicr") || name.includes("electrical")) return "eicr";
  if (name.includes("cp42") || name.includes("commercial gas")) return "cp42";
  if (name.includes("gas")) return "cp12";
  if (name.includes("epc") || name.includes("energy")) return "epc";
  if (name.includes("fire")) return "fra";
  if (name.includes("pat")) return "pat";
  if (name.includes("asbestos")) return "asbestos";
  if (name.includes("emergency")) return "emergency_lighting";
  if (name.includes("inventory")) return "inventory";
  return "other";
}

/** "2026-10-06" plus N months, keeping the day (31 January plus 1 month is 28 or 29 February). */
export function addMonthsToDate(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function CertificatesPanel({
  booking,
  canEdit,
}: {
  booking: BookingDetail;
  canEdit: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const certificates = booking.certificates;
  return (
    <Panel
      title="Certificates"
      id="certificates"
      testId="certificates-panel"
      actions={
        canEdit ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setOpen(true)}
            data-testid="upload-certificate"
          >
            <Upload className="h-4 w-4" aria-hidden="true" /> Upload certificate
          </Button>
        ) : null
      }
    >
      {certificates.length === 0 ? (
        <p className="font-body text-small text-text-muted">No certificates uploaded yet.</p>
      ) : (
        <ul className="divide-y-thin divide-border">
          {certificates.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="font-body text-small">
                <p className="font-semibold">
                  {CERTIFICATE_TYPE_LABELS[c.certificate_type] ?? c.certificate_type}
                </p>
                <p className="text-caption text-text-muted">
                  Issued <DateTimeText value={c.issued_at} style="date" fallback="not recorded" />
                  {", expires "}
                  <DateTimeText value={c.expires_at} style="date" fallback="never" />
                </p>
              </div>
              {canEdit ? (
                <Button asChild variant="ghost" size="xs">
                  <a
                    href={`/api/admin/certificates/${c.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Download
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? <UploadDialog booking={booking} open={open} onOpenChange={setOpen} /> : null}
    </Panel>
  );
}

function UploadDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const services = booking.items.filter((i) => i.item_type !== "surcharge");
  const firstItem = services[0];
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [itemId, setItemId] = React.useState(firstItem?.id ?? "");
  const [type, setType] = React.useState(guessCertificateType(firstItem?.service_name ?? ""));
  const [issued, setIssued] = React.useState(londonToday());
  const [expires, setExpires] = React.useState("");
  const [expiryTouched, setExpiryTouched] = React.useState(false);
  const [sendEmail, setSendEmail] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  const validity = useQuery({
    queryKey: ["certificate-validity"],
    queryFn: () => admin<Record<string, number | null>>("/certificates/validity"),
    staleTime: 10 * 60_000,
    enabled: open,
  });
  const months = validity.data?.[type];
  const defaultExpiry = months ? addMonthsToDate(issued, months) : "";
  const expiry = expiryTouched ? expires : defaultExpiry;

  const choose = (picked: File | undefined) => {
    setFailure(null);
    if (!picked) return;
    if (picked.type !== "application/pdf" && !picked.name.toLowerCase().endsWith(".pdf")) {
      setFailure("Choose a PDF file.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFailure("The file is larger than 20 MB.");
      return;
    }
    setFile(picked);
  };

  const upload = async () => {
    if (!file) {
      setFailure("Choose the certificate PDF first.");
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const signed = await admin<CertificateSignature>(
        `/bookings/${booking.id}/certificates/upload-signature`,
        {
          method: "POST",
          query: { file_name: file.name },
        },
      );
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.api_key);
      form.append("timestamp", String(signed.timestamp));
      form.append("signature", signed.signature);
      for (const [key, value] of Object.entries(signed.params)) form.append(key, value);
      const uploaded = await fetch(signed.upload_url, { method: "POST", body: form });
      if (!uploaded.ok) throw new Error("upload");
      await admin(`/bookings/${booking.id}/certificates`, {
        json: {
          certificate_type: type,
          booking_item_id: itemId || null,
          issued_at: `${issued}T12:00:00Z`,
          expires_at: expiry ? `${expiry}T12:00:00Z` : null,
          send_email: sendEmail,
          public_id: signed.public_id,
        },
      });
      toast.success(
        sendEmail ? "Certificate uploaded and emailed to the customer." : "Certificate uploaded.",
      );
      await queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      setFailure(
        error instanceof Error && error.message === "upload"
          ? "The file could not be uploaded to storage. Try again."
          : errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a certificate</DialogTitle>
          <DialogDescription>
            A PDF up to 20 MB for {booking.reference}. Only staff and the customer can open it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {failure ? <Alert variant="error">{failure}</Alert> : null}
          <label
            htmlFor="certificate-file"
            className={cn(
              "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-thick border-dashed border-border p-4 text-center font-body text-small",
              dragging && "border-primary bg-surface",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              choose(event.dataTransfer.files[0]);
            }}
          >
            <FileUp className="h-6 w-6 text-text-muted" aria-hidden="true" />
            {file ? (
              <span className="font-semibold" data-testid="chosen-file">
                {file.name}
              </span>
            ) : (
              <span>Drop the PDF here, or choose a file</span>
            )}
            <input
              id="certificate-file"
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => choose(event.target.files?.[0])}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="certificate-type">Certificate type</Label>
              <select
                id="certificate-type"
                className={`mt-1.5 ${selectClass}`}
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {Object.entries(CERTIFICATE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="certificate-item">For the service</Label>
              <select
                id="certificate-item"
                className={`mt-1.5 ${selectClass}`}
                value={itemId}
                onChange={(event) => {
                  setItemId(event.target.value);
                  const item = services.find((s) => s.id === event.target.value);
                  if (item) setType(guessCertificateType(item.service_name));
                }}
              >
                <option value="">The whole booking</option>
                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.service_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="certificate-issued">Issued</Label>
              <input
                id="certificate-issued"
                type="date"
                className={`mt-1.5 ${dateInputClass}`}
                value={issued}
                onChange={(event) => setIssued(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="certificate-expires">Expires</Label>
              <input
                id="certificate-expires"
                type="date"
                className={`mt-1.5 ${dateInputClass}`}
                value={expiry}
                min={issued}
                aria-describedby="certificate-expires-hint"
                onChange={(event) => {
                  setExpiryTouched(true);
                  setExpires(event.target.value);
                }}
              />
              <p
                id="certificate-expires-hint"
                className="mt-1 font-body text-caption text-text-muted"
              >
                {months
                  ? `Usually ${String(months)} months for this type.`
                  : "No standard expiry for this type."}
              </p>
            </div>
          </div>
          <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
            />
            Send the certificate email to the customer
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            loading={busy}
            onClick={() => void upload()}
            data-testid="certificate-submit"
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
