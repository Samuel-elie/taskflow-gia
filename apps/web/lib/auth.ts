/**
 * Gestion simple des tokens.
 * MVP: stockage localStorage.
 */

export function setTokens(params: { accessToken: string; refreshToken?: string }) {
  localStorage.setItem('accessToken', params.accessToken);
  if (params.refreshToken) localStorage.setItem('refreshToken', params.refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
