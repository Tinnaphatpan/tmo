const fs = require('fs');

const pdfPath = 'C:\\Users\\Tinnaphat\\.gemini\\antigravity\\brain\\b3fb0c17-e6ef-4aec-b978-1168ac094436\\.user_uploaded\\media_1791029861879.pdf';
const buf = fs.readFileSync(pdfPath);
const str = buf.toString('latin1');

// Let's search for "รูปที่" or "ภาพที่" in UTF-8 or Thai encoded
// Let's read with utf-8 if possible or search for figure captions
const bufUtf8 = fs.readFileSync(pdfPath, 'utf8');

// Match any pattern like "รูปที่" or "ภาพที่" or "แผนภาพ"
const regex = /(รูปที่|ภาพที่|แผนภาพ)\s*([0-9\.\-\s]+)([^\n\r]+)/g;
let m;
console.log('--- Captions Found in Thesis PDF ---');
while ((m = regex.exec(bufUtf8)) !== null) {
  console.log(`${m[1]} ${m[2].trim()}: ${m[3].trim().slice(0, 80)}`);
}
