"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

const schema = z.object({ email: z.email({ error: "Enter your email address" }) });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  if (sent) {
    return (
      <div className="mt-6 space-y-4">
        <Alert variant="success" data-testid="reset-sent">
          If an account exists for that email, a reset link is on its way. The link works for 30
          minutes.
        </Alert>
        <Link
          href="/login"
          className="font-body text-small font-semibold text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-label="Request a password reset"
      className="mt-6 space-y-5"
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          setFailure(null);
          try {
            await request("/api/auth/password-reset/request", { json: values });
            setSent(true);
          } catch (error) {
            setFailure(errorMessage(error));
          }
        })(event)
      }
    >
      {failure ? <Alert variant="error">{failure}</Alert> : null}
      <FormField id="email" label="Email address" error={formState.errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(formState.errors.email)}
          aria-describedby={formState.errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </FormField>
      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        loading={formState.isSubmitting}
      >
        Send reset link
      </Button>
      <p className="text-center font-body text-small">
        <Link
          href="/login"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
