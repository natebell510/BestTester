import { test as base, BrowserContext } from '@playwright/test';

export type WorkerIsolationFixtures = {
  cleanContext: BrowserContext;
};

export const test = base.extend<WorkerIsolationFixtures>({
  cleanContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: undefined,
    });
    await use(context);
    await context.clearCookies();
    await context.close();
  },
});

export { expect } from '@playwright/test';
