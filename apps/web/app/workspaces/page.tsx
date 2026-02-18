'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import FeedbackModal from '@/components/FeedbackModal';
import EditWorkspaceModal from '@/components/workspaces/EditWorkspaceModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Plus, PencilLine, Trash2, Power, Search, X } from 'lucide-react';

type WorkspaceRole = 'OWNER' | 'MANAGER' | 'MEMBER';

type Workspace = {
  workspace_id: string;
  name: string;
  active?: number;
  role?: WorkspaceRole; //  role renvoyé par /workspaces/me
};

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

/**  Permissions UI (MVP) */
function canCreateProject(role?: WorkspaceRole) {
  return role === 'OWNER' || role === 'MANAGER';
}
function canRenameWorkspace(role?: WorkspaceRole) {
  return role === 'OWNER';
}
function canToggleWorkspace(role?: WorkspaceRole) {
  return role === 'OWNER';
}
function canDeleteWorkspace(role?: WorkspaceRole) {
  return role === 'OWNER';
}

export default function WorkspacesPage() {
  const router = useRouter();

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

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [wsName, setWsName] = useState('');
  const [q, setQ] = useState('');

  const [loading, setLoading] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);

  async function loadWorkspaces() {
    setError(null);
    const data = await apiFetch<any>('/workspaces/me');
    const list: Workspace[] = Array.isArray(data) ? data : data.items ?? data.workspaces ?? [];
    setWorkspaces(list);
  }

  const stats = useMemo(() => {
    const total = workspaces.length;
    const active = workspaces.filter((w) => (w.active ?? 1) === 1).length;
    const disabled = total - active;
    return { total, active, disabled };
  }, [workspaces]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return workspaces;
    return workspaces.filter((w) => (w.name ?? '').toLowerCase().includes(s));
  }, [workspaces, q]);

  async function createWorkspace() {
    if (!wsName.trim()) {
      showFeedback('error', 'Erreur', 'Le nom du workspace est requis.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: wsName.trim() }),
      });

      setWsName('');
      await loadWorkspaces();
      showFeedback('success', 'Workspace créé', 'Le workspace a été créé.');
    } catch (e: any) {
      const msg = e?.message ?? 'Erreur création workspace';
      setError(msg);
      showFeedback('error', 'Erreur', msg);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWorkspaceActive(ws: Workspace) {
    openConfirm({
      title: 'Modifier le statut',
      message: `Voulez-vous ${((ws.active ?? 1) === 1 ? 'désactiver' : 'activer')} le workspace :\n\n${ws.name} ?`,
      confirmLabel: (ws.active ?? 1) === 1 ? 'Désactiver' : 'Activer',
      action: async () => {
        try {
          setRowBusyId(ws.workspace_id);
          await apiFetch(`/workspaces/${ws.workspace_id}/toggle-active`, { method: 'PATCH' });
          await loadWorkspaces();
          showFeedback('success', 'Workspace mis à jour', 'Statut actif modifié.');
        } catch (err: any) {
          showFeedback('error', 'Erreur', err?.message ?? 'Impossible de modifier.');
        } finally {
          setRowBusyId(null);
        }
      },
    });
  }

  async function deleteWorkspace(ws: Workspace) {
    openConfirm({
      title: 'Supprimer workspace',
      message: `Voulez-vous confirmer la suppression :\n\n${ws.name}\n\nCette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
      action: async () => {
        try {
          setRowBusyId(ws.workspace_id);
          await apiFetch(`/workspaces/${ws.workspace_id}`, { method: 'DELETE' });
          await loadWorkspaces();
          showFeedback('success', 'Workspace supprimé', 'Workspace supprimé.');
        } catch (err: any) {
          showFeedback('error', 'Erreur', err?.message ?? 'Suppression impossible.');
        } finally {
          setRowBusyId(null);
        }
      },
    });
  }

  useEffect(() => {
    requireAuth();
    loadWorkspaces().catch((e) => {
      const msg = e?.message ?? 'Erreur chargement workspaces';
      setError(msg);
      showFeedback('error', 'Erreur', msg);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onRowClick(ws: Workspace) {
    if (loading || rowBusyId) return;

    if ((ws.active ?? 1) === 0) {
      openConfirm({
        title: 'Workspace désactivé',
        message:
          'Ce workspace est désactivé.\n\nVous pouvez quand même l’ouvrir, mais certaines actions peuvent être limitées.\n\nContinuer ?',
        confirmLabel: 'Ouvrir',
        action: async () => router.push(`/workspaces/${ws.workspace_id}`),
      });
      return;
    }

    router.push(`/workspaces/${ws.workspace_id}`);
  }

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
        initialName={editingWorkspace?.name ?? ''}
        active={editingWorkspace?.active ?? 1}
        loading={loading}
        onClose={() => setEditWorkspaceOpen(false)}
        onSave={async ({ name }) => {
          if (!editingWorkspace) return;

          openConfirm({
            title: 'Renommer workspace',
            message: `Renommer en :\n\n${name.trim()} ?`,
            confirmLabel: 'Sauvegarder',
            action: async () => {
              try {
                setLoading(true);
                await apiFetch(`/workspaces/${editingWorkspace.workspace_id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ name: name.trim() }),
                });

                await loadWorkspaces();
                showFeedback('success', 'Workspace mis à jour', 'Nom modifié.');
                setEditWorkspaceOpen(false);
              } catch (e: any) {
                showFeedback('error', 'Erreur', e?.message ?? 'Impossible.');
              } finally {
                setLoading(false);
              }
            },
          });
        }}
      />

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
          <div className="p-6 sm:p-7 bg-gradient-to-r from-white via-white to-gia-bg2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-gia-navy">Workspaces</h1>
                <p className="mt-1 text-sm text-slate-600">Crée, organise et ouvre tes espaces de travail.</p>
              </div>

              <button
                onClick={createWorkspace}
                disabled={loading || !wsName.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gia-navy px-5 py-3 text-sm font-semibold text-white hover:bg-gia-navy2 disabled:opacity-60"
                type="button"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Créer
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Total</div>
                <div className="mt-2 text-3xl font-extrabold text-gia-navy">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Actifs</div>
                <div className="mt-2 text-3xl font-extrabold text-gia-navy">{stats.active}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Désactivés</div>
                <div className="mt-2 text-3xl font-extrabold text-gia-navy">{stats.disabled}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="Nom du workspace (ex: Team Alpha)"
                className="sm:col-span-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
              />

              <div className="sm:col-span-7 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Recherche workspace…"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm outline-none focus:border-gia-cyan"
                />
                {q ? (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 hover:bg-gia-bg2"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-extrabold text-gia-navy">Mes workspaces</div>
            <span className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-extrabold text-gia-navy">{filtered.length}</span>
          </div>

          <div className="overflow-auto rounded-3xl border border-slate-200/60">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0">
                <tr className="text-left text-slate-600">
                  <th className="px-5 py-4">Workspace</th>
                  <th className="px-5 py-4 w-[180px]">Statut</th>
                  <th className="px-5 py-4 w-[360px]">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-slate-500" colSpan={3}>
                      Aucun workspace. Crée ton premier workspace pour commencer.
                    </td>
                  </tr>
                ) : (
                  filtered.map((ws) => {
                    const isBusy = rowBusyId === ws.workspace_id;

                    const role: WorkspaceRole = (ws.role as WorkspaceRole) ?? 'MEMBER';
                    const canProject = canCreateProject(role);
                    const canRename = canRenameWorkspace(role);
                    const canToggle = canToggleWorkspace(role);
                    const canDel = canDeleteWorkspace(role);

                    return (
                      <tr
                        key={ws.workspace_id}
                        className={[
                          'border-t border-slate-100 cursor-pointer hover:bg-gia-bg2/70',
                          isBusy ? 'opacity-70 pointer-events-none' : '',
                        ].join(' ')}
                        onClick={() => onRowClick(ws)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gia-navy to-gia-navy2" />
                            <div className="min-w-0">
                              <div className="font-extrabold text-gia-text truncate">{ws.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">Rôle : {role}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusPill active={ws.active ?? 1} />
                        </td>

                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/workspaces/${ws.workspace_id}?createProject=1`)}
                              disabled={loading || isBusy || !canProject}
                              className={[
                                'inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-3.5 py-2 text-xs font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60',
                                !canProject ? 'cursor-not-allowed' : '',
                              ].join(' ')}
                              type="button"
                              title={!canProject ? 'Réservé aux OWNER / MANAGER' : 'Créer un projet'}
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              Projet
                            </button>

                            <button
                              onClick={() => {
                                if (!canRename) return;
                                setEditingWorkspace(ws);
                                setEditWorkspaceOpen(true);
                              }}
                              disabled={loading || isBusy || !canRename}
                              className={[
                                'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60',
                                !canRename ? 'cursor-not-allowed' : '',
                              ].join(' ')}
                              type="button"
                              title={!canRename ? 'Réservé au OWNER' : 'Renommer'}
                            >
                              <PencilLine className="h-4 w-4" aria-hidden="true" />
                              Rename
                            </button>

                            <button
                              onClick={() => {
                                if (!canToggle) return;
                                toggleWorkspaceActive(ws);
                              }}
                              disabled={loading || isBusy || !canToggle}
                              className={[
                                'inline-flex items-center justify-center rounded-2xl bg-gia-orange px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60',
                                !canToggle ? 'cursor-not-allowed' : '',
                              ].join(' ')}
                              type="button"
                              title={!canToggle ? 'Réservé au OWNER' : 'Activer/Désactiver'}
                            >
                              <Power className="h-4 w-4" aria-hidden="true" />
                            </button>

                            <button
                              onClick={() => {
                                if (!canDel) return;
                                deleteWorkspace(ws);
                              }}
                              disabled={loading || isBusy || !canDel}
                              className={[
                                'inline-flex items-center justify-center rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60',
                                !canDel ? 'cursor-not-allowed' : '',
                              ].join(' ')}
                              type="button"
                              title={!canDel ? 'Réservé au OWNER' : 'Supprimer'}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
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
      </div>
    </>
  );
}
