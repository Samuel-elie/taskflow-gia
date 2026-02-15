'use client';

import { useEffect, useState } from 'react';
import { X, PencilLine } from 'lucide-react';

export default function EditWorkspaceModal({
  open,
  initialName,
  active,
  loading,
  onClose,
  onSave,
}: {
  open: boolean;
  initialName: string;
  active: number;
  loading: boolean;
  onClose: () => void;
  onSave: (payload: { name: string }) => void;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
  }, [open, initialName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-soft p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gia-navy">
              <PencilLine className="h-5 w-5 text-gia-orange" aria-hidden="true" />
              Renommer le workspace
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Statut actuel : {active === 1 ? 'Actif' : 'Désactivé'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 opacity-70 hover:bg-gia-bg2 hover:opacity-100"
            aria-label="Fermer"
            type="button"
          >
            <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-700">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-orange"
            placeholder="Nom du workspace"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
            type="button"
          >
            Annuler
          </button>

          <button
            disabled={loading || !name.trim()}
            onClick={() => onSave({ name: name.trim() })}
            className="rounded-xl bg-gia-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            type="button"
          >
            {loading ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
