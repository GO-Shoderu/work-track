import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { requireIdentity } from "../../../lib/auth/identity";
import { requireOrganisationAccess } from "../../../lib/auth/authorization";
import { managementReturnPath } from "../../../lib/provisioning/policy";

export const dynamic = "force-dynamic";
export default async function ManagedWorkspacePage({ params }: { params: Promise<{ organisationId: string }> }) {
  const identity = await requireIdentity();
  // Customers never adopt a URL-selected organisation, even their own.
  if (identity.profile.role === "customer") redirect("/workspace");
  const { organisationId } = await params;
  const { profile, organisation } = await requireOrganisationAccess(organisationId);
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context={`Managing Customer Workspace: ${organisation.name}`}>
    <Link className="text-sm underline" href={managementReturnPath(profile.role)}>Return to Platform Administration</Link>
    <section className="mt-6 rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">Recruitment workspace</h2><p className="mt-3 text-sm text-muted">Jobs, Candidates and recruitment workflows will be available in Milestone 4.</p></section>
  </WorkspaceShell>;
}
