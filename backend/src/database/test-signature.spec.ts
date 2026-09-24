import { crc32, inflateSync } from 'zlib';
import { makeTestSignaturePng } from './test-signature';

function parsePng(buf: Buffer) {
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const chunks: Record<string, Buffer> = {};
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.subarray(o + 4, o + 8).toString('ascii');
    const data = buf.subarray(o + 8, o + 8 + len);
    const crc = buf.readUInt32BE(o + 8 + len);
    expect(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) >>> 0).toBe(crc); // valid CRC
    chunks[type] = data;
    o += 12 + len;
  }
  return chunks;
}

describe('makeTestSignaturePng (test-data signatures)', () => {
  it('produces a valid RGBA PNG with correct chunks and CRCs', () => {
    const chunks = parsePng(makeTestSignaturePng('committee1'));
    expect(Object.keys(chunks)).toEqual(['IHDR', 'IDAT', 'IEND']);
    const ihdr = chunks.IHDR;
    expect(ihdr.readUInt32BE(0)).toBe(320);
    expect(ihdr.readUInt32BE(4)).toBe(110);
    expect([ihdr[8], ihdr[9]]).toEqual([8, 6]); // 8-bit RGBA
    const raw = inflateSync(chunks.IDAT);
    expect(raw.length).toBe((320 * 4 + 1) * 110);
  });

  it('draws real ink on a transparent background', () => {
    const raw = inflateSync(parsePng(makeTestSignaturePng('x')).IDAT);
    let inked = 0;
    let opaque = 0;
    for (let y = 0; y < 110; y++) {
      for (let x = 0; x < 320; x++) {
        const alpha = raw[y * (320 * 4 + 1) + 1 + x * 4 + 3];
        if (alpha > 0) inked++;
        if (alpha === 255) opaque++;
      }
    }
    expect(inked).toBeGreaterThan(500);
    expect(opaque).toBeGreaterThan(100);
    expect(inked).toBeLessThan(320 * 110 * 0.5); // mostly transparent
  });

  it('is deterministic per name and different between names', () => {
    expect(makeTestSignaturePng('a').equals(makeTestSignaturePng('a'))).toBe(true);
    expect(makeTestSignaturePng('a').equals(makeTestSignaturePng('b'))).toBe(false);
  });

  it('is accepted by the real score-sheet PDF builder path (pdfkit can embed it)', async () => {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<void>((res) => doc.on('end', () => res()));
    doc.image(makeTestSignaturePng('committee1'), 50, 50, { width: 120 });
    doc.end();
    await done;
    expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe('%PDF');
  });
});
