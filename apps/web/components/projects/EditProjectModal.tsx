'use client';

import { useEffect, useState } from 'react';

export default function EditProjectModal({
  open,
  initialName,
  initialDescription,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  initialName: string;
  initialDescription?: string | null;
  onClose: () => void;
  onSave: (payload: { name: string; description?: string | null }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription ?? '');
  }, [open, initialName, initialDescription]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-soft p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">Modifier le projet</h3>
            <p className="mt-1 text-sm text-slate-600">
              Mets à jour le nom et la description.
            </p>
          </div>

          <button onClick={onClose} className="text-sm font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-orange"
              placeholder="Nom du projet"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-orange"
              placeholder="Description (optionnel)"
              rows={4}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
          >
            Annuler
          </button>

          <button
            disabled={loading || !name.trim()}
            onClick={() => onSave({ name: name.trim(), description: description.trim() ? description.trim() : null })}
            className="rounded-xl bg-gia-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
