'use client';

import { useMemo, useState } from 'react';

type Member = { user: { user_id: string; name?: string | null; email?: string | null } };

export default function CommentBox({
  members,
  loading,
  onSubmit,
}: {
  members: Member[];
  loading?: boolean;
  onSubmit: (content: string) => void;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = members
      .filter((m) => (m.user.name || m.user.email || '').toLowerCase().includes(q))
      .slice(0, 6);
    return q ? list : members.slice(0, 6);
  }, [members, query]);

  function handleChange(v: string) {
    setText(v);

    const lastAt = v.lastIndexOf('@');
    if (lastAt === -1) return setOpen(false);

    const tail = v.slice(lastAt + 1);
    if (tail.includes(' ') || tail.includes('\n')) return setOpen(false);

    setQuery(tail);
    setOpen(true);
  }

  function insertMention(userId: string, label: string) {
    const lastAt = text.lastIndexOf('@');
    if (lastAt === -1) return;
    const before = text.slice(0, lastAt);
    const token = `@[${label}](${userId}) `;
    setText(before + token);
    setOpen(false);
    setQuery('');
  }

  function submit() {
    const c = text.trim();
    if (c.length < 2) return;
    onSubmit(c);
    setText('');
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="relative">
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan min-h-[110px]"
        placeholder="Écrire un commentaire… (tape @ pour mentionner)"
        disabled={!!loading}
      />

      {open ? (
        <div className="absolute left-0 top-full mt-2 w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-soft p-2 z-50">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">Aucun résultat</div>
          ) : (
            filtered.map((m) => {
              const label = m.user.name || m.user.email || 'User';
              return (
                <button
                  key={m.user.user_id}
                  onClick={() => insertMention(m.user.user_id, label)}
                  className="w-full text-left rounded-2xl px-3 py-2 hover:bg-gia-bg2"
                  type="button"
                >
                  <div className="text-sm font-extrabold text-gia-navy">{label}</div>
                  {m.user.email ? <div className="text-xs text-slate-500">{m.user.email}</div> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={!!loading || text.trim().length < 2}
          className="rounded-2xl bg-gia-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60"
          type="button"
        >
          {loading ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
