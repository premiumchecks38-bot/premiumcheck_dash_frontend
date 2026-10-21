"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  FileCheck2,
  Globe2,
  Link2,
  Mail,
  Palette,
  RotateCcw,
  Save,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { CheckField, TextField } from "@/components/dashboard/content/text-field";
import { usePermission } from "@/components/dashboard/session-context";
import { useSave } from "@/components/dashboard/use-save";
import { useUnsavedChanges } from "@/components/dashboard/use-unsaved-changes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SiteSettings } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { cleanDeep } from "@/lib/text/clean";

const DEFAULT_SETTINGS = {
  company: {
    name: "Premium Property Checks Limited",
    company_number: "",
    vat_number: "",
    registered_address: "",
    phone: "",
    email: "",
    opening_hours: "",
    reply_time: "",
  },
  branding: {
    logo_id: null,
    favicon_id: null,
    default_og_image_id: null,
  },
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    x: "",
    youtube: "",
    tiktok: "",
    google_business: "",
  },
  booking: {
    lead_time_hours: 0,
    horizon_days: 60,
    slot_hold_minutes: 15,
    appointment_reminder_hours: 24,
    congestion_charge: {
      enabled: true,
      amount_pence: 1500,
      vat_applies: true,
      label: "Congestion Zone charge",
    },
    congestion_postcode_prefixes: ["EC1", "EC2", "EC3", "EC4", "WC1", "WC2", "W1", "SW1", "SE1"],
    pay_later: {
      enabled: true,
    },
  },
  certificates: {
    validity_months: {
      eicr: 60,
      cp12: 12,
      cp42: 12,
      epc: 120,
      fra: 12,
      pat: 12,
      emergency_lighting: 12,
      asbestos: null,
      inventory: null,
      other: null,
    } as Record<string, number | null>,
  },
  emails: {
    admin_notification_emails: [] as string[],
    contact_recipients: [] as string[],
  },
  seo: {
    title_suffix: "Premium Property Checks",
    default_description: "",
    google_site_verification: "",
    bing_site_verification: "",
  },
  integrations: {
    google_analytics_id: "",
    google_tag_manager_id: "",
  },
};

type SettingsState = typeof DEFAULT_SETTINGS;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("settings");
  const saveAction = useSave();

  const [tab, setTab] = React.useState("company");

  const query = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => admin<SiteSettings>("/admin/settings"),
  });

  const [formData, setFormData] = React.useState<SettingsState | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    if (query.data && !isDirty) {
      const q = query.data as Record<string, any>;
      setFormData({
        company: { ...DEFAULT_SETTINGS.company, ...(q.company ?? {}) },
        branding: { ...DEFAULT_SETTINGS.branding, ...(q.branding ?? {}) },
        social: { ...DEFAULT_SETTINGS.social, ...(q.social ?? {}) },
        booking: {
          ...DEFAULT_SETTINGS.booking,
          ...(q.booking ?? {}),
          congestion_charge: {
            ...DEFAULT_SETTINGS.booking.congestion_charge,
            ...(q.booking?.congestion_charge ?? {}),
          },
          pay_later: {
            ...DEFAULT_SETTINGS.booking.pay_later,
            ...(q.booking?.pay_later ?? {}),
          },
        },
        certificates: {
          ...DEFAULT_SETTINGS.certificates,
          ...(q.certificates ?? {}),
          validity_months: {
            ...DEFAULT_SETTINGS.certificates.validity_months,
            ...(q.certificates?.validity_months ?? {}),
          },
        },
        emails: {
          admin_notification_emails: q.emails?.admin_notification_emails ?? [],
          contact_recipients: q.emails?.contact_recipients ?? [],
        },
        seo: { ...DEFAULT_SETTINGS.seo, ...(q.seo ?? {}) },
        integrations: { ...DEFAULT_SETTINGS.integrations, ...(q.integrations ?? {}) },
      });
    }
  }, [query.data, isDirty]);

  const updateGroup = <K extends keyof SettingsState>(group: K, changes: Partial<SettingsState[K]>) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [group]: {
          ...prev[group],
          ...changes,
        },
      };
    });
    setIsDirty(true);
  };

  async function handleSave() {
    if (!formData) return;

    const ok = await saveAction.run(async () => {
      const payload = cleanDeep(formData);
      return admin("/admin/settings", {
        method: "PUT",
        json: payload,
      });
    }, "Site settings updated");

    if (ok) {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    }
  }

  function handleDiscard() {
    if (query.data) {
      const q = query.data as Record<string, any>;
      setFormData({
        company: { ...DEFAULT_SETTINGS.company, ...(q.company ?? {}) },
        branding: { ...DEFAULT_SETTINGS.branding, ...(q.branding ?? {}) },
        social: { ...DEFAULT_SETTINGS.social, ...(q.social ?? {}) },
        booking: {
          ...DEFAULT_SETTINGS.booking,
          ...(q.booking ?? {}),
          congestion_charge: {
            ...DEFAULT_SETTINGS.booking.congestion_charge,
            ...(q.booking?.congestion_charge ?? {}),
          },
          pay_later: {
            ...DEFAULT_SETTINGS.booking.pay_later,
            ...(q.booking?.pay_later ?? {}),
          },
        },
        certificates: {
          ...DEFAULT_SETTINGS.certificates,
          ...(q.certificates ?? {}),
          validity_months: {
            ...DEFAULT_SETTINGS.certificates.validity_months,
            ...(q.certificates?.validity_months ?? {}),
          },
        },
        emails: {
          admin_notification_emails: q.emails?.admin_notification_emails ?? [],
          contact_recipients: q.emails?.contact_recipients ?? [],
        },
        seo: { ...DEFAULT_SETTINGS.seo, ...(q.seo ?? {}) },
        integrations: { ...DEFAULT_SETTINGS.integrations, ...(q.integrations ?? {}) },
      });
      setIsDirty(false);
    }
  }

  if (query.isLoading || !formData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <span>{errorMessage(query.error)}</span>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company details, booking configuration, certificates and notifications."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Admin" },
          { label: "Settings" },
        ]}
        actions={
          isDirty && canEdit ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saveAction.busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveAction.busy}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveAction.busy ? "Saving..." : "Save settings"}
              </Button>
            </div>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="space-y-4">
          <div className="rounded-lg border border-dashboard-border bg-dashboard-card p-6 space-y-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-dashboard-text">Company information</h3>
            <p className="text-xs text-dashboard-muted">
              Displayed on invoices, transactional emails and the website footer.
            </p>

            <TextField
              label="Trading name"
              value={formData.company.name}
              onChange={(val) => updateGroup("company", { name: val })}
              required
              disabled={!canEdit}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Company registration number"
                value={formData.company.company_number}
                onChange={(val) => updateGroup("company", { company_number: val })}
                placeholder="e.g. 12345678"
                disabled={!canEdit}
              />

              <TextField
                label="VAT number"
                value={formData.company.vat_number}
                onChange={(val) => updateGroup("company", { vat_number: val })}
                placeholder="e.g. GB 123 4567 89"
                disabled={!canEdit}
              />
            </div>

            <TextField
              label="Registered address"
              value={formData.company.registered_address}
              onChange={(val) => updateGroup("company", { registered_address: val })}
              multiline
              rows={3}
              placeholder="Full registered company address..."
              disabled={!canEdit}
            />

            {/* The website's phone number is set in code (BUSINESS_PHONE), not here. */}
            <TextField
              label="Customer support email"
              value={formData.company.email}
              onChange={(val) => updateGroup("company", { email: val })}
              placeholder="info@premiumchecks.co.uk"
              disabled={!canEdit}
            />

            <TextField
              label="Opening hours summary"
              value={formData.company.opening_hours}
              onChange={(val) => updateGroup("company", { opening_hours: val })}
              placeholder="e.g. Mon - Fri 08:00 - 18:00, Sat 09:00 - 16:00"
              disabled={!canEdit}
            />

            <TextField
              label="Contact form expected reply time"
              value={formData.company.reply_time}
              onChange={(val) => updateGroup("company", { reply_time: val })}
              placeholder="e.g. within one working day"
              disabled={!canEdit}
            />
          </div>
        </TabsContent>

        {/* Social */}
        <TabsContent value="social" className="space-y-4">
          <div className="rounded-lg border border-dashboard-border bg-dashboard-card p-6 space-y-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-dashboard-text">Social profiles</h3>
            <p className="text-xs text-dashboard-muted">
              Public profile links linked in the website header, footer and schema.org markup.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <TextField
                label="Google Business Profile URL"
                value={formData.social.google_business}
                onChange={(val) => updateGroup("social", { google_business: val })}
                placeholder="https://maps.google.com/..."
                disabled={!canEdit}
              />
              <TextField
                label="LinkedIn Profile"
                value={formData.social.linkedin}
                onChange={(val) => updateGroup("social", { linkedin: val })}
                placeholder="https://linkedin.com/company/..."
                disabled={!canEdit}
              />
              <TextField
                label="Facebook"
                value={formData.social.facebook}
                onChange={(val) => updateGroup("social", { facebook: val })}
                placeholder="https://facebook.com/..."
                disabled={!canEdit}
              />
              <TextField
                label="Instagram"
                value={formData.social.instagram}
                onChange={(val) => updateGroup("social", { instagram: val })}
                placeholder="https://instagram.com/..."
                disabled={!canEdit}
              />
              <TextField
                label="X (Twitter)"
                value={formData.social.x}
                onChange={(val) => updateGroup("social", { x: val })}
                placeholder="https://x.com/..."
                disabled={!canEdit}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
