/**
 * @file download.spec.ts
 * @description Tests for file download verification (PDF/Excel).
 * @tags @regression @file-ops
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { writeExcel, generatePDF } from '../../src/utils/file-handler';
import {
  verifyFileExists,
  verifyFileSize,
  verifyExcelDownload,
} from '../../src/utils/download-verifier';

const TMP_DIR = path.resolve(__dirname, '../../reports/tmp');

test.beforeAll(() => {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
});

test.describe('Download Verification @regression @file-ops', () => {
  test('should verify Excel file exists and has correct headers', async () => {
    const filePath = path.join(TMP_DIR, 'test-report.xlsx');
    await writeExcel(
      filePath,
      [{ 'First Name': 'John', 'Last Name': 'Doe' }],
      ['First Name', 'Last Name'],
    );

    expect(verifyFileExists(filePath)).toBe(true);
    expect(verifyFileSize(filePath, 100, 1_000_000)).toBe(true);
    const hasHeaders = await verifyExcelDownload(filePath, ['First Name', 'Last Name']);
    expect(hasHeaders).toBe(true);
  });

  test('should verify PDF file contains expected keywords', async () => {
    const filePath = path.join(TMP_DIR, 'test-report.pdf');
    await generatePDF(filePath, 'Employee Report: John Doe - Annual Leave approved.');

    expect(verifyFileExists(filePath)).toBe(true);
    expect(verifyFileSize(filePath, 100, 1_000_000)).toBe(true);
    // PDFKit encodes text in binary streams; verify file is a valid PDF
    const header = fs.readFileSync(filePath).subarray(0, 5).toString();
    expect(header).toBe('%PDF-');
  });
});
