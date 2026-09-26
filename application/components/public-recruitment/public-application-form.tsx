"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { applyToPublicJob } from "../../lib/public-recruitment/actions";

const fieldClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20";

type Result = { ok: true } | { ok: false; error: string };

export function PublicApplicationForm({
  jobTitle,
  careersSlug,
  publicId,
}: {
  jobTitle: string;
  careersSlug: string;
  publicId: string;
}) {
  const [fileMessage, setFileMessage] = useState("PDF only · maximum 5 MB");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setResult({ ok: false, error: "Choose a PDF CV before submitting." });
      return;
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setResult({ ok: false, error: "Your CV must be a PDF file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResult({ ok: false, error: "Your CV must be 5 MB or smaller." });
      return;
    }

    const phone = String(values.get("phone") ?? "").trim();
    const linkedinUrl = String(values.get("linkedinUrl") ?? "").trim();

    const upload = new FormData();
    upload.set("file", file);

    startTransition(async () => {
      const response = await applyToPublicJob(
        {
          careersSlug,
          publicId,
          fullName: String(values.get("fullName") ?? ""),
          email: String(values.get("email") ?? ""),
          phone: phone || null,
          linkedinUrl: linkedinUrl || null,
        },
        upload,
      );
      setResult(response);
      if (response.ok) form.reset();
    });
  }

  if (result?.ok) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="rounded-3xl border border-border bg-white p-7 text-center shadow-[0_1px_4px_rgb(13_15_20/0.05)] sm:p-10">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-lime-subtle text-xl font-bold text-[#405300]">✓</div>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Application received</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
            Your application for {jobTitle} has been submitted to the hiring organisation.
            AI-assisted assessment is advisory and does not make the hiring decision.
          </p>
          <Link href={`/careers/${careersSlug}`} className="mt-6 inline-flex rounded-xl bg-sidebar px-5 py-3 text-sm font-semibold text-white">
            Back to careers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="rounded-3xl border border-border bg-white p-6 shadow-[0_1px_4px_rgb(13_15_20/0.05)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Application</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Apply for {jobTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your application goes to the hiring organisation. Work Track does not make the hiring decision.
        </p>

        <form className="mt-7 grid gap-5" onSubmit={submit}>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Full name *</span>
            <input className={fieldClass} name="fullName" required maxLength={200} autoComplete="name" disabled={pending} />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Email *</span>
            <input className={fieldClass} name="email" required type="email" maxLength={254} autoComplete="email" disabled={pending} />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Phone</span>
            <input className={fieldClass} name="phone" type="tel" maxLength={50} autoComplete="tel" disabled={pending} />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">LinkedIn</span>
            <input className={fieldClass} name="linkedinUrl" type="url" maxLength={2048} placeholder="https://www.linkedin.com/in/..." disabled={pending} />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">CV *</span>
            <input
              className="block w-full rounded-xl border border-dashed border-border bg-subtle p-4 text-sm"
              name="file"
              required
              type="file"
              accept=".pdf,application/pdf"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return setFileMessage("PDF only · maximum 5 MB");
                if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return setFileMessage("Choose a PDF file.");
                if (file.size > 5 * 1024 * 1024) return setFileMessage("This file is larger than 5 MB.");
                setFileMessage(`${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`);
              }}
            />
            <span className="text-xs text-muted">{fileMessage}</span>
          </label>

          {result && !result.ok && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {result.error}
            </div>
          )}

          <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-xs leading-5 text-muted">
            Your CV is stored privately for this application. The hiring organisation can review it through Work Track.
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-sidebar px-5 py-3 text-sm font-semibold text-white transition hover:bg-sidebar-hover disabled:cursor-not-allowed disabled:opacity-55"
          >
            {pending ? "Submitting application…" : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}
