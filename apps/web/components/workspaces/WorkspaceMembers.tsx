'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/fetcher';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Trash2, Copy, Check, Mail, Shield, User } from 'lucide-react';

type WorkspaceRole = 'OWNER' | 'MANAGER' | 'MEMBER';

type Member = {
  workspace_member_id: string;
  role: WorkspaceRole;
  user: {
    user_id: string;
    email: string;
    name?: string | null;
  };
};

type Invite = {
  workspace_invite_id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  invite_link?: string;
};

function canManageMembers(role: WorkspaceRole) {
  return role === 'OWNER' || role === 'MANAGER';
}

function canEditRoles(role: WorkspaceRole) {
  return role === 'OWNER';
}

function RolePill({ role }: { role: WorkspaceRole }) {
  const cls =
    role === 'OWNER'
      ? 'bg-gia-orange/15 text-gia-navy'
      : role === 'MANAGER'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-slate-100 text-slate-700';

  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>{role}</span>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-5 sm:p-6">
      {children}
    </section>
  );
}

export default function WorkspaceMembers({
  workspaceId,
  meRole,
}: {
  workspaceId: string;
  meRole: WorkspaceRole;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [loading, setLoading] = useState(false);

  const [qMembers, setQMembers] = useState('');
  const [qInvites, setQInvites] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDanger, setConfirmDanger] = useState(false);
  const [confirmLabel, setConfirmLabel] = useState('Confirmer');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

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

  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const m = await apiFetch<any>(`/workspaces/${workspaceId}/members`);
    const i = await apiFetch<any>(`/workspaces/${workspaceId}/invites`);
    const mList: Member[] = Array.isArray(m) ? m : m.items ?? [];
    const iList: Invite[] = Array.isArray(i) ? i : i.items ?? [];
    setMembers(mList);
    setInvites(iList);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [workspaceId]);

  const filteredMembers = useMemo(() => {
    const s = qMembers.trim().toLowerCase();
    if (!s) return members;
    return members.filter(
      (m) =>
        (m.user.name ?? '').toLowerCase().includes(s) ||
        (m.user.email ?? '').toLowerCase().includes(s) ||
        (m.role ?? '').toLowerCase().includes(s),
    );
  }, [members, qMembers]);

  const filteredInvites = useMemo(() => {
    const s = qInvites.trim().toLowerCase();
    if (!s) return invites;
    return invites.filter(
      (i) =>
        (i.email ?? '').toLowerCase().includes(s) ||
        (i.status ?? '').toLowerCase().includes(s) ||
        (i.role ?? '').toLowerCase().includes(s),
    );
  }, [invites, qInvites]);

  async function addMember() {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await apiFetch(`/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          role: canEditRoles(meRole) ? role : 'MEMBER',
        }),
      });
      setEmail('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(memberId: string) {
    openConfirm({
      title: 'Retirer un membre',
      message: 'Confirmer le retrait de ce membre du workspace ?',
      danger: true,
      confirmLabel: 'Retirer',
      action: async () => {
        try {
          setConfirmLoading(true);
          await apiFetch(`/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' });
          await load();
        } finally {
          setConfirmLoading(false);
          setConfirmOpen(false);
          setConfirmAction(null);
        }
      },
    });
  }

  async function revokeInvite(inviteId: string) {
    openConfirm({
      title: 'Révoquer invitation',
      message: 'Confirmer la révocation de cette invitation ?',
      danger: true,
      confirmLabel: 'Révoquer',
      action: async () => {
        try {
          setConfirmLoading(true);
          await apiFetch(`/workspaces/${workspaceId}/invites/${inviteId}`, { method: 'DELETE' });
          await load();
        } finally {
          setConfirmLoading(false);
          setConfirmOpen(false);
          setConfirmAction(null);
        }
      },
    });
  }

  async function copyLink(inv: Invite) {
    if (!inv.invite_link) return;
    try {
      await navigator.clipboard.writeText(inv.invite_link);
      setCopiedId(inv.workspace_invite_id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      setCopiedId(null);
    }
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

      <div className="space-y-6">
        {canManageMembers(meRole) ? (
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-gia-navy">Ajouter un membre</h2>
                <p className="mt-1 text-sm text-slate-600">Envoie une invitation par email.</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                <Shield className="h-4 w-4" />
                Rôle : {meRole}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 outline-none focus:border-gia-cyan"
                />
              </div>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                className="sm:col-span-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan disabled:opacity-60"
                disabled={!canEditRoles(meRole)}
                title={!canEditRoles(meRole) ? 'Seul un OWNER peut choisir le rôle' : undefined}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="OWNER">OWNER</option>
              </select>

              <button
                onClick={addMember}
                disabled={loading || !email.trim()}
                className="sm:col-span-3 rounded-2xl bg-gia-navy px-5 py-3 text-sm font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60"
                type="button"
              >
                Inviter
              </button>
            </div>

            {!canEditRoles(meRole) ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-gia-bg2 px-4 py-3 text-xs text-slate-600">
                Le rôle MANAGER/OWNER est réservé. L’invitation partira en MEMBER.
              </div>
            ) : null}
          </Card>
        ) : (
          <Card>
            <div className="text-sm text-slate-600">
              Vous n’avez pas les droits pour inviter des membres.
            </div>
          </Card>
        )}

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-gia-navy">Membres</h2>
              <p className="mt-1 text-sm text-slate-600">
                Liste des utilisateurs ayant accès au workspace.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={qMembers}
                onChange={(e) => setQMembers(e.target.value)}
                placeholder="Recherche membre…"
                className="w-full sm:w-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-gia-cyan"
              />
              <span className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-extrabold text-gia-navy">
                {filteredMembers.length}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
                Aucun membre.
              </div>
            ) : (
              filteredMembers.map((m) => (
                <div
                  key={m.workspace_member_id}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200/60 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gia-navy to-gia-navy2" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-gia-text truncate">
                        {m.user.name ?? m.user.email}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{m.user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <RolePill role={m.role} />

                    {canManageMembers(meRole) ? (
                      <button
                        onClick={() => removeMember(m.workspace_member_id)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Retirer
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-gia-navy">Invitations</h2>
              <p className="mt-1 text-sm text-slate-600">
                Invitations en attente / acceptées / expirées.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={qInvites}
                onChange={(e) => setQInvites(e.target.value)}
                placeholder="Recherche invitation…"
                className="w-full sm:w-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-gia-cyan"
              />
              <span className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-extrabold text-gia-navy">
                {filteredInvites.length}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredInvites.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
                Aucune invitation.
              </div>
            ) : (
              filteredInvites.map((inv) => (
                <div
                  key={inv.workspace_invite_id}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200/60 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-gia-text truncate">{inv.email}</div>
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold">{inv.status}</span> ·{' '}
                        <span className="font-semibold">{inv.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {inv.invite_link ? (
                      <button
                        onClick={() => copyLink(inv)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gia-navy hover:bg-gia-bg2"
                        type="button"
                      >
                        {copiedId === inv.workspace_invite_id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedId === inv.workspace_invite_id ? 'Copié' : 'Copier lien'}
                      </button>
                    ) : null}

                    {canManageMembers(meRole) ? (
                      <button
                        onClick={() => revokeInvite(inv.workspace_invite_id)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Révoquer
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
