import { test, expect } from '@playwright/test';
import { EnvironmentManager } from '../../src/config/environment-manager';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Environment Configuration Management @config', () => {
  let configDir: string;
  let manager: EnvironmentManager;

  test.beforeEach(() => {
    configDir = path.resolve(__dirname, '../../.tmp/env-configs');

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const devConfig = {
      name: 'dev',
      baseUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3000/api',
      timeout: 30000,
      retries: 3,
      headless: true,
      slowMo: 0,
      viewport: { width: 1280, height: 720 },
      variables: { API_KEY: 'dev-key' },
    };

    const stagingConfig = {
      name: 'staging',
      baseUrl: 'https://staging.example.com',
      apiUrl: 'https://staging.example.com/api',
      timeout: 30000,
      retries: 2,
      headless: true,
      slowMo: 0,
      viewport: { width: 1280, height: 720 },
      variables: { API_KEY: 'staging-key' },
    };

    fs.writeFileSync(path.join(configDir, 'env-dev.json'), JSON.stringify(devConfig, null, 2));
    fs.writeFileSync(
      path.join(configDir, 'env-staging.json'),
      JSON.stringify(stagingConfig, null, 2),
    );

    manager = new EnvironmentManager(configDir);
  });

  test.afterEach(() => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  test('should load environment configurations', () => {
    const environments = manager.listEnvironments();

    expect(environments).toContain('dev');
    expect(environments).toContain('staging');
  });

  test('should get configuration for environment', () => {
    const config = manager.getConfig('dev');

    expect(config.name).toBe('dev');
    expect(config.baseUrl).toBe('http://localhost:3000');
    expect(config.timeout).toBe(30000);
  });

  test('should get base URL for environment', () => {
    const baseUrl = manager.getBaseUrl('dev');

    expect(baseUrl).toBe('http://localhost:3000');
  });

  test('should get API URL for environment', () => {
    const apiUrl = manager.getApiUrl('dev');

    expect(apiUrl).toBe('http://localhost:3000/api');
  });

  test('should get timeout for environment', () => {
    const timeout = manager.getTimeout('dev');

    expect(timeout).toBe(30000);
  });

  test('should get retries for environment', () => {
    const retries = manager.getRetries('dev');

    expect(retries).toBe(3);
  });

  test('should set and switch environments', () => {
    manager.setEnvironment('staging');

    expect(manager.getCurrentEnvironment()).toBe('staging');

    const config = manager.getConfig();
    expect(config.name).toBe('staging');
  });

  test('should get environment variables', () => {
    const variables = manager.getAllVariables('dev');

    expect(variables.API_KEY).toBe('dev-key');
  });

  test('should get single environment variable', () => {
    const apiKey = manager.getVariable('API_KEY', 'dev');

    expect(apiKey).toBe('dev-key');
  });

  test('should set environment variable', () => {
    manager.setVariable('API_KEY', 'new-dev-key', 'dev');

    const apiKey = manager.getVariable('API_KEY', 'dev');
    expect(apiKey).toBe('new-dev-key');
  });

  test('should get test thresholds from config', () => {
    const thresholds = manager.getTestThresholds('dev');

    expect(thresholds.maxRetries).toBe(3);
    expect(thresholds.timeoutMs).toBe(30000);
  });

  test('should get performance budget', () => {
    const budget = manager.getPerformanceBudget('dev');

    expect(budget).toHaveProperty('lcp');
    expect(budget).toHaveProperty('fcp');
    expect(budget).toHaveProperty('inp');
    expect(budget).toHaveProperty('cls');
    expect(budget).toHaveProperty('ttfb');
  });

  test('should resolve URLs correctly', () => {
    const resolved = manager.resolveUrl('http://localhost:3000', '/auth/login');

    expect(resolved).toContain('localhost:3000');
    expect(resolved).toContain('/auth/login');
  });

  test('should add new environment', () => {
    const newConfig = {
      name: 'production',
      baseUrl: 'https://example.com',
      apiUrl: 'https://example.com/api',
      timeout: 60000,
      retries: 1,
      headless: true,
      slowMo: 0,
      viewport: { width: 1280, height: 720 },
      variables: { API_KEY: 'prod-key' },
    };

    manager.addEnvironment(newConfig);
    const environments = manager.listEnvironments();

    expect(environments).toContain('production');
  });

  test('should create environment from template', () => {
    const newConfig = manager.createEnvironmentFromTemplate(
      'qa',
      'https://qa.example.com',
      'https://qa.example.com/api',
      'dev',
    );

    expect(newConfig.name).toBe('qa');
    expect(newConfig.baseUrl).toBe('https://qa.example.com');
    expect(newConfig.timeout).toBe(30000);
  });

  test('should get environment status', () => {
    const status = manager.getEnvironmentStatus('dev');

    expect(status.name).toBe('dev');
    expect(status.baseUrl).toBe('http://localhost:3000');
    expect(status.headless).toBe(true);
    expect(status.timeout).toBe(30000);
  });

  test('should validate configuration', () => {
    const invalidConfig = {
      name: '',
      baseUrl: 'not-a-url',
      apiUrl: 'also-not-a-url',
      timeout: -1,
      retries: -1,
      headless: true,
      slowMo: 0,
      viewport: { width: -100, height: -100 },
      variables: {},
    };

    const errors = manager.validateConfig(invalidConfig);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join('')).toContain('Name is required');
    expect(errors.join('')).toContain('Timeout must be positive');
    expect(errors.join('')).toContain('Invalid base URL format');
  });

  test('should throw error for unknown environment', () => {
    expect(() => manager.getConfig('unknown')).toThrow();
  });

  test('should throw error when setting unknown environment', () => {
    expect(() => manager.setEnvironment('unknown')).toThrow();
  });

  test('should return different configurations for different environments', () => {
    const devConfig = manager.getConfig('dev');
    const stagingConfig = manager.getConfig('staging');

    expect(devConfig.baseUrl).not.toBe(stagingConfig.baseUrl);
    expect(devConfig.retries).not.toBe(stagingConfig.retries);
    expect(devConfig.variables.API_KEY).not.toBe(stagingConfig.variables.API_KEY);
  });

  test('should not modify original config when getting', () => {
    const config1 = manager.getConfig('dev');
    config1.timeout = 1000;

    const config2 = manager.getConfig('dev');

    expect(config2.timeout).toBe(30000);
  });

  test('should list all available environments', () => {
    const environments = manager.listEnvironments();

    expect(Array.isArray(environments)).toBe(true);
    expect(environments.length).toBeGreaterThan(0);
  });
});
