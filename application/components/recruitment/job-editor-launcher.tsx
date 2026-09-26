"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createJobDraft,
  editJob,
  publishJob,
  saveJobDraft,
  type MutationResult,
} from "../../lib/recruitment/actions";
import {
  EMPTY_JOB_DOCUMENT,
  JobRichTextEditor,
  type JobEditorDocument,
} from "./job-rich-text-editor";

type EditableJob = {
  id: string;
  title: string;
  descriptionRich: unknown;
  closesAt: string | null;
  status: "draft" | "published";
  contentVersion: number;
};

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20";

function withScope(organisationId?: string) {
  return organisationId ? { organisationId } : {};
}

function safeDocument(value: unknown): JobEditorDocument {
  if (value && typeof value === "object" && !Array.isArray(value) && (value as { type?: unknown }).type === "doc") {
    return value as JobEditorDocument;
  }
  return EMPTY_JOB_DOCUMENT;
}

function localDateParts(value: string | null) {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function closingIso(date: string, time: string): string | null | "invalid" {
  if (!date && !time) return null;
  if (!date) return "invalid";
  const d = new Date(`${date}T${time || "23:59"}:00`);
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return "invalid";
  return d.toISOString();
}

function messageFor(result: MutationResult | null) {
  if (!result) return null;
  return result.ok ? "Saved successfully." : result.error;
}

export function JobEditorLauncher({
  organisationId,
  initialJob,
}: {
  organisationId?: string;
  initialJob?: EditableJob | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const editing = !!initialJob;
  const [open, setOpen] = useState(editing);
  const initialDocument = useMemo(() => safeDocument(initialJob?.descriptionRich), [initialJob?.descriptionRich]);
  const initialClosing = useMemo(() => localDateParts(initialJob?.closesAt ?? null), [initialJob?.closesAt]);
  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [date, setDate] = useState(initialClosing.date);
  const [time, setTime] = useState(initialClosing.time);
  const [editorDocument, setEditorDocument] = useState<JobEditorDocument>(initialDocument);
  const [result, setResult] = useState<MutationResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function close() {
    setResult(null);
    if (editing) {
      router.replace(pathname);
      return;
    }
    setOpen(false);
  }

  function contentPayload() {
    const closesAt = closingIso(date, time);
    if (closesAt === "invalid") {
      setResult({ ok: false, error: "Choose a valid future closing date, or leave both date and time empty." });
      return null;
    }
    if (!title.trim()) {
      setResult({ ok: false, error: "Enter a Job title." });
      return null;
    }
    return { closesAt, title: title.trim(), descriptionRich: editorDocument };
  }

  function finish(response: MutationResult) {
    setResult(response);
    if (response.ok) {
      if (editing) router.replace(pathname);
      else setOpen(false);
      router.refresh();
    }
  }

  function save(publishAfter = false) {
    const payload = contentPayload();
    if (!payload) return;
    setResult(null);
    startTransition(async () => {
      if (!initialJob) {
        const created = await createJobDraft({ ...withScope(organisationId), ...payload });
        if (!created.ok || !publishAfter) {
          finish(created);
          return;
        }
        const published = await publishJob({ ...withScope(organisationId), jobId: created.id });
        finish(published.ok ? published : { ok: false, error: `Draft saved, but publishing failed: ${published.error}` });
        return;
      }

      const saveExisting = initialJob.status === "draft" ? saveJobDraft : editJob;
      const saved = await saveExisting({
        ...withScope(organisationId),
        jobId: initialJob.id,
        contentVersion: initialJob.contentVersion,
        ...payload,
      });
      if (!saved.ok || !publishAfter) {
        finish(saved);
        return;
      }
      const published = await publishJob({ ...withScope(organisationId), jobId: initialJob.id });
      finish(published.ok ? published : { ok: false, error: `Changes saved, but publishing failed: ${published.error}` });
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-lime px-3.5 py-2 text-xs font-semibold text-sidebar transition hover:bg-lime-hover">
        + New job
      </button>
    );
  }

  const canPublish = !initialJob || initialJob.status === "draft";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8 sm:py-12" role="dialog" aria-modal="true" aria-labelledby="job-editor-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) close(); }}>
      <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-[#f8f9fb] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-white px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Job editor</p>
            <h2 id="job-editor-title" className="mt-1 text-xl font-semibold tracking-[-0.025em]">{editing ? "Edit job" : "Create a job"}</h2>
            <p className="mt-1 text-sm text-muted">{editing ? "Update the role while preserving the structured Job description." : "Create a draft, then publish when the role is ready."}</p>
          </div>
          <button type="button" onClick={close} disabled={pending} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f8f9fb] disabled:opacity-50">Close</button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 sm:p-6">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Job title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} type="text" maxLength={200} placeholder="e.g. Backend Software Engineer" className={inputClass} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Closing date</span>
              <input value={date} onChange={(event) => setDate(event.target.value)} type="date" className={inputClass} />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Closing time</span>
              <input value={time} onChange={(event) => setTime(event.target.value)} type="time" className={inputClass} />
            </label>
          </div>

          <div className="grid gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Job description</p>
              <p className="mt-1 text-xs leading-5 text-muted">Use headings, emphasis and lists to keep the role easy to scan.</p>
            </div>
            <JobRichTextEditor initialContent={initialDocument} onChange={setEditorDocument} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-xs ${result?.ok ? "text-[#4d6600]" : result ? "text-red-700" : "text-muted"}`} role={result?.ok ? "status" : result ? "alert" : undefined}>
              {messageFor(result) ?? (editing ? `Version ${initialJob.contentVersion}` : "New Jobs begin as private drafts.")}
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => save(false)} className="rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-50">
                {pending ? "Saving…" : editing && initialJob.status === "published" ? "Save changes" : "Save draft"}
              </button>
              {canPublish && (
                <button type="button" disabled={pending} onClick={() => save(true)} className="rounded-lg bg-sidebar px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                  {pending ? "Working…" : "Publish"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
