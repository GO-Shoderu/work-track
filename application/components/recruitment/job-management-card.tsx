"use client";

import { useState } from "react";

export type JobUiStatus = "draft" | "published" | "closed" | "archived";

const statusStyles: Record<JobUiStatus, string> = {
  draft: "border-gray-200 bg-gray-100 text-gray-700",
  published: "border-lime/40 bg-lime/15 text-[#4d6600]",
  closed: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-gray-200 bg-white text-muted",
};

function statusLabel(status: JobUiStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDeadline(value: string | null) {
  if (!value) return "No closing date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Closing date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function JobStatusBadge({ status }: { status: JobUiStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ShareJobButton({
  publicUrl,
  title,
}: {
  publicUrl: string | null;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const disabled = !publicUrl;

  async function share() {
    if (!publicUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: publicUrl });
        return;
      }
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Cancellation or clipboard denial should not break the Jobs screen.
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={share}
      title={disabled ? "Publish this Job to enable sharing" : "Share public Job link"}
      className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

export function JobManagementCard({
  title,
  description,
  status,
  closesAt,
  applicationCount,
  publicUrl,
}: {
  title: string;
  description: string | null;
  status: JobUiStatus;
  closesAt: string | null;
  applicationCount: number;
  publicUrl: string | null;
}) {
  const isPublished = status === "published";

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_1px_3px_rgb(13_15_20/0.05)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold tracking-[-0.015em]">{title}</h3>
            <JobStatusBadge status={status} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {description || (status === "draft"
              ? "Add a description before publishing this role."
              : "No public teaser is available yet.")}
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
        {isPublished && publicUrl ? (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-sidebar px-3 py-2 text-xs font-semibold text-white"
          >
            View public Job ↗
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Public preview becomes available after publishing"
            className="rounded-lg bg-sidebar px-3 py-2 text-xs font-semibold text-white opacity-40"
          >
            View
          </button>
        )}
        <ShareJobButton publicUrl={publicUrl} title={title} />
        <button
          type="button"
          disabled
          title="Job editing will be wired after the Phase 1 backend contracts are merged"
          className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold opacity-40"
        >
          Edit
        </button>
        <button
          type="button"
          disabled
          title={status === "draft" ? "Publish action will be wired after backend integration" : "Lifecycle action will be wired after backend integration"}
          className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold opacity-40"
        >
          {status === "draft" ? "Publish" : status === "published" ? "Close" : "Lifecycle"}
        </button>
      </div>

      {!isPublished && (
        <p className="mt-3 text-xs text-muted">
          {status === "draft"
            ? "Public link becomes available after this Job is published."
            : "This Job is not currently accepting public applications."}
        </p>
      )}
    </article>
  );
}
