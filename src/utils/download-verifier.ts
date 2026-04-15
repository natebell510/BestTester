import * as fs from 'fs';
import * as crypto from 'crypto';
import { Page, Download } from '@playwright/test';
import { readExcel } from './excel-utils';
import { readPDF } from './file-handler';

export interface DownloadResult {
  path: string;
  suggestedFilename: string;
  download: Download;
}

/**
 * Download verification utilities for Playwright tests.
 */

export async function waitForDownload(
  page: Page,
  triggerFn: () => Promise<void>,
): Promise<DownloadResult> {
  const [download] = await Promise.all([page.waitForEvent('download'), triggerFn()]);
  const filePath = await download.path();
  if (!filePath) throw new Error('Download path is null');
  return { path: filePath, suggestedFilename: download.suggestedFilename(), download };
}

export function verifyFileExists(downloadPath: string): boolean {
  return fs.existsSync(downloadPath);
}

export function verifyFileSize(downloadPath: string, minBytes: number, maxBytes: number): boolean {
  const { size } = fs.statSync(downloadPath);
  return size >= minBytes && size <= maxBytes;
}

export function verifyFileMD5(downloadPath: string, expectedHash: string): boolean {
  const buffer = fs.readFileSync(downloadPath);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  return hash === expectedHash;
}

export { downloadAndVerifyExcel, verifyExcelHeaders, verifyExcelRowCount } from './excel-utils';

export async function verifyExcelDownload(
  downloadPath: string,
  expectedHeaders: string[],
): Promise<boolean> {
  const rows = await readExcel(downloadPath);
  if (rows.length === 0) return false;
  const actualHeaders = Object.keys(rows[0]);
  return expectedHeaders.every((h) => actualHeaders.includes(h));
}

export async function verifyPDFDownload(
  downloadPath: string,
  expectedKeywords: string[],
): Promise<boolean> {
  const text = await readPDF(downloadPath);
  return expectedKeywords.every((kw) => text.includes(kw));
}
