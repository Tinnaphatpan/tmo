import * as ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';

/** Raw rows keyed by the file's own header text (not yet normalized). */
export async function parseStudentImportFile(
  buffer: Buffer,
  filename: string,
): Promise<Record<string, string>[]> {
  const isXlsx = filename.toLowerCase().endsWith('.xlsx');
  return isXlsx ? parseXlsx(buffer) : parseCsv(buffer);
}

function parseCsv(buffer: Buffer): Record<string, string>[] {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
}

async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;
    const record: Record<string, string> = {};
    let hasValue = false;
    for (let col = 1; col < headers.length; col++) {
      const header = headers[col];
      if (!header) continue;
      const value = row.getCell(col).value;
      const text = value === null || value === undefined ? '' : String(value).trim();
      record[header] = text;
      if (text !== '') hasValue = true;
    }
    if (hasValue) rows.push(record);
  }
  return rows;
}
