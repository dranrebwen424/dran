import { defineConfig } from '@playwright/test';

// Exercise the existing development server without rebuilding or replacing it.
export default defineConfig({
  testDir: './tests',
  testMatch: 'character-preview.spec.ts',
  use: { baseURL: 'http://localhost:4321' },
});
