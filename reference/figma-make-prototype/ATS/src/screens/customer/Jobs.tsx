import React, { useState, useMemo } from 'react';
import { JOBS, APPLICATIONS, CANDIDATES } from '../../data/mock';
import type { Job } from '../../types';
import { Button, SearchInput, PageHeader, Card, StatusBadge, EmptyState, Avatar, StageBadge } from '../../components/ui';

function JobTypeBadge({ type }: { type: string }) {
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{type}</span>;
}

function CreateJobModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">New Job</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Job Title <span className="text-red-400">*</span></label>
              <input value={form.title} onChange={set('title')} placeholder="e.g. Senior Backend Engineer" className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <input value={form.department} onChange={set('department')} placeholder="e.g. Engineering" className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input value={form.location} onChange={set('location')} placeholder="e.g. London, UK (Hybrid)" className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
              <select value={form.type} onChange={set('type')} className="w-full h-9 px-3 rounded-lg border border-border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer">
                {['Full-time', 'Part-time', 'Contract', 'Internship'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job Description</label>
            <textarea value={form.description} onChange={set('description')} rows={5} placeholder="Describe the role, responsibilities and team context…" className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Requirements</label>
            <textarea value={form.requirements} onChange={set('requirements')} rows={4} placeholder="List key skills, experience and qualifications (one per line)…" className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime resize-none" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-border">
            <div>
              <p className="text-xs font-semibold text-gray-700">Public job page</p>
              <p className="text-[10px] text-gray-400">Generate a shareable link so candidates can apply directly.</p>
            </div>
            <div className="ml-auto">
              <div className="w-9 h-5 rounded-full bg-gray-200 cursor-pointer relative">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={onClose}>Save Draft</Button>
          <Button variant="primary" size="sm" onClick={onClose}>Create Job</Button>
        </div>
      </div>
    </div>
  );
}

function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
  const apps = APPLICATIONS.filter(a => a.jobId === job.id);

  const statusVariant = job.status === 'Open' ? 'open' : job.status === 'Draft' ? 'draft' : 'closed';

  return (
    <div className="flex-1 overflow-y-auto animate-fade-in">
      <div className="bg-white border-b border-border px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3 cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Jobs
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
              <StatusBadge variant={statusVariant as any} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{job.department}</span>
              <span>·</span>
              <span>{job.location}</span>
              <span>·</span>
              <JobTypeBadge type={job.type} />
              <span>·</span>
              <span>Created {job.createdDate}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {job.status !== 'Closed' && job.isPublic && (
              <Button size="sm" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}>
                Copy link
              </Button>
            )}
            <Button size="sm" variant="secondary">Edit Job</Button>
            {job.status === 'Draft' && <Button size="sm" variant="primary">Publish</Button>}
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{job.description || 'No description provided.'}</p>
          </Card>
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Requirements</h3>
            <ul className="space-y-1.5">
              {job.requirements.split('\n').filter(Boolean).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime mt-2 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Applications ({apps.length})</h3>
            {apps.length === 0 ? (
              <p className="text-xs text-gray-400">No applications yet.</p>
            ) : (
              <div className="space-y-2">
                {apps.map(a => {
                  const c = CANDIDATES.find(c => c.id === a.candidateId);
                  if (!c) return null;
                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <Avatar name={c.name} initials={c.initials} color={c.avatarColor} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                      </div>
                      <StageBadge stage={a.stage} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {job.isPublic && job.publicSlug && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Public Link</h3>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-border">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <span className="text-[10px] text-gray-500 truncate">worktrack.io/jobs/{job.publicSlug}</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const filtered = useMemo(() => JOBS.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.department.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && j.status.toLowerCase() !== statusFilter) return false;
    return true;
  }), [search, statusFilter]);

  if (selectedJob) return <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <PageHeader
        title="Jobs"
        subtitle={`${JOBS.filter(j => j.status === 'Open').length} open positions`}
        action={<Button variant="primary" size="sm" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>} onClick={() => setShowCreate(true)}>New Job</Button>}
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search jobs…" /></div>
        <div className="flex items-center gap-1 p-1 bg-white border border-border rounded-lg">
          {['all', 'open', 'draft', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${statusFilter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          title="No jobs found"
          description="Try adjusting your search or create a new job."
          action={<Button size="sm" variant="primary" onClick={() => setShowCreate(true)}>New Job</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(j => {
            const apps = APPLICATIONS.filter(a => a.jobId === j.id && a.stage !== 'Rejected');
            const statusVariant = j.status === 'Open' ? 'open' : j.status === 'Draft' ? 'draft' : 'closed';
            return (
              <Card key={j.id} className="p-4 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedJob(j)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{j.title}</p>
                        <StatusBadge variant={statusVariant as any} />
                        {j.isPublic && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Public</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>{j.department}</span>
                        <span>·</span>
                        <span>{j.location}</span>
                        <span>·</span>
                        <JobTypeBadge type={j.type} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{apps.length}</p>
                      <p className="text-[10px] text-gray-400">Candidates</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{j.createdDate}</p>
                      <p className="text-[10px] text-gray-400">Created</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && <CreateJobModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
