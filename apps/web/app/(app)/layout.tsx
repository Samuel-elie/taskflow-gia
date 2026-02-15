import type { ReactNode } from 'react';
import Header from '@/components/Header';
import AppSidebar from '@/components/layout/AppSidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gia-bg">
      <div className="flex">
        {/* Sidebar permanente */}
        <aside className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="sticky top-0 h-screen border-r border-slate-200 bg-white">
            <AppSidebar />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Top Header */}
          <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
            <Header />
          </div>

          {/* Content */}
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
