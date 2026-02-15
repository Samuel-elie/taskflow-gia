'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectMember } from '@/lib/types';
import { X } from 'lucide-react';

export default function ReassignModal({
  open,
  loading,
  members,
  currentAssigneeId,
  onClose,
  onContinue,
}: {
  open: boolean;
  loading: boolean;
  members: ProjectMember[];
  currentAssigneeId?: string | null;
  onClose: () => void;
  onContinue: (assignee_id: string) => void;
}) {
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    if (!open) return;
    setAssigneeId('');
  }, [open]);

  const options = useMemo(() => {
    return members.filter((m) => m.user.user_id !== (currentAssigneeId ?? null));
  }, [members, currentAssigneeId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-soft border border-slate-200/60 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">Réassigner la tâche</h3>
            <p className="mt-1 text-sm text-slate-600">Choisis le nouveau membre.</p>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Fermer"
            className="rounded-2xl p-2 opacity-70 hover:bg-gia-bg2 hover:opacity-100"
            disabled={loading}
          >
            <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6">
          <label className="text-sm font-extrabold text-slate-700">Nouveau membre</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-gia-navy outline-none focus:border-gia-cyan"
            disabled={loading}
          >
            <option value="">— Sélectionner —</option>
            {options.map((m) => (
              <option key={m.user.user_id} value={m.user.user_id}>
                {m.user.name ? `${m.user.name} (${m.user.email})` : m.user.email}
              </option>
            ))}
          </select>

          <div className="mt-2 text-xs text-slate-500">
            La réassignation repassera la tâche en <span className="font-extrabold">TODO</span>.
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
            disabled={loading}
          >
            Annuler
          </button>

          <button
            disabled={loading || !assigneeId}
            onClick={() => onContinue(assigneeId)}
            type="button"
            className="rounded-2xl bg-gia-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60"
          >
            Continuer
          </button>
        </div>

        <div className="mt-5 h-1 w-full rounded-full bg-gia-navy" />
      </div>
    </div>
  );
}
