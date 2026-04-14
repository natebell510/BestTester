/**
 * @file role-access.spec.ts
 * @description Parameterized multi-role access matrix — verifies each role sees correct pages/actions.
 * @tags @regression @auth-matrix
 */
import { test, expect } from '@playwright/test';
import { Role, rolesConfig } from '../../src/auth/roles.config';
import { RoleManager } from '../../src/auth/role-manager';

const BASE_URL = process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';

const roleMatrix: { role: Role; canSee: string[]; cannotSee: string[] }[] = [
  {
    role: 'Admin',
    canSee: ['/web/index.php/pim/viewEmployeeList', '/web/index.php/admin/viewSystemUsers'],
    cannotSee: [],
  },
  {
    role: 'Manager',
    canSee: ['/web/index.php/pim/viewEmployeeList'],
    cannotSee: ['/web/index.php/admin/viewSystemUsers'],
  },
  {
    role: 'Employee',
    canSee: ['/web/index.php/pim/viewMyDetails'],
    cannotSee: ['/web/index.php/admin/viewSystemUsers'],
  },
];

test.describe.configure({ mode: 'parallel' });

for (const { role, canSee, cannotSee } of roleMatrix) {
  test.describe(`Role: ${role}`, () => {
    test.use({
      storageState: async ({}, use) => {
        const statePath = await RoleManager.ensureAuth(role, BASE_URL);
        await use(statePath);
      },
    });

    for (const url of canSee) {
      test(`can access ${url}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${url}`);
        await expect(page).not.toHaveURL(/auth\/login/);
      });
    }

    for (const url of cannotSee) {
      test(`cannot access ${url}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${url}`);
        // Should redirect to dashboard or show 403
        const currentUrl = page.url();
        expect(currentUrl).not.toContain(url.split('/').pop());
      });
    }
  });
}
