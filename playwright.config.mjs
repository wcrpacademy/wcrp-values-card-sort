// Playwright: runs against tests/serve.mjs (the site + a mock Apps Script running the real apps-script.gs).
// Locally it uses the installed Google Chrome (no browser download); in CI the workflow installs Chromium.
import { defineConfig } from '@playwright/test';

const PORT = 4173;
const phone = { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs$/,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1, // one mock Sheet shared by all tests
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'phone-375', use: phone },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1024 }, hasTouch: true }, testMatch: /flow\.spec\.mjs$/ },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } }, testMatch: /flow\.spec\.mjs$/ },
  ],
});
