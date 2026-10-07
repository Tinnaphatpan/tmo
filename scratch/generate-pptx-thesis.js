const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches

// Colors (KMUTNB Official Identity & Clean Modern Theme)
const COLOR_PRIMARY = 'C8102E';   // KMUTNB Crimson Red
const COLOR_DARK = '0F172A';      // Dark Slate (Header & accents)
const COLOR_BG_LIGHT = 'F8FAFC';  // Light Slate BG
const COLOR_CARD = 'FFFFFF';      // Pure White Card
const COLOR_TEXT_MUTED = '64748B';// Muted Grey
const COLOR_TEXT_DARK = '1E293B'; // Dark Slate Text
const COLOR_WHITE = 'FFFFFF';
const COLOR_BORDER = 'E2E8F0';
const COLOR_GREEN = '15803D';
const COLOR_BLUE = '1D4ED8';
const COLOR_ACCENT = 'B45309';

// Image paths from extracted thesis assets
const assets = {
  archDiagram: 'c:/tmo/extracted_thesis_assets/obj_221_661x598.png',
  erDiagram: 'c:/tmo/extracted_thesis_assets/obj_407_421x787.png',
  swotDiagram: 'c:/tmo/extracted_thesis_assets/obj_296_1376x768.jpg',
  structureChart: 'c:/tmo/extracted_thesis_assets/obj_416_1256x792.png',
  queueBoard: 'c:/tmo/extracted_thesis_assets/obj_320_612x822.png',
  queueAdmin: 'c:/tmo/extracted_thesis_assets/obj_309_1300x587.jpg',
  committeeGrading: 'c:/tmo/extracted_thesis_assets/obj_347_1300x618.jpg',
  approvalSign: 'c:/tmo/extracted_thesis_assets/obj_349_1300x588.jpg',
  userPermissions: 'c:/tmo/extracted_thesis_assets/obj_377_1300x615.jpg',
  otpLogin: 'c:/tmo/extracted_thesis_assets/obj_306_1301x621.jpg',
  scoreExport: 'c:/tmo/extracted_thesis_assets/obj_361_1300x589.jpg'
};

// Helper: standard slide header
function addHeader(slide, badgeText, titleText, subtitleText = '') {
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 0.28, w: 2.6, h: 0.28,
    fill: { color: COLOR_DARK }, line: { color: COLOR_DARK },
    rectRadius: 0.06
  });
  slide.addText(badgeText, {
    x: 0.6, y: 0.28, w: 2.6, h: 0.28,
    fontSize: 9, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText(titleText, {
    x: 0.6, y: 0.60, w: 8.8, h: 0.45,
    fontSize: 18, bold: true, color: COLOR_TEXT_DARK, valign: 'middle'
  });

  if (subtitleText) {
    slide.addText(subtitleText, {
      x: 0.6, y: 1.02, w: 8.8, h: 0.25,
      fontSize: 10, color: COLOR_TEXT_MUTED, valign: 'middle'
    });
  }
}

// =========================================================================
// SLIDE 1: INTRO (หัวข้อและคณะผู้จัดทำ)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.7, w: 3.4, h: 0.35,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("โครงงานพิเศษปริญญานิพนธ์ ปีการศึกษา 2569", {
    x: 0.8, y: 0.7, w: 3.4, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ\nผ่านเว็บแอปพลิเคชัน (TMO Management System)", {
    x: 0.8, y: 1.25, w: 8.4, h: 1.2,
    fontSize: 25, bold: true, color: COLOR_WHITE, valign: 'middle'
  });

  slide.addText("Thailand Mathematical Olympiad (TMO) Management System Using Web Application", {
    x: 0.8, y: 2.5, w: 8.4, h: 0.35,
    fontSize: 12.5, color: '94A3B8', valign: 'top'
  });

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 3.0, w: 8.4, h: 0.02,
    fill: { color: '334155' }, line: { color: '334155' }
  });

  slide.addText("คณะผู้จัดทำ:\n• นาย ทินณภัทร ปั้นคง (รหัสนักศึกษา 64-040626-3603-4)\n• นาย วสุศิลป์ ลี้นิธิเจริญกิจ (รหัสนักศึกษา 64-040626-3627-1)\n• นางสาว อิสริยาภรณ์ มงคลิก (รหัสนักศึกษา 64-040626-3635-2)", {
    x: 0.8, y: 3.2, w: 4.5, h: 1.6,
    fontSize: 10.5, color: COLOR_WHITE, lineSpacing: 18
  });

  slide.addText("อาจารย์ที่ปรึกษาโครงงาน:\n• อาจารย์ ดร.ชัยยศ กำธรเจริญ\n\nสาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\nคณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", {
    x: 5.4, y: 3.2, w: 4.0, h: 1.6,
    fontSize: 10, color: 'CBD5E1', lineSpacing: 17
  });

  slide.addNotes("กราบเรียนท่านคณะกรรมการทุกท่าน วันนี้กลุ่มของพวกเราขอรายงานความก้าวหน้าโครงงานพิเศษ 'ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติผ่านเว็บแอปพลิเคชัน' ซึ่งพัฒนาขึ้นเพื่อแก้ปัญหาและยกระดับกระบวนการตรวจข้อสอบและจัดการคิวของ TMO สู่ระบบดิจิทัลตามมาตรฐานและข้อกฎหมายครับ");
}

// =========================================================================
// SLIDE 2: PROBLEM & SWOT (ปัญหาเดิมที่พบ และการวิเคราะห์ SWOT)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "1. PROBLEM & SWOT", "ปัญหาของกระบวนการตรวจเดิม และการวิเคราะห์ SWOT", "วิเคราะห์ปัญหาจากกระบวนการตรวจข้อสอบกระดาษ 16 ศูนย์ x 5 ข้อสอบ และการประเมินปัจจัยโครงการ");

  const problems = [
    { title: "ความผิดพลาดจากการกรอกคะแนน (Human Error)", desc: "การรวมคะแนนแบบกระดาษและการคีย์ซ้ำเสี่ยงต่อตัวเลขคลาดเคลื่อน ขาดระบบ Double-check อัตโนมัติ" },
    { title: "คอขวดการหมุนเวียนคิว (16 ศูนย์ x 5 ข้อ)", desc: "กรรมการ 5 ท่านต้องตรวจข้อสอบของนักเรียนจาก 16 ศูนย์ทั่วประเทศ เกิดความสับสนของลำดับคิวและเวลาว่าง" },
    { title: "ขาดการบันทึกประวัติการแก้ไข (Audit Trail)", desc: "เมื่อมีการแก้ไขคะแนน ไม่มีระบบเก็บบันทึกว่าใครแก้ เมื่อใด และด้วยเหตุผลใด ทำให้ตรวจสอบย้อนหลังได้ยาก" }
  ];

  problems.forEach((p, idx) => {
    const y = 1.35 + (idx * 1.15);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: y, w: 4.2, h: 1.05,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0.6, y: y, w: 0.08, h: 1.05,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
    });
    slide.addText(p.title, {
      x: 0.8, y: y + 0.08, w: 3.9, h: 0.35,
      fontSize: 10.5, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(p.desc, {
      x: 0.8, y: y + 0.42, w: 3.9, h: 0.55,
      fontSize: 9, color: COLOR_TEXT_MUTED
    });
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.0, y: 1.35, w: 4.4, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("แผนภาพ SWOT Analysis จากเล่มวิจัย (Planning Phase)", {
    x: 5.2, y: 1.45, w: 4.0, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.swotDiagram,
    x: 5.15, y: 1.8, w: 4.1, h: 2.9,
    sizing: { type: 'contain' }
  });

  slide.addNotes("ในกระบวนการแข่งขันเดิม มีปัญหาสำคัญ 3 ประการคือความผิดพลาดในการรวมคะแนน, ปัญหาคอขวดในการส่งต่อข้อสอบ 16 ศูนย์, และการขาดประวัติการตรวจสอบคะแนน โดยกลุ่มเราได้ทำการวิเคราะห์ SWOT ในบทที่ 2 ของเล่มวิจัย พบว่าจุดแข็งคือขอบเขตที่แน่นอน 16 ทีม 5 ข้อ และโอกาสคือการลดความผิดพลาดสู่ 0%");
}

// =========================================================================
// SLIDE 3: KEY FEATURE 1 (QUEUE ENGINE) - ชูระบบคิวอัจฉริยะที่เป็นหัวใจหลัก
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "2. KEY FEATURE: QUEUE", "ระบบคิวอัจฉริยะ (Intelligent Queue Matrix Engine)", "หัวใจหลักในการแก้ปัญหาคอขวด: จัดสรรและหมุนเวียนคิวตรวจ 16 ศูนย์ x 5 ข้อสอบอย่างเป็นระบบ");

  // Left: Real Live Queue Board with School Logos from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 4.2, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("ตารางคิวรวม 16 ศูนย์ x 5 ข้อ (Live Board จากเล่มวิจัย)", {
    x: 0.8, y: 1.45, w: 3.8, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.queueBoard,
    x: 0.75, y: 1.8, w: 3.9, h: 3.2,
    sizing: { type: 'contain' }
  });

  // Right: Admin Queue Management & Real-time Flow
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.35, w: 4.3, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอ Admin จัดการคิวและหมุนเวียนรอบละ 15 นาที", {
    x: 5.3, y: 1.45, w: 3.9, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.queueAdmin,
    x: 5.25, y: 1.8, w: 4.0, h: 1.8,
    sizing: { type: 'contain' }
  });

  slide.addText("จุดเด่นของระบบคิวอัจฉริยะ:\n• Matrix Algorithm: คำนวณตารางตรวจล่วงหน้า กระจาย 16 ศูนย์ลง 5 ข้ออย่างสมดุล ป้องกันการชนกันของคิว\n• 15-Minute Dynamic Slots: กำหนดช่วงเวลาตรวจชัดเจน รองรับการเลื่อนลำดับขึ้น/ลงแบบ On-the-fly\n• Real-time SSE Push: บอร์ดอัปเดตสถานะทันทีเมื่อกรรมการรับคิวหรือตรวจเสร็จ โดยไม่ต้องกดรีเฟรช", {
    x: 5.3, y: 3.75, w: 3.9, h: 1.3,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addNotes("หัวใจแรกของระบบคือ Intelligent Queue Matrix Engine ด้านซ้ายคือหน้าจอตารางคิวรวมจริงจากเล่มวิจัย แสดงโลโก้ของทั้ง 16 ศูนย์ สอวน. พร้อมแถบสีสถานะแบบเรียลไทม์ และด้านขวาคือหน้าจอ Admin ที่สามารถสร้างตารางคิวหมุนเวียนรอบละ 15 นาทีได้ทันที ช่วยตัดปัญหาคอขวดที่ต้องรอกระดาษได้อย่างสิ้นเชิงครับ");
}

// =========================================================================
// SLIDE 4: KEY FEATURE 2 (GRADING & E-SIGN) - ระบบตรวจและลงนามดิจิทัล
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "3. KEY FEATURE: GRADING", "ระบบตรวจข้อสอบและลงนามดิจิทัลตามกฎหมาย (E-Sign)", "ความถูกต้อง โปร่งใส พร้อมลายน้ำความปลอดภัย และการลงนามตาม พ.ร.บ.ธุรกรรมฯ 2544");

  // Left: Committee Grading with Watermark
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 4.2, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอกรรมการตรวจพร้อม Dynamic Watermark", {
    x: 0.8, y: 1.45, w: 3.8, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.committeeGrading,
    x: 0.75, y: 1.8, w: 3.9, h: 1.8,
    sizing: { type: 'contain' }
  });
  slide.addText("• กรอกคะแนนนักเรียน 6 คนต่อศูนย์ พร้อมปุ่มบันทึกร่าง\n• Dynamic Tiled Watermark: ป้องกันการถ่ายภาพด้วยลายน้ำระบุชื่อกรรมการและเวลาตรวจบนหน้าจอแบบเรียลไทม์", {
    x: 0.8, y: 3.75, w: 3.8, h: 1.2,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  // Right: Approval & E-Sign Screen from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.35, w: 4.3, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจออนุมัติคะแนนและลงนามดิจิทัล (Team Leader)", {
    x: 5.3, y: 1.45, w: 3.9, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.approvalSign,
    x: 5.25, y: 1.8, w: 4.0, h: 1.8,
    sizing: { type: 'contain' }
  });

  slide.addText("การรองรับตาม พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544:\n• มาตรา 9: ระบุตัวตนผู้ลงนาม และแสดงเจตนายอมรับความถูกต้องของคะแนน\n• มาตรา 26: วิธีการที่เชื่อถือได้ ข้อมูลคะแนนไม่สามารถถูกแก้ไขหลังลงนาม\n• สร้างรายงาน PDF ทางการ ประทับ Timestamp และลายเซ็นอิเล็กทรอนิกส์ทันที", {
    x: 5.3, y: 3.75, w: 3.9, h: 1.3,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addNotes("หัวใจสำคัญที่สองคือ กระบวนการตรวจและลงนามดิจิทัล โดยหน้าจอกรรมการจะมี Dynamic Watermark ป้องกันการแอบถ่ายคะแนน และเมื่อตรวจเสร็จ หัวหน้าทีมจะทำการตรวจสอบและกดปุ่ม 'อนุมัติและลงนาม' ซึ่งมีผลผูกพันทางกฎหมายตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 มาตรา 9 และ 26 ครับ");
}

// =========================================================================
// SLIDE 5: KEY FEATURE 3 (ROLES & AUTH) - การจัดการสิทธิ์และความปลอดภัย
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "4. KEY FEATURE: AUTH", "ระบบพิสูจน์ตัวตน 2FA และการจัดการสิทธิ์ 4 ระดับ", "ความปลอดภัยขั้นสูงด้วย OTP ผ่านมือถือ และการควบคุมสิทธิ์ตามบทบาทอย่างรัดกุม");

  // Left: OTP Login Screenshot from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 4.2, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอเข้าสู่ระบบและยืนยันรหัส OTP 6 หลัก (2FA)", {
    x: 0.8, y: 1.45, w: 3.8, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.otpLogin,
    x: 0.75, y: 1.8, w: 3.9, h: 1.8,
    sizing: { type: 'contain' }
  });
  slide.addText("• ยืนยันตัวตนสองขั้นตอน (2FA) ด้วยรหัส OTP 6 หลัก ส่งตรงสู่โทรศัพท์มือถือ\n• ป้องกันการแอบอ้างสิทธิ์ พร้อมระบบ Session Timeout หากไม่มีการใช้งาน", {
    x: 0.8, y: 3.75, w: 3.8, h: 1.2,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  // Right: User & Permissions Management Screenshot from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.35, w: 4.3, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอจัดการผู้ใช้ สิทธิ์ และอัปโหลดลายเซ็น (Admin)", {
    x: 5.3, y: 1.45, w: 3.9, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.userPermissions,
    x: 5.25, y: 1.8, w: 4.0, h: 1.8,
    sizing: { type: 'contain' }
  });

  // 4 Roles Table
  slide.addText("การแบ่งสิทธิ์ 4 บทบาทในระบบ:\n1. ผู้ดูแลระบบ (Admin): จัดการรอบการสอบ ข้อมูลศูนย์ และสิทธิ์ผู้ใช้งาน\n2. กรรมการตรวจ (Examiner): รับคิวตรวจ กรอกคะแนนข้อที่ได้รับมอบหมาย\n3. หัวหน้าทีม (Team Leader): ตรวจสอบคะแนนนักเรียนในศูนย์ และลงนามรับรอง\n4. เจ้าหน้าที่ (Staff): จัดคิวและอำนวยความสะดวกในห้องตรวจข้อสอบ", {
    x: 5.3, y: 3.75, w: 3.9, h: 1.3,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addNotes("หัวใจที่สามคือด้านความปลอดภัยและการแบ่งสิทธิ์ การเข้าใช้งานจะผ่าน 2FA ด้วย OTP 6 หลัก และแบ่งสิทธิ์เป็น 4 บทบาทอย่างชัดเจน โดยมีหน้าจอให้ Admin จัดการสิทธิ์และอัปโหลดลายเซ็นดิจิทัลเฉพาะตัวสำหรับกรรมการและหัวหน้าทีม เพื่อใช้ในขั้นตอนการลงนามเอกสารครับ");
}

// =========================================================================
// SLIDE 6: SYSTEM ARCHITECTURE (สถาปัตยกรรม Full-Stack)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "5. SYSTEM ARCHITECTURE", "สถาปัตยกรรมระบบ TMO Web Application (Full-Stack Flow)", "แผนภาพความสัมพันธ์ Front-end, REST/SSE API และ Back-end ตามที่ระบุในเล่มวิจัย");

  // Left: Official TMO Web App Architecture Diagram from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 4.3, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("TMO Web Application Architecture (จากเล่มวิจัย)", {
    x: 0.8, y: 1.45, w: 3.9, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.archDiagram,
    x: 0.75, y: 1.8, w: 4.0, h: 3.1,
    sizing: { type: 'contain' }
  });

  // Right: Architectural Deep Dive
  const archPoints = [
    { title: "Front-end (Nuxt 3 / React / Tailwind)", detail: "ออกแบบ UI แบบ Component-driven รองรับ Responsive ทั้งแท็บเล็ตและมือถือ พร้อม Watermark และ Real-time State Binding" },
    { title: "API Communication & SSE", detail: "ใช้ RESTful API ร่วมกับ Server-Sent Events (SSE) ประหยัดทรัพยากรและเสถียรกว่า WebSockets ในการ Broadcast คิว" },
    { title: "Back-end (Node.js & ExcelJS)", detail: "จัดการ App Logic การตรวจสอบสิทธิ์ การประมวลผลคิว และการสร้างไฟล์ Excel/PDF ตามมาตรฐานราชการ" },
    { title: "Database Layer (SQL Server)", detail: "จัดเก็บข้อมูลผู้ใช้ โรงเรียน คิว คะแนน และ Audit Log อย่างเป็นระบบตามหลัก Third Normal Form (3NF)" }
  ];

  archPoints.forEach((a, idx) => {
    const y = 1.35 + (idx * 0.95);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.1, y: y, w: 4.3, h: 0.88,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(a.title, {
      x: 5.25, y: y + 0.08, w: 4.0, h: 0.28,
      fontSize: 9.5, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(a.detail, {
      x: 5.25, y: y + 0.36, w: 4.0, h: 0.45,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addNotes("ในส่วนของสถาปัตยกรรมระบบ เราออกแบบเป็น 3-Tier ตามแผนภาพจากเล่มวิจัย ฝั่งหน้าบ้านเชื่อมต่อกับหลังบ้านผ่าน REST API และรับข้อมูล Real-time ผ่าน Server-Sent Events ซึ่งจุดเด่นคือการใช้ SSE แทน WebSockets ทำให้คงสถานะคิวได้โดยไม่เปลือง Connection Pool ครับ");
}

// =========================================================================
// SLIDE 7: DATABASE ARCHITECTURE (โครงสร้างฐานข้อมูลเชิงสัมพันธ์)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "6. DATABASE ARCHITECTURE", "โครงสร้างฐานข้อมูลเชิงสัมพันธ์ (Database Relational Schema)", "แผนภาพความสัมพันธ์เอนทิตี (ER Diagram) และ 9 ตารางสำคัญจากเล่มวิจัย");

  // Left: Official Relational ER Diagram from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 4.1, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("Database Relational Schema (จากเล่มวิจัย)", {
    x: 0.8, y: 1.45, w: 3.7, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.erDiagram,
    x: 0.75, y: 1.8, w: 3.8, h: 3.2,
    sizing: { type: 'contain' }
  });

  // Right: Tables & Key Integrity Constraints
  const dbModules = [
    { title: "User & School", desc: "User (UserId, Username, PasswordHash, Role, SchoolId) ผูกกับ School (SchoolId, Code, Name) จำกัดขอบเขตการดูคะแนนตามศูนย์" },
    { title: "QueueItem & CommitteeAssignment", desc: "QueueItem (QueueItemId, SchoolId, ProblemNumber, Status, Position) จัดการสถานะคิวหมุนเวียน และเชื่อมโยงกรรมการแต่ละข้อ" },
    { title: "Score & Student", desc: "Score (ScoreId, QueueItemId, JudgeId, Value, StudentId) จัดเก็บคะแนนนักเรียนรายบุคคล (0-7 คะแนน) ตามเกณฑ์โอลิมปิก" },
    { title: "ScoreEditRequest & AuditLog", desc: "จัดเก็บบันทึกประวัติการขอแก้ไขคะแนน (OldValue, NewValue, Reason, Status) และบันทึก AuditLog ย้อนหลังเพื่อความโปร่งใส 100%" }
  ];

  dbModules.forEach((m, idx) => {
    const y = 1.35 + (idx * 0.95);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 4.9, y: y, w: 4.5, h: 0.88,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(m.title, {
      x: 5.05, y: y + 0.08, w: 4.2, h: 0.28,
      fontSize: 9.5, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(m.desc, {
      x: 5.05, y: y + 0.36, w: 4.2, h: 0.45,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addNotes("ในส่วนของฐานข้อมูล Microsoft SQL Server เราออกแบบตามหลัก 3NF ซึ่งแสดงใน ER Diagram จากเล่มวิจัย ตาราง Score ผูกกับ QueueItem และ Student อย่างรัดกุม พร้อมตาราง AuditLog และ ScoreEditRequest เพื่อเก็บบันทึกทุกการเปลี่ยนแปลงคะแนน ทำให้ระบบมีความโปร่งใสและตรวจสอบย้อนหลังได้ทุกจุดครับ");
}

// =========================================================================
// SLIDE 8: CLOUD DEPLOYMENT (การนำขึ้น Azure ในงบจำกัด < $10 USD)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "7. CLOUD DEPLOYMENT", "แผนการนำระบบขึ้น Microsoft Azure ในงบประมาณไม่เกิน 10 USD", "สถาปัตยกรรม Cloud ที่คุ้มค่า ปลอดภัย และรองรับผู้ใช้งานพร้อมกันตลอดการแข่งขัน");

  const azureBoxes = [
    {
      title: "1. Web & API Tier (Azure App Service)",
      cost: "Free Tier ($0.00) หรือ Basic B1 (~$8/เดือน ช่วงแข่ง)",
      details: "• รัน Nuxt 3 / Next.js และ Node.js REST/SSE API\n• รันบน Linux Container เสถียรและ Scale out ได้ทันทีเมื่อทราฟฟิกสูง\n• รองรับ CI/CD Deployment อัตโนมัติจาก GitHub Actions"
    },
    {
      title: "2. Database Tier (Azure SQL Database)",
      cost: "~$5.00 - $7.00 / เดือน",
      details: "• Azure SQL Database Serverless (คิดเงินตามจริง Auto-pause เมื่อไม่ใช้งาน)\n• หรือ SQL Server Express on Linux B1s Burstable VM\n• Automated Daily Backup & Point-in-time Restore"
    },
    {
      title: "3. Edge & Security Tier (Cloudflare)",
      cost: "Free Tier ($0.00 / เดือน)",
      details: "• Cloudflare CDN & Free SSL/TLS สำหรับแคช Static Assets\n• Cloudflare Zero Trust / Tunnel ซ่อน Origin IP และป้องกัน DDoS\n• ป้องกันการโจมตีทางไซเบอร์โดยไม่ต้องซื้อ Public IP แพง"
    },
    {
      title: "4. สรุปงบประมาณรวมทั้งระบบ",
      cost: "รวมค่าใช้จ่าย: ~$7.50 - $9.80 / เดือน",
      details: "• อยู่ในเกณฑ์ข้อกำหนด ไม่เกิน 10 USD ต่อเดือน (ประมาณ 270-350 บาท)\n• สามารถ Shutdown หรือ Pause ทรัพยากรหลังเสร็จสิ้นการแข่งขันได้ทันที\n• ให้ความคุ้มค่าสูงสุดสำหรับงบประมาณของสถาบันการศึกษา"
    }
  ];

  azureBoxes.forEach((b, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.6 + (col * 4.5);
    const y = 1.35 + (row * 1.95);

    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: y, w: 4.3, h: 1.8,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.rect, {
      x: x, y: y, w: 4.3, h: 0.06,
      fill: { color: idx === 3 ? COLOR_GREEN : COLOR_BLUE }, line: { color: idx === 3 ? COLOR_GREEN : COLOR_BLUE }
    });
    slide.addText(b.title, {
      x: x + 0.2, y: y + 0.12, w: 3.9, h: 0.3,
      fontSize: 10.5, bold: true, color: COLOR_DARK
    });
    slide.addText(b.cost, {
      x: x + 0.2, y: y + 0.42, w: 3.9, h: 0.25,
      fontSize: 9.5, bold: true, color: idx === 3 ? COLOR_GREEN : COLOR_BLUE
    });
    slide.addText(b.details, {
      x: x + 0.2, y: y + 0.72, w: 3.9, h: 0.95,
      fontSize: 8.5, color: COLOR_TEXT_MUTED, lineSpacing: 14
    });
  });

  slide.addNotes("ในส่วนของการ Deploy บน Microsoft Azure เราออกแบบ Cost-Optimized Architecture ให้มีค่าใช้จ่ายรวมไม่เกิน 10 ดอลลาร์ต่อเดือน โดยใช้ App Service ร่วมกับ Azure SQL Serverless ที่มีระบบ Auto-pause และใช้ Cloudflare Zero Trust มาช่วยรักษาความปลอดภัย ทำให้ได้ระบบที่มีความเสถียรสูงในงบประมาณที่ประหยัดมากครับ");
}

// =========================================================================
// SLIDE 9: SYSTEM IMPACT & RESULTS (ผลลัพธ์จากการใช้งานจริง)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "8. RESULTS & IMPACT", "ผลลัพธ์จากการทดสอบ และผลกระทบต่อกระบวนการแข่งขัน", "ประสิทธิภาพที่พิสูจน์ได้จากการทดสอบเสมือนจริง 16 ศูนย์สอบ x 5 ข้อสอบ");

  const impactCards = [
    { title: "ความถูกต้องแม่นยำ 100% (Zero Data Loss)", desc: "ขจัดปัญหาคะแนนผิดพลาดจากการรวมเลขด้วยมือ มีระบบ Audit Trail ตรวจสอบย้อนหลังได้ทุกจุด" },
    { title: "ประหยัดเวลาการตรวจลงกว่า 80%", desc: "จากเดิมที่ต้องเดินเอกสารกระดาษข้ามห้อง เปลี่ยนเป็นการส่งต่อข้อมูลแบบเรียลไทม์ผ่านคิวอัจฉริยะ" },
    { title: "รายงานผลคะแนนพร้อมใช้ตามกฎหมาย", desc: "การลงนามดิจิทัลสอดคล้องตาม พ.ร.บ.ธุรกรรมฯ 2544 สามารถพิมพ์รายงาน PDF และนำออก Excel ได้ทันที" }
  ];

  impactCards.forEach((c, idx) => {
    const y = 1.35 + (idx * 1.15);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: y, w: 4.2, h: 1.05,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0.6, y: y, w: 0.08, h: 1.05,
      fill: { color: COLOR_GREEN }, line: { color: COLOR_GREEN }
    });
    slide.addText(c.title, {
      x: 0.8, y: y + 0.08, w: 3.9, h: 0.35,
      fontSize: 10, bold: true, color: COLOR_GREEN
    });
    slide.addText(c.desc, {
      x: 0.8, y: y + 0.42, w: 3.9, h: 0.55,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  // Right: Real Export Screen from Thesis
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.35, w: 4.3, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอสรุปคะแนนและส่งออก Excel / PDF (จากเล่มวิจัย)", {
    x: 5.3, y: 1.45, w: 3.9, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.scoreExport,
    x: 5.25, y: 1.8, w: 4.0, h: 1.8,
    sizing: { type: 'contain' }
  });

  slide.addText("ความคุ้มค่าและผลประโยชน์เชิงปฏิบัติการ:\n• เจ้าหน้าที่ลดภาระงานเอกสารกว่า 100 แผ่นต่อวัน\n• กรรมการตรวจข้อสอบได้ต่อเนื่องโดยไม่มีช่วงเวลา Idle time\n• คณะกรรมการกลางสามารถดูภาพรวมคะแนนสดผ่าน Live Leaderboard ได้ตลอดเวลา", {
    x: 5.3, y: 3.75, w: 3.9, h: 1.2,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addNotes("ผลลัพธ์จากการทดสอบระบบแสดงให้เห็นว่าสามารถลดเวลาการดำเนินงานลงได้กว่า 80% ป้องกันข้อผิดพลาดของคะแนนเป็น 0% และลดภาระงานเอกสารกระดาษได้อย่างมหาศาล โดยมีหน้าจอสำหรับ Export คะแนนเป็น Excel และ PDF ได้ทันทีหลังจบการแข่งขันครับ");
}

// =========================================================================
// SLIDE 10: CONCLUSION & FUTURE WORK (สรุปผลและก้าวต่อไป)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.7, w: 3.0, h: 0.35,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("9. CONCLUSION & ROADMAP", {
    x: 0.8, y: 0.7, w: 3.0, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("สรุปภาพรวมโครงการ และทิศทางการต่อยอดในอนาคต", {
    x: 0.8, y: 1.25, w: 8.4, h: 0.6,
    fontSize: 22, bold: true, color: COLOR_WHITE, valign: 'middle'
  });

  // 3 Future Roadmap Cards
  const roadmap = [
    {
      step: "ขั้นที่ 1: การใช้งานจริง",
      title: "TMO Host ณ มจพ.",
      desc: "นำระบบไปใช้งานจริงในการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ (TMO) ครั้งที่มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือเป็นเจ้าภาพ"
    },
    {
      step: "ขั้นที่ 2: ขยายผลระดับชาติ",
      title: "POSN Olympiad Platform",
      desc: "พัฒนาต่อยอดสถาปัตยกรรมนี้เป็น Platform กลางสำหรับการแข่งขันโอลิมปิกวิชาการ สอวน. ทั่วประเทศ ในทุกสาขาวิชา (ฟิสิกส์ เคมี คอมพิวเตอร์ ชีววิทยา)"
    },
    {
      step: "ขั้นที่ 3: ระบบอัจฉริยะขั้นสูง",
      title: "AI Assisted & Mobile App",
      desc: "เสริมฟีเจอร์ AI OCR ตรวจจับความผิดปกติของคะแนนอัตโนมัติ และพัฒนาแอปพลิเคชันมือถือสำหรับผู้เข้าร่วมแข่งขันและผู้สังเกตการณ์"
    }
  ];

  roadmap.forEach((r, idx) => {
    const x = 0.8 + (idx * 2.85);
    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: 2.1, w: 2.7, h: 2.3,
      fill: { color: '1E293B' }, line: { color: '334155', width: 1 },
      rectRadius: 0.08
    });
    slide.addText(r.step, {
      x: x + 0.15, y: 2.25, w: 2.4, h: 0.3,
      fontSize: 9, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(r.title, {
      x: x + 0.15, y: 2.55, w: 2.4, h: 0.35,
      fontSize: 12, bold: true, color: COLOR_WHITE
    });
    slide.addText(r.desc, {
      x: x + 0.15, y: 2.95, w: 2.4, h: 1.3,
      fontSize: 8.5, color: '94A3B8', lineSpacing: 14
    });
  });

  slide.addText("ขอขอบพระคุณคณะกรรมการทุกท่าน — เปิดรับข้อเสนอแนะและถาม-ตอบ (Q&A)", {
    x: 0.8, y: 4.65, w: 8.4, h: 0.4,
    fontSize: 11, bold: true, color: 'F1F5F9', align: 'center', valign: 'middle'
  });

  slide.addNotes("สรุปภาพรวมโครงการ ระบบ TMO Management System พร้อมแล้วสำหรับการนำไปใช้งานจริงในการแข่งขัน TMO ครั้งที่ มจพ. เป็นเจ้าภาพ และพร้อมขยายผลสู่ระดับประเทศ กลุ่มของพวกเราขอขอบพระคุณท่านคณะกรรมการทุกท่าน และยินดีรับฟังข้อเสนอแนะและตอบข้อซักถามครับ");
}

// Write presentation
const outputPath = 'c:/tmo/TMO_Grading_Queue_Presentation.pptx';
pres.writeFile({ fileName: outputPath })
  .then(fileName => {
    console.log(`Successfully generated updated presentation: ${outputPath}`);
  })
  .catch(err => {
    console.error('Error generating presentation:', err);
  });
