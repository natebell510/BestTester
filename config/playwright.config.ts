import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const dotenvOpts = { debug: false, log: { warn: () => {}, info: () => {}, debug: () => {} } };
dotenv.config({ ...dotenvOpts, path: path.resolve(__dirname, '../.env'), override: true });

const ENV = process.env.TEST_ENV ?? 'dev';
dotenv.config({
  ...dotenvOpts,
  path: path.resolve(__dirname, `environments/${ENV}.env`),
  override: false,
});

export default defineConfig({
  testDir: '../tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.RETRY === 'false' ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    [
      'html',
      {
        outputFolder: '../reports/playwright-report',
        open: process.env.CI ? 'never' : 'on-failure',
      },
    ],
    ['json', { outputFile: '../reports/playwright-report/results.json' }],
    ['junit', { outputFile: '../reports/playwright-report/junit.xml' }],
    ['allure-playwright', { resultsDir: '../reports/allure-results' }],
    ['list'],
  ],

  use: {
    ...devices['Desktop Chrome'],
    headless: process.env.HEADLESS !== 'false',
    baseURL: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    storageState: process.env.STORAGE_STATE ?? undefined,
  },

  globalSetup: './global-setup.ts',

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    ...(process.env.ALL_BROWSERS
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['setup'] as string[],
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            dependencies: ['setup'] as string[],
          },
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
            dependencies: ['setup'] as string[],
          },
          {
            name: 'mobile-safari',
            use: { ...devices['iPhone 13'] },
            dependencies: ['setup'] as string[],
          },
        ]
      : []),
  ],
});
