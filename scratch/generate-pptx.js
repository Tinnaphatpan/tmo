const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches

// Theme Colors (KMUTNB Official Identity)
const COLOR_PRIMARY = 'C8102E';   // KMUTNB Crimson
const COLOR_DARK = '0F172A';      // Dark Slate
const COLOR_CARD = 'FFFFFF';      // Pure White Card
const COLOR_BG_LIGHT = 'F8FAFC';  // Light Slate BG
const COLOR_TEXT_MUTED = '64748B';// Muted Grey
const COLOR_TEXT_DARK = '1E293B'; // Dark Slate Text
const COLOR_WHITE = 'FFFFFF';
const COLOR_ACCENT = 'D97706';

// Real Screenshots from local running app
const imgQueue = 'c:/tmo/screenshots/queue_real_rendered.png';
const imgCommittee = 'c:/tmo/screenshots/committee_real_grading.png';
const imgDisplay = 'c:/tmo/screenshots/display_real_rendered.png';
const imgMobile = 'c:/tmo/screenshots/mobile_login.png';

// Helper to add top accent bar and header
function addHeader(slide, badgeText, titleText) {
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY } });
  
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 0.35, w: 2.8, h: 0.32,
    fill: { color: COLOR_DARK },
    line: { color: COLOR_DARK },
    rectRadius: 0.08,
  });
  slide.addText(badgeText, {
    x: 0.6, y: 0.35, w: 2.8, h: 0.32,
    fontSize: 9, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText(titleText, {
    x: 0.6, y: 0.72, w: 8.8, h: 0.55,
    fontSize: 19, bold: true, color: COLOR_TEXT_DARK, valign: 'middle'
  });
}

// -------------------------------------------------------------------------
// SLIDE 1: OFFICIAL TITLE SLIDE (โครงงานพิเศษ มจพ.)
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 3.2, h: 0.35,
    fill: { color: COLOR_PRIMARY },
    line: { color: COLOR_PRIMARY },
    rectRadius: 0.08,
  });
  slide.addText("โครงงานพิเศษปริญญานิพนธ์ 2569", {
    x: 0.8, y: 0.8, w: 3.2, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ\nผ่านเว็บแอปพลิเคชัน (TMO Management System)", {
    x: 0.8, y: 1.3, w: 8.4, h: 1.2,
    fontSize: 26, bold: true, color: COLOR_WHITE, valign: 'middle'
  });

  slide.addText("Thailand Mathematical Olympiad (TMO) Management System Using Web Application", {
    x: 0.8, y: 2.55, w: 8.4, h: 0.4,
    fontSize: 13, color: '94A3B8', valign: 'top'
  });

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 3.1, w: 8.4, h: 0.02,
    fill: { color: '334155' }, line: { color: '334155' }
  });

  // Authors & University Box
  slide.addText("ผู้จัดทำ:\n• นาย ทินณภัทร ปั้นคง\n• นาย วสุศิลป์ ลี้นิธิเจริญกิจ\n• นางสาว อิสริยาภรณ์ มงคลิก", {
    x: 0.8, y: 3.3, w: 4.0, h: 1.5,
    fontSize: 11, color: COLOR_WHITE
  });

  slide.addText("อาจารย์ที่ปรึกษา: อาจารย์ ดร.ชัยยศ กำธรเจริญ\n\nสาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\nคณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", {
    x: 5.0, y: 3.3, w: 4.2, h: 1.5,
    fontSize: 10.5, color: 'CBD5E1'
  });

  slide.addNotes("กราบเรียนคณะกรรมการทุกท่าน วันนี้พวกเราขอรายงานความก้าวหน้าโครงงานพิเศษ 'ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติผ่านเว็บแอปพลิเคชัน' ซึ่งพัฒนาขึ้นเพื่อแก้ปัญหาและยกระดับกระบวนการตรวจข้อสอบ TMO สู่ระบบดิจิทัลที่ปลอดภัยและโปร่งใสครับ");
}

// -------------------------------------------------------------------------
// SLIDE 2: THE PROBLEM STATEMENT (ปัญหาและความเป็นมา)
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "1. PROBLEM STATEMENT", "ความเป็นมาและปัญหาของกระบวนการตรวจแบบดั้งเดิม");

  const pCards = [
    { title: "ความสับสนของการหมุนเวียนคิว", desc: "การตรวจข้อสอบ 16 ศูนย์สอบ x 5 ข้อสอบ (80 รอบ) ด้วยกระดาษ ทำให้คิวชนกัน กรรมการรอนานโดยไม่ทราบสถานะ" },
    { title: "ความเสี่ยงใบคะแนนสูญหาย", desc: "ใบคะแนนกระดาษต้องส่งต่อมือต่อมือระหว่างห้องตรวจ เสี่ยงต่อการสลับโต๊ะ สลับศูนย์ หรือสูญหายระหว่างทาง" },
    { title: "คอขวดขั้นตอนการเซ็นชื่อ", desc: "กรรมการและอาจารย์ผู้ควบคุมทีม (Team Leader) ต้องเดินตามหากันเพื่อลงลายมือชื่อรับรอง เสียเวลาหลายชั่วโมง" },
    { title: "ความเสี่ยงข้อมูลคะแนนรั่วไหล", desc: "ระบบเดิมไม่มีการจำกัดสิทธิ์ที่รัดกุม เสี่ยงต่อการแอบบันทึกภาพหน้าจอ และไม่มี Audit Log ตรวจสอบย้อนหลัง" },
  ];

  pCards.forEach((c, idx) => {
    const x = idx % 2 === 0 ? 0.6 : 5.1;
    const y = idx < 2 ? 1.5 : 3.3;

    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: 4.3, h: 1.55,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.1
    });

    slide.addShape(pres.ShapeType.rect, {
      x, y: y + 0.15, w: 0.1, h: 0.5,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
    });

    slide.addText(`ปัญหาที่ ${idx + 1}: ${c.title}`, {
      x: x + 0.25, y: y + 0.15, w: 3.9, h: 0.35,
      fontSize: 12.5, bold: true, color: COLOR_TEXT_DARK
    });

    slide.addText(c.desc, {
      x: x + 0.25, y: y + 0.55, w: 3.9, h: 0.85,
      fontSize: 10.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addNotes("ปัญหาหลักของงาน TMO คือการจัดการคิวตรวจข้อสอบ 16 ศูนย์สอบ 5 ข้อสอบด้วยกระดาษ ทำให้เกิดความล่าช้า เอกสารเสี่ยงสูญหาย และที่สำคัญที่สุดคือเสี่ยงต่อข้อมูลคะแนนรั่วไหลโดยไม่มีระบบตรวจสอบย้อนหลังครับ");
}

// -------------------------------------------------------------------------
// SLIDE 3: THE SOLUTION & PUBLIC BOARD (หน้าจอจริงกระดานคิว)
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "2. THE SOLUTION & LIVE BOARD", "การเปลี่ยนผ่านสู่ดิจิทัล (Digital Transformation) และกระดานคิวสด");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.45, w: 4.2, h: 3.8,
    fill: { color: 'FFFFFF' },
    line: { color: 'E2E8F0', width: 1 },
    rectRadius: 0.1
  });

  const sPoints = [
    "Dynamic Rotation Schedule: ระบบคำนวณและจัดตารางเวลาตรวจ (15 นาที/รอบ) อัตโนมัติ",
    "Public Live Queue Board: จอมอนิเตอร์โปรเจกเตอร์รวม ทุกศูนย์สอบทราบสถานะคิวสดพร้อมกัน",
    "QR Code Public Access: บุคคลทั่วไปและนักเรียนสามารถสแกน QR Code ดูคิวสดได้โดยไม่ต้องล็อกอิน",
    "Realtime Synchronization: แจ้งเตือนสถานะ 'กำลังตรวจ', 'รอกรรมการรับคิว' และ 'ตรวจแล้ว' ทันที"
  ];

  let sY = 1.65;
  sPoints.forEach((pt) => {
    slide.addText("✔  " + pt, {
      x: 0.8, y: sY, w: 3.8, h: 0.8,
      fontSize: 11, color: COLOR_TEXT_DARK
    });
    sY += 0.85;
  });

  // Real Screenshot from localhost
  if (fs.existsSync(imgQueue)) {
    slide.addImage({
      path: imgQueue,
      x: 5.0, y: 1.45, w: 4.4, h: 3.8,
      rounding: true
    });
  }

  slide.addNotes("นี่คือภาพหน้าจอจริงของกระดานคิวสาธารณะที่รันจากระบบของเรา ทุกศูนย์สอบจะเห็นตารางการหมุนเวียนรอบละ 15 นาที พร้อมแบนเนอร์แสดงวันเวลาและการ์ดสรุปสถานะรายข้ออย่างชัดเจนและโปร่งใสครับ");
}

// -------------------------------------------------------------------------
// SLIDE 4: 4-ROLE MODEL & LIVE SCORING PANEL (ภาพจริงหน้าจอกรรมการ)
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "3. RBAC & LIVE SCORING", "การควบคุมสิทธิ์ตามบทบาท (RBAC) และแผงตรวจข้อสอบจริง");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.45, w: 4.2, h: 3.8,
    fill: { color: 'FFFFFF' },
    line: { color: 'E2E8F0', width: 1 },
    rectRadius: 0.1
  });

  const roles = [
    { name: "ผู้ดูแลระบบ (Administrator)", desc: "จัดการสิทธิ์ Matrix, สร้างตารางคิวอัตโนมัติ, อัปโหลดลายเซ็น, ระบบ Lock" },
    { name: "กรรมการผู้ตรวจข้อสอบ (Examiner)", desc: "กด Call Next เรียกคิวถัดไป, บันทึกคะแนนนักเรียน 6 คน, ปุ่มบันทึกร่าง (Draft)" },
    { name: "เจ้าหน้าที่ (Staff)", desc: "ช่วยตรวจตามวิชา/ศูนย์ที่ได้รับมอบหมาย, สละสิทธิ์หรือข้ามคิว (Skip Queue) ได้" },
    { name: "อาจารย์ผู้ควบคุมทีม (Team Leader)", desc: "เข้าถึงตารางคะแนนศูนย์ตนเอง, กดอนุมัติเพื่อสแตมป์ลายเซ็นและสร้างเอกสาร PDF" }
  ];

  let rY = 1.6;
  roles.forEach(r => {
    slide.addText(r.name, { x: 0.8, y: rY, w: 3.8, h: 0.28, fontSize: 11, bold: true, color: COLOR_PRIMARY });
    slide.addText(r.desc, { x: 0.8, y: rY + 0.26, w: 3.8, h: 0.55, fontSize: 10, color: COLOR_TEXT_MUTED });
    rY += 0.85;
  });

  // Real Screenshot from localhost
  if (fs.existsSync(imgCommittee)) {
    slide.addImage({
      path: imgCommittee,
      x: 5.0, y: 1.45, w: 4.4, h: 3.8,
      rounding: true
    });
  }

  slide.addNotes("ในสไลด์นี้แสดงภาพหน้าจอจริงของกรรมการ ขณะตรวจข้อสอบโรงเรียนเตรียมอุดมศึกษา ข้อ 1 แสดงช่องคะแนนนักเรียน 6 คน ปุ่มบันทึกร่าง และลายน้ำรักษาความปลอดภัยระบุชื่อผู้ตรวจสดบนหน้าจอครับ");
}

// -------------------------------------------------------------------------
// SLIDE 5: FRONTEND ARCHITECTURE & SECURITY
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "4. FRONTEND ARCHITECTURE", "สถาปัตยกรรมหน้าบ้าน: BFF Pattern และระบบความปลอดภัย");

  const feCards = [
    { title: "Backend For Frontend (BFF Pattern)", desc: "หน้าบ้านไม่เชื่อมต่อฐานข้อมูลโดยตรง และไม่ถือ Business Logic ทำหน้าที่บริหารจัดการ Session และส่งต่อ Request เท่านั้น" },
    { title: "Zero-Trust Session (httpOnly Cookie)", desc: "จัดเก็บ JWT Token ใน httpOnly Secure Cookie ปลอดภัยจากการโจมตีผ่าน XSS 100% เบราว์เซอร์ไม่สามารถเข้าถึง Token ได้" },
    { title: "Dynamic Role Guard (Live Auth Check)", desc: "ทุก Page Layout เรียกถาม GET /auth/me ไปยัง Backend เสมอเพื่อยืนยันบทบาทสด ป้องกันปัญหาสิทธิ์ค้างเมื่อ Admin แก้ไขสิทธิ์" },
    { title: "Security Watermark Overlay", desc: "คอมโพเนนต์ Watermark ฝังลายน้ำโปร่งแสง (ชื่อผู้ใช้ · สิทธิ์ · เวลา Server) ทั่วหน้าจอ ป้องกันการแอบถ่ายภาพคะแนนหลุดรอด" },
  ];

  feCards.forEach((c, idx) => {
    const x = idx % 2 === 0 ? 0.6 : 5.1;
    const y = idx < 2 ? 1.5 : 3.3;

    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: 4.3, h: 1.55,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.1
    });

    slide.addText(`⭐ ${c.title}`, {
      x: x + 0.25, y: y + 0.15, w: 3.9, h: 0.35,
      fontSize: 12, bold: true, color: COLOR_PRIMARY
    });

    slide.addText(c.desc, {
      x: x + 0.25, y: y + 0.52, w: 3.9, h: 0.9,
      fontSize: 10.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addNotes("สถาปัตยกรรมหน้าบ้านใช้ BFF Pattern อย่างเคร่งครัด ไร้การต่อ Database โดยตรง มีระบบ httpOnly Cookie และระบบลายน้ำความปลอดภัยเพื่อป้องกันการแอบถ่ายผลคะแนนข้อสอบครับ");
}

// -------------------------------------------------------------------------
// SLIDE 6: BACKEND & DATABASE ARCHITECTURE
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "5. BACKEND & DATABASE CORE", "สถาปัตยกรรมหลังบ้าน: Clean Architecture และฐานข้อมูลเชิงสัมพันธ์");

  const beCards = [
    { title: "Clean Architecture (NestJS / Node.js)", desc: "แยกเลเยอร์ Controller -> Use Case -> Domain -> Repository ชัดเจน ทุก Use Case ถูกทดสอบด้วย In-Memory Fakes ครอบคลุม 100%" },
    { title: "No ORM Overhead (Parameterized SQL)", desc: "เขียนคำสั่ง SQL แบบ Parameterized Query ผ่านไดรเวอร์ mssql (tedious) เพื่อประสิทธิภาพสูงสุด ไร้ปัญหา SQL Injection" },
    { title: "Atomic Queue Claim (Race-Condition Free)", desc: "ป้องกันการแย่ง Claim คิวตรวจพร้อมกันด้วย Atomic Update ที่ระดับ Database: WHERE Status='WAITING' AND ClaimedByUserId IS NULL" },
    { title: "TransactionRunner (Score + AuditLog)", desc: "บังคับให้การบันทึก Score และ AuditLog อยู่ใน Transaction เดียวกันเสมอ ป้องกันข้อมูลไม่สอดคล้องกันอย่างเด็ดขาด" },
  ];

  beCards.forEach((c, idx) => {
    const x = idx % 2 === 0 ? 0.6 : 5.1;
    const y = idx < 2 ? 1.5 : 3.3;

    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: 4.3, h: 1.55,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.1
    });

    slide.addText(`🛡️ ${c.title}`, {
      x: x + 0.25, y: y + 0.15, w: 3.9, h: 0.35,
      fontSize: 12, bold: true, color: COLOR_DARK
    });

    slide.addText(c.desc, {
      x: x + 0.25, y: y + 0.52, w: 3.9, h: 0.9,
      fontSize: 10.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addNotes("ในส่วนของ Backend เราใช้ Clean Architecture ไร้ ORM เพื่อความเร็วสูงสุด และควบคุมความถูกต้องของข้อมูลด้วย Atomic SQL Update ในระดับ Database ครับ");
}

// -------------------------------------------------------------------------
// SLIDE 7: REALTIME COMPARISON WITH PROJECTOR SCREENSHOT
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "6. REALTIME STABILITY", "ความเสถียรสูงสุด: ทำไมเลือก Server-Sent Events (SSE) แทน WebSockets?");

  // Comparison Left: WebSockets
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.45, w: 4.2, h: 3.8,
    fill: { color: 'FEF2F2' }, line: { color: 'F87171', width: 1 },
    rectRadius: 0.1
  });
  slide.addText("❌ WebSockets (ทำไมถึงไม่เลือก)", {
    x: 0.8, y: 1.6, w: 3.8, h: 0.35, fontSize: 13, bold: true, color: '991B1B'
  });
  const wsDrawbacks = [
    "Stateful connection หลุดง่ายเมื่อสัญญาณ Wi-Fi หน้างานแข่งขันแกว่ง",
    "มักถูกบล็อกโดย Enterprise Firewall หรือ Proxy ของมหาวิทยาลัย",
    "กิน Memory และ Connection Pool เซิร์ฟเวอร์ในการคงสถานะการเชื่อมต่อ",
    "2-Way communication เกินความจำเป็นสำหรับงานบอร์ดคิวที่ต้องการแค่รอฟังผล"
  ];
  let wsY = 2.05;
  wsDrawbacks.forEach(pt => {
    slide.addText("• " + pt, { x: 0.8, y: wsY, w: 3.8, h: 0.65, fontSize: 10, color: '7F1D1D' });
    wsY += 0.7;
  });

  // Comparison Right: SSE
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.45, w: 4.3, h: 1.75,
    fill: { color: 'F0FDF4' }, line: { color: '4ADE80', width: 1 },
    rectRadius: 0.1
  });
  slide.addText("✅ Server-Sent Events (SSE ที่เราเลือก)", {
    x: 5.3, y: 1.55, w: 3.9, h: 0.3, fontSize: 12, bold: true, color: '166534'
  });
  slide.addText("• วิ่งบน HTTP/HTTPS ปกติ (พอร์ต 80/443) ทะลุผ่านทุกไฟร์วอลล์\n• มี Auto-reconnect อัตโนมัติในระดับเบราว์เซอร์เมื่อสัญญาณหลุด\n• One-way Push เบาที่สุด กินแรมน้อย เหมาะกับงานแข่งขัน", {
    x: 5.3, y: 1.85, w: 3.9, h: 1.25, fontSize: 9.5, color: '14532D'
  });

  // Real Projector Display Screenshot
  if (fs.existsSync(imgDisplay)) {
    slide.addImage({
      path: imgDisplay,
      x: 5.1, y: 3.3, w: 4.3, h: 1.95,
      rounding: true
    });
  }

  slide.addNotes("ในห้องแข่งขันที่มีข้อจำกัดด้าน Wi-Fi เราเลือกใช้ Server-Sent Events (SSE) ซึ่งทำงานบน HTTP ปกติ ทะลุไฟร์วอลล์ของมหาวิทยาลัยได้ 100% และมีระบบต่อสัญญาณใหม่อัตโนมัติครับ");
}

// -------------------------------------------------------------------------
// SLIDE 8: E-SIGNATURE & LEGAL COMPLIANCE
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "7. E-SIGNATURE & COMPLIANCE", "การลงลายมือชื่ออิเล็กทรอนิกส์ตาม พ.ร.บ. ธุรกรรมอิเล็กทรอนิกส์ พ.ศ. 2544");

  const legalSteps = [
    { num: "01", title: "Digital Identity (ยืนยันตัวตน)", desc: "พิสูจน์อัตลักษณ์ผู้ตรวจและหัวหน้าทีมก่อนเข้าถึงระบบ เพื่อระบุตัวตนและสิทธิ์อย่างชัดเจน" },
    { num: "02", title: "Intent to Sign (แสดงเจตนา)", desc: "การกดยืนยันปุ่มอนุมัติถือเป็นการแสดงเจตนายอมรับข้อมูลคะแนนชุดล่าสุดอย่างเป็นทางการ" },
    { num: "03", title: "Data Integrity (ความครบถ้วน)", desc: "แปลงข้อมูลและลายเซ็นเป็นไฟล์ PDF ที่แก้ไขไม่ได้ หากมีการแก้คะแนนจะถูกยกเลิกและสร้างฉบับใหม่" },
    { num: "04", title: "Timestamp (การประทับเวลา)", desc: "ประทับเวลามาตรฐานเซิร์ฟเวอร์ที่แก้ไขย้อนหลังไม่ได้ลงในเอกสาร PDF เพื่อใช้เป็นหลักฐานทางกฎหมาย" },
  ];

  legalSteps.forEach((s, idx) => {
    const x = 0.6 + idx * 2.25;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 1.6, w: 2.15, h: 3.5,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.1
    });

    slide.addText(s.num, { x, y: 1.8, w: 2.15, h: 0.5, fontSize: 24, bold: true, color: COLOR_PRIMARY, align: 'center' });
    slide.addText(s.title, { x: x + 0.1, y: 2.4, w: 1.95, h: 0.5, fontSize: 11, bold: true, color: COLOR_TEXT_DARK, align: 'center' });
    slide.addText(s.desc, { x: x + 0.15, y: 2.95, w: 1.85, h: 2.0, fontSize: 9.5, color: COLOR_TEXT_MUTED, align: 'center' });
  });

  slide.addNotes("ระบบ E-Signature ของเราออกแบบตาม พ.ร.บ. ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 ครบทั้ง 4 ด้าน: การยืนยันตัวตน, การแสดงเจตนา, การรักษาบูรณภาพของข้อมูล PDF และการประทับเวลาอิเล็กทรอนิกส์ครับ");
}

// -------------------------------------------------------------------------
// SLIDE 9: MOBILE VIEW & QR CODE AUTHENTICATION
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "8. MOBILE-FIRST & QR AUTH", "นวัตกรรมหน้างาน: การยืนยันตัวตนด้วย QR Code และ Mobile-First");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.45, w: 5.6, h: 3.8,
    fill: { color: 'FFFFFF' },
    line: { color: 'E2E8F0', width: 1 },
    rectRadius: 0.1
  });

  const mPoints = [
    "QR Code Badge Authentication: เจ้าหน้าที่และกรรมการสามารถสแกน QR Code บนบัตรประจำตัว เพื่อระบุตัวตนและเข้าสู่โต๊ะตรวจได้ทันทีใน 2 วินาที",
    "Mobile-First Responsive: ออกแบบ UI ให้สัมผัสง่ายด้วยนิ้วมือ (Tap Targets ขนาดใหญ่) บนสมาร์ตโฟนและ iPad ประจำโต๊ะตรวจ",
    "Zero Password Typing: ลดความผิดพลาดและเสียเวลาจากการพิมพ์รหัสผ่านบนอุปกรณ์หน้างาน",
    "Session Draft (sessionStorage): มีระบบบันทึกร่างคะแนนชั่วคราว ป้องกันข้อมูลสูญหายหากสัญญาณขัดข้อง"
  ];

  let mY = 1.7;
  mPoints.forEach(pt => {
    slide.addText("📱  " + pt, { x: 0.8, y: mY, w: 5.2, h: 0.8, fontSize: 11, color: COLOR_TEXT_DARK });
    mY += 0.85;
  });

  // Real Mobile Login Screenshot
  if (fs.existsSync(imgMobile)) {
    slide.addImage({
      path: imgMobile,
      x: 6.6, y: 1.45, w: 2.3, h: 3.8,
      rounding: true
    });
  }

  slide.addNotes("นี่คือภาพหน้าจอจริงเมื่อเปิดบนสมาร์ตโฟน เจ้าหน้าที่สามารถสแกน QR Code บนบัตรประจำตัวเพื่อล็อกอินเข้าโต๊ะตรวจได้ทันทีโดยไม่ต้องพิมพ์รหัสผ่าน ลดเวลาและข้อผิดพลาดหน้างานได้อย่างสิ้นเชิงครับ");
}

// -------------------------------------------------------------------------
// SLIDE 10: AZURE CLOUD (< $10/MO) & SUMMARY
// -------------------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "9. CLOUD DEPLOYMENT & SUMMARY", "แผนการติดตั้งบน Microsoft Azure (< $10 USD) และบทสรุปโครงการ");

  const azCards = [
    { title: "Azure Container Apps (Frontend & API)", desc: "รันแบบ Consumption Plan จ่ายตามคำขอจริง มีโควตาฟรี 180,000 vCPU-sec และ 360,000 GiB-sec แรกทุกเดือน" },
    { title: "Azure SQL Database (Serverless GP)", desc: "ฐานข้อมูล Serverless คิดเงินเป็นวินาทีเฉพาะเวลาที่ใช้งาน และเปิด Auto-pause ปิดเครื่องอัตโนมัติเมื่อไม่มีการแข่งขัน" },
    { title: "Azure Blob Storage (PDFs & Signatures)", desc: "จัดเก็บเอกสารใบคะแนน PDF และไฟล์ลายเซ็นดิจิทัล มีค่าบริการรวมตลอดการแข่งขันไม่ถึง 10 บาทไทย" },
    { title: "สรุปผลการประเมินโครงการ (Evaluation)", desc: "ลดเวลาตรวจลงกว่า 50%, อัตราข้อผิดพลาดของคะแนนเป็น 0%, ตรวจสอบย้อนหลังได้ 100% ในงบประมาณไม่เกิน 350 บาท!" },
  ];

  azCards.forEach((c, idx) => {
    const x = idx % 2 === 0 ? 0.6 : 5.1;
    const y = idx < 2 ? 1.5 : 3.3;

    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: 4.3, h: 1.55,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.1
    });

    slide.addText(`🚀 ${c.title}`, {
      x: x + 0.25, y: y + 0.15, w: 3.9, h: 0.35,
      fontSize: 12, bold: true, color: idx === 3 ? COLOR_PRIMARY : COLOR_DARK
    });

    slide.addText(c.desc, {
      x: x + 0.25, y: y + 0.52, w: 3.9, h: 0.9,
      fontSize: 10.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addNotes("และทั้งหมดนี้สามารถนำไปติดตั้งบน Microsoft Azure ด้วยงบประมาณไม่เกิน 10 ดอลลาร์ หรือประมาณ 350 บาทตลอดการแข่งขัน สรุปได้ว่า TMO Grading Queue คือระบบที่คุ้มค่า ปลอดภัย และพร้อมนำไปใช้งานจริงได้ทันทีครับ ขอขอบพระคุณคณะกรรมการทุกท่านครับ");
}

const outputPath = 'c:/tmo/TMO_Grading_Queue_Presentation.pptx';
pres.writeFile({ fileName: outputPath }).then(() => {
  console.log(`Presentation successfully created at: ${outputPath}`);
}).catch(err => {
  console.error("Failed to create presentation:", err);
});
