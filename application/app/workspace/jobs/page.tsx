import { RecruitmentWorkspace } from "../../../components/recruitment/recruitment-workspace";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../lib/auth/authorization";
import { requireIdentity } from "../../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await requireIdentity("customer");
  const { profile, organisation } = await requireOrganisationAccess();
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context="Customer workspace" workspaceBasePath="/workspace" currentSection="jobs"><RecruitmentWorkspace view="jobs" /></WorkspaceShell>;
}
