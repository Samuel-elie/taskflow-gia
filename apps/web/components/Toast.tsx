'use client';

import { useEffect } from 'react';

type ToastType = 'success' | 'error';

export default function Toast({
  open,
  type,
  message,
  onClose,
  durationMs = 3000,
}: {
  open: boolean;
  type: ToastType;
  message: string;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose(), durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const styles =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800';

  return (
    <div className="fixed right-6 top-6 z-50">
      <div className={`min-w-[320px] rounded-2xl border px-4 py-3 shadow-soft ${styles}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold">{message}</div>
          <button
            onClick={onClose}
            className="text-xs font-bold opacity-60 hover:opacity-100"
            aria-label="close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
