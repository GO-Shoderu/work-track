import { RecruitmentWorkspace } from "../../../components/recruitment/recruitment-workspace";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../lib/auth/authorization";
import { requireIdentity } from "../../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ editJob?: string | string[] }>;
}) {
  await requireIdentity("customer");
  const { profile, organisation } = await requireOrganisationAccess();
  const careersSlug = (organisation as typeof organisation & { careers_slug?: string }).careers_slug;
  const query = await searchParams;
  const editJobId = typeof query.editJob === "string" ? query.editJob : undefined;

  return (
    <WorkspaceShell title={organisation.name} name={profile.full_name} context="Customer workspace" workspaceBasePath="/workspace" currentSection="jobs">
      <RecruitmentWorkspace view="jobs" editJobId={editJobId} careersSlug={careersSlug} />
    </WorkspaceShell>
  );
}
