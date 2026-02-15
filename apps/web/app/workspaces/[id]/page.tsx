'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import FeedbackModal from '@/components/FeedbackModal';
import EditWorkspaceModal from '@/components/workspaces/EditWorkspaceModal';
import EditProjectModal from '@/components/projects/EditProjectModal';
import WorkspaceMembers from '@/components/workspaces/WorkspaceMembers';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import { ArrowLeft, ArrowRight, PencilLine, Trash2, FolderKanban, Users, Plus, X } from 'lucide-react';

type Workspace = {
  workspace_id: string;
  name: string;
  active?: number;
};

type Project = {
  project_id: string;
  name: string;
  description?: string | null;
  workspace_id: string;
};

type WorkspaceRole = 'OWNER' | 'MANAGER' | 'MEMBER';

function canManageProjects(role: WorkspaceRole) {
  return role === 'OWNER' || role === 'MANAGER';
}

function canManageMembers(role: WorkspaceRole) {
  return role === 'OWNER' || role === 'MANAGER';
}

function RolePill({ role }: { role: WorkspaceRole }) {
  const cls =
    role === 'OWNER'
      ? 'bg-gia-orange/15 text-gia-navy'
      : role === 'MANAGER'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-slate-100 text-slate-700';

  return <span className={['inline-flex rounded-full px-3 py-1 text-xs font-extrabold', cls].join(' ')}>{role}</span>;
}

function StatusPill({ active }: { active: number }) {
  const isActive = active === 1;
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold',
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      <span className={['h-2 w-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400'].join(' ')} />
      {isActive ? 'Actif' : 'Désactivé'}
    </span>
  );
}

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;
  const router = useRouter();
  const search = useSearchParams();

  const [activeTab, setActiveTab] = useState<'projects' | 'members'>('projects');
  const [meRole, setMeRole] = useState<WorkspaceRole>('MEMBER');

  const [fbOpen, setFbOpen] = useState(false);
  const [fbType, setFbType] = useState<'success' | 'error'>('success');
  const [fbTitle, setFbTitle] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  function showFeedback(type: 'success' | 'error', title: string, message: string) {
    setFbType(type);
    setFbTitle(title);
    setFbMessage(message);
    setFbOpen(true);
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmLabel, setConfirmLabel] = useState('Confirmer');
  const [confirmDanger, setConfirmDanger] = useState(false);
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

  const projectNameRef = useRef<HTMLInputElement | null>(null);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState('');

  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  async function loadWorkspaceFromMe() {
    const data = await apiFetch<any>('/workspaces/me');
    const list: Workspace[] = Array.isArray(data) ? data : (data.items ?? data.workspaces ?? []);
    const found = list.find((w) => w.workspace_id === workspaceId) ?? null;
    if (!found) throw new Error('Workspace introuvable (ou accès refusé).');
    setWorkspace(found);
  }

  async function loadProjects() {
    const data = await apiFetch<any>(`/workspaces/${workspaceId}/projects`);
    const list: Project[] = Array.isArray(data) ? data : (data.items ?? data.projects ?? []);
    setProjects(list);
  }

  async function loadAll() {
    setError(null);
    await loadWorkspaceFromMe();
    await loadProjects();
    const r = await apiFetch<{ role: WorkspaceRole }>(`/workspaces/${workspaceId}/me`);
    setMeRole(r.role);
  }

  const filteredProjects = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => (p.name ?? '').toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s));
  }, [projects, q]);

  async function createProject() {
    if (!projectName.trim()) {
      showFeedback('error', 'Erreur', 'Le nom du projet est requis.');
      return;
    }

    try {
      setLoading(true);
      await apiFetch(`/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDesc.trim() ? projectDesc.trim() : null,
        }),
      });

      setProjectName('');
      setProjectDesc('');
      await loadProjects();
      showFeedback('success', 'Projet créé', 'Le projet a été créé ');
    } catch (e: any) {
      showFeedback('error', 'Erreur', e?.message ?? 'Erreur création projet');
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(p: Project) {
    openConfirm({
      title: 'Supprimer projet',
      message: `Voulez-vous confirmer la suppression :\n\n${p.name}\n\nCette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
      action: async () => {
        try {
          setRowBusyId(p.project_id);
          await apiFetch(`/projects/${p.project_id}`, { method: 'DELETE' });
          await loadProjects();
          showFeedback('success', 'Projet supprimé', 'Le projet a été supprimé ✅');
        } catch (e: any) {
          showFeedback('error', 'Erreur', e?.message ?? 'Suppression impossible ❌');
        } finally {
          setRowBusyId(null);
        }
      },
    });
  }

  useEffect(() => {
    requireAuth();
    loadAll().catch((e) => {
      const msg = e?.message ?? 'Erreur chargement workspace';
      setError(msg);
      showFeedback('error', 'Erreur', msg);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (search.get('createProject') === '1') {
      setTimeout(() => projectNameRef.current?.focus(), 150);
    }
  }, [search]);

  return (
    <>
      <FeedbackModal open={fbOpen} type={fbType} title={fbTitle} message={fbMessage} onClose={() => setFbOpen(false)} />

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

      <EditWorkspaceModal
        open={editWorkspaceOpen}
        initialName={workspace?.name ?? ''}
        active={workspace?.active ?? 1}
        loading={loading}
        onClose={() => setEditWorkspaceOpen(false)}
        onSave={() => {}}
      />

      <EditProjectModal
        open={editProjectOpen}
        initialName={editingProject?.name ?? ''}
        initialDescription={editingProject?.description ?? ''}
        loading={loading}
        onClose={() => setEditProjectOpen(false)}
        onSave={() => {}}
      />

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
          <div className="p-6 sm:p-7 bg-gradient-to-r from-white via-white to-gia-bg2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <button
                  onClick={() => router.push('/workspaces')}
                  className="inline-flex items-center gap-2 text-sm font-extrabold text-gia-navy hover:underline"
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Retour Workspaces
                </button>

                <h1 className="mt-3 text-3xl font-extrabold text-gia-navy">{workspace?.name ?? 'Workspace'}</h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill active={workspace?.active ?? 1} />
                  <RolePill role={meRole} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                    {projects.length} projets
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Gère les projets et les membres selon ton rôle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-1">
                  <button
                    onClick={() => setActiveTab('projects')}
                    className={[
                      'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold transition',
                      activeTab === 'projects' ? 'bg-gia-navy text-white' : 'text-gia-navy hover:bg-gia-bg2',
                    ].join(' ')}
                    type="button"
                  >
                    <FolderKanban className="h-4 w-4" />
                    Projets
                  </button>

                  <button
                    onClick={() => setActiveTab('members')}
                    className={[
                      'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold transition',
                      activeTab === 'members' ? 'bg-gia-navy text-white' : 'text-gia-navy hover:bg-gia-bg2',
                    ].join(' ')}
                    type="button"
                  >
                    <Users className="h-4 w-4" />
                    Membres
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {activeTab === 'projects' ? (
          <>
            {canManageProjects(meRole) ? (
              <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-extrabold text-gia-navy">Créer un projet</div>
                    <div className="text-sm text-slate-600">Nom + description optionnelle.</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <input
                    ref={projectNameRef}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Nom du projet"
                    className="sm:col-span-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-orange"
                  />

                  <input
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Description (optionnel)"
                    className="sm:col-span-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-orange"
                  />

                  <button
                    onClick={createProject}
                    disabled={loading || !projectName.trim()}
                    className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gia-navy px-4 py-3 text-sm font-semibold text-white hover:bg-gia-navy2 disabled:opacity-60"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Créer
                  </button>
                </div>
              </section>
            ) : (
              <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-6 text-sm text-slate-600">
                Vous n’avez pas les droits pour créer/modifier des projets.
              </div>
            )}

            <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-extrabold text-gia-navy">Projets</div>
                  <div className="text-sm text-slate-600">Ouvre un Kanban ou gère les projets.</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-[320px]">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Recherche projet…"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-gia-cyan"
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

                  <span className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-extrabold text-gia-navy">
                    {filteredProjects.length}
                  </span>
                </div>
              </div>

              <div className="mt-5 overflow-auto rounded-3xl border border-slate-200/60">
                <table className="w-full text-sm">
                  <thead className="bg-white sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="px-5 py-4">Projet</th>
                      <th className="px-5 py-4">Description</th>
                      <th className="px-5 py-4 w-[340px]">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td className="px-5 py-10 text-slate-500" colSpan={3}>
                          Aucun projet.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((p) => {
                        const busy = rowBusyId === p.project_id;
                        return (
                          <tr key={p.project_id} className="border-t border-slate-100 hover:bg-gia-bg2/70">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gia-navy to-gia-navy2" />
                                <div className="min-w-0">
                                  <div className="font-extrabold text-gia-text truncate">{p.name}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-600">{p.description ?? '—'}</td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/projects/${p.project_id}`}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-gia-orange px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90"
                                >
                                  Kanban <ArrowRight className="h-4 w-4" />
                                </Link>

                                {canManageProjects(meRole) ? (
                                  <button
                                    disabled={busy}
                                    onClick={() => {
                                      setEditingProject(p);
                                      setEditProjectOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
                                    type="button"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                    Edit
                                  </button>
                                ) : null}

                                {canManageProjects(meRole) ? (
                                  <button
                                    disabled={busy}
                                    onClick={() => deleteProject(p)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 h-1 w-full rounded-full bg-gia-orange/90" />
            </section>
          </>
        ) : (
          <WorkspaceMembers workspaceId={workspaceId} meRole={meRole} />
        )}
      </div>
    </>
  );
}
