import { Page } from '@playwright/test';

export interface SecurityVulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  payload?: string;
  remediation: string;
}

export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
}

export interface CSPDirective {
  directive: string;
  sources: string[];
  vulnerable?: boolean;
}

export class SecurityTester {
  private vulnerabilities: SecurityVulnerability[] = [];

  private xssPayloads = [
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>',
  ];

  private sqlInjectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users--",
    "1' UNION SELECT NULL--",
    "admin' --",
    "1' AND '1'='1",
  ];

  async detectVulnerabilities(page: Page): Promise<SecurityVulnerability[]> {
    this.vulnerabilities = [];

    await this.checkSecurityHeaders(page);
    await this.validateCSP(page);
    await this.testXSS(page);
    await this.testClickjacking(page);
    await this.testMissingHTTPS(page);

    return this.vulnerabilities;
  }

  async checkSecurityHeaders(page: Page): Promise<SecurityHeaders> {
    const response = await page.goto(page.url());

    if (!response) {
      throw new Error('Failed to get response headers');
    }

    const headers = response.headers();
    const securityHeaders: SecurityHeaders = {};

    const requiredHeaders: (keyof SecurityHeaders)[] = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Strict-Transport-Security',
      'Referrer-Policy',
    ];

    requiredHeaders.forEach((header) => {
      const value = headers[header.toLowerCase()];
      if (value) {
        securityHeaders[header] = value;
      } else {
        this.vulnerabilities.push({
          type: 'Missing Security Header',
          severity: 'high',
          description: `Missing ${header} header`,
          remediation: `Add ${header} header to server responses`,
        });
      }
    });

    if (headers['x-content-type-options'] !== 'nosniff') {
      this.vulnerabilities.push({
        type: 'Weak X-Content-Type-Options',
        severity: 'medium',
        description: 'X-Content-Type-Options should be set to "nosniff"',
        remediation: 'Set X-Content-Type-Options: nosniff',
      });
    }

    if (
      headers['x-frame-options'] &&
      !['DENY', 'SAMEORIGIN'].includes(headers['x-frame-options'])
    ) {
      this.vulnerabilities.push({
        type: 'Weak X-Frame-Options',
        severity: 'medium',
        description: `X-Frame-Options set to weak value: ${headers['x-frame-options']}`,
        remediation: 'Set X-Frame-Options to DENY or SAMEORIGIN',
      });
    }

    return securityHeaders;
  }

  async validateCSP(page: Page): Promise<CSPDirective[]> {
    const response = await page.goto(page.url());

    if (!response) {
      throw new Error('Failed to get CSP headers');
    }

    const cspHeader = response.headers()['content-security-policy'];

    if (!cspHeader) {
      this.vulnerabilities.push({
        type: 'Missing CSP',
        severity: 'high',
        description: 'No Content-Security-Policy header found',
        remediation: 'Implement a strict CSP policy',
      });
      return [];
    }

    const directives = this.parseCSP(cspHeader);

    directives.forEach((directive) => {
      if (directive.directive === 'script-src' || directive.directive === 'style-src') {
        if (directive.sources.includes("'unsafe-inline'")) {
          directive.vulnerable = true;
          this.vulnerabilities.push({
            type: 'Unsafe CSP Directive',
            severity: 'high',
            description: `${directive.directive} contains 'unsafe-inline'`,
            remediation: `Remove 'unsafe-inline' from ${directive.directive} and use nonces or hashes`,
          });
        }

        if (directive.sources.includes('*')) {
          directive.vulnerable = true;
          this.vulnerabilities.push({
            type: 'Overly Permissive CSP',
            severity: 'medium',
            description: `${directive.directive} allows from any source (*)`,
            remediation: `Restrict ${directive.directive} to specific origins`,
          });
        }
      }
    });

    return directives;
  }

  async testXSS(page: Page): Promise<void> {
    const inputs = await page.locator('input, textarea, [contenteditable]').all();

    for (const input of inputs) {
      const isVisible = await input.isVisible();
      if (!isVisible) continue;

      const inputType = await input.getAttribute('type');
      if (inputType === 'hidden' || inputType === 'file') continue;

      for (const payload of this.xssPayloads) {
        try {
          await input.fill(payload);
          await page.keyboard.press('Enter');

          const alertPresence = await page.evaluate(() => {
            return new Promise((resolve) => {
              const handler = () => {
                resolve(true);
              };
              window.alert = handler;
              setTimeout(() => resolve(false), 100);
            });
          });

          if (alertPresence) {
            this.vulnerabilities.push({
              type: 'Stored XSS',
              severity: 'critical',
              description: 'Application appears vulnerable to XSS injection',
              payload,
              remediation: 'Sanitize and escape all user input before rendering',
            });
            break;
          }
        } catch {
          // Input may not accept this payload, continue testing
        }
      }
    }
  }

  async testClickjacking(page: Page): Promise<void> {
    const response = await page.goto(page.url());

    if (!response) return;

    const xFrameOptions = response.headers()['x-frame-options'];

    if (!xFrameOptions || (xFrameOptions !== 'DENY' && xFrameOptions !== 'SAMEORIGIN')) {
      this.vulnerabilities.push({
        type: 'Clickjacking',
        severity: 'high',
        description: 'Page may be vulnerable to clickjacking attacks',
        remediation: 'Set X-Frame-Options to DENY or SAMEORIGIN',
      });
    }
  }

  async testMissingHTTPS(page: Page): Promise<void> {
    const url = page.url();

    if (!url.startsWith('https://')) {
      this.vulnerabilities.push({
        type: 'Missing HTTPS',
        severity: 'critical',
        description: 'Application is not served over HTTPS',
        remediation: 'Enable HTTPS/TLS for all pages',
      });
    }
  }

  private parseCSP(cspHeader: string): CSPDirective[] {
    const directives: CSPDirective[] = [];
    const parts = cspHeader.split(';');

    parts.forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      const [directive, ...sources] = trimmed.split(/\s+/);
      directives.push({
        directive,
        sources,
      });
    });

    return directives;
  }

  getVulnerabilities(): SecurityVulnerability[] {
    return this.vulnerabilities;
  }

  getVulnerabilitiesBySeverity(
    severity: SecurityVulnerability['severity'],
  ): SecurityVulnerability[] {
    return this.vulnerabilities.filter((v) => v.severity === severity);
  }

  generateReport(): string {
    const report: string[] = [];
    report.push('=== Security Audit Report ===\n');

    const bySeverity = {
      critical: this.getVulnerabilitiesBySeverity('critical'),
      high: this.getVulnerabilitiesBySeverity('high'),
      medium: this.getVulnerabilitiesBySeverity('medium'),
      low: this.getVulnerabilitiesBySeverity('low'),
    };

    Object.entries(bySeverity).forEach(([severity, vulns]) => {
      if (vulns.length > 0) {
        report.push(`\n[${severity.toUpperCase()}] (${vulns.length})`);
        vulns.forEach((vuln) => {
          report.push(`  • ${vuln.description}`);
          report.push(`    Remediation: ${vuln.remediation}`);
        });
      }
    });

    const totalVulns = this.vulnerabilities.length;
    report.push(`\n\nTotal Vulnerabilities: ${totalVulns}`);

    return report.join('\n');
  }
}
