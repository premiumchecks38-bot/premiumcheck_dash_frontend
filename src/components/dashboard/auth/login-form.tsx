"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PasswordInput } from "@/components/dashboard/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { reloadTo } from "@/lib/client/navigate";

const schema = z.object({
  email: z.email({ error: "Enter your email address, like name@premiumchecks.co.uk" }),
  password: z.string().min(1, { error: "Enter your password" }),
});
type Values = z.infer<typeof schema>;

interface LoginResult {
  status: "authenticated" | "two_factor_required";
  two_factor_setup_required?: boolean;
}

/** After signing in: forced 2FA setup first, otherwise the page the person came from. */
export function destinationAfterLogin(result: LoginResult, next: string | null): string {
  if (result.two_factor_setup_required) return "/account/security/setup";
  return next ?? "/";
}

export function LoginForm({ next, notice }: { next: string | null; notice: string | null }) {
  const router = useRouter();
  const [failure, setFailure] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;

  const onSubmit = async (values: Values) => {
    setFailure(null);
    try {
      const { data } = await request<LoginResult>("/api/auth/login", { json: values });
      if (data.status === "two_factor_required") {
        router.push(`/login/2fa${next ? `?next=${encodeURIComponent(next)}` : ""}` as Route);
        return;
      }
      // A full load, so every layout reads the new session.
      reloadTo(destinationAfterLogin(data, next));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="mt-6 space-y-5"
      aria-label="Sign in"
    >
      {notice && !failure ? (
        <Alert variant="info" data-testid="login-notice">
          {notice}
        </Alert>
      ) : null}
      {failure ? (
        <Alert variant="error" data-testid="login-error">
          {failure}
        </Alert>
      ) : null}
      <FormField id="email" label="Email address" error={formState.errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          aria-invalid={Boolean(formState.errors.email)}
          aria-describedby={formState.errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </FormField>
      <FormField id="password" label="Password" error={formState.errors.password?.message} required>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={Boolean(formState.errors.password)}
          aria-describedby={formState.errors.password ? "password-error" : undefined}
          {...register("password")}
        />
      </FormField>
      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        loading={formState.isSubmitting}
      >
        Sign in
      </Button>
      <p className="text-center font-body text-small">
        <Link
          href="/forgot-password"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          Forgotten your password?
        </Link>
      </p>
    </form>
  );
}
