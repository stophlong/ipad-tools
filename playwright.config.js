// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  workers: 4,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8123',
    trace: 'retain-on-failure',
    // Use a system/preinstalled Chromium when provided (e.g. sandboxed CI
    // images that ship their own build); otherwise Playwright's default.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
    // Pin the browser timezone so date/time assertions are deterministic.
    timezoneId: 'America/Denver',
    locale: 'en-US',
  },
  webServer: {
    command: 'python3 -m http.server 8123 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8123/index.html',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
