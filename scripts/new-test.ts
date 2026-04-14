#!/usr/bin/env ts-node
/**
 * Scaffolds a new test spec file.
 * Usage: npm run scaffold:test -- --name login.spec
 */
import * as fs from 'fs';
import * as path from 'path';

const nameArg = process.argv.find((a) => a.startsWith('--name='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--name') + 1];

if (!nameArg) { console.error('Usage: npm run scaffold:test -- --name <name.spec>'); process.exit(1); }

const fileName = nameArg.endsWith('.spec.ts') ? nameArg : `${nameArg.replace(/\.spec$/, '')}.spec.ts`;
const specPath = path.resolve('tests/ui/regression', fileName);

const content = `/**
 * @file ${fileName}
 * @description Tests for ${fileName.replace('.spec.ts', '')}
 * @tags @regression
 */
import { test, expect } from '../../src/fixtures/base.fixture';

test.describe('${fileName.replace('.spec.ts', '')}', () => {
  test('placeholder test', async ({ page }) => {
    // TODO: implement
  });
});
`;

fs.writeFileSync(specPath, content);
console.log(`✅ Created ${specPath}`);
