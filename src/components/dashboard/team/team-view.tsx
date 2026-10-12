"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Lock,
  MoreHorizontal,
  Pencil,
  Send,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/dashboard/primitives";
import { useSessionUser } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useUrlFilters } from "@/components/dashboard/use-url-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/lib/api/schemas";
import { ROLE_LABELS, ROLES, type SessionUser } from "@/lib/auth/permissions";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { STATUS_LABELS, canManage, filterMembers, memberStatus } from "@/lib/team/members";

import { MemberDialog } from "./member-dialog";
import { PasswordDialog } from "./password-dialog";

const FILTER_KEYS = ["q", "role", "status", "twofa"] as const;

type Pending =
  | { kind: "edit"; member: TeamMember }
  | { kind: "password"; member: TeamMember }
  | { kind: "deactivate"; member: TeamMember }
  | { kind: "reactivate"; member: TeamMember }
  | null;

function columns(
  me: SessionUser,
  open: (pending: Pending) => void,
  resend: (member: TeamMember) => void,
): ColumnDef<TeamMember>[] {
  return [
    {
      accessorKey: "full_name",
      header: "Name",
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-semibold text-text">
            {row.original.full_name}
            {row.original.id === me.id ? (
              <span className="font-normal text-text-muted"> (you)</span>
            ) : null}
          </span>
          <span className="text-caption text-text-muted">{row.original.email}</span>
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "owner" ? "primary" : "outline"}>
          {ROLE_LABELS[row.original.role]}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (member) => memberStatus(member),
      cell: ({ row }) => <StatusBadge kind="user" status={memberStatus(row.original)} />,
    },
    {
      accessorKey: "two_factor_enabled",
      header: "2FA",
      cell: ({ row }) =>
        row.original.two_factor_enabled ? (
          <span className="inline-flex items-center gap-1 text-status-positive-text">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> On
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-text-muted">
            <ShieldOff className="h-4 w-4" aria-hidden="true" /> Off
          </span>
        ),
    },
    {
      accessorKey: "last_login_at",
      header: "Last sign in",
      sortingFn: "datetime",
      sortUndefined: "last",
      cell: ({ row }) => <DateTimeText value={row.original.last_login_at} style="short" />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        if (member.id === me.id) {
          // Nobody changes their own role or access; the name lives on the account page.
          return (
            <Link
              href="/account"
              className="font-body text-caption font-semibold text-accent underline-offset-4 hover:underline"
            >
              Edit your profile
            </Link>
          );
        }
        if (member.role === "owner") {
          return (
            <span
              className="inline-flex items-center gap-1 text-caption text-text-muted"
              data-testid="owner-protected"
            >
              <Lock className="h-4 w-4" aria-hidden="true" /> Protected
            </span>
          );
        }
        if (!canManage(me, member)) return null;
        const status = memberStatus(member);
        return (
          <Menu>
            <MenuTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                aria-label={`Actions for ${member.full_name}`}
                data-testid="member-actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => open({ kind: "edit", member })}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit role and access
              </MenuItem>
              {status === "invited" ? (
                <MenuItem onSelect={() => resend(member)}>
                  <Send className="h-4 w-4" aria-hidden="true" /> Resend invitation
                </MenuItem>
              ) : null}
              {status === "active" ? (
                <MenuItem onSelect={() => open({ kind: "password", member })}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" /> Reset password
                </MenuItem>
              ) : null}
              {status === "deactivated" ? (
                <>
                  <MenuSeparator />
                  <MenuItem onSelect={() => open({ kind: "reactivate", member })}>
                    <UserCheck className="h-4 w-4" aria-hidden="true" /> Reactivate
                  </MenuItem>
                </>
              ) : null}
              {status === "active" ? (
                <>
                  <MenuSeparator />
                  <MenuItem
                    className="text-error-text"
                    onSelect={() => open({ kind: "deactivate", member })}
                  >
                    <UserX className="h-4 w-4" aria-hidden="true" /> Deactivate
                  </MenuItem>
                </>
              ) : null}
            </MenuContent>
          </Menu>
        );
      },
    },
  ];
}

/** Team page: everyone who can sign in to the dashboard. Owner and admin only. */
export function TeamView() {
  const me = useSessionUser();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const [pending, setPending] = React.useState<Pending>(null);
  const [inviting, setInviting] = React.useState(false);

  const team = useQuery({ queryKey: ["team"], queryFn: () => admin<TeamMember[]>("/team") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team"] });

  const resend = useMutation({
    mutationFn: (member: TeamMember) =>
      admin<TeamMember>(`/team/${member.id}/resend-invite`, { method: "POST" }),
    onSuccess: (member) => {
      toast.success(`A new invitation is on its way to ${member.email}.`);
      void refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const setActive = async (member: TeamMember, active: boolean) => {
    try {
      if (active) await admin(`/team/${member.id}`, { method: "PATCH", json: { is_active: true } });
      else await admin(`/team/${member.id}`, { method: "DELETE" });
      toast.success(
        active
          ? `${member.full_name} can sign in again.`
          : `${member.full_name} can no longer sign in.`,
      );
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const rows = React.useMemo(
    () => (team.data ? filterMembers(team.data, filters) : undefined),
    [team.data, filters],
  );
  const tableColumns = React.useMemo(
    () => columns(me, setPending, (member) => resend.mutate(member)),
    [me, resend],
  );
  const onFilter = React.useCallback(
    (key: string, value: string) => setFilters({ [key]: value }),
    [setFilters],
  );

  return (
    <>
      <PageHeader
        title="Team"
        description="Who can sign in to the dashboard and what each person can see and change."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Admin" }, { label: "Team" }]}
        actions={
          <Button
            variant="accent"
            size="sm"
            onClick={() => setInviting(true)}
            data-testid="invite-member"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite someone
          </Button>
        }
      />
      <FilterBar
        search={{ value: filters.q, label: "Search", placeholder: "Name or email" }}
        selects={[
          {
            key: "role",
            label: "Role",
            value: filters.role,
            options: ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
          },
          {
            key: "status",
            label: "Status",
            value: filters.status,
            options: (["active", "invited", "deactivated"] as const).map((s) => ({
              value: s,
              label: STATUS_LABELS[s],
            })),
          },
          {
            key: "twofa",
            label: "Two factor",
            value: filters.twofa,
            options: [
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ],
          },
        ]}
        onChange={onFilter}
        onReset={() => setFilters({ q: null, role: null, status: null, twofa: null })}
      />
      <DataTable
        caption="Team members"
        columns={tableColumns}
        data={rows}
        isLoading={team.isPending}
        error={team.isError ? errorMessage(team.error) : null}
        onRetry={() => void team.refetch()}
        emptyTitle={team.data?.length ? "Nobody matches these filters" : "No team members yet"}
        emptyDescription={
          team.data?.length
            ? "Try a different search or clear the filters."
            : "Invite someone to get started."
        }
        getRowId={(member) => member.id}
        testId="team-table"
      />

      <MemberDialog
        open={inviting || pending?.kind === "edit"}
        member={pending?.kind === "edit" ? pending.member : null}
        onOpenChange={(open) => {
          if (!open) {
            setInviting(false);
            setPending(null);
          }
        }}
        onSaved={() => void refresh()}
      />
      <PasswordDialog
        member={pending?.kind === "password" ? pending.member : null}
        onOpenChange={(open) => !open && setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === "deactivate"}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Deactivate ${pending?.member.full_name ?? ""}?`}
        description="They will be signed out everywhere and cannot sign in until you reactivate them. Nothing they created is deleted."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => (pending ? setActive(pending.member, false) : undefined)}
      />
      <ConfirmDialog
        open={pending?.kind === "reactivate"}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Reactivate ${pending?.member.full_name ?? ""}?`}
        description="They can sign in again with their existing password and page access."
        confirmLabel="Reactivate"
        onConfirm={() => (pending ? setActive(pending.member, true) : undefined)}
      />
    </>
  );
}
