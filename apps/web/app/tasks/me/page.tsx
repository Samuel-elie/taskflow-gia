'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import { ArrowRight, Clock, Filter, ListTodo, RefreshCw, Search, TriangleAlert } from 'lucide-react';

type TaskStatus = 'TODO' | 'DOING' | 'DONE' | 'DESISTE';

type MyTask = {
  task_id: string;
  title: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline?: string | null;
  creation_date: string;
  project?: {
    project_id: string;
    name: string;
    workspace_id: string;
  };
};

type ApiRes = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  tasks: MyTask[];
  counts?: {
    overdue?: number;
    dueSoon?: number;
    byStatus?: Record<TaskStatus, number>;
  };
};

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function PriorityPill({ p }: { p: MyTask['priority'] }) {
  const cls =
    p === 'HIGH'
      ? 'bg-red-50 text-red-700'
      : p === 'MEDIUM'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-slate-100 text-slate-700';
  return <span className={cn('rounded-full px-3 py-1 text-xs font-extrabold', cls)}>{p}</span>;
}

function StatusPill({ s }: { s: TaskStatus }) {
  const cls =
    s === 'TODO'
      ? 'bg-slate-100 text-slate-700'
      : s === 'DOING'
        ? 'bg-gia-cyan/15 text-gia-navy'
        : s === 'DONE'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700';

  return <span className={cn('rounded-full px-3 py-1 text-xs font-extrabold', cls)}>{s}</span>;
}

export default function MyTasksPage() {
  const [data, setData] = useState<ApiRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ALL' | TaskStatus>('ALL');
  const [overdue, setOverdue] = useState<0 | 1>(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (status !== 'ALL') params.set('status', status);
      if (overdue === 1) params.set('overdue', '1');

      // tri simple
      params.set('sort', 'deadline');
      params.set('order', 'asc');

      const res = await apiFetch<ApiRes>(`/tasks/me?${params.toString()}`);
      setData(res);
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur chargement mes tâches');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    requireAuth();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, overdue]);

  const list = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(
      (t) =>
        (t.title ?? '').toLowerCase().includes(s) ||
        (t.project?.name ?? '').toLowerCase().includes(s),
    );
  }, [data?.tasks, q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
        <div className="p-6 sm:p-7 bg-gradient-to-r from-white via-white to-gia-bg2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-gia-navy">
                <ListTodo className="h-3.5 w-3.5" />
                Mes tâches
              </div>
              <h1 className="mt-3 text-3xl font-extrabold text-gia-navy">Tasks / Me</h1>
              <p className="mt-1 text-sm text-slate-600">
                Liste de tes tâches assignées (filtres + pagination).
              </p>
            </div>

            <button
              onClick={() => load()}
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? 'Chargement…' : 'Rafraîchir'}
            </button>
          </div>

          {/* mini counts */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Overdue</div>
              <div className="mt-2 text-3xl font-extrabold text-gia-navy">
                {Number(data?.counts?.overdue ?? 0)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Due soon (24h)</div>
              <div className="mt-2 text-3xl font-extrabold text-gia-navy">
                {Number(data?.counts?.dueSoon ?? 0)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Total</div>
              <div className="mt-2 text-3xl font-extrabold text-gia-navy">
                {Number(data?.total ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="font-extrabold">Erreur</div>
          <div className="mt-1">{err}</div>
        </div>
      ) : null}

      {/* Toolbar */}
      <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Recherche titre / projet…"
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-gia-cyan"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-gia-navy">
              <Filter className="h-4 w-4" />
              Statut
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as any);
                }}
                className="ml-2 rounded-xl border border-slate-200 bg-white px-2 py-1 outline-none"
              >
                <option value="ALL">ALL</option>
                <option value="TODO">TODO</option>
                <option value="DOING">DOING</option>
                <option value="DONE">DONE</option>
                <option value="DESISTE">DESISTE</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setPage(1);
                setOverdue((v) => (v === 1 ? 0 : 1));
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold',
                overdue === 1
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-gia-navy hover:bg-gia-bg2',
              )}
            >
              <TriangleAlert className="h-4 w-4" />
              Overdue
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-auto rounded-3xl border border-slate-200/60">
          <table className="w-full text-sm">
            <thead className="bg-white sticky top-0">
              <tr className="text-left text-slate-600">
                <th className="px-5 py-4">Tâche</th>
                <th className="px-5 py-4 w-[140px]">Statut</th>
                <th className="px-5 py-4 w-[140px]">Priorité</th>
                <th className="px-5 py-4 w-[220px]">Deadline</th>
                <th className="px-5 py-4 w-[200px]">Projet</th>
                <th className="px-5 py-4 w-[160px]">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && !data ? (
                <tr>
                  <td className="px-5 py-10 text-slate-500" colSpan={6}>
                    Chargement…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-slate-500" colSpan={6}>
                    Aucune tâche.
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr key={t.task_id} className="border-t border-slate-100 hover:bg-gia-bg2/70">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-gia-text">{t.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Créée : {new Date(t.creation_date).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill s={t.status} />
                    </td>
                    <td className="px-5 py-4">
                      <PriorityPill p={t.priority} />
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {t.deadline ? (
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {new Date(t.deadline).toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{t.project?.name ?? '—'}</td>
                    <td className="px-5 py-4">
                      {t.project?.project_id ? (
                        <Link
                          href={`/projects/${t.project.project_id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-3.5 py-2 text-xs font-extrabold text-white hover:bg-gia-navy2"
                        >
                          Ouvrir <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Page <span className="font-extrabold text-gia-navy">{data?.page ?? page}</span> /{' '}
            <span className="font-extrabold text-gia-navy">{data?.totalPages ?? 1}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!!data && page >= (data.totalPages ?? 1) || loading}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
            >
              Suivant
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
