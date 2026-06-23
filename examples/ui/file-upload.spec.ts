/**
 * @fileoverview File Upload Pattern
 *
 * Demonstrates best practices for testing file upload functionality:
 * - Single and multiple file uploads
 * - File type validation
 * - File size validation
 * - Upload progress tracking
 * - Error handling
 *
 * When to use: Any test involving file uploads
 * Common pitfalls:
 *  - Not using setInputFiles (causes security errors)
 *  - Assuming upload completes immediately
 *  - Not validating file attributes after upload
 *
 * @example
 * npm run test:ui -- file-upload.spec.ts
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('File Upload @ui', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com/upload');
  });

  test('should upload single file', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const uploadButton = page.locator('[data-testid="upload-btn"]');
    const successMessage = page.locator('.upload-success');

    // Create test file path
    const testFile = path.join(__dirname, '../fixtures/test-document.pdf');

    // Upload file
    await fileInput.setInputFiles(testFile);

    // Verify file is selected
    await expect(fileInput).toHaveValue(/test-document/);

    // Click upload
    await uploadButton.click();

    // Verify success
    await expect(successMessage).toContainText('File uploaded successfully');
    await expect(page.locator('[data-testid="file-name"]')).toContainText('test-document.pdf');
  });

  test('should upload multiple files', async ({ page }) => {
    const fileInput = page.locator('[data-testid="multi-file-input"]');
    const uploadButton = page.locator('[data-testid="upload-btn"]');

    const files = [
      path.join(__dirname, '../fixtures/file1.txt'),
      path.join(__dirname, '../fixtures/file2.txt'),
      path.join(__dirname, '../fixtures/file3.txt'),
    ];

    // Upload multiple files
    await fileInput.setInputFiles(files);

    // Verify all files selected
    const fileList = page.locator('[data-testid="file-list"]');
    await expect(fileList.locator('li')).toHaveCount(3);

    // Upload
    await uploadButton.click();

    // Verify success
    await expect(page.locator('.upload-success')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-count"]')).toContainText('3 files uploaded');
  });

  test('should reject invalid file type', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    const invalidFile = path.join(__dirname, '../fixtures/malware.exe');

    // Try to upload invalid file
    await fileInput.setInputFiles(invalidFile);

    // Verify error appears
    await expect(errorMessage).toContainText('File type not allowed');
  });

  test('should reject files exceeding size limit', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    // Large file (10MB)
    const largeFile = path.join(__dirname, '../fixtures/large-file.bin');

    await fileInput.setInputFiles(largeFile);

    // Verify error
    await expect(errorMessage).toContainText('File size exceeds 5MB limit');
  });

  test('should display upload progress', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const uploadButton = page.locator('[data-testid="upload-btn"]');

    const testFile = path.join(__dirname, '../fixtures/large-video.mp4');

    await fileInput.setInputFiles(testFile);
    await uploadButton.click();

    // Progress should start at 0
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Progress should increase
    await page.waitForLoadState('networkidle').catch(() => {
      // Ignore if load completes
    });
    const progress = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(progress || '0')).toBeGreaterThan(0);

    // Eventually complete
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', {
      timeout: 30000,
    });
  });

  test('should allow file replacement', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const fileName = page.locator('[data-testid="selected-file-name"]');

    const file1 = path.join(__dirname, '../fixtures/file1.txt');
    const file2 = path.join(__dirname, '../fixtures/file2.txt');

    // Upload first file
    await fileInput.setInputFiles(file1);
    await expect(fileName).toContainText('file1');

    // Replace with second file
    await fileInput.setInputFiles(file2);
    await expect(fileName).toContainText('file2');
  });

  test('should handle drag-and-drop upload', async ({ page }) => {
    const dropZone = page.locator('[data-testid="drop-zone"]');
    const uploadButton = page.locator('[data-testid="upload-btn"]');
    const fileName = page.locator('[data-testid="file-name"]');

    const testFile = path.join(__dirname, '../fixtures/test-document.pdf');

    // Simulate drag and drop
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(testFile);

    // Simulate drop event on drop zone
    await dropZone.dispatchEvent('drop', {
      dataTransfer: {
        files: [new File(['content'], 'test-document.pdf')],
      },
    });

    // Wait for file to appear
    await expect(fileName).toContainText('test-document.pdf');

    // Upload
    await uploadButton.click();
    await expect(page.locator('.upload-success')).toBeVisible();
  });

  test('should clear uploaded files', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const clearButton = page.locator('[data-testid="clear-btn"]');
    const fileList = page.locator('[data-testid="file-list"]');

    const testFile = path.join(__dirname, '../fixtures/test-document.pdf');

    // Upload file
    await fileInput.setInputFiles(testFile);
    await expect(fileList).not.toBeEmpty();

    // Clear
    await clearButton.click();
    await expect(fileList).toBeEmpty();
  });

  test('should retry failed uploads', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    const uploadButton = page.locator('[data-testid="upload-btn"]');
    const retryButton = page.locator('[data-testid="retry-btn"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    const testFile = path.join(__dirname, '../fixtures/test-document.pdf');

    // Simulate first attempt failure
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    page.route('**/api/upload', (route) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      route.abort('failed');
    });

    await fileInput.setInputFiles(testFile);
    await uploadButton.click();

    // Verify error
    await expect(errorMessage).toContainText('Upload failed');

    // Fix network and retry
    await page.unroute('**/api/upload');

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    retryButton.click();

    // Verify success
    await expect(page.locator('.upload-success')).toBeVisible();
  });
});
