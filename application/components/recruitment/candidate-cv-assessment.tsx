"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestJobCvAssessment } from "../../lib/assessment/actions";
import { uploadCandidateCv } from "../../lib/cv/actions";

type CvSummary = {
  candidateId: string;
  version: string;
  byteSize: number;
  updatedAt: string;
  fileName: string;
  contentType: string;
};

type Assessment = {
  applicationId: string;
  cvVersion: string;
  assessedAt: string;
  result: {
    score: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    recommendation: "strong_match" | "potential_match" | "weak_match";
    disclaimer: string;
  };
};

type CandidateApplication = {
  id: string;
  jobTitle: string;
  stage: string;
  source: "manual" | "public";
  cvAvailable: boolean;
  assessment: Assessment | null;
};

function scope(organisationId?: string) {
  return organisationId ? { organisationId } : {};
}

function recommendationLabel(value: Assessment["result"]["recommendation"]) {
  if (value === "strong_match") return "Strong match";
  if (value === "potential_match") return "Potential match";
  return "Weak match";
}

export function CandidateCvAssessment({
  organisationId,
  candidateId,
  cv,
  applications,
}: {
  organisationId?: string;
  candidateId: string;
  cv: CvSummary | null;
  applications: CandidateApplication[];
}) {
  const router = useRouter();
  const [uploading, startUpload] = useTransition();
  const [assessing, startAssessment] = useTransition();
  const [activeApplication, setActiveApplication] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <div className="rounded-xl border border-border bg-[#f8f9fb] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Candidate CV</p>
            <p className="mt-1 text-sm font-medium">
              {cv ? `${cv.fileName} · ${Math.max(1, Math.round(cv.byteSize / 1024))} KB` : "No CV uploaded"}
            </p>
            {cv && <p className="mt-1 text-xs text-muted">Current version secured in private storage.</p>}
          </div>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const formData = new FormData(formElement);
              setMessage(null);
              startUpload(async () => {
                const result = await uploadCandidateCv({ ...scope(organisationId), candidateId }, formData);
                if (result.ok) {
                  formElement.reset();
                  setMessage({ ok: true, text: cv ? "CV replaced successfully." : "CV uploaded successfully." });
                  router.refresh();
                } else {
                  setMessage({ ok: false, text: result.error });
                }
              });
            }}
          >
            <input
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={uploading}
              className="max-w-[230px] text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-sidebar"
            />
            <button disabled={uploading} className="rounded-lg bg-sidebar px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {uploading ? "Uploading…" : cv ? "Replace CV" : "Upload CV"}
            </button>
          </form>
        </div>
      </div>

      {applications.length ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AI job-fit assessment</p>
          {applications.map((application) => (
            <article key={application.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{application.jobTitle}</p>
                  <p className="mt-1 text-xs capitalize text-muted">Stage: {application.stage}</p>
                </div>
                <button
                  type="button"
                  disabled={!application.cvAvailable || assessing}
                  onClick={() => {
                    setMessage(null);
                    setActiveApplication(application.id);
                    startAssessment(async () => {
                      const result = await requestJobCvAssessment({ ...scope(organisationId), applicationId: application.id });
                      if (result.ok) {
                        setMessage({ ok: true, text: `Assessment completed for ${application.jobTitle}.` });
                        router.refresh();
                      } else {
                        setMessage({ ok: false, text: result.error });
                      }
                      setActiveApplication(null);
                    });
                  }}
                  className="rounded-lg bg-lime px-3.5 py-2 text-xs font-semibold text-sidebar disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {assessing && activeApplication === application.id ? "Assessing…" : application.assessment ? "Reassess CV" : "Assess CV"}
                </button>
              </div>

              {!application.cvAvailable && <p className="mt-3 text-xs text-muted">{application.source === "public" ? "The submitted Application CV is unavailable." : "Upload a readable PDF CV before running an assessment."}</p>}

              {application.assessment && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sidebar text-lg font-semibold text-white">
                      {application.assessment.result.score}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{recommendationLabel(application.assessment.result.recommendation)}</p>
                      <p className="text-xs text-muted">AI match score · 100</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-[#343841]">{application.assessment.result.summary}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Strengths</p>
                      {application.assessment.result.strengths.length ? (
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {application.assessment.result.strengths.map((item) => <li key={item}>✓ {item}</li>)}
                        </ul>
                      ) : <p className="mt-2 text-sm text-muted">No strengths returned.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Gaps</p>
                      {application.assessment.result.gaps.length ? (
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {application.assessment.result.gaps.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      ) : <p className="mt-2 text-sm text-muted">No material gaps returned.</p>}
                    </div>
                  </div>
                  <p className="rounded-lg bg-[#f4f5f7] px-3 py-2 text-xs leading-5 text-muted">{application.assessment.result.disclaimer}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">Add this candidate to a job to enable AI job-fit assessment.</p>
      )}

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-xs ${message.ok ? "text-[#4d6600]" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
