/**
 * @file word-modifier.spec.ts
 * @description Tests for reading and modifying Word (.docx) files.
 * @tags @regression @file-ops
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { modifyWord } from '../../src/utils/file-handler';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const TMP_DIR = path.resolve(__dirname, '../../reports/tmp');

async function createSampleDocx(filePath: string, content: string): Promise<void> {
  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun(content)] })] }],
  });
  fs.writeFileSync(filePath, await Packer.toBuffer(doc));
}

test.beforeAll(() => {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
});

test.describe('Word Modifier @regression @file-ops', () => {
  test('should modify Word document and save updated file', async () => {
    const filePath = path.join(TMP_DIR, 'template.docx');
    await createSampleDocx(filePath, 'Hello {{NAME}}, your department is {{DEPT}}.');

    const outPath = await modifyWord(filePath, { '{{NAME}}': 'Alice', '{{DEPT}}': 'QA' });
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
