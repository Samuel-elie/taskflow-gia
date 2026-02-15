'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout } from '@/lib/auth';
import { apiFetch } from '@/lib/fetcher';
import { Bell, LogOut, Search, X, Plus } from 'lucide-react';
import Link from 'next/link';

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
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
          >
            <X className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            type="button"
            className={[
              'rounded-2xl px-4 py-2 text-sm font-semibold text-white',
              danger ? 'bg-red-600 hover:opacity-90' : 'bg-gia-navy hover:bg-gia-navy2',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header({
  showCreate = true,
}: {
  showCreate?: boolean;
}) {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);

  // ✅ Unread notifications count (réel)
  const [unreadCount, setUnreadCount] = useState<number>(0);

  async function loadUnreadCount() {
    try {
      // Ton endpoint: GET /notifications/me?page=1&pageSize=20&unreadOnly=1
      const res: any = await apiFetch('/notifications/me?page=1&pageSize=1&unreadOnly=1');

      // Supporte plusieurs formats possibles (selon ton service)
      // - { items: [], meta: { total: X } }
      // - { notifications: [], total: X }
      // - { items: [], total: X }
      // - [] (moins probable)
      const total =
        Number(res?.meta?.total ?? res?.total ?? res?.unreadCount ?? 0) ||
        (Array.isArray(res) ? res.length : Array.isArray(res?.items) ? res.items.length : 0);

      setUnreadCount(total);
    } catch {
      // silence (évite de casser le header)
      setUnreadCount(0);
    }
  }

  // Mini UX: "/" focus search (optionnel)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && (e.target as any)?.tagName !== 'INPUT' && (e.target as any)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const el = document.getElementById('globalSearch') as HTMLInputElement | null;
        el?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ✅ fetch count au montage + refresh toutes les 30s (optionnel)
  useEffect(() => {
    loadUnreadCount();
    const t = window.setInterval(loadUnreadCount, 30000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <>
      <ConfirmModal
        open={logoutOpen}
        title="Se déconnecter"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmLabel="Oui, me déconnecter"
        cancelLabel="Annuler"
        danger
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          logout();
          router.push('/login');
        }}
      />

      <header className="sticky top-0 z-[100] border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gia-navy to-gia-navy2 shadow-sm" />
              <div className="leading-tight">
                <div className="text-base font-extrabold text-gia-navy">TaskFlow</div>
                <div className="text-xs text-slate-500">Workspace · Projects · Tasks</div>
              </div>
            </div>

            <span className="hidden sm:inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-gia-navy">
              GIA-like
            </span>
          </div>

          {/* Middle: Search */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="globalSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search (press /)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none focus:border-gia-cyan"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                /
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {showCreate ? (
              <Link
                href="/workspaces"
                className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-4 py-2 text-sm font-semibold text-white hover:bg-gia-navy2"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => router.push('/notifications')}
              className="relative inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-gia-navy hover:bg-gia-bg2"
              title="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />

              {/* Badge */}
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-gia-orange px-1.5 py-0.5 text-[10px] font-extrabold text-white text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setLogoutOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gia-navy hover:bg-gia-bg2"
              type="button"
              title="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
