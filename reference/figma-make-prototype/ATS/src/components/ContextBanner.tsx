import React from 'react';
import type { Customer } from '../types';

interface ContextBannerProps {
  customer: Customer;
  onExit: () => void;
}

export default function ContextBanner({ customer, onExit }: ContextBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-amber-800">
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
        </svg>
        <span className="text-xs font-medium">
          Managing customer workspace: <strong>{customer.name}</strong>
        </span>
      </div>
      <button
        onClick={onExit}
        className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Return to Platform Administration
      </button>
    </div>
  );
}
