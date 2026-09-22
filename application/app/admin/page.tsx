import Link from "next/link";
import { AccountForm } from "../../components/provisioning/account-form";
import { WorkspaceShell } from "../../components/workspace-shell";
import { requireIdentity } from "../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile, client } = await requireIdentity("admin");
  // RLS checks assignments in the database, not a browser-supplied filter.
  const { data, error } = await client.from("organisations").select("id, name").order("name").limit(100);
  if (error) throw new Error("Organisations are temporarily unavailable.");

  return (
    <WorkspaceShell title="My Organisations" name={profile.full_name} context="Delegated Admin">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Work only within organisations assigned to you by the Platform Owner.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-right">
          <p className="text-2xl font-semibold tracking-[-0.04em]">{data.length}</p>
          <p className="text-xs text-muted">Assigned organisations</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Customer access</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">Assigned organisations</h2>
        </div>

        {data.length ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {data.map((org) => (
              <article key={org.id} className="rounded-2xl border border-border bg-subtle p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{org.name}</p>
                    <p className="mt-1 text-xs text-muted">Recruitment workspace</p>
                  </div>
                  <span className="size-2 rounded-full bg-lime" title="Access active" />
                </div>
                <Link
                  className="mt-5 inline-flex rounded-lg bg-sidebar px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sidebar-hover"
                  href={`/workspace/${org.id}`}
                >
                  Manage workspace
                </Link>
                <div className="mt-4 border-t border-border pt-4">
                  <AccountForm kind="customer" organisationId={org.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-subtle text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5">
                <path d="M4 7h16M7 4v6m10-6v6M5 11h14v9H5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="mt-4 text-sm font-semibold">No organisation assignments</p>
            <p className="mt-1 text-sm text-muted">Contact your Platform Owner to be assigned to a customer workspace.</p>
          </div>
        )}
        {data.length === 100 && <p className="border-t border-border px-6 py-3 text-xs text-muted">Showing the first 100 assigned organisations.</p>}
      </section>
    </WorkspaceShell>
  );
}
