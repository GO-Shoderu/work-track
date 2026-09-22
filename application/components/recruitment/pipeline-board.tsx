"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationStage } from "../../lib/recruitment/actions";
import type { ApplicationStage } from "../../lib/supabase/database.types";
import { stages } from "../../lib/validation/recruitment";

type PipelineApplication = {
  id: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  stage: ApplicationStage;
};

const labels: Record<ApplicationStage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const stageDot: Record<ApplicationStage, string> = {
  applied: "bg-stage-applied",
  screening: "bg-stage-screening",
  interview: "bg-stage-interview",
  offer: "bg-stage-offer",
  hired: "bg-stage-hired",
  rejected: "bg-stage-rejected",
};

export function PipelineBoard({
  organisationId,
  jobs,
  applications,
}: {
  organisationId?: string;
  jobs: { id: string; title: string }[];
  applications: PipelineApplication[];
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [stageError, setStageError] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = candidateName.trim().toLocaleLowerCase();
    return applications.filter((application) =>
      (!jobId || application.jobId === jobId) &&
      (!term || application.candidateName.toLocaleLowerCase().includes(term))
    );
  }, [applications, candidateName, jobId]);

  function changeStage(applicationId: string, stage: ApplicationStage) {
    setStageError("");
    setPendingId(applicationId);
    startTransition(async () => {
      const result = await updateApplicationStage({
        ...(organisationId ? { organisationId } : {}),
        applicationId,
        stage,
      });
      setPendingId(null);
      if (result.ok) {
        router.refresh();
      } else {
        setStageError(result.error);
      }
    });
  }

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="relative">
          <span className="sr-only">Search candidate</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" strokeLinecap="round" />
          </svg>
          <input
            value={candidateName}
            onChange={(event) => setCandidateName(event.target.value)}
            placeholder="Search candidate…"
            className="w-full rounded-xl border border-border bg-subtle py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20"
          />
        </label>
        <select
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
          className="rounded-xl border border-border bg-subtle px-3.5 py-2.5 text-sm outline-none focus:border-[#9bbb00]"
        >
          <option value="">All jobs</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
      </div>

      {stageError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{stageError}</p>}

      {applications.length ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1140px] grid-cols-6 gap-3">
            {stages.map((stage) => {
              const stageApplications = filtered.filter((application) => application.stage === stage);
              return (
                <section key={stage} className="rounded-xl bg-subtle p-3">
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <span className={`size-2 rounded-full ${stageDot[stage]}`} />
                      {labels[stage]}
                    </span>
                    <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-semibold text-muted">
                      {stageApplications.length}
                    </span>
                  </header>
                  <div className="space-y-2.5">
                    {stageApplications.map((application) => (
                      <article key={application.id} className="rounded-xl border border-border bg-white p-3 shadow-[0_1px_2px_rgb(13_15_20/0.04)]">
                        <div className="flex items-start gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar text-[11px] font-bold text-white">
                            {application.candidateName.trim().charAt(0).toUpperCase() || "C"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{application.candidateName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">{application.jobTitle}</p>
                          </div>
                        </div>
                        <select
                          aria-label={`Stage for ${application.candidateName}`}
                          value={application.stage}
                          disabled={pendingId === application.id}
                          onChange={(event) => changeStage(application.id, event.target.value as ApplicationStage)}
                          className="mt-3 w-full rounded-lg border border-border bg-subtle px-2.5 py-2 text-[11px] font-medium outline-none disabled:opacity-50"
                        >
                          {stages.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
                        </select>
                      </article>
                    ))}
                    {!stageApplications.length && (
                      <div className="rounded-xl border border-dashed border-border bg-white/60 px-3 py-6 text-center text-[11px] text-muted">
                        No candidates
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-subtle px-5 py-10 text-center">
          <p className="text-sm font-semibold">Your pipeline is empty</p>
          <p className="mt-1 text-sm text-muted">Create a job and candidate, then link them below.</p>
        </div>
      )}

      {applications.length > 0 && filtered.length === 0 && (
        <p className="mt-4 text-center text-xs text-muted">No applications match the current filters.</p>
      )}
    </>
  );
}
