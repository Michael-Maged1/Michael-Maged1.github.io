const { decodePNG } = require('./decode');
const img = decodePNG(process.argv[2]);
const { width, height, rgba } = img;
// per-row blue counts in y 1950..2650, with x extents
for (let y = 1950; y <= 2650; y++) {
  let count = 0, minX = width, maxX = 0;
  for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4;
    const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
    if (b > 120 && b - r > 60 && b - g > 60) { count++; if (x < minX) minX = x; if (x > maxX) maxX = x; }
  }
  if (count > 0) console.log(`y=${y} n=${count} x ${minX}-${maxX}`);
  else console.log(`y=${y} -`);
}
