"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PasswordInput } from "@/components/dashboard/password-field";
import { PasswordPolicy } from "@/components/dashboard/password-policy";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { request } from "@/lib/client/api";
import { applyFieldErrors, errorMessage } from "@/lib/client/errors";
import { reloadTo } from "@/lib/client/navigate";

interface Props {
  mode: "reset" | "invite";
  token: string;
}

const passwordFields = {
  password: newPasswordSchema,
  confirm: z.string(),
};

const resetSchema = z.object(passwordFields).refine((v) => v.password === v.confirm, {
  error: "The passwords do not match",
  path: ["confirm"],
});
const inviteSchema = z
  .object({
    ...passwordFields,
    fullName: z.string().trim().min(1, { error: "Enter your name" }).max(200),
  })
  .refine((v) => v.password === v.confirm, {
    error: "The passwords do not match",
    path: ["confirm"],
  });

interface Values {
  password: string;
  confirm: string;
  fullName?: string;
}

/** Choose a password from a reset link or an invitation (with the person's name). */
export function SetPasswordForm({ mode, token }: Props) {
  const [failure, setFailure] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(mode === "invite" ? inviteSchema : resetSchema),
    defaultValues: { password: "", confirm: "", fullName: "" },
  });
  const { register, handleSubmit, formState, control, setError } = form;
  const password = useWatch({ control, name: "password" });

  if (!token) {
    return (
      <Alert variant="error" className="mt-6">
        This link is incomplete. Open the link from your email again, or{" "}
        <Link
          href={mode === "reset" ? "/forgot-password" : "/login"}
          className="font-semibold underline"
        >
          {mode === "reset" ? "ask for a new reset link" : "go to sign in"}
        </Link>
        .
      </Alert>
    );
  }

  const onSubmit = async (values: Values) => {
    setFailure(null);
    try {
      if (mode === "reset") {
        await request("/api/auth/password-reset/confirm", {
          json: { token, new_password: values.password },
        });
        reloadTo("/login?reset=1");
      } else {
        await request("/api/auth/invite/accept", {
          json: { token, password: values.password, full_name: values.fullName },
        });
        reloadTo("/login?invited=1");
      }
    } catch (error) {
      if (!applyFieldErrors(error, setError, { new_password: "password", full_name: "fullName" })) {
        setFailure(errorMessage(error));
      }
    }
  };

  return (
    <form
      noValidate
      aria-label={mode === "reset" ? "Choose a new password" : "Set up your account"}
      className="mt-6 space-y-5"
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      {failure ? (
        <Alert variant="error" data-testid="set-password-error">
          {failure}
        </Alert>
      ) : null}
      {mode === "invite" ? (
        <FormField
          id="full-name"
          label="Your name"
          error={formState.errors.fullName?.message}
          required
        >
          <Input
            id="full-name"
            autoComplete="name"
            aria-invalid={Boolean(formState.errors.fullName)}
            aria-describedby={formState.errors.fullName ? "full-name-error" : undefined}
            {...register("fullName")}
          />
        </FormField>
      ) : null}
      <FormField
        id="new-password"
        label="New password"
        error={formState.errors.password?.message}
        required
      >
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          aria-invalid={Boolean(formState.errors.password)}
          aria-describedby={`new-password-rules${formState.errors.password ? " new-password-error" : ""}`}
          {...register("password")}
        />
        <PasswordPolicy id="new-password-rules" value={password} />
      </FormField>
      <FormField
        id="confirm-password"
        label="Confirm new password"
        error={formState.errors.confirm?.message}
        required
      >
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          aria-invalid={Boolean(formState.errors.confirm)}
          aria-describedby={formState.errors.confirm ? "confirm-password-error" : undefined}
          {...register("confirm")}
        />
      </FormField>
      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        loading={formState.isSubmitting}
      >
        {mode === "reset" ? "Save new password" : "Create my account"}
      </Button>
    </form>
  );
}
