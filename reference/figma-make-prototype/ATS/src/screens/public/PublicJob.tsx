import React, { useState } from 'react';
import { JOBS } from '../../data/mock';

interface PublicJobProps {
  jobSlug?: string;
  onBack: () => void;
}

export default function PublicJob({ jobSlug = 'senior-backend-engineer', onBack }: PublicJobProps) {
  const job = JOBS.find(j => j.publicSlug === jobSlug) ?? JOBS[0];
  const [applying, setApplying] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-workspace flex items-center justify-center p-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-lime/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-lime-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application submitted</h1>
          <p className="text-sm text-gray-500 mb-1">Thank you for applying to <strong>{job.title}</strong>.</p>
          <p className="text-sm text-gray-500 mb-6">We'll review your application and be in touch shortly.</p>
          <button onClick={onBack} className="text-sm font-medium text-lime hover:underline cursor-pointer">Return to sign in</button>
        </div>
      </div>
    );
  }

  if (applying) {
    return (
      <div className="min-h-screen bg-workspace flex items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in">
          <button onClick={() => setApplying(false)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to job
          </button>

          <div className="bg-white rounded-2xl border border-border p-8">
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">Apply for {job.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Nordic Technologies · {job.location}</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Full name', placeholder: 'Jane Smith', type: 'text', required: true },
                { label: 'Email', placeholder: 'jane@example.com', type: 'email', required: true },
                { label: 'Phone', placeholder: '+44 7700 000000', type: 'tel' },
                { label: 'LinkedIn URL', placeholder: 'linkedin.com/in/janesmith', type: 'url' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CV <span className="text-red-400">*</span></label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-300 transition-colors">
                  <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-xs text-gray-500">Drag & drop or <span className="text-lime font-medium">browse</span></p>
                  <p className="text-[10px] text-gray-400 mt-0.5">PDF or DOCX, up to 10MB</p>
                </div>
              </div>

              <button
                onClick={() => setSubmitted(true)}
                className="w-full h-10 bg-lime hover:bg-lime-hover text-[#0D0F14] font-semibold text-sm rounded-lg transition-all cursor-pointer active:scale-[0.98]"
              >
                Submit Application
              </button>
              <p className="text-[10px] text-gray-400 text-center">No account creation required. Your data is used only to process your application.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-workspace">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-lime flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0D0F14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span className="text-sm font-bold text-gray-900">WorkTrack</span>
          <span className="text-gray-300 ml-2 mr-2">·</span>
          <span className="text-sm text-gray-500">Nordic Technologies</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 animate-fade-in">
        {/* Job header */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {job.location}
                </span>
                <span>·</span>
                <span>{job.type}</span>
                <span>·</span>
                <span>{job.department}</span>
              </div>
            </div>
            <button
              onClick={() => setApplying(true)}
              className="px-5 py-2.5 bg-lime hover:bg-lime-hover text-[#0D0F14] font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.98] shrink-0"
            >
              Apply Now
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">About the Role</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Requirements</h2>
          <ul className="space-y-2">
            {job.requirements.split('\n').filter(Boolean).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-lime mt-2 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-600 mb-3">Interested in this opportunity?</p>
          <button
            onClick={() => setApplying(true)}
            className="px-8 py-3 bg-lime hover:bg-lime-hover text-[#0D0F14] font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.98]"
          >
            Apply for this role
          </button>
          <p className="text-xs text-gray-400 mt-2">No account required · Takes less than 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
