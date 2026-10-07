const fs = require('fs');
const path = require('path');

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

const base64Data = {};
for (const [k, p] of Object.entries(assets)) {
  const buf = fs.readFileSync(p);
  const ext = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
  base64Data[k] = {
    mime: ext,
    data: buf.toString('base64')
  };
}

const gasScript = `/**
 * Google Apps Script for Generating TMO 10-Slide Deck (Restructured Storytelling Order)
 * Paste into Extensions > Apps Script in Google Slides, then click 'Run' (createTMOSlides).
 */

const IMAGES = ${JSON.stringify(base64Data, null, 2)};

function insertBase64Image(slide, key, left, top, width, height) {
  try {
    const item = IMAGES[key];
    if (!item) return;
    const blob = Utilities.newBlob(Utilities.base64Decode(item.data), item.mime, key);
    slide.insertImage(blob, left, top, width, height);
  } catch (e) {
    Logger.log('Error inserting image ' + key + ': ' + e.message);
  }
}

function createTMOSlides() {
  const presentation = SlidesApp.getActivePresentation();
  
  // Slide Width & Height in points (16:9 standard: 720 x 405 pt)
  const W = 720;
  const H = 405;

  // Colors
  const RED = '#C8102E';
  const DARK = '#0F172A';
  const GRAY_BG = '#F8FAFC';
  const WHITE = '#FFFFFF';
  const TEXT_DARK = '#1E293B';
  const TEXT_MUTED = '#64748B';

  function addHeader(slide, badge, title, subtitle) {
    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, 6);
    bar.getFill().setSolidFill(RED);
    bar.getBorder().setTransparent();

    const b = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40, 18, 170, 20);
    b.getFill().setSolidFill(DARK);
    b.getBorder().setTransparent();
    const bt = b.getText();
    bt.setText(badge);
    bt.getTextStyle().setForegroundColor(WHITE).setFontSize(8).setBold(true);

    const tb = slide.insertTextBox(title, 40, 40, 640, 30);
    tb.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(16).setBold(true);

    if (subtitle) {
      const sub = slide.insertTextBox(subtitle, 40, 68, 640, 20);
      sub.getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(9);
    }
  }

  // -------------------------------------------------------------
  // SLIDE 1: INTRO (หัวข้อและคณะผู้จัดทำ)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DARK);

    const b = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 50, 45, 230, 25);
    b.getFill().setSolidFill(RED);
    b.getBorder().setTransparent();
    b.getText().setText('โครงงานพิเศษปริญญานิพนธ์ 2569').getTextStyle().setForegroundColor(WHITE).setFontSize(9).setBold(true);

    const t = slide.insertTextBox('ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ\\nผ่านเว็บแอปพลิเคชัน (TMO Management System)', 50, 85, 620, 80);
    t.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(20).setBold(true);

    const en = slide.insertTextBox('Thailand Mathematical Olympiad (TMO) Management System Using Web Application', 50, 170, 620, 25);
    en.getText().getTextStyle().setForegroundColor('#94A3B8').setFontSize(10);

    const auth = slide.insertTextBox(
      'คณะผู้จัดทำ:\\n• นาย ทินณภัทร ปั้นคง (64-040626-3603-4)\\n• นาย วสุศิลป์ ลี้นิธิเจริญกิจ (64-040626-3627-1)\\n• นางสาว อิสริยาภรณ์ มงคลิก (64-040626-3635-2)',
      50, 220, 300, 120
    );
    auth.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(9.5);

    const adv = slide.insertTextBox(
      'อาจารย์ที่ปรึกษา: อาจารย์ ดร.ชัยยศ กำธรเจริญ\\n\\nสาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\\nคณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ',
      380, 220, 300, 120
    );
    adv.getText().getTextStyle().setForegroundColor('#CBD5E1').setFontSize(9);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'กราบเรียนท่านคณะกรรมการทุกท่าน วันนี้กลุ่มของพวกเราขอรายงานความก้าวหน้าโครงงานพิเศษ ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติผ่านเว็บแอปพลิเคชัน ครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 2: PROBLEM & SWOT (ปัญหาเดิมที่พบ)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '1. PROBLEM & SWOT', 'ปัญหาของกระบวนการตรวจเดิม และการวิเคราะห์ SWOT', 'วิเคราะห์กระบวนการตรวจข้อสอบกระดาษ 16 ศูนย์ x 5 ข้อสอบ และการประเมินปัจจัยโครงการ');

    const desc = slide.insertTextBox(
      'ปัญหาสำคัญของระบบเดิม:\\n\\n' +
      '1. ความผิดพลาดจากการกรอกคะแนน (Human Error)\\nการรวมคะแนนแบบกระดาษและการคีย์ซ้ำเสี่ยงต่อตัวเลขคลาดเคลื่อน ขาดระบบ Double-check อัตโนมัติ\\n\\n' +
      '2. คอขวดการหมุนเวียนคิว (16 ศูนย์ x 5 ข้อ)\\nกรรมการ 5 ท่านต้องตรวจข้อสอบของนักเรียนจาก 16 ศูนย์ทั่วประเทศ เกิดความสับสนของลำดับคิวและเวลาว่าง\\n\\n' +
      '3. ขาดการบันทึกประวัติการแก้ไข (Audit Trail)\\nเมื่อมีการแก้ไขคะแนน ไม่มีระบบเก็บบันทึกว่าใครแก้ เมื่อใด และด้วยเหตุผลใด ทำให้ตรวจสอบย้อนหลังได้ยาก',
      40, 95, 310, 280
    );
    desc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9);

    insertBase64Image(slide, 'swotDiagram', 370, 95, 310, 270);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'ในกระบวนการแข่งขันเดิม มีปัญหาสำคัญ 3 ประการคือความผิดพลาดในการรวมคะแนน, ปัญหาคอขวดในการส่งต่อข้อสอบ 16 ศูนย์, และการขาดประวัติการตรวจสอบคะแนน โดยกลุ่มเราได้ทำการวิเคราะห์ SWOT ในบทที่ 2 ของเล่มวิจัยครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 3: KEY FEATURE 1 (QUEUE ENGINE) - ชูระบบคิวอัจฉริยะ
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '2. KEY FEATURE: QUEUE', 'ระบบคิวอัจฉริยะ (Intelligent Queue Matrix Engine)', 'หัวใจหลักในการแก้ปัญหาคอขวด: จัดสรรและหมุนเวียนคิวตรวจ 16 ศูนย์ x 5 ข้อสอบอย่างเป็นระบบ');

    insertBase64Image(slide, 'queueBoard', 40, 95, 290, 275);

    insertBase64Image(slide, 'queueAdmin', 350, 95, 330, 140);
    const qDesc = slide.insertTextBox(
      'กลไกการทำงานของระบบคิวอัจฉริยะ:\\n\\n' +
      '• Matrix Algorithm: คำนวณตารางตรวจล่วงหน้า กระจาย 16 ศูนย์ลง 5 ข้ออย่างสมดุล ป้องกันการชนกันของคิว\\n' +
      '• 15-Minute Dynamic Slots: กำหนดช่วงเวลาตรวจชัดเจน พร้อมระบบเลื่อนลำดับขึ้น/ลงแบบ On-the-fly\\n' +
      '• Real-time SSE Push: บอร์ดอัปเดตสถานะทันทีเมื่อกรรมการรับคิวหรือตรวจเสร็จ โดยไม่ต้องกดรีเฟรช',
      350, 245, 330, 120
    );
    qDesc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'หัวใจแรกของระบบคือ Intelligent Queue Matrix Engine ด้านซ้ายคือหน้าจอตารางคิวรวมจริงจากเล่มวิจัย แสดงโลโก้ของทั้ง 16 ศูนย์ สอวน. พร้อมแถบสีสถานะแบบเรียลไทม์ และด้านขวาคือหน้าจอ Admin จัดการคิว 15 นาทีครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 4: KEY FEATURE 2 (GRADING & E-SIGN) - ระบบตรวจและลงนามดิจิทัล
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '3. KEY FEATURE: GRADING', 'ระบบตรวจข้อสอบและลงนามดิจิทัลตามกฎหมาย (E-Sign)', 'ความถูกต้อง โปร่งใส พร้อมลายน้ำความปลอดภัย และการลงนามตาม พ.ร.บ.ธุรกรรมฯ 2544');

    insertBase64Image(slide, 'committeeGrading', 40, 95, 310, 140);
    const gDesc = slide.insertTextBox(
      '• กรอกคะแนนนักเรียน 6 คนต่อศูนย์ พร้อมปุ่มบันทึกร่าง\\n' +
      '• Dynamic Tiled Watermark: ป้องกันการถ่ายภาพด้วยลายน้ำระบุชื่อกรรมการและเวลาตรวจบนหน้าจอแบบเรียลไทม์',
      40, 245, 310, 110
    );
    gDesc.getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);

    insertBase64Image(slide, 'approvalSign', 370, 95, 310, 140);
    const signDesc = slide.insertTextBox(
      'การรองรับตาม พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544:\\n' +
      '• มาตรา 9: ระบุตัวตนผู้ลงนาม และแสดงเจตนายอมรับความถูกต้องของคะแนน\\n' +
      '• มาตรา 26: วิธีการที่เชื่อถือได้ ข้อมูลคะแนนไม่สามารถถูกแก้ไขหลังลงนาม\\n' +
      '• สร้างรายงาน PDF ทางการ ประทับ Timestamp และลายเซ็นอิเล็กทรอนิกส์ทันที',
      370, 245, 310, 120
    );
    signDesc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'หัวใจสำคัญที่สองคือ กระบวนการตรวจและลงนามดิจิทัล โดยหน้าจอกรรมการจะมี Dynamic Watermark ป้องกันการแอบถ่าย และหัวหน้าทีมจะกดปุ่ม อนุมัติและลงนาม ซึ่งมีผลผูกพันทางกฎหมายตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 ครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 5: KEY FEATURE 3 (ROLES & AUTH) - การจัดการสิทธิ์และความปลอดภัย
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '4. KEY FEATURE: AUTH', 'ระบบพิสูจน์ตัวตน 2FA และการจัดการสิทธิ์ 4 ระดับ', 'ความปลอดภัยขั้นสูงด้วย OTP ผ่านมือถือ และการควบคุมสิทธิ์ตามบทบาทอย่างรัดกุม');

    insertBase64Image(slide, 'otpLogin', 40, 95, 310, 140);
    const tLeft = slide.insertTextBox('ระบบล็อกอิน 2FA ด้วย OTP 6 หลัก ส่งตรงสู่โทรศัพท์มือถือ พร้อมระบบความปลอดภัย Session Timeout', 40, 245, 310, 110);
    tLeft.getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);

    insertBase64Image(slide, 'userPermissions', 370, 95, 310, 140);
    const tRight = slide.insertTextBox(
      'การแบ่งสิทธิ์ 4 บทบาทในระบบ:\\n' +
      '1. Admin: จัดการรอบการสอบ ข้อมูลศูนย์ และสิทธิ์ผู้ใช้งาน\\n' +
      '2. Examiner (กรรมการ): รับคิวตรวจ กรอกคะแนนข้อที่ได้รับมอบหมาย\\n' +
      '3. Team Leader: ตรวจสอบคะแนนนักเรียนในศูนย์ และลงนามรับรอง\\n' +
      '4. Staff: จัดคิวและอำนวยความสะดวกในห้องตรวจข้อสอบ',
      370, 245, 310, 120
    );
    tRight.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'หัวใจที่สามคือความปลอดภัยและการแบ่งสิทธิ์ เข้าใช้งานผ่าน 2FA ด้วย OTP 6 หลัก และแบ่งสิทธิ์เป็น 4 บทบาทอย่างชัดเจน พร้อมฟังก์ชันอัปโหลดลายเซ็นดิจิทัลเฉพาะตัวสำหรับกรรมการและหัวหน้าทีมครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 6: SYSTEM ARCHITECTURE (สถาปัตยกรรม Full-Stack)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '5. SYSTEM ARCHITECTURE', 'สถาปัตยกรรมระบบ TMO Web Application (Full-Stack Flow)', 'แผนภาพความสัมพันธ์ Front-end, REST/SSE API และ Back-end ตามที่ระบุในเล่มวิจัย');

    insertBase64Image(slide, 'archDiagram', 40, 95, 310, 270);

    const desc = slide.insertTextBox(
      'รายละเอียดสถาปัตยกรรม 3-Tier:\\n\\n' +
      '• Front-end (Nuxt 3 / React / Next.js, Tailwind CSS):\\nออกแบบ Component-driven UI สำหรับ 4 บทบาท มี Dynamic Watermark ป้องกันการทุจริต และ Responsive รองรับทั้งแท็บเล็ตและมือถือ\\n\\n' +
      '• API Communication & Real-time Sync:\\nใช้ RESTful API ร่วมกับ Server-Sent Events (SSE) ในการกระจายสถานะคิว เสถียรและประหยัดทรัพยากรกว่า WebSockets เมื่อรันบน Server ทรัพยากรจำกัด\\n\\n' +
      '• Back-end (Node.js, ExcelJS):\\nจัดการ Business Logic การตรวจคะแนน สถิติ การตรวจสอบสิทธิ์ และสร้างไฟล์ Excel/PDF ตามมาตรฐานราชการ\\n\\n' +
      '• Database Layer (Microsoft SQL Server):\\nจัดเก็บข้อมูลผู้ใช้ โรงเรียน คิว คะแนน และ Audit Log อย่างเป็นระบบตามหลัก 3NF',
      370, 95, 310, 280
    );
    desc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'ในส่วนของสถาปัตยกรรมระบบ เราออกแบบเป็น 3-Tier ตามแผนภาพจากเล่มวิจัย ฝั่งหน้าบ้านเชื่อมต่อกับหลังบ้านผ่าน REST API และรับข้อมูล Real-time ผ่าน Server-Sent Events (SSE) แทน WebSockets ครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 7: DATABASE ARCHITECTURE (โครงสร้างข้อมูล)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '6. DATABASE ARCHITECTURE', 'โครงสร้างฐานข้อมูลเชิงสัมพันธ์ (Database Relational Schema)', 'แผนภาพความสัมพันธ์เอนทิตี (ER Diagram) และ 9 ตารางสำคัญจากเล่มวิจัย');

    insertBase64Image(slide, 'erDiagram', 40, 95, 300, 275);

    const desc = slide.insertTextBox(
      'ตารางและกลไกความถูกต้องของข้อมูล (Data Integrity):\\n\\n' +
      '• User & School:\\nUser เชื่อมโยงกับ School ด้วย Foreign Key เพื่อจำกัดขอบเขตการดูคะแนนเฉพาะศูนย์ของตนเอง\\n\\n' +
      '• QueueItem & CommitteeAssignment:\\nQueueItem จัดการสถานะคิวหมุนเวียน (Position, Status, ClaimedAt) และผูกกรรมการตามข้อ\\n\\n' +
      '• Score & Student:\\nScore จัดเก็บคะแนนนักเรียนรายบุคคล (0-7 คะแนน) ตามกติกา สอวน. พร้อม Timestamps\\n\\n' +
      '• ScoreEditRequest & AuditLog:\\nจัดเก็บบันทึกประวัติการขอแก้ไขคะแนน (OldValue, NewValue, Reason) และบันทึก AuditLog ย้อนหลังเพื่อความโปร่งใส 100%',
      360, 95, 320, 280
    );
    desc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'ในส่วนของฐานข้อมูล Microsoft SQL Server เราออกแบบตามหลัก 3NF ตาราง Score ผูกกับ QueueItem และ Student อย่างรัดกุม พร้อมตาราง AuditLog และ ScoreEditRequest เพื่อเก็บบันทึกทุกการเปลี่ยนแปลงคะแนนครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 8: CLOUD DEPLOYMENT (การนำขึ้น Azure ในงบจำกัด)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '7. CLOUD DEPLOYMENT', 'แผนการนำระบบขึ้น Microsoft Azure ในงบประมาณไม่เกิน 10 USD', 'สถาปัตยกรรม Cloud ที่คุ้มค่า ปลอดภัย และรองรับผู้ใช้งานพร้อมกันตลอดการแข่งขัน');

    const desc = slide.insertTextBox(
      '1. Web & API Tier (Azure App Service Linux):\\n' +
      '• ค่าใช้จ่าย: Free Tier ($0.00) หรือ Basic B1 (~$8/เดือน ช่วงแข่ง)\\n' +
      '• รัน Nuxt 3 / Next.js และ Node.js REST/SSE API พร้อม Scale out อัตโนมัติ\\n\\n' +
      '2. Database Tier (Azure SQL Database Serverless):\\n' +
      '• ค่าใช้จ่าย: ~$5.00 - $7.00 / เดือน (Auto-pause เมื่อไม่มีทราฟฟิก)\\n' +
      '• หรือใช้ SQL Server Express on Linux B1s VM พร้อมระบบ Backup รายวัน\\n\\n' +
      '3. Security & Edge Tier (Cloudflare Zero Trust & CDN):\\n' +
      '• ค่าใช้จ่าย: Free Tier ($0.00 / เดือน)\\n' +
      '• ทำหน้าที่ Caching, SSL/TLS อัตโนมัติ และป้องกัน DDoS โดยไม่ต้องซื้อ Public IP\\n\\n' +
      'สรุปงบประมาณรวมทั้งระบบ: ประมาณ $7.50 - $9.80 / เดือน (ต่ำกว่าเกณฑ์ 10 USD หรือ ~270-350 บาท)',
      40, 95, 640, 280
    );
    desc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9.5);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'ในส่วนของการ Deploy บน Microsoft Azure เราออกแบบ Cost-Optimized Architecture ให้มีค่าใช้จ่ายรวมไม่เกิน 10 ดอลลาร์ต่อเดือน โดยใช้ App Service ร่วมกับ Azure SQL Serverless ที่มีระบบ Auto-pause ครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 9: SYSTEM IMPACT & RESULTS (ผลลัพธ์จากการใช้งานจริง)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '8. RESULTS & IMPACT', 'ผลลัพธ์จากการทดสอบ และผลกระทบต่อกระบวนการแข่งขัน', 'ประสิทธิภาพที่พิสูจน์ได้จากการทดสอบเสมือนจริง 16 ศูนย์สอบ x 5 ข้อสอบ');

    const desc = slide.insertTextBox(
      'สรุปผลลัพธ์ของโครงการ:\\n\\n' +
      '• Zero Data Loss: ความถูกต้องแม่นยำ 100% ขจัดปัญหาคะแนนผิดพลาดด้วยระบบ Audit Trail\\n\\n' +
      '• ประหยัดเวลาการตรวจลงกว่า 80%: ลดการเดินส่งเอกสารข้ามห้อง เปลี่ยนเป็นการส่งต่อข้อมูลแบบเรียลไทม์\\n\\n' +
      '• มีผลรับรองทางกฎหมายอย่างสมบูรณ์: สอดคล้องตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544\\n\\n' +
      'ความคุ้มค่าเชิงปฏิบัติการ:\\n' +
      '• เจ้าหน้าที่ลดภาระงานเอกสารกว่า 100 แผ่นต่อวัน\\n' +
      '• กรรมการตรวจข้อสอบได้ต่อเนื่องโดยไม่มีช่วงเวลา Idle time\\n' +
      '• คณะกรรมการกลางสามารถดูภาพรวมคะแนนสดผ่าน Live Leaderboard ได้ตลอดเวลา',
      40, 95, 310, 280
    );
    desc.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    insertBase64Image(slide, 'scoreExport', 370, 95, 310, 270);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'ผลลัพธ์จากการทดสอบระบบแสดงให้เห็นว่าสามารถลดเวลาการดำเนินงานลงได้กว่า 80% ป้องกันข้อผิดพลาดของคะแนนเป็น 0% และลดภาระงานเอกสารกระดาษได้อย่างมหาศาลครับ'
    );
  }

  // -------------------------------------------------------------
  // SLIDE 10: CONCLUSION & ROADMAP (ก้าวต่อไปและ Q&A)
  // -------------------------------------------------------------
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DARK);

    const b = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 50, 45, 200, 25);
    b.getFill().setSolidFill(RED);
    b.getBorder().setTransparent();
    b.getText().setText('9. CONCLUSION & ROADMAP').getTextStyle().setForegroundColor(WHITE).setFontSize(9).setBold(true);

    const t = slide.insertTextBox('สรุปภาพรวมโครงการ และทิศทางการต่อยอดในอนาคต', 50, 85, 620, 40);
    t.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(18).setBold(true);

    const r1 = slide.insertTextBox(
      'ขั้นที่ 1: การใช้งานจริง\\nTMO Host ณ มจพ.\\nนำระบบไปใช้งานจริงในการแข่งขัน TMO ครั้งที่ มจพ. เป็นเจ้าภาพ',
      50, 140, 190, 160
    );
    r1.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(9);

    const r2 = slide.insertTextBox(
      'ขั้นที่ 2: ขยายผลระดับชาติ\\nPOSN Olympiad Platform\\nพัฒนาต่อยอดเป็น Platform กลางสำหรับการแข่งขัน สอวน. ทั่วประเทศ ในทุกสาขาวิชา',
      260, 140, 190, 160
    );
    r2.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(9);

    const r3 = slide.insertTextBox(
      'ขั้นที่ 3: ระบบอัจฉริยะ\\nAI Assisted & Mobile\\nเสริมฟีเจอร์ AI ตรวจจับคะแนนผิดปกติ และพัฒนาแอปพลิเคชันสำหรับผู้เข้าร่วมแข่งขัน',
      470, 140, 190, 160
    );
    r3.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(9);

    const footer = slide.insertTextBox('ขอขอบพระคุณคณะกรรมการทุกท่าน — เปิดรับข้อเสนอแนะและถาม-ตอบ (Q&A)', 50, 330, 620, 30);
    footer.getText().getTextStyle().setForegroundColor('#F1F5F9').setFontSize(11).setBold(true);

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(
      'สรุปภาพรวมโครงการ ระบบ TMO พร้อมแล้วสำหรับการนำไปใช้งานจริงในการแข่งขัน TMO ครั้งที่ มจพ. เป็นเจ้าภาพ และพร้อมขยายผลสู่ระดับประเทศ ขอขอบพระคุณคณะกรรมการทุกท่าน และยินดีรับฟังข้อเสนอแนะครับ'
    );
  }

  Logger.log('Successfully created all 10 slides in the active Google Slides presentation!');
}
`;

fs.writeFileSync('c:\\tmo\\google_apps_script_tmo.js', gasScript);
console.log('Updated c:\\tmo\\google_apps_script_tmo.js (' + (gasScript.length / 1024).toFixed(1) + ' KB)');
