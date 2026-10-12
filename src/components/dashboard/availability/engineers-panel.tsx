"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Phone, Plus, Search, Trash2, User, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { CheckField, TextField } from "@/components/dashboard/content/text-field";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/dashboard/primitives";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useSave } from "@/components/dashboard/use-save";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Engineer } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cleanDeep } from "@/lib/text/clean";

interface EngineerFormState {
  full_name: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

export function EngineersPanel() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("availability");

  const [search, setSearch] = React.useState("");
  const [filterActive, setFilterActive] = React.useState<"all" | "active" | "inactive">("all");
  const [editingEngineer, setEditingEngineer] = React.useState<Engineer | "new" | null>(null);
  const [deletingEngineer, setDeletingEngineer] = React.useState<Engineer | null>(null);

  const query = useQuery({
    queryKey: ["admin", "engineers"],
    queryFn: () => admin<Engineer[]>("/engineers"),
  });

  const engineers = query.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "engineers"] });
    await queryClient.invalidateQueries({ queryKey: ["booking-options"] });
  };

  const filtered = engineers.filter((eng) => {
    if (filterActive === "active" && !eng.is_active) return false;
    if (filterActive === "inactive" && eng.is_active) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      eng.full_name.toLowerCase().includes(q) ||
      (eng.email && eng.email.toLowerCase().includes(q)) ||
      (eng.phone && eng.phone.toLowerCase().includes(q)) ||
      (eng.notes && eng.notes.toLowerCase().includes(q))
    );
  });

  const handleToggleActive = async (engineer: Engineer) => {
    try {
      await admin(`/engineers/${engineer.id}/toggle-active`, { method: "POST" });
      toast.success(
        engineer.is_active
          ? `${engineer.full_name} is now inactive.`
          : `${engineer.full_name} is now active and can be assigned to bookings.`
      );
      await refresh();
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  };

  const handleDelete = async (engineer: Engineer) => {
    try {
      await admin(`/engineers/${engineer.id}`, { method: "DELETE" });
      toast.success(`${engineer.full_name} deleted.`);
      setDeletingEngineer(null);
      await refresh();
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="engineers-panel">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-h3 text-text">Engineers & Inspectors</h2>
          <p className="font-body text-small text-text-muted">
            Qualified engineers available to perform Gas, Electrical, EPC and safety inspections.
          </p>
        </div>

        {canEdit && (
          <Button
            size="sm"
            variant="accent"
            onClick={() => setEditingEngineer("new")}
            data-testid="add-engineer-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Add engineer
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-subtle/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or notes..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-caption text-text-muted mr-1">Status:</span>
          <button
            type="button"
            onClick={() => setFilterActive("all")}
            className={`rounded px-2.5 py-1 text-caption font-medium transition-colors ${
              filterActive === "all" ? "bg-primary text-white" : "bg-subtle text-text hover:bg-hover"
            }`}
          >
            All ({engineers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive("active")}
            className={`rounded px-2.5 py-1 text-caption font-medium transition-colors ${
              filterActive === "active" ? "bg-primary text-white" : "bg-subtle text-text hover:bg-hover"
            }`}
          >
            Active ({engineers.filter((e) => e.is_active).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive("inactive")}
            className={`rounded px-2.5 py-1 text-caption font-medium transition-colors ${
              filterActive === "inactive" ? "bg-primary text-white" : "bg-subtle text-text hover:bg-hover"
            }`}
          >
            Inactive ({engineers.filter((e) => !e.is_active).length})
          </button>
        </div>
      </div>

      {/* Content */}
      {query.isError ? (
        <Alert variant="error">{errorMessage(query.error)}</Alert>
      ) : query.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <User className="mx-auto h-8 w-8 text-text-muted opacity-50" />
          <p className="mt-2 font-medium text-text">No engineers found</p>
          <p className="text-caption text-text-muted">
            {search.trim() ? "Try modifying your search or filter." : "Click 'Add engineer' to register your first inspector."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-small">
              <thead>
                <tr className="border-b border-border bg-subtle/50 text-caption font-semibold text-text-muted">
                  <th className="px-4 py-3">Engineer name</th>
                  <th className="px-4 py-3">Contact details</th>
                  <th className="px-4 py-3">Qualifications / Notes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((eng) => (
                  <tr key={eng.id} className="hover:bg-hover/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-text">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-caption">
                          {eng.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-text">{eng.full_name}</div>
                          <div className="text-caption text-text-muted">Registered inspector</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted">
                      {eng.email && <div className="text-caption">{eng.email}</div>}
                      {eng.phone && (
                        <div className="text-caption flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" /> {eng.phone}
                        </div>
                      )}
                      {!eng.email && !eng.phone && <span className="text-caption text-text-muted">No contact info</span>}
                    </td>
                    <td className="px-4 py-3.5 text-text-muted max-w-xs">
                      {eng.notes ? (
                        <span className="line-clamp-2 text-caption">{eng.notes}</span>
                      ) : (
                        <span className="text-caption text-text-muted italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {eng.is_active ? (
                        <StatusBadge kind="content" status="active" label="Active" />
                      ) : (
                        <StatusBadge kind="content" status="inactive" label="Inactive" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {canEdit ? (
                        <Menu>
                          <MenuTrigger asChild>
                            <Button variant="ghost" size="xs" aria-label={`Actions for ${eng.full_name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </MenuTrigger>
                          <MenuContent align="end">
                            <MenuItem onSelect={() => setEditingEngineer(eng)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit details
                            </MenuItem>
                            <MenuItem onSelect={() => void handleToggleActive(eng)}>
                              {eng.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" /> Activate
                                </>
                              )}
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem className="text-error-text" onSelect={() => setDeletingEngineer(eng)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog for Add / Edit Engineer */}
      {editingEngineer ? (
        <EngineerDialog
          engineer={editingEngineer === "new" ? null : editingEngineer}
          onClose={() => setEditingEngineer(null)}
          onSaved={() => void refresh()}
        />
      ) : null}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingEngineer !== null}
        onOpenChange={(open) => !open && setDeletingEngineer(null)}
        title={`Delete ${deletingEngineer?.full_name ?? "engineer"}?`}
        description="This engineer will be permanently removed. Any past completed bookings with this engineer will retain their records, but they will no longer be available for upcoming bookings."
        confirmLabel="Delete engineer"
        destructive
        onConfirm={async () => {
          if (deletingEngineer) await handleDelete(deletingEngineer);
        }}
      />
    </div>
  );
}

function EngineerDialog({
  engineer,
  onClose,
  onSaved,
}: {
  engineer: Engineer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSave();

  const [form, setForm] = React.useState<EngineerFormState>({
    full_name: engineer?.full_name ?? "",
    email: engineer?.email ?? "",
    phone: engineer?.phone ?? "",
    notes: engineer?.notes ?? "",
    is_active: engineer?.is_active ?? true,
  });

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      save.setFieldErrors({ full_name: "Enter the engineer's name" });
      return;
    }

    const payload = cleanDeep({
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    });

    const ok = await save.run(
      () =>
        engineer
          ? admin(`/engineers/${engineer.id}`, { method: "PATCH", json: payload })
          : admin("/engineers", { method: "POST", json: payload }),
      engineer ? "Engineer details updated." : "New engineer added successfully."
    );

    if (ok) {
      onSaved();
      onClose();
    }
  };

  const isEditing = Boolean(engineer);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit: ${engineer?.full_name}` : "Add new engineer"}</DialogTitle>
          <DialogDescription>
            Register certified inspectors for dispatching and scheduling appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {save.error ? <Alert variant="error">{save.error}</Alert> : null}

          <TextField
            id="eng-name"
            label="Full name"
            required
            value={form.full_name}
            onChange={(full_name) => setForm((prev) => ({ ...prev, full_name }))}
            placeholder="e.g. David Miller"
            error={save.fieldErrors.full_name}
            maxLength={100}
          />

          <TextField
            id="eng-email"
            label="Email address"
            type="email"
            value={form.email}
            onChange={(email) => setForm((prev) => ({ ...prev, email }))}
            placeholder="e.g. david.miller@example.co.uk"
            hint="Used for notifications and dispatch alerts"
            error={save.fieldErrors.email}
          />

          <TextField
            id="eng-phone"
            label="UK phone number"
            type="tel"
            value={form.phone}
            onChange={(phone) => setForm((prev) => ({ ...prev, phone }))}
            placeholder="e.g. 07123 456789 or +447123456789"
            hint="Contact number for customers and coordination"
            error={save.fieldErrors.phone}
          />

          <TextField
            id="eng-notes"
            label="Certifications & Notes"
            multiline
            rows={3}
            maxLength={5000}
            value={form.notes}
            onChange={(notes) => setForm((prev) => ({ ...prev, notes }))}
            placeholder="e.g. Gas Safe Reg #123456, NICEIC Approved, covers North & East London..."
          />

          <div className="rounded-md border border-border bg-subtle/40 p-3">
            <CheckField
              id="eng-active"
              label="Active for new bookings"
              hint="Uncheck if the engineer is on leave or temporarily unavailable."
              checked={form.is_active}
              onChange={(is_active) => setForm((prev) => ({ ...prev, is_active }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            loading={save.busy}
            onClick={() => void handleSubmit()}
            data-testid="save-engineer-btn"
          >
            {isEditing ? "Save changes" : "Add engineer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
