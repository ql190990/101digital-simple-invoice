import axios, { AxiosError } from 'axios';
import { clearToken, getToken } from './auth';

// Relative base URL by default ("/api"); nginx (Docker) or Vite (dev) proxies it
// to the backend (ADR D5).
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api = axios.create({ baseURL });

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the token and bounce to login (FR-05). A hard redirect keeps this
// simple and framework-agnostic.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      clearToken();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable message from an API error envelope. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  return fallback;
}
