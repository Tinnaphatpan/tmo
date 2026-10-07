const fs = require('fs');

const assets = [
  'c:/tmo/extracted_thesis_assets/obj_221_661x598.png',
  'c:/tmo/extracted_thesis_assets/obj_407_421x787.png',
  'c:/tmo/extracted_thesis_assets/obj_296_1376x768.jpg',
  'c:/tmo/extracted_thesis_assets/obj_416_1256x792.png',
  'c:/tmo/extracted_thesis_assets/obj_320_612x822.png',
  'c:/tmo/extracted_thesis_assets/obj_309_1300x587.jpg',
  'c:/tmo/extracted_thesis_assets/obj_347_1300x618.jpg',
  'c:/tmo/extracted_thesis_assets/obj_349_1300x588.jpg',
  'c:/tmo/extracted_thesis_assets/obj_377_1300x615.jpg',
  'c:/tmo/extracted_thesis_assets/obj_306_1301x621.jpg',
  'c:/tmo/extracted_thesis_assets/obj_361_1300x589.jpg'
];

let totalBytes = 0;
assets.forEach(a => {
  const stat = fs.statSync(a);
  totalBytes += stat.size;
  console.log(`${a}: ${(stat.size / 1024).toFixed(1)} KB`);
});

console.log(`Total binary size: ${(totalBytes / 1024).toFixed(1)} KB`);
console.log(`Estimated Base64 size: ${(totalBytes * 4 / 3 / 1024).toFixed(1)} KB`);
