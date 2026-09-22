"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeAssignment } from "../../lib/provisioning/actions";

export function AssignmentForm({ organisationId, admins, assignedIds }: {
  organisationId: string; admins: { id: string; full_name: string }[]; assignedIds: string[];
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
      } catch { setMessage("Unable to confirm assignment. Refresh and check before retrying."); }
    });
  }
  return <div className="mt-4 space-y-4">
    <ul className="divide-y divide-border">{assignedIds.map((adminId) => <li key={adminId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{admins.find((admin) => admin.id === adminId)?.full_name ?? "Assigned Admin"}</span><button disabled={pending} onClick={() => change(adminId, false)} className="text-red-700 underline disabled:opacity-50">Unassign</button></li>)}</ul>
    {!assignedIds.length && <p className="text-sm text-muted">No Admins assigned.</p>}
    {available.length > 0 && <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (!pending) change(String(new FormData(event.currentTarget).get("adminId")), true); }}>
      <label htmlFor={id} className="text-sm">Admin<select id={id} name="adminId" disabled={pending} required className="mt-1 block rounded-lg border border-border bg-white px-3 py-2"><option value="">Select an Admin</option>{available.map((admin) => <option key={admin.id} value={admin.id}>{admin.full_name} · {admin.id.slice(0, 8)}</option>)}</select></label>
      <button disabled={pending} className="rounded-lg bg-lime hover:bg-lime-hover px-4 py-2 text-sm font-semibold disabled:opacity-50">Assign Admin</button>
    </form>}
    <p role="status" className="text-sm">{pending ? "Updating assignment…" : message}</p>
  </div>;
}
