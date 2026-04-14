import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function parseDotenvLines(text: string): Array<{ key: string; val: string }> {
  const out: Array<{ key: string; val: string }> = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out.push({ key, val });
  }
  return out;
}

/**
 * Merge env vars from a file into `process.env` without overriding existing values.
 */
function mergeEnvFile(filePath: string, keyFilter?: (key: string) => boolean): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const { key, val } of parseDotenvLines(text)) {
    if (keyFilter && !keyFilter(key)) continue;
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

/** Optional `.env.e2e.local` (you create it; it is gitignored). */
mergeEnvFile(path.join(process.cwd(), '.env.e2e.local'));
/** Or put only `E2E_*` lines in `.env.local` next to your Supabase keys — Playwright reads those too. */
mergeEnvFile(path.join(process.cwd(), '.env.local'), (key) => key.startsWith('E2E_'));

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
