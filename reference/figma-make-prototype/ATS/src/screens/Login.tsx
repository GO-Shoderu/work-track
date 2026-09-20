import React, { useState } from 'react';
import { DEMO_USERS } from '../data/mock';
import type { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  onRequestAccess: () => void;
}

export default function Login({ onLogin, onRequestAccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (user && password === 'demo') {
        onLogin(user);
      } else {
        setError('Invalid email or password. Use one of the demo accounts below.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-workspace flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-sidebar p-10 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-xl bg-lime flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0D0F14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">WorkTrack</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
            Serious recruiting,<br />at your pace.
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            A lightweight ATS for teams who want signal, not noise. Manage jobs, candidates and pipelines without the enterprise overhead.
          </p>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Visual pipeline', desc: 'Track every candidate through your hiring stages at a glance.' },
            { label: 'AI-assisted assessment', desc: 'CV analysis that explains its reasoning — not just a score.' },
            { label: 'Multi-tenant ready', desc: 'Built for agencies and in-house teams managing multiple organisations.' },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-lime/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-lime flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0D0F14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">WorkTrack</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in to your account</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to access your workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@organisation.com"
                required
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="text-xs font-medium text-gray-600">Password</label>
                <button type="button" className="text-xs text-lime font-medium hover:underline cursor-pointer">Forgot password?</button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all"
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                </svg>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-lime hover:bg-lime-hover text-[#0D0F14] font-semibold text-sm rounded-lg transition-all disabled:opacity-60 cursor-pointer active:scale-[0.98]"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-medium text-gray-500 mb-3 text-center">Demo accounts — password: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">demo</code></p>
            <div className="space-y-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setEmail(u.email); setPassword('demo'); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-sidebar flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {u.initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{u.name}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {u.role === 'platform_owner' ? 'Platform Owner' : u.role === 'admin' ? 'Admin' : 'Recruiter'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-5">
            Want to use WorkTrack?{' '}
            <button onClick={onRequestAccess} className="text-lime font-medium hover:underline cursor-pointer">Request access</button>
          </p>
        </div>
      </div>
    </div>
  );
}
