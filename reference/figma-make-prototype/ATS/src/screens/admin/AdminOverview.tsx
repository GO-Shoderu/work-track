import React from 'react';
import { CUSTOMERS, ACCESS_REQUESTS, ADMINS, JOBS, CANDIDATES, AUDIT_LOG } from '../../data/mock';
import { MetricTile, Card, StatusBadge, Avatar } from '../../components/ui';
import type { Screen, User } from '../../types';

interface AdminOverviewProps {
  user: User;
  onNavigate: (s: Screen) => void;
}

export default function AdminOverview({ user, onNavigate }: AdminOverviewProps) {
  const isPO = user.role === 'platform_owner';
  const myCustomers = isPO ? CUSTOMERS : CUSTOMERS.filter(c => {
    const admin = ADMINS.find(a => a.id === user.id);
    return admin?.assignedCustomerIds.includes(c.id);
  });

  const pending = ACCESS_REQUESTS.filter(r => r.status === 'Pending' || r.status === 'Needs Information');
  const activeCustomers = CUSTOMERS.filter(c => c.status === 'Active');
  const recentAudit = AUDIT_LOG.slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Platform Overview</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isPO ? 'Platform administration dashboard' : `Showing ${myCustomers.length} assigned customer${myCustomers.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isPO ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricTile label="Total Customers" value={CUSTOMERS.length} sub={`${activeCustomers.length} active`} />
            <MetricTile label="Open Jobs" value={JOBS.filter(j => j.status === 'Open').length} sub="Across all orgs" />
            <MetricTile label="Candidates" value={CANDIDATES.length} sub="Total in system" />
            <MetricTile label="Pending Reviews" value={pending.length} sub="Access requests" accent />
          </div>

          {pending.length > 0 && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-semibold text-amber-800">{pending.length} access request{pending.length !== 1 ? 's' : ''} require your attention</span>
              </div>
              <button onClick={() => onNavigate('admin-review')} className="text-xs font-medium text-amber-700 hover:text-amber-900 cursor-pointer underline">Review now →</button>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricTile label="My Customers" value={myCustomers.length} />
          <MetricTile label="Open Jobs" value={myCustomers.reduce((s, c) => s + c.openJobs, 0)} />
          <MetricTile label="Total Candidates" value={myCustomers.reduce((s, c) => s + c.candidateCount, 0)} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Customer list */}
        <Card className="p-5 col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isPO ? 'Customers' : 'My Customers'}
            </h2>
            <button onClick={() => onNavigate('admin-customers')} className="text-[10px] text-lime font-medium hover:underline cursor-pointer">View all</button>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                {['Organisation', 'Open Jobs', 'Candidates', 'Status', 'Last Activity'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-400 pb-2 pr-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myCustomers.slice(0, 4).map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2.5 pr-3">
                    <p className="text-xs font-semibold text-gray-900">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.contactName}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-gray-700">{c.openJobs}</td>
                  <td className="py-2.5 pr-3 text-xs text-gray-700">{c.candidateCount}</td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge variant={c.status.toLowerCase() as any} />
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">{c.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Recent audit */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Activity</h2>
            {isPO && <button onClick={() => onNavigate('admin-audit')} className="text-[10px] text-lime font-medium hover:underline cursor-pointer">Audit log</button>}
          </div>
          <div className="space-y-3">
            {recentAudit.map(entry => (
              <div key={entry.id} className="pb-3 border-b border-border last:border-0">
                <p className="text-xs text-gray-700"><strong className="font-semibold">{entry.user}</strong> {entry.action}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{entry.target} · {entry.date}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
