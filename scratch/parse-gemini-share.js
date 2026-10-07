const fs = require('fs');

const file = 'C:\\Users\\Tinnaphat\\.gemini\\antigravity\\brain\\b3fb0c17-e6ef-4aec-b978-1168ac094436\\.system_generated\\steps\\679\\content.md';
const text = fs.readFileSync(file, 'utf8');

// Find text parts in JSON or HTML
// Often Gemini shared chats put the message payload inside data-response or WIZ_global_data or JSON arrays
const regex = /("(\u0e[0-9a-f]{2}[^"]+)"|'(\u0e[0-9a-f]{2}[^']+)')/gi;
// Let's search for Thai text in the file
const thaiMatches = text.match(/[\u0e00-\u0e7f]{4,}/g);
if (thaiMatches) {
  console.log('Found Thai words count:', thaiMatches.length);
  // Get unique phrases
  const uniqueThai = Array.from(new Set(thaiMatches));
  console.log('Sample Thai texts found:');
  console.log(uniqueThai.slice(0, 50).join(', '));
} else {
  console.log('No direct Thai characters found, checking decoded Unicode...');
  const unicodeMatches = text.match(/\\u0e[0-9a-f]{2}/gi);
  console.log('Unicode Thai matches:', unicodeMatches ? unicodeMatches.length : 0);
  if (unicodeMatches) {
    // Unescape unicode
    const decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (m, g) => String.fromCharCode(parseInt(g, 16)));
    const decodedThai = decoded.match(/[\u0e00-\u0e7f]{4,}/g);
    if (decodedThai) {
      console.log('Decoded Thai words count:', decodedThai.length);
      console.log('Sample decoded Thai texts:');
      console.log(Array.from(new Set(decodedThai)).slice(0, 50).join(', '));
    }
  }
}
