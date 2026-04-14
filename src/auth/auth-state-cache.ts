import * as fs from 'fs';
import * as path from 'path';
import { Role } from './roles.config';

const AUTH_DIR = path.resolve(process.cwd(), '.auth');
const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  savedAt: number;
  statePath: string;
}

/**
 * Caches storageState JSON per role and refreshes on expiry.
 */
export class AuthStateCache {
  private static cache: Partial<Record<Role, CacheEntry>> = {};

  static getPath(role: Role): string {
    return path.join(AUTH_DIR, `${role.toLowerCase()}.json`);
  }

  static isValid(role: Role): boolean {
    const entry = this.cache[role];
    if (!entry) return false;
    if (Date.now() - entry.savedAt > TTL_MS) return false;
    return fs.existsSync(entry.statePath);
  }

  static save(role: Role): void {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    this.cache[role] = { savedAt: Date.now(), statePath: this.getPath(role) };
  }

  static invalidate(role: Role): void {
    delete this.cache[role];
  }
}
