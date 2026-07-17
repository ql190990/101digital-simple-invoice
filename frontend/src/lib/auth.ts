/**
 * Client-side JWT storage (ADR A11). We use localStorage for simplicity.
 * Tradeoff: localStorage is readable by any XSS-injected script. An httpOnly
 * cookie would be more secure but requires same-site/CSRF handling that is
 * disproportionate for this assessment's scope. Documented in the README.
 */
const TOKEN_KEY = 'simpleinvoice.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
