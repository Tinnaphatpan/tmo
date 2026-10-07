const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pdfPath = 'C:\\Users\\Tinnaphat\\.gemini\\antigravity\\brain\\b3fb0c17-e6ef-4aec-b978-1168ac094436\\.user_uploaded\\media_1791029861879.pdf';
const outDir = 'c:\\tmo\\extracted_images_all';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const buf = fs.readFileSync(pdfPath);
const str = buf.toString('latin1');

// Match object headers: e.g., "12 0 obj"
const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
let match;
let imgIndex = 0;

console.log('Searching PDF objects...');

while ((match = objRegex.exec(str)) !== null) {
  const objNum = match[1];
  const objBody = match[3];

  if (objBody.includes('/Subtype /Image') || objBody.includes('/Subtype/Image')) {
    // Check Filter
    const isDCT = objBody.includes('/Filter /DCTDecode') || objBody.includes('/Filter/DCTDecode');
    const isFlate = objBody.includes('/Filter /FlateDecode') || objBody.includes('/Filter/FlateDecode');
    
    // Extract stream
    const streamStartIdx = match.index + match[0].indexOf('stream\r\n');
    let offset = 8;
    let actualStart = streamStartIdx;
    if (streamStartIdx === -1 + match.index) {
      const altStart = match.index + match[0].indexOf('stream\n');
      if (altStart !== -1 + match.index) {
        actualStart = altStart;
        offset = 7;
      } else {
        continue;
      }
    }
    const dataStart = actualStart + offset;
    const endstreamIdx = match.index + match[0].indexOf('endstream');
    if (endstreamIdx <= dataStart) continue;

    const streamBuf = buf.subarray(dataStart, endstreamIdx);
    imgIndex++;

    if (isDCT) {
      const filename = `img_obj_${objNum}_${imgIndex.toString().padStart(2, '0')}.jpg`;
      fs.writeFileSync(path.join(outDir, filename), streamBuf);
      console.log(`Extracted JPEG: ${filename} (${(streamBuf.length / 1024).toFixed(1)} KB)`);
    } else if (isFlate) {
      // It's FlateDecode (raw pixel data or embedded png)
      try {
        const decompressed = zlib.inflateSync(streamBuf);
        // Note: Raw uncompressed bitmap, check width/height/bpc
        const widthMatch = objBody.match(/\/Width\s+(\d+)/);
        const heightMatch = objBody.match(/\/Height\s+(\d+)/);
        const w = widthMatch ? widthMatch[1] : '?';
        const h = heightMatch ? heightMatch[1] : '?';
        console.log(`FlateDecode image obj ${objNum}: ${w}x${h}, decompressed size: ${(decompressed.length / 1024).toFixed(1)} KB`);
      } catch (err) {
        // console.log(`Decompress failed for obj ${objNum}: ${err.message}`);
      }
    }
  }
}

console.log(`Finished. Processed image objects.`);
