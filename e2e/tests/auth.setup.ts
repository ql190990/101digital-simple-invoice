import fs from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { loginAsReviewer } from '../helpers';
import { STORAGE_STATE } from '../paths';

/**
 * Log in ONCE and persist the browser storage state (the JWT lives in
 * localStorage). All other tests reuse it via `storageState`, so the suite hits
 * POST /auth/login only a handful of times — the endpoint is rate-limited to
 * 5/60s, so per-test UI logins would trip HTTP 429.
 */
setup('authenticate once and persist storage state', async ({ page }) => {
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await loginAsReviewer(page);
  await page.context().storageState({ path: STORAGE_STATE });
  await expect(fs.existsSync(STORAGE_STATE)).toBe(true);
});
