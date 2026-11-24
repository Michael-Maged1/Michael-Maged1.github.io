// Pure-JS animated GIF encoder (GIF89a + LZW + median-cut palette)
const fs = require('fs');

// ---------- palette: median cut ----------
function buildPalette(samples, maxColors) {
  // samples: Array of [r,g,b]
  let boxes = [samples.slice()];
  const boxInfo = (box) => {
    const min = [255, 255, 255], max = [0, 0, 0];
    for (const c of box) for (let i = 0; i < 3; i++) {
      if (c[i] < min[i]) min[i] = c[i];
      if (c[i] > max[i]) max[i] = c[i];
    }
    return { min, max };
  };
  while (boxes.length < maxColors) {
    let best = -1, bestRange = -1, bestCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { min, max } = boxInfo(boxes[i]);
      for (let ch = 0; ch < 3; ch++) {
        const r = max[ch] - min[ch];
        const w = r * Math.sqrt(boxes[i].length); // range weighted by population
        if (w > bestRange) { bestRange = w; best = i; bestCh = ch; }
      }
    }
    if (best < 0) break;
    const box = boxes[best];
    box.sort((a, b) => a[bestCh] - b[bestCh]);
    const mid = box.length >> 1;
    boxes[best] = box.slice(0, mid);
    boxes.push(box.slice(mid));
  }
  const palette = [];
  for (const box of boxes) {
    if (!box.length) continue;
    const s = [0, 0, 0];
    for (const c of box) { s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; }
    palette.push([
      Math.round(s[0] / box.length),
      Math.round(s[1] / box.length),
      Math.round(s[2] / box.length),
    ]);
  }
  return palette;
}

// ---------- LZW ----------
function lzwCompress(minCodeSize, data) {
  const clearCode = 1 << minCodeSize;
  const eoi = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict = new Map();
  let next = eoi + 1;
  const out = [];
  let curByte = 0, curBits = 0;
  const write = (code, size) => {
    curByte |= code << curBits;
    curBits += size;
    while (curBits >= 8) {
      out.push(curByte & 0xff);
      curByte >>= 8;
      curBits -= 8;
    }
  };
  write(clearCode, codeSize);
  let index = data[0];
  for (let i = 1; i < data.length; i++) {
    const k = data[i];
    const key = (index << 8) | k;
    const v = dict.get(key);
    if (v !== undefined) { index = v; continue; }
    write(index, codeSize);
    if (next === 4096) {
      write(clearCode, codeSize);
      dict.clear();
      next = eoi + 1;
      codeSize = minCodeSize + 1;
    } else {
      dict.set(key, next++);
      if (next === (1 << codeSize) && codeSize < 12) codeSize++;
    }
    index = k;
  }
  write(index, codeSize);
  write(eoi, codeSize);
  if (curBits > 0) out.push(curByte & 0xff);
  return Buffer.from(out);
}

// ---------- GIF assembly ----------
function encodeGIF(width, height, frames, delayCs, outFile) {
  // frames: array of Uint8Array of palette indices
  const palette = frames.palette;
  const buf = [];
  const push = (...b) => buf.push(...b);
  // header
  push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
  push(width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff);
  push(0xf7, 0, 0); // GCT flag, 256 colors
  for (let i = 0; i < 256; i++) {
    const c = palette[i] || [0, 0, 0];
    push(c[0], c[1], c[2]);
  }
  // netscape loop
  push(0x21, 0xff, 0x0b);
  for (const ch of 'NETSCAPE2.0') push(ch.charCodeAt(0));
  push(0x03, 0x01, 0x00, 0x00, 0x00);
  frames.forEach((idx, fi) => {
    // graphic control ext
    push(0x21, 0xf9, 0x04, 0x04, delayCs & 0xff, (delayCs >> 8) & 0xff, 0, 0);
    // image descriptor
    push(0x2c, 0, 0, width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff, 0);
    const lzw = lzwCompress(8, idx);
    push(8); // min code size
    for (let i = 0; i < lzw.length; i += 255) {
      const sub = lzw.slice(i, i + 255);
      push(sub.length, ...sub);
    }
    push(0);
  });
  push(0x3b);
  fs.writeFileSync(outFile, Buffer.from(buf));
}

module.exports = { buildPalette, encodeGIF };
