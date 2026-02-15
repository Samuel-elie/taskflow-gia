'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Users, Settings, Home, Bell } from 'lucide-react';

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

export default function AppSidebar() {
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
      </div>

      <div className="space-y-2">
        <NavItem href="/dashboard" label="Dashboard" icon={Home} />
        <NavItem href="/workspaces" label="Workspaces" icon={LayoutGrid} />
        <NavItem href="/notifications" label="Notifications" icon={Bell} />
        <NavItem href="/admin/users" label="Users (Admin)" icon={Users} />
      </div>

      <div className="mt-6 border-t border-slate-200/70 pt-4 space-y-2">
        <NavItem href="/settings" label="Settings" icon={Settings} />
      </div>

      <div className="mt-auto pt-6 text-xs text-slate-500">
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/60">
          v0.1 · TaskFlow
        </div>
      </div>
    </div>
  );
}
