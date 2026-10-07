const fs = require('fs');
const path = require('path');
const imageSize = require('image-size');

const dir = 'c:\\tmo\\extracted_images';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

files.forEach(f => {
  const p = path.join(dir, f);
  const stat = fs.statSync(p);
  try {
    const dim = imageSize(p);
    console.log(`${f}: ${dim.width}x${dim.height} (${(stat.size / 1024).toFixed(1)} KB)`);
  } catch (e) {
    console.log(`${f}: error reading dimensions - ${(stat.size / 1024).toFixed(1)} KB`);
  }
});
