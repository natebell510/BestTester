import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import playwright from 'eslint-plugin-playwright';
import security from 'eslint-plugin-security';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'reports/', 'playwright-report/', 'mutation/mutation-report/'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tseslint, playwright, security },
    rules: {
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE'],
        },
      ],
      'no-console': 'warn',

      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-element-handle': 'warn',
      'playwright/valid-expect': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',

      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="page"][callee.property.name="waitForTimeout"]',
          message: 'page.waitForTimeout() is not allowed - use page.waitForLoadState() or waitForFunction()',
        },
        {
          selector: 'CallExpression[callee.name="sleep"]',
          message: 'Hardcoded sleep() calls are not allowed - use Playwright wait methods',
        },
        {
          selector: 'CallExpression[callee.name="delay"]',
          message: 'Hardcoded delay() calls are not allowed - use Playwright wait methods',
        },
        {
          selector: 'CallExpression[callee.object.name="page"][callee.property.name="pause"]',
          message: 'page.pause() is not allowed in committed code - use --debug flag instead',
        },
      ],

      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'warn',
    },
  },
];
