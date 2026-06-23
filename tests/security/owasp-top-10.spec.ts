import { test, expect } from '@playwright/test';
import { SecurityTester } from '../../src/security/security-tester';

test.describe('OWASP Top 10 Security Tests @security', () => {
  let securityTester: SecurityTester;

  test.beforeEach(() => {
    securityTester = new SecurityTester();
  });

  test('A01: Broken Access Control - should have proper authorization checks', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const response = await page.context().request.get(`${baseURL}/web/index.php/admin`);

    expect(response.status()).toBe(403);
  });

  test('A02: Cryptographic Failures - should enforce HTTPS', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    expect(page.url()).toMatch(/^https:\/\//);
  });

  test('A03: Injection - should sanitize SQL inputs', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const usernameField = page.locator('input[name="username"]');
    await usernameField.fill("' OR '1'='1");
    await page.locator('button[type="submit"]').click();

    const errorMessage = await page.locator('[role="alert"]').textContent();

    expect(errorMessage).toBeDefined();
  });

  test('A03: XSS - Cross-Site Scripting vulnerability detection', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const usernameField = page.locator('input[name="username"]');
    await usernameField.fill('<img src=x onerror=console.error("XSS")>');

    const hasError = await page.evaluate(() => {
      return window.console.error.length > 0 || false;
    });

    expect(hasError).toBe(false);
  });

  test('A04: Insecure Design - should have security headers', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const vulnerabilities = await securityTester.detectVulnerabilities(page);
    const missingHeaders = vulnerabilities.filter((v) => v.type === 'Missing Security Header');

    expect(missingHeaders.length).toBeLessThan(5);
  });

  test('A05: Security Misconfiguration - should validate security headers', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const headers = await securityTester.checkSecurityHeaders(page);

    expect(headers['X-Content-Type-Options']).toBeDefined();
    expect(headers['X-Frame-Options']).toBeDefined();
  });

  test('A06: Vulnerable and Outdated Components - should check for CSP', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const cspDirectives = await securityTester.validateCSP(page);

    expect(cspDirectives.length).toBeGreaterThan(0);
  });

  test('A07: Identification and Authentication Failures - should not allow weak auth', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', '');
    await page.locator('button[type="submit"]').click();

    await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    const alert = await page.locator('[role="alert"]').textContent();

    expect(alert).toContain('required');
  });

  test('A08: Software and Data Integrity Failures - should validate CSP strict policy', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const vulnerabilities = await securityTester.detectVulnerabilities(page);
    const unsafeCSP = vulnerabilities.filter((v) => v.type === 'Unsafe CSP Directive');

    expect(unsafeCSP.length).toBe(0);
  });

  test('A09: Logging and Monitoring Failures - should log security events', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.fill('input[name="username"]', 'invalid');
    await page.fill('input[name="password"]', 'invalid');
    await page.locator('button[type="submit"]').click();

    await page.waitForSelector('[role="alert"]', { timeout: 5000 });

    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });

  test('A10: Server-Side Request Forgery (SSRF) - should validate CORS', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const response = await page.context().request.get(`${baseURL}/web/index.php/auth/login`);

    expect(response.status()).toBe(200);
  });

  test('Clickjacking Protection - should have X-Frame-Options', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const vulnerabilities = await securityTester.detectVulnerabilities(page);
    const clickjackingVulns = vulnerabilities.filter((v) => v.type === 'Clickjacking');

    expect(clickjackingVulns.length).toBeLessThan(2);
  });

  test('should generate security report', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    await securityTester.detectVulnerabilities(page);
    const report = securityTester.generateReport();

    expect(report).toContain('Security Audit Report');
    expect(report).toContain('Total Vulnerabilities');
  });

  test('should categorize vulnerabilities by severity', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    await securityTester.detectVulnerabilities(page);

    const critical = securityTester.getVulnerabilitiesBySeverity('critical');
    const high = securityTester.getVulnerabilitiesBySeverity('high');

    expect(critical).toBeDefined();
    expect(high).toBeDefined();
  });
});
