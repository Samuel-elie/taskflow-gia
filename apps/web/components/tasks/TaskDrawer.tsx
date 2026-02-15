'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, MessageSquareText, Calendar, User, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/fetcher';
import type { ProjectMember, Task } from '@/lib/types';
import ActivityTimeline from '@/components/tasks/ActivityTimeline';
import CommentBox from '@/components/tasks/CommentBox';
import AttachmentsPanel from '@/components/tasks/AttachmentsPanel';

type Role = 'OWNER' | 'MANAGER' | 'MEMBER';

type CommentItem = {
  comment_id: string;
  content: string;
  user_id: string;
  creator_name: string;
  creation_date: string;
};

function initials(name?: string) {
  const n = (name ?? '').trim();
  if (!n) return '—';
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('');
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function statusBadge(status?: string) {
  const s = status ?? '—';
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold';
  if (s === 'TODO') return `${base} bg-slate-100 text-slate-700`;
  if (s === 'DOING') return `${base} bg-gia-orange/10 text-gia-navy`;
  if (s === 'DONE') return `${base} bg-emerald-50 text-emerald-700`;
  if (s === 'DESISTE') return `${base} bg-red-50 text-red-700`;
  return `${base} bg-slate-100 text-slate-700`;
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5">
      <div className="text-sm font-extrabold text-gia-navy">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function TaskDrawer({
  open,
  taskId,
  onClose,

  members,
  meUserId,
  role,

  onAccept,
  onCloseTask,
  onDesist,
  onReassign,
  onEdit,
  onDelete,

  onTaskLoaded,
}: {
  open: boolean;
  taskId: string | null;
  onClose: () => void;

  members: ProjectMember[];
  meUserId: string | null;
  role: Role;

  onAccept?: (task: Task) => void | Promise<void>;
  onCloseTask?: (task: Task) => void | Promise<void>;
  onDesist?: (task: Task) => void | Promise<void>;
  onReassign?: (task: Task) => void | Promise<void>;
  onEdit?: (task: Task) => void | Promise<void>;
  onDelete?: (task: Task) => void | Promise<void>;

  onTaskLoaded?: (task: Task) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAssignee = useMemo(() => {
    if (!meUserId || !task) return false;
    return ((task as any).assignee_id ?? null) === meUserId;
  }, [meUserId, task]);

  const assigneeLabel = useMemo(() => {
    if (!task) return '—';
    const id = (task as any).assignee_id ?? null;
    if (!id) return 'Non assignée';
    const m = members.find((x) => x.user.user_id === id);
    return m?.user.name ?? m?.user.email ?? '—';
  }, [task, members]);

  const canAccept = !!task && isAssignee && task.status === 'TODO';
  const canClose = !!task && isAssignee && task.status === 'DOING';
  const canDesist = !!task && isAssignee && (task.status === 'TODO' || task.status === 'DOING');
  const canPrivileged = role === 'OWNER' || role === 'MANAGER';
  const canEditDelete = !!task && canPrivileged && task.status === 'TODO';
  const canReassign = !!task && canPrivileged && (task as any).status === 'DESISTE';

  async function loadTaskAndComments(id: string) {
    setErr(null);
    setLoading(true);
    setCommentsLoading(true);

    try {
      const t = await apiFetch<Task>(`/tasks/${id}`);
      setTask(t);
      onTaskLoaded?.(t);

      const c = await apiFetch<CommentItem[]>(`/tasks/${id}/comments`);
      setComments(Array.isArray(c) ? c : (c as any).items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Impossible de charger la tâche');
      setTask(null);
      setComments([]);
    } finally {
      setLoading(false);
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !taskId) return;
    loadTaskAndComments(taskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  useEffect(() => {
    if (!open) {
      setErr(null);
    }
  }, [open]);

  async function submitComment(content: string) {
    if (!taskId) return;
    const trimmed = content.trim();
    if (trimmed.length < 2) return;

    setSending(true);
    setErr(null);

    try {
      const created = await apiFetch<CommentItem>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: trimmed }),
      });
      setComments((prev) => [...prev, created]);
    } catch (e: any) {
      setErr(e?.message ?? "Impossible d'envoyer le commentaire");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-soft flex flex-col">
        <div className="border-b border-slate-200/60 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={statusBadge(task?.status)}>{task?.status ?? '—'}</span>

                {loading ? (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Chargement…
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 text-xl font-extrabold text-gia-navy break-words">
                {task?.title ?? 'Tâche'}
              </h2>

              {err ? (
                <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              ) : null}

              {!!task && isAssignee ? (
                <div className="mt-2 text-xs text-slate-500">Vous êtes l’assigné de cette tâche.</div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl p-2 opacity-70 hover:bg-gia-bg2 hover:opacity-100"
              aria-label="Fermer"
              type="button"
            >
              <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/60 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                <User className="h-4 w-4" aria-hidden="true" />
                Assigné à
              </div>
              <div className="mt-2 font-extrabold text-gia-text">{assigneeLabel}</div>
            </div>

            <div className="rounded-3xl border border-slate-200/60 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Deadline
              </div>
              <div className="mt-2 font-extrabold text-gia-text">
                {fmtDate((task as any)?.deadline ?? null)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
          <Card title="Description">
            <div className="text-sm text-slate-600 whitespace-pre-line">
              {(task as any)?.description?.trim() ? (task as any).description : '—'}
            </div>

            {(task as any)?.status === 'DESISTE' ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-extrabold">Désistement</div>
                {(task as any)?.desist_reason ? (
                  <div className="mt-1">
                    Motif : <span className="font-semibold">{(task as any).desist_reason}</span>
                  </div>
                ) : null}
                {(task as any)?.desist_comment ? (
                  <div className="mt-1">Commentaire : {(task as any).desist_comment}</div>
                ) : null}
              </div>
            ) : null}
          </Card>

          {!!task?.task_id ? (
            <Card title="Fichiers">
              <AttachmentsPanel taskId={task.task_id} />
            </Card>
          ) : null}

          {!!task?.task_id ? (
            <Card title="Historique">
              <ActivityTimeline taskId={task.task_id} />
            </Card>
          ) : null}

          <Card title="Commentaires">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                Total
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                {comments.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {commentsLoading ? (
                <div className="text-sm text-slate-500">Chargement des commentaires…</div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-slate-500">Aucun commentaire pour l’instant.</div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.comment_id}
                    className="rounded-3xl border border-slate-200/60 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-2xl bg-gia-bg2 flex items-center justify-center text-xs font-extrabold text-gia-navy">
                        {initials(c.creator_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-extrabold text-gia-text">{c.creator_name}</div>
                          <div className="text-xs text-slate-500">{fmtDate(c.creation_date)}</div>
                        </div>
                        <div className="mt-1 text-sm text-slate-700 whitespace-pre-line break-words">
                          {c.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5">
              <CommentBox
                members={members as any}
                loading={sending}
                onSubmit={submitComment}
              />
            </div>
          </Card>
        </div>

        <div className="border-t border-slate-200/60 px-6 py-4 bg-white">
          <div className="flex flex-wrap gap-2">
            {canAccept ? (
              <button
                onClick={() => task && onAccept?.(task)}
                className="rounded-2xl bg-gia-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-gia-navy2"
                type="button"
              >
                Accuser réception
              </button>
            ) : null}

            {canClose ? (
              <button
                onClick={() => task && onCloseTask?.(task)}
                className="rounded-2xl bg-gia-cyan px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                type="button"
              >
                Clôturer
              </button>
            ) : null}

            {canDesist ? (
              <button
                onClick={() => task && onDesist?.(task)}
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                type="button"
              >
                Se désister
              </button>
            ) : null}

            {canReassign ? (
              <button
                onClick={() => task && onReassign?.(task)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-gia-navy hover:bg-gia-bg2"
                type="button"
              >
                Réassigner
              </button>
            ) : null}

            {canEditDelete ? (
              <>
                <button
                  onClick={() => task && onEdit?.(task)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-gia-navy hover:bg-gia-bg2"
                  type="button"
                >
                  Modifier
                </button>

                <button
                  onClick={() => task && onDelete?.(task)}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                  type="button"
                >
                  Supprimer
                </button>
              </>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
