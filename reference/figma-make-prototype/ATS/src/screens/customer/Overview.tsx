import React from 'react';
import { JOBS, APPLICATIONS, CANDIDATES, STAGE_COLORS } from '../../data/mock';
import { MetricTile, Card, StageBadge, Avatar } from '../../components/ui';
import type { Screen } from '../../types';

interface CustomerOverviewProps {
  onNavigate: (s: Screen) => void;
}

export default function CustomerOverview({ onNavigate }: CustomerOverviewProps) {
  const openJobs = JOBS.filter(j => j.status === 'Open').length;
  const activeApps = APPLICATIONS.filter(a => a.stage !== 'Rejected');
  const inInterview = activeApps.filter(a => a.stage === 'Interview').length;
  const inOffer = activeApps.filter(a => a.stage === 'Offer').length;
  const hired = APPLICATIONS.filter(a => a.stage === 'Hired').length;

  // Recent activity
  const recentApps = [...APPLICATIONS]
    .filter(a => a.activities && a.activities.length > 0)
    .sort((a, b) => (b.lastUpdated > a.lastUpdated ? 1 : -1))
    .slice(0, 6);

  // Stage breakdown
  const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
  const stageCounts = stages.map(s => ({
    stage: s,
    count: APPLICATIONS.filter(a => a.stage === s).length,
  }));
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
        <p className="text-xs text-gray-500 mt-0.5">Nordic Technologies · Active workspace</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricTile label="Open Jobs" value={openJobs} sub="Active listings" />
        <MetricTile label="Total Candidates" value={CANDIDATES.length} sub="In your pipeline" />
        <MetricTile label="In Interview" value={inInterview} sub="Awaiting decision" accent />
        <MetricTile label="Offers Extended" value={inOffer} sub={`${hired} hired this cycle`} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Pipeline funnel */}
        <Card className="p-5 col-span-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Pipeline Overview</h2>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-gray-600 shrink-0">{stage}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: STAGE_COLORS[stage],
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="w-6 text-xs font-semibold text-gray-700 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-gray-400">{activeApps.length} active applications across {openJobs} open roles</p>
            <button onClick={() => onNavigate('customer-pipeline')} className="text-xs font-medium text-lime hover:underline cursor-pointer">
              View Pipeline →
            </button>
          </div>
        </Card>

        {/* Active jobs quick list */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Jobs</h2>
            <button onClick={() => onNavigate('customer-jobs')} className="text-[10px] text-lime font-medium hover:underline cursor-pointer">View all</button>
          </div>
          <div className="space-y-3">
            {JOBS.filter(j => j.status === 'Open').map(j => {
              const count = APPLICATIONS.filter(a => a.jobId === j.id && a.stage !== 'Rejected').length;
              return (
                <div key={j.id} className="flex items-start gap-2.5 pb-3 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{j.title}</p>
                    <p className="text-[10px] text-gray-400">{j.department} · {count} candidate{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Activity</h2>
          </div>
          <div className="space-y-2">
            {recentApps.map(app => {
              const c = CANDIDATES.find(c => c.id === app.candidateId);
              const j = JOBS.find(j => j.id === app.jobId);
              const lastActivity = app.activities?.[0];
              if (!c || !lastActivity) return null;
              return (
                <div key={app.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <Avatar name={c.name} initials={c.initials} color={c.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">
                      <strong className="font-semibold">{c.name}</strong> {lastActivity.action.toLowerCase()}
                    </p>
                    <p className="text-[10px] text-gray-400">{j?.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StageBadge stage={app.stage} />
                    <span className="text-[10px] text-gray-400">{lastActivity.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
