import { execSync } from 'child_process';
import { logger } from './logger';

interface OpField {
  label: string;
  value: string;
}

interface OpItem {
  id: string;
  title: string;
  fields: OpField[];
}

/**
 * 1Password CLI (`op`) wrapper for reading/writing vault secrets.
 *
 * Prerequisites:
 *   1. Install 1Password CLI: https://developer.1password.com/docs/cli/get-started
 *   2. Set OP_SERVICE_ACCOUNT_TOKEN in .env (or sign in via `op signin`)
 */
export class OnePassword {
  private readonly vault?: string;

  constructor(vault?: string) {
    this.vault = vault;
  }

  /** Execute an `op` CLI command and return stdout. */
  private exec(args: string): string {
    const vaultFlag = this.vault ? ` --vault "${this.vault}"` : '';
    const cmd = `op ${args}${vaultFlag} --format json`;
    try {
      return execSync(cmd, {
        encoding: 'utf-8',
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`1Password CLI error: ${msg}`);
      throw new Error(`1Password CLI failed: ${msg}`);
    }
  }

  /** Read a single field value from a vault item. */
  getField(itemName: string, fieldLabel: string): string {
    const raw = this.exec(`item get "${itemName}" --fields label="${fieldLabel}"`);
    const parsed = JSON.parse(raw);
    return parsed.value ?? parsed;
  }

  /** Read all fields from a vault item. */
  getItem(itemName: string): OpItem {
    const raw = this.exec(`item get "${itemName}"`);
    return JSON.parse(raw);
  }

  /** List all items in the vault. */
  listItems(): Array<{ id: string; title: string }> {
    const raw = this.exec('item list');
    return JSON.parse(raw);
  }

  /** Create a new login item with field assignments. */
  createItem(title: string, fields: Record<string, string>, category = 'Login'): string {
    const assignments = Object.entries(fields)
      .map(([k, v]) => `"${k}=${v}"`)
      .join(' ');
    const raw = this.exec(`item create --category "${category}" --title "${title}" ${assignments}`);
    const parsed = JSON.parse(raw);
    logger.info(`1Password: created item "${title}" (${parsed.id})`);
    return parsed.id;
  }

  /** Update (or add) a field on an existing item. */
  setField(itemName: string, fieldLabel: string, value: string): void {
    this.exec(`item edit "${itemName}" "${fieldLabel}=${value}"`);
    logger.info(`1Password: updated "${fieldLabel}" on "${itemName}"`);
  }

  /** Delete an item from the vault. */
  deleteItem(itemName: string): void {
    this.exec(`item delete "${itemName}"`);
    logger.info(`1Password: deleted item "${itemName}"`);
  }

  /**
   * Read a vault item and inject its fields into process.env.
   * Field labels are uppercased and spaces replaced with underscores.
   *
   * @param itemName - 1Password item title
   * @param mapping  - Optional explicit { envVar: fieldLabel } map.
   *                   If omitted, all fields with values are injected.
   */
  injectEnv(itemName: string, mapping?: Record<string, string>): void {
    const item = this.getItem(itemName);

    if (mapping) {
      for (const [envVar, fieldLabel] of Object.entries(mapping)) {
        const field = item.fields.find((f) => f.label === fieldLabel);
        if (field?.value) {
          process.env[envVar] = field.value;
          logger.info(`1Password → env: ${envVar}`);
        }
      }
    } else {
      for (const field of item.fields) {
        if (!field.value) continue;
        const envKey = field.label.toUpperCase().replace(/\s+/g, '_');
        process.env[envKey] = field.value;
        logger.info(`1Password → env: ${envKey}`);
      }
    }
  }

  /** Verify the CLI is installed and authenticated. */
  whoAmI(): string {
    const raw = execSync('op whoami --format json', {
      encoding: 'utf-8',
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return JSON.parse(raw);
  }
}
