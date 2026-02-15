'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import {
  Bell,
  AlertTriangle,
  Clock,
  ListTodo,
  ArrowRight,
  Plus,
  FolderKanban,
  Layers,
  Sparkles,
} from 'lucide-react';

type DashboardData = any;

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    requireAuth();
    apiFetch('/dashboard')
      .then(setData)
      .catch((e) => setErr(e?.message ?? 'Erreur chargement dashboard'));
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-red-800">
        <div className="font-extrabold">Erreur</div>
        <div className="text-sm mt-1">{err}</div>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const counts = data.counts ?? {};
  const overdue = Number(counts.overdue ?? 0);
  const dueSoon = Number(counts.dueSoon ?? 0);
  const todo = Number(counts.byStatus?.TODO ?? 0);
  const unread = Number(data.notifications?.unreadCount ?? 0);

  const urgentTasks = Array.isArray(data.myTasksPreview) ? data.myTasksPreview : [];
  const workspaces = Array.isArray(data.workspaces) ? data.workspaces : [];

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gia-orange/15 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gia-cyan/15 blur-2xl" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Vue globale
              </div>

              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gia-navy tracking-tight">
                Dashboard
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                Priorise ce qui est urgent, garde un œil sur tes notifications, et navigue vite vers tes
                workspaces & projets. 
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/workspaces"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-gia-navy2"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Créer / Gérer Workspaces
                </Link>

                <Link
                  href="/tasks/me"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
                >
                  <ListTodo className="h-4 w-4" aria-hidden="true" />
                  Mes tâches
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* mini panel */}
            <div className="w-full sm:w-[360px] rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-gia-navy">Résumé</div>
                <div className="text-xs text-slate-500">Aujourd’hui</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniStat
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Overdue"
                  value={overdue}
                  tone={overdue > 0 ? 'danger' : 'neutral'}
                />
                <MiniStat
                  icon={<Clock className="h-4 w-4" />}
                  label="Due soon"
                  value={dueSoon}
                  tone={dueSoon > 0 ? 'warning' : 'neutral'}
                />
                <MiniStat
                  icon={<ListTodo className="h-4 w-4" />}
                  label="TODO"
                  value={todo}
                  tone="neutral"
                />
                <MiniStat
                  icon={<Bell className="h-4 w-4" />}
                  label="Unread"
                  value={unread}
                  tone={unread > 0 ? 'info' : 'neutral'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overdue"
          value={overdue}
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          tone="danger"
          hint={overdue > 0 ? 'À traiter en priorité' : 'Rien en retard '}
        />
        <StatCard
          title="Due Soon"
          value={dueSoon}
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          tone="warning"
          hint={dueSoon > 0 ? 'Deadlines proches' : 'Aucune échéance critique'}
        />
        <StatCard
          title="TODO"
          value={todo}
          icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
          tone="neutral"
          hint="À planifier / assigner"
        />
        <StatCard
          title="Notifications"
          value={unread}
          icon={<Bell className="h-5 w-5" aria-hidden="true" />}
          tone="info"
          hint={unread > 0 ? 'Nouveautés à lire' : 'Tout est à jour'}
        />
      </section>

      {/* 2 columns */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* URGENT TASKS */}
        <div className="lg:col-span-7">
          <CardShell
            title="My urgent tasks"
            subtitle="Les tâches à traiter maintenant"
            right={
              <Link
                href="/tasks/me"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-gia-navy hover:bg-gia-bg2"
              >
                Voir tout <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          >
            {urgentTasks.length === 0 ? (
              <EmptyState
                title="Aucune tâche urgente"
                description="Bien joué Tu peux créer un projet ou consulter tes tâches."
                action={
                  <Link
                    href="/workspaces"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-4 py-2 text-sm font-semibold text-white hover:bg-gia-navy2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Aller aux workspaces
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {urgentTasks.map((t: any) => (
                  <TaskRow key={t.task_id} task={t} />
                ))}
              </div>
            )}
          </CardShell>
        </div>

        {/* WORKSPACES / PROJECTS */}
        <div className="lg:col-span-5">
          <CardShell
            title="Workspaces"
            subtitle="Accès rapide à tes projets"
            right={
              <Link
                href="/workspaces"
                className="inline-flex items-center gap-2 rounded-2xl bg-gia-orange px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                <FolderKanban className="h-4 w-4" aria-hidden="true" />
                Ouvrir
              </Link>
            }
          >
            {workspaces.length === 0 ? (
              <EmptyState
                title="Aucun workspace"
                description="Crée ton premier workspace pour organiser tes projets."
                action={
                  <Link
                    href="/workspaces"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-4 py-2 text-sm font-semibold text-white hover:bg-gia-navy2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Créer un workspace
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {workspaces.slice(0, 4).map((ws: any) => (
                  <WorkspaceCard key={ws.workspace_id} ws={ws} />
                ))}

                {workspaces.length > 4 ? (
                  <Link
                    href="/workspaces"
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
                  >
                    Voir tous les workspaces <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            )}
          </CardShell>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------
   Components
--------------------------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="h-4 w-28 rounded bg-slate-100" />
        <div className="mt-3 h-9 w-52 rounded bg-slate-100" />
        <div className="mt-3 h-4 w-[70%] rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-white border border-slate-200 shadow-soft" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 h-72 rounded-3xl bg-white border border-slate-200 shadow-soft" />
        <div className="lg:col-span-5 h-72 rounded-3xl bg-white border border-slate-200 shadow-soft" />
      </div>
    </div>
  );
}

function CardShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-gia-navy">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        {right}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-gia-bg2 p-6">
      <div className="font-extrabold text-gia-navy">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
  hint,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'danger' | 'warning' | 'info' | 'neutral';
  hint?: string;
}) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-red-50 border-red-100'
      : tone === 'warning'
        ? 'bg-amber-50 border-amber-100'
        : tone === 'info'
          ? 'bg-sky-50 border-sky-100'
          : 'bg-white border-slate-200';

  const iconWrap =
    tone === 'danger'
      ? 'bg-red-600 text-white'
      : tone === 'warning'
        ? 'bg-amber-500 text-white'
        : tone === 'info'
          ? 'bg-gia-cyan text-white'
          : 'bg-slate-900 text-white';

  return (
    <div className={cn('rounded-3xl border p-5 shadow-soft', toneClasses)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-600">{title}</div>
          <div className="mt-2 text-4xl font-extrabold text-gia-navy">{value}</div>
          {hint ? <div className="mt-2 text-sm text-slate-600">{hint}</div> : null}
        </div>
        <div className={cn('rounded-2xl p-2.5 shadow-sm', iconWrap)}>{icon}</div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'danger' | 'warning' | 'info' | 'neutral';
}) {
  const toneBg =
    tone === 'danger'
      ? 'bg-red-50 border-red-100'
      : tone === 'warning'
        ? 'bg-amber-50 border-amber-100'
        : tone === 'info'
          ? 'bg-sky-50 border-sky-100'
          : 'bg-slate-50 border-slate-100';

  return (
    <div className={cn('rounded-2xl border p-3', toneBg)}>
      <div className="flex items-center gap-2 text-slate-700">
        <span className="opacity-80">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-gia-navy">{value}</div>
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  const projectName = task.project?.name ?? '—';

  const isOverdue = !!task.isOverdue;
  const dueInHours = Number(task.dueInHours ?? 0);

  const badge = isOverdue
    ? { text: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-100' }
    : dueInHours <= 24
      ? { text: `${dueInHours}h`, cls: 'bg-amber-50 text-amber-800 border-amber-100' }
      : { text: `${dueInHours}h`, cls: 'bg-slate-50 text-slate-700 border-slate-100' };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 hover:bg-gia-bg2 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-extrabold text-gia-text truncate">{task.title}</div>
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', badge.cls)}>
              {badge.text}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-600 truncate">
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4 opacity-70" aria-hidden="true" />
              {projectName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Si tu as déjà la route du drawer: /projects/[id]?taskId=... ou /tasks/[id] */}
          <Link
            href={`/projects/${task.project?.project_id ?? ''}?taskId=${task.task_id}`}
            className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-2 rounded-xl bg-gia-navy px-3 py-2 text-xs font-semibold text-white hover:bg-gia-navy2"
          >
            Ouvrir <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function WorkspaceCard({ ws }: { ws: any }) {
  const projects = Array.isArray(ws.projects) ? ws.projects : [];
  const projectsCount = projects.length;

  return (
    <Link
      href={`/workspaces/${ws.workspace_id}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-gia-bg2 transition block"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-extrabold text-gia-text truncate">{ws.name}</div>
          <div className="mt-1 text-sm text-slate-600">
            {projectsCount} projet{projectsCount > 1 ? 's' : ''}
          </div>
        </div>

        <div className="rounded-2xl bg-gia-orange/10 px-3 py-1 text-xs font-bold text-gia-navy">
          {projectsCount}
        </div>
      </div>

      {projectsCount > 0 ? (
        <div className="mt-3 space-y-1">
          {projects.slice(0, 3).map((p: any) => (
            <div key={p.project_id} className="text-sm text-slate-700 truncate">
              • {p.name}
            </div>
          ))}
          {projectsCount > 3 ? (
            <div className="text-xs text-slate-500">+ {projectsCount - 3} autres</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500">Aucun projet pour l’instant.</div>
      )}
    </Link>
  );
}
