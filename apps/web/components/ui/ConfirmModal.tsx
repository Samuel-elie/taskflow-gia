'use client';

import { X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center p-6">
      <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-soft border border-slate-200/60">
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-200/60 bg-white/70">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{message}</p>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Fermer"
            className="rounded-2xl p-2 opacity-70 hover:bg-gia-bg2 hover:opacity-100"
            disabled={!!loading}
          >
            <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-5 bg-white">
          <button
            onClick={onClose}
            type="button"
            disabled={!!loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            disabled={!!loading}
            onClick={onConfirm}
            type="button"
            className={[
              'rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60',
              danger ? 'bg-red-600 hover:opacity-90' : 'bg-gia-navy hover:bg-gia-navy2',
            ].join(' ')}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
