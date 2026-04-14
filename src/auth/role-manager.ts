import { chromium } from '@playwright/test';
import { Role, rolesConfig } from './roles.config';
import { AuthStateCache } from './auth-state-cache';

/**
 * Logs in as a given role and saves storageState; uses cache if still valid.
 */
export class RoleManager {
  static async ensureAuth(role: Role, baseURL: string): Promise<string> {
    if (AuthStateCache.isValid(role)) return AuthStateCache.getPath(role);

    const { username, password } = rolesConfig[role];
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto('/web/index.php/auth/login');
    await page.getByPlaceholder('Username').fill(username);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/dashboard/index');

    const statePath = AuthStateCache.getPath(role);
    await context.storageState({ path: statePath });
    AuthStateCache.save(role);
    await browser.close();

    return statePath;
  }
}
