import Link from "next/link";
import { redirect } from "next/navigation";
import { JobApplicantsPanel } from "../../../../../../components/recruitment/job-applicants-panel";
import { WorkspaceShell } from "../../../../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../../../../lib/auth/authorization";
import { requireIdentity } from "../../../../../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function ManagedJobApplicantsPage({ params }: { params: Promise<{ organisationId: string; jobId: string }> }) {
  const identity = await requireIdentity();
  if (identity.profile.role === "customer") redirect("/workspace");
  const { organisationId, jobId } = await params;
  const { profile, organisation } = await requireOrganisationAccess(organisationId);
  const base = `/workspace/${organisation.id}`;
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context={`Managing Customer Workspace: ${organisation.name}`} workspaceBasePath={base} currentSection="jobs"><div className="mb-5"><Link href={`${base}/jobs`} className="text-xs font-semibold text-muted hover:text-sidebar">← Back to Jobs</Link></div><JobApplicantsPanel organisationId={organisation.id} jobId={jobId} /></WorkspaceShell>;
}
