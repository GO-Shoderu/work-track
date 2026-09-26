"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveJob, closeJob, publishJob, type MutationResult } from "../../lib/recruitment/actions";

export type JobUiStatus = "draft" | "published" | "closed" | "archived";

const statusStyles: Record<JobUiStatus, string> = {
  draft: "border-gray-200 bg-gray-100 text-gray-700",
  published: "border-lime/40 bg-lime/15 text-[#4d6600]",
  closed: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-gray-200 bg-white text-muted",
};

function withScope(organisationId?: string) {
  return organisationId ? { organisationId } : {};
}

function statusLabel(status: JobUiStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDeadline(value: string | null) {
  if (!value) return "No closing date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Closing date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function JobStatusBadge({ status }: { status: JobUiStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyles[status]}`}>{statusLabel(status)}</span>;
}

export function JobManagementCard({
  organisationId,
  jobId,
  title,
  description,
  status,
  closesAt,
  applicationCount,
}: {
  organisationId?: string;
  jobId: string;
  title: string;
  description: string | null;
  status: JobUiStatus;
  closesAt: string | null;
  applicationCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult | null>(null);

  function transition(next: "published" | "closed" | "archived") {
    setResult(null);
    startTransition(async () => {
      const input = { ...withScope(organisationId), jobId };
      const response = next === "published" ? await publishJob(input) : next === "closed" ? await closeJob(input) : await archiveJob(input);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  const editable = status === "draft" || status === "published";

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_1px_3px_rgb(13_15_20/0.05)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold tracking-[-0.015em]">{title}</h3>
            <JobStatusBadge status={status} />
          </div>
          <p
            className="mt-2 max-w-3xl line-clamp-3 text-sm leading-6 text-muted"
            title={description ?? undefined}
          >
            {description || (status === "draft" ? "Add a description before publishing this role." : "No description available.")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Applications</p>
          <p className="mt-1 text-sm font-semibold">{applicationCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Closing date</p>
          <p className="mt-1 text-sm font-semibold">{formatDeadline(closesAt)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" disabled title="Public Job view is added in the public recruitment phase" className="rounded-lg bg-sidebar px-3 py-2 text-xs font-semibold text-white opacity-40">View</button>
        <button type="button" disabled title="Sharing is enabled once the public Job route exists" className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold opacity-40">Share</button>
        {editable && (
          <Link
            href={
              organisationId
                ? `/workspace/${organisationId}/jobs?editJob=${encodeURIComponent(jobId)}`
                : `/workspace/jobs?editJob=${encodeURIComponent(jobId)}`
            }
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold transition hover:border-gray-300"
          >
            Edit
          </Link>
        )}
        {status === "draft" && <button type="button" disabled={pending} onClick={() => transition("published")} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{pending ? "Working…" : "Publish"}</button>}
        {status === "published" && <button type="button" disabled={pending} onClick={() => transition("closed")} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{pending ? "Working…" : "Close"}</button>}
        {(status === "draft" || status === "closed") && <button type="button" disabled={pending} onClick={() => transition("archived")} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{pending ? "Working…" : "Archive"}</button>}
      </div>

      {result && <p role={result.ok ? "status" : "alert"} className={`mt-3 text-xs ${result.ok ? "text-[#4d6600]" : "text-red-700"}`}>{result.ok ? "Updated successfully." : result.error}</p>}
      {status === "draft" && <p className="mt-3 text-xs text-muted">This Job is private until it is published.</p>}
      {status === "closed" && <p className="mt-3 text-xs text-muted">This Job is closed to new Applications.</p>}
      {status === "archived" && <p className="mt-3 text-xs text-muted">Archived Jobs are read-only.</p>}
    </article>
  );
}
