'use client';

import AppSidebar from '@/components/layout/AppSidebar';
import Header from '@/components/Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gia-bg">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:block w-[280px] border-r border-slate-200/60 bg-white">
          <AppSidebar />
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <Header />

          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
