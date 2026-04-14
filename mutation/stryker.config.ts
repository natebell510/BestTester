import type { Config } from '@stryker-mutator/api/core';

const config: Config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  testRunner: 'command',
  commandRunner: { command: 'npm run test:smoke' },
  coverageAnalysis: 'off',
  mutate: ['src/pages/**/*.ts', 'src/api/**/*.ts'],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  htmlReporter: { fileName: 'mutation/mutation-report/index.html' },
  jsonReporter: { fileName: 'mutation/mutation-report/mutation.json' },
  thresholds: { high: 80, low: 70, break: 70 },
  tempDirName: 'mutation/.stryker-tmp',
  cleanTempDir: true,
};

export default config;
