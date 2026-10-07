const fs = require('fs');

const assets = {
  archDiagram: 'c:/tmo/extracted_thesis_assets/obj_221_661x598.png',
  erDiagram: 'c:/tmo/extracted_thesis_assets/obj_407_421x787.png',
  chenErDiagram: 'c:/tmo/extracted_thesis_assets/obj_405_1376x820.png',
  swotDiagram: 'c:/tmo/extracted_thesis_assets/obj_296_1376x768.jpg',
  structureChart: 'c:/tmo/extracted_thesis_assets/obj_416_1256x792.png',
  queueBoard: 'c:/tmo/extracted_thesis_assets/obj_320_612x822.png',
  queueAdmin: 'c:/tmo/extracted_thesis_assets/obj_309_1300x587.jpg',
  committeeGrading: 'c:/tmo/extracted_thesis_assets/obj_347_1300x618.jpg',
  approvalSign: 'c:/tmo/extracted_thesis_assets/obj_349_1300x588.jpg',
  userPermissions: 'c:/tmo/extracted_thesis_assets/obj_377_1300x615.jpg',
  otpLogin: 'c:/tmo/extracted_thesis_assets/obj_306_1301x621.jpg',
  phoneLogin: 'c:/tmo/extracted_thesis_assets/obj_307_1297x621.jpg',
  scoreExport: 'c:/tmo/extracted_thesis_assets/obj_361_1300x589.jpg',
  schoolMgmt: 'c:/tmo/extracted_thesis_assets/obj_394_1300x616.png'
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
 * Google Apps Script for Generating TMO 22-Slide Academic Presentation
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
  
  const W = 720;
  const H = 405;

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

    const b = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40, 16, 180, 20);
    b.getFill().setSolidFill(DARK);
    b.getBorder().setTransparent();
    const bt = b.getText();
    bt.setText(badge);
    bt.getTextStyle().setForegroundColor(WHITE).setFontSize(8).setBold(true);

    const tb = slide.insertTextBox(title, 40, 38, 640, 30);
    tb.getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(15).setBold(true);

    if (subtitle) {
      const sub = slide.insertTextBox(subtitle, 40, 64, 640, 20);
      sub.getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);
    }
  }

  // 1. Cover
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DARK);

    const b = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 50, 45, 240, 25);
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
  }

  // 2. Background of TMO
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '1. BACKGROUND & ORIGIN', 'ความเป็นมาและความสำคัญของการแข่งขันคณิตศาสตร์โอลิมปิก (TMO)', 'บริบทการแข่งขันโอลิมปิกวิชาการของมูลนิธิ สอวน. เพื่อคัดเลือกตัวแทนประเทศไทยสู่ระดับนานาชาติ (IMO)');

    slide.insertTextBox(
      '• จุดเริ่มต้นการแข่งขัน (TMO): เริ่มจัดขึ้นครั้งแรกในปี พ.ศ. 2547 ณ คณะวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น เพื่อวัดศักยภาพผู้แทนนักเรียนจาก 16 ศูนย์ สอวน. ทั่วประเทศ (Chula tutor, 2563)\\n\\n' +
      '• มาตรฐานระดับสากล (IMO Benchmark): รูปแบบข้อสอบและเกณฑ์การให้คะแนนสอดคล้องกับ International Mathematical Olympiad แต่ละข้อมีน้ำหนัก 0-7 คะแนน\\n\\n' +
      '• ความซับซ้อนของผู้เกี่ยวข้อง (Stakeholders): มีทั้งกรรมการตรวจข้อสอบ (Examiner) จากมหาวิทยาลัยชั้นนำ, อาจารย์ผู้ควบคุมทีม (Team Leader) 16 ศูนย์, เจ้าหน้าที่ (Staff) และนักเรียนตัวแทนศูนย์',
      50, 95, 620, 260
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9.5);
  }

  // 3. Problem Statement
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '2. PROBLEM STATEMENT', 'ปัญหาของกระบวนการตรวจข้อสอบแบบดั้งเดิม (Paper-Based Grading)', 'ความเสี่ยงและอุปสรรคสำคัญที่เกิดขึ้นจากการจัดการตรวจข้อสอบแบบกระดาษในอดีต');

    slide.insertTextBox(
      '1. ความผิดพลาดจากการกรอกคะแนน (Human Error): การรวมคะแนนแบบกระดาษและการคีย์ซ้ำเสี่ยงต่อตัวเลขคลาดเคลื่อน ขาดระบบ Double-check อัตโนมัติ\\n\\n' +
      '2. คอขวดการหมุนเวียนคิว (Queue Bottleneck): กรรมการ 5 ท่านต้องตรวจข้อสอบของนักเรียนจาก 16 ศูนย์ เกิดความสับสนของลำดับคิวและเวลาว่างที่ไม่สัมพันธ์กัน\\n\\n' +
      '3. ความเสี่ยงข้อมูลรั่วไหล (Data Security Risk): คะแนนสอบอาจถูกบุคคลที่สามแอบถ่ายภาพหน้าจอหรือเอกสารหลุดออกไปก่อนประกาศผล\\n\\n' +
      '4. ขาดประวัติการตรวจสอบย้อนกลับ (No Audit Trail): เมื่อมีการแก้ไขคะแนน ไม่มีระบบบันทึกว่าใครแก้ไข เมื่อใด และด้วยเหตุผลใด',
      50, 95, 620, 260
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9.5);
  }

  // 4. Literature Review (5 papers)
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '3. LITERATURE REVIEW', 'การศึกษางานวิจัยที่เกี่ยวข้อง และการนำมาประยุกต์ใช้ในโครงงาน', 'ทบทวนวรรณกรรม 5 งานวิจัยสำคัญเพื่อเป็นฐานคิดในการพัฒนาระบบ TMO (บทที่ 2)');

    slide.insertTextBox(
      '1. ณัฐพล และคณะ (2568): ระบบคิวร้านอาหารผ่าน Web Browser (React + Node.js/Express)\\n' +
      '   -> นำมาใช้: สถาปัตยกรรมแบ่ง 3 ระดับ (ผู้ใช้ทั่วไป, ผู้ใช้หลัก, ผู้ดูแลระบบ) และการตัดขั้นตอนกระดาษ\\n\\n' +
      '2. ปวีณา และคณะ (2569): ระบบคิวบูรณาการเว็บและ LINE Chatbot\\n' +
      '   -> นำมาใช้: การจัดลำดับคิวและแจ้งเตือน Real-time เพื่อลดความแออัดและลดเวลารอคอย\\n\\n' +
      '3. สุพิพัฒน์ และคณะ (2569): ระบบ CMS ภาควิชาคอมพิวเตอร์ ม.ศิลปากร (3-Tier & RBAC)\\n' +
      '   -> นำมาใช้: 3-Tier Architecture และการควบคุมสิทธิ์ตามบทบาท (RBAC) ผ่าน RESTful API\\n\\n' +
      '4. สุดถนอม และคณะ (2568): ระบบคิวผู้ป่วยนอก รพ.ศรีนครินทร์ (Design Thinking + SDLC + QR)\\n' +
      '   -> นำมาใช้: การให้บุคคลทั่วไปและผู้ควบคุมทีมสแกน QR Code ติดตามคิวสดผ่านมือถือโดยไม่ต้องล็อกอิน\\n\\n' +
      '5. กาญจนา และ ศิริพร (2569): ลายเซ็นอิเล็กทรอนิกส์ในระบบจัดซื้อจัดจ้าง รพ.ศิริราช (SiSignDoc/PKI)\\n' +
      '   -> นำมาใช้: การลงลายมือชื่อดิจิทัลอัตโนมัติบนเอกสาร PDF และผลผูกพันทางกฎหมายตาม พ.ร.บ.ธุรกรรมฯ',
      50, 90, 620, 280
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 5. Legal Compliance
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '4. LEGAL FRAMEWORK', 'กรอบข้อกฎหมาย: พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544', 'การออกแบบระบบให้มีผลบังคับใช้ทางกฎหมายตามมาตรา 9 และมาตรา 26 (กาญจนา และ ศิริพร, 2569)');

    slide.insertTextBox(
      'องค์ประกอบ 4 ส่วนตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544:\\n\\n' +
      '1. การพิสูจน์ตัวตน (Digital Identity) [มาตรา 9 (1)]:\\nระบุตัวบุคคลเจ้าของลายมือชื่ออย่างชัดเจนผ่านกระบวนการยืนยันตัวตน 2FA ด้วย OTP 6 หลัก และระบบ RBAC\\n\\n' +
      '2. การแสดงเจตนา (Intent to Sign) [มาตรา 9 (2)]:\\nอาจารย์ผู้ควบคุมทีมกดปุ่ม อนุมัติและลงนาม ถือเป็นการแสดงเจตนายอมรับความถูกต้องของคะแนนชุดล่าสุด\\n\\n' +
      '3. ความครบถ้วนของข้อมูล (Data Integrity) [มาตรา 26]:\\nแปลงข้อมูลคะแนนและลายเซ็นเป็นไฟล์ PDF ที่ไม่สามารถแก้ไขได้ หากแก้ไขต้องผ่านการอนุมัติซ้ำและสร้างเอกสารฉบับใหม่\\n\\n' +
      '4. การประทับเวลา (Trusted Timestamp) [มาตรา 26 (4)]:\\nประทับวันและเวลามาตรฐานของเซิร์ฟเวอร์ลงบนเอกสาร PDF โดยไม่สามารถแก้ไขย้อนหลังได้',
      50, 90, 620, 280
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 6. SDLC & SWOT
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '5. SDLC & SWOT', 'ระเบียบวิธีวิจัยตาม SDLC 7 ขั้นตอน และการวิเคราะห์ SWOT', 'การประยุกต์ใช้วงจรพัฒนาระบบงาน (ธิตินนท์ และ ณัฐกร, 2566) ร่วมกับแผนภาพ SWOT จากเล่มวิจัย');

    slide.insertTextBox(
      'วงจรการพัฒนาระบบ 7 ขั้นตอน (SDLC):\\n' +
      '1. Problem Definition - ศึกษาคอขวด 16 ศูนย์\\n' +
      '2. System Analysis - Use Case & Activity Diagrams\\n' +
      '3. System Design - ER Model & UI Prototype\\n' +
      '4. Development - Next.js, NestJS, SQL Server\\n' +
      '5. Testing - Module, Component, Integration\\n' +
      '6. Implementation - นำขึ้น Server & แจกจ่าย QR\\n' +
      '7. Maintenance - ตรวจสอบ AuditLog ต่อเนื่อง',
      40, 95, 300, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    insertBase64Image(slide, 'swotDiagram', 360, 95, 320, 270);
  }

  // 7. System Scope & RBAC
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '6. SYSTEM SCOPE & RBAC', 'ขอบเขตของระบบและการควบคุมการเข้าถึงตามบทบาท (RBAC)', 'การแบ่งหน้าที่ความรับผิดชอบอย่างรัดกุมตามทฤษฎี RBAC (สุพิพัฒน์ และคณะ, 2569)');

    slide.insertTextBox(
      '1. ผู้ดูแลระบบ (Administrator) - สิทธิ์ระดับสูงสุด:\\nจัดการรอบการสอบ, เพิ่ม/แก้ไข/ลบศูนย์สอบ, จัดการสิทธิ์ผู้ใช้งาน, ควบคุมการเปิด-ปิดระบบให้คะแนน, ดูแล Audit Log ทั้งหมด\\n\\n' +
      '2. กรรมการตรวจ (Examiner) - สิทธิ์การประเมินผล:\\nรับคิวตรวจตามข้อสอบที่ได้รับมอบหมาย (1-5), กรอกคะแนนนักเรียน 6 คนต่อศูนย์ (0-7 คะแนน), บันทึกร่างคะแนน, ส่งคะแนนให้หัวหน้าทีมตรวจสอบ\\n\\n' +
      '3. อาจารย์ผู้ควบคุมทีม (Team Leader) - สิทธิ์การรับรองและลงนาม:\\nตรวจสอบคะแนนนักเรียนในศูนย์ตนเอง, อนุมัติและลงลายมือชื่อดิจิทัล (E-Sign), ขอแก้ไขคะแนน, ส่งออกรายงานผลคะแนน PDF/Excel\\n\\n' +
      '4. เจ้าหน้าที่ (Staff) & สาธารณะ - สิทธิ์สนับสนุน & อ่านอย่างเดียว:\\nเจ้าหน้าที่ช่วยจัดคิวในห้องตรวจ | บุคคลทั่วไปสแกน QR Code ดูบอร์ดคิวรวมแบบเรียลไทม์โดยไม่ต้องล็อกอิน',
      50, 90, 620, 280
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 8. Dialog Diagram
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '7. DIALOG DIAGRAM', 'แผนภาพแสดงลำดับการเชื่อมโยงของจอภาพ (Dialog Diagram)', 'ผังการนำทางและสถาปัตยกรรมสารสนเทศของระบบ TMO จากเล่มวิจัย (ภาพที่ 3-59)');

    insertBase64Image(slide, 'structureChart', 40, 95, 340, 270);

    slide.insertTextBox(
      'เส้นทางการนำทางของผู้ใช้งาน (Navigation Flow):\\n\\n' +
      '• 0. Login System: ยืนยันตัวตนด้วย OTP สู่ระบบ\\n' +
      '• 1. Dashboard: ศูนย์กลางกระจายคำสั่งไปยังโมดูลย่อย\\n' +
      '• 2. Queue: หน้าจอจัดการคิวและมอนิเตอร์สถานะตรวจ\\n' +
      '• 3. Score Entry: จอกรอกคะแนนพร้อมลายน้ำป้องกันแอบถ่าย\\n' +
      '• 8. Approval: จอหัวหน้าทีมตรวจทานและกดยืนยัน\\n' +
      '• 9. PDF Generation: สร้างเอกสารผลคะแนนทางการพร้อม E-Sign\\n' +
      '• 4. Score Table: ตารางสรุปคะแนนรวมแบบเรียลไทม์\\n' +
      '• 5-7. Settings: จัดการสิทธิ์ บัญชีผู้ใช้ และศูนย์ศึกษา 16 แห่ง',
      400, 95, 280, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 9. Full-Stack Architecture
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '8. FULL-STACK ARCHITECTURE', 'สถาปัตยกรรมเว็บแอปพลิเคชัน 3 ชั้น (3-Tier Web Architecture)', 'โครงสร้างเชื่อมโยงระบบ Front-end, API Gateway และ Back-end ตามภาพที่ 2-1 ในเล่มวิจัย');

    insertBase64Image(slide, 'archDiagram', 40, 95, 310, 270);

    slide.insertTextBox(
      'รายละเอียดเทคโนโลยีที่ใช้จริงในโครงการ:\\n\\n' +
      '• Presentation Tier (Front-end):\\nNext.js 16 (React 19) + Tailwind CSS v4, Lucide-react icons, Component-driven UI (Kantor, 2569; MDN, 2569)\\n\\n' +
      '• Application Tier (Back-end):\\nNestJS 11 + Node.js Engine, RESTful API, DTO Validation (class-validator), JWT Authentication (jose)\\n\\n' +
      '• Reporting & Security Engine:\\nPDFKit + ExcelJS + bcrypt + Noto Sans Thai Font เรนเดอร์เอกสารและประทับลายเซ็น/ลายน้ำอัตโนมัติ\\n\\n' +
      '• Data Tier (Database):\\nMicrosoft SQL Server 2022 (mssql driver) จัดเก็บตารางเชิงสัมพันธ์ตามหลัก 3NF พร้อม Transaction Control',
      370, 95, 310, 280
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 10. Real-time Engine
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '9. REAL-TIME ENGINE', 'กลไกการกระจายข้อมูลสถานะแบบเรียลไทม์ (Server-Sent Events: SSE)', 'เหตุผลทางวิศวกรรมในการเลือกใช้ SSE แทน WebSockets เพื่อความเสถียรและประหยัดทรัพยากร');

    slide.insertTextBox(
      'ทำไมระบบ TMO จึงเลือกใช้ Server-Sent Events (SSE) แทน WebSockets:\\n\\n' +
      '1. การสื่อสารแบบทิศทางเดียว (Unidirectional): เหมาะสม 100% กับการกระจายสถานะคิวจากเซิร์ฟเวอร์สู่จอภาพ\\n' +
      '2. ทำงานบน HTTP/1.1 และ HTTP/2 มาตรฐาน: ผ่านไฟร์วอลล์และพร็อกซีได้โดยไม่ต้องเปิดพอร์ตพิเศษ\\n' +
      '3. Reconnection อัตโนมัติ: เบราว์เซอร์มีกลไกต่อสัญญาณใหม่ทันทีหากเน็ตหลุด พร้อม Event ID ล่าสุด\\n' +
      '4. ประหยัด Memory & CPU: ใช้ Connection แบบ Lightweight ไม่เปลือง Handshake และ Socket overhead\\n' +
      '5. การนำไปใช้ในโค้ด: RxJS Subject ใน NestJS Broadcast สถานะคิวไปยังทุกจอภาพพร้อมกันทันที',
      50, 95, 620, 260
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9.5);
  }

  // 11. Auth & 2FA
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '10. FEATURE: AUTH & 2FA', 'การพิสูจน์ตัวตนด้วย OTP และการควบคุมเซสชัน (Two-Factor Authentication)', 'ขั้นตอนการตรวจสอบหมายเลขโทรศัพท์และส่งรหัส OTP 6 หลัก เพื่อเข้าถึงระบบอย่างปลอดภัย');

    insertBase64Image(slide, 'otpLogin', 40, 95, 310, 140);
    insertBase64Image(slide, 'phoneLogin', 40, 245, 310, 120);

    slide.insertTextBox(
      'กลไกความปลอดภัยของการเข้าสู่ระบบ:\\n\\n' +
      '• Whitelist Verification: ตรวจสอบเบอร์โทรศัพท์กับฐานข้อมูล User หากไม่มีชื่อจะปฏิเสธการเข้าถึงทันที\\n' +
      '• 6-Digit OTP via SMS: ส่งรหัส OTP 6 หลักที่สร้างขึ้นแบบสุ่ม มีอายุการใช้งานจำกัด 5 นาที\\n' +
      '• JWT Cryptographic Tokens: เมื่อยืนยัน OTP สำเร็จ ระบบจะออก Access Token และ Refresh Token ด้วยไลบรารี jose\\n' +
      '• Automatic Role Assignment: กำหนดบทบาทและสิทธิ์ให้อัตโนมัติตามศูนย์และข้อสอบที่ได้รับมอบหมาย\\n' +
      '• Session Timeout: ตัดเซสชันอัตโนมัติเมื่อไม่มีกิจกรรม เพื่อป้องกันบุคคลอื่นเข้าใช้งานเครื่องที่ค้างไว้',
      370, 95, 310, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 12. Queue Matrix Engine
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '11. FEATURE: QUEUE ENGINE', 'ระบบจัดสรรและหมุนเวียนคิวตรวจ (Intelligent Queue Matrix Engine)', 'อัลกอริทึมการกระจาย 16 ศูนย์ลง 5 ข้อสอบ และการสร้างสล็อตเวลา 15 นาที');

    insertBase64Image(slide, 'queueAdmin', 40, 95, 340, 180);
    slide.insertTextBox('หน้าจอ Admin จัดการคิวและสร้างตารางหมุนเวียน (ภาพที่ 3-6) กำหนดวันที่ เวลาเริ่ม และช่องละ 15 นาที', 40, 285, 340, 80)
      .getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);

    slide.insertTextBox(
      'หลักการทำงานของ Queue Matrix:\\n\\n' +
      '• Conflict-Free Rotation: หมุนเวียนตารางแบบ Matrix ทำให้ไม่มีศูนย์สอบใดต้องเข้าตรวจ 2 ข้อสอบพร้อมกันในสล็อตเวลาเดียวกัน\\n' +
      '• 15-Minute Dynamic Slot: ออกแบบตามความเร็วเฉลี่ยในการตรวจข้อสอบอัตนัยของกรรมการแต่ละข้อ\\n' +
      '• Queue State Transitions: คิวมี 3 สถานะ ได้แก่ WAITING, IN_PROGRESS, DONE\\n' +
      '• Queue Claiming & Releasing: กรรมการสามารถกด รับตรวจ เพื่อล็อกคิว และมีปุ่ม คืนคิว หากติดปัญหา\\n' +
      '• Real-time SSE Push: บอร์ดรวมอัปเดตสถานะทันทีเมื่อมีการเปลี่ยนสถานะ',
      400, 95, 280, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 13. Live Queue Board
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '12. FEATURE: LIVE QUEUE BOARD', 'ตารางคิวรวม 16 ศูนย์ และหน้าจอแสดงผลสาธารณะ (Public Board)', 'การแสดงผลสถานะคิวแบบเรียลไทม์ พร้อมตราสัญลักษณ์ศูนย์ สอวน. ทั้ง 16 แห่ง และ QR Code');

    insertBase64Image(slide, 'queueBoard', 40, 95, 300, 275);

    slide.insertTextBox(
      'จุดเด่นของตารางคิวรวม (ภาพที่ 3-10):\\n\\n' +
      '• แสดงตราสัญลักษณ์ศูนย์ สอวน. ทั้ง 16 แห่ง (CMU, BUU, PSUPN, KKU, KMUTNB, MWIT ฯลฯ)\\n' +
      '• สีระบุสถานะชัดเจน: สีเหลือง = รอตรวจ, สีฟ้า = กำลังตรวจ, สีเขียว = ตรวจเสร็จแล้ว\\n' +
      '• Zero-Auth QR Access: บุคคลทั่วไปและนักเรียนสามารถสแกน QR Code เพื่อดูคิวได้ทันทีโดยไม่ต้องมีบัญชีผู้ใช้\\n' +
      '• สรุปสถานะด้านล่าง: รอตรวจกี่รายการ กำลังตรวจกี่รายการ และตรวจเสร็จแล้วกี่รายการ จากทั้งหมด 80 รายการตรวจ',
      360, 95, 320, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9);
  }

  // 14. Grading & Watermark
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '13. FEATURE: GRADING & WATERMARK', 'หน้าจอกรรมการตรวจข้อสอบ และลายน้ำความปลอดภัย (Watermark)', 'ระบบกรอกคะแนนนักเรียน 6 คนต่อศูนย์ พร้อมเทคโนโลยี Tiled Watermark ป้องกันการแอบถ่าย');

    insertBase64Image(slide, 'committeeGrading', 40, 95, 330, 160);
    slide.insertTextBox('หน้าจอบันทึกคะแนนข้อสอบ (ภาพที่ 3-25) กรอกคะแนนนักเรียน 6 คน พร้อมปุ่มบันทึกร่างและส่งตรวจทาน', 40, 265, 330, 100)
      .getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);

    slide.insertTextBox(
      'เทคโนโลยี Dynamic Tiled Watermark:\\n\\n' +
      '• ปัญหาเดิม: ความเสี่ยงที่บุคคลภายนอกหรือผู้ตรวจจะถ่ายภาพหน้าจอคะแนนไปเผยแพร่ก่อนเวลาอันควร\\n' +
      '• กลไกป้องกัน: เรนเดอร์ข้อความลายน้ำแบบเอียง ซ้อนทับทั่วทั้งหน้าจอด้วย CSS Canvas / SVG Overlay\\n' +
      '• ระบุตัวตนแบบเรียลไทม์: ลายน้ำจะสลัก ชื่อกรรมการ + รหัสศูนย์ + วันเวลาปัจจุบัน ลงบนทุกจุดของหน้าจอ\\n' +
      '• ป้องปรามการรั่วไหล (Traceability): หากมีภาพหลุดออกไป สามารถสืบหาต้นตอของผู้ถ่ายภาพได้ทันที 100%\\n' +
      '• ไม่รบกวนสายตา: ปรับค่า Opacity โปร่งใส 8-12% ทำให้ตรวจคะแนนได้ตามปกติ',
      390, 95, 290, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 15. Approval & Digital Signature
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '14. FEATURE: E-SIGNATURE', 'กระบวนการอนุมัติและลงนามดิจิทัลตามกฎหมาย (Digital Signature)', 'การตรวจสอบผลคะแนนโดยอาจารย์ผู้ควบคุมทีม และการประทับลายมือชื่อดิจิทัลอัตโนมัติบน PDF');

    insertBase64Image(slide, 'approvalSign', 40, 95, 330, 160);
    slide.insertTextBox('หน้าจออนุมัติคะแนนและลงนาม (ภาพที่ 3-26) แสดงคะแนนนักเรียน 6 คน พร้อมปุ่ม อนุมัติและลงนาม', 40, 265, 330, 100)
      .getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);

    slide.insertTextBox(
      'กระบวนการสร้างเอกสารรับรองคะแนน PDF:\\n\\n' +
      '1. Intent to Sign: อาจารย์ผู้ควบคุมทีมตรวจทานคะแนนแล้วกด อนุมัติและลงนาม\\n' +
      '2. Signature Merging: ระบบดึงภาพลายเซ็นจริงของกรรมการผู้ตรวจและหัวหน้าทีมที่อัปโหลดไว้มาประทับอัตโนมัติ\\n' +
      '3. PDFKit Rendering: สร้างเอกสาร PDF ทางการตามฟอร์แมตเอกสาร สอวน. พร้อมประทับตรา มจพ.\\n' +
      '4. Server-Side Timestamping: ฝังวันเวลาและรหัส Hash กำกับเอกสาร ป้องกันการแก้ไขย้อนหลัง\\n' +
      '5. Instant Update: อัปเดตตารางสรุปคะแนนรวม และปลดล็อกให้ศูนย์เข้าสู่คิวข้อถัดไป',
      390, 95, 290, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 16. Score Edit Workflow
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '15. FEATURE: SCORE EDIT', 'กระบวนการขอแก้ไขคะแนน และการอนุมัติซ้ำ (Score Edit Workflow)', 'ขั้นตอนการขอแก้ไขคะแนนเมื่อพบข้อผิดพลาด พร้อมระบบ Two-Tier Approval เพื่อความโปร่งใส');

    slide.insertTextBox(
      'ขั้นตอนการขอแก้ไขคะแนน (Activity Diagram 3-28):\\n\\n' +
      '1. การยื่นคำขอ: หากกรรมการหรืออาจารย์พบข้อผิดพลาด จะกดปุ่ม ขอแก้ไขคะแนน พร้อมระบุเหตุผล\\n' +
      '2. จัดเก็บคะแนนเดิม: ตาราง ScoreEditRequest จะบันทึก OldValue, NewValue, Reason และผู้ขอยื่นเรื่อง\\n' +
      '3. การพิจารณาอนุมัติซ้ำ: อาจารย์ผู้ควบคุมทีมและกรรมการต้องร่วมกันพิจารณาความสมเหตุสมผล\\n' +
      '4. การสร้าง PDF ฉบับใหม่: เมื่ออนุมัติ ระบบจะสร้างเอกสาร PDF ฉบับปรับปรุงใหม่พร้อม Timestamp ล่าสุด\\n' +
      '5. บันทึก Audit Log อัตโนมัติ: บันทึกว่าใครเป็นผู้อนุมัติการแก้ไข เพื่อความโปร่งใส 100%',
      40, 95, 310, 270
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);

    insertBase64Image(slide, 'scoreExport', 370, 95, 310, 200);
    slide.insertTextBox('ตารางแสดงคะแนนภายหลังการแก้ไข (ภาพที่ 3-33) สามารถส่งออกเป็น Excel และ PDF ได้ทันที', 370, 305, 310, 60)
      .getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);
  }

  // 17. Audit Logging
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '16. FEATURE: AUDIT LOGS', 'ระบบบันทึกประวัติการกระทำย้อนหลัง (Comprehensive Audit Trail)', 'ความโปร่งใสระดับองค์กร บันทึกทุกคำขอ ทุกการเปลี่ยนสถานะ และทุกคะแนนที่ถูกแก้ไขลงฐานข้อมูล');

    slide.insertTextBox(
      '1. ตาราง AuditLog เชิงลึก (ตารางที่ 3-10):\\nเก็บ AuditLogId (UUID), UserId, Action (CREATE, UPDATE, DELETE), EntityType, EntityId, OldValue, NewValue, CreatedAt\\n\\n' +
      '2. Immutable Record (ห้ามแก้ไข/ลบ):\\nสิทธิ์การเข้าถึง AuditLog เป็นแบบ Read-only แม้แต่ผู้ดูแลระบบก็ไม่สามารถแก้ไขหรือลบประวัติย้อนหลังได้ เพื่อใช้เป็นหลักฐานทางกฎหมาย\\n\\n' +
      '3. เก็บบันทึกภาพก่อนและหลังแก้ไข (Delta Tracking):\\nบันทึกข้อมูลแบบ Snapshots ทั้งค่าคะแนนเดิม (OldValue) และค่าคะแนนใหม่ (NewValue) ทำให้เปรียบเทียบความแตกต่างได้อย่างละเอียด\\n\\n' +
      '4. Admin Audit Viewer Interface:\\nแอดมินสามารถเปิดดูไทม์ไลน์การทำงานของกรรมการทุกคน กรองตามศูนย์สอบ หรือตามหมายเลขข้อสอบเพื่อตรวจสอบความผิดปกติได้ทันที',
      50, 95, 620, 260
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(9);
  }

  // 18. Admin Management
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '17. FEATURE: ADMIN MGMT', 'การบริหารจัดการข้อมูลศูนย์ สอวน. 16 แห่ง และสิทธิ์ผู้ใช้งาน', 'หน้าจอควบคุมระบบหลังบ้านสำหรับผู้ดูแลระบบในการจัดการศูนย์สอบและอัปโหลดลายเซ็นดิจิทัล');

    insertBase64Image(slide, 'userPermissions', 40, 95, 310, 160);
    slide.insertTextBox('หน้าจอจัดการสิทธิ์และลายเซ็น (ภาพที่ 3-41) แสดงรายชื่อผู้ใช้และปุ่มอัปโหลดลายเซ็นเฉพาะตัว', 40, 265, 310, 100)
      .getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);

    insertBase64Image(slide, 'schoolMgmt', 370, 95, 310, 160);
    slide.insertTextBox('หน้าจอจัดการข้อมูลศูนย์ศึกษา 16 แห่ง (ภาพที่ 3-50) กำหนดชื่อ รหัสโรงเรียน และข้อมูลผู้ประสานงาน', 370, 265, 310, 100)
      .getText().getTextStyle().setForegroundColor(TEXT_MUTED).setFontSize(8.5);
  }

  // 19. Conceptual ER Diagram (Chen Model)
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '18. DATA MODEL: CONCEPTUAL', 'แบบจำลองความสัมพันธ์ข้อมูลเชิงแนวคิด (Conceptual ER Diagram)', 'แผนภาพความสัมพันธ์เอนทิตี แอตทริบิวต์ และคาร์ดินัลลิตี้จากบทที่ 3 (ภาพที่ 3-57)');

    insertBase64Image(slide, 'chenErDiagram', 40, 95, 640, 220);

    slide.insertTextBox(
      'องค์ประกอบสำคัญของแบบจำลอง ER (Chen Model):\\n' +
      '• Strong Entity: School, User, QueueItem, Student | Weak Entity: Score, ScoreEditRequest\\n' +
      '• Cardinality: School-User (1:M), School-Student (1:M), QueueItem-Score (1:M), User-Score (Judges 1:M)',
      50, 325, 620, 50
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 20. Relational Schema & Data Dictionary
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '19. DATA MODEL: RELATIONAL', 'โครงสร้างฐานข้อมูลเชิงสัมพันธ์และพจนานุกรมข้อมูล (Relational Schema)', 'แผนภาพความสัมพันธ์ 9 ตารางหลักใน Microsoft SQL Server จากบทที่ 3 (ภาพที่ 3-58)');

    insertBase64Image(slide, 'erDiagram', 40, 95, 300, 275);

    slide.insertTextBox(
      'สรุป 9 ตารางสำคัญตามหลัก Third Normal Form (3NF):\\n\\n' +
      '1. User: UserId (PK), Username, PasswordHash, DisplayName, Role, SchoolId\\n' +
      '2. School: SchoolId (PK), Name, Code, CreatedAt\\n' +
      '3. CommitteeAssignment: CommitteeAssignmentId (PK), UserId, ProblemNumber\\n' +
      '4. QueueItem: QueueItemId (PK), SchoolId, ProblemNumber, Status, Position\\n' +
      '5. Score: ScoreId (PK), QueueItemId, JudgeId, Value, StudentId\\n' +
      '6. Student: StudentId (PK), StudentCode, SeqNo, Name, SchoolId\\n' +
      '7. ScoreEditRequest: ScoreEditRequestId (PK), ScoreId, RequestedBy, Reason\\n' +
      '8. CompetitionSettings: CompetitionSettingsId (PK), ScoringLocked, LockedBy\\n' +
      '9. AuditLog: AuditLogId (PK), UserId, Action, EntityType, OldValue, NewValue',
      360, 95, 320, 280
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8);
  }

  // 21. System Testing & QA
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(GRAY_BG);
    addHeader(slide, '20. SYSTEM TESTING & QA', 'กลยุทธ์การทดสอบระบบ 3 ระดับ (Testing Strategy & QA)', 'การประกันคุณภาพระบบก่อนการใช้งานจริงตามระเบียบวิธีวิจัยในบทที่ 3 (หัวข้อ 3.5)');

    slide.insertTextBox(
      'ระดับที่ 1: การทดสอบระดับโมดูล (Module Test)\\n' +
      '• ทดสอบระบบสร้างและส่ง OTP 6 หลัก และการหมดอายุใน 5 นาที\\n' +
      '• ทดสอบอัลกอริทึมคำนวณคิวหมุนเวียน 15 นาทีของ Queue Matrix\\n' +
      '• ทดสอบการสร้างไฟล์ PDF ทางการด้วย PDFKit และการประทับลายเซ็น/ลายน้ำ\\n' +
      '• Unit Tests ฝั่ง Backend: 33 Test Suites (271 Tests ผ่านทั้งหมด 100%)\\n\\n' +
      'ระดับที่ 2: การทดสอบระดับคอมโพเนนต์ (Component Test)\\n' +
      '• ทดสอบการรับส่งข้อมูลผ่าน RESTful API และการแมปปิ้ง DTO Validation\\n' +
      '• ทดสอบการกระจายสัญญาณ Real-time ผ่าน Server-Sent Events (SSE)\\n' +
      '• Component Tests ฝั่ง Frontend: 14 Test Files (136 Tests ผ่านทั้งหมด 100%)\\n\\n' +
      'ระดับที่ 3: การทดสอบเงื่อนไขข้อยกเว้น (Exception & Integration Test)\\n' +
      '• ทดสอบการพยายามข้ามสิทธิ์ของผู้ใช้งาน (RBAC Privilege Escalation Testing)\\n' +
      '• ทดสอบกรณีอาจารย์ผู้ควบคุมทีมปฏิเสธการอนุมัติคะแนน (Reject Flow)\\n' +
      '• ทดสอบการป้อนคะแนนเกินเกณฑ์ (ติดลบหรือเกิน 7 คะแนน) และการล็อกระบบเมื่อสิ้นสุดการแข่งขัน',
      50, 90, 620, 280
    ).getText().getTextStyle().setForegroundColor(TEXT_DARK).setFontSize(8.5);
  }

  // 22. FINAL SLIDE: Q&A
  {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DARK);

    const b = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 50, 50, 180, 25);
    b.getFill().setSolidFill(RED);
    b.getBorder().setTransparent();
    b.getText().setText('คำถามและข้อเสนอแนะ').getTextStyle().setForegroundColor(WHITE).setFontSize(9).setBold(true);

    const t = slide.insertTextBox('Questions & Answers (Q&A)', 50, 90, 620, 60);
    t.getText().getTextStyle().setForegroundColor(WHITE).setFontSize(28).setBold(true);

    const sub = slide.insertTextBox('ขอขอบพระคุณคณะกรรมการทุกท่านที่ให้เกียรติรับฟังการนำเสนอโครงงานพิเศษ\\nคณะผู้จัดทำยินดีรับฟังทุกข้อเสนอแนะเพื่อนำไปพัฒนาต่อยอดระบบให้สมบูรณ์ยิ่งขึ้นครับ', 50, 155, 620, 50);
    sub.getText().getTextStyle().setForegroundColor('#94A3B8').setFontSize(11);

    const contact = slide.insertTextBox(
      'ข้อมูลติดต่อและภาควิชา:\\n' +
      '• คณะผู้จัดทำ: นายทินณภัทร ปั้นคง, นายวสุศิลป์ ลี้นิธิเจริญกิจ, นางสาวอิสริยาภรณ์ มงคลิก\\n' +
      '• อาจารย์ที่ปรึกษา: อาจารย์ ดร.ชัยยศ กำธรเจริญ\\n' +
      '• สาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\\n' +
      '  คณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)',
      50, 230, 620, 120
    );
    contact.getText().getTextStyle().setForegroundColor('#F1F5F9').setFontSize(10);
  }

  Logger.log('Successfully created all 22 slides in Google Slides!');
}
`;

fs.writeFileSync('c:\\tmo\\google_apps_script_tmo.js', gasScript);
console.log('Successfully written updated 22-slide GAS to c:\\tmo\\google_apps_script_tmo.js (' + (gasScript.length / 1024).toFixed(1) + ' KB)');
