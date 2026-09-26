import { RecruitmentWorkspace } from "../../components/recruitment/recruitment-workspace";
import { WorkspaceShell } from "../../components/workspace-shell";
import { requireOrganisationAccess } from "../../lib/auth/authorization";
import { requireIdentity } from "../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  await requireIdentity("customer");
  const { profile, organisation } = await requireOrganisationAccess();
  const careersSlug = (organisation as typeof organisation & { careers_slug?: string }).careers_slug;

  return (
    <WorkspaceShell
      title={organisation.name}
      name={profile.full_name}
      context="Customer workspace"
      workspaceBasePath="/workspace"
      currentSection="overview"
    >
      <RecruitmentWorkspace view="overview" careersSlug={careersSlug} />
    </WorkspaceShell>
  );
}
