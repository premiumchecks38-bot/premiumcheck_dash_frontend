"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { DateTimeText } from "@/components/dashboard/date-time-text";
import { FormSection } from "@/components/dashboard/form-section";
import { useSessionUser } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS, type SessionUser } from "@/lib/auth/permissions";
import { admin } from "@/lib/client/api";
import { applyFieldErrors, errorMessage } from "@/lib/client/errors";

const schema = z.object({
  fullName: z.string().trim().min(1, { error: "Enter your name" }).max(200),
});

/** The signed in person's name (email and role are changed by the owner or an admin). */
export function ProfileForm() {
  const user = useSessionUser();
  const router = useRouter();
  const form = useForm<{ fullName: string }>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user.full_name },
  });
  const error = form.formState.errors.fullName;

  const onSubmit = async ({ fullName }: { fullName: string }) => {
    try {
      const saved = await admin<SessionUser>("/auth/me", {
        method: "PATCH",
        json: { full_name: fullName.trim() },
      });
      form.reset({ fullName: saved.full_name });
      toast.success("Your name has been updated.");
      router.refresh();
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, { full_name: "fullName" }))
        toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-8">
      <FormSection
        title="Profile"
        description="Your name appears in the audit log and on emails you send from the dashboard."
      >
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="max-w-md space-y-4"
          aria-label="Profile"
        >
          <FormField id="profile-name" label="Full name" error={error?.message} required>
            <Input
              id="profile-name"
              autoComplete="name"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "profile-name-error" : undefined}
              {...form.register("fullName")}
            />
          </FormField>
          <Button type="submit" variant="accent" size="sm" loading={form.formState.isSubmitting}>
            Save name
          </Button>
        </form>
      </FormSection>
      <FormSection
        title="Sign in details"
        description="Ask the owner or an admin to change your email address or role."
      >
        <dl className="grid max-w-md gap-3 font-body text-small sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="text-text-muted">Email</dt>
          <dd className="font-semibold text-text">{user.email}</dd>
          <dt className="text-text-muted">Role</dt>
          <dd className="font-semibold text-text">{ROLE_LABELS[user.role]}</dd>
          <dt className="text-text-muted">Member since</dt>
          <dd className="text-text">
            <DateTimeText value={user.created_at} style="date" />
          </dd>
        </dl>
      </FormSection>
    </div>
  );
}
