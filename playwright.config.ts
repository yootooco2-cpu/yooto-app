import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  timeout: 45_000,
  // Un SEUL serveur Expo dev partagé → on sérialise (aucune charge concurrente qui ralentit
  // le bundling Metro / les fetch Supabase et rend les compteurs flaky).
  workers: 1,
  // Absorbe la latence transitoire du serveur dev ; active la trace au 1er retry (cf. `use.trace`).
  retries: 1,

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
