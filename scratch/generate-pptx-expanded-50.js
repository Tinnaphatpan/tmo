const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches (16:9 Widescreen)

// Official Palette
const COLOR_PRIMARY = 'C8102E';   // KMUTNB Crimson Red
const COLOR_DARK = '0F172A';      // Dark Slate (Background & Headings)
const COLOR_BG_LIGHT = 'F8FAFC';  // Light Slate BG
const COLOR_CARD = 'FFFFFF';      // Pure White Card
const COLOR_TEXT_MUTED = '475569';// High-contrast Muted Slate
const COLOR_TEXT_DARK = '1E293B'; // Dark Slate Text
const COLOR_WHITE = 'FFFFFF';
const COLOR_BORDER = 'E2E8F0';

// Action Button Colors (Requested by user)
const BTN_GREEN = '16A34A';       // Emerald Green (ยืนยัน / สร้างคิว / ส่งตรวจ)
const BTN_BLUE = '2563EB';        // Royal Blue (ขอรหัส OTP / บันทึกร่าง)
const BTN_RED = 'DC2626';         // Vibrant Red (อนุมัติและลงนาม)
const BTN_ORANGE = 'EA580C';      // Orange (ขอทบทวนคะแนน)
const BTN_PURPLE = '7C3AED';      // Purple (ระบบตรวจสอบ)

// Assets
const assets = {
  archDiagram: 'c:/tmo/extracted_thesis_assets/obj_221_661x598.png',
  erDiagram: 'c:/tmo/extracted_thesis_assets/obj_407_421x787.png',
  chenErDiagram: 'c:/tmo/extracted_thesis_assets/obj_405_1376x820.png',
  swotDiagram: 'c:/tmo/extracted_thesis_assets/obj_296_1376x768.jpg',
  structureChart: 'c:/tmo/extracted_thesis_assets/obj_416_1256x792.png',
  queueBoard: 'c:/tmo/extracted_thesis_assets/obj_320_612x822.png',
  queueAdmin: 'c:/tmo/extracted_thesis_assets/obj_309_1300x587.jpg',
  queueCreate: 'c:/tmo/extracted_thesis_assets/obj_318_1256x457.jpg',
  committeeGrading: 'c:/tmo/extracted_thesis_assets/obj_347_1300x618.jpg',
  approvalSign: 'c:/tmo/extracted_thesis_assets/obj_349_1300x588.jpg',
  signatureCanvas: 'c:/tmo/extracted_thesis_assets/obj_351_1300x588.jpg',
  scoreEdit: 'c:/tmo/extracted_thesis_assets/obj_359_1300x587.jpg',
  scoreTable: 'c:/tmo/extracted_thesis_assets/obj_361_1300x589.jpg',
  userPermissions: 'c:/tmo/extracted_thesis_assets/obj_377_1300x615.jpg',
  otpLogin: 'c:/tmo/extracted_thesis_assets/obj_306_1301x621.jpg',
  phoneLogin: 'c:/tmo/extracted_thesis_assets/obj_307_1297x621.jpg',
  schoolMgmt: 'c:/tmo/extracted_thesis_assets/obj_394_1300x616.png',
  liveDisplay: 'c:/tmo/screenshots/display_real_rendered.png',
  committeeReal: 'c:/tmo/screenshots/committee_real_grading.png',
  mobileLogin: 'c:/tmo/screenshots/mobile_login.png'
};

// Common Header (Large readable text!)
function addHeader(slide, badge, title, subtitle = '') {
  // Top red accent line
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
  });

  // Badge Pill
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 0.22, w: 2.8, h: 0.32,
    fill: { color: COLOR_DARK }, line: { color: COLOR_DARK },
    rectRadius: 0.08
  });
  slide.addText(badge, {
    x: 0.6, y: 0.22, w: 2.8, h: 0.32,
    fontSize: 9.5, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  // Slide Title (21-22pt bold!)
  slide.addText(title, {
    x: 0.6, y: 0.58, w: 8.8, h: 0.45,
    fontSize: 21, bold: true, color: COLOR_TEXT_DARK, valign: 'middle'
  });

  // Subtitle (11.5pt)
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6, y: 1.05, w: 8.8, h: 0.25,
      fontSize: 11.5, color: COLOR_TEXT_MUTED, valign: 'middle'
    });
  }
}

// -------------------------------------------------------------------------
// TEMPLATE 1: CONCEPT SLIDE (1 Main Topic, 2-3 Big Cards, 14-16pt font)
// -------------------------------------------------------------------------
function renderConceptSlide(data) {
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, data.badge, data.title, data.subtitle);

  const cards = data.cards;
  const count = cards.length;

  if (count === 2) {
    cards.forEach((c, idx) => {
      const x = 0.6 + (idx * 4.5);
      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: 1.45, w: 4.3, h: 3.65,
        fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1.5 },
        rectRadius: 0.1
      });
      slide.addShape(pres.ShapeType.rect, {
        x: x, y: 1.45, w: 4.3, h: 0.08,
        fill: { color: c.accent || COLOR_PRIMARY }, line: { color: c.accent || COLOR_PRIMARY }
      });
      slide.addText(c.title, {
        x: x + 0.3, y: 1.7, w: 3.7, h: 0.5,
        fontSize: 16, bold: true, color: COLOR_TEXT_DARK
      });
      slide.addText(c.desc, {
        x: x + 0.3, y: 2.3, w: 3.7, h: 2.5,
        fontSize: 13.5, color: COLOR_TEXT_MUTED, lineSpacing: 22
      });
    });
  } else if (count === 3) {
    cards.forEach((c, idx) => {
      const y = 1.42 + (idx * 1.25);
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.6, y: y, w: 8.8, h: 1.12,
        fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1.5 },
        rectRadius: 0.08
      });
      slide.addShape(pres.ShapeType.rect, {
        x: 0.6, y: y, w: 0.12, h: 1.12,
        fill: { color: c.accent || COLOR_PRIMARY }, line: { color: c.accent || COLOR_PRIMARY }
      });
      slide.addText(c.title, {
        x: 0.95, y: y + 0.12, w: 8.2, h: 0.38,
        fontSize: 15.5, bold: true, color: COLOR_PRIMARY
      });
      slide.addText(c.desc, {
        x: 0.95, y: y + 0.5, w: 8.2, h: 0.52,
        fontSize: 13, color: COLOR_TEXT_MUTED
      });
    });
  } else if (count === 4) {
    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.6 + (col * 4.5);
      const y = 1.45 + (row * 1.85);

      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: y, w: 4.3, h: 1.7,
        fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1.5 },
        rectRadius: 0.08
      });
      slide.addText(c.title, {
        x: x + 0.25, y: y + 0.15, w: 3.8, h: 0.35,
        fontSize: 14.5, bold: true, color: c.accent || COLOR_PRIMARY
      });
      slide.addText(c.desc, {
        x: x + 0.25, y: y + 0.52, w: 3.8, h: 1.05,
        fontSize: 12.5, color: COLOR_TEXT_MUTED, lineSpacing: 18
      });
    });
  }

  if (data.notes) slide.addNotes(data.notes);
  return slide;
}

// -------------------------------------------------------------------------
// TEMPLATE 2: STEP-BY-STEP USER WORKFLOW SLIDE (Screenshot + Button Highlight)
// -------------------------------------------------------------------------
function renderStepSlide(data) {
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, data.badge, data.title, data.subtitle);

  // Left Column: Instructions Card (w: 4.8in)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.4, w: 4.6, h: 3.85,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1.5 },
    rectRadius: 0.1
  });

  // Step Badge Pill
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.9, y: 1.6, w: 1.6, h: 0.35,
    fill: { color: data.stepColor || COLOR_PRIMARY }, line: { color: data.stepColor || COLOR_PRIMARY },
    rectRadius: 0.06
  });
  slide.addText(data.stepNumber, {
    x: 0.9, y: 1.6, w: 1.6, h: 0.35,
    fontSize: 11, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  // Step Title (16pt bold!)
  slide.addText(data.stepTitle, {
    x: 0.9, y: 2.05, w: 4.0, h: 0.45,
    fontSize: 16.5, bold: true, color: COLOR_TEXT_DARK
  });

  // Step Explanation (13.5pt)
  slide.addText(data.instruction, {
    x: 0.9, y: 2.55, w: 4.0, h: 1.45,
    fontSize: 13, color: COLOR_TEXT_MUTED, lineSpacing: 21
  });

  // Action Button Highlight (Requested by user: เน้นสีปุ่มที่กด)
  if (data.actionButton) {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.9, y: 4.15, w: 4.0, h: 0.8,
      fill: { color: 'F1F5F9' }, line: { color: COLOR_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText("ปุ่มที่ต้องกดบนหน้าจอ:", {
      x: 1.05, y: 4.22, w: 3.7, h: 0.22,
      fontSize: 10, color: COLOR_TEXT_MUTED
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.05, y: 4.48, w: 3.7, h: 0.38,
      fill: { color: data.actionButton.color }, line: { color: data.actionButton.color },
      rectRadius: 0.06
    });
    slide.addText(data.actionButton.text, {
      x: 1.05, y: 4.48, w: 3.7, h: 0.38,
      fontSize: 12, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
    });
  }

  // Right Column: Real Screenshot (w: 4.0in)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.4, y: 1.4, w: 4.0, h: 3.85,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1.5 },
    rectRadius: 0.1
  });
  slide.addImage({
    path: data.image,
    x: 5.5, y: 1.5, w: 3.8, h: 3.65,
    sizing: { type: 'contain' }
  });

  if (data.notes) slide.addNotes(data.notes);
  return slide;
}

// -------------------------------------------------------------------------
// TEMPLATE 3: FULL DIAGRAM SLIDE (Diagram + Bottom Summary Banner)
// -------------------------------------------------------------------------
function renderDiagramSlide(data) {
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BG_LIGHT };
  addHeader(slide, data.badge, data.title, data.subtitle);

  // Diagram Box
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 8.8, h: 2.85,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1.5 },
    rectRadius: 0.1
  });
  slide.addImage({
    path: data.image,
    x: 0.8, y: 1.45, w: 8.4, h: 2.65,
    sizing: { type: 'contain' }
  });

  // Bottom Summary Banner
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 4.35, w: 8.8, h: 0.95,
    fill: { color: COLOR_CARD }, line: { color: COLOR_PRIMARY, width: 1.5 },
    rectRadius: 0.08
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0.6, y: 4.35, w: 0.12, h: 0.95,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY }
  });
  slide.addText(data.summaryTitle, {
    x: 0.9, y: 4.45, w: 8.3, h: 0.28,
    fontSize: 13.5, bold: true, color: COLOR_PRIMARY
  });
  slide.addText(data.summaryDesc, {
    x: 0.9, y: 4.75, w: 8.3, h: 0.48,
    fontSize: 12, color: COLOR_TEXT_MUTED
  });

  if (data.notes) slide.addNotes(data.notes);
  return slide;
}

console.log('Templates defined successfully. Now defining 48 slides...');

// =========================================================================
// PART 1: บทนำและการแข่งขัน TMO (SLIDES 1 - 4)
// =========================================================================

// Slide 1: Cover
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.7, w: 3.5, h: 0.38,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("โครงงานพิเศษระดับปริญญาตรี (มจพ.)", {
    x: 0.8, y: 0.7, w: 3.5, h: 0.38,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("ระบบบริหารจัดการการแข่งขัน\nคณิตศาสตร์โอลิมปิกระดับชาติ\nผ่านเว็บแอปพลิเคชัน", {
    x: 0.8, y: 1.25, w: 8.4, h: 1.5,
    fontSize: 27, bold: true, color: COLOR_WHITE, lineSpacing: 34
  });

  slide.addText("Thailand Mathematical Olympiad (TMO) Grading & Queue Management Web Application", {
    x: 0.8, y: 2.85, w: 8.4, h: 0.35,
    fontSize: 13, color: '94A3B8'
  });

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 3.3, w: 8.4, h: 0.02,
    fill: { color: '334155' }, line: { color: '334155' }
  });

  slide.addText("คณะผู้จัดทำโครงงาน:\n• นายทินณภัทร ปั้นคง\n• นายวสุศิลป์ ลี้นิธิเจริญกิจ\n• นางสาวอิสริยาภรณ์ มงคลิก", {
    x: 0.8, y: 3.5, w: 4.2, h: 1.5,
    fontSize: 12, color: 'F1F5F9', lineSpacing: 22
  });

  slide.addText("อาจารย์ที่ปรึกษาโครงงาน:\n• อาจารย์ ดร.ชัยยศ กำธรเจริญ\n\nสาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\nคณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", {
    x: 5.2, y: 3.5, w: 4.2, h: 1.5,
    fontSize: 12, color: 'CBD5E1', lineSpacing: 22
  });

  slide.addNotes("กราบเรียนท่านคณะกรรมการทุกท่าน วันนี้กลุ่มของพวกเราขอรายงานความก้าวหน้าโครงงานพิเศษ ระบบบริหารจัดการการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติผ่านเว็บแอปพลิเคชัน ครับ");
}

// Slide 2: TMO Background
renderConceptSlide({
  badge: "1. BACKGROUND & ORIGIN",
  title: "การแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ (TMO) คืออะไร?",
  subtitle: "เวทีคัดเลือกตัวแทนเยาวชนไทยสู่การแข่งขันระดับนานาชาติ (International Mathematical Olympiad: IMO)",
  cards: [
    {
      title: "จุดเริ่มต้นตั้งแต่ปี พ.ศ. 2547",
      desc: "การแข่งขัน TMO ริเริ่มขึ้นเพื่อยกระดับมาตรฐานวิชาการคณิตศาสตร์ของประเทศไทย และค้นหานักเรียนที่มีศักยภาพสูงจากทั่วประเทศอย่างต่อเนื่องมาเป็นเวลากว่า 20 ปี",
      accent: COLOR_PRIMARY
    },
    {
      title: "การวัดผลด้วยข้อสอบอัตนัยขั้นสูง",
      desc: "ข้อสอบไม่ได้วัดเพียงแค่การคิดเลขเร็ว แต่เป็นการพิสูจน์เชิงตรรกะและโครงสร้างคณิตศาสตร์ระดับลึก ซึ่งต้องอาศัยการเขียนอธิบายอย่างละเอียดในแต่ละข้อสอบ",
      accent: COLOR_DARK
    },
    {
      title: "ความร่วมมือระดับประเทศผ่าน สอวน.",
      desc: "ดำเนินการภายใต้มูลนิธิส่งเสริมโอลิมปิกวิชาการและพัฒนามาตรฐานวิทยาศาสตร์ศึกษา ในพระอุปถัมภ์สมเด็จพระเจ้าพี่นางเธอ เจ้าฟ้ากัลยาณิวัฒนา กรมหลวงนราธิวาสราชนครินทร์ (สอวน.)",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "TMO เป็นเวทีคัดเลือกตัวแทนประเทศที่มีความสำคัญทางวิชาการสูงสุด จัดต่อเนื่องมาตั้งแต่ปี 2547 โดยมูลนิธิ สอวน. ครับ"
});

// Slide 3: 16 Regional Centers
renderConceptSlide({
  badge: "1. BACKGROUND & ORIGIN",
  title: "ความซับซ้อนของผู้เข้าร่วม: 16 ศูนย์ สอวน. ทั่วประเทศ",
  subtitle: "การบริหารจัดการผู้คน ข้อมูล และข้อสอบจากศูนย์สอบทั่วทุกภูมิภาคของประเทศไทย",
  cards: [
    {
      title: "นักเรียนตัวแทนศูนย์ (Student Candidates)",
      desc: "ในแต่ละปีจะมีตัวแทนนักเรียนศูนย์ละ 6 คนจาก 16 ศูนย์ สอวน. รวมทั้งสิ้นเกือบ 100 คน เข้าร่วมการประลองทักษะการพิสูจน์ทางคณิตศาสตร์",
      accent: COLOR_PRIMARY
    },
    {
      title: "อาจารย์ผู้ควบคุมทีม (Team Leaders)",
      desc: "อาจารย์ตัวแทนจาก 16 ศูนย์ มีหน้าที่กำกับดูแลนักเรียน ตรวจทานความถูกต้องของคะแนน และลงนามรับรองผลการตรวจข้อสอบอย่างเป็นทางการ",
      accent: COLOR_DARK
    },
    {
      title: "คณะกรรมการตรวจส่วนกลาง (Examiners)",
      desc: "คณาจารย์ผู้ทรงคุณวุฒิจากมหาวิทยาลัยชั้นนำที่ร่วมตรวจข้อสอบอย่างเข้มงวดและเป็นกลาง โดยต้องสลับตรวจข้อสอบของศูนย์ต่างๆ ข้ามกัน",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "มีผู้เกี่ยวข้องหลายระดับ ทั้งนักเรียนตัวแทน 16 ศูนย์ อาจารย์ผู้ควบคุมทีม และคณะกรรมการตรวจส่วนกลาง ทำให้การจัดการมีปริมาณข้อมูลสูงครับ"
});

// Slide 4: IMO Benchmark Scoring
renderConceptSlide({
  badge: "1. BACKGROUND & ORIGIN",
  title: "กติกาการให้คะแนนมาตรฐานสากล (0 ถึง 7 คะแนน)",
  subtitle: "เกณฑ์การให้คะแนนตามมาตรฐานการแข่งขันคณิตศาสตร์โอลิมปิกระหว่างประเทศ (IMO Benchmark)",
  cards: [
    {
      title: "ข้อสอบอัตนัย 8 ข้อ (2 วันการแข่งขัน)",
      desc: "การสอบแบ่งเป็น 2 วัน วันละ 4 ข้อ (วันแรกข้อ 1–4, วันที่สองข้อ 5–8) เพื่อทดสอบทักษะหลากหลายด้าน เช่น พีชคณิต เรขาคณิต คอมบินาทอริกส์ และทฤษฎีจำนวน",
      accent: COLOR_PRIMARY
    },
    {
      title: "เกณฑ์คะแนนละเอียด 0 ถึง 7 คะแนนต่อข้อ",
      desc: "การให้คะแนนไม่ได้มีแค่ถูกหรือผิด แต่ตรวจตามขั้นตอนการพิสูจน์ (Step-by-step logic) โดยมีคะแนนเต็มข้อละ 7 คะแนน คะแนนรวมเต็ม 56 คะแนน",
      accent: COLOR_DARK
    },
    {
      title: "การหมุนเวียนตรวจข้ามศูนย์เพื่อความยุติธรรม",
      desc: "เพื่อป้องกันความเอนเอียง อาจารย์ประจำศูนย์จะไม่ตรวจข้อสอบของนักเรียนศูนย์ตนเอง แต่จะหมุนเวียนให้กรรมการคู่อื่นตรวจ แล้วนำผลคะแนนกลับมาให้อาจารย์ประจำศูนย์รับรอง",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "เกณฑ์คะแนนเป็นแบบ 0 ถึง 7 คะแนนตามมาตรฐาน IMO และต้องหมุนเวียนตรวจข้อสอบอย่างเคร่งครัดเพื่อความยุติธรรมครับ"
});

// =========================================================================
// PART 2: ปัญหาของระบบตรวจแบบกระดาษเดิม (SLIDES 5 - 9)
// =========================================================================

// Slide 5: The 4 Core Problems Overview
renderConceptSlide({
  badge: "2. PROBLEM STATEMENT",
  title: "ทำไมระบบตรวจข้อสอบเดิมด้วยกระดาษถึงไม่ตอบโจทย์?",
  subtitle: "4 อุปสรรคและข้อจำกัดสำคัญที่พบในกระบวนการแข่งขันแบบดั้งเดิม (Paper-Based Process)",
  cards: [
    {
      title: "1. การรวมคะแนนผิดพลาด",
      desc: "การบวกคะแนนย่อยบนกระดาษและคีย์ซ้ำลงตารางสรุป เสี่ยงต่อความคลาดเคลื่อน ขาดระบบตรวจทานอัตโนมัติ",
      accent: COLOR_PRIMARY
    },
    {
      title: "2. จุดติดขัดและคิวรอสะสม",
      desc: "ข้อสอบ 16 ศูนย์หลั่งไหลเข้ามาพร้อมกัน แต่โต๊ะตรวจมีจำกัด ทำให้งานกระจุกตัว เกิดการรอคิวนานหลายชั่วโมง",
      accent: COLOR_DARK
    },
    {
      title: "3. ความเสี่ยงคะแนนรั่วไหล",
      desc: "กระดาษคำตอบและคะแนนอาจถูกแอบถ่ายรูปก่อนประกาศผลอย่างเป็นทางการ และไม่สามารถสืบหาต้นตอได้",
      accent: COLOR_PRIMARY
    },
    {
      title: "4. ไม่มีสมุดบันทึกประวัติ",
      desc: "เมื่อมีการแก้ไขคะแนน ไม่มีระบบบันทึกว่าใครแก้ แก้เมื่อไหร่ และแก้เพราะอะไร ขาดหลักฐานตรวจสอบความโปร่งใส",
      accent: COLOR_DARK
    }
  ],
  notes: "ในอดีตเราพบปัญหาหลัก 4 ประการ ทั้งเรื่องการบวกคะแนนผิดพลาด การรอคิวกระจุกตัว ความเสี่ยงข้อมูลรั่วไหล และการขาดประวัติตรวจสอบครับ"
});

// Slide 6: Problem 1 - Manual Calculation Errors
renderConceptSlide({
  badge: "2. PROBLEM STATEMENT",
  title: "ปัญหาที่ 1: ความผิดพลาดจากการรวมคะแนนด้วยมือ",
  subtitle: "ความเสี่ยงจากความเหนื่อยล้าของมนุษย์ (Human Error) ในการคำนวณและป้อนข้อมูลซ้ำ",
  cards: [
    {
      title: "การบวกคะแนนย่อยด้วยมือบนกระดาษ",
      desc: "กรรมการต้องตรวจข้อสอบต่อเนื่องหลายชั่วโมงและรวมคะแนนย่อยของแต่ละข้อลงในใบสรุปคะแนนด้วยตนเอง ซึ่งอาจเกิดการคิดเลขผิดพลาดจากความเหนื่อยล้า",
      accent: COLOR_PRIMARY
    },
    {
      title: "การคีย์ตัวเลขซ้ำลงคอมพิวเตอร์",
      desc: "เจ้าหน้าที่ต้องนำเอกสารคะแนนมาพิมพ์ซ้ำลงในโปรแกรมสเปรดชีต ซึ่งมีความเสี่ยงสูงที่จะพิมพ์ตัวเลขสลับหลักหรือกรอกผิดแถวของนักเรียน",
      accent: COLOR_DARK
    }
  ],
  notes: "การรวมคะแนนด้วยมือและการคีย์ซ้ำ มีโอกาสเกิด Human Error สูงมากเมื่อต้องตรวจข้อสอบจำนวนมหาศาลครับ"
});

// Slide 7: Problem 2 - Queue Bottleneck & Stalling
renderConceptSlide({
  badge: "2. PROBLEM STATEMENT",
  title: "ปัญหาที่ 2: จุดติดขัดและการรอคอยสะสม (คอขวดที่ทำให้งานชะงัก)",
  subtitle: "การกระจุกตัวของกระดาษคำตอบเนื่องจากทรัพยากรโต๊ะตรวจมีจำกัด (Queue Bottleneck)",
  cards: [
    {
      title: "โต๊ะตรวจมีจำกัด แต่งานมาพร้อมกัน",
      desc: "ข้อสอบของนักเรียนจากทั้ง 16 ศูนย์ถูกส่งเข้ามาพร้อมกัน แต่มีโต๊ะกรรมการตรวจเพียงไม่กี่โต๊ะ ทำให้เอกสารกองสะสมและต้องนั่งรอคิวเป็นเวลานาน",
      accent: COLOR_PRIMARY
    },
    {
      title: "ขาดการมองเห็นสถานะคิว (Lack of Visibility)",
      desc: "อาจารย์ผู้ควบคุมทีมและเจ้าหน้าที่ไม่ทราบว่าข้อสอบของศูนย์ตนเองตรวจถึงขั้นตอนใดแล้ว ต้องคอยเดินสอบถามหน้าห้องตรวจ ทำให้เกิดความวุ่นวายและแออัด",
      accent: COLOR_DARK
    }
  ],
  notes: "ปัญหาคอขวดคือจุดที่งานชะงักเพราะเอกสารส่งมาพร้อมกันแต่โต๊ะตรวจมีจำกัด ทำให้ทุกคนต้องนั่งรอและไม่รู้สถานะคิวครับ"
});

// Slide 8: Problem 3 - Security & Data Leak Risks
renderConceptSlide({
  badge: "2. PROBLEM STATEMENT",
  title: "ปัญหาที่ 3: ความเสี่ยงคะแนนรั่วไหลและการแอบถ่าย",
  subtitle: "เอกสารกระดาษและหน้าจอทั่วไปไม่มีกลไกป้องกันการแอบบันทึกภาพก่อนประกาศผล",
  cards: [
    {
      title: "การแอบถ่ายภาพคะแนนดิบ",
      desc: "ในระหว่างการตรวจหรือการตรวจทาน อาจมีบุคคลแอบถ่ายภาพหน้าจอหรือกระดาษสรุปคะแนนแล้วนำไปเผยแพร่ในโซเชียลมีเดียก่อนเวลาอันควร",
      accent: COLOR_PRIMARY
    },
    {
      title: "ไม่สามารถสืบหาต้นตอภาพหลุดได้",
      desc: "หากมีภาพคะแนนหลุดออกไป เอกสารกระดาษทั่วไปไม่มีรหัสระบุตัวตน ทำให้ไม่สามารถพิสูจน์ได้ว่าภาพถ่ายนั้นหลุดมาจากบุคคลใดหรือห้องตรวจใด",
      accent: COLOR_DARK
    }
  ],
  notes: "กระดาษคำตอบเสี่ยงต่อการถูกแอบถ่ายภาพคะแนนหลุดออกไปก่อนประกาศผล และไม่สามารถตรวจสอบได้ว่าใครเป็นคนถ่ายครับ"
});

// Slide 9: Problem 4 - Lack of Audit Trail & Transparency
renderConceptSlide({
  badge: "2. PROBLEM STATEMENT",
  title: "ปัญหาที่ 4: ขาดสมุดบันทึกประวัติการแก้ไขย้อนหลัง",
  subtitle: "การขีดฆ่าหรือแก้ไขคะแนนบนกระดาษขาดหลักฐานยืนยันความโปร่งใส (No Audit Trail)",
  cards: [
    {
      title: "ไม่ทราบว่าใครเป็นผู้แก้ไขคะแนน",
      desc: "เมื่ออาจารย์ประจำศูนย์ขอทักท้วงและมีการปรับเปลี่ยนคะแนน หากใช้กระดาษจะมีการขีดฆ่าตัวเลขเดิม ซึ่งยากต่อการตรวจสอบย้อนหลังว่าใครเป็นผู้อนุญาตให้แก้",
      accent: COLOR_PRIMARY
    },
    {
      title: "ขาดการบันทึกเวลาและเหตุผลประกอบ",
      desc: "ไม่มีหลักฐานเชิงประจักษ์ว่าคะแนนถูกแก้ไขเมื่อเวลาใด และแก้ไขด้วยเหตุผลใด ทำให้เกิดข้อครหาและลดทอนความน่าเชื่อถือของการแข่งขัน",
      accent: COLOR_DARK
    }
  ],
  notes: "เมื่อมีการแก้คะแนนบนกระดาษ ไม่มีบันทึกย้อนหลังว่าใครแก้เมื่อไหร่และเพราะอะไร ทำให้ตรวจสอบความโปร่งใสได้ยากครับ"
});

// Slide 10: SWOT Analysis Diagram
renderDiagramSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "การวิเคราะห์สภาพแวดล้อมระบบ: แผนภาพ SWOT Analysis",
  subtitle: "การวิเคราะห์จุดแข็ง จุดอ่อน โอกาส และอุปสรรคของโครงงาน จากเล่มวิจัย (ภาพที่ 3-1)",
  image: assets.swotDiagram,
  summaryTitle: "ข้อสรุปสำคัญจากการวิเคราะห์ SWOT:",
  summaryDesc: "จุดแข็งคือขอบเขตระบบและกติกาชัดเจน 16 ศูนย์ ขณะที่จุดอ่อนคือระบบเดิมช้าและใช้กระดาษ โครงงานจึงใช้โอกาสจากเว็บเทคโนโลยีมาแก้ปัญหาคอขวดและเพิ่มความปลอดภัยครับ",
  notes: "ภาพที่ 3-1 คือแผนภาพ SWOT Analysis จากเล่มวิทยานิพนธ์ แสดงการวิเคราะห์จุดแข็ง จุดอ่อน โอกาส และอุปสรรคในการพัฒนาระบบ TMO ครับ"
});

// Slide 11: SDLC 7 Steps
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "วงจรการพัฒนาระบบ 7 ขั้นตอน (SDLC Framework)",
  subtitle: "การดำเนินงานตามหลักวิศวกรรมซอฟต์แวร์มาตรฐานสากล (ธิตินนท์ และ ณัฐกร, 2566)",
  cards: [
    {
      title: "1. ศึกษาปัญหา ➔ 2. วิเคราะห์ระบบ",
      desc: "วิเคราะห์จุดติดขัดของการตรวจข้อสอบ 16 ศูนย์ และจัดทำผังความต้องการของผู้ใช้งานอย่างละเอียด",
      accent: COLOR_PRIMARY
    },
    {
      title: "3. ออกแบบ ➔ 4. พัฒนาระบบ",
      desc: "ออกแบบฐานข้อมูล 12 ตาราง และพัฒนาหน้าจอการใช้งานให้เรียบง่าย รองรับทั้งคอมพิวเตอร์และมือถือ",
      accent: COLOR_DARK
    },
    {
      title: "5. ทดสอบ ➔ 6. ติดตั้ง ➔ 7. ดูแลรักษา",
      desc: "ทดสอบความถูกต้องอัตโนมัติ 407 รายการ ติดตั้งระบบแจกจ่าย QR Code และติดตามประวัติการใช้งานต่อเนื่อง",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "เราดำเนินงานตามวงจรพัฒนาระบบ SDLC 7 ขั้นตอนของธิตินนท์และณัฐกร ครอบคลุมตั้งแต่การวิเคราะห์ปัญหาไปจนถึงการทดสอบและบำรุงรักษาครับ"
});


// =========================================================================
// PART 3: ทบทวนวรรณกรรมและกรอบกฎหมาย (SLIDES 12 - 17)
// =========================================================================

// Slide 12: Literature Review 1 - Natthapol (2568)
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "งานวิจัยที่ 1: ระบบคิวผ่านเว็บเบราว์เซอร์ (ณัฐพล และคณะ, 2568)",
  subtitle: "การนำสถาปัตยกรรมระบบคิวผ่านเว็บมาประยุกต์ใช้เพื่อตัดขั้นตอนการใช้กระดาษ (Paperless)",
  cards: [
    {
      title: "บริบทของงานวิจัยต้นแบบ",
      desc: "ศึกษาและพัฒนาระบบคิวร้านอาหารผ่าน Web Browser โดยใช้เทคโนโลยีเว็บสมัยใหม่ เพื่อแก้ปัญหาความล่าช้าและการสูญหายของบัตรคิวกระดาษ",
      accent: COLOR_DARK
    },
    {
      title: "สิ่งที่นำมาปรับใช้ในระบบ TMO",
      desc: "นำแนวคิดการแบ่งผู้ใช้งานออกเป็นระดับต่างๆ (ผู้ดูแลระบบ, ผู้ปฏิบัติงาน, ผู้รับบริการ) และการตัดขั้นตอนการเดินเอกสารกระดาษทิ้งไป 100% มาเป็นแกนหลักของ TMO",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "งานวิจัยของณัฐพลและคณะ (2568) ให้แนวคิดเรื่องการตัดกระดาษและการจัดระดับผู้ใช้ในระบบคิวเว็บเบราว์เซอร์ครับ"
});

// Slide 13: Literature Review 2 - Paweena (2569)
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "งานวิจัยที่ 2: การลดเวลารอคอยและความแออัด (ปวีณา และคณะ, 2569)",
  subtitle: "การประยุกต์ใช้อัลกอริทึมจัดลำดับคิวและการแจ้งเตือนสถานะทันที (Wait-time Reduction)",
  cards: [
    {
      title: "บริบทของงานวิจัยต้นแบบ",
      desc: "ศึกษาระบบบริหารจัดการคิวแบบบูรณาการร่วมกับการแจ้งเตือนเรียลไทม์ เพื่อแก้ปัญหาผู้รับบริการต้องนั่งรอนานและเกิดความแออัดสะสมในพื้นที่ให้บริการ",
      accent: COLOR_DARK
    },
    {
      title: "สิ่งที่นำมาปรับใช้ในระบบ TMO",
      desc: "นำอัลกอริทึมการคำนวณลำดับคิวและการกระจายสัญญาณสถานะคิวตรวจแบบเรียลไทม์มาใช้ เพื่อให้อาจารย์และนักเรียนทราบสถานะได้ทันทีโดยไม่ต้องมายืนออกันหน้าห้องตรวจ",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "งานวิจัยของปวีณาและคณะ (2569) ชูจุดเด่นเรื่องการลดเวลารอคอยและการแจ้งเตือนเรียลไทม์เพื่อลดความแออัดในพื้นที่ครับ"
});

// Slide 14: Literature Review 3 - Suphiphat (2569)
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "งานวิจัยที่ 3: สถาปัตยกรรม 3 ชั้นและการแบ่งสิทธิ์ (สุพิพัฒน์ และคณะ, 2569)",
  subtitle: "การควบคุมสิทธิ์การเข้าถึงตามบทบาทหน้าที่ (Role-Based Access Control: RBAC)",
  cards: [
    {
      title: "บริบทของงานวิจัยต้นแบบ",
      desc: "พัฒนาระบบบริหารจัดการข้อมูลภาควิชาด้วยสถาปัตยกรรมแบบ 3 ชั้น (3-Tier) และจำกัดสิทธิ์การใช้งานผ่าน Role-Based Access Control (RBAC)",
      accent: COLOR_DARK
    },
    {
      title: "สิ่งที่นำมาปรับใช้ในระบบ TMO",
      desc: "นำโครงสร้าง 3-Tier มาแบ่งชั้นหน้าจอ สมองประมวลผล และฐานข้อมูลออกจากกันอย่างชัดเจน พร้อมจำกัดสิทธิ์ 4 บทบาท ป้องกันไม่ให้ผู้ใช้ก้าวก่ายสิทธิ์กัน",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "งานวิจัยของสุพิพัฒน์และคณะ (2569) นำเสนอโครงสร้าง 3-Tier และการแบ่งสิทธิ์ RBAC ซึ่งเรานำมาใช้ควบคุมความปลอดภัยในการเข้าถึงคะแนนครับ"
});

// Slide 15: Literature Review 4 - Sudthanom (2568)
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "งานวิจัยที่ 4: สแกน QR Code ดูคิวบนมือถือ (สุดถนอม และคณะ, 2568)",
  subtitle: "การเข้าถึงข้อมูลคิวแบบสะดวก รวดเร็ว โดยไม่ต้องมีบัญชีผู้ใช้ (Zero-Authentication QR Code)",
  cards: [
    {
      title: "บริบทของงานวิจัยต้นแบบ",
      desc: "พัฒนาระบบคิวผู้ป่วยนอก โรงพยาบาลศรีนครินทร์ โดยเปิดให้ผู้ป่วยและญาติสแกน QR Code เพื่อติดตามคิวตรวจผ่านสมาร์ตโฟนได้โดยไม่ต้องดาวน์โหลดแอปหรือล็อกอิน",
      accent: COLOR_DARK
    },
    {
      title: "สิ่งที่นำมาปรับใช้ในระบบ TMO",
      desc: "เปิดให้ครู นักเรียน และผู้ปกครอง ใช้มือถือสแกน QR Code หน้าห้องสอบเพื่อดู 'บอร์ดคิวถ่ายทอดสด' ได้ทันที อำนวยความสะดวกสูงสุดโดยไม่ต้องแจก Username/Password ให้คนทั่วไป",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "งานวิจัยของสุดถนอมและคณะ (2568) ใช้ QR Code ให้ผู้รับบริการสแกนดูคิวสดบนมือถือได้ทันทีโดยไม่ต้องล็อกอินครับ"
});

// Slide 16: Literature Review 5 - Kanchana & Siriporn (2569)
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "งานวิจัยที่ 5: ลายเซ็นอิเล็กทรอนิกส์ในเอกสารทางการ (กาญจนา และ ศิริพร, 2569)",
  subtitle: "การประยุกต์ใช้ลายมือชื่อดิจิทัลอัตโนมัติบนเอกสาร PDF เพื่อให้มีผลสมบูรณ์ทางกฎหมาย",
  cards: [
    {
      title: "บริบทของงานวิจัยต้นแบบ",
      desc: "ศึกษาการนำระบบลายเซ็นอิเล็กทรอนิกส์ (SiSignDoc) มาใช้ในระบบจัดซื้อจัดจ้าง รพ.ศิริราช เพื่อลดการใช้กระดาษและรับรองความถูกต้องของเอกสารทางการ",
      accent: COLOR_DARK
    },
    {
      title: "สิ่งที่นำมาปรับใช้ในระบบ TMO",
      desc: "นำการเซ็นชื่อบนหน้าจอ (Digital Canvas) ไปประทับลงในไฟล์ PDF รายงานผลคะแนนอัตโนมัติ พร้อมประทับตราเวลามาตรฐาน เพื่อใช้เป็นเอกสารรับรองคะแนนที่ถูกต้องตามกฎหมาย",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "งานวิจัยของกาญจนาและศิริพร (2569) แสดงการใช้ลายเซ็นดิจิทัลประทับลงบน PDF ให้มีผลสมบูรณ์ตามกฎหมายครับ"
});

// Slide 17: Legal Framework - Electronics Transactions Act 2544
renderConceptSlide({
  badge: "3. RESEARCH & METHODOLOGY",
  title: "กรอบกฎหมาย: พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544",
  subtitle: "การออกแบบระบบให้เอกสารผลคะแนนมีผลผูกพันทางกฎหมายครบถ้วนตามมาตรา 9 และมาตรา 26",
  cards: [
    {
      title: "1. พิสูจน์ตัวบุคคล (มาตรา 9 (1))",
      desc: "ระบุตัวอาจารย์ผู้ลงนามอย่างแม่นยำด้วยการเข้าสู่ระบบผ่านรหัสผ่านสองชั้น (2FA OTP) ส่งตรงเข้าเบอร์มือถือ",
      accent: COLOR_PRIMARY
    },
    {
      title: "2. แสดงเจตนาการยอมรับ (มาตรา 9 (2))",
      desc: "อาจารย์ประจำศูนย์กดยืนยันปุ่ม 'อนุมัติและลงนาม' เพื่อแสดงเจตนายอมรับความถูกต้องของคะแนนอย่างเป็นทางการ",
      accent: COLOR_DARK
    },
    {
      title: "3. ป้องกันการแก้ไข (มาตรา 26)",
      desc: "ระบบแปลงคะแนนเป็นไฟล์ PDF ที่ล็อกค่าไว้ หากมีการแก้ไขจะต้องขออนุมัติใหม่และสร้างเอกสารฉบับใหม่เท่านั้น",
      accent: COLOR_PRIMARY
    },
    {
      title: "4. ประทับเวลามาตรฐาน (มาตรา 26 (4))",
      desc: "มี Timestamp วันและเวลาสากลประทับอยู่บนเอกสารอย่างชัดเจน ใช้เป็นหลักฐานยืนยันในการแข่งขันระดับชาติ",
      accent: COLOR_DARK
    }
  ],
  notes: "เราออกแบบเอกสารรับรองคะแนนให้สอดคล้องกับ พ.ร.บ.ธุรกรรมอิเล็กทรอนิกส์ พ.ศ. 2544 ครบทั้ง 4 องค์ประกอบสำคัญครับ"
});

// =========================================================================
// PART 4: สถาปัตยกรรมระบบแบบเข้าใจง่าย (SLIDES 18 - 22)
// =========================================================================

// Slide 18: Full Architecture Overview Diagram
renderDiagramSlide({
  badge: "4. SYSTEM ARCHITECTURE",
  title: "ผังสถาปัตยกรรมรวม 3 ชั้น (3-Tier Architecture)",
  subtitle: "โครงสร้างระบบที่แยกหน้าที่ชัดเจน: หน้าจอผู้ใช้ - สมองประมวลผล - คลังจัดเก็บข้อมูล (ภาพที่ 2-1)",
  image: assets.archDiagram,
  summaryTitle: "ประโยชน์ของสถาปัตยกรรมแบบ 3 ชั้น (3-Tier):",
  summaryDesc: "การแยกหน้าจอ สมอง และฐานข้อมูลออกจากกัน ช่วยให้ระบบทำงานได้อย่างเสถียร รองรับการใช้งานพร้อมกันของ 16 ศูนย์โดยไม่มีการค้าง และปลอดภัยจากการถูกเจาะข้อมูลครับ",
  notes: "ภาพที่ 2-1 คือผังสถาปัตยกรรมระบบ TMO จากเล่มวิทยานิพนธ์ แสดงการทำงานประสานกันของทั้ง 3 ชั้นครับ"
});

// Slide 19: Architecture Layer 1 - Frontend
renderConceptSlide({
  badge: "4. SYSTEM ARCHITECTURE",
  title: "ชั้นที่ 1: ส่วนหน้าจอผู้ใช้งาน (Frontend Layer)",
  subtitle: "หน้าเว็บที่ออกแบบให้สวยงาม ใช้งานง่าย โหลดรวดเร็ว รองรับทั้งคอมพิวเตอร์และมือถือ",
  cards: [
    {
      title: "พัฒนาด้วย Next.js 16 และ React 19",
      desc: "ใช้เฟรมเวิร์กมาตรฐานระดับโลก ทำให้หน้าเว็บเปิดได้รวดเร็วทันใจ มีการเปลี่ยนหน้าจอที่ลื่นไหลไร้รอยต่อ ไม่ต้องรอโหลดหน้าใหม่ทั้งหน้า",
      accent: COLOR_PRIMARY
    },
    {
      title: "ดีไซน์ทันสมัยด้วย Tailwind CSS v4",
      desc: "จัดวางเลย์เอาต์แบบ Responsive Design ทำให้หน้าจอแสดงผลได้สวยงามคมชัด ทั้งบนจอคอมพิวเตอร์ โน้ตบุ๊ก แท็บเล็ต และสมาร์ตโฟนของอาจารย์และนักเรียน",
      accent: COLOR_DARK
    }
  ],
  notes: "ชั้นหน้าบ้านใช้ Next.js 16 และ Tailwind CSS เน้นความสวยงาม ใช้งานง่าย โหลดไว และรองรับทุกอุปกรณ์ครับ"
});

// Slide 20: Architecture Layer 2 - Backend
renderConceptSlide({
  badge: "4. SYSTEM ARCHITECTURE",
  title: "ชั้นที่ 2: ส่วนสมองประมวลผล (Backend Layer)",
  subtitle: "หัวใจการคำนวณคะแนนอัตโนมัติ การจัดคิว และการควบคุมความปลอดภัยของระบบ",
  cards: [
    {
      title: "ขับเคลื่อนด้วย NestJS 11 และ Node.js",
      desc: "โครงสร้างแบบ Modular Architecture ที่เป็นระเบียบ ทำให้ระบบประมวลผลคะแนนของนักเรียนทุกคนได้อย่างถูกต้อง แม่นยำ และรวดเร็วในระดับมิลลิวินาที",
      accent: COLOR_PRIMARY
    },
    {
      title: "ระบบคำนวณและตรวจสอบข้อมูลอัตโนมัติ",
      desc: "บวกคะแนนย่อย 0–7 คะแนนให้อัตโนมัติ ตรวจสอบความถูกต้องของสิทธิ์ผู้ใช้ และจัดสรรคิวไปยังกรรมการคู่ที่ว่างโดยอัตโนมัติ",
      accent: COLOR_DARK
    }
  ],
  notes: "ชั้นหลังบ้านใช้ NestJS 11 ควบคุมการคำนวณคะแนน ตรวจสอบสิทธิ์ และจัดคิวอัตโนมัติอย่างแม่นยำครับ"
});

// Slide 21: Architecture Layer 3 - Database
renderConceptSlide({
  badge: "4. SYSTEM ARCHITECTURE",
  title: "ชั้นที่ 3: ส่วนคลังจัดเก็บข้อมูล (Database Layer)",
  subtitle: "ฐานข้อมูล Microsoft SQL Server จัดเก็บข้อมูลอย่างเป็นระเบียบ ปลอดภัย ไร้ข้อมูลซ้ำซ้อน",
  cards: [
    {
      title: "จัดระเบียบตามมาตรฐาน 3NF (Third Normal Form)",
      desc: "แยกตารางข้อมูลออกเป็น 12 ตารางอย่างเป็นระบบ ไร้ข้อมูลซ้ำซ้อน ทำให้ค้นหาคะแนนและดึงรายงานผลสอบได้รวดเร็วทันใจ",
      accent: COLOR_PRIMARY
    },
    {
      title: "ความปลอดภัยและการสำรองข้อมูล (Data Reliability)",
      desc: "มีระบบป้องกันความเสียหายของข้อมูล รองรับการทำธุรกรรมแบบ ACID (Atomicity, Consistency, Isolation, Durability) ทำให้คะแนนไม่สูญหายแม้ไฟดับ",
      accent: COLOR_DARK
    }
  ],
  notes: "ชั้นฐานข้อมูลใช้ Microsoft SQL Server ออกแบบตามมาตรฐาน 3NF ทำให้ข้อมูลเป็นระเบียบ ปลอดภัย และดึงข้อมูลได้รวดเร็วครับ"
});

// Slide 22: Real-time Engine - SSE vs WebSockets
renderConceptSlide({
  badge: "4. SYSTEM ARCHITECTURE",
  title: "ระบบถ่ายทอดสดหน้าจออัตโนมัติ (Server-Sent Events: SSE)",
  subtitle: "เหตุผลที่ระบบเลือกใช้ SSE แทน WebSockets: เสถียรกว่า ประหยัดพลังงาน และทนทานต่อเน็ตหลุด",
  cards: [
    {
      title: "ทำไมถึงเลือก Server-Sent Events (SSE)?",
      desc: "• การส่งสัญญาณทางเดียวจากเซิร์ฟเวอร์ยิงตรงเข้าหน้าจอบอร์ดคิว\n• หน้าจออัปเดตเองอัตโนมัติทุกวินาทีโดยไม่ต้องกดรีเฟรช (F5)\n• หากเน็ตมือถือหลุด ระบบจะต่อสัญญาณใหม่ให้อัตโนมัติทันที\n• ไม่ถูกบล็อกโดยไฟร์วอลล์ของมหาวิทยาลัย ประหยัดแบตเตอรี่มือถือ",
      accent: COLOR_PRIMARY
    },
    {
      title: "ทำไมถึงไม่ใช้ WebSockets แบบเดิม?",
      desc: "• WebSockets เป็นการสื่อสารสองทาง ซึ่งเกินความจำเป็นสำหรับจอแสดงผล\n• มักมีปัญหากับระบบเครือข่ายของมหาวิทยาลัยหรือโรงแรมที่บล็อกพอร์ต\n• กินทรัพยากรหน่วยความจำของเซิร์ฟเวอร์สูงกว่าเมื่อมีคนเปิดดูพร้อมกันหลายร้อยคน",
      accent: COLOR_DARK
    }
  ],
  notes: "เราเลือกใช้ Server-Sent Events เพราะเหมาะกับการถ่ายทอดสดหน้าจอคิว มีความเสถียรสูงกว่า และผ่านไฟร์วอลล์ของเครือข่ายได้ 100% ครับ"
});

// =========================================================================
// PART 5: ผังการทำงานและโครงสร้างฐานข้อมูล (SLIDES 23 - 25)
// =========================================================================

// Slide 23: Dialog Diagram
renderDiagramSlide({
  badge: "5. DESIGN & DATABASE",
  title: "ผังการนำทางหน้าจอของผู้ใช้งาน (Dialog Diagram)",
  subtitle: "แผนภาพแสดงลำดับการเชื่อมโยงของจอภาพในระบบ TMO จากเล่มวิจัย (ภาพที่ 3-59)",
  image: assets.structureChart,
  summaryTitle: "ลำดับการทำงานที่กระชับและไม่ซับซ้อน:",
  summaryDesc: "ผู้ใช้เข้าสู่ระบบผ่านหน้า Login ➔ เข้าสู่ Dashboard ➔ แยกไปยังเมนูตามบทบาทหน้าที่ โดยมีจุดสำคัญคือคะแนนที่กรอกต้องผ่านการอนุมัติ (Approval) ก่อนจึงจะออกเป็นเอกสาร PDF ทางการได้ครับ",
  notes: "ภาพที่ 3-59 คือ Dialog Diagram แสดงผังการเชื่อมโยงของแต่ละหน้าจอในระบบตามที่ออกแบบไว้ในเล่มวิทยานิพนธ์ครับ"
});

// Slide 24: Chen ER Model
renderDiagramSlide({
  badge: "5. DESIGN & DATABASE",
  title: "แผนภาพความสัมพันธ์เชิงมโนทัศน์ (Conceptual Chen ER Model)",
  subtitle: "โครงสร้างความสัมพันธ์ระหว่างข้อมูลผู้ใช้งาน ศูนย์สอบ ข้อสอบ คะแนน และคิวตรวจ (ภาพที่ 3-57)",
  image: assets.chenErDiagram,
  summaryTitle: "ความสัมพันธ์ของข้อมูลสำคัญในระบบ TMO:",
  summaryDesc: "แสดงความสัมพันธ์แบบ 1-to-Many ระหว่างศูนย์สอบกับนักเรียน, ข้อสอบกับเกณฑ์คะแนน, และการผูกคิวตรวจเข้ากับคะแนนและประวัติการลงนามของอาจารย์ประจำศูนย์ครับ",
  notes: "ภาพที่ 3-57 คือแผนภาพ Chen ER Model แสดงเอนทิตีและความสัมพันธ์ของข้อมูลในระดับมโนทัศน์ครับ"
});

// Slide 25: Relational Schema (12 Tables)
renderDiagramSlide({
  badge: "5. DESIGN & DATABASE",
  title: "โครงสร้างฐานข้อมูลเชิงสัมพันธ์ 12 ตาราง (Relational Schema)",
  subtitle: "ตารางฐานข้อมูลที่ผ่านการจัดระเบียบ 3NF เพื่อประสิทธิภาพและความปลอดภัยสูงสุด (ภาพที่ 3-58)",
  image: assets.erDiagram,
  summaryTitle: "ความสมบูรณ์ของฐานข้อมูลเชิงสัมพันธ์ 12 ตาราง:",
  summaryDesc: "ประกอบด้วยตาราง Users, Schools, Students, Queues, Scores, EditRequests, CompetitionSettings, และ AuditLogs เชื่อมโยงกันด้วย Primary/Foreign Keys อย่างรัดกุมครับ",
  notes: "ภาพที่ 3-58 คือ Relational Database Schema ตารางข้อมูลทั้ง 12 ตารางที่พัฒนาขึ้นใช้งานจริงในระบบครับ"
});


// =========================================================================
// PART 6: ขั้นตอนการทำงานของแต่ละกลุ่มผู้ใช้งาน (SLIDES 26 - 43)
// =========================================================================

// --- กลุ่มที่ 1: ผู้ดูแลระบบ (Administrator) ---

// Slide 26: Admin Role Scope
renderConceptSlide({
  badge: "6. USER WORKFLOW: ADMIN",
  title: "ภาพรวมสิทธิ์และหน้าที่ของผู้ดูแลระบบ (Administrator)",
  subtitle: "ผู้ควบคุมและอำนวยความสะดวกในกระบวนการจัดสอบทั้งหมดของทั้ง 16 ศูนย์",
  cards: [
    {
      title: "การจัดการการสอบรอบต่างๆ (Competition Settings)",
      desc: "เปิด-ปิดระบบการให้คะแนน กำหนดรอบการสอบ วันที่ และควบคุมสถานะของระบบโดยรวมให้เป็นไปตามตารางเวลาการแข่งขัน",
      accent: COLOR_DARK
    },
    {
      title: "การสร้างและควบคุมคิวตรวจข้อสอบ (Queue Control)",
      desc: "จัดสรรคิวของศูนย์สอบ 16 แห่ง และมอบหมายชุดข้อสอบให้แก่คณะกรรมการตรวจข้อสอบแต่ละคู่ได้อย่างยืดหยุ่น",
      accent: COLOR_PRIMARY
    },
    {
      title: "การตรวจสอบความปลอดภัยและประวัติย้อนหลัง (Audit Log)",
      desc: "เข้าถึงบันทึกประวัติการใช้งานทั้งหมดของระบบ เพื่อตรวจสอบความโปร่งใสและแก้ไขปัญหาขัดข้องได้ทันท่วงที",
      accent: COLOR_DARK
    }
  ],
  notes: "ผู้ดูแลระบบมีหน้าที่ควบคุมระบบโดยรวม เปิด-ปิดรอบการสอบ จัดสรรคิวตรวจข้อสอบ และดูแลความปลอดภัยของข้อมูลทั้งหมดครับ"
});

// Slide 27: Admin Step 1 - Login with OTP
renderStepSlide({
  badge: "6. USER WORKFLOW: ADMIN",
  title: "ผู้ดูแลระบบ ขั้นตอนที่ 1: การเข้าสู่ระบบปลอดภัย 2 ชั้น (OTP)",
  subtitle: "การยืนยันตัวตนผ่านเบอร์โทรศัพท์และรหัส SMS เพื่อป้องกันการสวมรอย 100%",
  stepNumber: "ขั้นตอนที่ 1",
  stepColor: COLOR_PRIMARY,
  stepTitle: "ป้อนเบอร์โทรและยืนยันรหัส OTP 6 หลัก",
  instruction: "1. เข้าสู่หน้าเว็บหลัก แล้วกรอกหมายเลขโทรศัพท์ที่ลงทะเบียนไว้\n2. กดปุ่มสีน้ำเงิน 'ขอรหัส OTP' เพื่อให้ระบบส่งรหัส SMS เข้ามือถือ\n3. นำรหัส 6 หลักที่ได้รับมากรอกลงในช่อง แล้วกดปุ่มสีเขียวเพื่อเข้าสู่ระบบ",
  actionButton: {
    color: BTN_BLUE,
    text: "กดปุ่มสีน้ำเงิน: ขอรหัส OTP ➔ กดปุ่มเขียว: ยืนยันตัวตน"
  },
  image: assets.otpLogin,
  notes: "ขั้นตอนแรก ผู้ดูแลระบบจะล็อกอินด้วยเบอร์โทรศัพท์ กดปุ่มสีน้ำเงินขอรหัส OTP แล้วกรอกรหัส 6 หลักเพื่อยืนยันตัวตนอย่างปลอดภัยครับ"
});

// Slide 28: Admin Step 2 - Dashboard Overview
renderStepSlide({
  badge: "6. USER WORKFLOW: ADMIN",
  title: "ผู้ดูแลระบบ ขั้นตอนที่ 2: หน้าแดชบอร์ดและภาพรวมการสอบ",
  subtitle: "มองเห็นสถานะคิวการตรวจข้อสอบของทั้ง 16 ศูนย์ได้ครบถ้วนในหน้าจอเดียว",
  stepNumber: "ขั้นตอนที่ 2",
  stepColor: COLOR_PRIMARY,
  stepTitle: "ตรวจสอบสถานะคิวของทุกศูนย์แบบเรียลไทม์",
  instruction: "1. แดชบอร์ดจะแสดงแถบสรุปสถานะคิวทั้งหมด\n2. ตารางจะแบ่งสถานะชัดเจนด้วยแถบสี:\n   • สีเหลือง: รอกรรมการตรวจ (Waiting)\n   • สีน้ำเงิน: กำลังตรวจข้อสอบ (Grading)\n   • สีส้ม: รออาจารย์ประจำศูนย์ลงนาม (Pending Approval)\n   • สีเขียว: ตรวจและลงนามเสร็จสิ้น (Completed)",
  actionButton: {
    color: COLOR_DARK,
    text: "เลือกเมนูด้านซ้าย: จัดการคิวตรวจข้อสอบ (Queue Management)"
  },
  image: assets.queueAdmin,
  notes: "ในหน้าแดชบอร์ด ผู้ดูแลระบบจะเห็นสถานะคิวทั้งหมดแบบเรียลไทม์ โดยมีแถบสีบอกสถานะชัดเจนว่าศูนย์ไหนรอตรวจ กำลังตรวจ หรือเสร็จแล้วครับ"
});

// Slide 29: Admin Step 3 - Create Queue
renderStepSlide({
  badge: "6. USER WORKFLOW: ADMIN",
  title: "ผู้ดูแลระบบ ขั้นตอนที่ 3: การสร้างคิวตรวจข้อสอบใหม่",
  subtitle: "การจัดสรรชุดข้อสอบและส่งคิวเข้าสู่โต๊ะกรรมการตรวจอย่างเป็นระบบ",
  stepNumber: "ขั้นตอนที่ 3",
  stepColor: COLOR_PRIMARY,
  stepTitle: "กดสร้างคิวและเลือกศูนย์สอบที่ต้องการส่งตรวจ",
  instruction: "1. มองไปที่มุมขวาบนของหน้าจอจัดการคิว\n2. สังเกตและคลิกที่ปุ่มสีเขียวเด่น '+ เพิ่มคิวตรวจข้อสอบ'\n3. กล่องข้อความจะปรากฏขึ้นมา ให้เลือกรอบการสอบและศูนย์ สอวน. ที่ต้องการส่งตรวจ\n4. กดยืนยัน ระบบจะสร้างคิวและส่งสัญญาณไปยังกรรมการทันที",
  actionButton: {
    color: BTN_GREEN,
    text: "กดปุ่มสีเขียวมุมขวาบน: [ + เพิ่มคิวตรวจข้อสอบ ]"
  },
  image: assets.queueCreate,
  notes: "เมื่อมีข้อสอบชุดใหม่ส่งเข้ามา ผู้ดูแลระบบเพียงคลิกปุ่มสีเขียว '+ เพิ่มคิวตรวจข้อสอบ' เลือกศูนย์สอบ แล้วกดยืนยัน คิวจะถูกกระจายไปให้กรรมการทันทีครับ"
});

// Slide 30: Admin Step 4 - School & User Management
renderStepSlide({
  badge: "6. USER WORKFLOW: ADMIN",
  title: "ผู้ดูแลระบบ ขั้นตอนที่ 4: การจัดการศูนย์สอบ 16 แห่งและบัญชีผู้ใช้",
  subtitle: "การนำเข้าข้อมูลโรงเรียน จัดการรายชื่ออาจารย์ และตรวจสอบเบอร์โทรศัพท์ผู้ใช้งาน",
  stepNumber: "ขั้นตอนที่ 4",
  stepColor: COLOR_PRIMARY,
  stepTitle: "บริหารจัดการข้อมูลศูนย์และกำหนดสิทธิ์ผู้ใช้",
  instruction: "1. เข้าสู่เมนู 'จัดการโรงเรียนและศูนย์สอบ' ที่แถบเมนูด้านซ้าย\n2. ตรวจสอบรายชื่อศูนย์ สอวน. ทั้ง 16 ศูนย์ และรายชื่ออาจารย์ผู้ควบคุมทีม\n3. สามารถแก้ไขเบอร์โทรศัพท์สำหรับรับรหัส OTP หรืออัปโหลดรูปลายเซ็นล่วงหน้าได้",
  actionButton: {
    color: COLOR_DARK,
    text: "เลือกเมนูด้านซ้าย: จัดการโรงเรียนและสิทธิ์ผู้ใช้งาน (School & Users)"
  },
  image: assets.schoolMgmt,
  notes: "ในหน้านี้ ผู้ดูแลระบบสามารถตรวจสอบรายชื่อศูนย์ สอวน. จัดการเบอร์โทรศัพท์สำหรับรับ OTP และดูสถานะของอาจารย์ผู้ใช้งานทุกคนได้ครับ"
});

// --- กลุ่มที่ 2: กรรมการตรวจข้อสอบ (Examiner) ---

// Slide 31: Examiner Role Scope
renderConceptSlide({
  badge: "6. USER WORKFLOW: EXAMINER",
  title: "ภาพรวมหน้าที่ของกรรมการตรวจข้อสอบ (Examiner)",
  subtitle: "การตรวจประเมินผลคะแนนอย่างเป็นกลาง แม่นยำ และรักษาความลับสูงสุด",
  cards: [
    {
      title: "รับตรวจเฉพาะข้อที่ได้รับมอบหมาย",
      desc: "ระบบจะจำกัดให้กรรมการเห็นเฉพาะข้อสอบที่ตนรับผิดชอบ (เช่น โต๊ะที่ 1 รับตรวจข้อ 1–5 หรือโต๊ะที่ 2 รับตรวจข้อ 6–8) เพื่อความเชี่ยวชาญและความรวดเร็ว",
      accent: COLOR_DARK
    },
    {
      title: "ตรวจข้อสอบนักเรียน 6 คนต่อศูนย์",
      desc: "เมื่อถึงคิวของศูนย์ใด กรรมการจะตรวจกระดาษคำตอบของตัวแทนนักเรียนศูนย์นั้นทั้ง 6 คน และป้อนคะแนนอัตนัย 0 ถึง 7 คะแนนลงในระบบ",
      accent: COLOR_PRIMARY
    },
    {
      title: "ส่งต่อให้อาจารย์ประจำศูนย์ตรวจทาน",
      desc: "เมื่อตรวจเสร็จสิ้น กรรมการจะกดส่งคะแนนเข้าสู่ระบบ เพื่อให้อาจารย์ผู้ควบคุมทีมของศูนย์นั้นเข้ามารับทราบและตรวจทานผลคะแนน",
      accent: COLOR_DARK
    }
  ],
  notes: "กรรมการตรวจข้อสอบจะเห็นเฉพาะข้อที่ตนได้รับมอบหมาย ตรวจนักเรียน 6 คนต่อศูนย์ และส่งคะแนนเข้าสู่ระบบเพื่อให้อาจารย์ประจำศูนย์ตรวจทานครับ"
});

// Slide 32: Examiner Step 1 - Receive Queue
renderStepSlide({
  badge: "6. USER WORKFLOW: EXAMINER",
  title: "กรรมการตรวจ ขั้นตอนที่ 1: การรับคิวข้อสอบเพื่อเริ่มตรวจ",
  subtitle: "การเปิดชุดกระดาษคำตอบของศูนย์ที่ถึงคิวตรวจตามลำดับคิวในระบบ",
  stepNumber: "ขั้นตอนที่ 1",
  stepColor: COLOR_PRIMARY,
  stepTitle: "คลิกเลือกศูนย์สอบที่ถึงคิวเพื่อเปิดหน้าจอตรวจ",
  instruction: "1. เมื่อล็อกอินเข้ามา หน้าจอจะแสดงรายการคิวที่รอให้ท่านตรวจ\n2. สังเกตคิวที่มีสถานะ 'พร้อมตรวจ' (Ready)\n3. คลิกที่แถบของศูนย์สอบนั้น ระบบจะเปิดหน้าจอกรอกคะแนนพร้อมแสดงรายชื่อนักเรียน 6 คนทันที",
  actionButton: {
    color: BTN_BLUE,
    text: "คลิกแถบคิว: เลือกศูนย์สอบที่ถึงคิวเพื่อเริ่มตรวจข้อสอบ"
  },
  image: assets.committeeReal,
  notes: "กรรมการจะเห็นคิวที่ส่งมาถึงโต๊ะของตนเอง เพียงคลิกที่แถบของศูนย์ที่ถึงคิว ระบบจะเปิดหน้าตรวจข้อสอบของนักเรียนศูนย์นั้นขึ้นมาทันทีครับ"
});

// Slide 33: Examiner Step 2 - Score Entry (0-7 Points)
renderStepSlide({
  badge: "6. USER WORKFLOW: EXAMINER",
  title: "กรรมการตรวจ ขั้นตอนที่ 2: การป้อนคะแนนอัตนัย (0 ถึง 7 คะแนน)",
  subtitle: "ระบบกรอกคะแนนที่สะดวก รวดเร็ว พร้อมระบบป้องกันการพิมพ์คะแนนเกินอัตโนมัติ",
  stepNumber: "ขั้นตอนที่ 2",
  stepColor: COLOR_PRIMARY,
  stepTitle: "พิมพ์คะแนนของนักเรียนแต่ละคนลงในช่องคะแนน",
  instruction: "1. ตรวจกระดาษคำตอบแล้วพิมพ์คะแนน (0 ถึง 7) ลงในช่องของนักเรียนแต่ละคน\n2. ระบบคิดคำนวณผลรวมคะแนนให้อัตโนมัติ ไม่ต้องบวกเลขเอง\n3. ระบบความปลอดภัย: หากเผลอพิมพ์เลขเกิน 7 หรือใส่เลขติดลบ ระบบจะเตือนด้วยกรอบสีแดงและล็อกไม่ให้บันทึกทันที",
  actionButton: {
    color: COLOR_DARK,
    text: "ป้อนคะแนนในช่อง: [ 0 ถึง 7 คะแนน ] (ระบบตรวจสอบอัตโนมัติ)"
  },
  image: assets.committeeGrading,
  notes: "กรรมการป้อนคะแนน 0 ถึง 7 คะแนนในช่องของนักเรียนแต่ละคน ระบบจะรวมคะแนนให้อัตโนมัติ และมีระบบป้องกันหากเผลอพิมพ์เกิน 7 คะแนนครับ"
});

// Slide 34: Examiner Step 3 - Digital Watermark Security
renderConceptSlide({
  badge: "6. USER WORKFLOW: EXAMINER",
  title: "กรรมการตรวจ ขั้นตอนที่ 3: ระบบลายน้ำดิจิทัลป้องกันการแอบถ่าย",
  subtitle: "มาตรการความปลอดภัยสูงสุดเพื่อป้องกันข้อมูลคะแนนรั่วไหลก่อนการประกาศผลอย่างเป็นทางการ",
  cards: [
    {
      title: "ลายน้ำระบุชื่อกรรมการบนหน้าจอ (Dynamic Watermark)",
      desc: "ในขณะที่เปิดหน้าจอตรวจข้อสอบ ระบบจะประทับชื่อ นามสกุล และรหัสประจำตัวของกรรมการ พาดผ่านหน้าจอเป็นลายน้ำจางๆ ตลอดเวลา โดยไม่บดบังการอ่านตัวเลข",
      accent: COLOR_PRIMARY
    },
    {
      title: "รู้ต้นตอภาพหลุดได้ทันที 100%",
      desc: "หากมีบุคคลใดใช้โทรศัพท์มือถือแอบถ่ายภาพหน้าจอคะแนนออกไป ภาพที่ถ่ายติดจะมีชื่อของเจ้าของเครื่องปรากฏอยู่ ทำให้สืบหาต้นตอได้ทันทีและป้องกันการทุจริตได้อย่างเด็ดขาด",
      accent: COLOR_DARK
    }
  ],
  notes: "บนหน้าจอตรวจคะแนนจะมีลายน้ำดิจิทัลระบุชื่อกรรมการพาดอยู่ตลอดเวลา หากมีใครแอบถ่ายภาพหน้าจอออกไป จะทราบต้นตอได้ทันที 100% ครับ"
});

// Slide 35: Examiner Step 4 - Save Draft or Submit
renderConceptSlide({
  badge: "6. USER WORKFLOW: EXAMINER",
  title: "กรรมการตรวจ ขั้นตอนที่ 4: บันทึกร่างคะแนน หรือส่งตรวจรับรอง",
  subtitle: "การเลือกการดำเนินการเมื่อตรวจข้อสอบเสร็จสิ้น หรือต้องการพักการตรวจไว้ชั่วคราว",
  cards: [
    {
      title: "ทางเลือกที่ 1: กดปุ่มสีฟ้า 'บันทึกร่างคะแนน (Save Draft)'",
      desc: "ใช้ในกรณีที่ยังตรวจไม่ครบทุกคน หรือต้องการพักการตรวจไว้ก่อน ระบบจะบันทึกคะแนนที่กรอกไว้ลงฐานข้อมูลอย่างปลอดภัย และสามารถกลับมาตรวจต่อได้ทุกเมื่อ",
      accent: BTN_BLUE
    },
    {
      title: "ทางเลือกที่ 2: กดปุ่มสีเขียว 'ส่งคะแนนตรวจ (Submit Score)'",
      desc: "ใช้เมื่อตรวจครบนักเรียนทั้ง 6 คนแล้ว ระบบจะทำการล็อกคะแนนชุดนี้ และส่งสัญญาณแจ้งเตือนไปยังอาจารย์ผู้ควบคุมทีมของศูนย์นั้นให้เข้ามาตรวจทานและลงนามทันที",
      accent: BTN_GREEN
    }
  ],
  notes: "กรรมการสามารถกดปุ่มสีฟ้าเพื่อบันทึกร่างไว้ก่อนได้ และเมื่อตรวจครบทุกคนแล้ว ให้กดปุ่มสีเขียวเพื่อส่งคะแนนให้อาจารย์ประจำศูนย์ตรวจทานครับ"
});

// --- กลุ่มที่ 3: อาจารย์ผู้ควบคุมทีม (Team Leader) ---

// Slide 36: Team Leader Role Scope
renderConceptSlide({
  badge: "6. USER WORKFLOW: TEAM LEADER",
  title: "ภาพรวมหน้าที่ของอาจารย์ผู้ควบคุมทีม (Team Leader)",
  subtitle: "ผู้พิทักษ์สิทธิ์และตรวจทานผลคะแนนของนักเรียนในศูนย์ของตนเองเพื่อความถูกต้องสูงสุด",
  cards: [
    {
      title: "เห็นเฉพาะคะแนนของศูนย์ตนเองเท่านั้น",
      desc: "ระบบจำกัดสิทธิ์ความปลอดภัยอย่างเคร่งครัด อาจารย์จะมองเห็นเฉพาะผลคะแนนของนักเรียนในศูนย์ตนเองเท่านั้น ไม่สามารถเข้าถึงหรือเห็นคะแนนของศูนย์อื่นได้",
      accent: COLOR_DARK
    },
    {
      title: "มีอำนาจตรวจทานและลงนามรับรอง (Approve & Sign)",
      desc: "ตรวจเช็กความถูกต้องของการให้คะแนนในแต่ละข้อ หากเห็นชอบจะทำการลงลายมือชื่อดิจิทัลเพื่อรับรองผลคะแนนอย่างเป็นทางการตามกฎหมาย",
      accent: COLOR_PRIMARY
    },
    {
      title: "มีสิทธิ์ขอทบทวนคะแนนหากมีข้อสงสัย (Request Edit)",
      desc: "หากพบว่าคะแนนมีความคลาดเคลื่อนหรือไม่ตรงกับวิธีทำของนักเรียน อาจารย์มีสิทธิ์กดขอทบทวนคะแนนพร้อมระบุเหตุผลเพื่อให้กรรมการตรวจซ้ำได้",
      accent: COLOR_DARK
    }
  ],
  notes: "อาจารย์ผู้ควบคุมทีมจะเห็นเฉพาะคะแนนของเด็กศูนย์ตนเอง มีอำนาจตรวจทาน ลงนามรับรองผล และมีสิทธิ์ขอทบทวนคะแนนหากมีข้อสงสัยครับ"
});

// Slide 37: Team Leader Step 1 - Review Scores
renderStepSlide({
  badge: "6. USER WORKFLOW: TEAM LEADER",
  title: "อาจารย์ประจำศูนย์ ขั้นตอนที่ 1: ตรวจทานคะแนนนักเรียน",
  subtitle: "การตรวจสอบผลคะแนนของนักเรียนทั้ง 6 คนอย่างละเอียดก่อนตัดสินใจรับรอง",
  stepNumber: "ขั้นตอนที่ 1",
  stepColor: COLOR_PRIMARY,
  stepTitle: "เปิดดูตารางสรุปคะแนนของนักเรียนในศูนย์ตนเอง",
  instruction: "1. เมื่อกรรมการส่งตรวจ หน้าจอของอาจารย์จะขึ้นแจ้งเตือนสถานะ 'รอตรวจสอบ'\n2. คลิกเข้าไปดูรายละเอียดคะแนนของนักเรียนทั้ง 6 คน\n3. ระบบจะแสดงคะแนนรายข้อ คะแนนรวม และเทียบกับเกณฑ์การให้คะแนนอย่างชัดเจน",
  actionButton: {
    color: COLOR_DARK,
    text: "คลิกดูรายการคะแนน: ตรวจทานคะแนนรายคนของศูนย์ตนเอง"
  },
  image: assets.approvalSign,
  notes: "ขั้นตอนแรก อาจารย์จะเปิดดูตารางคะแนนของนักเรียนทั้ง 6 คนในศูนย์ของตนเอง เพื่อตรวจเช็กความถูกต้องก่อนดำเนินการขั้นต่อไปครับ"
});

// Slide 38: Team Leader Step 2 - Approve & Sign Button
renderStepSlide({
  badge: "6. USER WORKFLOW: TEAM LEADER",
  title: "อาจารย์ประจำศูนย์ ขั้นตอนที่ 2: การกดปุ่มอนุมัติและลงนาม",
  subtitle: "การเริ่มกระบวนการลงลายมือชื่ออิเล็กทรอนิกส์เพื่อรับรองคะแนนอย่างเป็นทางการ",
  stepNumber: "ขั้นตอนที่ 2",
  stepColor: COLOR_PRIMARY,
  stepTitle: "กดปุ่มสีแดง 'อนุมัติและลงนาม' ด้านล่างตาราง",
  instruction: "1. เมื่อตรวจสอบแล้วพบว่าคะแนนถูกต้องครบถ้วนและเห็นชอบตามที่กรรมการประเมิน\n2. เลื่อนลงมาที่ด้านล่างสุดของหน้าจอคะแนน\n3. สังเกตและคลิกที่ปุ่มสีแดงเด่นชัด 'อนุมัติและลงนาม (Approve & Sign)' เพื่อเปิดหน้าต่างเซ็นชื่อ",
  actionButton: {
    color: BTN_RED,
    text: "กดปุ่มสีแดงเด่นด้านล่าง: [ อนุมัติและลงนาม (Approve & Sign) ]"
  },
  image: assets.approvalSign,
  notes: "เมื่อตรวจสอบคะแนนแล้วเห็นชอบ ให้อาจารย์เลื่อนลงมาด้านล่างแล้วกดปุ่มสีแดงเด่น 'อนุมัติและลงนาม' เพื่อเปิดหน้าต่างเซ็นชื่อดิจิทัลครับ"
});

// Slide 39: Team Leader Step 3 - Digital Signature Canvas
renderStepSlide({
  badge: "6. USER WORKFLOW: TEAM LEADER",
  title: "อาจารย์ประจำศูนย์ ขั้นตอนที่ 3: การวาดลายเซ็นดิจิทัลบนหน้าจอ",
  subtitle: "หน้าต่างวาดลายมือชื่ออิเล็กทรอนิกส์ (Digital Signature Canvas) ใช้งานง่ายและสะดวก",
  stepNumber: "ขั้นตอนที่ 3",
  stepColor: COLOR_PRIMARY,
  stepTitle: "เซ็นลายมือชื่อลงในกรอบสี่เหลี่ยมสีขาว",
  instruction: "1. หน้าต่างป๊อปอัปจะปรากฏขึ้นมาพร้อมกรอบผ้าใบสีขาวสำหรับเซ็นชื่อ\n2. สามารถใช้นิ้วมือ (บนมือถือ/แท็บเล็ต) หรือเมาส์ เซ็นลายมือชื่อจริงของท่านลงในกรอบ\n3. หากเซ็นไม่สวย สามารถกดปุ่ม 'ล้างลายเซ็น' เพื่อเซ็นใหม่ได้\n4. เมื่อพอใจแล้ว ให้คลิกที่ปุ่มสีเขียว 'ยืนยันการลงนาม' ทันที",
  actionButton: {
    color: BTN_GREEN,
    text: "กดปุ่มสีเขียว: [ ยืนยันการลงนาม (Confirm Signature) ]"
  },
  image: assets.signatureCanvas,
  notes: "หน้าต่างเซ็นชื่อจะเปิดขึ้นมา อาจารย์สามารถใช้นิ้วหรือเมาส์เซ็นลายมือชื่อลงในกรอบ แล้วคลิกปุ่มสีเขียว 'ยืนยันการลงนาม' ได้อย่างสะดวกสบายครับ"
});

// Slide 40: Team Leader Step 4 - Official PDF Score Document
renderStepSlide({
  badge: "6. USER WORKFLOW: TEAM LEADER",
  title: "อาจารย์ประจำศูนย์ ขั้นตอนที่ 4: การรับเอกสาร PDF รับรองคะแนนทางการ",
  subtitle: "ระบบสร้างเอกสารสรุปคะแนนพร้อมฝังลายเซ็นและตราประทับเวลามาตรฐานโดยอัตโนมัติ",
  stepNumber: "ขั้นตอนที่ 4",
  stepColor: COLOR_PRIMARY,
  stepTitle: "ระบบสร้างไฟล์ PDF ทางการพร้อมลายเซ็นอัตโนมัติ",
  instruction: "1. ทันทีที่กดยืนยัน ระบบจะนำภาพลายเซ็นไปฝังลงในเอกสาร PDF ทางการอัตโนมัติ\n2. มีการประทับตราเวลามาตรฐาน (Trusted Timestamp) วันที่และเวลาที่เซ็นอย่างชัดเจน\n3. อาจารย์สามารถดาวน์โหลดเก็บไว้เป็นหลักฐาน หรือส่งออกเป็นรายงานคะแนนได้ทันที",
  actionButton: {
    color: COLOR_DARK,
    text: "ดาวน์โหลดเอกสาร: [ ส่งออกเอกสาร PDF รับรองผลคะแนนทางการ ]"
  },
  image: assets.scoreTable,
  notes: "เมื่อเซ็นเสร็จ ระบบจะนำลายเซ็นไปประทับลงในเอกสาร PDF พร้อมวันเวลา Timestamp ทันที มีผลทางกฎหมายสมบูรณ์และดาวน์โหลดเก็บไว้ได้ครับ"
});

// Slide 41: Team Leader Step 5 - Request Score Edit
renderStepSlide({
  badge: "6. USER WORKFLOW: TEAM LEADER",
  title: "อาจารย์ประจำศูนย์ ขั้นตอนที่ 5: กรณีสงสัยและขอทบทวนคะแนน",
  subtitle: "กระบวนการขอตรวจทานคะแนนใหม่เพื่อความโปร่งใสและเป็นธรรมสูงสุดต่อนักเรียน",
  stepNumber: "ขั้นตอนที่ 5",
  stepColor: COLOR_PRIMARY,
  stepTitle: "กดปุ่มสีส้ม 'ขอทบทวนคะแนน' พร้อมระบุเหตุผล",
  instruction: "1. หากพบข้อสงสัย เช่น ตรวจข้ามขั้นตอน หรือคะแนนไม่ตรงกับวิธีทำของนักเรียน\n2. คลิกที่ปุ่มสีส้ม 'ขอทบทวนคะแนน (Request Edit)'\n3. พิมพ์ระบุข้อที่สงสัยและเหตุผลอย่างละเอียดลงในกล่องข้อความ\n4. กดยืนยัน คิวจะถูกตีกลับไปยังกรรมการเพื่อพิจารณาตรวจซ้ำอย่างเป็นทางการ",
  actionButton: {
    color: BTN_ORANGE,
    text: "กดปุ่มสีส้ม: [ ขอทบทวนคะแนน (Request Score Review) ]"
  },
  image: assets.scoreEdit,
  notes: "หากมีข้อสงสัย อาจารย์สามารถกดปุ่มสีส้ม 'ขอทบทวนคะแนน' พิมพ์เหตุผลที่ต้องการให้ตรวจซ้ำ ระบบจะส่งข้อสอบกลับไปให้กรรมการพิจารณาใหม่ทันทีครับ"
});

// --- กลุ่มที่ 4: บุคคลทั่วไป นักเรียน ผู้ปกครอง (Public & Observers) ---

// Slide 42: Public Step 1 - Scan QR Code on Mobile
renderStepSlide({
  badge: "6. USER WORKFLOW: PUBLIC",
  title: "บุคคลทั่วไป ขั้นตอนที่ 1: สแกน QR Code หน้าห้องสอบผ่านมือถือ",
  subtitle: "การเข้าถึงข้อมูลคิวแบบเรียลไทม์ได้อย่างง่ายดาย โดยไม่ต้องล็อกอิน (Zero-Authentication)",
  stepNumber: "ขั้นตอนที่ 1",
  stepColor: COLOR_PRIMARY,
  stepTitle: "เปิดกล้องมือถือแล้วสแกน QR Code หน้าห้องตรวจ",
  instruction: "1. ป้าย QR Code จะถูกตั้งไว้ที่หน้าห้องตรวจและจุดประชาสัมพันธ์ของการแข่งขัน\n2. นักเรียน ผู้ปกครอง หรือครู ใช้กล้องมือถือสแกน QR Code ได้ทันที\n3. หน้าเว็บแสดงผลจะเปิดขึ้นมาบนมือถือทันที โดยไม่ต้องดาวน์โหลดแอปและไม่ต้องมีรหัสผ่าน",
  actionButton: {
    color: BTN_BLUE,
    text: "สแกนด้วยมือถือ: [ สแกน QR Code หน้าห้องสอบเพื่อเข้าดูคิวสด ]"
  },
  image: assets.mobileLogin,
  notes: "นักเรียนและผู้ปกครองเพียงเปิดกล้องมือถือสแกน QR Code หน้าห้องสอบ หน้าเว็บจะเปิดขึ้นมาทันทีโดยไม่ต้องล็อกอิน สะดวกและรวดเร็วมากครับ"
});

// Slide 43: Public Step 2 - Live Queue Board
renderStepSlide({
  badge: "6. USER WORKFLOW: PUBLIC",
  title: "บุคคลทั่วไป ขั้นตอนที่ 2: หน้าจอบอร์ดคิวถ่ายทอดสด (Live Board)",
  subtitle: "ติดตามสถานะคิวของศูนย์ตนเองได้ทุกที่ทุกเวลา ข้อมูลอัปเดตอัตโนมัติทุกวินาที",
  stepNumber: "ขั้นตอนที่ 2",
  stepColor: COLOR_PRIMARY,
  stepTitle: "ดูสถานะคิวสดผ่านหน้าจอมือถือได้ตลอดเวลา",
  instruction: "1. หน้าจอจะแสดงรายการคิวของทั้ง 16 ศูนย์อย่างชัดเจน\n2. ดูได้ทันทีว่าศูนย์ของตนเองกำลังตรวจอยู่ที่โต๊ะไหน หรือรออีกกี่คิว\n3. หน้าจอจะอัปเดตสถานะเองอัตโนมัติทุกวินาที (ผ่านระบบ SSE) ไม่ต้องคอยกดย้อนกลับหรือรีเฟรชหน้าเว็บ",
  actionButton: {
    color: BTN_GREEN,
    text: "สถานะถ่ายทอดสด: [ บอร์ดแสดงสถานะคิวแบบเรียลไทม์ (Live SSE) ]"
  },
  image: assets.liveDisplay,
  notes: "บนหน้าจอมือถือจะแสดงบอร์ดคิวถ่ายทอดสด อัปเดตสถานะอัตโนมัติทุกวินาที ทำให้ทุกคนรู้ว่าถึงคิวของตนเองหรือยัง โดยไม่ต้องมายืนรอหน้าห้องสอบครับ"
});


// =========================================================================
// PART 7: ความปลอดภัย การทดสอบ และสรุปประโยชน์ (SLIDES 44 - 47)
// =========================================================================

// Slide 44: Immutable AuditLog
renderStepSlide({
  badge: "7. SECURITY & QUALITY ASSURANCE",
  title: "สมุดบันทึกประวัติการใช้งานถาวร (Immutable AuditLog)",
  subtitle: "บันทึกทุกความเคลื่อนไหวในระบบอย่างละเอียด ห้ามลบ ห้ามแก้ไข เพื่อความโปร่งใส 100%",
  stepNumber: "ระบบความปลอดภัย",
  stepColor: BTN_PURPLE,
  stepTitle: "บันทึกข้อมูลทุกครั้งที่มีการคลิก บันทึก หรือแก้ไข",
  instruction: "1. ทุกการกระทำจะถูกบันทึกอัตโนมัติ:\n   • ใครเป็นคนทำ (User ID & ชื่อ-นามสกุล)\n   • ทำหน้าที่อะไร (Role: Admin / Examiner / Leader)\n   • ทำการกระทำใด (Action: Login / Score / Sign / Edit)\n   • วันและเวลาที่แน่นอน (Exact Timestamp)\n   • คะแนนก่อนแก้ และคะแนนหลังแก้ (Old Value vs New Value)\n   • เลขเครื่องที่ใช้งาน (IP Address)\n2. ฐานข้อมูลถูกตั้งค่าห้ามลบและห้ามแก้ไขประวัตินี้โดยเด็ดขาด",
  actionButton: {
    color: BTN_PURPLE,
    text: "ระบบอัตโนมัติ: บันทึกประวัติถาวร (Immutable Audit Logging)"
  },
  image: assets.userPermissions,
  notes: "ระบบมีสมุดบันทึกประวัติถาวร บันทึกทุกการคลิก ใครทำอะไรเมื่อไหร่ คะแนนเก่าและใหม่คืออะไร และล็อกห้ามลบเด็ดขาด ทำให้ตรวจสอบความโปร่งใสได้ 100% ครับ"
});

// Slide 45: 4-Layer Security Overview
renderConceptSlide({
  badge: "7. SECURITY & QUALITY ASSURANCE",
  title: "เกราะป้องกันความปลอดภัย 4 ชั้นของระบบ TMO",
  subtitle: "มาตรการความปลอดภัยรอบด้านเพื่อปกป้องคะแนนสอบและข้อมูลส่วนบุคคลตามกฎหมาย",
  cards: [
    {
      title: "ชั้นที่ 1: การยืนยันตัวตน 2 ชั้น (2FA OTP)",
      desc: "ล็อกอินด้วยรหัสผ่านและรหัส SMS บนมือถือ ป้องกันการขโมยบัญชีหรือสวมรอยเข้าใช้งานได้อย่างเด็ดขาด",
      accent: COLOR_PRIMARY
    },
    {
      title: "ชั้นที่ 2: ลายน้ำดิจิทัลกันแอบถ่าย (Watermark)",
      desc: "ประทับชื่อกรรมการบนหน้าจอตรวจข้อสอบ ป้องกันการใช้มือถือแอบถ่ายภาพคะแนนดิบออกไปเผยแพร่",
      accent: COLOR_DARK
    },
    {
      title: "ชั้นที่ 3: การจำกัดสิทธิ์ตามหน้าที่ (RBAC)",
      desc: "กรรมการเห็นเฉพาะข้อที่ตรวจ ครูเห็นเฉพาะเด็กศูนย์ตนเอง ข้อมูลถูกแยกสิทธิ์อย่างเด็ดขาด ไม่ก้าวก่ายกัน",
      accent: COLOR_PRIMARY
    },
    {
      title: "ชั้นที่ 4: สมุดบันทึกประวัติถาวร (AuditLog)",
      desc: "บันทึกทุกการแก้ไขคะแนนย้อนหลัง พร้อมชื่อคนทำ วันเวลา และเหตุผลอย่างโปร่งใส ตรวจสอบได้ตลอดเวลา",
      accent: COLOR_DARK
    }
  ],
  notes: "ระบบมีเกราะป้องกันความปลอดภัย 4 ชั้น ทั้งรหัส OTP สองชั้น ลายน้ำกันแอบถ่าย การจำกัดสิทธิ์ตามหน้าที่ และสมุดบันทึกประวัติถาวรครับ"
});

// Slide 46: 3-Tier Automated QA Testing (407 Tests)
renderConceptSlide({
  badge: "7. SECURITY & QUALITY ASSURANCE",
  title: "การทดสอบระบบอย่างเข้มงวด 407 รายการ (QA Testing)",
  subtitle: "ผลการทดสอบความถูกต้องอัตโนมัติด้วยระบบหุ่นยนต์ทดสอบ (Jest Testing) ผ่านฉลุย 100%",
  cards: [
    {
      title: "ระดับที่ 1: การทดสอบฟังก์ชันย่อย (Unit Testing)",
      desc: "ทดสอบการคำนวณคะแนน การรวมคะแนนอัตโนมัติ และการเข้ารหัสความปลอดภัย ฝั่ง Backend ผ่านการทดสอบทั้งหมด 33 ชุด (271 รายการทดสอบ ผ่าน 100%)",
      accent: COLOR_PRIMARY
    },
    {
      title: "ระดับที่ 2: การทดสอบหน้าจอและคอมโพเนนต์ (Component Testing)",
      desc: "ทดสอบการทำงานของปุ่มกด กล่องกรอกคะแนน และการแสดงผลบนหน้าจอ ฝั่ง Frontend ผ่านการทดสอบทั้งหมด 14 ชุด (136 รายการทดสอบ ผ่าน 100%)",
      accent: COLOR_DARK
    },
    {
      title: "ระดับที่ 3: การทดสอบการเชื่อมต่อระบบ (Integration Testing)",
      desc: "ทดสอบกรณีพิเศษ เช่น การพยายามข้ามสิทธิ์ การกรอกคะแนนเกิน 7 คะแนน และกรณีอาจารย์ขอทบทวนคะแนน ระบบสามารถดักจับและทำงานถูกต้อง 100%",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "ระบบผ่านการทดสอบอัตโนมัติอย่างเข้มงวด 407 รายการ ทั้งการคำนวณคะแนน การทำงานของหน้าจอ และการจำกัดสิทธิ์ โดยผ่านการทดสอบ 100% เต็มครับ"
});

// Slide 47: Summary of Benefits
renderConceptSlide({
  badge: "7. SUMMARY & IMPACT",
  title: "สรุปประโยชน์และความคุ้มค่าที่ได้รับจากระบบ TMO",
  subtitle: "การพลิกโฉมการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติสู่ระบบดิจิทัลที่สมบูรณ์แบบ",
  cards: [
    {
      title: "ลดเวลาการทำงานลงกว่า 50%",
      desc: "ตัดขั้นตอนการเดินเอกสารกระดาษและลดเวลารอคิวหน้าห้องตรวจ การตรวจและรับรองคะแนนเสร็จสิ้นรวดเร็วขึ้นอย่างเห็นได้ชัด",
      accent: COLOR_PRIMARY
    },
    {
      title: "ความผิดพลาดของคะแนนเป็น 0%",
      desc: "ระบบคำนวณคะแนนรวมให้อัตโนมัติ พร้อมตรวจจับคะแนนเกิน ป้องกันข้อผิดพลาดจากการรวมคะแนนด้วยมือได้อย่างสมบูรณ์",
      accent: COLOR_DARK
    },
    {
      title: "โปร่งใส ตรวจสอบได้ และถูกต้องตามกฎหมาย",
      desc: "มีสมุดบันทึกประวัติทุกการแก้ไขคะแนน และออกเอกสาร PDF พร้อมลายเซ็นดิจิทัลที่มีผลผูกพันทางกฎหมายครบถ้วน",
      accent: COLOR_PRIMARY
    }
  ],
  notes: "สรุปประโยชน์ของระบบ ช่วยลดเวลาลงกว่าครึ่ง ป้องกันข้อผิดพลาดของการรวมคะแนนได้ 100% และสร้างความโปร่งใสตามมาตรฐานกฎหมายครับ"
});

// =========================================================================
// PART 8: ปิดท้ายและการตอบคำถาม (SLIDE 48)
// =========================================================================

// Slide 48: Q&A Slide
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 2.8, h: 0.35,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY },
    rectRadius: 0.08
  });
  slide.addText("ช่วงตอบข้อซักถาม", {
    x: 0.8, y: 0.8, w: 2.8, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle'
  });

  slide.addText("Questions & Answers (Q&A)", {
    x: 0.8, y: 1.35, w: 8.4, h: 0.7,
    fontSize: 32, bold: true, color: COLOR_WHITE
  });

  slide.addText("ขอขอบพระคุณท่านคณะกรรมการทุกท่านเป็นอย่างสูงครับ\nคณะผู้จัดทำยินดีรับฟังทุกข้อเสนอแนะและพร้อมตอบทุกข้อซักถามครับ", {
    x: 0.8, y: 2.2, w: 8.4, h: 0.7,
    fontSize: 14.5, color: '94A3B8', lineSpacing: 24
  });

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 3.1, w: 8.4, h: 0.02,
    fill: { color: '334155' }, line: { color: '334155' }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 3.35, w: 8.4, h: 1.7,
    fill: { color: '1E293B' }, line: { color: '334155', width: 1 },
    rectRadius: 0.08
  });

  slide.addText("ข้อมูลติดต่อและภาควิชา:\n• คณะผู้จัดทำ: นายทินณภัทร ปั้นคง, นายวสุศิลป์ ลี้นิธิเจริญกิจ, นางสาวอิสริยาภรณ์ มงคลิก\n• อาจารย์ที่ปรึกษาโครงงาน: อาจารย์ ดร.ชัยยศ กำธรเจริญ\n• สาขาวิชาคณิตศาสตร์เชิงวิทยาการคอมพิวเตอร์ ภาควิชาคณิตศาสตร์\n  คณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)", {
    x: 1.1, y: 3.5, w: 7.8, h: 1.4,
    fontSize: 12.5, color: 'F1F5F9', lineSpacing: 22
  });

  slide.addNotes("กลุ่มของพวกเราขอขอบพระคุณท่านคณะกรรมการทุกท่านเป็นอย่างสูงครับ ขณะนี้เปิดรับข้อเสนอแนะและพร้อมตอบทุกข้อซักถามจากท่านคณะกรรมการครับ");
}

// =========================================================================
// COMPILE PRESENTATION & INJECT OPENXML TRANSITIONS
// =========================================================================
const outputPath = 'c:/tmo/TMO_Grading_Queue_Presentation.pptx';

pres.write({ outputType: 'nodebuffer' })
  .then(async (buf) => {
    console.log('Injecting OpenXML slide transitions (<p:transition>) into all 48 slides...');
    const zip = await JSZip.loadAsync(buf);

    for (let i = 1; i <= 48; i++) {
      const slidePath = `ppt/slides/slide${i}.xml`;
      const file = zip.file(slidePath);
      if (file) {
        let xml = await file.async('string');
        if (xml.includes('</p:clrMapOvr>')) {
          const transTag = (i === 1 || i === 5 || i === 18 || i === 26 || i === 31 || i === 36 || i === 42 || i === 48)
            ? '<p:transition spd="med" advClick="1"><p:fade/></p:transition>'
            : '<p:transition spd="fast" advClick="1"><p:push dir="r"/></p:transition>';
          xml = xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${transTag}`);
          zip.file(slidePath, xml);
        }
      }
    }

    const finalBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(outputPath, finalBuf);
    console.log(`Successfully compiled 48 slides into: ${outputPath} (${(finalBuf.length / 1024 / 1024).toFixed(2)} MB)`);
  })
  .catch(err => {
    console.error('Error generating presentation:', err);
  });

