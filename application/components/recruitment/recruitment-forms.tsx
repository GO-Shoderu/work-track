"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createApplication,
  createCandidate,
  createJob,
  type MutationResult,
} from "../../lib/recruitment/actions";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20";
const darkInputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-lime/70 focus:ring-2 focus:ring-lime/20";

function withScope(organisationId?: string) {
  return organisationId ? { organisationId } : {};
}

function ResultMessage({ result, dark = false }: { result: MutationResult | null; dark?: boolean }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`mt-3 text-xs ${
        result.ok
          ? dark ? "text-lime" : "text-[#4d6600]"
          : dark ? "text-red-300" : "text-red-700"
      }`}
    >
      {result.ok ? "Saved successfully." : result.error}
    </p>
  );
}

export function CreateJobForm({ organisationId }: { organisationId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-lg bg-lime px-3.5 py-2 text-xs font-semibold text-sidebar hover:bg-lime-hover">
        + New job
      </button>
    );
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      setResult(null);
      startTransition(async () => {
        const response = await createJob({
          ...withScope(organisationId),
          title: form.get("title"),
          description: form.get("description"),
        });
        setResult(response);
        if (response.ok) {
          formElement.reset();
          router.refresh();
        }
      });
    }}>
      <input name="title" required maxLength={200} placeholder="Job title" className={inputClass} />
      <textarea name="description" maxLength={20000} rows={3} placeholder="Short job description" className={inputClass} />
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-lg bg-sidebar px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Create job"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setResult(null); }} className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold">
          Cancel
        </button>
      </div>
      <ResultMessage result={result} />
    </form>
  );
}

export function CreateCandidateForm({ organisationId }: { organisationId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-lg bg-lime px-3.5 py-2 text-xs font-semibold text-sidebar hover:bg-lime-hover">
        + Add candidate
      </button>
    );
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      setResult(null);
      startTransition(async () => {
        const response = await createCandidate({
          ...withScope(organisationId),
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          linkedinUrl: form.get("linkedinUrl"),
        });
        setResult(response);
        if (response.ok) {
          formElement.reset();
          router.refresh();
        }
      });
    }}>
      <input name="fullName" required maxLength={200} placeholder="Full name" className={inputClass} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="email" type="email" maxLength={254} placeholder="Email (optional)" className={inputClass} />
        <input name="phone" maxLength={50} placeholder="Phone (optional)" className={inputClass} />
      </div>
      <input name="linkedinUrl" type="url" maxLength={2048} placeholder="https://linkedin.com/in/username" className={inputClass} />
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-lg bg-sidebar px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Add candidate"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setResult(null); }} className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold">
          Cancel
        </button>
      </div>
      <ResultMessage result={result} />
    </form>
  );
}

export function CreateApplicationForm({
  organisationId,
  candidates,
  jobs,
}: {
  organisationId?: string;
  candidates: { id: string; name: string }[];
  jobs: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult | null>(null);
  const disabled = !candidates.length || !jobs.length;

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      setResult(null);
      startTransition(async () => {
        const response = await createApplication({
          ...withScope(organisationId),
          candidateId: form.get("candidateId"),
          jobId: form.get("jobId"),
        });
        setResult(response);
        if (response.ok) {
          formElement.reset();
          router.refresh();
        }
      });
    }}>
      <select name="candidateId" required disabled={disabled || pending} defaultValue="" className={darkInputClass}>
        <option value="" disabled className="text-sidebar">Select candidate</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id} className="text-sidebar">{candidate.name}</option>
        ))}
      </select>
      <select name="jobId" required disabled={disabled || pending} defaultValue="" className={darkInputClass}>
        <option value="" disabled className="text-sidebar">Select job</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id} className="text-sidebar">{job.title}</option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={disabled || pending} className="rounded-lg bg-lime px-4 py-2.5 text-xs font-semibold text-sidebar disabled:opacity-40">
          {pending ? "Adding…" : "Add to pipeline"}
        </button>
        {disabled && <p className="text-xs text-gray-400">Create at least one job and candidate first.</p>}
      </div>
      <div className="sm:col-span-2">
        <ResultMessage result={result} dark />
      </div>
    </form>
  );
}
