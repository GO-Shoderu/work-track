import React, { useState } from 'react';
import { ACCESS_REQUESTS } from '../../data/mock';
import type { AccessRequest } from '../../types';
import { PageHeader, Card, StatusBadge, EmptyState, Button } from '../../components/ui';

type ReviewStatus = AccessRequest['status'];

const STATUS_MAP: Record<ReviewStatus, { variant: string; label: string }> = {
  Pending: { variant: 'pending', label: 'Pending' },
  'Needs Information': { variant: 'needs-info', label: 'Needs Information' },
  Approved: { variant: 'approved', label: 'Approved' },
  Rejected: { variant: 'rejected', label: 'Rejected' },
};

export default function AdminReview() {
  const [requests, setRequests] = useState(ACCESS_REQUESTS);
  const [selected, setSelected] = useState<AccessRequest | null>(requests.find(r => r.status === 'Pending') ?? null);
  const [filter, setFilter] = useState<string>('all');

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  const updateStatus = (id: string, status: ReviewStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: request list */}
      <div className="w-72 border-r border-border flex flex-col shrink-0 bg-white">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-sm font-semibold text-gray-900">Access Requests</h1>
          <p className="text-[10px] text-gray-400 mt-0.5">{requests.filter(r => r.status === 'Pending').length} pending review</p>
          <div className="flex flex-wrap gap-1 mt-3">
            {['all', 'Pending', 'Needs Information', 'Approved', 'Rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-all ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No requests</p>
          ) : filtered.map(r => {
            const s = STATUS_MAP[r.status];
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3.5 border-b border-border cursor-pointer transition-colors ${selected?.id === r.id ? 'bg-lime/5 border-l-2 border-l-lime' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-900">{r.companyName}</p>
                  <StatusBadge variant={s.variant as any} label={s.label} />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{r.contactName}</p>
                <p className="text-[10px] text-gray-400">{r.submittedDate}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <EmptyState
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="Select a request"
            description="Choose an access request from the list to review its details."
          />
        ) : (
          <div className="max-w-xl animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.companyName}</h2>
                <p className="text-xs text-gray-500">Submitted {selected.submittedDate}</p>
              </div>
              <StatusBadge variant={STATUS_MAP[selected.status].variant as any} label={STATUS_MAP[selected.status].label} />
            </div>

            <Card className="p-5 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Applicant Information</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Company', value: selected.companyName },
                  { label: 'Contact', value: selected.contactName },
                  { label: 'Email', value: selected.email },
                  { label: 'Phone', value: selected.phone ?? '—' },
                  { label: 'Website', value: selected.website ?? '—' },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500 w-20 shrink-0">{r.label}</span>
                    <span className="text-xs font-medium text-gray-800 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {selected.hiringNeeds && (
              <Card className="p-5 mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hiring Needs</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.hiringNeeds}</p>
              </Card>
            )}

            {selected.notes && (
              <Card className="p-5 mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.notes}</p>
              </Card>
            )}

            <Card className="p-5 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Internal Notes</h3>
              <textarea placeholder="Add internal notes about this request…" rows={3} className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none resize-none" />
            </Card>

            {(selected.status === 'Pending' || selected.status === 'Needs Information') && (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateStatus(selected.id, 'Approved')}
                  icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                >
                  Approve & Create Account
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateStatus(selected.id, 'Needs Information')}
                >
                  Request More Info
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => updateStatus(selected.id, 'Rejected')}
                >
                  Reject
                </Button>
              </div>
            )}

            {selected.status === 'Approved' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-medium text-green-700">This request has been approved. A Customer account has been created.</p>
              </div>
            )}
            {selected.status === 'Rejected' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-medium text-red-700">This request has been rejected.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
