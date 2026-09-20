import React, { useState } from 'react';
import { AUDIT_LOG } from '../../data/mock';
import { PageHeader, Card, SearchInput } from '../../components/ui';

export default function AdminAudit() {
  const [search, setSearch] = useState('');

  const filtered = AUDIT_LOG.filter(e =>
    !search ||
    e.user.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.target.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <PageHeader
        title="Audit Log"
        subtitle="Sensitive and administrative actions"
        action={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search log…" />
            <button className="h-8 px-3 rounded-lg border border-border bg-white text-xs text-gray-600 hover:bg-gray-50 cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          </div>
        }
      />

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Timestamp', 'User', 'Role', 'Action', 'Target', 'IP Address'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">No log entries found.</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{e.date}</td>
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-900">{e.user}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.userRole === 'Platform Owner' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {e.userRole}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{e.action}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{e.target}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{e.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-[10px] text-gray-400 mt-4 text-center">Showing {filtered.length} of {AUDIT_LOG.length} entries · Audit log is immutable and retained for 12 months</p>
    </div>
  );
}
