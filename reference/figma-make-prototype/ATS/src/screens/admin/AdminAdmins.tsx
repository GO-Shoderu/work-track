import React, { useState } from 'react';
import { ADMINS, CUSTOMERS } from '../../data/mock';
import { PageHeader, Card, StatusBadge, Button, EmptyState } from '../../components/ui';
import type { Admin } from '../../types';

function AdminDetailPanel({ admin, onClose }: { admin: Admin; onClose: () => void }) {
  const assignedCustomers = CUSTOMERS.filter(c => admin.assignedCustomerIds.includes(c.id));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-900">Admin Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar flex items-center justify-center text-sm font-bold text-white shrink-0">
              {admin.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{admin.name}</p>
              <p className="text-xs text-gray-500">{admin.email}</p>
              <StatusBadge variant={admin.status.toLowerCase() as any} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Role</p>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-900 text-white">{admin.role}</span>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Assigned Customers ({assignedCustomers.length})</p>
            {assignedCustomers.length === 0 ? <p className="text-xs text-gray-400">None assigned</p> : (
              <div className="space-y-1.5">
                {assignedCustomers.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs font-medium text-gray-700">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {admin.permissions.map(p => (
                <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {p.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Activity</p>
            <p className="text-xs text-gray-600">{admin.lastActivity}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-between px-6 pb-5">
          <Button variant="danger" size="sm">
            {admin.status === 'Active' ? 'Deactivate Account' : 'Reactivate Account'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button variant="secondary" size="sm">Edit Permissions</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAdmins() {
  const [selected, setSelected] = useState<Admin | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <PageHeader
        title="Admins"
        subtitle="Manage administrator accounts and permissions"
        action={
          <Button variant="primary" size="sm" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>
            New Admin
          </Button>
        }
      />

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Admin', 'Role', 'Customers', 'Permissions', 'Status', 'Last Activity', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMINS.map(a => (
              <tr key={a.id} onClick={() => setSelected(a)} className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-sidebar flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {a.initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{a.name}</p>
                      <p className="text-[10px] text-gray-400">{a.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.role === 'Platform Owner' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {a.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{a.assignedCustomerIds.length}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {a.permissions.slice(0, 2).map(p => (
                      <span key={p} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{p.replace(/_/g, ' ')}</span>
                    ))}
                    {a.permissions.length > 2 && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">+{a.permissions.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge variant={a.status.toLowerCase() as any} /></td>
                <td className="px-4 py-3 text-xs text-gray-400">{a.lastActivity}</td>
                <td className="px-4 py-3">
                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selected && <AdminDetailPanel admin={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
