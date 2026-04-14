#!/usr/bin/env ts-node
/**
 * Scaffolds a new Page Object + spec file and updates src/pages/index.ts barrel.
 * Usage: npm run scaffold:page -- --name EmployeePage
 */
import * as fs from 'fs';
import * as path from 'path';

const nameArg = process.argv.find((a) => a.startsWith('--name='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--name') + 1];

if (!nameArg) { console.error('Usage: npm run scaffold:page -- --name <PageName>'); process.exit(1); }

const className = nameArg.endsWith('Page') ? nameArg : `${nameArg}Page`;
const kebab = className.replace('Page', '').replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase());

const pageContent = `import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * @file ${kebab}.page.ts
 * @description Page Object for ${className}
 */
export class ${className} extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> { await this.navigate('/${kebab}'); }

  async exampleAction(): Promise<void> {
    // TODO: implement
  }
}
`;

const specContent = `/**
 * @file ${kebab}.spec.ts
 * @description Tests for ${className}
 * @tags @regression
 */
import { test, expect } from '../../src/fixtures/base.fixture';

test.describe('${className}', () => {
  test('placeholder test 1', async ({ page }) => {
    // TODO: implement
  });

  test('placeholder test 2', async ({ page }) => {
    // TODO: implement
  });
});
`;

const pagePath = path.resolve('src/pages', `${kebab}.page.ts`);
const specPath = path.resolve('tests/ui/regression', `${kebab}.spec.ts`);
const barrelPath = path.resolve('src/pages/index.ts');

fs.writeFileSync(pagePath, pageContent);
console.log(`✅ Created ${pagePath}`);

fs.writeFileSync(specPath, specContent);
console.log(`✅ Created ${specPath}`);

const exportLine = `export { ${className} } from './${kebab}.page';\n`;
if (!fs.existsSync(barrelPath)) fs.writeFileSync(barrelPath, '');
const barrel = fs.readFileSync(barrelPath, 'utf-8');
if (!barrel.includes(exportLine.trim())) {
  fs.appendFileSync(barrelPath, exportLine);
  console.log(`✅ Updated ${barrelPath}`);
}
