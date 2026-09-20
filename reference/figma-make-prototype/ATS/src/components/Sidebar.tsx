import React from 'react';
import type { Screen, User } from '../types';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function NavIcon({ d, ...props }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  jobs: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  candidates: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  pipeline: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
  customers: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  review: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  admins: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  audit: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
};

function getNavItems(user: User, inboxCount = 2, reviewCount = 3): NavItem[] {
  if (user.role === 'platform_owner') {
    return [
      { id: 'admin-overview', label: 'Overview', icon: <NavIcon d={ICONS.overview} /> },
      { id: 'admin-customers', label: 'Customers', icon: <NavIcon d={ICONS.customers} /> },
      { id: 'admin-review', label: 'Review', icon: <NavIcon d={ICONS.review} />, badge: reviewCount },
      { id: 'admin-admins', label: 'Admins', icon: <NavIcon d={ICONS.admins} /> },
      { id: 'admin-inbox', label: 'Inbox', icon: <NavIcon d={ICONS.inbox} />, badge: inboxCount },
      { id: 'admin-audit', label: 'Audit', icon: <NavIcon d={ICONS.audit} /> },
    ];
  }
  if (user.role === 'admin') {
    return [
      { id: 'admin-overview', label: 'Overview', icon: <NavIcon d={ICONS.overview} /> },
      { id: 'admin-customers', label: 'My Customers', icon: <NavIcon d={ICONS.customers} /> },
      { id: 'admin-inbox', label: 'Inbox', icon: <NavIcon d={ICONS.inbox} />, badge: inboxCount },
    ];
  }
  return [
    { id: 'customer-overview', label: 'Overview', icon: <NavIcon d={ICONS.overview} /> },
    { id: 'customer-jobs', label: 'Jobs', icon: <NavIcon d={ICONS.jobs} /> },
    { id: 'customer-candidates', label: 'Candidates', icon: <NavIcon d={ICONS.candidates} /> },
    { id: 'customer-pipeline', label: 'Pipeline', icon: <NavIcon d={ICONS.pipeline} /> },
  ];
}

function getSettingsScreen(user: User): Screen {
  return user.role === 'customer' ? 'customer-settings' : 'admin-settings';
}

interface SidebarProps {
  user: User;
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  inboxCount?: number;
  reviewCount?: number;
}

export default function Sidebar({ user, screen, onNavigate, onLogout, inboxCount = 2, reviewCount = 3 }: SidebarProps) {
  const items = getNavItems(user, inboxCount, reviewCount);
  const settingsScreen = getSettingsScreen(user);

  return (
    <aside className="w-[220px] min-h-screen bg-sidebar flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lime flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0D0F14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">WorkTrack</span>
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 mb-4 px-3 py-2.5 rounded-xl bg-sidebar-hover">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-lime flex items-center justify-center text-[10px] font-bold text-[#0D0F14] shrink-0">
            {user.initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">
              {user.role === 'platform_owner' ? 'Platform Owner' : user.role === 'admin' ? 'Admin' : 'Recruiter'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div className="px-5 mb-1">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          {user.role === 'customer' ? 'Workspace' : 'Administration'}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2">
        {items.map(item => {
          const isActive = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-lime text-[#0D0F14] font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-sidebar-hover font-medium'
              }`}
            >
              {item.icon}
              <span className="text-[13px] flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  isActive ? 'bg-[#0D0F14]/20 text-[#0D0F14]' : 'bg-red-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 border-t border-white/5 pt-2 mt-2">
        <button
          onClick={() => onNavigate(settingsScreen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all cursor-pointer text-left ${
            screen === settingsScreen ? 'bg-lime text-[#0D0F14] font-semibold' : 'text-gray-400 hover:text-white hover:bg-sidebar-hover font-medium'
          }`}
        >
          <NavIcon d={ICONS.settings} />
          <span className="text-[13px]">Settings</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-sidebar-hover transition-all cursor-pointer text-left font-medium"
        >
          <NavIcon d={ICONS.logout} />
          <span className="text-[13px]">Log out</span>
        </button>
      </div>
    </aside>
  );
}
