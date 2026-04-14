import { test as base, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_STATE = path.resolve(__dirname, '../../auth-state/admin.json');

export type AuthFixtures = {
  authenticatedContext: BrowserContext;
};

/**
 * Auth fixture — provides a pre-authenticated browser context using saved storageState.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    const storageState = fs.existsSync(AUTH_STATE) ? AUTH_STATE : undefined;
    const context = await browser.newContext({ storageState });
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
