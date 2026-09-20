import React, { useEffect } from 'react';

interface ToastData {
  message: string;
  onUndo?: () => void;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm">
        <svg className="w-4 h-4 text-lime shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{toast.message}</span>
        {toast.onUndo && (
          <button
            onClick={() => { toast.onUndo!(); onDismiss(); }}
            className="ml-1 text-lime font-semibold hover:text-lime-hover transition-colors cursor-pointer underline underline-offset-2"
          >
            Undo
          </button>
        )}
        <button onClick={onDismiss} className="ml-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
