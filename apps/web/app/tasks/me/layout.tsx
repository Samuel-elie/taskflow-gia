'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import AppShell from '@/components/layout/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    requireAuth();
    apiFetch('/notifications/unread-count')
      .then((r: any) => setUnreadCount(r?.unreadCount ?? 0))
      .catch(() => setUnreadCount(0));
  }, []);

    return <AppShell>{children}</AppShell>;

}
