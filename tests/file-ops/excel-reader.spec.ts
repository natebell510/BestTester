/**
 * @file excel-reader.spec.ts
 * @description Tests for reading and parsing Excel files.
 * @tags @regression @file-ops
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { writeExcel, readExcel } from '../../src/utils/file-handler';

const TMP_DIR = path.resolve(__dirname, '../../reports/tmp');

test.beforeAll(() => {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
});

test.describe('Excel Reader @regression @file-ops', () => {
  test('should write and read back Excel data correctly', async () => {
    const filePath = path.join(TMP_DIR, 'employees.xlsx');
    const data = [
      { Name: 'Alice Smith', Department: 'Engineering' },
      { Name: 'Bob Jones', Department: 'QA' },
    ];
    await writeExcel(filePath, data, ['Name', 'Department']);

    const rows = await readExcel(filePath);
    expect(rows.length).toBe(2);
    expect(rows[0]?.['Name']).toBe('Alice Smith');
    expect(rows[1]?.['Department']).toBe('QA');
  });

  test('should return empty array for empty sheet', async () => {
    const filePath = path.join(TMP_DIR, 'empty.xlsx');
    await writeExcel(filePath, [], ['Col1', 'Col2']);
    const rows = await readExcel(filePath);
    expect(rows.length).toBe(0);
  });
});
