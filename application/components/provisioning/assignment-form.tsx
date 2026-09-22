"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeAssignment } from "../../lib/provisioning/actions";

export function AssignmentForm({
  organisationId,
  admins,
  assignedIds,
}: {
  organisationId: string;
  admins: { id: string; full_name: string }[];
  assignedIds: string[];
}) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const available = admins.filter((admin) => !assignedIds.includes(admin.id));

  function change(adminId: string, assign: boolean) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await changeAssignment({ adminId, organisationId, assign });
        setMessage(result.error ?? (assign ? "Admin assigned." : "Admin unassigned."));
        router.refresh();
      } catch {
        setMessage("Unable to confirm assignment. Refresh and check before retrying.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {assignedIds.length ? (
        <ul className="space-y-2">
          {assignedIds.map((adminId) => {
            const admin = admins.find((item) => item.id === adminId);
            const name = admin?.full_name ?? "Assigned Admin";
            return (
              <li key={adminId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-subtle p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-sidebar text-[11px] font-bold text-white">
                    {name.trim().charAt(0).toUpperCase() || "A"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">Access active</p>
                  </div>
                </div>
                <button disabled={pending} onClick={() => change(adminId, false)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  Unassign
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-subtle px-4 py-6 text-center text-sm text-muted">No Admins assigned.</p>
      )}

      {available.length > 0 && (
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); if (!pending) change(String(new FormData(event.currentTarget).get("adminId")), true); }}>
          <label htmlFor={id} className="text-xs font-semibold text-muted">
            Add administrator
            <select id={id} name="adminId" disabled={pending} required defaultValue="" className="mt-1.5 block w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-sidebar">
              <option value="" disabled>Select an Admin</option>
              {available.map((admin) => <option key={admin.id} value={admin.id}>{admin.full_name} · {admin.id.slice(0, 8)}</option>)}
            </select>
          </label>
          <button disabled={pending} className="rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-sidebar hover:bg-lime-hover disabled:opacity-50">
            Assign Admin
          </button>
        </form>
      )}

      {(pending || message) && <p role="status" className="text-xs text-muted">{pending ? "Updating assignment…" : message}</p>}
    </div>
  );
}
