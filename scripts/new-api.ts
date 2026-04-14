#!/usr/bin/env ts-node
/**
 * Scaffolds a new API client file.
 * Usage: npm run scaffold:api -- --name auth.api
 */
import * as fs from 'fs';
import * as path from 'path';

const nameArg = process.argv.find((a) => a.startsWith('--name='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--name') + 1];

if (!nameArg) { console.error('Usage: npm run scaffold:api -- --name <name.api>'); process.exit(1); }

const base = nameArg.replace(/\.api(\.ts)?$/, '');
const className = base.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('') + 'API';
const fileName = `${base}.api.ts`;
const filePath = path.resolve('src/api', fileName);

const content = `import { APIRequestContext } from '@playwright/test';
import { BaseAPI } from './base.api';

/**
 * @file ${fileName}
 * @description API client for ${base}
 */
export class ${className} extends BaseAPI {
  constructor(request: APIRequestContext) { super(request); }

  async getAll(): Promise<unknown[]> {
    return this.get<unknown[]>('/api/v1/${base}s');
  }
}
`;

fs.writeFileSync(filePath, content);
console.log(`✅ Created ${filePath}`);
