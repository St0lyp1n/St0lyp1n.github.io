import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  expect: { timeout: 6000 },
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: '.artifacts/playwright-report', open: 'never' }]],
  outputDir: '.artifacts/test-results',
  use: {
    baseURL: process.env.BLOG_BASE_URL || 'http://127.0.0.1:1313',
    headless: true,
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE || undefined },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: process.env.BLOG_BASE_URL
    ? undefined
    : {
        command: 'node scripts/hugo.mjs server --bind 127.0.0.1 --port 1313 --disableFastRender',
        url: 'http://127.0.0.1:1313/studio/',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
});
