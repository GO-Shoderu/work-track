import React, { useState, useMemo } from 'react';
import { CANDIDATES, APPLICATIONS, JOBS, STAGE_COLORS } from '../../data/mock';
import type { Candidate, Application } from '../../types';
import {
  Avatar, Button, SearchInput, PageHeader, Card, StageBadge, StatusBadge,
  LinkedInIcon, CVBadge, EmptyState, TabBar, IconButton,
} from '../../components/ui';

// ─── Add Candidate Modal ────────────────────────────────────────────────────
function AddCandidateModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-900">Add Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full name', placeholder: 'Jane Smith', required: true },
              { label: 'Email', placeholder: 'jane@example.com', required: true },
              { label: 'Phone', placeholder: '+44 7700 900000' },
              { label: 'Current role', placeholder: 'Senior Designer' },
              { label: 'Location', placeholder: 'London, UK' },
              { label: 'LinkedIn URL', placeholder: 'linkedin.com/in/...' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                <input placeholder={f.placeholder} className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Associate with Job</label>
            <select className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer">
              <option value="">Select a job (optional)</option>
              {JOBS.filter(j => j.status === 'Open').map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CV</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
              <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs text-gray-500">Drag & drop or <span className="text-lime font-medium">browse</span></p>
              <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOCX up to 10MB</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onClose}>Add Candidate</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Candidate Full Detail ──────────────────────────────────────────────────
function CandidateDetail({ candidate, onBack }: { candidate: Candidate; onBack: () => void }) {
  const [tab, setTab] = useState('Profile');
  const apps = APPLICATIONS.filter(a => a.candidateId === candidate.id);

  return (
    <div className="flex-1 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-4 cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Candidates
        </button>
        <div className="flex items-start gap-4">
          <Avatar name={candidate.name} initials={candidate.initials} color={candidate.avatarColor} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
                <p className="text-sm text-gray-500">{candidate.currentRole}</p>
                <p className="text-xs text-gray-400 mt-1">{candidate.location}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <LinkedInIcon href={candidate.linkedin} />
                <Button size="sm" variant="primary">+ New Application</Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {candidate.email}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {candidate.phone}
              </span>
              <CVBadge file={candidate.cvFile} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <TabBar tabs={['Profile', 'Applications', 'CV', 'AI Assessment', 'Activity', 'Notes']} active={tab} onChange={setTab} />
      </div>

      <div className="p-6">
        {tab === 'Profile' && (
          <div className="grid grid-cols-2 gap-6 animate-fade-in">
            <Card className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Information</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Full name', value: candidate.name },
                  { label: 'Email', value: candidate.email },
                  { label: 'Phone', value: candidate.phone },
                  { label: 'Location', value: candidate.location },
                  { label: 'Current role', value: candidate.currentRole },
                  { label: 'Added', value: candidate.dateAdded },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500 shrink-0">{r.label}</span>
                    <span className="text-xs font-medium text-gray-800 text-right">{r.value || '—'}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Applications</h3>
              {apps.length === 0 ? (
                <p className="text-xs text-gray-400">No applications yet.</p>
              ) : (
                <div className="space-y-2">
                  {apps.map(a => {
                    const j = JOBS.find(j => j.id === a.jobId);
                    return (
                      <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs font-medium text-gray-700">{j?.title}</span>
                        <StageBadge stage={a.stage} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'Applications' && (
          <div className="space-y-3 animate-fade-in">
            {apps.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                title="No applications"
                description="This candidate has not been associated with any jobs yet."
                action={<Button size="sm" variant="primary">+ New Application</Button>}
              />
            ) : apps.map(a => {
              const j = JOBS.find(j => j.id === a.jobId);
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{j?.title}</p>
                      <p className="text-xs text-gray-500">{j?.department} · {j?.location}</p>
                      <p className="text-xs text-gray-400 mt-1">Applied {a.dateApplied}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StageBadge stage={a.stage} />
                      {a.aiScore !== undefined && (
                        <span className="text-[10px] font-bold text-lime bg-lime/10 px-2 py-0.5 rounded-full">AI {a.aiScore}%</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'CV' && (
          <Card className="p-6 animate-fade-in">
            {candidate.cvFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{candidate.cvFile}</p>
                    <p className="text-xs text-gray-400">PDF document</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">View</Button>
                  <Button size="sm" variant="primary">Download</Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                title="No CV uploaded"
                description="Upload a CV to enable AI assessment for this candidate."
                action={<Button size="sm" variant="primary">Upload CV</Button>}
              />
            )}
          </Card>
        )}

        {tab === 'AI Assessment' && (
          <div className="animate-fade-in">
            {apps.filter(a => a.aiStatus === 'complete').length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01.5 1.401v1.199c0 .621-.504 1.125-1.125 1.125H4.825a1.125 1.125 0 01-1.125-1.125v-1.2c0-.52.17-1.006.5-1.4L8.176 9.36A2.25 2.25 0 019.75 7.5h4.5a2.25 2.25 0 011.575.86L19.8 15z" /></svg>}
                title="No assessments run"
                description="Run AI assessment from a specific application to analyse this candidate's fit."
              />
            ) : apps.filter(a => a.aiStatus === 'complete').map(a => {
              const j = JOBS.find(j => j.id === a.jobId);
              return (
                <Card key={a.id} className="p-5 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">{j?.title}</p>
                    <span className="text-lg font-bold text-lime">{a.aiScore}%</span>
                  </div>
                  {a.aiSummary && <p className="text-xs text-gray-600">{a.aiSummary}</p>}
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'Activity' && (
          <Card className="p-5 animate-fade-in">
            {apps.flatMap(a => a.activities ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {apps.flatMap(a => (a.activities ?? []).map(act => ({ ...act, jobId: a.jobId }))).sort((a, b) => b.date.localeCompare(a.date)).map(act => {
                  const j = JOBS.find(j => j.id === (act as any).jobId);
                  return (
                    <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-lime mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-700"><strong>{act.user}</strong> {act.action} {j && <span className="text-gray-400">· {j.title}</span>}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{act.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {tab === 'Notes' && (
          <Card className="p-5 animate-fade-in">
            <textarea
              defaultValue=""
              placeholder="Add notes about this candidate…"
              className="w-full h-40 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none resize-none"
            />
            <Button size="sm" variant="primary" className="mt-2">Save notes</Button>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main Candidates Screen ─────────────────────────────────────────────────
export default function Candidates() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const filtered = useMemo(() => {
    return CANDIDATES.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.currentRole.toLowerCase().includes(search.toLowerCase())) return false;
      if (stageFilter !== 'all') {
        const apps = APPLICATIONS.filter(a => a.candidateId === c.id);
        if (!apps.some(a => a.stage === stageFilter)) return false;
      }
      return true;
    });
  }, [search, stageFilter]);

  if (selectedCandidate) {
    return <CandidateDetail candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <PageHeader
        title="Candidates"
        subtitle={`${CANDIDATES.length} total candidates`}
        action={<Button variant="primary" size="sm" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>} onClick={() => setShowAddModal(true)}>Add Candidate</Button>}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search by name or role…" /></div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="h-8 px-3 rounded-lg border border-border bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer">
          <option value="all">All stages</option>
          {['Applied', 'Screening', 'Interview', 'Offer', 'Hired'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          title="No candidates found"
          description="Try adjusting your search or filters."
          action={<Button size="sm" variant="primary" onClick={() => { setSearch(''); setStageFilter('all'); }}>Clear filters</Button>}
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Candidate', 'Current Role', 'Location', 'Applications', 'Links', 'Added'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const apps = APPLICATIONS.filter(a => a.candidateId === c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} initials={c.initials} color={c.avatarColor} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.currentRole}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.location}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {apps.length === 0 ? <span className="text-[10px] text-gray-400">None</span>
                          : apps.map(a => <StageBadge key={a.id} stage={a.stage} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {c.linkedin && <LinkedInIcon href={c.linkedin} />}
                        {c.cvFile && (
                          <span className="w-5 h-5 rounded bg-red-100 flex items-center justify-center" title="CV available">
                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-400">{c.dateAdded}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
