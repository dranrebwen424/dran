import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'figma-refresh.spec.ts',
  workers: 1,
  timeout: 45_000,
  use: { baseURL: 'http://127.0.0.1:4335' },
  webServer: {
    command: 'node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4335',
    url: 'http://127.0.0.1:4335',
    reuseExistingServer: true,
  },
});
