'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Users, Settings, Home, Bell, ListTodo } from 'lucide-react';
import { apiFetch } from '@/lib/fetcher';

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: any;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
        active ? 'bg-gia-navy text-white shadow-sm' : 'text-gia-navy hover:bg-gia-bg2',
      ].join(' ')}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

type Me = {
  user_id: string;
  email?: string;
  name?: string;
  global_role?: 'ADMIN' | 'USER';
};

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await apiFetch<Me>('/auth/me');
        if (!mounted) return;
        setMe(data);
      } catch {
        // pas bloquant: si non connecté, AppShell/requireAuth gère ailleurs
      } finally {
        if (mounted) setMeLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = useMemo(() => (me?.global_role ?? 'USER') === 'ADMIN', [me?.global_role]);

  //  Si un USER tente d'aller sur /admin/* via URL, on le sort (UX + sécurité côté UI)
  useEffect(() => {
    if (!meLoaded) return;
    if (!isAdmin && pathname.startsWith('/admin')) {
      router.replace('/workspaces'); // ou '/dashboard'
    }
  }, [meLoaded, isAdmin, pathname, router]);

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="mb-6 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-gia-navy to-gia-navy2" />
          <div className="leading-tight">
            <div className="text-base font-extrabold text-gia-navy">TaskFlow</div>
            <div className="text-xs text-slate-500">GIA-like workspace system</div>
          </div>
        </div>

        {/* petit badge role (optionnel) */}
        <div className="mt-3 text-[11px] text-slate-500">
          {meLoaded ? (
            <>
              Connecté : <span className="font-extrabold text-gia-navy">{me?.name ?? me?.email ?? '—'}</span> ·{' '}
              <span className="font-extrabold text-gia-navy">{me?.global_role ?? 'USER'}</span>
            </>
          ) : (
            'Chargement…'
          )}
        </div>
      </div>

      <div className="space-y-2">
        <NavItem href="/dashboard" label="Dashboard" icon={Home} />
        <NavItem href="/workspaces" label="Workspaces" icon={LayoutGrid} />
        <NavItem href="/tasks/me" label="Mes tâches" icon={ListTodo} />
        <NavItem href="/notifications" label="Notifications" icon={Bell} />
        

        {/*  Afficher le menu Admin uniquement si ADMIN */}
        {isAdmin ? <NavItem href="/admin/users" label="Users (Admin)" icon={Users} /> : null}
      </div>

      <div className="mt-6 border-t border-slate-200/70 pt-4 space-y-2">
        <NavItem href="/settings" label="Settings" icon={Settings} />
      </div>

      <div className="mt-auto pt-6 text-xs text-slate-500">
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/60">v0.1 · TaskFlow</div>
      </div>
    </div>
  );
}
