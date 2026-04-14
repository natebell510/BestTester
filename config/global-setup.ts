import * as dotenv from 'dotenv';
import { RoleManager } from '../src/auth/role-manager';
import { AuthStateCache } from '../src/auth/auth-state-cache';
import { Role } from '../src/auth/roles.config';

import * as path from 'path';
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true,
  log: { warn: () => {}, info: () => {}, debug: () => {} },
});

const ROLES: Role[] = ['Admin', 'Manager', 'Employee'];

/**
 * Global setup: authenticates as each role and saves storageState for reuse across tests.
 * Roles that fail (e.g. demo-site only has Admin) are skipped gracefully.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.SKIP_GLOBAL_SETUP === 'true') return;
  const baseURL = process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';
  for (const role of ROLES) {
    try {
      await RoleManager.ensureAuth(role, baseURL);
    } catch {
      console.warn(
        `[global-setup] Skipping role "${role}" — auth failed (credentials not configured).`,
      );
    }
  }
  process.env.STORAGE_STATE = AuthStateCache.getPath('Admin');
}
