import { getAccessToken } from './auth';

/**
 * Fetch wrapper :
 * - Ajoute Bearer token automatiquement
 * - Erreurs API utiles (status + body)
 * - Redirect /login si 401
 * - Support FormData (upload) 
 */

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;

  const body = options.body as any;
  const isFormData =
    typeof FormData !== 'undefined' && body && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as any),
  };

  //  ne pas forcer JSON si FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');

    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      throw new Error(`401 Unauthorized`);
    }

    throw new Error(`API ${res.status} on ${endpoint} : ${bodyText}`);
  }

  // si 204 no content
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}
