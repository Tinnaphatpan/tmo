import PDFDocument from 'pdfkit';
import { Score, Student } from '../../domain/entities';

// pdfkit's base-14 fonts have no Thai glyphs — vendor an OFL-1.1-licensed
// (freely embeddable/redistributable) Noto Sans Thai via npm rather than
// copying a Windows system font, which would carry an unclear/restrictive
// embedding license for a document this app generates and hands out.
const THAI_FONT_REGULAR = require.resolve(
  '@expo-google-fonts/noto-sans-thai/400Regular/NotoSansThai_400Regular.ttf',
);
const THAI_FONT_BOLD = require.resolve(
  '@expo-google-fonts/noto-sans-thai/700Bold/NotoSansThai_700Bold.ttf',
);

export interface ScoreSheetPerson {
  displayName: string;
  /** Raw image bytes — read via FileStorage by the caller, never a path
   * pdfkit resolves itself, so this stays unit-testable with zero disk I/O. */
  signatureImage: Buffer;
}

export interface ScoreSheetInput {
  schoolName: string;
  schoolCode: string | null;
  problemNumber: number;
  students: Student[];
  scores: Score[];
  submitter: ScoreSheetPerson;
  approver: ScoreSheetPerson;
  approvedAt: Date;
}

function formatThaiDateTime(date: Date): string {
  return date.toLocaleString('th-TH-u-ca-buddhist', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  });
}

/**
 * Score approval PDF (SPEC-driven refactor's e-signature workflow): one
 * school + one problem number's finalized score sheet, stamped with both the
 * submitting judge's and the approving team leader's signatures and a
 * server timestamp. Mirrors team-leader-export.builder.ts's pure-function
 * shape — no DB access here, all data passed in by the caller.
 */
export function buildScoreSheetPdf(input: ScoreSheetInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Thai', THAI_FONT_REGULAR);
    doc.registerFont('Thai-Bold', THAI_FONT_BOLD);

    doc.font('Thai-Bold').fontSize(18).text('ใบสรุปคะแนนที่ได้รับการอนุมัติ', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .font('Thai')
      .fontSize(12)
      .text(`ศูนย์สอบ: ${input.schoolName}${input.schoolCode ? ` (${input.schoolCode})` : ''}`)
      .text(`ข้อที่: ${input.problemNumber}`)
      .text(`เวลาอนุมัติ (เซิร์ฟเวอร์): ${formatThaiDateTime(input.approvedAt)}`);
    doc.moveDown();

    const scoreByStudentId = new Map(input.scores.map((s) => [s.studentId, s.value]));
    const roster = [...input.students].sort((a, b) => a.seqNo - b.seqNo);

    const tableTop = doc.y;
    const col = { seq: 50, code: 90, name: 170, value: 460 };
    doc
      .font('Thai-Bold')
      .fontSize(11)
      .text('ลำดับ', col.seq, tableTop)
      .text('รหัส', col.code, tableTop)
      .text('ชื่อ-นามสกุล', col.name, tableTop)
      .text('คะแนน', col.value, tableTop);
    doc
      .moveTo(50, tableTop + 18)
      .lineTo(545, tableTop + 18)
      .stroke();

    let y = tableTop + 26;
    doc.font('Thai').fontSize(11);
    for (const student of roster) {
      const value = scoreByStudentId.get(student.id);
      doc
        .text(String(student.seqNo), col.seq, y)
        .text(student.studentCode, col.code, y)
        .text(student.name, col.name, y, { width: 280 })
        .text(value === undefined ? '-' : value.toFixed(2), col.value, y);
      y += 22;
    }

    y += 30;
    const signatureWidth = 120;
    doc.font('Thai-Bold').fontSize(11);
    doc.text('กรรมการผู้ตรวจ', col.seq, y);
    doc.text('อาจารย์ผู้ควบคุมทีม', 320, y);
    y += 18;
    doc.image(input.submitter.signatureImage, col.seq, y, { width: signatureWidth });
    doc.image(input.approver.signatureImage, 320, y, { width: signatureWidth });
    y += signatureWidth * 0.5 + 10;
    doc
      .font('Thai')
      .text(input.submitter.displayName, col.seq, y)
      .text(input.approver.displayName, 320, y);

    doc.end();
  });
}
