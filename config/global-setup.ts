import * as dotenv from 'dotenv';
import * as path from 'path';
import { RoleManager } from '../src/auth/role-manager';
import { AuthStateCache } from '../src/auth/auth-state-cache';
import { Role } from '../src/auth/roles.config';
import { getConfig } from '../src/config/config';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true,
});

const ROLES: Role[] = ['Admin', 'Manager', 'Employee'];

export default async function globalSetup(): Promise<void> {
  const config = getConfig();

  if (config.skipGlobalSetup) return;

  for (const role of ROLES) {
    try {
      await RoleManager.ensureAuth(role, config.baseUrl);
    } catch {
      console.warn(
        `[global-setup] Skipping role "${role}" — auth failed (credentials not configured).`,
      );
    }
  }

  process.env.STORAGE_STATE = AuthStateCache.getPath('Admin');
}
