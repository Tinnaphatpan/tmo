import { crc32, deflateSync } from 'zlib';

const WIDTH = 320;
const HEIGHT = 110;

/** Small deterministic PRNG so the same name always gets the same scribble. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

/**
 * A believable-looking handwritten "signature" PNG (transparent background,
 * dark-blue ink) for TEST data only — a looping scribble whose shape is
 * derived from `seedText`, so every test user gets a distinct but stable one.
 * Pure JS (no image library): rasterised per pixel, then PNG-encoded.
 */
export function makeTestSignaturePng(seedText: string): Buffer {
  const rand = mulberry32(hash(seedText));

  // Polyline: a rising/falling wave with a couple of loops, then an underline flick.
  const points: Array<[number, number]> = [];
  const loops = 2 + Math.floor(rand() * 2);
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const x = 18 + t * (WIDTH - 60);
    const amp = 10 + 26 * Math.sin(Math.PI * t) * (0.6 + rand() * 0.05);
    const y = HEIGHT / 2 + Math.sin(t * Math.PI * 2 * (loops + 1.5)) * amp * 0.9;
    const loopX = Math.cos(t * Math.PI * 2 * loops) * 9;
    points.push([x + loopX, y]);
  }
  const uy = HEIGHT - 20 - rand() * 8;
  points.push([WIDTH - 40, uy], [30 + rand() * 20, uy + 3 + rand() * 4]);

  const thickness = 1.7;
  const alpha = new Float32Array(WIDTH * HEIGHT);
  for (let s = 0; s < points.length - 1; s++) {
    const [x1, y1] = points[s];
    const [x2, y2] = points[s + 1];
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - thickness - 1));
    const maxX = Math.min(WIDTH - 1, Math.ceil(Math.max(x1, x2) + thickness + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - thickness - 1));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(y1, y2) + thickness + 1));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        const dist = Math.hypot(px - (x1 + u * dx), py - (y1 + u * dy));
        const a = Math.max(0, Math.min(1, thickness + 0.5 - dist));
        const i = py * WIDTH + px;
        if (a > alpha[i]) alpha[i] = a;
      }
    }
  }

  // RGBA rows, each prefixed with filter byte 0.
  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * (WIDTH * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < WIDTH; x++) {
      const o = row + 1 + x * 4;
      raw[o] = 20; // R
      raw[o + 1] = 30; // G
      raw[o + 2] = 110; // B — dark blue ink
      raw[o + 3] = Math.round(alpha[y * WIDTH + x] * 255);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
