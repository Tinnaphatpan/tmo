const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PNG } = require('pngjs');

const pdfPath = 'C:\\Users\\Tinnaphat\\.gemini\\antigravity\\brain\\b3fb0c17-e6ef-4aec-b978-1168ac094436\\.user_uploaded\\media_1791029861879.pdf';
const outDir = 'c:\\tmo\\extracted_thesis_assets';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const buf = fs.readFileSync(pdfPath);
const str = buf.toString('latin1');

const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
let match;
let count = 0;

console.log('Extracting all images (JPEG & PNG) from thesis PDF...');

while ((match = objRegex.exec(str)) !== null) {
  const objNum = match[1];
  const objBody = match[3];

  if (objBody.includes('/Subtype /Image') || objBody.includes('/Subtype/Image')) {
    const isDCT = objBody.includes('/Filter /DCTDecode') || objBody.includes('/Filter/DCTDecode');
    const isFlate = objBody.includes('/Filter /FlateDecode') || objBody.includes('/Filter/FlateDecode');

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

    const widthMatch = objBody.match(/\/Width\s+(\d+)/);
    const heightMatch = objBody.match(/\/Height\s+(\d+)/);
    const w = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    const h = heightMatch ? parseInt(heightMatch[1], 10) : 0;

    // Ignore tiny icons < 100px unless needed
    if (w < 100 || h < 100) continue;

    if (isDCT) {
      const outFile = path.join(outDir, `obj_${objNum}_${w}x${h}.jpg`);
      fs.writeFileSync(outFile, streamBuf);
      console.log(`Saved JPEG: obj_${objNum}_${w}x${h}.jpg (${(streamBuf.length / 1024).toFixed(1)} KB)`);
      count++;
    } else if (isFlate) {
      try {
        const decompressed = zlib.inflateSync(streamBuf);
        const isRGB = objBody.includes('/DeviceRGB');
        const isGray = objBody.includes('/DeviceGray');

        const png = new PNG({ width: w, height: h });
        
        if (isRGB && decompressed.length >= w * h * 3) {
          let srcIdx = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (w * y + x) << 2;
              png.data[idx] = decompressed[srcIdx];     // R
              png.data[idx + 1] = decompressed[srcIdx + 1]; // G
              png.data[idx + 2] = decompressed[srcIdx + 2]; // B
              png.data[idx + 3] = 255;                  // Alpha
              srcIdx += 3;
            }
          }
          const outFile = path.join(outDir, `obj_${objNum}_${w}x${h}.png`);
          fs.writeFileSync(outFile, PNG.sync.write(png));
          console.log(`Saved PNG (RGB): obj_${objNum}_${w}x${h}.png (${w}x${h})`);
          count++;
        } else if (isGray && decompressed.length >= w * h) {
          let srcIdx = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (w * y + x) << 2;
              const val = decompressed[srcIdx++];
              png.data[idx] = val;
              png.data[idx + 1] = val;
              png.data[idx + 2] = val;
              png.data[idx + 3] = 255;
            }
          }
          const outFile = path.join(outDir, `obj_${objNum}_${w}x${h}.png`);
          fs.writeFileSync(outFile, PNG.sync.write(png));
          console.log(`Saved PNG (Gray): obj_${objNum}_${w}x${h}.png (${w}x${h})`);
          count++;
        } else {
          // May have a predictor or indexed colors
          console.log(`Note: obj ${objNum} (${w}x${h}) has decompressed size ${decompressed.length}, expected ${w * h * 3} or ${w * h}`);
        }
      } catch (err) {
        console.log(`Error parsing FlateDecode obj ${objNum}: ${err.message}`);
      }
    }
  }
}

console.log(`Finished extraction: ${count} images exported to ${outDir}`);
