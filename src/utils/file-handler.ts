import * as fs from 'fs';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * File handler utilities for Word (.docx), Excel (.xlsx), and PDF files.
 */

export async function readWord(filePath: string): Promise<string> {
  // Extract raw text from docx by reading XML content
  const { default: JSZip } = (await import('jszip' as string)) as {
    default: typeof import('jszip');
  };
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function modifyWord(
  filePath: string,
  replacements: Record<string, string>,
): Promise<string> {
  const content = await readWord(filePath);
  let modified = content;
  for (const [key, value] of Object.entries(replacements)) {
    modified = modified.replaceAll(key, value);
  }
  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun(modified)] })] }],
  });
  const outPath = filePath.replace('.docx', '-modified.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

export async function readExcel(
  filePath: string,
  sheet?: string | number,
): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = sheet ? workbook.getWorksheet(sheet) : workbook.worksheets[0];
  if (!worksheet) throw new Error(`Worksheet not found: ${String(sheet)}`);

  const rows: Record<string, unknown>[] = [];
  const headers: string[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => headers.push(String(cell.value ?? '')));
    } else {
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      rows.push(rowData);
    }
  });
  return rows;
}

export async function writeExcel(
  filePath: string,
  data: Record<string, unknown>[],
  headers: string[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.addRow(headers);
  for (const row of data) {
    worksheet.addRow(headers.map((h) => row[h] ?? ''));
  }
  await workbook.xlsx.writeFile(filePath);
}

export async function readPDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  // Dynamic import to handle pdf-parse's non-standard export
  const mod = await import('pdf-parse');
  const parse = typeof mod.default === 'function' ? mod.default : mod;
  const result = await parse(buffer);
  return result.text;
}

export async function verifyPDFContains(filePath: string, expectedText: string): Promise<boolean> {
  const text = await readPDF(filePath);
  return text.includes(expectedText);
}

export function generatePDF(outputPath: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);
    doc.text(content);
    doc.end();
  });
}
