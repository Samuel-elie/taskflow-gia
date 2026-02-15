'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetcher';
import MentionText from '@/components/comments/renderMentions';

type TaskEventItem = {
  task_event_id: string;
  type: string;
  message: string;
  creation_date: string;
  user?: {
    user_id: string;
    name?: string | null;
    email?: string | null;
  } | null;
};

export default function ActivityTimeline({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;
    setLoading(true);

    apiFetch<TaskEventItem[]>(`/tasks/${taskId}/events`)
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (loading && events.length === 0) return <div className="text-sm text-slate-500">Chargement de l’historique…</div>;
  if (!loading && events.length === 0) return <div className="text-sm text-slate-500">Aucun événement.</div>;

  return (
    <div className="relative pl-5">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200/70" />

      <div className="space-y-4">
        {events.map((e) => (
          <div key={e.task_event_id} className="relative">
            <div className="absolute left-0 top-2 h-3 w-3 rounded-full bg-gia-cyan" />

            <div className="rounded-3xl border border-slate-200/60 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-extrabold text-gia-navy">{e.user?.name || e.user?.email || '—'}</div>
                <div className="text-xs text-slate-500">
                  {e.creation_date ? new Date(e.creation_date).toLocaleString() : '—'}
                </div>
              </div>

              <div className="mt-1 text-sm text-slate-700">
                <MentionText text={e.message ?? ''} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
