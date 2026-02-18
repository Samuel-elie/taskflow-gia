'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import Header from '@/components/Header';
import TaskModal from '@/components/tasks/TaskModal';
import ReassignModal from '@/components/tasks/ReassignModal';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import type { Project, ProjectMember, Task, TaskStatus } from '@/lib/types';

import {
  ArrowLeft,
  Plus,
  PencilLine,
  Trash2,
  CheckCircle2,
  Flag,
  Ban,
  UserRoundPlus,
  TriangleAlert,
  X,
  Eye,
  LayoutGrid,
  Search,
} from 'lucide-react';

type Role = 'OWNER' | 'MANAGER' | 'MEMBER';

type Me = {
  user_id: string;
  email?: string;
  name?: string;
  role?: Role;
};

type ExtendedStatus = TaskStatus | 'DESISTE';

function groupByStatus(tasks: Task[]) {
  return {
    TODO: tasks.filter((t) => t.status === 'TODO'),
    DOING: tasks.filter((t) => t.status === 'DOING'),
    DONE: tasks.filter((t) => t.status === 'DONE'),
    // @ts-ignore
    DESISTE: tasks.filter((t) => t.status === 'DESISTE'),
  } as const;
}

function isPrivileged(role?: Role) {
  return role === 'OWNER' || role === 'MANAGER';
}

function findDeadlineConflicts(args: {
  tasks: Task[];
  assigneeId: string;
  targetDeadlineISO: string | null;
  excludeTaskId?: string;
  windowHours?: number;
}) {
  const { tasks, assigneeId, targetDeadlineISO, excludeTaskId, windowHours = 24 } = args;
  if (!targetDeadlineISO) return [];

  const target = new Date(targetDeadlineISO).getTime();
  const windowMs = windowHours * 60 * 60 * 1000;

  return tasks.filter((t) => {
    if (excludeTaskId && t.task_id === excludeTaskId) return false;
    if ((t.assignee_id ?? null) !== assigneeId) return false;
    if (!t.deadline) return false;

    const d = new Date(t.deadline).getTime();
    return Math.abs(d - target) <= windowMs && t.status !== 'DONE';
  });
}

function HumanToast({
  open,
  type,
  title,
  message,
  onClose,
}: {
  open: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  const base =
    'fixed top-5 right-5 z-[100] w-full max-w-md rounded-2xl border px-4 py-3 shadow-soft';
  const theme =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : type === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-red-200 bg-red-50 text-red-900';

  const Icon = type === 'success' ? CheckCircle2 : type === 'warning' ? TriangleAlert : Ban;

  return (
    <div className={`${base} ${theme}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-extrabold">{title}</div>
          <div className="mt-0.5 text-sm opacity-90 break-words">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto rounded-xl p-2 opacity-70 hover:opacity-100 hover:bg-white/60"
          type="button"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function DesistModal({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; comment: string }) => void;
}) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setComment('');
  }, [open]);

  if (!open) return null;

  const canSubmit = reason.trim().length >= 3 && comment.trim().length >= 5;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-soft p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">Se désister</h3>
            <p className="mt-1 text-sm text-slate-600">
              Indique le motif et un commentaire explicatif. Ces infos seront conservées.
            </p>
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

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-extrabold text-slate-700">Motif</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan"
              placeholder="Ex: surcharge / indisponible / dépendance bloquante…"
            />
          </div>

          <div>
            <label className="text-sm font-extrabold text-slate-700">Commentaire</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 w-full min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan"
              placeholder="Explique clairement la justification…"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-gia-navy hover:bg-gia-bg2"
          >
            Annuler
          </button>

          <button
            disabled={loading || !canSubmit}
            onClick={() => onSubmit({ reason: reason.trim(), comment: comment.trim() })}
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

function PriorityPill({ p }: { p: any }) {
  const cls =
    p === 'HIGH'
      ? 'bg-red-50 text-red-700'
      : p === 'MEDIUM'
      ? 'bg-amber-50 text-amber-800'
      : 'bg-slate-100 text-slate-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>{p}</span>;
}

function OverduePill() {
  return (
    <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
      EN RETARD
    </span>
  );
}


function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white p-4 shadow-soft">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-gia-navy">{value}</div>
    </div>
  );
}

export default function ProjectKanbanPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();
  const DEFAULT_PAGE_SIZE = 100;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  function openDrawer(taskId: string) {
    setDrawerTaskId(taskId);
    setDrawerOpen(true);
  }

  const [toastOpen, setToastOpen] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [toastTitle, setToastTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  function showToast(type: 'success' | 'error' | 'warning', title: string, message: string) {
    setToastType(type);
    setToastTitle(title);
    setToastMessage(message);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 3500);
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDanger, setConfirmDanger] = useState(false);
  const [confirmLabel, setConfirmLabel] = useState('Confirmer');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  function openConfirm(args: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    action: () => Promise<void> | void;
  }) {
    setConfirmTitle(args.title);
    setConfirmMessage(args.message);
    setConfirmLabel(args.confirmLabel ?? 'Confirmer');
    setConfirmDanger(!!args.danger);
    setConfirmAction(() => args.action);
    setConfirmOpen(true);
  }

  const [desistOpen, setDesistOpen] = useState(false);
  const [desistLoading, setDesistLoading] = useState(false);
  const [desistTask, setDesistTask] = useState<Task | null>(null);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignTaskTarget, setReassignTaskTarget] = useState<Task | null>(null);
  const [reassignPickedAssignee, setReassignPickedAssignee] = useState<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<ExtendedStatus>('TODO');

  const [me, setMe] = useState<Me | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [q, setQ] = useState('');

  const grouped = useMemo(() => groupByStatus(tasks), [tasks]);
  const currentTasks = useMemo(() => {
    // @ts-ignore
    const list = grouped[activeTab] ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((t) => (t.title ?? '').toLowerCase().includes(s) || (t.description ?? '').toLowerCase().includes(s));
  }, [grouped, activeTab, q]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = grouped.TODO.length;
    const doing = grouped.DOING.length;
    const done = grouped.DONE.length;
    const desiste = grouped.DESISTE.length;
    return { total, todo, doing, done, desiste };
  }, [tasks.length, grouped]);

  async function loadAll() {
    setPageError(null);

    const meData = await apiFetch<Me>('/auth/me');
    const myRole = await apiFetch<{ role: Role }>(`/projects/${projectId}/me`);
    setMe({ ...meData, role: myRole.role });

    const p = await apiFetch<Project>(`/projects/${projectId}`);
    setProject(p);

    const m = await apiFetch<ProjectMember[]>(`/projects/${projectId}/members`);
    setMembers(m);

    const t = await apiFetch<any>(`/projects/${projectId}/tasks?page=1&pageSize=${DEFAULT_PAGE_SIZE}`);
    const items: Task[] = Array.isArray(t) ? t : t.items ?? t.tasks ?? [];
    setTasks(items);
  }

  //async function patchTask(taskId: string, payload: any) {
  //  return apiFetch<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  //}

async function ackTask(taskId: string) {
  return apiFetch<Task>(`/tasks/${taskId}/ack`, { method: 'PATCH' });
}

async function closeTaskApi(taskId: string) {
  return apiFetch<Task>(`/tasks/${taskId}/close`, { method: 'PATCH' });
}

async function desistTaskApi(taskId: string, payload: { reason: string; comment: string }) {
  return apiFetch<Task>(`/tasks/${taskId}/desist`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}


  async function acceptTask(task: Task) {
    openConfirm({
      title: 'Accuser réception',
      message: 'Confirmer la prise en charge (TODO → DOING) ?',
      confirmLabel: 'Confirmer',
      action: async () => {
        const meUserId = me?.user_id ?? null;
        if (!meUserId) return showToast('error', 'Erreur', "Impossible d'identifier l'utilisateur.");
        if ((task.assignee_id ?? null) !== meUserId) return showToast('error', 'Accès refusé', "Seul l'assigné peut accuser réception.");
        if (task.status !== 'TODO') return;

        const before = task;
        setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? { ...t, status: 'DOING' } : t)));

        //try {
        //  await patchTask(task.task_id, { status: 'DOING' });
        //  showToast('success', 'Succès', 'La tâche est maintenant en cours.');
        //  setActiveTab('DOING');
        //} catch (e: any) {
        //  setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? before : t)));
        //  showToast('error', 'Erreur', e?.message ?? "Impossible d'accuser réception.");
       // }
        try {
          await ackTask(task.task_id);
          showToast('success', 'Succès', 'La tâche est maintenant en cours.');
          setActiveTab('DOING');
        } catch (e: any) {
          setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? before : t)));
          showToast('error', 'Erreur', e?.message ?? "Impossible d'accuser réception.");
        }

      },
    });
  }

  async function closeTask(task: Task) {
    openConfirm({
      title: 'Clôturer',
      message: 'Confirmer la clôture (DOING → DONE) ?',
      confirmLabel: 'Clôturer',
      action: async () => {
        const meUserId = me?.user_id ?? null;
        if (!meUserId) return showToast('error', 'Erreur', "Impossible d'identifier l'utilisateur.");
        if ((task.assignee_id ?? null) !== meUserId) return showToast('error', 'Accès refusé', "Seul l'assigné peut clôturer la tâche.");
        if (task.status !== 'DOING') return;

        const before = task;
        setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? { ...t, status: 'DONE' } : t)));

        //try {
        //  await patchTask(task.task_id, { status: 'DONE' });
        //  showToast('success', 'Succès', 'La tâche est clôturée.');
        //  setActiveTab('DONE');
        //} catch (e: any) {
        //  setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? before : t)));
        //  showToast('error', 'Erreur', e?.message ?? 'Impossible de clôturer.');
        //}
        try {
          await closeTaskApi(task.task_id);
          showToast('success', 'Succès', 'La tâche est clôturée.');
          setActiveTab('DONE');
        } catch (e: any) {
          setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? before : t)));
          showToast('error', 'Erreur', e?.message ?? 'Impossible de clôturer.');
        }

      },
    });
  }

  function openDesist(task: Task) {
    setDesistTask(task);
    setDesistOpen(true);
  }

  async function submitDesist(payload: { reason: string; comment: string }) {
    const task = desistTask;
    if (!task) return;

    const meUserId = me?.user_id ?? null;
    if (!meUserId) return showToast('error', 'Erreur', "Impossible d'identifier l'utilisateur.");
    if ((task.assignee_id ?? null) !== meUserId) return showToast('error', 'Accès refusé', "Seul l'assigné peut se désister.");
    if (task.status !== 'TODO' && task.status !== 'DOING') return showToast('error', 'Erreur', "Le désistement n'est pas autorisé à ce statut.");

    setDesistLoading(true);
    const before = task;

    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === task.task_id
          ? ({
              ...t,
              // @ts-ignore
              status: 'DESISTE',
              // @ts-ignore
              assignee_id_old: t.assignee_id ?? null,
              assignee_id: null,
              // @ts-ignore
              desist_reason: payload.reason,
              // @ts-ignore
              desist_comment: payload.comment,
            } as any)
          : t,
      ),
    );

  //  try {
  //    await patchTask(task.task_id, {
  //      status: 'DESISTE',
  //      assignee_id_old: task.assignee_id ?? null,
  //      assignee_id: null,
  //      desist_reason: payload.reason,
  //      desist_comment: payload.comment,
  //    });

  //    showToast('success', 'Succès', 'Désistement enregistré. La tâche doit être réassignée.');
  //    setDesistOpen(false);
   //   setDesistTask(null);
   //   setActiveTab('DESISTE' as any);
   // } catch (e: any) {
  //    setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? before : t)));
  //    showToast('error', 'Erreur', e?.message ?? 'Impossible de se désister.');
 //   } finally {
 //     setDesistLoading(false);
  //  }

    try {
      await desistTaskApi(task.task_id, payload);

      showToast('success', 'Succès', 'Désistement enregistré. La tâche doit être réassignée.');
      setDesistOpen(false);
      setDesistTask(null);
      setActiveTab('DESISTE' as any);
    } catch (e: any) {
      setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? before : t)));
      showToast('error', 'Erreur', e?.message ?? 'Impossible de se désister.');
    } finally {
      setDesistLoading(false);
    }

  }

  function openReassign(task: Task) {
    setReassignTaskTarget(task);
    setReassignPickedAssignee(null);
    setReassignOpen(true);
  }

  async function continueReassign(assignee_id: string) {
    const task = reassignTaskTarget;
    if (!task) return;

    setReassignPickedAssignee(assignee_id);
    setReassignOpen(false);

    let warningText = '';
    if (task.deadline) {
      const conflicts = findDeadlineConflicts({
        tasks,
        assigneeId: assignee_id,
        targetDeadlineISO: task.deadline,
        excludeTaskId: task.task_id,
        windowHours: 24,
      });
      if (conflicts.length > 0) {
        warningText =
          `Attention : ce membre a déjà ${conflicts.length} tâche(s) avec une deadline proche.\n` +
          `Exemples : ${conflicts.slice(0, 2).map((c) => c.title).join(', ')}\n\n`;
      }
    }

    openConfirm({
      title: 'Réassigner',
      message: warningText + `La tâche repassera à TODO.\n\nContinuer ?`,
      confirmLabel: 'Réassigner',
      action: async () => {
        setReassignLoading(true);

        const before = task;
        setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? ({ ...t, assignee_id, status: 'TODO' } as any) : t)));

        try {
          const res = await apiFetch<{ task: any; warning?: any }>(`/tasks/${task.task_id}/reassign`, {
            method: 'PATCH',
            body: JSON.stringify({ assignee_id }),
          });

          setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? ({ ...t, ...res.task } as any) : t)));

          setReassignTaskTarget(null);
          setReassignPickedAssignee(null);
          setActiveTab('TODO');
          showToast('success', 'Succès', 'Tâche réassignée (statut → TODO).');

          if (res?.warning?.conflictsCount) {
            showToast('warning', 'Attention deadline', `Ce membre a déjà ${res.warning.conflictsCount} tâche(s) proche(s) de cette deadline.`);
          }
        } catch (e: any) {
          setTasks((prev) => prev.map((t) => (t.task_id === before.task_id ? before : t)));
          showToast('error', 'Erreur', e?.message ?? 'Réassignation impossible.');
        } finally {
          setReassignLoading(false);
        }
      },
    });
  }

  async function assignTask(taskId: string, assignee_id: string | null) {
    const task = tasks.find((t) => t.task_id === taskId);
    const before = task;

    let warningText = '';
    if (assignee_id && task?.deadline) {
      const conflicts = findDeadlineConflicts({
        tasks,
        assigneeId: assignee_id,
        targetDeadlineISO: task.deadline,
        excludeTaskId: taskId,
        windowHours: 24,
      });
      if (conflicts.length > 0) {
        warningText =
          `Attention : ce membre a déjà ${conflicts.length} tâche(s) avec une deadline proche. ` +
          `Exemples : ${conflicts.slice(0, 2).map((c) => c.title).join(', ')}.`;
      }
    }

    openConfirm({
      title: 'Assigner',
      message: warningText ? `${warningText}\n\nConfirmer l’assignation ?` : 'Confirmer l’assignation ?',
      confirmLabel: 'Assigner',
      action: async () => {
        setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, assignee_id } : t)));
        try {
          await apiFetch(`/tasks/${taskId}/assign`, { method: 'PATCH', body: JSON.stringify({ assignee_id }) });
          showToast('success', 'Succès', 'Assignation enregistrée.');
        } catch (e: any) {
          if (before) setTasks((prev) => prev.map((t) => (t.task_id === taskId ? before : t)));
          showToast('error', 'Erreur', e?.message ?? "Impossible d'assigner.");
        }
      },
    });
  }

  async function createTask(payload: any) {
    if (!project) return;

    try {
      setLoading(true);
      const created = await apiFetch<Task>(`/projects/${project.project_id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ ...payload, status: 'TODO' }),
      });

      setTasks((prev) => [created, ...prev]);
      setTaskModalOpen(false);
      showToast('success', 'Succès', 'Tâche créée.');
      setActiveTab('TODO');
    } catch (e: any) {
      showToast('error', 'Erreur', e?.message ?? 'Création impossible.');
    } finally {
      setLoading(false);
    }
  }

  async function updateTask(taskId: string, payload: any) {
    try {
      setLoading(true);
      const { status, ...safePayload } = payload ?? {};
      const updated = await apiFetch<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(safePayload) });
      setTasks((prev) => prev.map((t) => (t.task_id === taskId ? updated : t)));
      setTaskModalOpen(false);
      showToast('success', 'Succès', 'Tâche mise à jour.');
    } catch (e: any) {
      showToast('error', 'Erreur', e?.message ?? 'Update impossible.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(task: Task) {
    openConfirm({
      title: 'Supprimer',
      message: 'Confirmer la suppression de cette tâche ?',
      confirmLabel: 'Supprimer',
      danger: true,
      action: async () => {
        try {
          setLoading(true);
          await apiFetch(`/tasks/${task.task_id}`, { method: 'DELETE' });
          setTasks((prev) => prev.filter((t) => t.task_id !== task.task_id));
          showToast('success', 'Succès', 'Tâche supprimée.');
        } catch (e: any) {
          showToast('error', 'Erreur', e?.message ?? 'Suppression impossible.');
        } finally {
          setLoading(false);
        }
      },
    });
  }

  useEffect(() => {
    requireAuth();
    loadAll().catch((e) => {
      const msg = e?.message ?? 'Erreur chargement projet';
      setPageError(msg);
      showToast('error', 'Erreur', msg);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const role: Role = me?.role ?? 'MEMBER';

  return (
    <>
      <HumanToast open={toastOpen} type={toastType} title={toastTitle} message={toastMessage} onClose={() => setToastOpen(false)} />

      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        danger={confirmDanger}
        loading={confirmLoading}
        onClose={() => {
          if (confirmLoading) return;
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={async () => {
          if (!confirmAction) return;
          try {
            setConfirmLoading(true);
            await confirmAction();
          } finally {
            setConfirmLoading(false);
            setConfirmOpen(false);
            setConfirmAction(null);
          }
        }}
      />

      <DesistModal
        open={desistOpen}
        loading={desistLoading}
        onClose={() => {
          if (desistLoading) return;
          setDesistOpen(false);
          setDesistTask(null);
        }}
        onSubmit={submitDesist}
      />

      <ReassignModal
        open={reassignOpen}
        loading={reassignLoading}
        members={members}
        currentAssigneeId={reassignTaskTarget?.assignee_id ?? null}
        onClose={() => {
          if (reassignLoading) return;
          setReassignOpen(false);
          setReassignTaskTarget(null);
          setReassignPickedAssignee(null);
        }}
        onContinue={continueReassign}
      />

      <TaskModal
        open={taskModalOpen}
        mode={taskModalMode}
        members={members}
        loading={loading}
        initial={
          taskModalMode === 'edit' && editingTask
            ? {
                title: editingTask.title,
                description: editingTask.description ?? '',
                status: editingTask.status as any,
                priority: editingTask.priority,
                deadline: editingTask.deadline ?? null,
                assignee_id: editingTask.assignee_id ?? null,
              }
            : { status: 'TODO', priority: 'MEDIUM' }
        }
        onClose={() => setTaskModalOpen(false)}
        onSave={(payload) => {
          if (taskModalMode === 'create') return createTask(payload);
          if (!editingTask) return;
          return updateTask(editingTask.task_id, payload);
        }}
        meRole={role}
        taskStatus={(editingTask?.status as any) ?? undefined}
        reassignOnly={false}
      />

      <TaskDrawer
        open={drawerOpen}
        taskId={drawerTaskId}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerTaskId(null);
        }}
        members={members}
        meUserId={me?.user_id ?? null}
        role={role}
        onAccept={acceptTask}
        onCloseTask={closeTask}
        onDesist={openDesist}
        onReassign={openReassign}
        onEdit={(t: Task) => {
          setEditingTask(t);
          setTaskModalMode('edit');
          setTaskModalOpen(true);
        }}
        onDelete={deleteTask}
      />

      <div className="min-h-screen bg-gia-bg">
        {/* <Header /> */}

        <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
            <div className="p-6 sm:p-7 bg-gradient-to-r from-white via-white to-gia-bg2">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <button
                    onClick={() => {
                      const wsId = project?.workspace_id;
                      if (wsId) router.push(`/workspaces/${wsId}`);
                      else router.push('/workspaces');
                    }}
                    className="inline-flex items-center gap-2 text-sm font-extrabold text-gia-navy hover:underline"
                    type="button"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Retour
                  </button>

                  <h1 className="mt-3 text-3xl font-extrabold text-gia-navy">{project?.name ?? 'Projet'}</h1>
                  <p className="mt-1 text-sm text-slate-600 max-w-2xl">{project?.description ?? '—'}</p>

                  <div className="mt-2 text-xs text-slate-500">
                    Connecté : <span className="font-extrabold text-gia-navy">{me?.name ?? me?.email ?? '—'}</span> ·
                    Rôle : <span className="font-extrabold text-gia-navy">{role}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  {isPrivileged(role) ? (
                    <button
                      onClick={() => {
                        setTaskModalMode('create');
                        setEditingTask(null);
                        setTaskModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gia-navy px-5 py-3 text-sm font-extrabold text-white hover:bg-gia-navy2"
                      type="button"
                    >
                      <Plus className="h-5 w-5" aria-hidden="true" />
                      Nouvelle tâche
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-600">
                      Vous êtes <span className="text-gia-navy">{role}</span> : création de tâches réservée aux OWNER/MANAGER.
                    </div>
                  )}


                  <div className="text-xs text-slate-500">
                    Recherche + filtres par statut en bas 
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
                <StatCard label="Total" value={stats.total} />
                <StatCard label="TODO" value={stats.todo} />
                <StatCard label="DOING" value={stats.doing} />
                <StatCard label="DONE" value={stats.done} />
                <StatCard label="DESISTE" value={stats.desiste} />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs
                  active={activeTab}
                  counts={{
                    TODO: grouped.TODO.length,
                    DOING: grouped.DOING.length,
                    DONE: grouped.DONE.length,
                    DESISTE: grouped.DESISTE.length,
                  }}
                  onChange={(s) => setActiveTab(s as any)}
                />

                <div className="relative w-full sm:w-[340px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Recherche tâche (titre/description)…"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none focus:border-gia-cyan"
                  />
                  {q ? (
                    <button
                      type="button"
                      onClick={() => setQ('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 hover:bg-gia-bg2"
                      aria-label="Clear"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {pageError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
          ) : null}

          <TasksTable
            status={activeTab as any}
            tasks={currentTasks}
            members={members}
            me={me}
            role={role}
            onAssign={assignTask}
            onAccept={acceptTask}
            onCloseTask={closeTask}
            onDesist={openDesist}
            onReassign={openReassign}
            onEdit={(t) => {
              setEditingTask(t);
              setTaskModalMode('edit');
              setTaskModalOpen(true);
            }}
            onDelete={deleteTask}
            onOpenDetails={openDrawer}
          />
        </main>
      </div>
    </>
  );
}

function Tabs({
  active,
  counts,
  onChange,
}: {
  active: ExtendedStatus;
  counts: { TODO: number; DOING: number; DONE: number; DESISTE: number };
  onChange: (s: ExtendedStatus) => void;
}) {
  const tabs: { key: ExtendedStatus; label: string }[] = [
    { key: 'TODO', label: 'TODO' },
    { key: 'DOING', label: 'DOING' },
    { key: 'DONE', label: 'DONE' },
    { key: 'DESISTE', label: 'DESISTE' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-extrabold transition',
              isActive
                ? 'border-gia-navy bg-gia-navy text-white'
                : 'border-slate-200 bg-white text-gia-navy hover:bg-gia-bg2',
            ].join(' ')}
            type="button"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {t.label}
            <span
              className={[
                'ml-1 rounded-full px-2 py-0.5 text-xs font-extrabold',
                isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700',
              ].join(' ')}
            >
              {counts[t.key as keyof typeof counts]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TasksTable({
  status,
  tasks,
  members,
  me,
  role,
  onAssign,
  onAccept,
  onCloseTask,
  onDesist,
  onReassign,
  onEdit,
  onDelete,
  onOpenDetails,
}: {
  status: ExtendedStatus;
  tasks: Task[];
  members: ProjectMember[];
  me: Me | null;
  role: Role;
  onAssign: (taskId: string, assigneeId: string | null) => void;
  onAccept: (task: Task) => void;
  onCloseTask: (task: Task) => void;
  onDesist: (task: Task) => void;
  onReassign: (task: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onOpenDetails: (taskId: string) => void;
}) {
  const meUserId = me?.user_id ?? null;

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gia-navy">{status}</h2>
        <span className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-extrabold text-gia-navy">
          {tasks.length}
        </span>
      </div>

      <div className="overflow-auto rounded-3xl border border-slate-200/60">
        <table className="w-full text-sm">
          <thead className="bg-white sticky top-0">
            <tr className="text-left text-slate-600">
              <th className="px-5 py-4">Tâche</th>
              <th className="px-5 py-4 w-[150px]">Priorité</th>
              <th className="px-5 py-4 w-[220px]">Deadline</th>
              <th className="px-5 py-4 w-[280px]">Assignation</th>
              <th className="px-5 py-4 w-[520px]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td className="px-5 py-10 text-slate-500" colSpan={5}>
                  Aucune tâche dans ce statut.
                </td>
              </tr>
            ) : (
              tasks.map((t) => {
                const isAssignee = !!meUserId && (t.assignee_id ?? null) === meUserId;

                const canEditDelete = t.status === 'TODO' && isPrivileged(role);
                const canAssign = isPrivileged(role) && t.status === 'TODO';

                const canDesist = isAssignee && (t.status === 'TODO' || t.status === 'DOING');
                const canAccept = isAssignee && t.status === 'TODO';
                const canClose = isAssignee && t.status === 'DOING';
                const canReassign = (t as any).status === 'DESISTE' && isPrivileged(role);

                const assigneeLabel =
                  members.find((m) => m.user.user_id === t.assignee_id)?.user.name ??
                  members.find((m) => m.user.user_id === t.assignee_id)?.user.email ??
                  '—';
                const isOverdue =
                (t as any).is_overdue === true ||
                (!!t.deadline &&
                  new Date(t.deadline).getTime() < Date.now() &&
                  t.status !== 'DONE' &&
                  (t as any).status !== 'DESISTE');
  

                return (
                  <tr key={t.task_id} className="border-t border-slate-100 hover:bg-gia-bg2/70">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-gia-text">{t.title}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {isOverdue ? <OverduePill /> : null}
                      </div>


                      {t.description ? (
                        <div className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</div>
                      ) : null}

                      {(t as any).status === 'DESISTE' ? (
                        <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          <span className="font-extrabold">Désistement</span>
                          {(t as any).desist_reason ? ` · Motif : ${(t as any).desist_reason}` : ''}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <PriorityPill p={t.priority} />
                    </td>

                   <td className="px-5 py-4">
                      {t.deadline ? (
                        <div className={isOverdue ? 'font-extrabold text-red-700' : 'text-slate-700'}>
                          {new Date(t.deadline).toLocaleString()}
                          {isOverdue && (t as any).overdue_by_minutes ? (
                            <div className="mt-1 text-[11px] font-semibold text-red-600">
                              En retard de {Math.floor((t as any).overdue_by_minutes / 60)}h
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>


                    <td className="px-5 py-4">
                      {canAssign ? (
                        <select
                          value={t.assignee_id ?? ''}
                          onChange={(e) => onAssign(t.task_id, e.target.value ? e.target.value : null)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-gia-navy outline-none focus:border-gia-cyan"
                        >
                          <option value="">Non assignée</option>
                          {members.map((m) => (
                            <option key={m.user.user_id} value={m.user.user_id}>
                              {m.user.name ? m.user.name : m.user.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-gia-navy">
                          {t.assignee_id ? assigneeLabel : 'Non assignée'}
                        </div>
                      )}

                      <div className="mt-1 text-[11px] text-slate-500">
                        {isAssignee ? "Vous êtes l'assigné" : '—'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onOpenDetails(t.task_id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2"
                          type="button"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Détails
                        </button>

                        {canAccept ? (
                          <button
                            onClick={() => onAccept(t)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-3.5 py-2 text-xs font-extrabold text-white hover:bg-gia-navy2"
                            type="button"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Accuser réception
                          </button>
                        ) : null}

                        {canClose ? (
                          <button
                            onClick={() => onCloseTask(t)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gia-cyan px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90"
                            type="button"
                          >
                            <Flag className="h-4 w-4" aria-hidden="true" />
                            Clôturer
                          </button>
                        ) : null}

                        {canDesist ? (
                          <button
                            onClick={() => onDesist(t)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90"
                            type="button"
                          >
                            <Ban className="h-4 w-4" aria-hidden="true" />
                            Se désister
                          </button>
                        ) : null}

                        {canReassign ? (
                          <button
                            onClick={() => onReassign(t)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2"
                            type="button"
                          >
                            <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                            Réassigner
                          </button>
                        ) : null}

                        {canEditDelete ? (
                          <>
                            <button
                              onClick={() => onEdit(t)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2"
                              type="button"
                            >
                              <PencilLine className="h-4 w-4" aria-hidden="true" />
                              Modifier
                            </button>

                            <button
                              onClick={() => onDelete(t)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Supprimer
                            </button>
                          </>
                        ) : null}
                      </div>

                      {!isPrivileged(role) && t.status === 'TODO' ? (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          Certaines actions sont réservées aux profils autorisés.
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
