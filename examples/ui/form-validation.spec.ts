/**
 * @fileoverview Form Validation Pattern
 *
 * Demonstrates best practices for testing form validation including:
 * - Real-time field validation feedback
 * - Submission with invalid data
 * - Error message assertion
 * - Form state management
 *
 * When to use: Any test involving form input validation
 * Common pitfalls:
 *  - Not waiting for validation messages to appear
 *  - Testing validation logic instead of UI behavior
 *  - Not clearing fields between tests
 *
 * @example
 * npm run test:ui -- form-validation.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Form Validation @ui @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the form page
    await page.goto('https://example.com/contact-form');
  });

  test('should validate email format in real-time', async ({ page }) => {
    const emailField = page.locator('[data-testid="email"]');
    const errorMessage = page.locator('[data-testid="email-error"]');

    // Enter invalid email
    await emailField.fill('invalid-email');
    await emailField.blur();

    // Verify error appears
    await expect(errorMessage).toContainText('Invalid email format');
    await expect(errorMessage).toBeVisible();
  });

  test('should clear error when field becomes valid', async ({ page }) => {
    const emailField = page.locator('[data-testid="email"]');
    const errorMessage = page.locator('[data-testid="email-error"]');

    // Enter invalid, then valid email
    await emailField.fill('invalid');
    await emailField.blur();
    await expect(errorMessage).toBeVisible();

    await emailField.clear();
    await emailField.fill('valid@example.com');
    await emailField.blur();

    // Error should disappear
    await expect(errorMessage).not.toBeVisible();
  });

  test('should require password min length', async ({ page }) => {
    const passwordField = page.locator('[data-testid="password"]');
    const errorMessage = page.locator('[data-testid="password-error"]');

    await passwordField.fill('short');
    await passwordField.blur();

    await expect(errorMessage).toContainText('at least 8 characters');
  });

  test('should prevent form submission with validation errors', async ({ page }) => {
    const form = page.locator('form');
    const submitButton = page.locator('[data-testid="submit"]');

    // Fill with invalid data
    await page.locator('[data-testid="email"]').fill('invalid');
    await page.locator('[data-testid="password"]').fill('short');

    // Try to submit
    await submitButton.click();

    // Form should still be visible (not submitted)
    await expect(form).toBeVisible();

    // Errors should be displayed
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should allow submission with valid data', async ({ page }) => {
    const form = page.locator('form');

    // Fill with valid data
    await page.locator('[data-testid="email"]').fill('user@example.com');
    await page.locator('[data-testid="password"]').fill('SecurePass123');
    await page.locator('[data-testid="name"]').fill('John Doe');

    // Submit form
    await page.locator('[data-testid="submit"]').click();

    // Verify success state
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(form).not.toBeVisible();
  });

  test('should display multiple field errors at once', async ({ page }) => {
    const submitButton = page.locator('[data-testid="submit"]');

    // Leave all required fields empty
    await submitButton.click();

    // All error messages should appear
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
  });

  test('should validate custom pattern (phone number)', async ({ page }) => {
    const phoneField = page.locator('[data-testid="phone"]');
    const errorMessage = page.locator('[data-testid="phone-error"]');

    // Enter invalid phone format
    await phoneField.fill('123');
    await phoneField.blur();

    await expect(errorMessage).toContainText('Invalid phone format');
  });

  test('should handle async validation (username availability)', async ({ page }) => {
    const usernameField = page.locator('[data-testid="username"]');
    const errorMessage = page.locator('[data-testid="username-error"]');

    // Enter taken username
    await usernameField.fill('admin');
    await usernameField.blur();

    // Wait for async validation
    await expect(errorMessage).toContainText('Username already taken', {
      timeout: 5000,
    });
  });

  test('should preserve field values on validation error', async ({ page }) => {
    const emailField = page.locator('[data-testid="email"]');
    const nameField = page.locator('[data-testid="name"]');

    // Fill fields
    await emailField.fill('invalid');
    await nameField.fill('John Doe');

    // Trigger validation
    await page.locator('[data-testid="submit"]').click();

    // Values should be preserved
    expect(await emailField.inputValue()).toBe('invalid');
    expect(await nameField.inputValue()).toBe('John Doe');
  });
});
