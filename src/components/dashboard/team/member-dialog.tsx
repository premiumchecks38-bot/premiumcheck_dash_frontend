"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordInput } from "@/components/dashboard/password-field";
import { PasswordPolicy } from "@/components/dashboard/password-policy";
import { useSessionUser } from "@/components/dashboard/session-context";
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
import { Input } from "@/components/ui/input";
import type { RoleDefaults, TeamMember } from "@/lib/api/schemas";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { admin } from "@/lib/client/api";
import { applyFieldErrors, errorMessage } from "@/lib/client/errors";
import {
  isCustomisable,
  matrixFrom,
  permissionsFrom,
  sameMatrix,
  type Matrix,
} from "@/lib/team/matrix";
import { assignableRoles } from "@/lib/team/members";

import { PermissionMatrix } from "./permission-matrix";

const ROLE_HELP: Record<"admin" | "manager" | "editor", string> = {
  admin: "Every page, including team, settings and the audit log. Cannot manage the owner.",
  manager: "Bookings, customers and leads by default. Pages can be adjusted below.",
  editor: "Website content by default: blog, pages, FAQs, SEO and media.",
};

const baseSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Enter their name" }).max(200),
  email: z.string(),
  role: z.enum(["admin", "manager", "editor"]),
  delivery: z.enum(["invite", "password"]),
  temporaryPassword: z.string(),
});
type Values = z.infer<typeof baseSchema>;

const createSchema = baseSchema.superRefine((values, ctx) => {
  if (!z.email().safeParse(values.email.trim()).success) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address" });
  }
  if (values.delivery === "password") {
    const result = newPasswordSchema.safeParse(values.temporaryPassword);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        path: ["temporaryPassword"],
        message: result.error.issues[0]?.message ?? "Choose a stronger password",
      });
    }
  }
});

function defaultsFor(roles: RoleDefaults[] | undefined, role: Role): Matrix | null {
  const found = roles?.find((r) => r.role === role);
  return found ? matrixFrom(found.permissions) : null;
}

/** Invite a new team member, or change an existing member's name, role and page access. */
export function MemberDialog({
  open,
  member,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  member: TeamMember | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh max-w-3xl overflow-y-auto">
        {open ? (
          <MemberForm
            key={member?.id ?? "new"}
            member={member}
            onDone={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MemberForm({
  member,
  onDone,
  onSaved,
}: {
  member: TeamMember | null;
  onDone: () => void;
  onSaved: () => void;
}) {
  const me = useSessionUser();
  const editing = member !== null;
  const roles = assignableRoles(me);
  const [failure, setFailure] = React.useState<string | null>(null);

  const roleDefaults = useQuery({
    queryKey: ["team", "role-defaults"],
    queryFn: () => admin<RoleDefaults[]>("/team/role-defaults"),
    staleTime: Infinity,
  });

  const startRole = (member?.role ?? "manager") as Values["role"];
  const form = useForm<Values>({
    resolver: zodResolver(editing ? baseSchema : createSchema),
    defaultValues: {
      fullName: member?.full_name ?? "",
      email: member?.email ?? "",
      role: startRole,
      delivery: "invite",
      temporaryPassword: "",
    },
  });
  const { register, handleSubmit, formState, control, setError } = form;
  const role = useWatch({ control, name: "role" });
  const delivery = useWatch({ control, name: "delivery" });
  const temporaryPassword = useWatch({ control, name: "temporaryPassword" });

  const defaults = defaultsFor(roleDefaults.data, role);
  const [matrix, setMatrix] = React.useState<Matrix | null>(
    member && isCustomisable(member.role) ? matrixFrom(member.permissions) : null,
  );
  // A new member starts from the role defaults as soon as they arrive.
  const shown = matrix ?? defaults;
  // One registration for every role radio: a new role starts from that role's defaults.
  const roleField = register("role", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setMatrix(defaultsFor(roleDefaults.data, event.target.value as Role)),
  });
  const roleChanged = editing && role !== member.role;

  const onSubmit = async (values: Values) => {
    setFailure(null);
    const permissions = isCustomisable(values.role) && shown ? permissionsFrom(shown) : undefined;
    try {
      if (!editing) {
        const created = await admin<TeamMember>("/team", {
          json: {
            email: values.email.trim(),
            full_name: values.fullName.trim(),
            role: values.role,
            temporary_password:
              values.delivery === "password" ? values.temporaryPassword : undefined,
            permissions,
          },
        });
        toast.success(
          values.delivery === "invite"
            ? `Invitation sent to ${created.email}.`
            : `${created.full_name} can now sign in with the temporary password.`,
        );
      } else {
        const changes: Record<string, string> = {};
        if (values.fullName.trim() !== member.full_name) changes.full_name = values.fullName.trim();
        if (values.role !== member.role) changes.role = values.role;
        let saved = member;
        if (Object.keys(changes).length > 0) {
          saved = await admin<TeamMember>(`/team/${member.id}`, { method: "PATCH", json: changes });
        }
        if (permissions && !sameMatrix(matrixFrom(saved.permissions), matrixFrom(permissions))) {
          await admin<TeamMember>(`/team/${member.id}/permissions`, {
            method: "PUT",
            json: { permissions },
          });
        }
        toast.success(`Changes to ${values.fullName.trim()} saved.`);
      }
      onSaved();
      onDone();
    } catch (error) {
      const mapped = applyFieldErrors(error, setError, {
        full_name: "fullName",
        temporary_password: "temporaryPassword",
      });
      if (!mapped) setFailure(errorMessage(error));
    }
  };

  const errors = formState.errors;
  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="space-y-5"
      aria-label={editing ? "Edit team member" : "Invite a team member"}
    >
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${member.full_name}` : "Invite someone"}</DialogTitle>
        <DialogDescription>
          {editing
            ? member.email
            : "They get an email with a link to choose a password, or you can set a temporary one."}
        </DialogDescription>
      </DialogHeader>

      {failure ? (
        <Alert variant="error" data-testid="member-error">
          {failure}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="member-name" label="Full name" error={errors.fullName?.message} required>
          <Input
            id="member-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "member-name-error" : undefined}
            {...register("fullName")}
          />
        </FormField>
        {editing ? null : (
          <FormField id="member-email" label="Email" error={errors.email?.message} required>
            <Input
              id="member-email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "member-email-error" : undefined}
              {...register("email")}
            />
          </FormField>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="font-body text-small font-semibold text-text">Role</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {roles.map((option) => (
            <div
              key={option}
              className="rounded-md border-thin border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-surface"
            >
              <label className="flex cursor-pointer items-center gap-3 font-body text-small font-semibold text-text">
                <input
                  type="radio"
                  value={option}
                  aria-describedby={`role-help-${option}`}
                  className="h-4 w-4 accent-primary"
                  {...roleField}
                />
                {ROLE_LABELS[option]}
              </label>
              <p
                id={`role-help-${option}`}
                className="mt-1 pl-7 font-body text-caption text-text-muted"
              >
                {ROLE_HELP[option]}
              </p>
            </div>
          ))}
        </div>
      </fieldset>

      {roleChanged ? (
        <Alert variant="warning" data-testid="role-change-warning">
          Changing the role from {ROLE_LABELS[member.role]} to {ROLE_LABELS[role]} replaces their
          page access with the new role&apos;s defaults (shown below). Adjust it before saving if
          needed.
        </Alert>
      ) : null}

      {isCustomisable(role) ? (
        shown ? (
          <PermissionMatrix value={shown} onChange={setMatrix} defaults={defaults} />
        ) : (
          <p className="font-body text-small text-text-muted">
            {roleDefaults.isError ? errorMessage(roleDefaults.error) : "Loading page access..."}
          </p>
        )
      ) : (
        <p className="rounded-md bg-surface p-3 font-body text-small text-text-muted">
          Admins can use every page, so there is nothing to choose here.
        </p>
      )}

      {editing ? null : (
        <fieldset className="space-y-2">
          <legend className="font-body text-small font-semibold text-text">
            How they sign in first
          </legend>
          <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
            <input
              type="radio"
              value="invite"
              className="h-4 w-4 accent-primary"
              {...register("delivery")}
            />
            Email an invitation link so they choose their own password
          </label>
          <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
            <input
              type="radio"
              value="password"
              className="h-4 w-4 accent-primary"
              {...register("delivery")}
            />
            Set a temporary password and share it with them yourself
          </label>
          {delivery === "password" ? (
            <FormField
              id="member-password"
              label="Temporary password"
              error={errors.temporaryPassword?.message}
              required
            >
              <PasswordInput
                id="member-password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.temporaryPassword)}
                aria-describedby={`member-password-rules${errors.temporaryPassword ? " member-password-error" : ""}`}
                {...register("temporaryPassword")}
              />
              <PasswordPolicy id="member-password-rules" value={temporaryPassword} />
            </FormField>
          ) : null}
        </fieldset>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="accent"
          size="sm"
          loading={formState.isSubmitting}
          data-testid="member-save"
        >
          {editing ? "Save changes" : delivery === "invite" ? "Send invitation" : "Create account"}
        </Button>
      </DialogFooter>
    </form>
  );
}
