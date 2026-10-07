const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches (16:9 widescreen)

// Colors
const COLOR_PRIMARY = 'C8102E';   // KMUTNB Crimson Red
const COLOR_DARK = '0F172A';      // Dark Slate Header & Card
const COLOR_BG_LIGHT = 'F8FAFC';  // Light Slate Background
const COLOR_CARD = 'FFFFFF';      // Pure White Card
const COLOR_TEXT_MUTED = '64748B';// Muted Grey
const COLOR_TEXT_DARK = '1E293B'; // Dark Slate Text
const COLOR_WHITE = 'FFFFFF';
const COLOR_BORDER = 'E2E8F0';
const COLOR_GREEN = '15803D';
const COLOR_BLUE = '1D4ED8';
const COLOR_ACCENT = 'D97706';

// Asset Paths
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
  schoolMgmt: 'c:/tmo/extracted_thesis_assets/obj_394_1300x616.png',
  liveDisplay: 'c:/tmo/screenshots/display_real_rendered.png'
};

// Header Helper with Top Interactive Navigation Bar (Triggers)
function addHeader(slide, badgeText, titleText, subtitleText = '', currentSlideIndex = 0) {
  // Top Primary Bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
  });

  // Section Badge
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 0.22, w: 2.5, h: 0.26,
    fill: { color: COLOR_DARK }, line: { color: COLOR_DARK },
    rectRadius: 0.06
  });
  slide.addText(badgeText, {
    x: 0.6, y: 0.22, w: 2.5, h: 0.26,
    fontSize: 8, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  // Interactive Trigger Quick Nav (Pill buttons linking across sections)
  const navItems = [
    { label: "📋 ปัญหา", slide: 3 },
    { label: "📚 วิจัย", slide: 4 },
    { label: "⚖️ กฎหมาย", slide: 5 },
    { label: "🏗️ สถาปัตยกรรม", slide: 9 },
    { label: "⚡ ระบบคิว", slide: 12 },
    { label: "✍️ ตรวจสอบ", slide: 14 },
    { label: "📜 E-Sign", slide: 15 },
    { label: "🗄️ DB", slide: 20 },
    { label: "❓ Q&A", slide: 22 }
  ];

  navItems.forEach((item, idx) => {
    const nx = 3.25 + (idx * 0.72);
    slide.addShape(pres.ShapeType.roundRect, {
      x: nx, y: 0.22, w: 0.68, h: 0.26,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.05
    });
    slide.addText(item.label, {
      x: nx, y: 0.22, w: 0.68, h: 0.26,
      fontSize: 7.5, bold: true, color: COLOR_TEXT_DARK, align: 'center', valign: 'middle',
      hyperlink: { slide: item.slide }
    });
  });

  // Slide Title
  slide.addText(titleText, {
    x: 0.6, y: 0.52, w: 8.8, h: 0.38,
    fontSize: 16.5, bold: true, color: COLOR_TEXT_DARK, valign: 'middle'
  });

  if (subtitleText) {
    slide.addText(subtitleText, {
      x: 0.6, y: 0.88, w: 8.8, h: 0.22,
      fontSize: 9, color: COLOR_TEXT_MUTED, valign: 'middle'
    });
  }
}

// Return-to-Architecture Trigger Button Helper
function addReturnTrigger(slide, x = 7.3, y = 5.2, targetSlide = 9, label = "🔙 กลับสู่ผังรวม") {
  slide.addShape(pres.ShapeType.roundRect, {
    x: x, y: y, w: 2.1, h: 0.3,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.06
  });
  slide.addText(label, {
    x: x, y: y, w: 2.1, h: 0.3,
    fontSize: 8.5, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle',
    hyperlink: { slide: targetSlide }
  });
}

// =========================================================================
// SLIDE 1: COVER SLIDE
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.65, w: 3.6, h: 0.35,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("โครงงานพิเศษปริญญานิพนธ์ ปีการศึกษา 2569", {
    x: 0.8, y: 0.65, w: 3.6, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ\nผ่านเว็บแอปพลิเคชัน (TMO Management System)", {
    x: 0.8, y: 1.15, w: 8.4, h: 1.25,
    fontSize: 24, bold: true, color: COLOR_WHITE, valign: 'middle'
  });

  slide.addText("Thailand Mathematical Olympiad (TMO) Management System Using Web Application", {
    x: 0.8, y: 2.45, w: 8.4, h: 0.35,
    fontSize: 12, color: '94A3B8', valign: 'top'
  });

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 2.9, w: 8.4, h: 0.02,
    fill: { color: '334155' }, line: { color: '334155' }
  });

  slide.addText("คณะผู้จัดทำ:\n• นาย ทินณภัทร ปั้นคง (รหัสนักศึกษา 64-040626-3603-4)\n• นาย วสุศิลป์ ลี้นิธิเจริญกิจ (รหัสนักศึกษา 64-040626-3627-1)\n• นางสาว อิสริยาภรณ์ มงคลิก (รหัสนักศึกษา 64-040626-3635-2)", {
    x: 0.8, y: 3.1, w: 4.5, h: 1.6,
    fontSize: 10, color: COLOR_WHITE, lineSpacing: 18
  });

  slide.addText("อาจารย์ที่ปรึกษาโครงงาน:\n• อาจารย์ ดร.ชัยยศ กำธรเจริญ\n\nสาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\nคณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", {
    x: 5.4, y: 3.1, w: 4.0, h: 1.6,
    fontSize: 9.5, color: 'CBD5E1', lineSpacing: 17
  });

  // Start Presentation Trigger Button
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 4.9, w: 3.0, h: 0.45,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("▶ เริ่มต้นการนำเสนอ (คลิกเพื่อเริ่ม)", {
    x: 0.8, y: 4.9, w: 3.0, h: 0.45,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle',
    hyperlink: { slide: 2 }
  });

  slide.addNotes("กราบเรียนท่านคณะกรรมการทุกท่าน วันนี้กลุ่มของพวกเราขอรายงานความก้าวหน้าโครงงานพิเศษ ระบบบริหารจัดการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติผ่านเว็บแอปพลิเคชัน ครับ");
}

// =========================================================================
// SLIDE 2: BACKGROUND & ORIGIN OF TMO
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "1. BACKGROUND & ORIGIN", "ความเป็นมาและความสำคัญของการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ (TMO)", "บริบทการแข่งขันโอลิมปิกวิชาการของมูลนิธิ สอวน. เพื่อคัดเลือกตัวแทนประเทศไทยสู่ระดับนานาชาติ (IMO)");

  const cards = [
    { title: "จุดเริ่มต้นการแข่งขัน (TMO)", desc: "เริ่มต้นแข่งขันครั้งแรกในปี พ.ศ. 2547 ณ คณะวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น เพื่อวัดศักยภาพผู้แทนนักเรียนจาก 16 ศูนย์ สอวน. ทั่วประเทศ (Chula tutor, 2563)" },
    { title: "มาตรฐานระดับสากล (IMO Benchmark)", desc: "รูปแบบข้อสอบและเกณฑ์การให้คะแนนสอดคล้องกับ International Mathematical Olympiad (IMO) แต่ละข้อมีน้ำหนักคะแนน 0-7 คะแนน" },
    { title: "ความซับซ้อนของผู้เกี่ยวข้อง (Stakeholders)", desc: "มีผู้เข้าร่วมหลากหลายบทบาท ทั้งกรรมการตรวจข้อสอบ (Examiner) จากมหาวิทยาลัยชั้นนำ, อาจารย์ผู้ควบคุมทีม (Team Leader) 16 ศูนย์, เจ้าหน้าที่ (Staff) และนักเรียนตัวแทนศูนย์" }
  ];

  cards.forEach((c, idx) => {
    const y = 1.25 + (idx * 1.2);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: y, w: 8.8, h: 1.05,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0.6, y: y, w: 0.1, h: 1.05,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
    });
    slide.addText(c.title, {
      x: 0.9, y: y + 0.1, w: 8.3, h: 0.35,
      fontSize: 10.5, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(c.desc, {
      x: 0.9, y: y + 0.45, w: 8.3, h: 0.52,
      fontSize: 9, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.0, 3, "ถัดไป: ปัญหาเดิม ➔");
}

// =========================================================================
// SLIDE 3: PROBLEM STATEMENT
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "2. PROBLEM STATEMENT", "ปัญหาของกระบวนการตรวจข้อสอบแบบดั้งเดิม (Paper-Based Grading)", "ความเสี่ยงและอุปสรรคสำคัญที่เกิดขึ้นจากการจัดการตรวจข้อสอบแบบกระดาษในอดีต");

  const problems = [
    { title: "ความผิดพลาดจากการรวมคะแนนด้วยมือ (Human Error)", desc: "การรวมคะแนนลงบนกระดาษและการคีย์ซ้ำลงตารางสรุป เสี่ยงต่อตัวเลขคลาดเคลื่อน ขาดระบบตรวจทานผลรวมอัตโนมัติ" },
    { title: "จุดติดขัดและการรอคิวสะสม (คอขวดที่ทำให้งานชะงัก)", desc: "ข้อสอบจาก 16 ศูนย์ส่งเข้ามาพร้อมกัน แต่โต๊ะตรวจมีจำกัด ทำให้งานกระจุกตัว เกิดการรอคิวยาวนานและเสียเวลาโดยเปล่าประโยชน์" },
    { title: "ความเสี่ยงข้อมูลคะแนนรั่วไหล (Data Security Risk)", desc: "คะแนนสอบอาจถูกแอบถ่ายภาพหรือเอกสารหลุดออกไปก่อนประกาศผลอย่างเป็นทางการ ขาดการควบคุมการเข้าถึงที่รัดกุม" },
    { title: "ขาดประวัติการตรวจสอบย้อนหลัง (No Audit Trail)", desc: "เมื่อมีการแก้ไขคะแนน ไม่มีระบบบันทึกว่าใครเป็นคนแก้ แก้เมื่อไหร่ และแก้เพราะอะไร ทำให้ตรวจสอบความโปร่งใสได้ยาก" }
  ];

  problems.forEach((p, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.6 + (col * 4.5);
    const y = 1.3 + (row * 1.8);

    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: y, w: 4.3, h: 1.65,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.rect, {
      x: x, y: y, w: 4.3, h: 0.06,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
    });
    slide.addText(p.title, {
      x: x + 0.2, y: y + 0.15, w: 3.9, h: 0.35,
      fontSize: 10, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(p.desc, {
      x: x + 0.2, y: y + 0.5, w: 3.9, h: 0.95,
      fontSize: 8.5, color: COLOR_TEXT_MUTED, lineSpacing: 14
    });
  });

  addReturnTrigger(slide, 7.3, 5.0, 4, "ถัดไป: วิจัยอ้างอิง ➔");
}

// =========================================================================
// SLIDE 4: LITERATURE REVIEW (5 งานวิจัยอ้างอิง)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "3. LITERATURE REVIEW", "การศึกษางานวิจัยที่เกี่ยวข้อง และการนำมาประยุกต์ใช้ในโครงงาน", "ทบทวนวรรณกรรม 5 งานวิจัยสำคัญเพื่อเป็นฐานคิดในการพัฒนาระบบ TMO (บทที่ 2)");

  const papers = [
    { author: "ณัฐพล และคณะ (2568)", topic: "ระบบคิวร้านอาหารผ่าน Web Browser (React + Node.js/Express)", adapt: "นำมาใช้: สถาปัตยกรรมแบ่ง 3 ระดับ (ผู้ใช้ทั่วไป, ผู้ใช้หลัก, ผู้ดูแลระบบ) และการตัดขั้นตอนกระดาษ" },
    { author: "ปวีณา และคณะ (2569)", topic: "ระบบคิวบูรณาการเว็บและ LINE Chatbot", adapt: "นำมาใช้: การจัดลำดับคิวและแจ้งเตือน Real-time เพื่อลดความแออัดและลดเวลารอคอย" },
    { author: "สุพิพัฒน์ และคณะ (2569)", topic: "ระบบ CMS ภาควิชาคอมพิวเตอร์ ม.ศิลปากร (3-Tier & RBAC)", adapt: "นำมาใช้: 3-Tier Architecture และการควบคุมสิทธิ์ตามบทบาท (RBAC) ผ่าน RESTful API" },
    { author: "สุดถนอม และคณะ (2568)", topic: "ระบบคิวผู้ป่วยนอก รพ.ศรีนครินทร์ (Design Thinking + SDLC + QR)", adapt: "นำมาใช้: การให้บุคคลทั่วไปและผู้ควบคุมทีมสแกน QR Code ติดตามคิวสดผ่านมือถือโดยไม่ต้องล็อกอิน" },
    { author: "กาญจนา และ ศิริพร (2569)", topic: "ลายเซ็นอิเล็กทรอนิกส์ในระบบจัดซื้อจัดจ้าง รพ.ศิริราช (SiSignDoc/PKI)", adapt: "นำมาใช้: การลงลายมือชื่อดิจิทัลอัตโนมัติบนเอกสาร PDF และผลผูกพันทางกฎหมายตาม พ.ร.บ.ธุรกรรมฯ" }
  ];

  papers.forEach((p, idx) => {
    const y = 1.25 + (idx * 0.74);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: y, w: 8.8, h: 0.68,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(p.author + " : " + p.topic, {
      x: 0.8, y: y + 0.05, w: 8.4, h: 0.26,
      fontSize: 9, bold: true, color: COLOR_DARK
    });
    slide.addText(p.adapt, {
      x: 0.8, y: y + 0.32, w: 8.4, h: 0.3,
      fontSize: 8, color: COLOR_PRIMARY
    });
  });

  addReturnTrigger(slide, 7.3, 5.05, 5, "ถัดไป: ข้อกฎหมาย ➔");
}

// =========================================================================
// SLIDE 5: LEGAL FRAMEWORK
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "4. LEGAL FRAMEWORK", "กรอบข้อกฎหมาย: พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544", "การออกแบบระบบให้มีผลบังคับใช้ทางกฎหมายตามมาตรา 9 และมาตรา 26 (กาญจนา และ ศิริพร, 2569)");

  const legalBoxes = [
    { num: "1", title: "การพิสูจน์ตัวตน (Digital Identity)", law: "มาตรา 9 (1)", desc: "ระบุตัวบุคคลเจ้าของลายมือชื่ออย่างชัดเจนผ่านกระบวนการยืนยันตัวตน 2FA ด้วย OTP 6 หลัก และระบบ Role-Based Access Control (RBAC)" },
    { num: "2", title: "การแสดงเจตนา (Intent to Sign)", law: "มาตรา 9 (2)", desc: "อาจารย์ผู้ควบคุมทีมกดปุ่ม 'อนุมัติและลงนาม' ถือเป็นการแสดงเจตนายอมรับความถูกต้องของคะแนนสอบชุดล่าสุดอย่างเป็นทางการ" },
    { num: "3", title: "ความครบถ้วนของข้อมูล (Data Integrity)", law: "มาตรา 26", desc: "แปลงข้อมูลคะแนนและลายเซ็นเป็นไฟล์ PDF ที่ไม่สามารถแก้ไขได้ หากมีการแก้ไขต้องผ่านการอนุมัติซ้ำและสร้างเอกสารฉบับใหม่แทนที่" },
    { num: "4", title: "การประทับเวลา (Trusted Timestamp)", law: "มาตรา 26 (4)", desc: "ประทับวันและเวลามาตรฐานของเซิร์ฟเวอร์ลงบนเอกสาร PDF โดยไม่สามารถแก้ไขย้อนหลังได้ เพื่อใช้เป็นหลักฐานการทำธุรกรรม" }
  ];

  legalBoxes.forEach((b, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.6 + (col * 4.5);
    const y = 1.3 + (row * 1.8);

    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: y, w: 4.3, h: 1.65,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: x + 0.15, y: y + 0.15, w: 0.38, h: 0.28,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }, rectRadius: 0.04
    });
    slide.addText(b.num, {
      x: x + 0.15, y: y + 0.15, w: 0.38, h: 0.28,
      fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
    });
    slide.addText(`${b.title} [${b.law}]`, {
      x: x + 0.62, y: y + 0.15, w: 3.5, h: 0.28,
      fontSize: 9.5, bold: true, color: COLOR_DARK
    });
    slide.addText(b.desc, {
      x: x + 0.2, y: y + 0.52, w: 3.9, h: 1.0,
      fontSize: 8.5, color: COLOR_TEXT_MUTED, lineSpacing: 14
    });
  });

  addReturnTrigger(slide, 7.3, 5.0, 6, "ถัดไป: SDLC & SWOT ➔");
}

// =========================================================================
// SLIDE 6: SDLC & SWOT ANALYSIS
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "5. SDLC & SWOT", "ระเบียบวิธีวิจัยตาม SDLC 7 ขั้นตอน และการวิเคราะห์ SWOT", "การประยุกต์ใช้วงจรพัฒนาระบบงาน (ธิตินนท์ และ ณัฐกร, 2566) ร่วมกับแผนภาพ SWOT จากเล่มวิจัย");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.2, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("วงจรการพัฒนาระบบ 7 ขั้นตอน (SDLC)", {
    x: 0.8, y: 1.4, w: 3.8, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });

  const sdlcSteps = [
    "1. ศึกษาปัญหาและความล่าช้า (Problem Definition) - วิเคราะห์จุดติดขัด 16 ศูนย์",
    "2. วิเคราะห์ขั้นตอนการทำงาน (System Analysis) - จัดทำขั้นตอนงานและบทบาทผู้ใช้",
    "3. ออกแบบระบบและหน้าจอ (System Design) - ออกแบบฐานข้อมูล & หน้าจอให้ใช้ง่าย",
    "4. พัฒนาระบบโปรแกรม (System Development) - สร้างหน้าเว็บและระบบคำนวณอัตโนมัติ",
    "5. ตรวจสอบความถูกต้อง (System Testing) - ทดสอบความถูกต้องของคะแนนและสิทธิ์",
    "6. ติดตั้งและเริ่มใช้งาน (System Implementation) - ติดตั้งระบบจริง & แจกจ่าย QR Code",
    "7. ดูแลและติดตามผล (System Maintenance) - ตรวจสอบประวัติการใช้งานอย่างต่อเนื่อง"
  ];

  sdlcSteps.forEach((s, idx) => {
    slide.addText(s, {
      x: 0.8, y: 1.8 + (idx * 0.44), w: 3.8, h: 0.38,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.0, y: 1.3, w: 4.4, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("แผนภาพ SWOT Analysis จากเล่มวิจัย (ภาพที่ 3-1)", {
    x: 5.2, y: 1.4, w: 4.0, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.swotDiagram,
    x: 5.15, y: 1.75, w: 4.1, h: 2.9,
    sizing: { type: 'contain' }
  });
}

// =========================================================================
// SLIDE 7: SYSTEM SCOPE & RBAC
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "6. SYSTEM SCOPE & RBAC", "ขอบเขตของระบบและการควบคุมการเข้าถึงตามบทบาท (RBAC)", "การแบ่งหน้าที่ความรับผิดชอบอย่างรัดกุมตามทฤษฎี RBAC (สุพิพัฒน์ และคณะ, 2569)");

  const roles = [
    { name: "1. ผู้ดูแลระบบ (Administrator)", perm: "สิทธิ์ระดับสูงสุด", desc: "จัดการรอบการสอบ, เพิ่ม/แก้ไข/ลบข้อมูลศูนย์สอบ, จัดการสิทธิ์ผู้ใช้งาน, ควบคุมการเปิด-ปิดระบบให้คะแนน (CompetitionSettings), ดูแล Audit Log ทั้งหมด" },
    { name: "2. กรรมการตรวจ (Examiner)", perm: "สิทธิ์การประเมินผล", desc: "รับคิวตรวจตามข้อสอบที่ได้รับมอบหมาย (1-5), กรอกคะแนนนักเรียน 6 คนต่อศูนย์ (0-7 คะแนน), บันทึกร่างคะแนน, ส่งคะแนนให้อาจารย์ผู้ควบคุมทีมตรวจสอบ" },
    { name: "3. อาจารย์ผู้ควบคุมทีม (Team Leader)", perm: "สิทธิ์การรับรองและลงนาม", desc: "ตรวจสอบคะแนนนักเรียนในศูนย์ของตนเอง, อนุมัติและลงลายมือชื่อดิจิทัล (E-Sign), ขอแก้ไขคะแนนกรณีพบข้อผิดพลาด, ส่งออกรายงานผลคะแนน PDF/Excel" },
    { name: "4. เจ้าหน้าที่ (Staff) & สาธารณะ", perm: "สิทธิ์สนับสนุน & อ่านอย่างเดียว", desc: "เจ้าหน้าที่: ช่วยจัดคิวและประสานงานห้องตรวจ | บุคคลทั่วไป: สแกน QR Code ดูบอร์ดคิวรวมแบบเรียลไทม์โดยไม่ต้องล็อกอินเข้าสู่ระบบ" }
  ];

  roles.forEach((r, idx) => {
    const y = 1.25 + (idx * 0.92);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: y, w: 8.8, h: 0.85,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(`${r.name} - ${r.perm}`, {
      x: 0.8, y: y + 0.06, w: 8.4, h: 0.26,
      fontSize: 9.5, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(r.desc, {
      x: 0.8, y: y + 0.32, w: 8.4, h: 0.45,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.05, 8, "ถัดไป: Dialog Diagram ➔");
}

// =========================================================================
// SLIDE 8: DIALOG DIAGRAM
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "7. DIALOG DIAGRAM", "แผนภาพแสดงลำดับการเชื่อมโยงของจอภาพ (Dialog Diagram)", "ผังการนำทางและสถาปัตยกรรมสารสนเทศของระบบ TMO จากเล่มวิจัย (ภาพที่ 3-59)");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.8, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("Dialog Diagram ผังการเชื่อมโยงหน้าจอ (จากเล่มวิจัย)", {
    x: 0.8, y: 1.4, w: 4.4, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.structureChart,
    x: 0.75, y: 1.75, w: 4.5, h: 3.1,
    sizing: { type: 'contain' }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.6, y: 1.3, w: 3.8, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("เส้นทางการนำทางของผู้ใช้งาน (Navigation Flow)", {
    x: 5.8, y: 1.4, w: 3.4, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });

  const flows = [
    "• 0. Login System: ประตูทางเข้าหลัก ยืนยันตัวตนด้วย OTP",
    "• 1. Dashboard: ศูนย์กลางกระจายคำสั่งไปยังโมดูลย่อย",
    "• 2. Queue: หน้าจอจัดการคิวและมอนิเตอร์สถานะตรวจ",
    "• 3. Score Entry: จอกรอกคะแนนพร้อมลายน้ำป้องกันแอบถ่าย",
    "• 8. Approval: จอหัวหน้าทีมตรวจทานและกดยืนยัน",
    "• 9. PDF Generation: สร้างเอกสารผลคะแนนทางการพร้อม E-Sign",
    "• 4. Score Table: ตารางสรุปคะแนนรวมแบบเรียลไทม์",
    "• 5-7. Settings: จัดการสิทธิ์ บัญชีผู้ใช้ และศูนย์ศึกษา 16 แห่ง"
  ];

  flows.forEach((f, idx) => {
    slide.addText(f, {
      x: 5.8, y: 1.8 + (idx * 0.38), w: 3.4, h: 0.35,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.0, 9, "ถัดไป: สถาปัตยกรรม ➔");
}

// =========================================================================
// SLIDE 9: FULL-STACK ARCHITECTURE (INTERACTIVE TRIGGER HUB)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "8. FULL-STACK ARCHITECTURE", "สถาปัตยกรรมเว็บแอปพลิเคชัน 3 ชั้น (Interactive Trigger Hub)", "คลิกที่แต่ละบล็อกสถาปัตยกรรมด้านขวา เพื่อกระโดดไปดูเจาะลึกฟีเจอร์และโค้ดจริงทันที");

  // Left: Thesis Architecture Diagram
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.2, h: 3.8,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("TMO Web Application Architecture (ภาพที่ 2-1)", {
    x: 0.8, y: 1.4, w: 3.8, h: 0.3,
    fontSize: 10, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.archDiagram,
    x: 0.75, y: 1.75, w: 3.9, h: 3.1,
    sizing: { type: 'contain' }
  });

  // Right: Interactive Clickable Trigger Cards
  const interactiveTriggers = [
    { title: "⚛️ Presentation Tier: Next.js 16 (React 19) + Tailwind CSS", desc: "คลิกเพื่อดู: หน้าจอกรรมการตรวจและ Dynamic Watermark", targetSlide: 14, color: COLOR_PRIMARY },
    { title: "⚡ Real-time Stream Engine: Server-Sent Events (SSE)", desc: "คลิกเพื่อดู: การวิเคราะห์ SSE vs WebSockets", targetSlide: 10, color: COLOR_BLUE },
    { title: "⏱️ Queue Management Engine: 15-Minute Matrix Rotation", desc: "คลิกเพื่อดู: ระบบจัดสรรคิว 16 ศูนย์ x 5 ข้อ", targetSlide: 12, color: COLOR_ACCENT },
    { title: "📜 Legal E-Sign & PDF Export: PDFKit + Jose Cryptography", desc: "คลิกเพื่อดู: การลงนามดิจิทัลตาม พ.ร.บ.ธุรกรรมฯ 2544", targetSlide: 15, color: COLOR_GREEN },
    { title: "🗄️ Relational Database & Audit: Microsoft SQL Server 3NF", desc: "คลิกเพื่อดู: Relational Schema 9 ตาราง และ AuditLog", targetSlide: 20, color: COLOR_DARK }
  ];

  interactiveTriggers.forEach((t, idx) => {
    const y = 1.3 + (idx * 0.75);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.0, y: y, w: 4.4, h: 0.68,
      fill: { color: COLOR_CARD }, line: { color: t.color, width: 1.5 },
      rectRadius: 0.06
    });
    slide.addText(t.title, {
      x: 5.15, y: y + 0.06, w: 4.1, h: 0.25,
      fontSize: 8.5, bold: true, color: t.color,
      hyperlink: { slide: t.targetSlide }
    });
    slide.addText(t.desc, {
      x: 5.15, y: y + 0.32, w: 4.1, h: 0.28,
      fontSize: 7.5, color: COLOR_TEXT_MUTED,
      hyperlink: { slide: t.targetSlide }
    });
  });

  slide.addNotes("สไลด์นี้คือ Interactive Architecture Hub กรรมการสามารถคลิกที่บล็อกเทคโนโลยีด้านขวาเพื่อข้ามไปดูหน้าจอและโค้ดจริงในแต่ละจุดได้ทันทีครับ");
}

// =========================================================================
// SLIDE 10: REAL-TIME ENGINE (SSE vs WebSockets)
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "9. REAL-TIME ENGINE", "กลไกการกระจายข้อมูลสถานะแบบเรียลไทม์ (Server-Sent Events: SSE)", "เหตุผลทางวิศวกรรมในการเลือกใช้ SSE แทน WebSockets เพื่อความเสถียรและประหยัดทรัพยากร");

  const leftX = 0.6;
  const rightX = 5.1;

  // SSE (Selected)
  slide.addShape(pres.ShapeType.roundRect, {
    x: leftX, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_GREEN, width: 2 },
    rectRadius: 0.08
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: leftX + 0.2, y: 1.45, w: 3.9, h: 0.32,
    fill: { color: COLOR_GREEN }, line: { color: COLOR_GREEN }, rectRadius: 0.04
  });
  slide.addText("แนวทางที่ระบบเลือกใช้: Server-Sent Events (SSE)", {
    x: leftX + 0.2, y: 1.45, w: 3.9, h: 0.32,
    fontSize: 9, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  const ssePoints = [
    "✔ การสื่อสารแบบทิศทางเดียว (Unidirectional Server-to-Client): เหมาะสม 100% กับการกระจายสถานะคิว",
    "✔ ทำงานบน HTTP/1.1 และ HTTP/2 มาตรฐาน: ผ่านไฟร์วอลล์และพร็อกซีได้โดยไม่ต้องเปิดพอร์ตพิเศษ",
    "✔ Reconnection อัตโนมัติ: เบราว์เซอร์มีกลไกต่อสัญญาณใหม่ทันทีหากเน็ตหลุด พร้อม Event ID ล่าสุด",
    "✔ ประหยัด Memory & CPU: ใช้ Connection แบบ Lightweight ไม่เปลือง Handshake และ Memory overhead",
    "✔ นำไปใช้ในโค้ด: RxJS Subject ใน NestJS Broadcast สถานะคิวไปยังทุกจอภาพพร้อมกันทันที"
  ];

  ssePoints.forEach((p, idx) => {
    slide.addText(p, {
      x: leftX + 0.2, y: 1.9 + (idx * 0.58), w: 3.9, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_DARK
    });
  });

  // WebSockets (Alternative)
  slide.addShape(pres.ShapeType.roundRect, {
    x: rightX, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: rightX + 0.2, y: 1.45, w: 3.9, h: 0.32,
    fill: { color: COLOR_DARK }, line: { color: COLOR_DARK }, rectRadius: 0.04
  });
  slide.addText("ทางเลือกเดิม: WebSockets (Full Duplex)", {
    x: rightX + 0.2, y: 1.45, w: 3.9, h: 0.32,
    fontSize: 9, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  const wsPoints = [
    "✖ รองรับการส่งข้อมูลสองทาง (Bi-directional): ซึ่งเกินความจำเป็นสำหรับหน้าจอบอร์ดแสดงผล",
    "✖ มักมีปัญหากับ Firewall / Corporate Network: ต้องการ TCP Upgrade และมักถูกบล็อกในเครือข่ายบางแห่ง",
    "✖ ต้องจัดการ Heartbeat / Ping-Pong เอง: มีความซับซ้อนในการจัดการสถานะการหลุดของ Client",
    "✖ ใช้ทรัพยากร Socket สูงกว่า: หากมีผู้ชมจอหลายร้อยคนจะกิน Memory ของเซิร์ฟเวอร์มากกว่า",
    "✖ ข้อสรุป: SSE ให้ความเสถียรและทนทานกว่าสำหรับการถ่ายทอดสถานะคิวการแข่งขัน TMO"
  ];

  wsPoints.forEach((p, idx) => {
    slide.addText(p, {
      x: rightX + 0.2, y: 1.9 + (idx * 0.58), w: 3.9, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 11: KEY FEATURE 1 - AUTH & 2FA OTP
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "10. FEATURE: AUTH & 2FA", "การพิสูจน์ตัวตนด้วย OTP และการควบคุมเซสชัน (Two-Factor Authentication)", "ขั้นตอนการตรวจสอบหมายเลขโทรศัพท์และส่งรหัส OTP 6 หลัก เพื่อเข้าถึงระบบอย่างปลอดภัย");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอเข้าสู่ระบบและยืนยันรหัส OTP (ภาพที่ 3-4, 3-5)", {
    x: 0.8, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.otpLogin,
    x: 0.75, y: 1.75, w: 4.0, h: 1.75,
    sizing: { type: 'contain' }
  });
  slide.addImage({
    path: assets.phoneLogin,
    x: 0.75, y: 3.55, w: 4.0, h: 1.35,
    sizing: { type: 'contain' }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("กลไกความปลอดภัยของการเข้าสู่ระบบ (Auth Architecture)", {
    x: 5.3, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });

  const authDetails = [
    "• Whitelist Verification: ตรวจสอบเบอร์โทรศัพท์กับฐานข้อมูล User หากไม่มีชื่อจะปฏิเสธการเข้าถึงทันที",
    "• 6-Digit OTP via SMS: ส่งรหัส OTP 6 หลักที่สร้างขึ้นแบบสุ่ม มีอายุการใช้งานจำกัด 5 นาที",
    "• JWT Cryptographic Tokens: เมื่อยืนยัน OTP สำเร็จ ระบบจะออก Access Token และ Refresh Token ด้วยไลบรารี jose",
    "• Automatic Role Assignment: กำหนดบทบาทและสิทธิ์ให้อัตโนมัติตามศูนย์และข้อสอบที่ได้รับมอบหมาย",
    "• Session Timeout: ตัดเซสชันอัตโนมัติเมื่อไม่มีกิจกรรม เพื่อป้องกันบุคคลอื่นเข้าใช้งานเครื่องที่ค้างไว้"
  ];

  authDetails.forEach((d, idx) => {
    slide.addText(d, {
      x: 5.3, y: 1.8 + (idx * 0.58), w: 3.9, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 12: KEY FEATURE 2 - QUEUE MATRIX ENGINE
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "11. FEATURE: QUEUE ENGINE", "ระบบจัดสรรและหมุนเวียนคิวตรวจ (Intelligent Queue Matrix Engine)", "อัลกอริทึมการกระจาย 16 ศูนย์ลง 5 ข้อสอบ และการสร้างสล็อตเวลา 15 นาที");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.5, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอ Admin จัดการคิวและสร้างตารางหมุนเวียน (ภาพที่ 3-6)", {
    x: 0.8, y: 1.4, w: 4.1, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.queueAdmin,
    x: 0.75, y: 1.75, w: 4.2, h: 2.1,
    sizing: { type: 'contain' }
  });
  slide.addText("• ช่องกรอกวันที่จัดตาราง, เวลาเริ่มต้น (13:30), นาทีต่อช่อง (15 นาที)\n• ปุ่มเพิ่มรายการคิวแบบกำหนดเอง และปุ่มสลับลำดับคิวขึ้น-ลง", {
    x: 0.8, y: 3.95, w: 4.1, h: 0.9,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.3, y: 1.3, w: 4.1, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หลักการทำงานของ Queue Matrix", {
    x: 5.5, y: 1.4, w: 3.7, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });

  const qLogic = [
    "• Conflict-Free Rotation: หมุนเวียนตารางแบบ Matrix ทำให้ไม่มีศูนย์สอบใดต้องเข้าตรวจ 2 ข้อสอบพร้อมกันในสล็อตเวลาเดียวกัน",
    "• 15-Minute Dynamic Slot: ออกแบบตามความเร็วเฉลี่ยในการตรวจข้อสอบอัตนัยของกรรมการแต่ละข้อ",
    "• Queue State Transitions: คิวมี 3 สถานะ ได้แก่ WAITING, IN_PROGRESS, DONE",
    "• Queue Claiming & Releasing: กรรมการสามารถกด 'รับตรวจ' เพื่อล็อกคิว และมีปุ่ม 'คืนคิว' หากติดปัญหา",
    "• Real-time State Sync: เมื่อสถานะคิวเปลี่ยน ระบบจะยิงสัญญาณ SSE ปรับปรุงบอร์ดรวมทันที"
  ];

  qLogic.forEach((l, idx) => {
    slide.addText(l, {
      x: 5.5, y: 1.8 + (idx * 0.58), w: 3.7, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 13: KEY FEATURE 3 - LIVE BOARD & PUBLIC DISPLAY
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "12. FEATURE: LIVE QUEUE BOARD", "ตารางคิวรวม 16 ศูนย์ และหน้าจอแสดงผลสาธารณะ (Public Board)", "การแสดงผลสถานะคิวแบบเรียลไทม์ พร้อมตราสัญลักษณ์ศูนย์ สอวน. ทั้ง 16 แห่ง และ QR Code");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("ตารางคิวรวม 16 ศูนย์ x 5 ข้อ (ภาพที่ 3-10)", {
    x: 0.8, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.queueBoard,
    x: 0.75, y: 1.75, w: 4.0, h: 3.1,
    sizing: { type: 'contain' }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอ Display สำหรับฉายโปรเจกเตอร์และมือถือ", {
    x: 5.3, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.liveDisplay,
    x: 5.25, y: 1.75, w: 4.0, h: 2.0,
    sizing: { type: 'contain' }
  });

  slide.addText("จุดเด่นของการแสดงผลสาธารณะ:\n• Zero-Auth Access: บุคคลทั่วไปสแกน QR Code ดูคิวได้ทันทีโดยไม่ต้องมีบัญชี\n• สีระบุสถานะ: เหลือง = รอตรวจ, ฟ้า = กำลังตรวจ, เขียว = ตรวจเสร็จแล้ว\n• Digital Clock Sync: นาฬิกาดิจิทัลนับเวลาจริง เพื่อให้ทุกฝ่ายตรงต่อเวลา", {
    x: 5.3, y: 3.85, w: 3.9, h: 1.05,
    fontSize: 8, color: COLOR_TEXT_MUTED
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 14: KEY FEATURE 4 - COMMITTEE GRADING & WATERMARK
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "13. FEATURE: GRADING & WATERMARK", "หน้าจอกรรมการตรวจข้อสอบ และลายน้ำความปลอดภัย (Watermark)", "ระบบกรอกคะแนนนักเรียน 6 คนต่อศูนย์ พร้อมเทคโนโลยี Tiled Watermark ป้องกันการแอบถ่าย");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.5, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอบันทึกคะแนนข้อสอบ (ภาพที่ 3-25)", {
    x: 0.8, y: 1.4, w: 4.1, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.committeeGrading,
    x: 0.75, y: 1.75, w: 4.2, h: 2.1,
    sizing: { type: 'contain' }
  });
  slide.addText("• ช่องกรอกคะแนนนักเรียน 6 คน เรียงตามรหัสผู้เข้าแข่งขัน\n• มีปุ่ม 'บันทึกร่าง' และปุ่ม 'ส่งคะแนนเพื่อรออนุมัติ'", {
    x: 0.8, y: 3.95, w: 4.1, h: 0.9,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.3, y: 1.3, w: 4.1, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("เทคโนโลยี Dynamic Tiled Watermark", {
    x: 5.5, y: 1.4, w: 3.7, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });

  const wmPoints = [
    "• ปัญหาเดิม: ความเสี่ยงที่บุคคลภายนอกหรือผู้ตรวจจะถ่ายภาพหน้าจอคะแนนไปเผยแพร่ก่อนเวลาอันควร",
    "• กลไกป้องกัน: เรนเดอร์ข้อความลายน้ำแบบเอียง ซ้อนทับทั่วทั้งหน้าจอด้วย CSS Canvas / SVG Overlay",
    "• ระบุตัวตนแบบเรียลไทม์: ลายน้ำจะสลัก 'ชื่อกรรมการ + รหัสศูนย์ + วันเวลาปัจจุบัน' ลงบนทุกจุดของหน้าจอ",
    "• ป้องปรามการรั่วไหล (Traceability): หากมีภาพหลุดออกไป สามารถสืบหาต้นตอของผู้ถ่ายภาพได้ทันที 100%",
    "• ไม่รบกวนสายตา: ปรับค่า Opacity โปร่งใส 8-12% ทำให้กรรมการอ่านตัวเลขและตรวจคะแนนได้ตามปกติ"
  ];

  wmPoints.forEach((w, idx) => {
    slide.addText(w, {
      x: 5.5, y: 1.8 + (idx * 0.58), w: 3.7, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 15: KEY FEATURE 5 - APPROVAL & LEGAL DIGITAL SIGNATURE
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "14. FEATURE: E-SIGNATURE", "กระบวนการอนุมัติและลงนามดิจิทัลตามกฎหมาย (Digital Signature)", "การตรวจสอบผลคะแนนโดยอาจารย์ผู้ควบคุมทีม และการประทับลายมือชื่อดิจิทัลอัตโนมัติบน PDF");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.5, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจออนุมัติคะแนนและลงนาม (ภาพที่ 3-26)", {
    x: 0.8, y: 1.4, w: 4.1, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.approvalSign,
    x: 0.75, y: 1.75, w: 4.2, h: 2.1,
    sizing: { type: 'contain' }
  });
  slide.addText("• แสดงรายการคะแนนของนักเรียนทั้ง 6 คน เพื่อให้อาจารย์ตรวจทาน\n• ปุ่ม 'ขอแก้ไขคะแนน' และปุ่มสีเขียว 'อนุมัติและลงนาม'", {
    x: 0.8, y: 3.95, w: 4.1, h: 0.9,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.3, y: 1.3, w: 4.1, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("กระบวนการสร้างเอกสารรับรองคะแนน PDF", {
    x: 5.5, y: 1.4, w: 3.7, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });

  const pdfSteps = [
    "1. Intent to Sign: เมื่ออาจารย์ผู้ควบคุมทีมตรวจสอบคะแนนแล้วกด 'อนุมัติและลงนาม'",
    "2. Signature Merging: ระบบดึงภาพลายเซ็นจริงของกรรมการผู้ตรวจและหัวหน้าทีมที่อัปโหลดไว้มาประทับอัตโนมัติ",
    "3. PDFKit Rendering: สร้างเอกสาร PDF ทางการตามฟอร์แมตเอกสาร สอวน. พร้อมประทับตรา มจพ.",
    "4. Server-Side Timestamping: ฝังวันเวลาและรหัส Hash กำกับเอกสาร ป้องกันการแก้ไขย้อนหลัง",
    "5. Instant Scoreboard Update: อัปเดตตารางสรุปคะแนนรวม และปลดล็อกให้ศูนย์เข้าสู่คิวข้อถัดไป"
  ];

  pdfSteps.forEach((s, idx) => {
    slide.addText(s, {
      x: 5.5, y: 1.8 + (idx * 0.58), w: 3.7, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 16: KEY FEATURE 6 - SCORE EDIT WORKFLOW
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "15. FEATURE: SCORE EDIT", "กระบวนการขอแก้ไขคะแนน และการอนุมัติซ้ำ (Score Edit Workflow)", "ขั้นตอนการขอแก้ไขคะแนนเมื่อพบข้อผิดพลาด พร้อมระบบ Two-Tier Approval เพื่อความโปร่งใส");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("ขั้นตอนการขอแก้ไขคะแนน (Activity Diagram 3-28)", {
    x: 0.8, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });

  const editSteps = [
    "1. การยื่นคำขอ: หากกรรมการหรืออาจารย์พบข้อผิดพลาด จะกดปุ่ม 'ขอแก้ไขคะแนน' พร้อมระบุเหตุผล",
    "2. จัดเก็บคะแนนเดิม: ตาราง ScoreEditRequest จะบันทึก OldValue, NewValue, Reason และผู้ขอยื่นเรื่อง",
    "3. การพิจารณาอนุมัติซ้ำ: อาจารย์ผู้ควบคุมทีมและกรรมการต้องร่วมกันพิจารณาความสมเหตุสมผล",
    "4. การสร้าง PDF ฉบับใหม่: เมื่ออนุมัติ ระบบจะสร้างเอกสาร PDF ฉบับปรับปรุงใหม่พร้อม Timestamp ล่าสุด",
    "5. บันทึก Audit Log อัตโนมัติ: บันทึกว่าใครเป็นผู้อนุมัติการแก้ไข เพื่อความโปร่งใส 100%"
  ];

  editSteps.forEach((st, idx) => {
    slide.addText(st, {
      x: 0.8, y: 1.8 + (idx * 0.58), w: 3.9, h: 0.52,
      fontSize: 8.5, color: COLOR_TEXT_MUTED
    });
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("ตารางแสดงคะแนนภายหลังการแก้ไข (ภาพที่ 3-33)", {
    x: 5.3, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.scoreExport,
    x: 5.25, y: 1.75, w: 4.0, h: 2.1,
    sizing: { type: 'contain' }
  });
  slide.addText("• แสดงคะแนนล่าสุดที่ได้รับการอนุมัติซ้ำอย่างถูกต้อง\n• สามารถกดปุ่ม Export เพื่อดาวน์โหลดไฟล์ Excel หรือ PDF ได้ทันที", {
    x: 5.3, y: 3.95, w: 3.9, h: 0.9,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 17: KEY FEATURE 7 - AUDIT LOGGING TRAIL
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "16. FEATURE: AUDIT LOGS", "ระบบบันทึกประวัติการกระทำย้อนหลัง (Comprehensive Audit Trail)", "ความโปร่งใสระดับองค์กร บันทึกทุกคำขอ ทุกการเปลี่ยนสถานะ และทุกคะแนนที่ถูกแก้ไขลงฐานข้อมูล");

  const auditCards = [
    { title: "ตาราง AuditLog เชิงลึก", tech: "Schema: AuditLog (ตารางที่ 3-10)", desc: "เก็บ AuditLogId (UUID), UserId, Action (CREATE, UPDATE, DELETE), EntityType (Score, QueueItem, User), EntityId, OldValue, NewValue, CreatedAt" },
    { title: "Immutable Record (ห้ามแก้ไข/ลบ)", tech: "Data Integrity Constraint", desc: "สิทธิ์การเข้าถึง AuditLog เป็นแบบ Read-only แม้แต่ผู้ดูแลระบบก็ไม่สามารถแก้ไขหรือลบประวัติย้อนหลังได้ เพื่อใช้เป็นหลักฐานทางกฎหมาย" },
    { title: "เก็บบันทึกภาพก่อนและหลังแก้ไข", tech: "JSON Delta Tracking", desc: "บันทึกข้อมูลแบบ Snapshots ทั้งค่าคะแนนเดิม (OldValue) และค่าคะแนนใหม่ (NewValue) ทำให้สามารถเปรียบเทียบความแตกต่างได้อย่างละเอียด" },
    { title: "Admin Audit Viewer Interface", tech: "หน้าจอมอนิเตอร์ของแอดมิน", desc: "แอดมินสามารถเปิดดูไทม์ไลน์การทำงานของกรรมการทุกคนในระบบ กรองตามศูนย์สอบ หรือตามหมายเลขข้อสอบเพื่อตรวจสอบความผิดปกติได้ทันที" }
  ];

  auditCards.forEach((a, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.6 + (col * 4.5);
    const y = 1.3 + (row * 1.8);

    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: y, w: 4.3, h: 1.65,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(a.title, {
      x: x + 0.2, y: y + 0.15, w: 3.9, h: 0.28,
      fontSize: 10, bold: true, color: COLOR_PRIMARY
    });
    slide.addText(a.tech, {
      x: x + 0.2, y: y + 0.42, w: 3.9, h: 0.25,
      fontSize: 8.5, bold: true, color: COLOR_DARK
    });
    slide.addText(a.desc, {
      x: x + 0.2, y: y + 0.68, w: 3.9, h: 0.9,
      fontSize: 8.5, color: COLOR_TEXT_MUTED, lineSpacing: 14
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 18: KEY FEATURE 8 - SCHOOLS & PERMISSIONS
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "17. FEATURE: ADMIN MGMT", "การบริหารจัดการข้อมูลศูนย์ สอวน. 16 แห่ง และสิทธิ์ผู้ใช้งาน", "หน้าจอควบคุมระบบหลังบ้านสำหรับผู้ดูแลระบบในการจัดการศูนย์สอบและอัปโหลดลายเซ็นดิจิทัล");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอจัดการสิทธิ์และลายเซ็น (ภาพที่ 3-41)", {
    x: 0.8, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.userPermissions,
    x: 0.75, y: 1.75, w: 4.0, h: 2.0,
    sizing: { type: 'contain' }
  });
  slide.addText("• แสดงรายชื่อกรรมการและผู้ใช้ พร้อมปุ่ม 'อัปโหลดลายเซ็น'\n• กำหนดสิทธิ์รายบุคคลตามข้อสอบที่รับผิดชอบ", {
    x: 0.8, y: 3.85, w: 3.9, h: 1.0,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.3, w: 4.3, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("หน้าจอจัดการข้อมูลศูนย์ศึกษา 16 แห่ง (ภาพที่ 3-50)", {
    x: 5.3, y: 1.4, w: 3.9, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.schoolMgmt,
    x: 5.25, y: 1.75, w: 4.0, h: 2.0,
    sizing: { type: 'contain' }
  });
  slide.addText("• รองรับการเพิ่ม แก้ไข และลบข้อมูลศูนย์ สอวน. ทั้ง 16 แห่ง\n• กำหนดรหัสโรงเรียน (Code) เช่น CMU, BUU, KMUTNB สำหรับจับคู่ระบบคิว", {
    x: 5.3, y: 3.85, w: 3.9, h: 1.0,
    fontSize: 8.5, color: COLOR_TEXT_MUTED
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 19: CONCEPTUAL ER DIAGRAM
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "18. DATA MODEL: CONCEPTUAL", "แบบจำลองความสัมพันธ์ข้อมูลเชิงแนวคิด (Conceptual ER Diagram)", "แผนภาพความสัมพันธ์เอนทิตี แอตทริบิวต์ และคาร์ดินัลลิตี้จากบทที่ 3 (ภาพที่ 3-57)");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 8.8, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addImage({
    path: assets.chenErDiagram,
    x: 0.8, y: 1.45, w: 8.4, h: 2.7,
    sizing: { type: 'contain' }
  });

  slide.addText("องค์ประกอบสำคัญของแบบจำลอง ER (Chen Model):\n• Strong Entity: School, User, QueueItem, Student | Weak Entity: Score, ScoreEditRequest\n• ความสัมพันธ์และ Cardinality: School-User (1:M), School-Student (1:M), QueueItem-Score (1:M), User-Score (Judges 1:M)", {
    x: 0.8, y: 4.25, w: 8.4, h: 0.65,
    fontSize: 8.5, color: COLOR_TEXT_DARK
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 20: RELATIONAL SCHEMA & DATA DICTIONARY
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "19. DATA MODEL: RELATIONAL", "โครงสร้างฐานข้อมูลเชิงสัมพันธ์และพจนานุกรมข้อมูล (Relational Schema)", "แผนภาพความสัมพันธ์ 9 ตารางหลักใน Microsoft SQL Server จากบทที่ 3 (ภาพที่ 3-58)");

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.3, w: 4.1, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("Relational Schema (ภาพที่ 3-58)", {
    x: 0.8, y: 1.4, w: 3.7, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });
  slide.addImage({
    path: assets.erDiagram,
    x: 0.75, y: 1.75, w: 3.8, h: 3.1,
    sizing: { type: 'contain' }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 4.9, y: 1.3, w: 4.5, h: 3.7,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText("สรุป 9 ตารางสำคัญตามหลัก Third Normal Form (3NF)", {
    x: 5.1, y: 1.4, w: 4.1, h: 0.3,
    fontSize: 9.5, bold: true, color: COLOR_DARK
  });

  const tables = [
    "1. User: UserId (PK), Username, PasswordHash, DisplayName, Role, SchoolId",
    "2. School: SchoolId (PK), Name, Code, CreatedAt",
    "3. CommitteeAssignment: CommitteeAssignmentId (PK), UserId, ProblemNumber",
    "4. QueueItem: QueueItemId (PK), SchoolId, ProblemNumber, Status, Position",
    "5. Score: ScoreId (PK), QueueItemId, JudgeId, Value, StudentId",
    "6. Student: StudentId (PK), StudentCode, SeqNo, Name, SchoolId",
    "7. ScoreEditRequest: ScoreEditRequestId (PK), ScoreId, RequestedBy, Reason",
    "8. CompetitionSettings: CompetitionSettingsId (PK), ScoringLocked, LockedBy",
    "9. AuditLog: AuditLogId (PK), UserId, Action, EntityType, OldValue, NewValue"
  ];

  tables.forEach((t, idx) => {
    slide.addText(t, {
      x: 5.1, y: 1.75 + (idx * 0.35), w: 4.1, h: 0.3,
      fontSize: 8, color: COLOR_TEXT_MUTED
    });
  });

  addReturnTrigger(slide, 7.3, 5.08, 9, "🔙 กลับสู่ผังรวม");
}

// =========================================================================
// SLIDE 21: SYSTEM TESTING & QA
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, "20. SYSTEM TESTING & QA", "กลยุทธ์การทดสอบระบบ 3 ระดับ (Testing Strategy & QA)", "การประกันคุณภาพระบบก่อนการใช้งานจริงตามระเบียบวิธีวิจัยในบทที่ 3 (หัวข้อ 3.5)");

  const tests = [
    {
      level: "ระดับที่ 1: การทดสอบระดับโมดูล (Module Test)",
      focus: "ทดสอบการทำงานของฟังก์ชันย่อยเดี่ยวๆ",
      details: "• ทดสอบระบบสร้างและส่ง OTP 6 หลัก และการหมดอายุใน 5 นาที\n• ทดสอบอัลกอริทึมคำนวณคิวหมุนเวียน 15 นาทีของ Queue Matrix\n• ทดสอบการสร้างไฟล์ PDF ทางการด้วย PDFKit และการประทับลายเซ็น/ลายน้ำ\n• ทดสอบ Unit Tests ฝั่ง Backend: 33 Test Suites (271 Tests ผ่านทั้งหมด 100%)"
    },
    {
      level: "ระดับที่ 2: การทดสอบระดับคอมโพเนนต์ (Component Test)",
      focus: "ทดสอบการเชื่อมโยงข้อมูลระหว่าง Front-end, Back-end และ Database",
      details: "• ทดสอบการรับส่งข้อมูลผ่าน RESTful API และการแมปปิ้ง DTO Validation\n• ทดสอบการกระจายสัญญาณ Real-time ผ่าน Server-Sent Events (SSE)\n• ทดสอบกระบวนการบันทึกคะแนน ส่งตรวจทาน และการลงนาม E-Signature\n• ทดสอบ Frontend Component Tests: 14 Test Files (136 Tests ผ่านทั้งหมด 100%)"
    },
    {
      level: "ระดับที่ 3: การทดสอบเงื่อนไขข้อยกเว้น (Exception & Integration Test)",
      focus: "ทดสอบกรณีเกิดข้อผิดพลาดและการควบคุมความปลอดภัย",
      details: "• ทดสอบการพยายามข้ามสิทธิ์ของผู้ใช้งาน (RBAC Privilege Escalation Testing)\n• ทดสอบกรณีอาจารย์ผู้ควบคุมทีมปฏิเสธการอนุมัติคะแนน (Reject Flow)\n• ทดสอบการป้อนคะแนนเกินเกณฑ์ (เช่น กรอกคะแนนติดลบหรือเกิน 7 คะแนน)\n• ทดสอบการรองรับการเชื่อมต่อพร้อมกันของผู้ใช้งานทั้ง 16 ศูนย์สอบ"
    }
  ];

  tests.forEach((t, idx) => {
    const y = 1.25 + (idx * 1.2);
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: y, w: 8.8, h: 1.08,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0.6, y: y, w: 0.1, h: 1.08,
      fill: { color: idx === 0 ? COLOR_BLUE : idx === 1 ? COLOR_GREEN : COLOR_PRIMARY },
      line: { color: idx === 0 ? COLOR_BLUE : idx === 1 ? COLOR_GREEN : COLOR_PRIMARY }
    });
    slide.addText(t.level + " - " + t.focus, {
      x: 0.9, y: y + 0.08, w: 8.3, h: 0.3,
      fontSize: 10, bold: true, color: COLOR_DARK
    });
    slide.addText(t.details, {
      x: 0.9, y: y + 0.38, w: 8.3, h: 0.65,
      fontSize: 8.5, color: COLOR_TEXT_MUTED, lineSpacing: 14
    });
  });

  addReturnTrigger(slide, 7.3, 5.05, 22, "ถัดไป: หน้า Q&A ➔");
}

// =========================================================================
// SLIDE 22: FINAL SLIDE - Q&A
// =========================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 2.8, h: 0.35,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("คำถามและข้อเสนอแนะ", {
    x: 0.8, y: 0.8, w: 2.8, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("Questions & Answers (Q&A)", {
    x: 0.8, y: 1.35, w: 8.4, h: 0.8,
    fontSize: 32, bold: true, color: COLOR_WHITE, valign: 'middle'
  });

  slide.addText("ขอขอบพระคุณคณะกรรมการทุกท่านที่ให้เกียรติรับฟังการนำเสนอโครงงานพิเศษ\nคณะผู้จัดทำยินดีรับฟังทุกข้อเสนอแนะเพื่อนำไปพัฒนาต่อยอดระบบให้สมบูรณ์ยิ่งขึ้นครับ", {
    x: 0.8, y: 2.25, w: 8.4, h: 0.6,
    fontSize: 12, color: '94A3B8', lineSpacing: 18
  });

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 3.0, w: 8.4, h: 0.02,
    fill: { color: '334155' }, line: { color: '334155' }
  });

  // Contact Box
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 3.25, w: 8.4, h: 1.8,
    fill: { color: '1E293B' }, line: { color: '334155', width: 1 },
    rectRadius: 0.08
  });

  slide.addText("ข้อมูลติดต่อและภาควิชา:\n• คณะผู้จัดทำ: นายทินณภัทร ปั้นคง, นายวสุศิลป์ ลี้นิธิเจริญกิจ, นางสาวอิสริยาภรณ์ มงคลิก\n• อาจารย์ที่ปรึกษา: อาจารย์ ดร.ชัยยศ กำธรเจริญ\n• สาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\n  คณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)", {
    x: 1.1, y: 3.4, w: 7.8, h: 1.5,
    fontSize: 10.5, color: 'F1F5F9', lineSpacing: 18
  });

  // Trigger button to jump back to Architecture Hub
  slide.addShape(pres.ShapeType.roundRect, {
    x: 6.8, y: 4.4, w: 2.2, h: 0.45,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("🔍 ทบทวนสถาปัตยกรรม (Slide 9)", {
    x: 6.8, y: 4.4, w: 2.2, h: 0.45,
    fontSize: 8.5, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle',
    hyperlink: { slide: 9 }
  });

  slide.addNotes("กลุ่มของพวกเราขอขอบพระคุณท่านคณะกรรมการทุกท่านเป็นอย่างสูงครับ ขณะนี้เปิดรับข้อเสนอแนะและพร้อมตอบทุกข้อซักถามจากท่านคณะกรรมการครับ");
}

// Compile Presentation to buffer and inject OpenXML transitions
const outputPath = 'c:/tmo/TMO_Grading_Queue_Presentation.pptx';

pres.write({ outputType: 'nodebuffer' })
  .then(async (buf) => {
    console.log('Injecting OpenXML slide transitions (<p:transition>) into all 22 slides...');
    const zip = await JSZip.loadAsync(buf);

    for (let i = 1; i <= 22; i++) {
      const slidePath = `ppt/slides/slide${i}.xml`;
      const file = zip.file(slidePath);
      if (file) {
        let xml = await file.async('string');
        // Inject transition after clrMapOvr
        if (xml.includes('</p:clrMapOvr>')) {
          const transTag = i === 1 || i === 9 || i === 22
            ? '<p:transition spd="med" advClick="1"><p:fade/></p:transition>'
            : '<p:transition spd="fast" advClick="1"><p:push dir="r"/></p:transition>';
          xml = xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${transTag}`);
          zip.file(slidePath, xml);
        }
      }
    }

    const finalBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(outputPath, finalBuf);
    console.log(`Successfully compiled and injected interactive triggers & animations into: ${outputPath} (${(finalBuf.length / 1024 / 1024).toFixed(2)} MB)`);
  })
  .catch(err => {
    console.error('Error generating presentation:', err);
  });
