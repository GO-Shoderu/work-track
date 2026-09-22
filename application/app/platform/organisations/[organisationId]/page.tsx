import Link from "next/link";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { AccountForm } from "../../../../components/provisioning/account-form";
import { AssignmentForm } from "../../../../components/provisioning/assignment-form";
import { requireIdentity } from "../../../../lib/auth/identity";
import { requireOrganisationAccess } from "../../../../lib/auth/authorization";

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
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context="Platform Owner">
    <nav className="mb-6 flex flex-wrap gap-6 text-sm"><Link className="underline" href="/platform">Return to Platform Administration</Link><Link className="underline" href={`/workspace/${organisation.id}`}>Manage workspace</Link></nav>
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">Customer accounts</h2><AccountForm kind="customer" organisationId={organisation.id} />
        <ul className="mt-4 divide-y divide-border">{customers.data.map((customer) => <li key={customer.id} className="py-3 text-sm">{customer.full_name}<span className="ml-3 text-xs text-muted">{customer.id.slice(0, 8)}</span></li>)}</ul>
        {!customers.data.length && <p className="mt-3 text-sm text-muted">No Customer accounts.</p>}
        {customers.data.length === 100 && <p className="text-sm text-muted">Showing the first 100 Customer accounts.</p>}
      </section>
      <section className="rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">Assigned Admins</h2><AssignmentForm organisationId={organisation.id} admins={admins.data} assignedIds={assignments.data.map((row) => row.admin_id)} />
        {(admins.data.length === 100 || assignments.data.length === 100) && <p className="text-sm text-muted">Showing up to 100 Admins and assignments.</p>}
      </section>
    </div>
  </WorkspaceShell>;
}
