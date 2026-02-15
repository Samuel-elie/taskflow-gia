'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type FeedbackType = 'success' | 'error';

export default function FeedbackModal({
  open,
  type,
  title,
  message,
  onClose,
  autoCloseMs = 2400,
}: {
  open: boolean;
  type: FeedbackType;
  title: string;
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose(), autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  const ok = type === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-soft p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              ok ? 'bg-emerald-50' : 'bg-red-50'
            }`}
          >
            {ok ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-700" aria-hidden="true" />
            ) : (
              <XCircle className="h-7 w-7 text-red-700" aria-hidden="true" />
            )}
          </div>

          <div className="flex-1">
            <div className="text-lg font-extrabold text-gia-navy">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{message}</div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={onClose}
                type="button"
                className="rounded-xl bg-gia-navy px-4 py-2 text-sm font-semibold text-white hover:bg-gia-navy2"
              >
                OK
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 h-1 w-full rounded-full bg-gia-orange/90" />
      </div>
    </div>
  );
}
