"use client";

import { useEffect, useState } from "react";
import { JobRichTextEditor } from "./job-rich-text-editor";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20";

export function JobEditorLauncher() {
  const [open, setOpen] = useState(false);
  const [editorDocument, setEditorDocument] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-lime px-3.5 py-2 text-xs font-semibold text-sidebar transition hover:bg-lime-hover"
      >
        + New job
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8 sm:py-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-editor-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-[#f8f9fb] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-white px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Job editor</p>
            <h2 id="job-editor-title" className="mt-1 text-xl font-semibold tracking-[-0.025em]">Create a job</h2>
            <p className="mt-1 text-sm text-muted">
              Build the role now. Saving and publishing will be connected to the secure backend contract next.
            </p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f8f9fb]">Close</button>
        </div>

        <div className="grid gap-5 p-5 sm:p-6">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Job title</span>
            <input type="text" maxLength={200} placeholder="e.g. Backend Software Engineer" className={inputClass} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Closing date</span>
              <input type="date" className={inputClass} />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Closing time</span>
              <input type="time" className={inputClass} />
            </label>
          </div>

          <div className="grid gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Job description</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Use structured formatting for responsibilities, requirements and other role details.
              </p>
            </div>
            <JobRichTextEditor onChange={setEditorDocument} />
          </div>

          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-3">
            <p className="text-xs font-semibold text-sidebar">Local UI preview</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Nothing entered here is persisted yet. The buttons stay disabled until the Phase 2A
              server actions are reviewed and merged, so this UI cannot accidentally write to the
              hosted Supabase database.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted">Editor document: {editorDocument ? "ready" : "waiting for an edit"}</p>
            <div className="flex gap-2">
              <button type="button" disabled title="Secure draft persistence is being implemented in Phase 2A" className="rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-semibold opacity-45">Save draft</button>
              <button type="button" disabled title="Secure publishing is being implemented in Phase 2A" className="rounded-lg bg-sidebar px-4 py-2.5 text-xs font-semibold text-white opacity-45">Publish</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
