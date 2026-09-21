import { WorkspaceShell } from "../../components/workspace-shell";
import { requireIdentity } from "../../lib/auth/identity";
import { requireOrganisationAccess } from "../../lib/auth/authorization";
export const dynamic = "force-dynamic";
export default async function WorkspacePage() {
  await requireIdentity("customer");
  const { profile, organisation } = await requireOrganisationAccess();
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context="Customer workspace"><section className="rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">Welcome, {profile.full_name}</h2><p className="mt-3 text-sm text-muted">You are signed in to {organisation.name}.</p><p className="mt-3 text-sm text-muted">Recruitment features will be available in a later milestone.</p></section></WorkspaceShell>;
}
