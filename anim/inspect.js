// Inspect the source image: size, color type, and where the blue characters are
const { decodePNG } = require('./decode');
const src = process.argv[2];
const img = decodePNG(src);
console.log('size:', img.width, 'x', img.height);

const { width, height, rgba } = img;
// scan rows for "blue ink" pixels (blue channel much higher than red)
const rows = new Uint32Array(height);
for (let y = 0; y < height; y++) {
  let count = 0;
  for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4;
    const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
    if (b > 120 && b - r > 60 && b - g > 60) count++;
  }
  rows[y] = count;
}
// print compressed profile: for each band of 20 rows, max count and row ranges with content
let inRun = false, start = 0;
const runs = [];
for (let y = 0; y < height; y++) {
  const has = rows[y] > 3;
  if (has && !inRun) { inRun = true; start = y; }
  if (!has && inRun) { inRun = false; runs.push([start, y - 1]); }
}
if (inRun) runs.push([start, height - 1]);
for (const [a, b] of runs) {
  // find x extent within run
  let minX = width, maxX = 0;
  for (let y = a; y <= b; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
      if (b > 120 && b - r > 60 && b - g > 60) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
  }
  console.log(`blue run: y ${a}-${b} (h=${b - a + 1}), x ${minX}-${maxX}`);
}
