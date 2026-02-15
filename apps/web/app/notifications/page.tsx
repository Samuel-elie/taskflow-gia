'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import { Check, X } from 'lucide-react';

type NotificationItem = {
  notification_id: string;
  type: string;
  message: string;
  read: number;
  creation_date?: string;
  reference_id?: string; // inviteId si WORKSPACE_INVITE
};

type NotificationsListResponse =
  | NotificationItem[]
  | { items?: NotificationItem[]; notifications?: NotificationItem[] };

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-soft p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-gia-navy">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{message}</p>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Fermer"
            className="rounded-2xl p-2 opacity-70 hover:bg-gia-bg2 hover:opacity-100"
            disabled={!!loading}
          >
            <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            disabled={!!loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gia-navy hover:bg-gia-bg2 disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            type="button"
            disabled={!!loading}
            className={[
              'rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60',
              danger ? 'bg-red-600 hover:opacity-90' : 'bg-gia-navy hover:bg-gia-navy2',
            ].join(' ')}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // confirm modal state
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

  async function load() {
    const r = await apiFetch<NotificationsListResponse>('/notifications/me?page=1&pageSize=50');
    const list = Array.isArray(r) ? r : r.items ?? r.notifications ?? [];
    setItems(list);
  }

  useEffect(() => {
    requireAuth();
    load().finally(() => setLoading(false));
  }, []);

  async function markAsRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    await load();
  }

  function confirmAccept(inviteId: string) {
    openConfirm({
      title: 'Accepter l’invitation',
      message: 'Voulez-vous rejoindre ce workspace ?',
      confirmLabel: 'Accepter',
      action: async () => {
        try {
          setConfirmLoading(true);
          await apiFetch(`/workspaces/invites/${inviteId}/accept`, { method: 'POST' });
          await load();
        } finally {
          setConfirmLoading(false);
          setConfirmOpen(false);
          setConfirmAction(null);
        }
      },
    });
  }

  function confirmReject(inviteId: string) {
    openConfirm({
      title: 'Refuser l’invitation',
      message: 'Voulez-vous refuser cette invitation ?',
      confirmLabel: 'Refuser',
      danger: true,
      action: async () => {
        try {
          setConfirmLoading(true);
          await apiFetch(`/workspaces/invites/${inviteId}/reject`, { method: 'POST' });
          await load();
        } finally {
          setConfirmLoading(false);
          setConfirmOpen(false);
          setConfirmAction(null);
        }
      },
    });
  }

  if (loading) return <div className="text-sm text-slate-500">Chargement...</div>;

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
        <div>
          <h1 className="text-3xl font-extrabold text-gia-navy">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">Invitations, deadlines, activités importantes.</p>
        </div>

        <div className="rounded-3xl bg-white shadow-soft border border-slate-200/60 overflow-hidden">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Aucune notification.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const isUnread = n.read === 0;
                const showInviteActions = isUnread && n.type === 'WORKSPACE_INVITE' && !!n.reference_id;

                return (
                  <li
                    key={n.notification_id}
                    className={`p-5 transition ${isUnread ? 'bg-gia-bg2' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-extrabold text-gia-navy">{n.type ?? 'Notification'}</div>

                          {isUnread && (
                            <span className="rounded-full bg-gia-orange px-2 py-0.5 text-[10px] font-bold text-white">
                              Nouveau
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">{n.message ?? '—'}</div>

                        <div className="mt-2 text-xs text-slate-400">
                          {n.creation_date ? new Date(n.creation_date).toLocaleString() : ''}
                        </div>
                      </div>

                      {isUnread && (
                        <button
                          onClick={() => markAsRead(n.notification_id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-gia-navy hover:bg-gia-bg2"
                          type="button"
                        >
                          <Check className="h-4 w-4" />
                          Marquer lu
                        </button>
                      )}
                    </div>

                    {/* ✅ boutons seulement si notif NON LUE */}
                    {showInviteActions ? (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => confirmAccept(n.reference_id!)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                          type="button"
                        >
                          Accepter
                        </button>

                        <button
                          onClick={() => confirmReject(n.reference_id!)}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                          type="button"
                        >
                          Refuser
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
