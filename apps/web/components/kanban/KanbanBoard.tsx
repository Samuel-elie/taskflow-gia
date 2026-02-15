'use client';

import { useMemo } from 'react';
import type { Task, TaskStatus } from '@/lib/types';

const columns: { key: TaskStatus; title: string }[] = [
  { key: 'TODO', title: 'À faire' },
  { key: 'DOING', title: 'En cours' },
  { key: 'DONE', title: 'Terminé' },
];

export default function KanbanBoard({
  tasks,
  onMove,
}: {
  tasks: Task[];
  onMove: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const grouped = useMemo(() => {
    const by: Record<TaskStatus, Task[]> = { TODO: [], DOING: [], DONE: [] };
    for (const t of tasks) by[t.status].push(t);
    return by;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {columns.map((col) => (
        <div
          key={col.key}
          className="rounded-2xl bg-white shadow-soft p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('taskId');
            if (taskId) onMove(taskId, col.key);
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gia-navy">{col.title}</h3>
            <span className="rounded-full bg-gia-bg2 px-3 py-1 text-xs text-gia-navy">
              {grouped[col.key].length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {grouped[col.key].map((t) => (
              <TaskCard key={t.task_id} task={t} />
            ))}

            {grouped[col.key].length === 0 && (
              <div className="text-sm text-slate-500">Aucune tâche</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const deadlineLabel = task.deadline ? new Date(task.deadline).toLocaleDateString() : '—';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.task_id);
      }}
      className="cursor-grab rounded-xl border border-slate-100 bg-gia-bg2 p-4 hover:bg-gia-bg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gia-text">{task.title}</div>
          <div className="mt-1 text-xs text-slate-500">
            Deadline: {deadlineLabel}
          </div>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gia-navy">
          {task.priority}
        </span>
      </div>
    </div>
  );
}
