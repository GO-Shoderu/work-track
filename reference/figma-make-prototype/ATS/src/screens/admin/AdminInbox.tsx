import React, { useState } from 'react';
import { INBOX_ITEMS } from '../../data/mock';
import type { InboxItem } from '../../types';
import { Card, StatusBadge, Button } from '../../components/ui';

const TYPE_ICON: Record<InboxItem['type'], string> = {
  review_request: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  admin_action: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  system: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

const PRIORITY_COLOR: Record<InboxItem['priority'], string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-gray-100 text-gray-500',
};

export default function AdminInbox() {
  const [items, setItems] = useState(INBOX_ITEMS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayed = filter === 'unread' ? items.filter(i => !i.read) : items;
  const unreadCount = items.filter(i => !i.read).length;

  const markRead = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
  const markAllRead = () => setItems(prev => prev.map(i => ({ ...i, read: true })));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inbox</h1>
          <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-white border border-border rounded-lg">
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                {f === 'all' ? 'All' : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
          {unreadCount > 0 && <Button size="sm" variant="ghost" onClick={markAllRead}>Mark all read</Button>}
        </div>
      </div>

      <div className="space-y-2 max-w-2xl">
        {displayed.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-sm font-medium text-gray-500">All caught up</p>
            <p className="text-xs text-gray-400 mt-1">No unread notifications.</p>
          </Card>
        ) : displayed.map(item => (
          <Card
            key={item.id}
            className={`p-4 cursor-pointer transition-all ${!item.read ? 'border-lime/40 bg-lime/[0.02]' : ''}`}
            onClick={() => markRead(item.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!item.read ? 'bg-lime/15' : 'bg-gray-100'}`}>
                <svg className={`w-4 h-4 ${!item.read ? 'text-lime-hover' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICON[item.type]} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold ${!item.read ? 'text-gray-900' : 'text-gray-700'}`}>{item.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${PRIORITY_COLOR[item.priority]}`}>{item.priority}</span>
                    {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" />}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">{item.date}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
