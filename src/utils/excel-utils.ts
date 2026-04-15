import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { Page } from '@playwright/test';
import { waitForDownload, DownloadResult } from './download-verifier';

/**
 * @file excel-utils.ts
 * @description Excel read, write, and download-verification utilities using ExcelJS.
 */

export type RowData = Record<string, unknown>;

export interface ExcelReadOptions {
  sheet?: string | number;
  headerRow?: number;
  startRow?: number;
  columns?: string[];
}

export interface ExcelWriteOptions {
  sheetName?: string;
  headers?: string[];
  autoWidth?: boolean;
}

// ── Read ────────────────────────────────────────────────────

export async function readExcel(
  filePath: string,
  options: ExcelReadOptions = {},
): Promise<RowData[]> {
  const { sheet, headerRow = 1, startRow, columns } = options;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = sheet ? wb.getWorksheet(sheet) : wb.worksheets[0];
  if (!ws) throw new Error(`Worksheet not found: ${String(sheet ?? 0)}`);

  const headers: string[] = [];
  ws.getRow(headerRow).eachCell((cell, col) => {
    headers[col - 1] = String(cell.value ?? '');
  });

  const dataStart = startRow ?? headerRow + 1;
  const rows: RowData[] = [];

  ws.eachRow((row, idx) => {
    if (idx < dataStart) return;
    const record: RowData = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (key && (!columns || columns.includes(key))) {
        record[key] = cell.value;
      }
    });
    if (Object.keys(record).length) rows.push(record);
  });

  return rows;
}

export async function getSheetNames(filePath: string): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  return wb.worksheets.map((ws) => ws.name);
}

export async function getCellValue(
  filePath: string,
  cell: string,
  sheet?: string | number,
): Promise<unknown> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = sheet ? wb.getWorksheet(sheet) : wb.worksheets[0];
  if (!ws) throw new Error(`Worksheet not found`);
  return ws.getCell(cell).value;
}

export async function searchExcel(
  filePath: string,
  keyword: string,
  sheet?: string | number,
): Promise<{ sheet: string; cell: string; value: unknown }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheets = sheet ? [wb.getWorksheet(sheet)!] : wb.worksheets;
  const results: { sheet: string; cell: string; value: unknown }[] = [];

  for (const ws of sheets) {
    ws.eachRow((row, rowNum) => {
      row.eachCell((cell, colNum) => {
        if (String(cell.value ?? '').includes(keyword)) {
          const colLetter = String.fromCharCode(64 + colNum);
          results.push({ sheet: ws.name, cell: `${colLetter}${rowNum}`, value: cell.value });
        }
      });
    });
  }
  return results;
}

// ── Write ───────────────────────────────────────────────────

export async function writeExcel(
  filePath: string,
  data: RowData[],
  options: ExcelWriteOptions = {},
): Promise<void> {
  const { sheetName = 'Sheet1', headers, autoWidth = true } = options;
  const keys = headers ?? (data.length ? Object.keys(data[0]) : []);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.addRow(keys);
  for (const row of data) {
    ws.addRow(keys.map((k) => row[k] ?? ''));
  }

  if (autoWidth) {
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        max = Math.max(max, String(cell.value ?? '').length + 2);
      });
      col.width = max;
    });
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await wb.xlsx.writeFile(filePath);
}

export async function appendToExcel(
  filePath: string,
  data: RowData[],
  sheet?: string | number,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = sheet ? wb.getWorksheet(sheet) : wb.worksheets[0];
  if (!ws) throw new Error('Worksheet not found');

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    headers[col - 1] = String(cell.value ?? '');
  });

  for (const row of data) {
    ws.addRow(headers.map((h) => row[h] ?? ''));
  }
  await wb.xlsx.writeFile(filePath);
}

// ── Verify Download ─────────────────────────────────────────

export async function downloadAndVerifyExcel(
  page: Page,
  triggerFn: () => Promise<void>,
  expectedHeaders: string[],
): Promise<{ result: DownloadResult; rows: RowData[] }> {
  const result = await waitForDownload(page, triggerFn);
  const rows = await readExcel(result.path);

  if (!rows.length) throw new Error('Downloaded Excel file has no data rows');

  const actualHeaders = Object.keys(rows[0]);
  const missing = expectedHeaders.filter((h) => !actualHeaders.includes(h));
  if (missing.length) {
    throw new Error(`Missing expected headers: ${missing.join(', ')}`);
  }

  return { result, rows };
}

export async function verifyExcelHeaders(filePath: string, expected: string[]): Promise<boolean> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) return false;

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell) => {
    headers.push(String(cell.value ?? ''));
  });
  return expected.every((h) => headers.includes(h));
}

export async function verifyExcelRowCount(
  filePath: string,
  min: number,
  max?: number,
): Promise<boolean> {
  const rows = await readExcel(filePath);
  return rows.length >= min && (max === undefined || rows.length <= max);
}
