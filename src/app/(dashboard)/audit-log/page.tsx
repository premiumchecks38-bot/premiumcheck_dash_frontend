"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Monitor,
  Search,
  Shield,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditFacets, AuditLog } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatTime } from "@/lib/utils/format";

export default function AuditLogPage() {
  const [action, setAction] = React.useState<string>("");
  const [entityType, setEntityType] = React.useState<string>("");
  const [actorId, setActorId] = React.useState<string>("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Facets query
  const facetsQuery = useQuery({
    queryKey: ["admin", "audit-logs", "facets"],
    queryFn: () => admin<AuditFacets>("/admin/audit-logs/facets"),
  });

  // Logs query
  const logsQuery = useQuery({
    queryKey: ["admin", "audit-logs", action, entityType, actorId],
    queryFn: async () => {
      const res = await adminPage<AuditLog[]>("/admin/audit-logs", {
        query: {
          action: action || undefined,
          entity_type: entityType || undefined,
          admin_user_id: actorId || undefined,
          page_size: 50,
        },
      });
      return res.data;
    },
  });

  const facets = facetsQuery.data;
  const logs = logsQuery.data ?? [];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Immutable record of administrative actions, account updates and configuration changes."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Admin" },
          { label: "Audit log" },
        ]}
      />

      <div className="space-y-6">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashboard-border bg-dashboard-card p-3 text-xs">
          <div className="flex items-center gap-1.5 text-dashboard-muted font-medium">
            <Filter className="h-3.5 w-3.5" /> Filters:
          </div>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-8 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:outline-none"
          >
            <option value="">All actions</option>
            {facets?.actions?.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-8 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:outline-none"
          >
            <option value="">All entity types</option>
            {facets?.entity_types?.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>

          <select
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="h-8 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:outline-none"
          >
            <option value="">All team members</option>
            {facets?.actors?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.email})
              </option>
            ))}
          </select>

          {(action || entityType || actorId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAction("");
                setEntityType("");
                setActorId("");
              }}
              className="h-8 text-xs text-dashboard-muted hover:text-dashboard-text"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Audit Log Table */}
        {logsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : logsQuery.isError ? (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage(logsQuery.error)}</span>
          </Alert>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dashboard-border p-12 text-center text-sm text-dashboard-muted">
            No audit log records found for the selected criteria.
          </div>
        ) : (
          <div className="rounded-lg border border-dashboard-border bg-dashboard-card overflow-hidden">
            <div className="divide-y divide-dashboard-border">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasChanges = Boolean(log.changes && Object.keys(log.changes).length > 0);

                return (
                  <div key={log.id} className="transition-colors hover:bg-dashboard-surface/20">
                    <div
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-4 p-4",
                        hasChanges && "cursor-pointer",
                      )}
                      onClick={() => hasChanges && toggleExpand(log.id)}
                    >
                      <div className="flex items-center gap-3">
                        {hasChanges ? (
                          <span className="text-dashboard-muted">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        ) : (
                          <div className="w-4" />
                        )}

                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-dashboard-text bg-dashboard-surface px-2 py-0.5 rounded border border-dashboard-border">
                              {log.action}
                            </span>
                            <span className="text-xs text-dashboard-muted font-medium">
                              on <strong>{log.entity_type}</strong>
                              {log.entity_id && (
                                <span className="ml-1 font-mono text-[11px] opacity-70">
                                  ({log.entity_id.slice(0, 8)}...)
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-dashboard-muted">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.actor ? `${log.actor.full_name} (${log.actor.email})` : "System Automated"}
                            </span>
                            {log.ip_address && (
                              <span className="font-mono">IP: {log.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-xs text-dashboard-muted">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.created_at, "short")} at {formatTime(log.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Diff viewer when expanded */}
                    {isExpanded && hasChanges && (
                      <div className="border-t border-dashboard-border bg-dashboard-surface/40 p-4">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-dashboard-muted mb-2">
                          Changes Payload
                        </h4>
                        <pre className="max-h-60 overflow-auto rounded bg-dashboard-background p-3 text-[11px] font-mono text-dashboard-text leading-relaxed">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
