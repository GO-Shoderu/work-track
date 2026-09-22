import Link from "next/link";
import { AccountForm } from "../../../../components/provisioning/account-form";
import { AssignmentForm } from "../../../../components/provisioning/assignment-form";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../../lib/auth/authorization";
import { requireIdentity } from "../../../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function OrganisationPage({ params }: { params: Promise<{ organisationId: string }> }) {
  await requireIdentity("platform_owner");
  const { organisationId } = await params;
  const { profile, client, organisation } = await requireOrganisationAccess(organisationId);

  const [customers, assignments, admins] = await Promise.all([
    client.from("profiles").select("id, full_name").eq("role", "customer").eq("organisation_id", organisation.id).order("full_name").limit(100),
    client.from("admin_organisation_assignments").select("admin_id").eq("organisation_id", organisation.id).limit(100),
    client.from("profiles").select("id, full_name").eq("role", "admin").order("full_name").limit(100),
  ]);

  if (customers.error || assignments.error || admins.error) throw new Error("Organisation details are temporarily unavailable.");

  return (
    <WorkspaceShell title={organisation.name} name={profile.full_name} context="Platform Owner">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Manage customer accounts, delegated access, and the live recruitment workspace.</p>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold hover:bg-subtle" href="/platform">← Platform</Link>
          <Link className="rounded-lg bg-sidebar px-3.5 py-2 text-xs font-semibold text-white hover:bg-sidebar-hover" href={`/workspace/${organisation.id}`}>Open workspace →</Link>
        </div>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Customer accounts</p>
          <p className="mt-3 text-3xl font-semibold">{customers.data.length}</p>
          <p className="mt-1 text-xs text-muted">Authenticated customer users</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Assigned admins</p>
          <p className="mt-3 text-3xl font-semibold">{assignments.data.length}</p>
          <p className="mt-1 text-xs text-muted">Delegated administrators with current access</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">People</p>
            <h2 className="mt-1 text-lg font-semibold">Customer accounts</h2>
            <p className="mt-1 text-sm text-muted">Users who sign directly into this customer workspace.</p>
            <AccountForm kind="customer" organisationId={organisation.id} />
          </div>
          {customers.data.length ? (
            <ul className="divide-y divide-border">
              {customers.data.map((customer) => (
                <li key={customer.id} className="flex items-center gap-3 px-6 py-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-sidebar text-xs font-bold text-white">
                    {customer.full_name.trim().charAt(0).toUpperCase() || "C"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{customer.full_name}</p>
                    <p className="mt-0.5 text-xs text-muted">Customer · {customer.id.slice(0, 8)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted">No Customer accounts.</p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Access</p>
            <h2 className="mt-1 text-lg font-semibold">Delegated Admins</h2>
            <p className="mt-1 text-sm text-muted">Grant or revoke administrative access to this organisation.</p>
          </div>
          <div className="p-6">
            <AssignmentForm organisationId={organisation.id} admins={admins.data} assignedIds={assignments.data.map((row) => row.admin_id)} />
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
