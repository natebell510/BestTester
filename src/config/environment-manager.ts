import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
  apiUrl: string;
  timeout: number;
  retries: number;
  headless: boolean;
  slowMo: number;
  viewport: { width: number; height: number };
  proxy?: { server: string; bypass?: string };
  credentials?: { username: string; password: string };
  variables: Record<string, string>;
}

export interface PerformanceBudget {
  lcp: number;
  fcp: number;
  inp: number;
  cls: number;
  ttfb: number;
}

export interface TestThresholds {
  maxRetries: number;
  timeoutMs: number;
  slowMo: number;
}

export class EnvironmentManager {
  private configs: Map<string, EnvironmentConfig> = new Map();
  private currentEnv: string;
  private configDir: string;

  constructor(configDir: string = 'config') {
    this.configDir = configDir;
    this.currentEnv = process.env.TEST_ENV || 'dev';
    this.loadConfigs();
  }

  private loadConfigs(): void {
    const configFiles = fs
      .readdirSync(this.configDir)
      .filter((f) => f.startsWith('env-') && f.endsWith('.json'));

    configFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(this.configDir, file), 'utf-8');
      const config = JSON.parse(content) as EnvironmentConfig;
      this.configs.set(config.name, config);
    });
  }

  setEnvironment(env: string): void {
    if (!this.configs.has(env)) {
      throw new Error(`Environment '${env}' not configured`);
    }
    this.currentEnv = env;
  }

  getConfig(env?: string): EnvironmentConfig {
    const targetEnv = env || this.currentEnv;
    const config = this.configs.get(targetEnv);

    if (!config) {
      throw new Error(`No configuration found for environment '${targetEnv}'`);
    }

    return { ...config };
  }

  getCurrentEnvironment(): string {
    return this.currentEnv;
  }

  getBaseUrl(env?: string): string {
    const config = this.getConfig(env);
    return config.baseUrl;
  }

  getApiUrl(env?: string): string {
    const config = this.getConfig(env);
    return config.apiUrl;
  }

  getTimeout(env?: string): number {
    const config = this.getConfig(env);
    return config.timeout;
  }

  getRetries(env?: string): number {
    const config = this.getConfig(env);
    return config.retries;
  }

  getVariable(key: string, env?: string): string | undefined {
    const config = this.getConfig(env);
    return config.variables[key];
  }

  setVariable(key: string, value: string, env?: string): void {
    const targetEnv = env || this.currentEnv;
    const config = this.getConfig(targetEnv);
    config.variables[key] = value;
  }

  getAllVariables(env?: string): Record<string, string> {
    const config = this.getConfig(env);
    return { ...config.variables };
  }

  getCredentials(env?: string): { username: string; password: string } | undefined {
    const config = this.getConfig(env);
    return config.credentials;
  }

  getPerformanceBudget(env?: string): PerformanceBudget {
    const config = this.getConfig(env);
    const budgets = this.loadPerformanceBudgets();
    return budgets[config.name] || budgets.default;
  }

  getTestThresholds(env?: string): TestThresholds {
    const config = this.getConfig(env);
    return {
      maxRetries: config.retries,
      timeoutMs: config.timeout,
      slowMo: config.slowMo,
    };
  }

  private loadPerformanceBudgets(): Record<string, PerformanceBudget> {
    const budgetFile = path.join(this.configDir, 'performance-budgets.json');
    if (!fs.existsSync(budgetFile)) {
      return {
        default: { lcp: 2500, fcp: 1800, inp: 200, cls: 0.1, ttfb: 800 },
      };
    }

    const content = fs.readFileSync(budgetFile, 'utf-8');
    return JSON.parse(content);
  }

  listEnvironments(): string[] {
    return Array.from(this.configs.keys());
  }

  addEnvironment(config: EnvironmentConfig): void {
    this.configs.set(config.name, config);
  }

  createEnvironmentFromTemplate(
    name: string,
    baseUrl: string,
    apiUrl: string,
    template?: string,
  ): EnvironmentConfig {
    const templateConfig = template ? this.getConfig(template) : this.getConfig('dev');

    return {
      ...templateConfig,
      name,
      baseUrl,
      apiUrl,
    };
  }

  resolveUrl(baseUrl: string, path: string): string {
    const base = new URL(baseUrl);
    return new URL(path, base).toString();
  }

  getEnvironmentStatus(env?: string): {
    name: string;
    baseUrl: string;
    headless: boolean;
    timeout: number;
  } {
    const config = this.getConfig(env);
    return {
      name: config.name,
      baseUrl: config.baseUrl,
      headless: config.headless,
      timeout: config.timeout,
    };
  }

  validateConfig(config: EnvironmentConfig): string[] {
    const errors: string[] = [];

    if (!config.name) errors.push('Name is required');
    if (!config.baseUrl) errors.push('Base URL is required');
    if (!config.apiUrl) errors.push('API URL is required');
    if (config.timeout < 0) errors.push('Timeout must be positive');
    if (config.retries < 0) errors.push('Retries must be non-negative');
    if (config.viewport.width <= 0 || config.viewport.height <= 0)
      errors.push('Viewport dimensions must be positive');

    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('Invalid base URL format');
    }

    try {
      new URL(config.apiUrl);
    } catch {
      errors.push('Invalid API URL format');
    }

    return errors;
  }
}
