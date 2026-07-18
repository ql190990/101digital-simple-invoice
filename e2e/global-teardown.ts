import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Tear the stack down after the suite. Set E2E_KEEP_STACK=1 to leave it running
 * (useful for local debugging / re-runs).
 */
const ROOT = path.resolve(__dirname, '..');

const composeEnv = {
  ...process.env,
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5544',
  BACKEND_PORT: process.env.BACKEND_PORT ?? '3577',
  FRONTEND_PORT: process.env.FRONTEND_PORT ?? '8080',
};

export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_KEEP_STACK === '1') {
    // eslint-disable-next-line no-console
    console.log('[e2e] E2E_KEEP_STACK=1 — leaving the stack running');
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[e2e] tearing down: docker compose down -v');
  try {
    execFileSync('docker', ['compose', 'down', '-v'], {
      cwd: ROOT,
      env: composeEnv,
      stdio: 'inherit',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[e2e] teardown failed (non-fatal):', error);
  }
}
