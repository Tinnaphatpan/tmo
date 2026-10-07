const fs = require('fs');

const pdfPath = 'C:\\Users\\Tinnaphat\\.gemini\\antigravity\\brain\\b3fb0c17-e6ef-4aec-b978-1168ac094436\\.user_uploaded\\media_1791029861879.pdf';
const buf = fs.readFileSync(pdfPath);
const str = buf.toString('latin1');

const matches = str.match(/\/Subtype\s*\/Image/g);
console.log('Total /Subtype /Image occurrences:', matches ? matches.length : 0);

// Find filters used for images
const filterRegex = /\/Filter\s*(\/[A-Za-z0-9]+|\[[^\]]+\])/g;
let m;
const filters = new Set();
let count = 0;
while ((m = filterRegex.exec(str)) !== null) {
  filters.add(m[1]);
  count++;
}
console.log('Filters found:', Array.from(filters));
