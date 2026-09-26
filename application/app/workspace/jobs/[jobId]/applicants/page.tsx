import Link from "next/link";
import { JobApplicantsPanel } from "../../../../../components/recruitment/job-applicants-panel";
import { WorkspaceShell } from "../../../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../../../lib/auth/authorization";
import { requireIdentity } from "../../../../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function JobApplicantsPage({ params }: { params: Promise<{ jobId: string }> }) {
  await requireIdentity("customer");
  const { jobId } = await params;
  const { profile, organisation } = await requireOrganisationAccess();
  return <WorkspaceShell title={organisation.name} name={profile.full_name} context="Customer workspace" workspaceBasePath="/workspace" currentSection="jobs"><div className="mb-5"><Link href="/workspace/jobs" className="text-xs font-semibold text-muted hover:text-sidebar">← Back to Jobs</Link></div><JobApplicantsPanel jobId={jobId} /></WorkspaceShell>;
}
