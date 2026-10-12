"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { CodeInput } from "@/components/dashboard/code-input";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FormSection } from "@/components/dashboard/form-section";
import { PasswordInput } from "@/components/dashboard/password-field";
import { PasswordPolicy } from "@/components/dashboard/password-policy";
import { useSessionUser } from "@/components/dashboard/session-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { admin, request } from "@/lib/client/api";
import { applyFieldErrors, errorMessage } from "@/lib/client/errors";
import { reloadTo } from "@/lib/client/navigate";

import { TwoFactorSetupFlow } from "./two-factor-setup";

const passwordSchema = z
  .object({
    current: z.string().min(1, { error: "Enter your current password" }),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    error: "The passwords do not match",
    path: ["confirm"],
  })
  .refine((v) => v.password !== v.current, {
    error: "Choose a password you have not used here",
    path: ["password"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function ChangePasswordForm() {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await request("/api/auth/change-password", {
        json: { current_password: values.current, new_password: values.password },
      });
      form.reset();
      toast.success("Password changed. You have been signed out on your other devices.");
    } catch (error) {
      if (
        !applyFieldErrors(error, form.setError, {
          current_password: "current",
          new_password: "password",
        })
      ) {
        toast.error(errorMessage(error));
      }
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      className="max-w-md space-y-4"
      aria-label="Change password"
    >
      <FormField
        id="current-password"
        label="Current password"
        error={errors.current?.message}
        required
      >
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.current)}
          aria-describedby={errors.current ? "current-password-error" : undefined}
          {...form.register("current")}
        />
      </FormField>
      <FormField
        id="change-new-password"
        label="New password"
        error={errors.password?.message}
        required
      >
        <PasswordInput
          id="change-new-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={`change-new-password-rules${errors.password ? " change-new-password-error" : ""}`}
          {...form.register("password")}
        />
        <PasswordPolicy id="change-new-password-rules" value={password} />
      </FormField>
      <FormField
        id="change-confirm-password"
        label="Confirm new password"
        error={errors.confirm?.message}
        required
      >
        <PasswordInput
          id="change-confirm-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirm)}
          aria-describedby={errors.confirm ? "change-confirm-password-error" : undefined}
          {...form.register("confirm")}
        />
      </FormField>
      <Button type="submit" variant="accent" size="sm" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}

const disableSchema = z.object({ password: z.string().min(1, { error: "Enter your password" }) });

function DisableTwoFactor({ onDisabled }: { onDisabled: () => void }) {
  const [code, setCode] = React.useState("");
  const [failure, setFailure] = React.useState<string | null>(null);
  const form = useForm<{ password: string }>({
    resolver: zodResolver(disableSchema),
    defaultValues: { password: "" },
  });
  const error = form.formState.errors.password;

  const onSubmit = async ({ password }: { password: string }) => {
    setFailure(null);
    if (code.length < 6) {
      setFailure("Enter the 6 digit code from your app, or a backup code.");
      return;
    }
    try {
      await admin("/auth/2fa/disable", { json: { password, code } });
      toast.success("Two factor sign in is off.");
      onDisabled();
    } catch (err) {
      if (!applyFieldErrors(err, form.setError)) setFailure(errorMessage(err));
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      className="max-w-md space-y-4"
      aria-label="Turn off two factor sign in"
    >
      {failure ? <Alert variant="error">{failure}</Alert> : null}
      <FormField id="disable-password" label="Your password" error={error?.message} required>
        <PasswordInput
          id="disable-password"
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "disable-password-error" : undefined}
          {...form.register("password")}
        />
      </FormField>
      <CodeInput
        id="disable-code"
        label="6 digit code from your app"
        value={code}
        onChange={setCode}
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        loading={form.formState.isSubmitting}
        data-testid="disable-two-factor"
      >
        <ShieldOff className="h-4 w-4" aria-hidden="true" /> Turn off two factor sign in
      </Button>
    </form>
  );
}

/** Account security: password, two factor sign in and signed in devices. */
export function SecurityView() {
  const user = useSessionUser();
  const router = useRouter();
  const [settingUp, setSettingUp] = React.useState(false);
  const [disabling, setDisabling] = React.useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = React.useState(false);

  const logoutAll = async () => {
    try {
      await request("/api/auth/logout-all", { method: "POST" });
      reloadTo("/login");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-8">
      <FormSection title="Password" description="Changing it signs you out on every other device.">
        <ChangePasswordForm />
      </FormSection>

      <FormSection
        id="two-factor"
        title="Two factor sign in"
        description="A code from an authenticator app on your phone, as well as your password, every time you sign in."
      >
        {user.two_factor_enabled ? (
          <div className="space-y-4">
            <p
              className="flex items-center gap-2 font-body text-small font-semibold text-status-positive-text"
              data-testid="two-factor-status"
            >
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> On
            </p>
            {disabling ? (
              <DisableTwoFactor
                onDisabled={() => {
                  setDisabling(false);
                  router.refresh();
                }}
              />
            ) : (
              <div>
                <Button variant="outline" size="sm" onClick={() => setDisabling(true)}>
                  Turn off
                </Button>
              </div>
            )}
          </div>
        ) : settingUp ? (
          <TwoFactorSetupFlow
            finishLabel="Done"
            onFinished={() => {
              setSettingUp(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="space-y-4">
            <p
              className="flex items-center gap-2 font-body text-small font-semibold text-text-muted"
              data-testid="two-factor-status"
            >
              <ShieldOff className="h-5 w-5" aria-hidden="true" /> Off
            </p>
            <div>
              <Button
                variant="accent"
                size="sm"
                onClick={() => setSettingUp(true)}
                data-testid="start-two-factor"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Set up two factor sign in
              </Button>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection
        title="Signed in devices"
        description="Lost a laptop or signed in on a shared computer? Sign out everywhere, including here."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmLogoutAll(true)}
          data-testid="logout-all"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Log out of all devices
        </Button>
      </FormSection>

      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Log out of all devices?"
        description="Every session ends, including this one. You will need your password (and two factor code) to sign in again."
        confirmLabel="Log out everywhere"
        destructive
        onConfirm={logoutAll}
      />
    </div>
  );
}
