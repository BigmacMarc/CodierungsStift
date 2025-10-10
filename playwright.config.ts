import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  webServer: {
    command: 'npm run preview',
    port: 5173,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://localhost:5173'
  }
});

