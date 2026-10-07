const fs = require('fs');
const path = require('path');

const pdfPath = 'C:\\Users\\Tinnaphat\\.gemini\\antigravity\\brain\\b3fb0c17-e6ef-4aec-b978-1168ac094436\\.user_uploaded\\media_1791029861879.pdf';
const outDir = 'c:\\tmo\\extracted_images';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Reading PDF file...');
const buf = fs.readFileSync(pdfPath);
console.log(`PDF size: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

// Extract embedded JPEGs by searching for SOI (FF D8 FF) and EOI (FF D9)
let count = 0;
let pos = 0;

while (pos < buf.length - 4) {
  // Look for FF D8 FF (JPEG start)
  if (buf[pos] === 0xff && buf[pos + 1] === 0xd8 && buf[pos + 2] === 0xff) {
    const start = pos;
    let end = -1;
    // Look for FF D9 (JPEG end)
    for (let j = start + 2; j < buf.length - 1; j++) {
      if (buf[j] === 0xff && buf[j + 1] === 0xd9) {
        end = j + 2;
        // Don't break immediately if followed by more JPEG markers, but standard SOI-EOI:
        // Check if there is another FF D9 within reasonable distance or if this is the end
        // In PDF streams, stream usually ends shortly after or with 'endstream'
        break;
      }
    }

    if (end !== -1 && end - start > 5000) { // filter out tiny thumbnails/noise < 5KB
      count++;
      const imgBuf = buf.subarray(start, end);
      const outPath = path.join(outDir, `img_${count.toString().padStart(3, '0')}.jpg`);
      fs.writeFileSync(outPath, imgBuf);
      console.log(`Saved ${outPath} (${(imgBuf.length / 1024).toFixed(1)} KB)`);
      pos = end;
      continue;
    }
  }
  pos++;
}

console.log(`Extracted ${count} images.`);
