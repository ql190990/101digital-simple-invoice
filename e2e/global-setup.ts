import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Bring the full stack up before the suite. Idempotent: if /api/health already
 * reports the DB is up we reuse the running stack; otherwise `docker compose up`
 * (images are cached) and poll until healthy (backend has migrated + seeded).
 */
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const HEALTH_URL = `${BASE_URL}/api/health`;

const composeEnv = {
  ...process.env,
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5544',
  BACKEND_PORT: process.env.BACKEND_PORT ?? '3577',
  FRONTEND_PORT: process.env.FRONTEND_PORT ?? '8080',
  JWT_SECRET: process.env.JWT_SECRET ?? 'e2e_pw_secret_at_least_16_chars_long',
  SEED_ON_BOOT: 'true',
  // Relax the GLOBAL rate limit for the test stack so ordinary page loads
  // (/auth/me, /invoices, ...) don't get throttled. The login endpoint keeps its
  // own hardcoded 5/60s limit — handled by logging in once via storageState.
  THROTTLE_LIMIT: process.env.THROTTLE_LIMIT ?? '1000',
};

async function isHealthy(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string; db?: string };
    return body.status === 'ok' && body.db === 'up';
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy()) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`[e2e] stack not healthy at ${HEALTH_URL} within ${timeoutMs}ms`);
}

export default async function globalSetup(): Promise<void> {
  if (await isHealthy()) {
    // eslint-disable-next-line no-console
    console.log('[e2e] stack already healthy — reusing it');
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[e2e] starting stack: docker compose up -d --build');
  // execFileSync (no shell) with a fixed argument array — avoids shell injection.
  execFileSync('docker', ['compose', 'up', '-d', '--build'], {
    cwd: ROOT,
    env: composeEnv,
    stdio: 'inherit',
  });
  // eslint-disable-next-line no-console
  console.log(`[e2e] waiting for ${HEALTH_URL} ...`);
  await waitForHealth(240_000);
  // eslint-disable-next-line no-console
  console.log('[e2e] stack healthy — running tests');
}
