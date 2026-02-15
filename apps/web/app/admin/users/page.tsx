'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Plus, PencilLine, Trash2, Shield, User, Search, Filter, X, Check } from 'lucide-react';

/* ------------------ User modal ------------------ */
function UserModal({
  open,
  mode,
  loading,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  loading: boolean;
  initial?: { email?: string; name?: string | null; global_role?: 'ADMIN' | 'USER' };
  onClose: () => void;
  onSave: (payload: { email: string; name?: string | null; password?: string; global_role: 'ADMIN' | 'USER' }) => void;
}) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<'ADMIN' | 'USER'>(initial?.global_role ?? 'USER');

  useEffect(() => {
    if (!open) return;
    setEmail(initial?.email ?? '');
    setName(initial?.name ?? '');
    setPassword('');
    setGlobalRole(initial?.global_role ?? 'USER');
  }, [open, initial?.email, initial?.name, initial?.global_role]);

  if (!open) return null;

  const canSave = email.trim().length > 3 && email.includes('@') && (mode === 'edit' ? true : password.trim().length >= 6);

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center p-6">
      <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-soft border border-slate-200/60">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-200/60 bg-white/70">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">{mode === 'create' ? 'Créer un utilisateur' : 'Modifier utilisateur'}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'create' ? 'Crée un compte (mot de passe requis).' : 'Modifie email/nom/role. Mot de passe optionnel.'}
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
                placeholder="user@email.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
                placeholder="Nom (optionnel)"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Global role</label>
              <select
                value={globalRole}
                onChange={(e) => setGlobalRole(e.target.value as any)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Mot de passe {mode === 'edit' ? '(optionnel)' : '(requis)'}
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
                placeholder={mode === 'edit' ? 'Laisser vide pour ne pas changer' : 'Min 6 caractères'}
                type="password"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-slate-200/60 bg-white">
          <button
            onClick={onClose}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
          >
            Annuler
          </button>

          <button
            disabled={loading || !canSave}
            onClick={() =>
              onSave({
                email: email.trim(),
                name: name.trim() ? name.trim() : null,
                password: password.trim() ? password.trim() : undefined,
                global_role: globalRole,
              })
            }
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-gia-navy2 disabled:opacity-60"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Types ------------------ */
type AdminUser = {
  user_id: string;
  email: string;
  name?: string | null;
  global_role: 'ADMIN' | 'USER';
  creation_date: string;
};

/* ------------------ Helpers UI ------------------ */
function RolePill({ role }: { role: 'ADMIN' | 'USER' }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold',
        isAdmin ? 'bg-gia-orange/15 text-gia-navy' : 'bg-slate-100 text-slate-700',
      ].join(' ')}
    >
      {isAdmin ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      {role}
    </span>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();

  //  Gate admin (pour éviter d'afficher l'UI + éviter le 403 visible)
  const [gateLoading, setGateLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI: search & filters
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<AdminUser | null>(null);

  // confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDanger, setConfirmDanger] = useState(false);
  const [confirmLabel, setConfirmLabel] = useState('Confirmer');

  function openConfirm(args: {
    title: string;
    message: string;
    danger?: boolean;
    confirmLabel?: string;
    action: () => Promise<void>;
  }) {
    setConfirmTitle(args.title);
    setConfirmMessage(args.message);
    setConfirmDanger(!!args.danger);
    setConfirmLabel(args.confirmLabel ?? 'Confirmer');
    setConfirmAction(() => args.action);
    setConfirmOpen(true);
  }

  async function load() {
    setError(null);
    const list = await apiFetch<AdminUser[]>('/admin/users');
    setUsers(list);
  }

  useEffect(() => {
    requireAuth();

    (async () => {
      try {
        //  1) vérifier rôle avant de taper /admin/users
        const me = await apiFetch<{ global_role?: 'ADMIN' | 'USER' }>('/auth/me');
        const ok = me?.global_role === 'ADMIN';

        if (!ok) {
          setIsAdmin(false);
          router.replace('/workspaces'); // ou '/dashboard'
          return;
        }

        setIsAdmin(true);
        await load();
      } catch (e) {
        router.replace('/login');
      } finally {
        setGateLoading(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  Hooks TOUJOURS appelés (pas de return avant)
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.global_role === 'ADMIN').length;
    const normal = total - admins;
    return { total, admins, normal };
  }, [users]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchText = !s || (u.email ?? '').toLowerCase().includes(s) || (u.name ?? '').toLowerCase().includes(s);
      const matchRole = roleFilter === 'ALL' ? true : u.global_role === roleFilter;
      return matchText && matchRole;
    });
  }, [users, q, roleFilter]);

  async function create(payload: any) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur création user');
    } finally {
      setLoading(false);
    }
  }

  async function update(userId: string, payload: any) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur update user');
    } finally {
      setLoading(false);
    }
  }

  async function remove(u: AdminUser) {
    openConfirm({
      title: 'Supprimer utilisateur',
      message: `Voulez-vous supprimer :\n\n${u.email}\n\nCette action est irréversible.`,
      danger: true,
      confirmLabel: 'Supprimer',
      action: async () => {
        try {
          setConfirmLoading(true);
          setBusyId(u.user_id);
          await apiFetch(`/admin/users/${u.user_id}`, { method: 'DELETE' });
          await load();
        } finally {
          setBusyId(null);
          setConfirmLoading(false);
          setConfirmOpen(false);
          setConfirmAction(null);
        }
      },
    });
  }

  //  Rendu conditionnel APRÈS hooks
  if (gateLoading) {
    return (
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-6">
        <div className="text-sm text-slate-600">Chargement…</div>
      </div>
    );
  }

  if (!isAdmin) {
    // déjà redirect
    return null;
  }

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        danger={confirmDanger}
        confirmLabel={confirmLabel}
        loading={confirmLoading}
        onClose={() => {
          if (confirmLoading) return;
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={async () => {
          if (!confirmAction) return;
          await confirmAction();
        }}
      />

      <UserModal
        open={modalOpen}
        mode={modalMode}
        loading={loading}
        initial={editing ?? undefined}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={(payload) => {
          if (modalMode === 'create') return create(payload);
          if (!editing) return;
          return update(editing.user_id, payload);
        }}
      />

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
          <div className="p-6 sm:p-7 bg-gradient-to-r from-white via-white to-gia-bg2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-gia-navy">
                  <Filter className="h-3.5 w-3.5" />
                  Admin
                </div>
                <h1 className="mt-3 text-3xl font-extrabold text-gia-navy">Users</h1>
                <p className="mt-1 text-sm text-slate-600">Créer, modifier et supprimer des utilisateurs (global role).</p>
              </div>

              <button
                onClick={() => {
                  setModalMode('create');
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gia-navy px-5 py-3 text-sm font-semibold text-white hover:bg-gia-navy2"
                type="button"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Nouvel utilisateur
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Total users</div>
                <div className="mt-2 text-3xl font-extrabold text-gia-navy">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Admins</div>
                <div className="mt-2 text-3xl font-extrabold text-gia-navy">{stats.admins}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Users</div>
                <div className="mt-2 text-3xl font-extrabold text-gia-navy">{stats.normal}</div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Recherche email / nom…"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-gia-cyan"
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

            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-1">
                {(['ALL', 'ADMIN', 'USER'] as const).map((k) => {
                  const active = roleFilter === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRoleFilter(k)}
                      className={[
                        'rounded-2xl px-3 py-2 text-xs font-extrabold transition',
                        active ? 'bg-gia-navy text-white' : 'text-gia-navy hover:bg-gia-bg2',
                      ].join(' ')}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>

              <span className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-extrabold text-gia-navy">{filtered.length}</span>
            </div>
          </div>

          <div className="mt-5 overflow-auto rounded-3xl border border-slate-200/60">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0">
                <tr className="text-left text-slate-600">
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4 w-[160px]">Role</th>
                  <th className="px-5 py-4 w-[260px]">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-slate-500" colSpan={3}>
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-gia-bg2 border border-slate-200/60 grid place-items-center">
                          <User className="h-6 w-6 text-gia-navy" />
                        </div>
                        <div className="font-extrabold text-gia-navy">Aucun résultat</div>
                        <div className="text-sm text-slate-600">Essaie une autre recherche ou change le filtre.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const disabled = busyId === u.user_id;
                    return (
                      <tr key={u.user_id} className="border-t border-slate-100 hover:bg-gia-bg2/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gia-navy to-gia-navy2" />
                            <div className="min-w-0">
                              <div className="font-extrabold text-gia-text truncate">{u.name ?? '—'}</div>
                              <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <RolePill role={u.global_role} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              disabled={disabled}
                              onClick={() => {
                                setModalMode('edit');
                                setEditing(u);
                                setModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
                              type="button"
                            >
                              <PencilLine className="h-4 w-4" aria-hidden="true" />
                              Edit
                            </button>

                            <button
                              disabled={disabled}
                              onClick={() => remove(u)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Delete
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
