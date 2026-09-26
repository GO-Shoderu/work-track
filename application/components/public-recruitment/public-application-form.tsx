"use client";

import { useState } from "react";

const fieldClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20";

export function PublicApplicationForm({
  jobTitle,
}: {
  jobTitle: string;
}) {
  const [fileMessage, setFileMessage] = useState("PDF only · maximum 5 MB");

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="rounded-3xl border border-border bg-white p-6 shadow-[0_1px_4px_rgb(13_15_20/0.05)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Application</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Apply for {jobTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your application goes to the hiring organisation. Work Track does not make the hiring decision.
        </p>

        <form className="mt-7 grid gap-5" onSubmit={(event) => event.preventDefault()}>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Full name *</span>
            <input className={fieldClass} required autoComplete="name" />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Email *</span>
            <input className={fieldClass} required type="email" autoComplete="email" />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Phone</span>
            <input className={fieldClass} type="tel" autoComplete="tel" />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">LinkedIn</span>
            <input className={fieldClass} type="url" placeholder="https://www.linkedin.com/in/..." />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">CV *</span>
            <input
              className="block w-full rounded-xl border border-dashed border-border bg-subtle p-4 text-sm"
              required
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setFileMessage("PDF only · maximum 5 MB");
                  return;
                }
                if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
                  setFileMessage("Choose a PDF file.");
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  setFileMessage("This file is larger than 5 MB.");
                  return;
                }
                setFileMessage(`${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`);
              }}
            />
            <span className="text-xs text-muted">{fileMessage}</span>
          </label>

          <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-xs leading-5 text-muted">
            Submission is intentionally disabled in this UI preview until the secure public-application backend is reviewed and merged.
          </div>

          <button
            type="submit"
            disabled
            className="rounded-xl bg-sidebar px-5 py-3 text-sm font-semibold text-white opacity-45"
          >
            Submit application
          </button>
        </form>
      </div>
    </div>
  );
}
