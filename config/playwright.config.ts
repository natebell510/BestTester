import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getConfig } from '../src/config/config';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const ENV = process.env.TEST_ENV ?? 'dev';
dotenv.config({
  path: path.resolve(__dirname, `environments/${ENV}.env`),
  override: false,
});

const config = getConfig();

export default defineConfig({
  testDir: '../tests',
  fullyParallel: true,
  forbidOnly: !!config.ci,
  retries: config.ci ? 1 : 0,
  workers: config.ci ? 4 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    [
      'html',
      {
        outputFolder: '../reports/playwright-report',
        open: config.ci ? 'never' : 'on-failure',
      },
    ],
    ['json', { outputFile: '../reports/playwright-report/results.json' }],
    ['junit', { outputFile: '../reports/playwright-report/junit.xml' }],
    ['allure-playwright', { resultsDir: '../reports/allure-results' }],
    ['list'],
  ],

  use: {
    ...devices['Desktop Chrome'],
    headless: config.headless,
    baseURL: config.baseUrl,
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    storageState: config.storageState ?? undefined,
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
    ...(config.allBrowsers
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
