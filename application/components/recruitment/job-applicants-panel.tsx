import Link from "next/link";
import { notFound } from "next/navigation";
import { readAssessmentResult } from "../../lib/assessment/context";
import { listJobApplications } from "../../lib/recruitment/job-applications";
import { getJobForEdit } from "../../lib/recruitment/queries";

function recommendationLabel(value: string) { if (value === "strong_match") return "Strong match"; if (value === "potential_match") return "Potential match"; return "Weak match"; }
function cvHref(applicationId: string, organisationId?: string) { const base = `/api/recruitment/applications/${encodeURIComponent(applicationId)}/cv`; return organisationId ? `${base}?organisationId=${encodeURIComponent(organisationId)}` : base; }

export async function JobApplicantsPanel({ organisationId, jobId }: { organisationId?: string; jobId: string; }) {
  const scope = organisationId ? { organisationId } : {};
  let job; let applicants;
  try { [job, applicants] = await Promise.all([getJobForEdit({ ...scope, jobId }), listJobApplications({ ...scope, jobId, limit: 100 })]); }
  catch { notFound(); }
  if (!job) notFound();
  const assessments = new Map(await Promise.all(applicants.map(async (application) => {
    try { return [application.id, await readAssessmentResult({ ...scope, applicationId: application.id })] as const; }
    catch { return [application.id, null] as const; }
  })));
  const candidatesBase = organisationId ? `/workspace/${organisationId}/candidates` : "/workspace/candidates";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
      <div className="border-b border-border p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Applicants</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">{job.title}</h2><p className="mt-1 text-sm text-muted">{applicants.length} applicant{applicants.length === 1 ? "" : "s"} for this Job.</p></div>
      {applicants.length ? <div className="grid gap-3 bg-[#f8f9fb] p-4 sm:p-5">{applicants.map((application) => {
        const assessment = assessments.get(application.id); const name = application.submitted_full_name || application.candidate.full_name; const email = application.submitted_email || application.candidate.email || "No email"; const linkedin = application.submitted_linkedin_url;
        return <article key={application.id} className="rounded-2xl border border-border bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-base font-semibold">{name}</p><p className="mt-1 text-xs text-muted">{email}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-subtle px-2.5 py-1 capitalize">{application.stage}</span><span className="rounded-full bg-subtle px-2.5 py-1">{application.source === "public" ? "Public application" : "Manual application"}</span><span className="rounded-full bg-subtle px-2.5 py-1 capitalize">AI: {application.assessment_status.replaceAll("_", " ")}</span></div></div><div className="flex flex-wrap gap-2"><Link href={`${candidatesBase}?candidateId=${encodeURIComponent(application.candidate_id)}`} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold">View candidate</Link>{application.cv_available && <a href={cvHref(application.id, organisationId)} target="_blank" rel="noreferrer" className="rounded-lg bg-sidebar px-3 py-2 text-xs font-semibold text-white">View CV</a>}{linkedin && <a href={linkedin} target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold">LinkedIn ↗</a>}</div></div><div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Applied</p><p className="mt-1 text-xs font-medium">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(application.created_at))}</p></div>{application.submitted_phone && <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Submitted phone</p><p className="mt-1 text-xs font-medium">{application.submitted_phone}</p></div>}<div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Assessment</p><p className="mt-1 text-xs font-medium">{assessment ? `${assessment.result.score}/100 · ${recommendationLabel(assessment.result.recommendation)}` : "No completed assessment"}</p></div></div></article>;
      })}</div> : <div className="px-6 py-14 text-center"><p className="font-semibold">No applicants yet.</p><p className="mt-2 text-sm text-muted">Public and manually-added Applications will appear here.</p></div>}
    </section>
  );
}
