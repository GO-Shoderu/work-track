import { RecruitmentWorkspace } from "../../../components/recruitment/recruitment-workspace";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../lib/auth/authorization";
import { requireIdentity } from "../../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ candidateId?: string | string[] }> }) {
  await requireIdentity("customer");
  const { profile, organisation } = await requireOrganisationAccess();
  const query = await searchParams;
  const candidateId = typeof query.candidateId === "string" ? query.candidateId : undefined;
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context="Customer workspace" workspaceBasePath="/workspace" currentSection="candidates"><RecruitmentWorkspace view="candidates" selectedCandidateId={candidateId} /></WorkspaceShell>;
}
