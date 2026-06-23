# Security Policy

## Reporting a Vulnerability

BestTester takes security seriously. If you discover a security vulnerability, please email security@besttester.dev with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if available)

**Please do not open a public GitHub issue for security vulnerabilities.** We will respond within 24 hours and work with you to verify and address the issue.

## Security Scanning

### Automated Security Checks

Every commit and pull request is scanned for:

- **Secrets Scanning** — via Gitleaks, detects AWS keys, API tokens, private keys, etc.
- **Dependency Vulnerabilities** — via `npm audit`, blocks on high/critical issues
- **License Compliance** — ensures no GPL/incompatible licenses in production dependencies
- **OWASP Coverage** — security test suite verifies protection against Top 10 vulnerabilities

### Running Local Security Checks

```bash
# Run the unified security audit
npm run security:audit

# Or run checks individually:
npm audit --audit-level=high
npx gitleaks detect --verbose
npx license-checker --production
```

### Pre-Commit Security Hooks

Gitleaks runs automatically before every commit to prevent secrets from entering the repository:

```bash
git add .
git commit -m "feat: my feature"  # Pre-commit hook blocks if secrets detected
```

## Security Vulnerabilities in Dependencies

### How We Handle It

1. **Detection** — `npm audit` runs in CI on every push
2. **Blocking** — PRs fail if high/critical vulnerabilities exist
3. **Remediation** — We run `npm audit fix` and update lockfiles
4. **Transparency** — Fixed vulnerabilities appear in commit history

### Critical Vulnerabilities

If a critical vulnerability affects BestTester:

1. We immediately create a security patch release
2. Existing dependents are notified via GitHub Security Advisory
3. The fix is backported to supported versions

## Best Practices

### For Contributors

- **Never commit secrets** — API keys, tokens, credentials, private keys
- **Use `.env` files** — Store sensitive data in `.env`, `.env.local`, `.env.*.local`
- **Review before pushing** — Check your commits don't contain secrets
- **Report issues privately** — Don't disclose vulnerabilities in public discussions

### For Users

- **Keep BestTester updated** — Regularly run `npm update` to get security patches
- **Monitor dependencies** — Use `npm audit` regularly
- **Report issues responsibly** — Follow this security policy for disclosures

## Security Headers

BestTester test suites verify security headers:

- `Content-Security-Policy` — prevents XSS
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Strict-Transport-Security` — enforces HTTPS
- `Referrer-Policy: strict-origin-when-cross-origin`

## OWASP Top 10 Coverage

All tests include coverage for OWASP Top 10 2021:

- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Identification and Authentication Failures
- A08: Software and Data Integrity Failures
- A09: Logging and Monitoring Failures
- A10: Server-Side Request Forgery

Run security tests:

```bash
npm run test:security
```

## Responsible Disclosure Timeline

After discovering a vulnerability:

1. **Day 1** — We acknowledge receipt and begin investigation
2. **Day 3-7** — We confirm the vulnerability and develop a fix
3. **Day 7-14** — We release a security patch
4. **Day 14** — We publicly disclose (if not already public)

## Questions?

For security-related questions, contact: security@besttester.dev

---

**Last Updated:** 2025-03-05
**Version:** 1.0
