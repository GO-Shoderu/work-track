import Link from "next/link";
import { AccountForm } from "../../components/provisioning/account-form";
import { WorkspaceShell } from "../../components/workspace-shell";
import { requireIdentity } from "../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const { profile, client } = await requireIdentity("platform_owner");
  const { data, error } = await client.from("organisations").select("id, name").order("name").limit(100);
  if (error) throw new Error("Organisations are temporarily unavailable.");

  const { data: admins, error: adminError } = await client
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin")
    .order("full_name")
    .limit(100);
  if (adminError) throw new Error("Admins are temporarily unavailable.");

  return (
    <WorkspaceShell title="Platform Administration" name={profile.full_name} context="Platform Owner">
      <div className="mb-8">
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Manage customer organisations, provision delegated administrators, and enter customer workspaces without sharing credentials.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Customer organisations</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{data.length}</p>
          <p className="mt-1 text-sm text-muted">Active tenant workspaces</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Delegated admins</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{admins.length}</p>
          <p className="mt-1 text-sm text-muted">Platform-managed administrators</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section className="rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Customers</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">Organisations</h2>
                <p className="mt-1 text-sm text-muted">Open an organisation to manage its people and workspace access.</p>
              </div>
              <AccountForm kind="organisation" />
            </div>
          </div>

          {data.length ? (
            <ul className="divide-y divide-border">
              {data.map((org) => (
                <li key={org.id} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-subtle">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{org.name}</p>
                    <p className="mt-1 text-xs text-muted">Customer organisation</p>
                  </div>
                  <Link
                    className="shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold transition hover:border-sidebar/20 hover:bg-subtle"
                    href={`/platform/organisations/${org.id}`}
                  >
                    Manage
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">No organisations yet</p>
              <p className="mt-1 text-sm text-muted">Create the first customer organisation to get started.</p>
            </div>
          )}
          {data.length === 100 && <p className="border-t border-border px-6 py-3 text-xs text-muted">Showing the first 100 organisations.</p>}
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Team</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">Delegated Admins</h2>
            <AccountForm kind="admin" />
          </div>
          {admins.length ? (
            <ul className="divide-y divide-border">
              {admins.map((admin) => (
                <li key={admin.id} className="flex items-center gap-3 px-6 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar text-xs font-bold text-white">
                    {admin.full_name.trim().charAt(0).toUpperCase() || "A"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{admin.full_name}</p>
                    <p className="mt-0.5 text-xs text-muted">ID {admin.id.slice(0, 8)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-8 text-sm text-muted">No delegated Admins yet.</p>
          )}
          {admins.length === 100 && <p className="border-t border-border px-6 py-3 text-xs text-muted">Showing the first 100 Admins.</p>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
