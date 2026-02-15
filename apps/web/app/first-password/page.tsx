'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/fetcher';
import { requireAuth } from '@/lib/requireAuth';

export default function FirstPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    requireAuth();

    apiFetch('/auth/me')
      .then((me: any) => {
        if (Number(me?.reset_password ?? 1) === 1) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const strengthHint = useMemo(() => {
    if (!password) return null;
    if (password.trim().length < 6) return 'Minimum 6 caractères.';
    return 'OK ✅';
  }, [password]);

  const mismatch = useMemo(() => {
    if (!confirmPassword) return false;
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  async function submit() {
    if (loading) return;
    setErr(null);

    if (password.trim().length < 6) return setErr('Mot de passe min 6 caractères');
    if (password !== confirmPassword) return setErr('Les mots de passe ne correspondent pas');

    setLoading(true);
    try {
      await apiFetch('/auth/first-password', {
        method: 'PATCH',
        body: JSON.stringify({ password, confirmPassword }),
      });
      router.replace('/dashboard');
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gia-bg flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-soft border border-slate-200/60 p-7">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gia-bg2 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-gia-navy" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gia-navy">Changer votre mot de passe</h1>
            <p className="mt-1 text-sm text-slate-600">
              Première connexion : vous devez définir un nouveau mot de passe.
            </p>
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-extrabold text-slate-700">Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-cyan"
              autoComplete="new-password"
            />
            {strengthHint ? (
              <div className="mt-1 text-xs text-slate-500">{strengthHint}</div>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-extrabold text-slate-700">Confirmer</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le mot de passe"
              className={[
                'mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-gia-cyan',
                mismatch ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
              autoComplete="new-password"
            />
            {mismatch ? <div className="mt-1 text-xs text-red-700">Ça ne correspond pas.</div> : null}
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-2xl bg-gia-navy px-4 py-3 text-sm font-extrabold text-white hover:bg-gia-navy2 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            type="button"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sauvegarde…
              </>
            ) : (
              'Valider'
            )}
          </button>
        </div>

        <div className="mt-6 h-1 w-full rounded-full bg-gia-navy" />
      </div>
    </div>
  );
}
