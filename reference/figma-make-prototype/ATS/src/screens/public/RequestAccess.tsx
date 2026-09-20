import React, { useState } from 'react';
import { Button } from '../../components/ui';

interface RequestAccessProps {
  onBack: () => void;
}

export default function RequestAccess({ onBack }: RequestAccessProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company: '', contact: '', email: '', phone: '', website: '', needs: '', notes: '', contact_method: 'email',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-workspace flex items-center justify-center p-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-lime/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-lime-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request received</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Thank you for your interest in WorkTrack. Our team will review your request and get back to you within 1–2 business days.
          </p>
          <Button variant="secondary" onClick={onBack}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-workspace flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[380px] bg-sidebar p-10 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-10">
            <div className="w-7 h-7 rounded-lg bg-lime flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0D0F14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="text-base font-bold text-white">WorkTrack</span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight mb-3">Join the next generation of recruitment teams.</h2>
          <p className="text-sm text-gray-400 leading-relaxed">WorkTrack is a lightweight ATS built for agencies and in-house teams that need a serious recruiting workspace — without the enterprise complexity.</p>
        </div>
        <div className="space-y-2">
          {['Visual pipeline management', 'AI-assisted CV assessment', 'Multi-tenant organisation support', 'Public job pages and direct applications'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-lime shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-xs text-gray-400">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center p-8">
        <div className="w-full max-w-lg animate-fade-in">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to sign in
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Request access to WorkTrack</h1>
          <p className="text-sm text-gray-500 mb-6">Complete the form below and our team will review your request.</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company name <span className="text-red-400">*</span></label>
                <input value={form.company} onChange={set('company')} placeholder="Acme Corp" required className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your name <span className="text-red-400">*</span></label>
                <input value={form.contact} onChange={set('contact')} placeholder="Jane Smith" required className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Business email <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="jane@acme.com" required className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+44 7700 000000" className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                <input value={form.website} onChange={set('website')} placeholder="acme.com" className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Approximate hiring needs <span className="text-red-400">*</span></label>
              <textarea value={form.needs} onChange={set('needs')} rows={3} placeholder="e.g. 5–10 hires over the next 6 months, primarily technical roles." className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preferred contact method</label>
              <select value={form.contact_method} onChange={set('contact_method')} className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="either">Either</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Anything else?</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional context that would help us understand your needs." className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime resize-none" />
            </div>

            <button
              onClick={() => setSubmitted(true)}
              disabled={!form.company || !form.contact || !form.email || !form.needs}
              className="w-full h-10 bg-lime hover:bg-lime-hover text-[#0D0F14] font-semibold text-sm rounded-lg transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              Submit Request
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              By submitting, you agree to our terms. We'll only use your information to process your access request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
