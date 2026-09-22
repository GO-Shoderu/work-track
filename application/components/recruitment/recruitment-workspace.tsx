import { readAssessmentResult } from "../../lib/assessment/context";
import { inspectCurrentCv } from "../../lib/cv/storage";
import { listCandidates, listJobs, listPipeline } from "../../lib/recruitment/queries";
import type { ApplicationStage } from "../../lib/supabase/database.types";
import { CandidateFilter } from "./candidate-filter";
import { CandidateCvAssessment } from "./candidate-cv-assessment";
import { PipelineBoard } from "./pipeline-board";
import { CreateApplicationForm, CreateCandidateForm, CreateJobForm } from "./recruitment-forms";

type RecruitmentView = "overview" | "pipeline" | "jobs" | "candidates";

type PipelineJoin = {
  id: string;
  candidate_id: string;
  job_id: string;
  stage: ApplicationStage;
  candidate: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
  job: { id: string; title: string } | { id: string; title: string }[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function RecruitmentWorkspace({
  organisationId,
  view = "overview",
}: {
  organisationId?: string;
  view?: RecruitmentView;
}) {
  const scope = organisationId ? { organisationId, limit: 100 } : { limit: 100 };
  const actionScope = organisationId ? { organisationId } : {};
  const [jobs, candidates, rawPipeline] = await Promise.all([
    listJobs(scope),
    listCandidates(scope),
    listPipeline(scope),
  ]);

  const pipeline = (rawPipeline as PipelineJoin[]).flatMap((row) => {
    const candidate = firstRelation(row.candidate);
    const job = firstRelation(row.job);
    if (!candidate || !job) return [];
    return [{ id: row.id, candidateId: row.candidate_id, candidateName: candidate.full_name, jobId: row.job_id, jobTitle: job.title, stage: row.stage }];
  });

  const needsCandidateDetails = view === "candidates";
  const cvEntries = needsCandidateDetails
    ? await Promise.all(candidates.map(async (candidate) => [candidate.id, await inspectCurrentCv({ ...actionScope, candidateId: candidate.id })] as const))
    : [];
  const assessmentEntries = needsCandidateDetails
    ? await Promise.all(pipeline.map(async (application) => [application.id, await readAssessmentResult({ ...actionScope, applicationId: application.id })] as const))
    : [];
  const cvs = new Map(cvEntries);
  const assessments = new Map(assessmentEntries);

  const representedJobs = new Set(pipeline.map((item) => item.jobId)).size;

  const stats = (
    <section className="grid gap-4 sm:grid-cols-3">
      {[
        ["Active jobs", String(jobs.length), "Roles in this workspace"],
        ["Candidates", String(candidates.length), "People in your talent pool"],
        ["Applications", String(pipeline.length), `${representedJobs} job${representedJobs === 1 ? "" : "s"} represented`],
      ].map(([label, value, caption]) => (
        <div key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
          <p className="mt-1 text-xs text-muted">{caption}</p>
        </div>
      ))}
    </section>
  );

  const pipelineSection = (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(13_15_20/0.03)] sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Recruitment pipeline</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">Candidate progress</h2>
        <p className="mt-1 text-sm text-muted">Filter by job or candidate and update stages as hiring progresses.</p>
      </div>
      <PipelineBoard organisationId={organisationId} jobs={jobs.map((job) => ({ id: job.id, title: job.title }))} applications={pipeline} />
    </section>
  );

  const jobsSection = (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
      <div className="border-b border-border p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Jobs</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Open roles</h2>
            <p className="mt-1 text-sm text-muted">Create and review roles available in this workspace.</p>
          </div>
          <CreateJobForm organisationId={organisationId} />
        </div>
      </div>
      {jobs.length ? (
        <ul className="divide-y divide-border">
          {jobs.map((job) => (
            <li key={job.id} className="px-5 py-5 sm:px-6">
              <p className="text-sm font-semibold">{job.title}</p>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-muted">{job.description || "No job description provided."}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-6 py-12 text-center text-sm text-muted">No jobs yet. Create the first role above.</p>
      )}
    </section>
  );

  const candidatesSection = (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
      <div className="border-b border-border p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Candidates</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Talent pool</h2>
            <p className="mt-1 text-sm text-muted">Maintain candidate profiles, CVs and job-fit assessments.</p>
          </div>
          <CreateCandidateForm organisationId={organisationId} />
        </div>
      </div>
      {needsCandidateDetails && (
        <div className="border-b border-border bg-[#f8f9fb] px-5 py-4 sm:px-6">
          <CandidateFilter targetId="candidate-directory" count={candidates.length} />
        </div>
      )}
      {candidates.length ? (
        <ul
          id="candidate-directory"
          className={needsCandidateDetails ? "space-y-4 bg-[#f8f9fb] p-4 sm:p-5" : "divide-y divide-border"}
        >
          {candidates.map((candidate) => {
            const applications = pipeline
              .filter((application) => application.candidateId === candidate.id)
              .map((application) => ({
                id: application.id,
                jobTitle: application.jobTitle,
                stage: application.stage,
                assessment: assessments.get(application.id) ?? null,
              }));
            return (
              <li
                key={candidate.id}
                data-candidate-search={`${candidate.full_name} ${candidate.email ?? ""}`.toLowerCase()}
                className={
                  needsCandidateDetails
                    ? "rounded-2xl border border-border bg-white p-5 shadow-[0_1px_3px_rgb(13_15_20/0.05)] sm:p-6"
                    : "px-5 py-5 sm:px-6"
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar text-sm font-semibold text-lime">
                      {candidate.full_name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold tracking-[-0.01em]">{candidate.full_name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{candidate.email || candidate.phone || "No contact details"}</p>
                      {needsCandidateDetails && (
                        <p className="mt-1 text-[11px] font-medium text-muted">
                          {applications.length} application{applications.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </div>
                  {candidate.linkedin_url && (
                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold underline decoration-border underline-offset-4">
                      LinkedIn ↗
                    </a>
                  )}
                </div>
                {needsCandidateDetails && (
                  <CandidateCvAssessment
                    organisationId={organisationId}
                    candidateId={candidate.id}
                    cv={cvs.get(candidate.id) ?? null}
                    applications={applications}
                  />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-6 py-12 text-center text-sm text-muted">No candidates yet. Add the first candidate above.</p>
      )}
    </section>
  );

  const applicationComposer = (
    <section className="rounded-2xl border border-border bg-sidebar p-5 text-white shadow-[0_1px_2px_rgb(13_15_20/0.03)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Applications</p>
          <h2 className="mt-2 text-xl font-semibold">Put a candidate into the pipeline</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-400">Link an existing candidate to a job. New applications start in Applied.</p>
        </div>
        <CreateApplicationForm organisationId={organisationId} candidates={candidates.map((candidate) => ({ id: candidate.id, name: candidate.full_name }))} jobs={jobs.map((job) => ({ id: job.id, title: job.title }))} />
      </div>
    </section>
  );

  if (view === "pipeline") return <div className="space-y-6">{pipelineSection}{applicationComposer}</div>;
  if (view === "jobs") return <div className="space-y-6">{jobsSection}</div>;
  if (view === "candidates") return <div className="space-y-6">{candidatesSection}{applicationComposer}</div>;

  return (
    <div className="space-y-6">
      {stats}
      {pipelineSection}
      <div className="grid gap-6 xl:grid-cols-2">{jobsSection}{candidatesSection}</div>
      {applicationComposer}
    </div>
  );
}
