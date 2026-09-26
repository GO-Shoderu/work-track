import Link from "next/link";
import { redirect } from "next/navigation";
import { RecruitmentWorkspace } from "../../../../components/recruitment/recruitment-workspace";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../../lib/auth/authorization";
import { requireIdentity } from "../../../../lib/auth/identity";
import { managementReturnPath } from "../../../../lib/provisioning/policy";

export const dynamic = "force-dynamic";

export default async function ManagedCandidatesPage({ params, searchParams }: { params: Promise<{ organisationId: string }>; searchParams: Promise<{ candidateId?: string | string[] }> }) {
  const identity = await requireIdentity();
  if (identity.profile.role === "customer") redirect("/workspace");
  const { organisationId } = await params;
  const { profile, organisation } = await requireOrganisationAccess(organisationId);
  const query = await searchParams;
  const candidateId = typeof query.candidateId === "string" ? query.candidateId : undefined;
  const workspaceBasePath = `/workspace/${organisation.id}`;
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context={`Managing Customer Workspace: ${organisation.name}`} workspaceBasePath={workspaceBasePath} currentSection="candidates"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex items-center gap-2 rounded-full border border-[#d8ef78] bg-lime-subtle px-3 py-1.5 text-xs font-semibold text-[#405300]"><span className="size-2 rounded-full bg-lime-hover" />Managing customer workspace</div><Link className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold hover:bg-subtle" href={managementReturnPath(profile.role)}>Return to administration</Link></div><RecruitmentWorkspace organisationId={organisation.id} view="candidates" selectedCandidateId={candidateId} /></WorkspaceShell>;
}
