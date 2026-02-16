'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';
import { Check, User, Mail, Lock, X } from 'lucide-react';

type Me = {
  user_id: string;
  email: string;
  name?: string | null;
  global_role?: 'ADMIN' | 'USER';
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    requireAuth();
    (async () => {
      try {
        const data = await apiFetch<Me>('/auth/me');
        setMe(data);
        setEmail(data.email ?? '');
        setName(data.name ?? '');
      } catch (e: any) {
        setErr(e?.message ?? 'Erreur chargement profil');
      }
    })();
  }, []);

  const canSave = useMemo(() => {
    if (!email.trim().includes('@')) return false;
    if (password.trim() && password.trim().length < 6) return false;
    return true;
  }, [email, password]);

  async function save() {
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const payload: any = {
        email: email.trim(),
        name: name.trim() ? name.trim() : null,
      };
      if (password.trim()) payload.password = password.trim();

      const updated = await apiFetch<Me>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setMe(updated);
      setEmail(updated.email ?? '');
      setName(updated.name ?? '');
      setPassword('');
      setOk('Profil mis à jour.');
    } catch (e: any) {
      setErr(e?.message ?? 'Impossible de sauvegarder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
        <div className="p-6 sm:p-7 bg-gradient-to-r from-white via-white to-gia-bg2">
          <h1 className="text-3xl font-extrabold text-gia-navy">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Modifie tes informations personnelles.</p>
          <div className="mt-2 text-xs text-slate-500">
            Connecté : <span className="font-extrabold text-gia-navy">{me?.email ?? '—'}</span>
          </div>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="font-extrabold">Erreur</div>
          <div className="mt-1">{err}</div>
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start gap-3">
          <Check className="h-5 w-5 mt-0.5" />
          <div>
            <div className="font-extrabold">OK</div>
            <div className="mt-1">{ok}</div>
          </div>
          <button
            onClick={() => setOk(null)}
            className="ml-auto rounded-xl p-2 hover:bg-white/60"
            type="button"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200/60 bg-white shadow-soft p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-extrabold text-slate-700 inline-flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
              placeholder="email"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-extrabold text-slate-700 inline-flex items-center gap-2">
              <User className="h-4 w-4" /> Nom
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
              placeholder="Nom (optionnel)"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-extrabold text-slate-700 inline-flex items-center gap-2">
              <Lock className="h-4 w-4" /> Mot de passe (optionnel)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-gia-cyan"
              placeholder="Laisser vide pour ne pas changer"
              type="password"
            />
            <div className="mt-2 text-xs text-slate-500">Min 6 caractères si renseigné.</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={loading || !canSave}
            onClick={save}
            className="inline-flex items-center gap-2 rounded-2xl bg-gia-navy px-5 py-3 text-sm font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {loading ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </section>
    </div>
  );
}
