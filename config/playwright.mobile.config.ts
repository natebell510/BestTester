import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/mobile',
  fullyParallel: true,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['html', { outputFolder: '../reports/mobile-report', open: 'on-failure' }], ['list']],

  use: {
    baseURL: 'https://www.saucedemo.com',
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    hasTouch: true,
    isMobile: true,
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    ...(process.env.MOBILE_TABLET
      ? [
          {
            name: 'tablet',
            use: { ...devices['iPad (gen 7)'] },
          },
        ]
      : []),
  ],
});
