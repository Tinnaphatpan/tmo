import * as ExcelJS from 'exceljs';
import { MentorReport } from './get-mentor-report.use-case';

const HEADER = ['รหัส', 'ชื่อ', 'ข้อ 1', 'ข้อ 2', 'ข้อ 3', 'ข้อ 4', 'ข้อ 5', 'รวม'];

/** SPEC §4.4 — one sheet named after the school (Excel's 31-char sheet name limit). */
export async function buildMentorReportWorkbook(report: MentorReport): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheetName = (report.schoolName || 'Report').slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(HEADER);
  sheet.getRow(1).font = { bold: true };

  for (const row of report.rows) {
    sheet.addRow([
      row.studentCode,
      row.name,
      ...row.scores.map((v) => (v === null ? '' : v)),
      row.total,
    ]);
  }

  const totalRow = sheet.addRow(['', 'รวมทั้งโรงเรียน', '', '', '', '', '', report.grandTotal]);
  totalRow.font = { bold: true };

  sheet.columns.forEach((col) => {
    col.width = 14;
  });

  return workbook.xlsx.writeBuffer();
}
