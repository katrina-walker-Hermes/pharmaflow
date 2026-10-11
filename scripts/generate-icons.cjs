const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.slice(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(size, isMaskable = false) {
  const width = size;
  const height = size;

  // Header chunk (IHDR)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image bytes: (1 filter byte + width * 4) per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  // Background teal: #0f766e -> RGB(15, 118, 110)
  const bgR = 15, bgG = 118, bgB = 110, bgA = 255;
  // White cross: #ffffff -> RGB(255, 255, 255)
  const fgR = 255, fgG = 255, fgB = 255, fgA = 255;
  // Medical green/red accents
  const redR = 239, redG = 68, redB = 68;

  // Cross dimensions (centered)
  const pad = isMaskable ? Math.round(size * 0.25) : Math.round(size * 0.2);
  const barThickness = Math.round(size * 0.16);
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter byte None
    for (let x = 0; x < width; x++) {
      // Check if inside cross
      const inVerticalBar = Math.abs(x - cx) <= barThickness / 2 && y >= pad && y <= (size - pad);
      const inHorizontalBar = Math.abs(y - cy) <= barThickness / 2 && x >= pad && x <= (size - pad);

      if (inVerticalBar || inHorizontalBar) {
        // Red cross center or white
        rawData[offset++] = fgR;
        rawData[offset++] = fgG;
        rawData[offset++] = fgB;
        rawData[offset++] = fgA;
      } else {
        rawData[offset++] = bgR;
        rawData[offset++] = bgG;
        rawData[offset++] = bgB;
        rawData[offset++] = bgA;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PNGs
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180));

// Generate SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0f766e"/>
  <rect x="216" y="106" width="80" height="300" rx="20" fill="#ffffff"/>
  <rect x="106" y="216" width="300" height="80" rx="20" fill="#ffffff"/>
  <circle cx="256" cy="256" r="30" fill="#0f766e"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

console.log('Icons generated successfully in public/');
