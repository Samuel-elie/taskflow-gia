'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail } from 'lucide-react';
import { setTokens } from '@/lib/auth';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

type MeResponse = {
  sub?: string;
  email?: string;
  name?: string;
  global_role?: 'ADMIN' | 'USER';
  reset_password?: number; // 0 => doit reset, 1 => ok
};

async function safeReadError(res: Response) {
  try {
    const data = await res.json();
    return data?.message || data?.error || JSON.stringify(data);
  } catch {
    try {
      return await res.text();
    } catch {
      return '';
    }
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL manquant.');

      // 1) LOGIN
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const msg = await safeReadError(res);

        if (res.status === 401) throw new Error('Email ou mot de passe incorrect.');
        if (res.status === 404) throw new Error('Endpoint introuvable (vérifie NEXT_PUBLIC_API_URL).');

        throw new Error(msg ? `Erreur API (${res.status}) : ${msg}` : `Erreur API (${res.status}).`);
      }

      const data = (await res.json()) as LoginResponse;

      // 2) STORE TOKENS
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

      // 3) CHECK reset_password
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });

      // fallback
      if (!meRes.ok) {
        router.replace('/dashboard');
        return;
      }

      const me = (await meRes.json()) as MeResponse;
      const mustReset = Number(me?.reset_password ?? 1) === 0;

      router.replace(mustReset ? '/first-password' : '/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gia-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-soft border border-slate-200/60 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gia-navy">TaskFlow</h1>
          <p className="text-sm text-slate-600 mt-1">Connecte-toi pour accéder à ton dashboard.</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-extrabold text-slate-700">Email</label>
            <div className="mt-2 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: user@email.com"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 outline-none focus:border-gia-cyan"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-extrabold text-slate-700">Mot de passe</label>
            <div className="mt-2 relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 outline-none focus:border-gia-cyan"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gia-navy px-4 py-3 text-white font-extrabold hover:bg-gia-navy2 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Connexion…
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div className="mt-6 h-1 w-full rounded-full bg-gia-navy" />
      </div>
    </div>
  );
}
