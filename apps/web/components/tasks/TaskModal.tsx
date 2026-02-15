'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectMember, TaskPriority, TaskStatus } from '@/lib/types';
import { X } from 'lucide-react';

type ExtendedStatus = TaskStatus | 'DESISTE';
type WorkspaceRole = 'OWNER' | 'MANAGER' | 'MEMBER';

function isPrivileged(role?: WorkspaceRole) {
  return role === 'OWNER' || role === 'MANAGER';
}

function Pill({ children }: { children: any }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
      {children}
    </span>
  );
}

export default function TaskModal({
  open,
  mode,
  initial,
  members,
  onClose,
  onSave,
  loading,
  meRole = 'MEMBER',
  taskStatus,
  reassignOnly = false,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: {
    title?: string;
    description?: string | null;
    status?: ExtendedStatus;
    priority?: TaskPriority;
    deadline?: string | null;
    assignee_id?: string | null;
  };
  members: ProjectMember[];
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description?: string | null;
    priority: TaskPriority;
    deadline?: string | null;
    assignee_id?: string | null;
  }) => void;
  loading: boolean;

  meRole?: WorkspaceRole;
  taskStatus?: ExtendedStatus;
  reassignOnly?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [deadline, setDeadline] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');

  const isCreate = mode === 'create';
  const effectiveStatus: ExtendedStatus = (taskStatus ?? initial?.status ?? (isCreate ? 'TODO' : 'TODO')) as any;

  const canAssign = useMemo(() => {
    if (!isPrivileged(meRole)) return false;
    if (isCreate) return true;
    if (reassignOnly) return true;
    return effectiveStatus === 'TODO' || effectiveStatus === 'DESISTE';
  }, [meRole, isCreate, reassignOnly, effectiveStatus]);

  useEffect(() => {
    if (!open) return;

    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setPriority(initial?.priority ?? 'MEDIUM');

    const iso = initial?.deadline ?? null;
    setDeadline(iso ? iso.slice(0, 16) : '');

    setAssigneeId(initial?.assignee_id ?? '');
  }, [open, initial]);

  if (!open) return null;

  const headerTitle = isCreate ? 'Créer une tâche' : reassignOnly ? 'Réassigner la tâche' : 'Modifier la tâche';
  const helperText = isCreate
    ? 'Renseigne les informations. Le statut sera automatiquement TODO.'
    : reassignOnly
    ? 'Choisis le nouveau membre. La réassignation finale se confirme ensuite.'
    : 'Modifie les informations. Le statut ne change pas ici.';

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-soft border border-slate-200/60 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">{headerTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">{helperText}</p>

            {!isCreate ? (
              <div className="mt-3">
                <Pill>
                  Statut : <span className="ml-1 text-gia-navy">{effectiveStatus}</span>
                </Pill>
              </div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Fermer"
            className="rounded-2xl p-2 opacity-70 hover:bg-gia-bg2 hover:opacity-100"
          >
            <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-extrabold text-slate-700">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={reassignOnly}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan disabled:bg-slate-50"
              placeholder="Ex: Mettre en place CI/CD"
            />
          </div>

          <div>
            <label className="text-sm font-extrabold text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={reassignOnly}
              className="mt-2 w-full min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan disabled:bg-slate-50"
              placeholder="Détails (optionnel)"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-sm font-extrabold text-slate-700">Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={reassignOnly}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-3 outline-none focus:border-gia-cyan disabled:bg-slate-50"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-sm font-extrabold text-slate-700">Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={reassignOnly}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-extrabold text-slate-700">Assignation</label>

            {canAssign ? (
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-gia-navy outline-none focus:border-gia-cyan"
              >
                <option value="">Non assignée</option>
                {members.map((m) => (
                  <option key={m.user.user_id} value={m.user.user_id}>
                    {m.user.name ? `${m.user.name} (${m.user.email})` : m.user.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-700">
                {assigneeId
                  ? members.find((m) => m.user.user_id === assigneeId)?.user.name ??
                    members.find((m) => m.user.user_id === assigneeId)?.user.email ??
                    '—'
                  : 'Non assignée'}
              </div>
            )}

            {!canAssign ? (
              <div className="mt-1 text-xs text-slate-500">
                Vous n’avez pas les droits pour modifier l’assignation.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-gia-navy hover:bg-gia-bg2"
          >
            Annuler
          </button>

          <button
            disabled={loading || !title.trim()}
            type="button"
            onClick={() =>
              onSave({
                title: title.trim(),
                description: description.trim() ? description.trim() : null,
                priority,
                deadline: deadline ? new Date(deadline).toISOString() : null,
                assignee_id: assigneeId || null,
              })
            }
            className="rounded-2xl bg-gia-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60"
          >
            {loading ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>

        <div className="mt-5 h-1 w-full rounded-full bg-gia-navy" />
      </div>
    </div>
  );
}
