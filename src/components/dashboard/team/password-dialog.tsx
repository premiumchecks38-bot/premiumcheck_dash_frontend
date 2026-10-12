"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordInput } from "@/components/dashboard/password-field";
import { PasswordPolicy } from "@/components/dashboard/password-policy";
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
import { FormField } from "@/components/ui/form-field";
import type { TeamMember } from "@/lib/api/schemas";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { admin, request } from "@/lib/client/api";
import { applyFieldErrors, errorMessage } from "@/lib/client/errors";

const schema = z.object({ password: newPasswordSchema });

/**
 * Reset another member's password: email them a reset link, or set a temporary password.
 * A temporary password signs them out everywhere.
 */
export function PasswordDialog({
  member,
  onOpenChange,
}: {
  member: TeamMember | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {member ? (
          <PasswordForm key={member.id} member={member} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PasswordForm({ member, onDone }: { member: TeamMember; onDone: () => void }) {
  const [failure, setFailure] = React.useState<string | null>(null);
  const [emailing, setEmailing] = React.useState(false);
  const form = useForm<{ password: string }>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });
  const error = form.formState.errors.password;

  const sendLink = async () => {
    setFailure(null);
    setEmailing(true);
    try {
      await request("/api/auth/password-reset/request", { json: { email: member.email } });
      toast.success(`A reset link is on its way to ${member.email}.`);
      onDone();
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setEmailing(false);
    }
  };

  const onSubmit = async ({ password: value }: { password: string }) => {
    setFailure(null);
    try {
      await admin(`/team/${member.id}/reset-password`, { json: { temporary_password: value } });
      toast.success(`Temporary password set. ${member.full_name} has been signed out everywhere.`);
      onDone();
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, { temporary_password: "password" }))
        setFailure(errorMessage(err));
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      className="space-y-5"
      aria-label="Reset password"
    >
      <DialogHeader>
        <DialogTitle>Reset password for {member.full_name}</DialogTitle>
        <DialogDescription>
          Email them a link to choose a new password, or set a temporary one now.
        </DialogDescription>
      </DialogHeader>
      {failure ? <Alert variant="error">{failure}</Alert> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={emailing}
        onClick={() => void sendLink()}
      >
        <Mail className="h-4 w-4" aria-hidden="true" /> Email a reset link to {member.email}
      </Button>
      <FormField id="temporary-password" label="Or set a temporary password" error={error?.message}>
        <PasswordInput
          id="temporary-password"
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={`temporary-password-rules${error ? " temporary-password-error" : ""}`}
          {...form.register("password")}
        />
        <PasswordPolicy id="temporary-password-rules" value={password} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" size="sm" loading={form.formState.isSubmitting}>
          Set temporary password
        </Button>
      </DialogFooter>
    </form>
  );
}
