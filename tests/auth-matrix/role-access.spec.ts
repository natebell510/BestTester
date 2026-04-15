/**
 * @file role-access.spec.ts
 * @description Parameterized multi-role access matrix — verifies each role sees correct pages/actions.
 * @tags @auth-matrix @regression
 */
import { test, expect } from '@playwright/test';
import { Role } from '../../src/auth/roles.config';
import { AuthStateCache } from '../../src/auth/auth-state-cache';
import * as fs from 'fs';

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
  const authPath = AuthStateCache.getPath(role);
  const hasAuth = fs.existsSync(authPath);

  test.describe(`@auth-matrix — Role: ${role}`, () => {
    test.use({
      storageState: hasAuth ? authPath : undefined,
    });

    for (const url of canSee) {
      test(`can access ${url}`, async ({ page }) => {
        test.skip(!hasAuth, `Role "${role}" auth not available`);
        await page.goto(`${BASE_URL}${url}`);
        await expect(page).not.toHaveURL(/auth\/login/);
      });
    }

    for (const url of cannotSee) {
      test(`cannot access ${url}`, async ({ page }) => {
        test.skip(!hasAuth, `Role "${role}" auth not available`);
        await page.goto(`${BASE_URL}${url}`);
        const currentUrl = page.url();
        expect(currentUrl).not.toContain(url.split('/').pop());
      });
    }
  });
}
