"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, MonitorX, ShieldCheck, UserRound } from "lucide-react";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/dashboard/primitives";
import { useSessionUser } from "@/components/dashboard/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { request } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { reloadTo } from "@/lib/client/navigate";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu() {
  const user = useSessionUser();
  const router = useRouter();
  const [confirmAll, setConfirmAll] = React.useState(false);

  const logoutAll = async () => {
    try {
      await request("/api/auth/logout-all", { method: "POST" });
      reloadTo("/login");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button
            variant="ghost"
            size="none"
            className="flex min-h-touch items-center gap-2 rounded-full px-2"
          >
            {/* The visible name and role stay part of the accessible name (WCAG 2.5.3). */}
            <span className="sr-only md:hidden">Account menu for {user.full_name}</span>
            <span className="sr-only max-md:hidden">Account menu for</span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-heading text-caption font-bold text-primary-foreground"
            >
              {initials(user.full_name)}
            </span>
            <span className="hidden flex-col items-start leading-tight md:flex">
              <span className="font-body text-small font-semibold text-text">{user.full_name}</span>
              <span className="font-body text-caption text-text-muted">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </Button>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuLabel>
            <span className="block font-body text-small font-semibold text-text">
              {user.full_name}
            </span>
            <span className="block font-body text-caption text-text-muted">{user.email}</span>
            <Badge variant="outline" className="mt-2" data-testid="user-role">
              {ROLE_LABELS[user.role]}
            </Badge>
          </MenuLabel>
          <MenuSeparator />
          <MenuItem onSelect={() => router.push("/account")}>
            <UserRound className="h-4 w-4" aria-hidden="true" /> Account
          </MenuItem>
          <MenuItem onSelect={() => router.push("/account/security")}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Security
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => router.push("/logout")}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
          </MenuItem>
          <MenuItem onSelect={() => setConfirmAll(true)}>
            <MonitorX className="h-4 w-4" aria-hidden="true" /> Log out of all devices
          </MenuItem>
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Log out of all devices?"
        description="Every browser signed in to your account, including this one, is signed out."
        confirmLabel="Log out everywhere"
        destructive
        onConfirm={logoutAll}
      />
    </>
  );
}
