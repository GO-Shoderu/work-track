import React, { useState } from 'react';
import { CUSTOMERS, ADMINS } from '../../data/mock';
import type { Customer } from '../../types';
import { Button, PageHeader, Card, StatusBadge, SearchInput, EmptyState } from '../../components/ui';

interface AdminCustomersProps {
  onEnterContext: (customer: Customer) => void;
  userId: string;
  isPlatformOwner: boolean;
}

function CustomerDetail({ customer, onBack, onEnterContext }: {
  customer: Customer; onBack: () => void; onEnterContext: (c: Customer) => void;
}) {
  const assignedAdmin = ADMINS.find(a => a.id === customer.assignedAdminId);

  return (
    <div className="flex-1 overflow-y-auto animate-fade-in">
      <div className="bg-white border-b border-border px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3 cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          Back to Customers
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <StatusBadge variant={customer.status.toLowerCase() as any} />
            </div>
            <p className="text-xs text-gray-500">{customer.contactName} · {customer.email}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onEnterContext(customer)}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          >
            Manage as Customer
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Organisation Details</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Organisation', value: customer.name },
              { label: 'Contact', value: customer.contactName },
              { label: 'Email', value: customer.email },
              { label: 'Phone', value: customer.phone ?? '—' },
              { label: 'Website', value: customer.website ?? '—' },
              { label: 'Status', value: <StatusBadge variant={customer.status.toLowerCase() as any} /> },
              { label: 'Created', value: customer.createdDate },
              { label: 'Last activity', value: customer.lastActivity },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between gap-4">
                <span className="text-xs text-gray-500 shrink-0">{r.label}</span>
                <span className="text-xs font-medium text-gray-800 text-right">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recruitment Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Open Jobs', value: customer.openJobs },
                { label: 'Candidates', value: customer.candidateCount },
              ].map(m => (
                <div key={m.label} className="p-3 bg-gray-50 rounded-xl border border-border text-center">
                  <p className="text-xl font-bold text-gray-900">{m.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Assigned Admin</h3>
            {assignedAdmin ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {assignedAdmin.initials}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{assignedAdmin.name}</p>
                  <p className="text-[10px] text-gray-400">{assignedAdmin.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No admin assigned</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Actions</h3>
            <div className="space-y-2">
              <Button variant="secondary" size="sm" className="w-full justify-start">Assign Admin</Button>
              {customer.status === 'Active' ? (
                <Button variant="danger" size="sm" className="w-full justify-start">Deactivate Organisation</Button>
              ) : (
                <Button variant="secondary" size="sm" className="w-full justify-start">Reactivate Organisation</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomers({ onEnterContext, userId, isPlatformOwner }: AdminCustomersProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Customer | null>(null);

  const myCustomers = isPlatformOwner ? CUSTOMERS : (() => {
    const admin = ADMINS.find(a => a.id === userId);
    return CUSTOMERS.filter(c => admin?.assignedCustomerIds.includes(c.id));
  })();

  const filtered = myCustomers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.contactName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && c.status.toLowerCase() !== statusFilter) return false;
    return true;
  });

  if (selected) {
    return <CustomerDetail customer={selected} onBack={() => setSelected(null)} onEnterContext={onEnterContext} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <PageHeader
        title={isPlatformOwner ? 'Customers' : 'My Customers'}
        subtitle={`${filtered.length} organisation${filtered.length !== 1 ? 's' : ''}`}
        action={isPlatformOwner ? (
          <Button variant="primary" size="sm" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>
            New Customer
          </Button>
        ) : undefined}
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search organisations…" /></div>
        {isPlatformOwner && (
          <div className="flex items-center gap-1 p-1 bg-white border border-border rounded-lg">
            {['all', 'active', 'inactive', 'archived'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${statusFilter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>}
          title="No customers found"
          description="Adjust your search or filters."
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Organisation', 'Contact', 'Open Jobs', 'Candidates', 'Assigned Admin', 'Status', 'Last Activity', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const admin = ADMINS.find(a => a.id === c.assignedAdminId);
                return (
                  <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-900">{c.name}</p>
                      {c.website && <p className="text-[10px] text-gray-400">{c.website}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700">{c.contactName}</p>
                      <p className="text-[10px] text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.openJobs}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.candidateCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{admin?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><StatusBadge variant={c.status.toLowerCase() as any} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{c.lastActivity}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); onEnterContext(c); }}
                        className="text-[10px] font-medium text-lime hover:underline cursor-pointer"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
