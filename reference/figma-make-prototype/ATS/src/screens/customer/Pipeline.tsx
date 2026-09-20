import React, { useState, useMemo } from 'react';
import { STAGE_COLORS, STAGE_BG, JOBS, CANDIDATES, STAGE_ORDER } from '../../data/mock';
import type { Application, Stage, Candidate, Job } from '../../types';
import { Avatar, StageBadge, Button, SearchInput, TabBar, LinkedInIcon, CVBadge, EmptyState, StatusBadge } from '../../components/ui';

interface PipelineProps {
  applications: Application[];
  onStageChange: (appId: string, newStage: Stage, candidateName: string) => void;
}

// ─── Candidate Detail Drawer ───────────────────────────────────────────────
function CandidateDrawer({
  candidate, application, job, onClose, onMoveStage,
}: {
  candidate: Candidate; application: Application; job: Job;
  onClose: () => void; onMoveStage: (stage: Stage) => void;
}) {
  const [tab, setTab] = useState('Profile');
  const [aiRunning, setAiRunning] = useState(false);
  const [localApp, setLocalApp] = useState(application);

  const handleRunAI = () => {
    setAiRunning(true);
    setTimeout(() => {
      setLocalApp(prev => ({
        ...prev,
        aiStatus: 'complete',
        aiScore: 78,
        aiStrengths: ['Relevant domain experience', 'Strong communication background', 'Portfolio aligned to requirements'],
        aiGaps: ['Limited evidence of specific technical skills required', 'No direct reference to team leadership'],
        aiEvidence: ['"Relevant work experience demonstrated across multiple projects"', '"Clear progression in responsibilities over time"'],
        aiSummary: 'Good overall match for the role. Strong foundational skills with some areas to probe during interview.',
      }));
      setAiRunning(false);
    }, 2500);
  };

  const otherStages = STAGE_ORDER.filter(s => s !== localApp.stage);

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-border shadow-2xl flex flex-col z-40 animate-slide-in-right">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <LinkedInIcon href={candidate.linkedin} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={candidate.name} initials={candidate.initials} color={candidate.avatarColor} size="xl" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{candidate.name}</h2>
            <p className="text-xs text-gray-500">{candidate.currentRole}</p>
            <div className="mt-1.5">
              <StageBadge stage={localApp.stage} />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
          </svg>
          {job.title}
        </p>
      </div>

      {/* Move Stage */}
      <div className="px-5 py-3 border-b border-border bg-gray-50">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Move to stage</p>
        <div className="flex flex-wrap gap-1.5">
          {otherStages.map(s => (
            <button
              key={s}
              onClick={() => onMoveStage(s)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer hover:shadow-sm"
              style={{ borderColor: STAGE_COLORS[s], color: STAGE_COLORS[s], backgroundColor: STAGE_BG[s] }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => onMoveStage('Rejected')}
            className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer"
            style={{ borderColor: '#E5E7EB', color: '#9CA3AF', backgroundColor: '#F9FAFB' }}
          >
            Disqualify
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={['Profile', 'CV', 'AI Assessment', 'Activity', 'Notes']}
        active={tab}
        onChange={setTab}
      />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'Profile' && (
          <div className="p-5 space-y-4 animate-fade-in">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
              <div className="space-y-2">
                <InfoRow icon="mail" label={candidate.email} />
                <InfoRow icon="phone" label={candidate.phone} />
                {candidate.location && <InfoRow icon="location" label={candidate.location} />}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Application</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Applied</span>
                  <span className="text-xs font-medium text-gray-700">{localApp.dateApplied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Last updated</span>
                  <span className="text-xs font-medium text-gray-700">{localApp.lastUpdated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Stage</span>
                  <StageBadge stage={localApp.stage} />
                </div>
              </div>
            </div>
            {localApp.notes && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-xs text-gray-600 leading-relaxed">{localApp.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'CV' && (
          <div className="p-5 animate-fade-in">
            {candidate.cvFile ? (
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{candidate.cvFile}</p>
                    <p className="text-xs text-gray-400">PDF document · Uploaded {localApp.dateApplied}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary">Download CV</Button>
                  <Button size="sm">View</Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                title="No CV uploaded"
                description="This candidate has not yet provided a CV. You can request one or upload on their behalf."
                action={<Button size="sm" variant="primary">Upload CV</Button>}
              />
            )}
          </div>
        )}

        {tab === 'AI Assessment' && (
          <div className="p-5 animate-fade-in">
            {localApp.aiStatus === 'idle' && !aiRunning && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01.5 1.401v1.199c0 .621-.504 1.125-1.125 1.125H4.825a1.125 1.125 0 01-1.125-1.125v-1.2c0-.52.17-1.006.5-1.4L8.176 9.36A2.25 2.25 0 019.75 7.5h4.5a2.25 2.25 0 011.575.86L19.8 15z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">No assessment yet</p>
                <p className="text-xs text-gray-500 mb-4 max-w-[220px] mx-auto">
                  Run an AI assessment to analyse this candidate's CV against the job requirements.
                </p>
                <Button variant="primary" size="sm" onClick={handleRunAI} disabled={!candidate.cvFile}>
                  Run AI Assessment
                </Button>
                {!candidate.cvFile && <p className="text-[10px] text-gray-400 mt-2">A CV must be uploaded first.</p>}
              </div>
            )}

            {aiRunning && (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700">Analysing CV…</p>
                <p className="text-xs text-gray-400 mt-1">Comparing against job requirements</p>
              </div>
            )}

            {(localApp.aiStatus === 'complete') && localApp.aiScore !== undefined && !aiRunning && (
              <div className="space-y-4 animate-fade-in">
                {/* Score */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-border">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#E5E7EB" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke={localApp.aiScore >= 80 ? '#AADE00' : localApp.aiScore >= 60 ? '#F59E0B' : '#EF4444'} strokeWidth="6"
                        strokeDasharray={`${(localApp.aiScore / 100) * 163.4} 163.4`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{localApp.aiScore}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">AI Match Score</p>
                    <p className="text-xs text-gray-500">{localApp.aiScore >= 80 ? 'Strong match' : localApp.aiScore >= 60 ? 'Moderate match' : 'Weak match'} for {job.title}</p>
                  </div>
                </div>

                {/* Strengths */}
                {localApp.aiStrengths && localApp.aiStrengths.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Strengths</p>
                    <ul className="space-y-1.5">
                      {localApp.aiStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <svg className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gaps */}
                {localApp.aiGaps && localApp.aiGaps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Potential Gaps</p>
                    <ul className="space-y-1.5">
                      {localApp.aiGaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence */}
                {localApp.aiEvidence && localApp.aiEvidence.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Supporting Evidence</p>
                    <div className="space-y-1.5">
                      {localApp.aiEvidence.map((e, i) => (
                        <p key={i} className="text-xs text-gray-600 italic border-l-2 border-lime pl-2.5">{e}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {localApp.aiSummary && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Summary</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{localApp.aiSummary}</p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-border">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
                  </svg>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    AI-assisted assessment. Human recruiter judgement is required before any hiring decision.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Activity' && (
          <div className="p-5 animate-fade-in">
            {localApp.activities && localApp.activities.length > 0 ? (
              <div className="space-y-3">
                {localApp.activities.map((a, i) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-lime mt-1 shrink-0" />
                      {i < (localApp.activities?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 20 }} />}
                    </div>
                    <div className="pb-3">
                      <p className="text-xs text-gray-700"><strong>{a.user}</strong> {a.action}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                title="No activity yet"
                description="Actions taken on this application will appear here."
              />
            )}
          </div>
        )}

        {tab === 'Notes' && (
          <div className="p-5 animate-fade-in">
            <textarea
              defaultValue={localApp.notes ?? ''}
              placeholder="Add notes about this candidate…"
              className="w-full h-48 rounded-lg border border-border px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime resize-none"
            />
            <Button size="sm" variant="primary" className="mt-2">Save notes</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: 'mail' | 'phone' | 'location'; label: string }) {
  const icons = {
    mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  };
  return (
    <div className="flex items-center gap-2">
      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
      </svg>
      <span className="text-xs text-gray-700">{label}</span>
    </div>
  );
}

// ─── Kanban Card ────────────────────────────────────────────────────────────
function KanbanCard({
  candidate, application, job, isSelected, onClick,
}: {
  candidate: Candidate; application: Application; job?: Job;
  isSelected: boolean; onClick: () => void;
}) {
  const daysInStage = Math.floor((Date.now() - new Date(application.lastUpdated).getTime()) / 86400000);
  const daysLabel = daysInStage === 0 ? 'Today' : daysInStage === 1 ? '1 day' : `${daysInStage} days`;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${
        isSelected ? 'border-lime ring-2 ring-lime/20' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.name} initials={candidate.initials} color={candidate.avatarColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 truncate">{candidate.name}</p>
          <p className="text-[10px] text-gray-500 truncate">{candidate.currentRole}</p>
          {job && <p className="text-[10px] text-gray-400 truncate mt-0.5">{job.title}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          {candidate.linkedin && (
            <span className="w-3.5 h-3.5 rounded bg-blue-600 flex items-center justify-center" title="LinkedIn">
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
              </svg>
            </span>
          )}
          {candidate.cvFile && (
            <span className="w-3.5 h-3.5 rounded bg-red-100 flex items-center justify-center" title="CV available">
              <svg className="w-2 h-2 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </span>
          )}
          {application.aiScore !== undefined && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-lime/20 text-lime-hover">{application.aiScore}</span>
          )}
        </div>
        <span className="text-[9px] text-gray-400">{daysLabel}</span>
      </div>
    </div>
  );
}

// ─── Kanban Column ──────────────────────────────────────────────────────────
function KanbanColumn({
  stage, applications, candidates, jobs, selectedAppId, onSelect, showJob,
}: {
  stage: Stage; applications: Application[]; candidates: Candidate[]; jobs: Job[];
  selectedAppId: string | null; onSelect: (a: Application) => void; showJob: boolean;
}) {
  const color = STAGE_COLORS[stage];

  return (
    <div className="flex flex-col w-[240px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-gray-700">{stage}</span>
        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">{applications.length}</span>
      </div>
      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {applications.length === 0 && (
          <div className="h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-[10px] text-gray-300 font-medium">No candidates</p>
          </div>
        )}
        {applications.map(app => {
          const c = candidates.find(c => c.id === app.candidateId);
          const j = jobs.find(j => j.id === app.jobId);
          if (!c) return null;
          return (
            <KanbanCard
              key={app.id}
              candidate={c}
              application={app}
              job={showJob ? j : undefined}
              isSelected={selectedAppId === app.id}
              onClick={() => onSelect(app)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Pipeline Screen ───────────────────────────────────────────────────
export default function Pipeline({ applications, onStageChange }: PipelineProps) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [jobFilter, setJobFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showRejected, setShowRejected] = useState(false);

  const openJobs = useMemo(() => JOBS.filter(j => j.status === 'Open'), []);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      if (jobFilter !== 'all' && app.jobId !== jobFilter) return false;
      if (search) {
        const c = CANDIDATES.find(c => c.id === app.candidateId);
        if (!c?.name.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [applications, jobFilter, search]);

  const activeApps = filteredApps.filter(a => a.stage !== 'Rejected');
  const rejectedApps = filteredApps.filter(a => a.stage === 'Rejected');
  const showJob = jobFilter === 'all';

  const handleSelect = (app: Application) => {
    setSelectedApp(prev => prev?.id === app.id ? null : app);
  };

  const handleMoveStage = (newStage: Stage) => {
    if (!selectedApp) return;
    const candidate = CANDIDATES.find(c => c.id === selectedApp.candidateId);
    if (candidate) {
      onStageChange(selectedApp.id, newStage, candidate.name);
      setSelectedApp(prev => prev ? { ...prev, stage: newStage, lastUpdated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } : null);
    }
  };

  const selectedCandidate = selectedApp ? CANDIDATES.find(c => c.id === selectedApp.candidateId) : null;
  const selectedJob = selectedApp ? JOBS.find(j => j.id === selectedApp.jobId) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-border bg-white flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Pipeline</h1>
          <p className="text-[11px] text-gray-400">{activeApps.length} active application{activeApps.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search candidates…" />
          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer"
          >
            <option value="all">All jobs</option>
            {openJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-x-auto transition-all ${selectedApp ? 'mr-[420px]' : ''}`}>
          <div className="flex gap-4 p-6 kanban-board min-w-max">
            {STAGE_ORDER.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                applications={activeApps.filter(a => a.stage === stage)}
                candidates={CANDIDATES}
                jobs={JOBS}
                selectedAppId={selectedApp?.id ?? null}
                onSelect={handleSelect}
                showJob={showJob}
              />
            ))}

            {/* Rejected section */}
            <div className="flex flex-col w-[240px] shrink-0">
              <button
                onClick={() => setShowRejected(v => !v)}
                className="flex items-center gap-2 mb-3 px-0.5 cursor-pointer group"
              >
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <span className="text-xs font-semibold text-gray-400">Disqualified</span>
                <span className="text-[10px] font-medium text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">{rejectedApps.length}</span>
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${showRejected ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showRejected && (
                <div className="space-y-2 opacity-60">
                  {rejectedApps.map(app => {
                    const c = CANDIDATES.find(c => c.id === app.candidateId);
                    const j = JOBS.find(j => j.id === app.jobId);
                    if (!c) return null;
                    return (
                      <KanbanCard key={app.id} candidate={c} application={app} job={showJob ? j : undefined}
                        isSelected={selectedApp?.id === app.id} onClick={() => handleSelect(app)} />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Candidate detail drawer */}
        {selectedApp && selectedCandidate && selectedJob && (
          <CandidateDrawer
            candidate={selectedCandidate}
            application={selectedApp}
            job={selectedJob}
            onClose={() => setSelectedApp(null)}
            onMoveStage={handleMoveStage}
          />
        )}
      </div>
    </div>
  );
}
