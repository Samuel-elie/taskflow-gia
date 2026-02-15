'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/fetcher';
import { Paperclip, Trash2, Upload, Loader2 } from 'lucide-react';

type AttachmentItem = {
  attachment_id: string;
  file_name: string;
  content_type?: string | null;
  file_size?: number | null;
  url: string;
  creation_date: string;
  uploader?: { user_id: string; name?: string | null; email?: string | null };
};

export default function AttachmentsPanel({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setErr(null);
    const res = await apiFetch<any>(`/tasks/${taskId}/attachments`);
    const list: AttachmentItem[] = Array.isArray(res) ? res : res?.items ?? [];
    setItems(list);
  }

  useEffect(() => {
    if (!taskId) return;
    load().catch((e) => setErr(e?.message ?? 'Impossible de charger les fichiers'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);

    setLoading(true);
    setErr(null);
    try {
      await apiFetch(`/tasks/${taskId}/attachments`, { method: 'POST', body: fd });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Upload impossible');
    } finally {
      setLoading(false);
    }
  }

  async function remove(attachmentId: string) {
    setLoading(true);
    setErr(null);
    try {
      await apiFetch(`/attachments/${attachmentId}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Suppression impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-extrabold text-gia-navy flex items-center gap-2">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Fichiers
          {loading ? (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500 ml-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              …
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-3.5 py-2 text-xs font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60"
            type="button"
            disabled={loading}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </button>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.currentTarget.value = '';
            }}
          />
        </div>
      </div>

      {err ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">Aucun fichier.</div>
        ) : (
          items.map((a) => (
            <div
              key={a.attachment_id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200/60 px-4 py-3"
            >
              <div className="min-w-0">
                <a
                  className="block text-sm font-extrabold text-gia-navy hover:underline break-words"
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.file_name}
                </a>
                <div className="text-xs text-slate-500">
                  {a.uploader?.name || a.uploader?.email || '—'} · {new Date(a.creation_date).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => remove(a.attachment_id)}
                className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                type="button"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
