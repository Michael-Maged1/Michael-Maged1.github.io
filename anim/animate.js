// Generate a subtle looping "bounce" animation of the running coffee cups.
// The original artwork pixels are never modified - the cup group is only
// translated vertically within empty cream background, so every frame is
// pixel-identical artwork.
const { decodePNG, encodePNG } = require('./decode');
const { buildPalette, encodeGIF } = require('./gif');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const OUTDIR = path.dirname(SRC); // write frames next to the source

const img = decodePNG(SRC);
const { width: W, height: H, rgba } = img;

// ---- animation area (verified against the artwork) ----
const RX0 = 540, RX1 = 1630;   // x range: right of the pink badge, left of nothing else
const RY0 = 2000, RY1 = 2450;  // y range: below "EVERY DAY", above "COFFEE & BAKERY"
const RW = RX1 - RX0, RH = RY1 - RY0;

// background (cream) color sampled from empty background inside the region band
function px(x, y) { const o = (y * W + x) * 4; return [rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]]; }
const bg = px(1000, 2470);
console.log('bg color:', bg.join(','));

// crop of the cup group (full-res copy of region)
const crop = Buffer.alloc(RW * RH * 4);
for (let y = 0; y < RH; y++) {
  const s = ((RY0 + y) * W + RX0) * 4;
  rgba.copy(crop, y * RW * 4, s, s + RW * 4);
}

// verify the left column band 540-576 is empty background (so we don't clip or move badge)
let warn = 0;
for (let y = 0; y < RH; y++) for (let x = 0; x < 36; x++) {
  const o = (y * RW + x) * 4;
  if (Math.abs(crop[o] - bg[0]) > 10 || Math.abs(crop[o + 1] - bg[1]) > 10) warn++;
}
console.log('left margin non-bg pixels:', warn);

// ---- frames ----
const FRAMES = 24;
const AMP = 24; // max rise in px (~0.6% of height) - subtle
fs.mkdirSync(path.join(OUTDIR, 'cup-loop-frames'), { recursive: true });

// GIF preview size (4x downscale)
const GW = W >> 2, GH = H >> 2;
const gifFrames = [];
const gifSamples = [];
const smallFrames = [];

for (let f = 0; f < FRAMES; f++) {
  const t = f / FRAMES;
  const dy = -Math.round(AMP * (1 - Math.cos(2 * Math.PI * t)) / 2); // 0 .. -AMP
  const frame = Buffer.from(rgba); // full copy
  // clear region with bg, then paste crop shifted up by |dy|
  for (let y = 0; y < RH; y++) {
    const o = ((RY0 + y) * W + RX0) * 4;
    for (let x = 0; x < RW; x++) {
      const p = o + x * 4;
      frame[p] = bg[0]; frame[p + 1] = bg[1]; frame[p + 2] = bg[2]; frame[p + 3] = 255;
    }
  }
  for (let y = 0; y < RH; y++) {
    const ty = y + dy;
    if (ty < 0 || ty >= H) continue;
    const srcRow = y * RW * 4;
    const dstRow = ((RY0 + ty) * W + RX0) * 4;
    crop.copy(frame, dstRow, srcRow, srcRow + RW * 4);
  }
  // write full-res PNG
  encodePNG(W, H, frame, path.join(OUTDIR, 'cup-loop-frames', `cup-loop-${String(f + 1).padStart(3, '0')}.png`));

  // downscale 4x (box average) for GIF preview
  const small = Buffer.alloc(GW * GH * 4);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const o = (((y << 2) + j) * W + ((x << 2) + i)) * 4;
        r += frame[o]; g += frame[o + 1]; b += frame[o + 2];
      }
      const o = (y * GW + x) * 4;
      small[o] = r >> 4; small[o + 1] = g >> 4; small[o + 2] = b >> 4; small[o + 3] = 255;
    }
  }
  smallFrames.push(small);
  // sample colors for palette
  for (let i = 0; i < GW * GH; i += 3) {
    const o = i * 4;
    gifSamples.push([small[o], small[o + 1], small[o + 2]]);
  }
  console.log('frame', f + 1, 'dy', dy);
}

// palette + quantize + write gif
console.log('building palette...');
const palette = buildPalette(gifSamples, 256);
console.log('palette size:', palette.length);

const cache = new Map();
const toIndex = (r, g, b) => {
  const key = (r << 16) | (g << 8) | b;
  let idx = cache.get(key);
  if (idx !== undefined) return idx;
  let best = 0, bd = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  cache.set(key, best);
  return best;
};

const indexFrames = smallFrames.map((small) => {
  const idx = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) {
    const o = i * 4;
    idx[i] = toIndex(small[o], small[o + 1], small[o + 2]);
  }
  return idx;
});

console.log('writing gif...');
encodeGIF(GW, GH, Object.assign(indexFrames, { palette }), 4, path.join(OUTDIR, 'cup-loop-preview.gif'));
console.log('done:', path.join(OUTDIR, 'cup-loop-preview.gif'), '+', FRAMES, 'PNG frames in', path.join(OUTDIR, 'cup-loop-frames'));
