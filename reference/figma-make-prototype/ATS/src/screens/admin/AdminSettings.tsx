import React from 'react';
import { Card, Button } from '../../components/ui';
import type { User } from '../../types';

export default function AdminSettings({ user }: { user: User }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Platform account preferences</p>
      </div>

      <div className="max-w-2xl space-y-5">
        <Card className="p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Profile</h2>
          <div className="space-y-3">
            {[{ label: 'Full name', value: user.name }, { label: 'Email', value: user.email }].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input defaultValue={f.value} className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
              </div>
            ))}
          </div>
          <Button size="sm" variant="primary" className="mt-4">Save Changes</Button>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Password</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
              <input type="password" className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
              <input type="password" className="w-full h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime" />
            </div>
          </div>
          <Button size="sm" variant="secondary" className="mt-4">Update Password</Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role & Access</h2>
          </div>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-border">
            <p className="text-xs font-semibold text-gray-800">{user.role === 'platform_owner' ? 'Platform Owner' : 'Admin'}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Role is assigned by the platform owner and cannot be self-modified.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
