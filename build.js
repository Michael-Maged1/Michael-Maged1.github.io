#!/usr/bin/env node
/* =====================================================================
   بناء لعبة سائق أوبر وشرطة — وسط أسيوط
   الوضع الافتراضي (node build.js): تقسيم index.html إلى ملفات خفيفة في app/
   الوضع المضيف (node build.js --hosted): نفس التقسيم مع تجهيز dist/ للنشر
   وضع الملف الواحد (node build.js --single): تجميع كل الأصول داخل index.html للعمل بدون خادم
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const hosted = process.argv.includes('--hosted');
const singleFile = process.argv.includes('--single') && !hosted;

const musicPlaylist = {};
for (const role of ['police', 'uber']) {
  const dir = path.join(ROOT, 'assets/music', role);
  fs.mkdirSync(dir, { recursive: true });
  musicPlaylist[role] = fs.readdirSync(dir)
    .filter(f => /\.mp3$/i.test(f))
    .map(f => 'assets/music/' + role + '/' + encodeURIComponent(f));
}
fs.writeFileSync(path.join(ROOT, 'assets/music/playlist.json'), JSON.stringify(musicPlaylist, null, 2));

const SRC = path.join(ROOT, 'src');
const GAME = path.join(SRC, 'game');
const OUT = path.join(ROOT, 'index.html');
const STYLE_MARK = '/*__HUD_STYLE__*/';
const SCRIPT_MARK = '/*__GAME_SCRIPTS__*/';

const shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');
if (!shell.includes(STYLE_MARK) || !shell.includes(SCRIPT_MARK)) {
  console.error('✗ src/shell.html لازم يكون فيه علامات /*__HUD_STYLE__*/ و /*__GAME_SCRIPTS__*/');
  process.exit(1);
}

const files = fs.readdirSync(GAME).filter(f => f.endsWith('.js')).sort();
if (!files.length) {
  console.error('✗ مفيش ملفات في src/game');
  process.exit(1);
}

const hudCss = fs.readFileSync(path.join(SRC, 'hud.css'), 'utf8');
const menuCss = fs.readFileSync(path.join(SRC, 'menu.css'), 'utf8');
const uiAssets = {
  'menu-cover': 'cover.webp',
  'menu-qashqai': 'qashqai.webp',
  'menu-policeSuburban': 'policeSuburban.webp',
  'menu-policeDuster': 'policeDuster.webp',
  'menu-policeBMW': 'policeBMW.webp',
  'load-1': 'load-1.jpg',
  'load-2': 'load-2.jpg',
  'load-3': 'load-3.jpg',
  'load-4': 'load-4.jpg',
};

const trafficGlbs = {
  micro: 'fiat-ducato',
  man: 'pedestrian-aj',
  woman: 'pedestrian-woman',
  traffic_peugeot405: 'traffic-peugeot-405',
  traffic_peugeot205: 'traffic-peugeot-205',
  traffic_corolla: 'traffic-toyota-corolla',
  traffic_logan: 'traffic-renault-logan',
  traffic_lada: 'traffic-lada-2107',
  traffic_kombi: 'traffic-vw-kombi',
  traffic_tucson: 'traffic-hyundai-tucson',
  traffic_uno: 'traffic-fiat-uno',
  traffic_tuktuk: 'traffic-tuktuk',
  traffic_moped: 'traffic-moped',
  traffic_bicycle: 'traffic-bicycle',
  traffic_bus3d: 'traffic-bus3d',
  traffic_hiace: 'traffic-toyota-hiace',
  traffic_sprinter: 'traffic-sprinter',
  traffic_hilux: 'traffic-hilux',
};

function buildAssetMaps(inlineBinary) {
  const packed = {};
  const landmarkAssets = { landmarkMosque: 'models/landmarks/mosque-cc0.glb' };
  for (const [key, file] of Object.entries(landmarkAssets)) {
    packed[key] = inlineBinary
      ? fs.readFileSync(path.join(ROOT, 'assets', file)).toString('base64')
      : 'assets/' + file;
  }
  for (const [key, file] of Object.entries(trafficGlbs)) {
    packed[key] = inlineBinary
      ? fs.readFileSync(path.join(ROOT, 'assets', file + '.glb')).toString('base64')
      : 'assets/' + file + '.glb';
  }
  const uploaded = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/uploaded-models.json'), 'utf8'));
  for (const [key, spec] of Object.entries(uploaded)) {
    for (const [suffix, file] of [['', spec.file], ['_traffic', spec.trafficFile]]) {
      packed[key + suffix] = (!inlineBinary || key.startsWith('police'))
        ? 'assets/' + file
        : fs.readFileSync(path.join(ROOT, 'assets', file)).toString('base64');
    }
  }

  const thumbs = {};
  for (const file of fs.readdirSync(path.join(ROOT, 'assets/thumbnails'))) {
    const id = path.basename(file, '.webp');
    thumbs[id] = inlineBinary
      ? 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'assets/thumbnails', file)).toString('base64')
      : 'assets/thumbnails/' + file;
  }

  const surfaces = {};
  for (const file of fs.readdirSync(path.join(ROOT, 'assets/textures')).filter(f => f.endsWith('.webp'))) {
    const id = path.basename(file, '.webp');
    surfaces[id] = inlineBinary
      ? fs.readFileSync(path.join(ROOT, 'assets/textures', file)).toString('base64')
      : 'assets/textures/' + file;
  }
  return { packed, thumbs, surfaces };
}

function injectAssetData(code, inlineBinary, cssPrefix = '') {
  const { packed, thumbs, surfaces } = buildAssetMaps(inlineBinary);
  let out = code
    .replace('/*__MODEL_DATA__*/ {}', () => JSON.stringify(packed))
    .replace('/*__CAR_THUMBS__*/ {}', () => JSON.stringify(thumbs))
    .replace('/*__SURFACE_DATA__*/ {}', () => JSON.stringify(surfaces));
  for (const [key, file] of Object.entries(uiAssets)) {
    const src = inlineBinary
      ? `data:${file.endsWith('.jpg') ? 'image/jpeg' : 'image/webp'};base64,` + fs.readFileSync(path.join(ROOT, 'assets/ui', file)).toString('base64')
      : cssPrefix + 'assets/ui/' + file;
    out = out.replaceAll('asset:' + key, src);
  }
  return out;
}

if (singleFile) {
  // Single self-contained offline HTML (no external app/ files required)
  const parts = files.map(f => {
    const code = fs.readFileSync(path.join(GAME, f), 'utf8').replace(/\s+$/, '');
    return `\n/* ========================= ${f} ========================= */\n${code}\n`;
  });
  const uri = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const threeURI = uri(fs.readFileSync(path.join(ROOT, 'vendor/three.module.js')));
  const utilsURI = uri(fs.readFileSync(path.join(ROOT, 'vendor/addons/BufferGeometryUtils.js')));
  const loaderURI = uri(fs.readFileSync(path.join(ROOT, 'vendor/addons/GLTFLoader.js'), 'utf8').replace('../utils/BufferGeometryUtils.js', utilsURI));

  let out = shell
    .replace(STYLE_MARK, () => `<style>\n${hudCss}\n${menuCss}\n</style>`)
    .replace(SCRIPT_MARK, () => `<script type="importmap">${JSON.stringify({ imports: { three: threeURI } })}</script>\n<script type="module">\n${parts.join('')}\n</script>`);
  out = out.replace('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', 'three');
  for (const [key, file] of [['GLTFLoader', null], ['SkeletonUtils', 'SkeletonUtils.js'], ['MeshoptDecoder', 'meshopt_decoder.module.js']]) {
    const moduleURI = key === 'GLTFLoader' ? loaderURI : uri(fs.readFileSync(path.join(ROOT, 'vendor/addons', file)));
    out = out.replace('asset:' + key, moduleURI);
  }
  out = injectAssetData(out, true);
  fs.writeFileSync(OUT, out, 'utf8');
  console.log(`✓ index.html (ملف واحد متكامل) اتكتب — ${files.length} ملف · ${(out.length / 1024).toFixed(1)} KB`);
  process.exit(0);
}

// Split modular build: lightweight index.html + app/*.css + app/*.js chunks (strictly contiguous numeric order!)
const BUNDLES = [
  ['01-config-fleet.js', f => f < '12-'],
  ['02-assyut-map.js', f => f >= '12-' && f < '20-'],
  ['03-engine-assets.js', f => f >= '20-' && f < '30-'],
  ['04-world-city.js', f => f >= '30-' && f < '50-'],
  ['05-vehicles-life.js', f => f >= '50-' && f < '70-'],
  ['06-gameplay-ui.js', f => f >= '70-'],
];

const targetRoot = hosted ? path.join(ROOT, 'dist') : ROOT;
const appDir = path.join(targetRoot, 'app');
fs.mkdirSync(appDir, { recursive: true });
for (const old of fs.readdirSync(appDir)) fs.unlinkSync(path.join(appDir, old));

fs.writeFileSync(path.join(appDir, 'hud.css'), hudCss, 'utf8');
fs.writeFileSync(path.join(appDir, 'menu.css'), injectAssetData(menuCss, false, '../'), 'utf8');

const bootCode = `import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { clone as cloneSkeleton } from '../vendor/addons/SkeletonUtils.js';
import { MeshoptDecoder } from '../vendor/addons/meshopt_decoder.module.js';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

const BufferGeometryUtils = { mergeGeometries };
const THREE_GLOBAL = { ...THREE, BufferGeometryUtils };
Object.assign(globalThis, { THREE: THREE_GLOBAL, GLTFLoader, cloneSkeleton, MeshoptDecoder, BufferGeometryUtils, mergeGeometries });

const chunks = ${JSON.stringify(BUNDLES.map(([name]) => 'app/' + name))};
const vTag = ${Date.now()};
for (const src of chunks) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src + '?v=' + vTag;
    s.onload = resolve;
    s.onerror = () => reject(new Error('تعذر تحميل ' + src));
    document.head.appendChild(s);
  });
}
`;
fs.writeFileSync(path.join(appDir, 'boot.js'), bootCode, 'utf8');

const assigned = new Set();
const bundleSizes = [];
for (const [bundleName, match] of BUNDLES) {
  const groupFiles = files.filter(match);
  for (const f of groupFiles) assigned.add(f);
  const raw = groupFiles.map(f => {
    let code = fs.readFileSync(path.join(GAME, f), 'utf8').replace(/\s+$/, '');
    code = code.replace(/^import .*?;\r?\n/gm, '');
    return `\n/* ========================= ${f} ========================= */\n${code}\n`;
  }).join('');
  const processed = injectAssetData(raw, false);
  fs.writeFileSync(path.join(appDir, bundleName), processed, 'utf8');
  bundleSizes.push(`${bundleName}:${(processed.length / 1024).toFixed(1)}KB`);
}

const missed = files.filter(f => !assigned.has(f));
if (missed.length) {
  console.error('✗ ملفات غير مصنفة في الحزم:', missed);
  process.exit(1);
}

let html = shell
  .replace(STYLE_MARK, `<link rel="stylesheet" href="app/hud.css?v=${Date.now()}">\n<link rel="stylesheet" href="app/menu.css?v=${Date.now()}">`)
  .replace(SCRIPT_MARK, `<script type="importmap">${JSON.stringify({ imports: { three: './vendor/three.module.js' } })}</script>\n<script type="module" src="app/boot.js?v=${Date.now()}"></script>`);
html = injectAssetData(html, false);

if (hosted) {
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const dir of ['assets', 'vendor']) fs.cpSync(path.join(ROOT, dir), path.join(targetRoot, dir), { recursive: true });
}
fs.writeFileSync(path.join(targetRoot, 'index.html'), html, 'utf8');

console.log(`✓ index.html اتقسم بنجاح (${(html.length / 1024).toFixed(1)} KB) ← ${files.length} ملف في app/ [${bundleSizes.join(', ')}]`);

if (hosted) require('child_process').execFileSync(process.env.PYTHON || 'python3', [path.join(ROOT, 'tools/package-full-game.py')], { stdio: 'inherit' });
