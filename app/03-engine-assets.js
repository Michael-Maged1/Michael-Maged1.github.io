
/* ========================= 20-engine.js ========================= */
/* ------------------------- الرندرر والمشهد (PHASE 1: Lighting & Atmosphere) ------------------------- */
const isMobileDevice = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const initPresetName = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.preset) ? VISUAL_CONFIG.preset : 'medium';
const initPresetCfg = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.presets[initPresetName]) || { pixelRatio: 1.25, shadows: true, shadowMapSize: 1024 };

const defaultDPR = Math.min(window.devicePixelRatio || 1, initPresetCfg.pixelRatio);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(defaultDPR);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = initPresetCfg.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft PCF shadows
renderer.shadowMap.autoUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.color) ? VISUAL_CONFIG.color.exposure : 1.10;
if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const fogCol = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.fog) ? VISUAL_CONFIG.fog.color : 0xd4c6b2;
const fogDens = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.fog) ? VISUAL_CONFIG.fog.density : 0.00185;
scene.fog = new THREE.FogExp2(fogCol, fogDens);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2200);
camera.position.set(-16, 8, 24);

/* ------------------------- الإضاءة الشمسية والجو ------------------------- */
const hemiCfg = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.hemi) ? VISUAL_CONFIG.hemi : { skyColor: 0x4d8ac6, groundColor: 0x927556, intensity: 1.20 };
const hemi = new THREE.HemisphereLight(hemiCfg.skyColor, hemiCfg.groundColor, hemiCfg.intensity);
scene.add(hemi);

const ambCfg = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.ambient) ? VISUAL_CONFIG.ambient : { color: 0xa89d8c, intensity: 0.45 };
const ambient = new THREE.AmbientLight(ambCfg.color, ambCfg.intensity);
scene.add(ambient);

// شمس أسيوط الساطعة والحادة وقت الظهيرة مع ظلال PCF ناعمة وتغطية ~80 متر حول اللاعب
const sunCfg = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.sun) ? VISUAL_CONFIG.sun : { color: 0xfffaeb, intensity: 3.6, shadowExtent: 80, shadowBias: -0.00015, shadowNormalBias: 0.024, shadowRadius: 1.8 };
const sun = new THREE.DirectionalLight(sunCfg.color, sunCfg.intensity);
sun.position.set(45, 95, -35);
sun.castShadow = initPresetCfg.shadows;
sun.shadow.mapSize.set(initPresetCfg.shadowMapSize, initPresetCfg.shadowMapSize);
sun.shadow.radius = sunCfg.shadowRadius;

const shadowHalf = (sunCfg.shadowExtent || 80) / 2;
sun.shadow.camera.left = -shadowHalf;
sun.shadow.camera.right = shadowHalf;
sun.shadow.camera.top = shadowHalf;
sun.shadow.camera.bottom = -shadowHalf;
sun.shadow.camera.near = sunCfg.shadowNear || 5;
sun.shadow.camera.far = sunCfg.shadowFar || 200;
sun.shadow.bias = sunCfg.shadowBias;
sun.shadow.normalBias = sunCfg.shadowNormalBias;
scene.add(sun);
scene.add(sun.target);

/* ------------------------- سماء HDRI وانعكاسات البيئة (Poly Haven Clear Day) ------------------------- */
function initHDRIEnvironment() {
  if (typeof THREE === 'undefined' || !renderer || !scene) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // تدرج قبة سماء نهارية صافية مطابقة لمكتبة Poly Haven
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#1c5aa0');  // زرقة سماء صريحة في القمة
    grad.addColorStop(0.35, '#3b7ec8'); // زرقة جوية صافية
    grad.addColorStop(0.50, '#d6c6b2'); // ضباب ترابي دافئ عند الأفق
    grad.addColorStop(0.52, '#a08870'); // خط الأرض الرملية في الأفق
    grad.addColorStop(1.0, '#5a4836');  // قاع الأرض
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // قرص شمس ساطع لإنتاج انعكاسات سبيكيولار واقعية على هياكل السيارات والزجاج والأسفلت
    const sunX = 512 * 0.40;
    const sunY = 256 * 0.22;
    const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 28);
    sunG.addColorStop(0, 'rgba(255,255,255,1.0)');
    sunG.addColorStop(0.2, 'rgba(255,250,230,0.85)');
    sunG.addColorStop(0.5, 'rgba(255,230,180,0.3)');
    sunG.addColorStop(1.0, 'rgba(255,220,160,0.0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(sunX - 28, sunY - 28, 56, 56);

    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.SRGBColorSpace) skyTex.colorSpace = THREE.SRGBColorSpace;

    if (THREE.PMREMGenerator) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      if (typeof pmrem.compileEquirectangularShader === 'function') pmrem.compileEquirectangularShader();
      const envTexture = (typeof pmrem.fromEquirectangular === 'function') 
        ? pmrem.fromEquirectangular(skyTex).texture 
        : (typeof pmrem.fromScene === 'function' ? pmrem.fromScene(scene).texture : skyTex);
      scene.environment = envTexture;
      pmrem.dispose();
    } else {
      scene.environment = skyTex;
    }
  } catch (err) {
    console.warn('initHDRIEnvironment fallback:', err);
  }
}
initHDRIEnvironment();

/* تحسين الأداء الرسومي بناء على الجودة المختارة (Switchable at runtime) */
function applyGraphicsSettings(mode) {
  let quality = mode;
  if (!quality && typeof G !== 'undefined' && G.graphicsQuality) quality = G.graphicsQuality;
  if (!quality && typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.preset) quality = VISUAL_CONFIG.preset;
  if (quality === 'perf') quality = 'low';
  if (quality === 'balanced') quality = 'medium';
  if (!quality) quality = 'medium';

  if (typeof G !== 'undefined') G.graphicsQuality = quality;
  if (typeof VISUAL_CONFIG !== 'undefined') VISUAL_CONFIG.preset = quality;
  const cfg = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.presets[quality]) || VISUAL_CONFIG.presets.medium;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.pixelRatio));
  renderer.shadowMap.enabled = cfg.shadows;
  if (cfg.shadows) {
    renderer.shadowMap.type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    renderer.shadowMap.needsUpdate = true;
  } else {
    sun.castShadow = false;
  }

  if (scene.fog) {
    scene.fog.density = cfg.fogDensity || (VISUAL_CONFIG.fog ? VISUAL_CONFIG.fog.density : 0.00185);
    if (VISUAL_CONFIG.fog) scene.fog.color.setHex(VISUAL_CONFIG.fog.color);
  }

  // تطبيق التأثير اللوني الخفيف والفينييت من خلال المعالج السريع
  const vignette = document.getElementById('vignetteOverlay');
  if (vignette) {
    vignette.style.display = cfg.vignette ? 'block' : 'none';
    vignette.style.opacity = quality === 'low' ? '0.7' : '1.0';
  }
  const cvs = renderer.domElement;
  if (cvs && cfg.colorGrading) {
    cvs.style.filter = quality === 'high' 
      ? 'saturate(0.90) contrast(1.05) sepia(0.06)' 
      : 'saturate(0.90) contrast(1.04) sepia(0.05)';
  } else if (cvs) {
    cvs.style.filter = 'none';
  }
}

/* ------------------------- أدوات الرسومات ------------------------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function glowTexture() {
  return canvasTex(64, 64, g => {
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.28, 'rgba(255,255,255,.65)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  });
}
const GLOW_TEX = glowTexture();

function radialTexture() {
  return canvasTex(128, 128, g => {
    const rg = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,255,255,.9)');
    rg.addColorStop(0.55, 'rgba(255,255,255,.25)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  });
}
const RADIAL_TEX = radialTexture();

function labelSprite(text, color = '#ffc61a') {
  const t = canvasTex(512, 128, g => {
    g.clearRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(6,12,22,.9)';
    rr(g, 8, 18, 496, 92, 22); g.fill();
    g.strokeStyle = color; g.lineWidth = 5; g.stroke();
    g.fillStyle = color;
    g.font = '900 54px Cairo, Tahoma, Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 66);
  });
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false });
  const s = new THREE.Sprite(m);
  s.scale.set(4.6, 1.15, 1);
  s.renderOrder = 20;
  return s;
}

/* ------------------------- نسيج الأسفلت والرصيف ------------------------- */
const asphaltTex = canvasTex(256, 256, g => {
  g.fillStyle = '#292c34'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) {
    const v = (Math.random() * 52) | 0;
    g.fillStyle = `rgba(${v + 24},${v + 26},${v + 32},${0.16 + Math.random() * 0.30})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
  }
  for (let i = 0; i < 20; i++) {
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(Math.random() * 256, Math.random() * 256);
    g.lineTo(Math.random() * 256, Math.random() * 256); g.stroke();
  }
});
asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
asphaltTex.repeat.set(120, 4);

const pavingTex = canvasTex(128, 128, g => {
  g.fillStyle = '#6f737c'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) {
    for (let x = 0; x < 128; x += 32) {
      const v = 104 + ((Math.random() * 20) | 0);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  g.strokeStyle = 'rgba(26,28,34,.68)'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
});
pavingTex.wrapS = pavingTex.wrapT = THREE.RepeatWrapping;
pavingTex.repeat.set(WORLD / 4, 2);

const brickWalkTex = canvasTex(128, 128, g => {
  // نمط ممشى الكورنيش في الموقع: مربعات طوب أحمر محاطة بشبكة بلاط رمادي
  g.fillStyle = '#606674'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 64) {
    for (let x = 0; x < 128; x += 64) {
      g.fillStyle = '#7c2b26';
      g.fillRect(x + 6, y + 6, 52, 52);
      g.fillStyle = '#92352e';
      g.fillRect(x + 8, y + 8, 22, 22);
      g.fillRect(x + 34, y + 34, 22, 22);
      g.fillStyle = '#6d2420';
      g.fillRect(x + 34, y + 8, 22, 22);
      g.fillRect(x + 8, y + 34, 22, 22);
    }
  }
  g.strokeStyle = 'rgba(20,22,28,.45)'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
});
brickWalkTex.wrapS = brickWalkTex.wrapT = THREE.RepeatWrapping;
brickWalkTex.repeat.set(WORLD / 3, 2);

const ironGrilleTex = canvasTex(256, 64, g => {
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = '#12151a';
  g.fillRect(0, 0, 256, 6);
  g.fillRect(0, 58, 256, 6);
  g.strokeStyle = '#14171d';
  g.lineWidth = 5;
  for (let x = 16; x < 256; x += 32) {
    g.beginPath();
    g.arc(x, 32, 13, 0, Math.PI * 2);
    g.stroke();
    g.fillRect(x - 16, 6, 3, 52);
  }
});
ironGrilleTex.wrapS = THREE.RepeatWrapping;
ironGrilleTex.wrapT = THREE.ClampToEdgeWrapping;

const curbStripeTex = canvasTex(128, 16, g => {
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? '#14161a' : '#eab308';
    g.fillRect(i * 32, 0, 32, 16);
  }
});
curbStripeTex.wrapS = curbStripeTex.wrapT = THREE.RepeatWrapping;

const medTex = canvasTex(64, 64, g => {
  g.fillStyle = '#1f5324'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = Math.random() < .5 ? 'rgba(50,120,45,.32)' : 'rgba(15,40,18,.3)';
    g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  // حواف صفراء على جانبي الجزيرة
  g.fillStyle = '#eab308';
  g.fillRect(0, 0, 64, 7);
  g.fillRect(0, 57, 64, 7);
});
medTex.wrapS = medTex.wrapT = THREE.RepeatWrapping;
medTex.repeat.set(WORLD / 4, 1);

const pickupHatchTex = canvasTex(256, 256, g => {
  g.fillStyle = 'rgba(255, 198, 26, 0.20)';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255, 205, 30, 0.85)';
  g.lineWidth = 14;
  for (let i = -256; i < 512; i += 38) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
  }
  g.strokeStyle = '#ffd34d';
  g.lineWidth = 14;
  g.strokeRect(7, 7, 242, 242);
});

/* ------------------------- نسيج المباني (طراز أسيوط الكلاسيكي) ------------------------- */
function facadeTex(base, litChance) {
  const t = canvasTex(256, 256, g => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(0,0,0,.09)';
    for (let fy = 0; fy < 4; fy++) g.fillRect(0, fy * 64 + 59, 256, 4);
    for (let fy = 0; fy < 4; fy++) {
      for (let fx = 0; fx < 4; fx++) {
        const x = 15 + fx * 60, y = 10 + fy * 64;
        // إطار الشباك المقوس من فوق
        g.fillStyle = 'rgba(40,32,26,.35)';
        g.beginPath();
        g.arc(x + 15, y + 12, 17, Math.PI, 0);
        g.lineTo(x + 32, y + 40);
        g.lineTo(x - 2, y + 40);
        g.closePath();
        g.fill();

        const lit = Math.random() < litChance;
        const shutter = Math.random() < .68;
        g.fillStyle = shutter && !lit ? '#173d29' : (lit ? '#ffe29c' : '#16202a');
        g.beginPath();
        g.arc(x + 15, y + 12, 14, Math.PI, 0);
        g.lineTo(x + 29, y + 38);
        g.lineTo(x + 1, y + 38);
        g.closePath();
        g.fill();

        // ضلفة شيش وسطى ودرابزين حديد تحت الشباك
        g.strokeStyle = 'rgba(10,14,18,.55)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 15, y); g.lineTo(x + 15, y + 38); g.stroke();
        g.fillStyle = '#14181e';
        g.fillRect(x - 2, y + 34, 34, 5);
        for (let k = 0; k < 5; k++) g.fillRect(x + k * 7, y + 29, 2, 7);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const FACADE_BASES = ['#d8cab5', '#ceb89d', '#e2d7c5', '#c8b298', '#cbb9a6', '#b8a28b', '#dcd0be'];
const FACADE_TEXES = FACADE_BASES.map(b => facadeTex(b, 0.38));

const ARCADE_TEX = canvasTex(256, 128, g => {
  g.fillStyle = '#d4c3aa'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 4; i++) {
    const cx = i * 64 + 32;
    g.fillStyle = '#16110e';
    g.beginPath();
    g.arc(cx, 54, 22, Math.PI, 0);
    g.lineTo(cx + 22, 128);
    g.lineTo(cx - 22, 128);
    g.closePath();
    g.fill();
    // وهج دافي خفيف جوه الباكية
    const gr = g.createLinearGradient(0, 50, 0, 128);
    gr.addColorStop(0, 'rgba(255,175,85,.28)');
    gr.addColorStop(1, 'rgba(20,16,12,.15)');
    g.fillStyle = gr;
    g.fill();
  }
});
ARCADE_TEX.wrapS = ARCADE_TEX.wrapT = THREE.RepeatWrapping;

const SHOP_NAMES = ['فطاطري الملكة', 'سوبر ماركت الهدى', 'شاورما محبة', 'أدوات منزلية', 'بصريات النور', 'أحذية روما', 'كافيه الكورنيش', 'صيدلية', 'بقالة', 'عصير'];
function shopTex() {
  const t = canvasTex(512, 128, g => {
    g.fillStyle = '#141821'; g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 4; i++) {
      const x = i * 128;
      const col = ['#d62828', '#1f6fd8', '#25a864', '#d99621', '#a030c8', '#159fb0'][(Math.random() * 6) | 0];
      g.fillStyle = col; g.fillRect(x + 3, 4, 122, 34);
      g.fillStyle = '#ffffff';
      g.font = '900 17px Cairo, Tahoma, Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(pick(SHOP_NAMES), x + 64, 21);
      g.fillStyle = '#0c1822'; g.fillRect(x + 6, 42, 116, 80);
      const gr = g.createLinearGradient(x, 42, x + 120, 122);
      gr.addColorStop(0, 'rgba(110,210,255,.28)');
      gr.addColorStop(1, 'rgba(255,195,90,.20)');
      g.fillStyle = gr; g.fillRect(x + 6, 42, 116, 80);
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(x + 14, 52, 36, 26);
      g.fillRect(x + 56, 56, 26, 22);
      g.fillStyle = 'rgba(10,14,20,.88)'; g.fillRect(x + 94, 66, 24, 56);
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2;
      g.strokeRect(x + 6, 42, 116, 80);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const SHOP_TEXES = [shopTex(), shopTex(), shopTex()];

function signTex(text, color) {
  return canvasTex(256, 64, g => {
    g.fillStyle = 'rgba(8,14,22,.95)'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = color; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
    g.shadowColor = color; g.shadowBlur = 16;
    g.fillStyle = color;
    g.font = '900 26px Cairo, Tahoma, Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 35);
  });
}
const SIGN_TEXES = [
  signTex('فطاطري الملكة', '#ff7b4d'), signTex('سوبر ماركت الهدى', '#ffd34d'),
  signTex('شاورما محبة', '#ff5b5b'), signTex('بصريات النور', '#56b4ff'),
  signTex('صيدلية', '#4dff9a'), signTex('أدوات منزلية', '#9bff6b'),
  signTex('شنط وأحذية روما', '#c56bff'), signTex('كافيه البحر', '#4dd8ff'),
];

function billboardTex(i) {
  const ads = [
    { bg: '#7a1126', bg2: '#3a0611', a: '#f0c05a', tag: 'بنك مصر · ١٩٨٨٨', t1: 'بنك مصر', t2: 'هفضل كل مرة أجيلك.. هنا مصر', badge: 'BM' },
    { bg: '#0a2e5c', bg2: '#05152c', a: '#f59e0b', tag: 'بنك القاهرة · ١٦٩٩٠', t1: 'بنك القاهرة', t2: 'اصرف واكسب مع بطاقات بنك القاهرة', badge: 'BDC' },
    { bg: '#003a70', bg2: '#001a38', a: '#38bdf8', tag: 'CIB Egypt · 19666', t1: 'البنك التجاري الدولي CIB', t2: 'بنك نثق به · حلول رقمية ذكية', badge: 'CIB' },
    { bg: '#0b5d3b', bg2: '#042b1b', a: '#eab308', tag: 'البنك الأهلي · ١٩٦٢٣', t1: 'البنك الأهلي المصري', t2: 'بنك أهل مصر.. دايماً معاك', badge: 'NBE' },
    { bg: '#5c1d78', bg2: '#290938', a: '#e879f9', tag: 'WE · ١١١', t1: 'المصرية للاتصالات WE', t2: 'أسرع إنترنت أرضي وموبايل في مصر', badge: 'WE' },
    { bg: '#b80f28', bg2: '#4d0410', a: '#ffffff', tag: 'فودافون كاش · *9#', t1: 'فودافون مصر', t2: 'حوّل فلوسك واستقبلها في ثانية', badge: 'VF' },
    { bg: '#991b1b', bg2: '#2d0707', a: '#fca5a5', tag: 'e& مصر · ٣٣٣', t1: 'اتصالات من e&', t2: 'شبكة الجيل الجديد في كل أسيوط', badge: 'e&' },
  ];
  const ad = ads[i % ads.length];
  return canvasTex(768, 384, g => {
    const gr = g.createLinearGradient(0, 0, 768, 384);
    gr.addColorStop(0, ad.bg);
    gr.addColorStop(1, ad.bg2);
    g.fillStyle = gr; g.fillRect(0, 0, 768, 384);
    g.strokeStyle = ad.a; g.lineWidth = 10; g.strokeRect(6, 6, 756, 372);
    g.globalAlpha = .14; g.fillStyle = ad.a;
    g.beginPath(); g.arc(140, 192, 175, 0, 7); g.fill();
    g.globalAlpha = 1;
    // شارة شعار البنك/الشركة
    g.fillStyle = ad.a;
    g.beginPath(); g.roundRect ? g.roundRect(42, 108, 168, 168, 28) : g.rect(42, 108, 168, 168); g.fill();
    g.fillStyle = ad.bg2; g.font = '900 54px Orbitron, Cairo, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ad.badge, 126, 194);
    // الشريط العلوي
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(240, 44, 486, 46);
    g.fillStyle = ad.a; g.font = '700 24px Cairo, Tahoma, Arial'; g.textAlign = 'right';
    g.fillText(ad.tag, 708, 68);
    // العنوان الرئيسي والشعار الحقيقي
    g.fillStyle = '#ffffff'; g.font = '900 56px Cairo, Tahoma, Arial';
    g.fillText(ad.t1, 718, 168);
    g.fillStyle = ad.a; g.font = '700 32px Cairo, Tahoma, Arial';
    g.fillText(ad.t2, 718, 248);
    g.fillStyle = 'rgba(255,255,255,0.72)'; g.font = '600 20px Cairo, Tahoma, Arial';
    g.fillText('مرخّص من البنك المركزي المصري · شوارع أسيوط', 718, 326);
  });
}
const BILLBOARD_TEXES = [0, 1, 2, 3, 4, 5, 6].map(billboardTex);

/* ========================= 21-materials.js ========================= */
/* Procedural HDRI reflection studio: realistic Egyptian sun radiance, atmospheric sky dome & ground bounce for automotive paint & glass reflections. */
const reflectionWorld = new THREE.Scene();
reflectionWorld.background = new THREE.Color(0xa2bfd4);
const envSphere = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {},
  vertexShader: `varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 vP; void main(){
    vec3 d=normalize(vP); float h=d.y;
    vec3 gnd=vec3(.20,.18,.15);
    vec3 hor=vec3(.82,.86,.90)*1.35;
    vec3 skyTop=vec3(.18,.44,.82)*1.65;
    vec3 c=h>0.?mix(hor,skyTop,smoothstep(0.,.72,h)):mix(hor,gnd,smoothstep(0.,-.42,h));
    vec3 sunDir=normalize(vec3(.55,.70,-.45));
    float sunDot=max(dot(d,sunDir),0.);
    float sunCore=pow(sunDot,1200.)*24.;
    float sunCorona=pow(sunDot,42.)*3.8;
    float sunGlow=pow(sunDot,6.)*.85;
    c+=(vec3(1.,.94,.82)*sunCore+vec3(1.,.88,.68)*sunCorona+vec3(1.,.80,.55)*sunGlow);
    float horBand=1.-smoothstep(0.,.12,abs(h-.03));
    float cityDetail=sin(atan(d.z,d.x)*18.)*.5+sin(atan(d.z,d.x)*37.)*.25;
    c=mix(c,c*(.72+.28*cityDetail),horBand*.45);
    gl_FragColor=vec4(c,1.);
  }`
}));
reflectionWorld.add(envSphere);
const envBake=new THREE.PMREMGenerator(renderer);
const reflectionTarget=envBake.fromScene(reflectionWorld,.04,.1,256);
scene.environment=reflectionTarget.texture;
if('environmentIntensity'in scene)scene.environmentIntensity=1.25;
reflectionWorld.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
envBake.dispose();

function detailVehicle(root, length=4.2, width=1.8, tall=false) {
 const trim=new THREE.MeshStandardMaterial({color:0x15191b,roughness:.65});
 const alloy=new THREE.MeshStandardMaterial({color:0xc5ccd0,metalness:.95,roughness:.16,envMapIntensity:1.45});
 const lens=new THREE.MeshPhysicalMaterial({color:0xbed3df,metalness:.15,roughness:.05,clearcoat:1,clearcoatRoughness:.04,reflectivity:.98,envMapIntensity:1.6});
 const line=(pts,mat=trim,r=.009)=>{
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  const m=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(3,pts.length*3),r,5,false),mat);root.add(m);return m;
 };
 const half=width/2+.012;
 for(const s of [-1,1]) {
  const z=s*half;
  // Door shut lines, sill, belt trim, handles and mirror housing.
  for(const x of [-.95,.15,.93]) line([[x,.46,z],[x,.79,z],[x-.06,.94,z]]);
  line([[-length*.43,.43,z],[length*.43,.43,z]],trim,.022);
  line([[-length*.39,.92,z],[length*.29,.92,z]],alloy,.012);
  for(const x of [-.63,.55]) {
   const h=new THREE.Mesh(new THREE.BoxGeometry(.19,.035,.035),alloy);h.position.set(x,.85,z+s*.015);root.add(h);
  }
  const mirror=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),trim);
  mirror.scale.set(.15,.075,.095);mirror.position.set(.89,1.01,s*(half+.14));root.add(mirror);
  const mirrorFace=new THREE.Mesh(new THREE.CircleGeometry(.063,14),lens);
  mirrorFace.rotation.y=-Math.PI/2;mirrorFace.position.set(.756,1.01,s*(half+.14));root.add(mirrorFace);
 }
 // Radiator slats and bonnet panel gaps.
 const front=length/2+.025;
 for(let i=0;i<7;i++) {
  const slat=new THREE.Mesh(new THREE.BoxGeometry(.018,.016,.65),alloy);
  slat.position.set(front,.55+i*.026,0);root.add(slat);
 }
 if(!tall) {
  for(const s of [-1,1]) line([[.99,.925,s*.66],[1.68,.875,s*.70],[length*.47,.835,s*.70]],trim,.006);
  for(const s of [-1,1]) line([[.56,1.015,s*.17],[.94,.935,s*.34]],trim,.013);
 }
}

/* ========================= 22-models.js ========================= */
/* Downloaded, licensed glTF assets. Embedded at build time so the game also works from file://. */
const MODEL_PACKED = {"landmarkMosque":"assets/models/landmarks/mosque-cc0.glb","micro":"assets/fiat-ducato.glb","man":"assets/pedestrian-aj.glb","woman":"assets/pedestrian-woman.glb","traffic_peugeot405":"assets/traffic-peugeot-405.glb","traffic_peugeot205":"assets/traffic-peugeot-205.glb","traffic_corolla":"assets/traffic-toyota-corolla.glb","traffic_logan":"assets/traffic-renault-logan.glb","traffic_lada":"assets/traffic-lada-2107.glb","traffic_kombi":"assets/traffic-vw-kombi.glb","traffic_tucson":"assets/traffic-hyundai-tucson.glb","traffic_uno":"assets/traffic-fiat-uno.glb","traffic_tuktuk":"assets/traffic-tuktuk.glb","traffic_moped":"assets/traffic-moped.glb","traffic_bicycle":"assets/traffic-bicycle.glb","traffic_bus3d":"assets/traffic-bus3d.glb","traffic_hiace":"assets/traffic-toyota-hiace.glb","traffic_sprinter":"assets/traffic-sprinter.glb","traffic_hilux":"assets/traffic-hilux.glb","qashqai":"assets/upload-qashqai.glb","qashqai_traffic":"assets/upload-qashqai-traffic.glb","roadster":"assets/upload-roadster.glb","roadster_traffic":"assets/upload-roadster-traffic.glb","micra":"assets/upload-micra.glb","micra_traffic":"assets/upload-micra-traffic.glb","sentra18":"assets/upload-sentra18.glb","sentra18_traffic":"assets/upload-sentra18-traffic.glb","sport370":"assets/upload-sport370.glb","sport370_traffic":"assets/upload-sport370-traffic.glb","epower":"assets/upload-epower.glb","epower_traffic":"assets/upload-epower-traffic.glb","versa":"assets/upload-versa.glb","versa_traffic":"assets/upload-versa-traffic.glb","xtrail":"assets/upload-xtrail.glb","xtrail_traffic":"assets/upload-xtrail-traffic.glb","altima":"assets/upload-altima.glb","altima_traffic":"assets/upload-altima-traffic.glb","fiat1300":"assets/upload-fiat1300.glb","fiat1300_traffic":"assets/upload-fiat1300-traffic.glb","policeSuburban":"assets/upload-policeSuburban.glb","policeSuburban_traffic":"assets/upload-policeSuburban-traffic.glb","policeDuster":"assets/upload-policeDuster.glb","policeDuster_traffic":"assets/upload-policeDuster-traffic.glb","policeBMW":"assets/upload-policeBMW.glb","policeBMW_traffic":"assets/upload-policeBMW-traffic.glb"};
const importedModels = { loaded: {}, errors: [], ready: false, completed: 0, total: Object.keys(MODEL_PACKED).length };
const modelLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const assetBadge = document.createElement('div');
assetBadge.style.cssText='position:fixed;top:14px;left:14px;z-index:60;background:#101b25e8;color:#e6edf2;padding:8px 14px;border:1px solid #ffffff28;border-radius:10px;font:12px Tahoma;direction:rtl;pointer-events:none';
assetBadge.textContent='تجهيز السيارات والشخصيات…';
const loadingUI=(()=>{
 const get=id=>document?.getElementById?.(id)||null;
 const screen=get('loadingScreen'),fill=get('loadBarFill'),pct=get('loadPct'),status=get('loadStatus'),tip=get('loadTip'),skip=get('loadSkip'),slides=document?.querySelectorAll?.('.loadSlide')||[];
 const tips=['اتبع الخط الأخضر على الأرض والسهم المضيء للوصول لأقرب راكب أو بلاغ.','استكشف شوارع أسيوط ومبانيها المصرية الأصيلة وكباري النيل والحدائق الخضراء.','يمكنك تبديل دورك بين سائق أوبر ودورية الشرطة وتطوير سيارتك من الجراج.','احرص على نظافة القيادة والتوقف في منطقة التسليم أو الركوب المضيئة.'];
 let slideIdx=0,timer=null,closed=false;
 if(slides.length>1&&typeof setInterval==='function')timer=setInterval(()=>{if(closed)return;slides[slideIdx]?.classList?.remove?.('active');slideIdx=(slideIdx+1)%slides.length;slides[slideIdx]?.classList?.add?.('active');if(tip)tip.textContent=tips[slideIdx%tips.length];},4200);
 function setProgress(ratio,label){const p=Math.max(5,Math.min(100,Math.round(ratio*100)));if(fill?.style)fill.style.width=p+'%';if(pct)pct.textContent=p+'%';if(status&&label)status.textContent=label;assetBadge.textContent=label||`تجهيز المدينة ${p}%`;}
 function finish(){if(closed)return;closed=true;if(timer)clearInterval(timer);if(screen){screen.classList?.add?.('fadeOut');if(typeof setTimeout==='function')setTimeout(()=>screen.remove?.(),750);}if(!importedModels.ready&&!assetBadge.parentNode&&document.body?.appendChild)document.body.appendChild(assetBadge);}
 if(skip)skip.onclick=finish;
 return{setProgress,finish,allowSkip(){skip?.classList?.remove?.('hidden');}};
})();
function modelBuffer(base64) {
 const raw=atob(base64),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes.buffer;
}
function updateSkinBounds(root) {
 root.updateMatrixWorld(true);
 root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
}
function surfaceSetup(root) {
 root.traverse(o=>{
  if(!o.isMesh)return;
  o.frustumCulled=false;
  o.castShadow=true;o.receiveShadow=true;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats) {
   if(m.map&&typeof renderer!=='undefined'&&renderer?.capabilities?.getMaxAnisotropy)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   if(m.metalness!==undefined)m.envMapIntensity=.65;
   const isGlass=/glass|vitre|steclo|windshield|window/i.test(m.name||'') || /glass|vitre|windshield/i.test(o.name||'');
   m.transmission=0;
   if(m.thickness!==undefined)m.thickness=0;
   if(!isGlass){
    m.transparent=false;
    m.opacity=1.0;
    m.depthWrite=true;
    m.depthTest=true;
    m.alphaTest=0;
    m.side=THREE.DoubleSide;
   }else{
    m.transparent=true;
    m.opacity=Math.max(0.35, Math.min(0.68, m.opacity || 0.48));
    m.depthWrite=true;
    m.depthTest=true;
   }
   if(m.name==='Autorickshaw'||/tuk[-_]?tuk/i.test(m.name||'')||/tuk[-_]?tuk/i.test(o.name||'')||/tuktuk/i.test(root.userData?.asset||'')){
    if(!/glass|window/i.test(m.name||'')){
     m.side=THREE.DoubleSide;
     m.transparent=false;
     m.opacity=1.0;
     m.depthWrite=true;
     m.depthTest=true;
     m.alphaTest=0;
    }
   }
  }
 });
}
const EXTRA_TRAFFIC_SPECS={
 traffic_peugeot405:{rotY:Math.PI/2,len:4.41,hw:.88,paint:['1994_405_Body'],wheelR:.30,wheels:['Object_28','Object_31','Object_34','Object_37']},
 traffic_peugeot205:{rotY:Math.PI/2,len:3.71,hw:.80,paint:[],wheelR:.28,wheels:['FLW','FRW','RLW','RRW']},
 traffic_corolla:{rotY:Math.PI/2,len:4.54,hw:.88,paint:['body'],wheelR:.30,wheels:['corolla-wheelFtL_1','corolla-wheelFtR_2','corolla-wheelBkL_3','corolla-wheelBkR_4']},
 traffic_logan:{rotY:-Math.PI/2,len:4.35,hw:.89,paint:['kuzov'],wheelR:.31,wheels:['Object_65','Object_70','Object_75','Object_80']},
 traffic_lada:{rotY:-Math.PI/2,len:4.14,hw:.83,paint:['BaseColorCuzov'],wheelR:.30,wheels:['Object_4','Object_78','Object_84','Object_90']},
 traffic_kombi:{rotY:Math.PI/2,len:4.28,hw:.90,paint:['kombi02blinn2SG1'],wheelR:.33,wheels:['polySurface5','polySurface6','polySurface16','polySurface17']},
 traffic_tucson:{rotY:Math.PI/2,len:4.48,hw:.94,paint:['varnish'],wheelR:.35,wheels:['tucson-15_FL_wheel','tucson-15_FR_wheel','tucson-15_BL_wheel','tucson-15_BR_wheel']},
 traffic_uno:{rotY:Math.PI/2,len:3.69,hw:.79,paint:['Scene_-_Root'],paintMesh:/^(capo|teto|porta|lateral|paralama|para)/i,wheelR:.28,wheels:[['pneus_dianteiros','aros_dianteiro','parafusos_dianteiro'],['pneus_dianteiros001','aros_dianteiro001','parafusos_dianteiro001'],['pneus_traseiros','aro_traseiros','parafusos_traseiros'],['pneus_traseiros001','aro_traseiros001','parafusos_traseiros001']]},
 traffic_hiace:{rotY:0,len:4.69,hw:.95,paint:['paint'],wheelR:.33,wheels:['hiace_wheelsmd','hiace_wheelsmd001','hiace_wheelsmd002','hiace_wheelsmd003']},
 traffic_sprinter:{rotY:Math.PI/2,len:5.6,hw:1.05,paint:['Carrosserie','Carrosserie 5'],wheelR:.36,wheels:[]},
 traffic_hilux:{rotY:Math.PI/2,len:4.85,hw:.95,paint:['hilux 1983'],wheelR:.34,wheels:[]}
};
function extractTrafficWheels(holder,groups,wheelR){
 holder.updateMatrixWorld(true);
 const invHolder=new THREE.Matrix4().copy(holder.matrixWorld).invert();
 const wheels=[];
 for(const entry of groups){
  const names=Array.isArray(entry)?entry:[entry];
  const nodes=names.map(n=>holder.getObjectByName(n)||holder.getObjectByName(n.replace(/\./g,''))).filter(Boolean);
  if(!nodes.length)continue;
  const wb=new THREE.Box3();
  for(const n of nodes)n.traverse(o=>{if(o.isMesh&&!/caliper|cliper|brake/i.test(o.name+' '+(o.material?.name||'')))wb.expandByObject(o);});
  if(wb.isEmpty())for(const n of nodes)wb.expandByObject(n);
  const center=wb.getCenter(new THREE.Vector3()).applyMatrix4(invHolder);
  const steer=new THREE.Group(),spin=new THREE.Group();
  steer.position.copy(center);steer.add(spin);holder.add(steer);
  for(const n of nodes)spin.attach(n);
  wheels.push({steer,spin,radius:wheelR,front:center.x>0});
 }
 holder.userData.wheels=wheels;
 return wheels;
}

const OCCUPANT_SHIRTS = [0xf4f3f0, 0x3d6bd9, 0x2c4159, 0xd94f3d, 0x3f8f6b, 0xb8a88c, 0x5c5549, 0x2f9fb3, 0x1c1e24, 0xe07b39];
const OCCUPANT_SKINS = [0xc58a5e, 0xa86f4a, 0x8a5738, 0xd9a477, 0x6f442c, 0xb87b50];
let _seatedGeos = null;
function getSeatedGeos() {
  if (!_seatedGeos) {
    _seatedGeos = {
      torso: new THREE.CapsuleGeometry(0.18, 0.30, 4, 8),
      head: new THREE.SphereGeometry(0.115, 10, 8),
      hair: new THREE.SphereGeometry(0.118, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      armUpper: new THREE.CylinderGeometry(0.042, 0.036, 0.24, 6),
      armFore: new THREE.CylinderGeometry(0.034, 0.028, 0.22, 6),
      thigh: new THREE.CylinderGeometry(0.060, 0.050, 0.30, 6),
      calf: new THREE.CylinderGeometry(0.048, 0.038, 0.26, 6)
    };
  }
  return _seatedGeos;
}

function makeSeatedOccupant({ isDriver = true, isTuktuk = false, shirt = null, skin = null } = {}) {
  const g = new THREE.Group();
  const geos = getSeatedGeos();
  const shirtColor = shirt || OCCUPANT_SHIRTS[Math.floor(Math.random() * OCCUPANT_SHIRTS.length)];
  const skinColor = skin || OCCUPANT_SKINS[Math.floor(Math.random() * OCCUPANT_SKINS.length)];
  const pantsColor = [0x222a36, 0x3a3a34, 0x182432, 0x4e463a, 0x1f1f22][Math.floor(Math.random() * 5)];
  const hairColor = [0x191410, 0x2c221a, 0x121214, 0x3d3228][Math.floor(Math.random() * 4)];

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.92 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.78 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.94 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 1.0 });

  const torso = new THREE.Mesh(geos.torso, shirtMat);
  torso.position.set(0, 0.44, 0);
  torso.rotation.z = isDriver ? 0.08 : 0.02;
  g.add(torso);

  const headGroup = new THREE.Group();
  headGroup.position.set(isDriver ? 0.02 : 0, 0.74, 0);
  const head = new THREE.Mesh(geos.head, skinMat);
  headGroup.add(head);
  const hair = new THREE.Mesh(geos.hair, hairMat);
  hair.position.y = 0.012;
  headGroup.add(hair);
  g.add(headGroup);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0, 0.54, side * 0.19);
    if (isDriver) {
      arm.rotation.order = 'ZYX';
      arm.rotation.z = isTuktuk ? -0.52 : -0.65;
      arm.rotation.y = side * (isTuktuk ? 0.18 : 0.28);
      const upper = new THREE.Mesh(geos.armUpper, shirtMat);
      upper.position.y = -0.12;
      arm.add(upper);
      const fore = new THREE.Mesh(geos.armFore, skinMat);
      fore.position.set(0.06, -0.28, 0);
      fore.rotation.z = isTuktuk ? -0.28 : -0.40;
      arm.add(fore);
    } else {
      arm.rotation.z = -0.25;
      const upper = new THREE.Mesh(geos.armUpper, shirtMat);
      upper.position.y = -0.12;
      arm.add(upper);
      const fore = new THREE.Mesh(geos.armFore, skinMat);
      fore.position.set(0.02, -0.26, 0);
      arm.add(fore);
    }
    g.add(arm);
  }

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(geos.thigh, pantsMat);
    thigh.rotation.z = Math.PI / 2;
    thigh.position.set(0.15, 0.20, side * 0.095);
    g.add(thigh);
    const calf = new THREE.Mesh(geos.calf, pantsMat);
    calf.position.set(0.30, 0.07, side * 0.095);
    g.add(calf);
  }

  g.userData.isOccupant = true;
  return g;
}

function populateVehicleOccupants(holder, key) {
  if (!holder || holder.userData.hasOccupants) return;
  holder.userData.hasOccupants = true;

  const occupantsGroup = new THREE.Group();
  occupantsGroup.name = 'OccupantsGroup';

  const isMicro = (key === 'micro' || key === 'traffic_hiace' || key === 'traffic_sprinter');
  const isTuktuk = (key === 'traffic_tuktuk' || key === 'tuktuk');
  const isBus = (key === 'traffic_bus3d' || key === 'bus');
  const isPickup = (key === 'traffic_hilux' || /pickup|truck/i.test(key));

  if (isTuktuk) {
    const driver = makeSeatedOccupant({ isDriver: true, isTuktuk: true });
    driver.position.set(0.12, 0.38, 0);
    driver.scale.setScalar(0.92);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    if (Math.random() < 0.78) {
      const p1 = makeSeatedOccupant({ isDriver: false });
      p1.position.set(-0.46, 0.44, 0.22);
      p1.scale.setScalar(0.88);
      occupantsGroup.add(p1);

      if (Math.random() < 0.60) {
        const p2 = makeSeatedOccupant({ isDriver: false });
        p2.position.set(-0.46, 0.44, -0.22);
        p2.scale.setScalar(0.86);
        occupantsGroup.add(p2);
      }
    }
  } else if (isMicro) {
    const driver = makeSeatedOccupant({ isDriver: true });
    driver.position.set(0.78, 0.52, -0.48);
    driver.scale.setScalar(0.94);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    if (Math.random() < 0.72) {
      const frontP = makeSeatedOccupant({ isDriver: false });
      frontP.position.set(0.78, 0.52, 0.48);
      frontP.scale.setScalar(0.92);
      occupantsGroup.add(frontP);
    }

    const rows = [
      { x: 0.12, y: 0.52, zList: [-0.42, 0.42] },
      { x: -0.62, y: 0.52, zList: [-0.42, 0.42] }
    ];
    for (const row of rows) {
      for (const z of row.zList) {
        if (Math.random() < 0.65) {
          const pass = makeSeatedOccupant({ isDriver: false });
          pass.position.set(row.x, row.y, z);
          pass.scale.setScalar(0.90);
          occupantsGroup.add(pass);
        }
      }
    }
  } else if (isBus) {
    const driver = makeSeatedOccupant({ isDriver: true });
    driver.position.set(2.82, 0.96, -0.62);
    driver.scale.setScalar(0.96);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    for (const x of [1.6, 0.6, -0.4, -1.4, -2.4]) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.45) {
          const bp = makeSeatedOccupant({ isDriver: false });
          bp.position.set(x, 0.98, side * 0.72);
          bp.scale.setScalar(0.90);
          occupantsGroup.add(bp);
        }
      }
    }
  } else {
    // Sedans, Hatchbacks, SUVs, Pickups
    const driver = makeSeatedOccupant({ isDriver: true });
    driver.position.set(0.02, 0.34, -0.37);
    driver.scale.setScalar(0.94);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    const frontP = makeSeatedOccupant({ isDriver: false });
    frontP.position.set(0.02, 0.34, 0.37);
    frontP.scale.setScalar(0.92);
    frontP.visible = (Math.random() < 0.45);
    occupantsGroup.add(frontP);
    holder.userData.passengerOccupant = frontP;

    if (!isPickup && Math.random() < 0.28) {
      const rearSide = Math.random() < 0.5 ? 1 : -1;
      const rearP = makeSeatedOccupant({ isDriver: false });
      rearP.position.set(-0.76, 0.36, rearSide * 0.35);
      rearP.scale.setScalar(0.90);
      occupantsGroup.add(rearP);
    }
  }

  holder.add(occupantsGroup);
  holder.userData.occupants = occupantsGroup;
}
function vehicleVisual(key, color, taxiPaint=false) {
 if(UPLOADED_MODELS[key.replace(/_traffic$/,'')]){const h=uploadedCarVisual(key,color);if(h){const c=CARS.find(x=>x.asset===key.replace(/_traffic$/,''));extractTrafficWheels(h,['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR'],c?.id==='micra'?.29:c?.id==='xtrail'?.37:.33);}return h;}
 const asset=importedModels.loaded[key];if(!asset)return null;
 const spec=EXTRA_TRAFFIC_SPECS[key];
 const model=(typeof cloneSkeleton==='function'?cloneSkeleton(asset.scene):asset.scene.clone(true)), holder=new THREE.Group();holder.add(model);
 model.traverse(o=>{if(o.isMesh&&/collision|shadowcaster|_shadow/i.test(o.name))o.visible=false;});
 model.rotation.y=spec?spec.rotY:(key==='qashqai'?(CARS.find(c=>c.id==='qashqai')?.orientation??Math.PI/2):key==='sunny'?0:key==='sentra'?Math.PI:key==='lada'||key==='logan'||key==='bmw'?-Math.PI/2:Math.PI/2);
 model.updateMatrixWorld(true);
 const box=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const size=box.getSize(new THREE.Vector3());
 const targetLen=spec?spec.len:(key==='sunny'?4.425:key==='qashqai'?4.44:key==='micro'?4.8:key==='tucson'?4.475:4.2);
 const scale=targetLen/Math.max(.1,size.x);model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
 box.makeEmpty();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const center=box.getCenter(new THREE.Vector3());
 model.position.set(-center.x,-box.min.y,-center.z);
 if(key==='micro')holder.scale.z=1.94/(box.max.z-box.min.z);
 const materialCache=new Map();
 model.traverse(o=>{
  if(!o.isMesh)return;
  o.frustumCulled=false;
  if(!o.visible||/collision|shadowcaster|_shadow/i.test(o.name)){o.visible=false;return;}
  o.castShadow=true;o.receiveShadow=true;
  const original=o.material;
  const name=original.name||'';
  const paint=spec?(spec.paint.includes(name)&&(!spec.paintMesh||spec.paintMesh.test((o.parent?.name||'')+' '+o.name))):(key==='qashqai'?/body|carpaint|exterior.*paint/i.test(name):key==='tucson'?name==='varnish':key==='bmw'?name==='material_0':key==='linea'?name==='Color_002':key==='sunny'?name==='N17_Pearl_Silver':key==='corolla'?name==='body':key==='logan'?name==='kuzov':key==='peugeot'?name==='1994_405_Body':key==='lada'?name==='BaseColorCuzov':key==='sentra'?name==='wire_143224087_2':key==='micro'?name==='varnish':key==='sport'?name==='RRViper_turbo_painted2'||name==='pickup':/^(hood|roof|tail|trunk|front_doo|rear_doo|right_doo|front_bum|rear_bump)/.test(name));
  // Keep Lada's black doors and roof; paint the bonnet and boot yellow.
  const blackPanel=taxiPaint&&key==='lada'&&!/kapot|bag|bagazh|boot|trunk/i.test(o.name);
  const cacheKey=original.uuid+':'+(paint?blackPanel?'black':'paint':'base');
  if(!materialCache.has(cacheKey)) {
   const mat=original.clone();
   if(key==='sunny'&&name==='N17_Pearl_Silver')mat.side=THREE.DoubleSide;
   if(key==='sunny'&&/Headlight/.test(name)){mat.side=THREE.DoubleSide;mat.emissive=new THREE.Color(0x99a8ae);mat.emissiveIntensity=.13;}
   if(paint){if(color!==undefined&&color!==null)mat.color.setHex(blackPanel?0x11151a:color);mat.metalness=Math.max(.32,mat.metalness||0);mat.roughness=.20;mat.envMapIntensity=1.35;}
   if(/steclo|glass|wind|seal/.test(name)){mat.opacity=Math.max(.46,mat.opacity);mat.roughness=.05;mat.metalness=.15;mat.envMapIntensity=1.5;mat.depthWrite=true;}
   if(/hrom|alloy|metal|silver|rim/.test(name)){mat.metalness=.92;mat.roughness=.18;mat.envMapIntensity=1.45;}
   materialCache.set(cacheKey,mat);
  }
  o.material=materialCache.get(cacheKey);
 });
 surfaceSetup(model);holder.userData.asset=key;
 if(spec)extractTrafficWheels(holder,spec.wheels,spec.wheelR);
 else if(key==='micro')extractTrafficWheels(holder,['ducato-14_FL_wheel','ducato-14_FR_wheel','ducato-14_BL_wheel','ducato-14_BR_wheel'],.35);
 populateVehicleOccupants(holder, key);
 return holder;
}
function streetLifeVisual(key){
 const asset=importedModels.loaded[key];if(!asset)return null;
 const target={traffic_tuktuk:2.65,traffic_moped:2.05,traffic_bicycle:1.95,traffic_bus3d:8.8}[key]||3.5;
 const holder=new THREE.Group(),model=(typeof cloneSkeleton==='function'?cloneSkeleton(asset.scene):asset.scene.clone(true));holder.add(model);
 const toRemove=[];model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;if(/collision|shadowcaster|_shadow/i.test(o.name))toRemove.push(o);}});
 toRemove.forEach(o=>o.parent?.remove(o));
 model.updateMatrixWorld(true);
 let box=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const rotY=(key==='traffic_bus3d'||key==='traffic_tuktuk')?-Math.PI/2:Math.PI/2;
 model.rotation.y=rotY;model.updateMatrixWorld(true);
 box.makeEmpty();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const size=box.getSize(new THREE.Vector3()),horizontal=Math.max(size.x,size.z);
 if(horizontal<.01)return null;
 model.scale.multiplyScalar(target/horizontal);model.updateMatrixWorld(true);
 box.makeEmpty();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});
 model.position.set(-box.getCenter(new THREE.Vector3()).x,-box.min.y,-box.getCenter(new THREE.Vector3()).z);
 surfaceSetup(model);holder.userData.asset=key;
 if(key==='traffic_tuktuk'||key==='traffic_bus3d')populateVehicleOccupants(holder, key);
 return holder;
}
function applyImportedTaxi(rig,c,paintHex) {
 const key=c.asset||({sedan:'lada',modern:'hyundai',micro:'micro',sport:'sport'})[c.body];
 if(!key)return rig;
 const visual=vehicleVisual(key,paintHex??c.color1,c.body==='sedan');if(!visual)return rig;
 rig.body.clear();rig.body.add(visual);
 for(const w of rig.wheels)rig.group.remove(w);
 rig.wheels=[];rig.passengerSeat=null;
 visual.updateMatrixWorld(true);
 // Reparent the Lada wheel assemblies to pivots aligned with the game's axle convention.
 if(key==='lada') {
  rig.group.updateMatrixWorld(true);
  const nodes=[];visual.traverse(o=>{if(/^Wheel_[LP]_[PZ]$/.test(o.name))nodes.push(o);});
  nodes.sort((a,b)=>new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3()).x-new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3()).x);
  for(const node of nodes){const pivot=new THREE.Group();pivot.position.copy(new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()));rig.group.add(pivot);pivot.attach(node);rig.wheels.push(pivot);}
 }

 rig.group.userData.asset=key;return rig;
}
const axisX=new THREE.Vector3(1,0,0),axisZ=new THREE.Vector3(0,0,1);
function rotateBoneWorld(bone,axis,angle) {
 if(!bone)return;
 const local=axis.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert());
 bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(local,angle));bone.updateWorldMatrix(false,true);
}
function personVisual(key) {
 const source=importedModels.loaded[key];if(!source)return null;
 const model=cloneSkeleton(source.scene);surfaceSetup(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 model.updateMatrixWorld(true);
 // Rest pose comes from a full Mixamo skeleton. Relax the T-pose before caching a walk cycle.
 rotateBoneWorld(model.getObjectByName('mixamorigLeftArm'),axisZ,-1.38);
 rotateBoneWorld(model.getObjectByName('mixamorigRightArm'),axisZ,1.38);
 updateSkinBounds(model);
 const b=new THREE.Box3().setFromObject(model),h=b.max.y-b.min.y;
 const wrapper=new THREE.Group();wrapper.add(model);wrapper.scale.setScalar((key==='man'?1.78:1.67)/h);
 model.position.y-=b.min.y;
 model.updateMatrixWorld(true);
 const joints=[];
 for(const [name,amplitude,phase,knee] of [
  ['LeftUpLeg',.42,0,false],['RightUpLeg',.42,Math.PI,false],
  ['LeftLeg',.68,0,true],['RightLeg',.68,Math.PI,true],
  ['LeftArm',-.32,0,false],['RightArm',-.32,Math.PI,false],
  ['LeftForeArm',-.15,0,false],['RightForeArm',-.15,Math.PI,false]
 ]) {
  const bone=model.getObjectByName('mixamorig'+name);if(!bone)continue;
  joints.push({bone,rest:bone.quaternion.clone(),axis:axisX.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()),amplitude,phase,knee});
 }
 wrapper.userData={asset:key,joints,model};return wrapper;
}
function attachImportedPerson(person,key) {
 if(person.userData.imported||!importedModels.loaded[key])return;
 const detailed=personVisual(key);if(!detailed)return;
 if(person.isLOD){for(const l of person.levels)l.distance=l.distance===0?65:160;person.addLevel(detailed,0);}
 else {for(const child of person.children)child.visible=false;person.add(detailed);}
 person.userData.imported=detailed;
}
const _pedAnimQ = new THREE.Quaternion();
function animateImportedPerson(person,phase,strength=1) {
 const detail=person.userData.imported;if(!detail)return false;
 for(const j of detail.userData.joints){const wave=Math.sin(phase+j.phase);const a=(j.knee?Math.max(0,-wave):wave)*j.amplitude*strength;j.bone.quaternion.copy(j.rest).multiply(_pedAnimQ.setFromAxisAngle(j.axis,a));}
 return true;
}
function localAxisForBone(bone,worldAxis){
 return worldAxis.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
}
function poseCycleRider(rider,bicycle){
 const model=rider.userData.model;rider.updateMatrixWorld(true);
 const bindBone=name=>{const bone=model.getObjectByName('mixamorig'+name);return bone?{bone,rest:bone.quaternion.clone(),ax:localAxisForBone(bone,axisX),az:localAxisForBone(bone,axisZ)}:null;};
 const spine=bindBone('Spine'),spine1=bindBone('Spine1'),head=bindBone('Head');
 const lArm=bindBone('LeftArm'),lFore=bindBone('LeftForeArm'),rArm=bindBone('RightArm'),rFore=bindBone('RightForeArm');
 const lUp=bindBone('LeftUpLeg'),lLeg=bindBone('LeftLeg'),lFoot=bindBone('LeftFoot');
 const rUp=bindBone('RightUpLeg'),rLeg=bindBone('RightLeg'),rFoot=bindBone('RightFoot');
 const rot=(b,axis,a)=>{if(b)b.bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,a));};
 // Pose torso and arms in rider's own neutral (+Z forward) space before attaching to vehicle.
 rot(spine,spine?.ax,bicycle?.20:.14);
 rot(spine1,spine1?.ax,bicycle?.26:.18);
 rot(head,head?.ax,bicycle?-.22:-.16);
 rot(lArm,lArm?.ax,bicycle?-1.18:-1.05);rot(lArm,lArm?.az,-.10);rot(lFore,lFore?.ax,-.28);
 rot(rArm,rArm?.ax,bicycle?-1.18:-1.05);rot(rArm,rArm?.az,.10);rot(rFore,rFore?.ax,-.28);
 rider.scale.multiplyScalar(.92);
 rider.rotation.y=Math.PI/2;
 rider.position.set(bicycle?-.18:-.16,bicycle?.09:.04,0);
 const legs=[
  {up:lUp,leg:lLeg,foot:lFoot,phase:0},
  {up:rUp,leg:rLeg,foot:rFoot,phase:Math.PI}
 ];
 rider.userData.cycleRig={bicycle,L1:.295,L2:.295,hx:rider.position.x,hy:(bicycle?.754*.92+.09:.754*.92+.04),legs};
 updateSkinBounds(model);
 animateCycleRider(rider,0);
}
function animateCycleRider(rider,pedalPhase){
 const rig=rider?.userData?.cycleRig;if(!rig)return;
 const {bicycle,L1,L2,hx,hy,legs}=rig,cx=bicycle?.03:.08,cy=bicycle?.33:.28,cr=bicycle?.135:.025;
 const q=new THREE.Quaternion();
 for(const side of legs){
  const ph=pedalPhase+side.phase,px=cx+Math.cos(ph)*cr,py=cy+Math.sin(ph)*cr;
  const dx=px-hx,dy=py-hy,d=clamp(Math.hypot(dx,dy),.16,L1+L2-.02);
  const gamma=Math.atan2(dx,-dy),delta=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1));
  const interior=Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1));
  const thighA=-(gamma+delta),kneeA=Math.PI-interior,footA=-(thighA+kneeA)*.7;
  if(side.up)side.up.bone.quaternion.copy(side.up.rest).multiply(q.setFromAxisAngle(side.up.ax,thighA));
  if(side.leg)side.leg.bone.quaternion.copy(side.leg.rest).multiply(q.setFromAxisAngle(side.leg.ax,kneeA));
  if(side.foot)side.foot.bone.quaternion.copy(side.foot.rest).multiply(q.setFromAxisAngle(side.foot.ax,footA));
 }
}
function _upgradeTrafficItem(t,key){
 if(!['car','modern','micro','tuktuk','bus','motorcycle','bicycle'].includes(t.kind))return;
 const currentImport=t.mesh.userData.imported;
 if(currentImport&&!currentImport.endsWith('_traffic'))return;
 let choice=t.mesh.userData.modelKey||(t.kind==='modern'?'qashqai':t.kind==='micro'?'micro':'micra');
 const baseKey=choice.replace(/_traffic$/,'');
 if(UPLOADED_MODELS[baseKey]){
  if(importedModels.loaded[baseKey])choice=baseKey;
  else return;
 }else if(!importedModels.loaded[choice]||currentImport)return;
 const detailed=/^traffic_(?:tuktuk|moped|bicycle|bus3d)$/.test(choice)?streetLifeVisual(choice):vehicleVisual(choice,t.mesh.userData.paint||0x899da7,false);
 if(!detailed)return;
 if((t.kind==='bicycle'||t.kind==='motorcycle')&&t.mesh.userData.rider&&typeof cloneSkeleton==='function'){
  const rider=cloneSkeleton(t.mesh.userData.rider);rider.visible=true;detailed.add(rider);
 }
 t.mesh.clear();
 t.mesh.add(detailed);
 t.mesh.userData.imported=choice;
 if(detailed.userData.wheels?.length)t.mesh.userData.wheels=detailed.userData.wheels;
 const def=CARS.find(c=>c.asset===choice.replace(/_traffic$/,'')),spec=EXTRA_TRAFFIC_SPECS[choice];
 if(def?.uploaded){t.hl=def.length/2;t.hw=def.halfWidth;}
 else if(spec){t.hl=spec.len/2;t.hw=spec.hw;}
 else if(choice==='micro'){t.hl=2.4;t.hw=.97;}
 t.mesh.userData.brakeMaterials=[];detailed.traverse(o=>{if(o.isMesh&&/brakelight|stoplamp|rearlight|red_lens|stopari/i.test(o.material?.name||''))t.mesh.userData.brakeMaterials.push(o.material);});
}
const _upgradeTasks=[];let _upgradeScheduled=false;
function _flushUpgradeQueue(){
 _upgradeScheduled=false;
 const batch=_upgradeTasks.splice(0,3);
 for(const fn of batch)try{fn();}catch(_){}
 if(_upgradeTasks.length&&typeof requestAnimationFrame==='function'){
  _upgradeScheduled=true;
  requestAnimationFrame(_flushUpgradeQueue);
 }
}
function _enqueueUpgrade(fn){
 _upgradeTasks.push(fn);
 if(!_upgradeScheduled&&typeof requestAnimationFrame==='function'){
  _upgradeScheduled=true;
  requestAnimationFrame(_flushUpgradeQueue);
 }
}
function upgradeLoadedModels(key) {
 const isTest=(typeof navigator!=='undefined'&&navigator.userAgent==='test')||typeof requestAnimationFrame!=='function';
 if(!['man','woman'].includes(key)) {
  if(CARS[G.carIdx]?.asset===key)swapTaxi(G.carIdx);
  for(const t of traffic) {
   if(isTest)_upgradeTrafficItem(t,key);
   else _enqueueUpgrade(()=>_upgradeTrafficItem(t,key));
  }
 }
 if(key==='man'||key==='woman') {
  if(isTest){
   peds.forEach((p,i)=>attachImportedPerson(p.mesh,i%3===0?'woman':'man'));
   attachImportedPerson(passenger,'man');
   if(key==='man')for(const t of traffic){if(!t.mesh.userData.twoWheeler||t.mesh.userData.riderDetail)continue;const rider=personVisual('man');if(!rider)continue;t.mesh.userData.rider.visible=false;poseCycleRider(rider,t.kind==='bicycle');t.mesh.add(rider);t.mesh.userData.riderDetail=rider;}
  }else{
   _enqueueUpgrade(()=>attachImportedPerson(passenger,'man'));
   peds.forEach((p,i)=>_enqueueUpgrade(()=>attachImportedPerson(p.mesh,i%3===0?'woman':'man')));
   if(key==='man')for(const t of traffic){if(!t.mesh.userData.twoWheeler||t.mesh.userData.riderDetail)continue;_enqueueUpgrade(()=>{if(t.mesh.userData.riderDetail)return;const rider=personVisual('man');if(!rider)return;t.mesh.userData.rider.visible=false;poseCycleRider(rider,t.kind==='bicycle');t.mesh.add(rider);t.mesh.userData.riderDetail=rider;});}
  }
 }
}

const MODEL_ARABIC_NAMES = {
  qashqai: 'نيسان قشقاي الأساسية',
  qashqai_traffic: 'أسطول نيسان قشقاي',
  policeSuburban: 'دورية سوبربان شريف',
  policeSuburban_traffic: 'دورية سوبربان المرور',
  policeDuster: 'دورية رينو داستر',
  policeDuster_traffic: 'دورية رينو داستر المرور',
  policeBMW: 'دورية بي إم دبليو 320i',
  policeBMW_traffic: 'دورية بي إم دبليو المرور',
  traffic_bus3d: 'أتوبيس النقل العام',
  traffic_hiace: 'ميكروباص تويوتا هايس',
  traffic_sprinter: 'ميكروباص مرسيدس سبرينتر',
  traffic_hilux: 'سيارة نصف نقل الدبابة',
  traffic_tuktuk: 'التوك توك باجاج',
  traffic_moped: 'دراجة نارية',
  traffic_bicycle: 'دراجة هوائية',
  traffic_peugeot405: 'بيجو 405 صالون',
  traffic_corolla: 'تويوتا كورولا',
  traffic_logan: 'رينو لوجان',
  traffic_lada: 'لادا 2107',
  traffic_tucson: 'هيونداي توسان',
  man: 'أهالي ومشاة أسيوط (رجال)',
  woman: 'أهالي ومشاة أسيوط (سيدات)',
  landmarkMosque: 'معالم ومساجد أسيوط',
  sentra18: 'نيسان سنترا',
  sentra18_traffic: 'أسطول نيسان سنترا',
  altima: 'نيسان ألتيما',
  altima_traffic: 'أسطول نيسان ألتيما',
  xtrail: 'نيسان إكس-تريل',
  xtrail_traffic: 'أسطول نيسان إكس-تريل',
  epower: 'نيسان سنترا إي-باور',
  epower_traffic: 'أسطول سنترا إي-باور',
  versa: 'نيسان فيرسا',
  versa_traffic: 'أسطول نيسان فيرسا',
  fiat1300: 'فيات 1300 الكلاسيكية',
  fiat1300_traffic: 'أسطول فيات 1300',
  micra: 'نيسان ميكرا',
  micra_traffic: 'أسطول نيسان ميكرا',
  roadster: 'نيسان 370Z رودستر',
  roadster_traffic: 'أسطول نيسان رودستر',
  sport370: 'نيسان 370Z سبورت',
  sport370_traffic: 'أسطول نيسان سبورت'
};

const modelJobs=new Map();
async function ensureVehicleModel(key){
 if(importedModels.loaded[key])return importedModels.loaded[key];if(modelJobs.has(key))return modelJobs.get(key);
 const data=MODEL_PACKED[key];if(!data)throw Error('ملف السيارة غير موجود: '+key);
 const job=(async()=>{try{const gltf=await(data.startsWith('assets/')?modelLoader.loadAsync(data):modelLoader.parseAsync(modelBuffer(data),''));importedModels.loaded[key]=gltf;upgradeLoadedModels(key);if(key==='landmarkMosque'&&typeof addExternalAssyutLandmark==='function')addExternalAssyutLandmark();return gltf;}catch(e){importedModels.errors.push(key+': '+e.message);throw e;}finally{importedModels.completed++;}})();modelJobs.set(key,job);return job;
}
async function initImportedModels(){
 const selected=CARS[G.carIdx]?.asset||'qashqai';
 const roleTiles=[...document.querySelectorAll('.roleTile, [data-mode]')];
 for(const tile of roleTiles){tile.classList.add('loading');}
 const started=Date.now();
 loadingUI.setProgress(.04,'جاري فحص وتجهيز ملفات اللعبة…');

 const allKeys=Object.keys(MODEL_PACKED);
 const queue=[];
 const priority=[
  selected,
  'traffic_bus3d', 'traffic_hiace', 'traffic_sprinter', 'traffic_hilux', 'traffic_tuktuk',
  'traffic_kombi', 'traffic_uno', 'traffic_peugeot405', 'traffic_peugeot205', 'traffic_corolla', 'traffic_logan', 'traffic_lada', 'traffic_tucson',
  'traffic_moped', 'traffic_bicycle',
  'man', 'woman', 'micro'
 ];
 for(const k of priority){if(MODEL_PACKED[k]&&!importedModels.loaded[k]&&!queue.includes(k))queue.push(k);}

 const total=queue.length;
 let completed=0;
 const updateLoadBar=async(key)=>{
  completed++;
  const ratio=Math.min(0.92,(completed/Math.max(1,total))*0.92);
  const name=MODEL_ARABIC_NAMES[key]||key;
  loadingUI.setProgress(ratio,`جاري تحميل ${name} (${completed} من ${total})…`);
  if(typeof requestAnimationFrame==='function')await new Promise(r=>requestAnimationFrame(r));
  else if(typeof setTimeout==='function')await new Promise(r=>setTimeout(r,0));
 };

 let next=0;
 const worker=async()=>{
  while(next<queue.length){
   const key=queue[next++];
   try{await ensureVehicleModel(key);}
   catch(e){console.warn('Model preloading warning:',key,e.message);}
   finally{
    await updateLoadBar(key);
    if(typeof G!=='undefined'&&G.state==='play'){
     await new Promise(r=>setTimeout(r,260));
    }else{
     await new Promise(r=>setTimeout(r,24));
    }
   }
  }
 };
 await worker();

 loadingUI.setProgress(0.96,'تهيئة معالج الرسوميات وتثبيت الإطارات…');
 if(typeof requestAnimationFrame==='function')await new Promise(r=>requestAnimationFrame(r));

 importedModels.ready=true;
 loadingUI.setProgress(1.0,'اكتمل تحميل كافة ملفات اللعبة بنجاح! جاهز للعب السلس 100%');
 for(const tile of roleTiles){tile.classList.remove('loading');}

 const skipBtn=document.getElementById('loadSkip');
 if(skipBtn){
  skipBtn.textContent='انطلق للعب السلس ◀';
  skipBtn.classList.remove('hidden');
  skipBtn.classList.add('readyCTA');
  skipBtn.onclick=()=>loadingUI.finish();
 }
 const elapsed=Date.now()-started,wait=Math.max(0,1200-elapsed);
 if(typeof setTimeout==='function'){
  setTimeout(()=>{loadingUI.finish();setTimeout(()=>assetBadge?.remove?.(),3000);},wait);
 }else{loadingUI.finish();}
}

/* ========================= 23-menu-art.js ========================= */
const MENU_CAR_IMAGES={policeSuburban:'assets/ui/policeSuburban.webp',policeDuster:'assets/ui/policeDuster.webp',policeBMW:'assets/ui/policeBMW.webp'};

/* ========================= 23-surfaces.js ========================= */
/* CC0 photographic PBR surfaces from Poly Haven, embedded by build.js. */
const SURFACE_PACKED={"asphalt-arm":"assets/textures/asphalt-arm.webp","asphalt-color":"assets/textures/asphalt-color.webp","asphalt-normal":"assets/textures/asphalt-normal.webp","paving-arm":"assets/textures/paving-arm.webp","paving-color":"assets/textures/paving-color.webp","paving-normal":"assets/textures/paving-normal.webp","plaster-arm":"assets/textures/plaster-arm.webp","plaster-color":"assets/textures/plaster-color.webp","plaster-normal":"assets/textures/plaster-normal.webp","stone-arm":"assets/textures/stone-arm.webp","stone-color":"assets/textures/stone-color.webp","stone-normal":"assets/textures/stone-normal.webp"};
const surfaceAssets={loaded:0,total:Object.keys(SURFACE_PACKED).length,errors:[]};
const surfaceTextures={},surfaceTextureCopies={};
for(const [key,bytes] of Object.entries(SURFACE_PACKED)){
 const texUrl=/^(?:assets\/|\.\/|\.\.\/|data:|https?:)/.test(bytes)?bytes:'data:image/webp;base64,'+bytes;
 const texture=new THREE.TextureLoader().load(texUrl,()=>{
  surfaceAssets.loaded++;for(const clone of surfaceTextureCopies[key]||[])clone.needsUpdate=true;
 },undefined,error=>{surfaceAssets.errors.push(key);console.warn('Surface failed:',key,error);});
 texture.colorSpace=key.endsWith('-color')?THREE.SRGBColorSpace:THREE.NoColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());surfaceTextures[key]=texture;
}
function surfaceTexture(type,channel,w,d,tile=4){
 const key=type+'-'+channel,source=surfaceTextures[key];
 if(!source)return null;
 const texture=source.clone();texture.repeat.set(w/tile,d/tile);texture.needsUpdate=true;
 (surfaceTextureCopies[key]||=([])).push(texture);return texture;
}
const roadSurfaces=[];
function surfaceMaterial(type,w,d,color=0xffffff,tile=4){
 const map=surfaceTexture(type,'color',w,d,tile),normalMap=surfaceTexture(type,'normal',w,d,tile),arm=surfaceTexture(type,'arm',w,d,tile);
 const isAsph=type==='asphalt';
 const mat=new THREE.MeshStandardMaterial({color,map,normalMap,roughnessMap:arm,aoMap:arm,roughness:isAsph?.82:.95,metalness:0,normalScale:new THREE.Vector2(isAsph?.95:.65,isAsph?.95:.65),envMapIntensity:isAsph?.38:.15,aoMapIntensity:.55});
 if(type==='asphalt')roadSurfaces.push(mat);return mat;
}
function buildingSurfaces(w,h,d,tint){
 const front=surfaceMaterial('plaster',w,h,tint,4),side=surfaceMaterial('plaster',d,h,tint,4),roof=surfaceMaterial('stone',w,d,0xaaa69f,4);
 return [side,side,roof,roof,front,front];
}
const facadeDetails=new Map();
const nearArchitecture=[];
function detailInstance(type,x,y,z,sx,sy,sz,angle=0,color=0xffffff){
 const zone=Math.floor((x+HALF)/240),key=zone+':'+type;
 if(!facadeDetails.has(key))facadeDetails.set(key,{type,items:[]});
 facadeDetails.get(key).items.push({x,y,z,sx,sy,sz,angle,color});
}
function architecturalFacade(cx,cz,w,h,angle=0,groundShops=false){
 const ux=Math.cos(angle),uz=-Math.sin(angle),nx=Math.sin(angle),nz=Math.cos(angle);
 const at=(type,u,y,out,sx,sy,sz,col)=>detailInstance(type,cx+ux*u+nx*out,y,cz+uz*u+nz*out,sx,sy,sz,angle,col);
 const trim=pick([0xc6beb0,0xd2c6b2,0xb8afa1]),frames=pick([0x8b8276,0xc3bfb5,0x5a605e]);
 const cols=Math.max(2,Math.floor((w-1.4)/3.25)),spacing=(w-1.2)/cols;
 const floors=Math.max(1,Math.floor((h-5.1)/3.5));
 for(let fl=0;fl<floors;fl++){
  const y=6.2+fl*3.5;if(y+1.08>h-.5)continue;
  for(let c=0;c<cols;c++){
   const u=-w/2+.6+(c+.5)*spacing;
   at('frame',u,y,.10,1,1,1,frames);
   at(Math.random()<.24?'litGlass':'glass',u,y,.035,1,1,1,0xffffff);
   at('trim',u,y,.21,.045,1.97,.065,frames);
   at('trim',u,y+.22,.21,1.34,.04,.065,frames);
   at('trim',u,y-1.10,.21,1.7,.10,.43,trim);
   if(Math.random()<.23)at('shutter',u,y,.16,1.30,1.92,.09,pick([0x37483a,0x635d4b,0x424847]));
   if(Math.random()<.16){
    at('ac',u+1.1,y-.62,.23,.68,.43,.38,0xbab8ac);
    at('fan',u+1.1,y-.62,.43,.28,.28,1,0x4d5352);
   }
  }
  at('trim',0,y-1.45,.10,w,.10,.20,trim);
 }
 at('trim',0,h-.16,.13,w+.35,.3,.46,trim);
 at('pipe',-w/2+.28,h/2,.13,.075,h-.4,.075,0x68665b);
 at('trim',0,.55,.05,w,.95,.16,0x969083);
 if(groundShops){
  const shops=Math.max(2,Math.floor(w/4));
  for(let c=0;c<shops;c++){
   const u=-w/2+(c+.5)*w/shops,sw=w/shops-.38;
   at('glass',u,1.85,.07,sw/1.34,2.7/1.96,1,0xb9c8c6);
   at('trim',u-sw*.5,1.9,.16,.10,2.9,.12,0x6b7070);
   at('trim',u+sw*.5,1.9,.16,.10,2.9,.12,0x6b7070);
   at('trim',u+sw*.18,1.75,.18,.065,2.65,.10,0xa4a8a2);
   at('trim',u,3.5,.20,sw+.12,.35,.18,0x5f5f55);
   if(Math.random()<.28)at('shutter',u,1.82,.19,sw,2.68,.08,0x777971);
  }
 }
}
function finalizeFacadeDetails(){
 const outline=new THREE.Shape();outline.moveTo(-.75,-1.06);outline.lineTo(.75,-1.06);outline.lineTo(.75,1.06);outline.lineTo(-.75,1.06);outline.closePath();
 const opening=new THREE.Path();opening.moveTo(-.67,-.98);opening.lineTo(-.67,.98);opening.lineTo(.67,.98);opening.lineTo(.67,-.98);opening.closePath();outline.holes.push(opening);
 const frameGeo=new THREE.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:true,bevelSize:.018,bevelThickness:.015,bevelSegments:1,steps:1});
 const shutterTex=canvasTex(64,128,g=>{g.fillStyle='#d0d0c8';g.fillRect(0,0,64,128);for(let y=0;y<128;y+=8){g.fillStyle='#666c65';g.fillRect(0,y,64,2);g.fillStyle='#eeeeea';g.fillRect(0,y+2,64,1);}});shutterTex.wrapS=shutterTex.wrapT=THREE.RepeatWrapping;
 const mats={
  frame:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.84}),
  glass:new THREE.MeshPhysicalMaterial({color:0x445960,roughness:.18,metalness:.24,clearcoat:.8,envMapIntensity:.75}),
  litGlass:new THREE.MeshStandardMaterial({color:0x60635b,roughness:.25,metalness:.18,emissive:0xffcf8c,emissiveIntensity:0}),
  trim:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85}),
  pipe:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.7,metalness:.15}),
  ac:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.68}),
  fan:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.65}),
  shutter:new THREE.MeshStandardMaterial({map:shutterTex,color:0xffffff,roughness:.9})
 };
 nightWindows.push(mats.litGlass);
 const geos={frame:frameGeo,glass:new THREE.PlaneGeometry(1.34,1.96),litGlass:new THREE.PlaneGeometry(1.34,1.96),fan:new THREE.CircleGeometry(.5,12)};
 const box=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D(),col=new THREE.Color();
 for(const {type,items} of facadeDetails.values()){
  const inst=new THREE.InstancedMesh(geos[type]||box,mats[type],items.length);
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);inst.setColorAt(i,col.setHex(p.color));});
  inst.receiveShadow=type!=='glass'&&type!=='litGlass';inst.computeBoundingSphere();
  if(type!=='glass'&&type!=='litGlass'){const bounds=new THREE.Box3().setFromObject(inst);nearArchitecture.push({mesh:inst,bounds});}
  scene.add(inst);
 }
}

let _archTimer = 0, _archLastX = -9999, _archLastZ = -9999;
function updateArchitectureDetails(force = false){
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  if (!force && now - _archTimer < 100 && Math.hypot(car.x - _archLastX, car.z - _archLastZ) < 3) return;
  _archTimer = now; _archLastX = car.x; _archLastZ = car.z;
  const maxDist2 = (typeof G !== 'undefined' && (G.graphicsQuality === 'low' || G.graphicsQuality === 'perf')) ? 135 * 135 : 170 * 170;
  for(const {mesh,bounds} of nearArchitecture){
   const dx=Math.max(bounds.min.x-car.x,0,car.x-bounds.max.x),dz=Math.max(bounds.min.z-car.z,0,car.z-bounds.max.z);
   mesh.visible=dx*dx+dz*dz<maxDist2;
  }
}

/* ========================= 24-qashqai-import.js ========================= */
const CAR_THUMBS={"altima":"assets/thumbnails/altima.webp","epower":"assets/thumbnails/epower.webp","fiat1300":"assets/thumbnails/fiat1300.webp","micra":"assets/thumbnails/micra.webp","policeBMW":"assets/thumbnails/policeBMW.webp","policeDuster":"assets/thumbnails/policeDuster.webp","policeSuburban":"assets/thumbnails/policeSuburban.webp","qashqai":"assets/thumbnails/qashqai.webp","roadster":"assets/thumbnails/roadster.webp","sentra18":"assets/thumbnails/sentra18.webp","sport370":"assets/thumbnails/sport370.webp","versa":"assets/thumbnails/versa.webp","xtrail":"assets/thumbnails/xtrail.webp"};
/* The requested Sketchfab file requires its owner's authorized download session.
 * Accept that GLB locally; never replace it with a different car under its name. */
const QASHQAI_SOURCE={url:'https://sketchfab.com/3d-models/2024-nissan-qashqai-glory-3d26c0e62eaa46f1bbead9f3073540b3',author:'Ddiaz Design',license:'CC BY-NC-SA 4.0',status:'bundled'};
async function qashqaiDatabase(){if(!window.indexedDB)return null;return new Promise((resolve,reject)=>{const request=indexedDB.open('assyut-driver-models',1);request.onupgradeneeded=()=>request.result.createObjectStore('models');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function storeQashqai(bytes){const db=await qashqaiDatabase();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('models','readwrite');tx.objectStore('models').put(bytes,'qashqai');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
async function installQashqai(bytes,persist=true){
 if(rideBusy())throw Error('أكمل المشوار قبل تغيير العربية');
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<20||bytes.byteLength>100*1024*1024||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw Error('اختر ملف GLB صحيحًا بحجم أقل من 100 ميجابايت');
 const gltf=await modelLoader.parseAsync(bytes,'');gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),sz=box.getSize(new THREE.Vector3());if(Math.max(sz.x,sz.z)<=0||sz.y<=0)throw Error('الملف لا يحتوي على مجسم صالح');
 importedModels.loaded.qashqai=gltf;QASHQAI_SOURCE.status='ready';const c=CARS.find(c=>c.id==='qashqai');c.available=true;c.source=QASHQAI_SOURCE.url;c.orientation=Number(store.get('assyut_qashqai_orientation',String(sz.x>sz.z?0:Math.PI/2)));
 const index=CARS.indexOf(c);if(!G.owned.includes(c.id))G.owned.push(c.id);G.conditions[c.id]=G.conditions[c.id]??100;G.carIdx=index;car.speed=0;car.vel.set(0,0);swapTaxi(index);saveProgress();
 if(persist)await storeQashqai(bytes);updateHUD();return true;
}
async function restoreQashqai(){
 if(importedModels.loaded.qashqai)return;
 try{const db=await qashqaiDatabase();if(!db)return;const bytes=await new Promise((resolve,reject)=>{const tx=db.transaction('models','readonly'),r=tx.objectStore('models').get('qashqai');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();if(bytes){const previous=G.carIdx,prefer=CARS[+store.get('alex_taxi_car','0')]?.id==='qashqai';await installQashqai(bytes,false);if(!prefer){G.carIdx=previous;swapTaxi(previous);saveProgress();}}}catch(e){console.warn('Local car restore:',e.message);}
}
function chooseQashqaiFile(){
 if(rideBusy()){setObjective('أكمل المشوار أولًا',2500);return;}
 const input=document.createElement('input');input.type='file';input.accept='.glb,model/gltf-binary';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{QASHQAI_SOURCE.status='loading';await installQashqai(await file.arrayBuffer());setObjective('تم اعتماد القشقاي كسيارتك الرئيسية وحفظ مجسمها على هذا الجهاز',4500);openGarage();}catch(e){QASHQAI_SOURCE.status='missing';setObjective(e.message,4500);}};input.click();
}

/* ========================= 25-police-bmw-import.js ========================= */
const POLICE_BMW={ready:false,loading:false,error:''};
async function policeModelBytes(write){
 const db=await qashqaiDatabase();if(!db){if(write)throw Error('المتصفح لا يتيح حفظ المجسم محليًا');return null;}
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('models',write?'readwrite':'readonly'),r=write?tx.objectStore('models').put(write,'policeBMW'):tx.objectStore('models').get('policeBMW');let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('تعذّر حفظ المجسم'));});}finally{db.close();}
}
async function installPoliceBMW(bytes,{persist=true,select=true}={}){
 if(select&&rideBusy())throw Error('أكمل البلاغ الحالي أولًا');
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<20||bytes.byteLength>256*1024*1024||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw Error('اختر ملف BMW الأصلي بصيغة GLB، بحد أقصى 256 ميجابايت');
 const gltf=await modelLoader.parseAsync(bytes,''),model=gltf.scene,container=new THREE.Group();container.add(model);model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());if(!Number.isFinite(size.length())||Math.max(size.x,size.z)<=0||size.y<=0)throw Error('مجسم غير صالح');
 const heading=Number(store.get('assyut_police_bmw_heading',String(size.z>size.x?Math.PI/2:0)));container.rotation.y=heading;container.updateMatrixWorld(true);box.setFromObject(container);size=box.getSize(new THREE.Vector3());container.scale.setScalar(4.71/size.x);container.updateMatrixWorld(true);box.setFromObject(container);const center=box.getCenter(new THREE.Vector3());container.position.set(-center.x,-box.min.y,-center.z);container.updateMatrixWorld(true);
 // Uniform scale and rigid orientation only: original mesh proportions, maps and colors survive.
 const normalized={...gltf,scene:container};
 if(persist)await policeModelBytes(bytes);
 UPLOADED_MODELS.policeBMW={length:4.71,paint:[],normalized:true,preserveAppearance:true};importedModels.loaded.policeBMW=normalized;const c=CARS.find(c=>c.id==='policeBMW');c.available=true;POLICE_BMW.ready=true;POLICE_BMW.error='';if(!G.owned.includes(c.id))G.owned.push(c.id);G.conditions[c.id]??=100;
 if(select){store.set('assyut_police_vehicle',c.id);if(G.mode==='police'){G.carIdx=CARS.indexOf(c);car.speed=0;car.vel.set(0,0);swapTaxi(G.carIdx);applyCarStats();}saveProgress();updateHUD();}
 updatePoliceVehicleUI();return normalized;
}
async function restorePoliceBMW(){try{const bytes=await policeModelBytes();if(bytes)return await installPoliceBMW(bytes,{persist:false,select:false});}catch(e){POLICE_BMW.error=e.message;console.warn('Police BMW restore:',e.message);}return null;}
function selectedPoliceVehicle(){const preferred=store.get('assyut_police_vehicle','policeSuburban');return CARS.find(c=>c.police&&!c.localImport&&c.id===preferred&&c.available!==false)||CARS.find(c=>c.id==='policeSuburban');}
function updatePoliceVehicleUI(){if(typeof renderPatrolVehicles==='function')renderPatrolVehicles();}

function choosePoliceBMWFile(){
 if(rideBusy()){setObjective('أكمل البلاغ الحالي أولًا',3000);return;}
 const input=document.createElement('input');input.type='file';input.accept='.glb,model/gltf-binary';input.id='policeBMWFile';input.style.display='none';document.body.appendChild(input);
 input.oncancel=()=>{input.remove();updatePoliceVehicleUI();};input.onchange=async()=>{const file=input.files?.[0];if(!file){input.remove();return;}POLICE_BMW.loading=true;POLICE_BMW.error='';updatePoliceVehicleUI();try{await installPoliceBMW(await file.arrayBuffer());setObjective('تم تحميل نموذج BMW الأصلي وحفظه على جهازك',4500);}catch(e){POLICE_BMW.error=e.message;setObjective(e.message,4500);}finally{POLICE_BMW.loading=false;input.remove();updatePoliceVehicleUI();if(G.mode==='police'&&$('modalPanel')?.innerHTML.includes('garageGrid'))openGarage();}};input.click();
}
function selectPoliceVehicle(id){const c=CARS.find(c=>c.police&&c.id===id);if(!c||c.localImport||c.available===false)return false;store.set('assyut_police_vehicle',c.id);updatePoliceVehicleUI();return true;}

/* ========================= 26-police-films.js ========================= */
/* Photoreal film slots are filled only with actual generated/authorized videos. */
const POLICE_FILMS={};
async function loadPoliceFilms(){try{
 const response=await fetch('assets/media/police-films.json',{cache:'no-store'});if(!response.ok)return;
 const films=await response.json(),checks=new Map();
 for(const slots of Object.values(films))for(const [key,film]of Object.entries(slots))if(film.optional){
  if(!checks.has(film.src))checks.set(film.src,fetch(film.src,{method:'HEAD',cache:'no-store'}).then(r=>r.ok).catch(()=>false));
  if(!await checks.get(film.src))delete slots[key];
 }
 Object.assign(POLICE_FILMS,films);
}catch{} }

function policeFilmFor(vehicle,type,station){const key=type==='arrest'?'arrest':station===POLICE.stations[0]?'handoffFirst':'handoffSecond',film=POLICE_FILMS[vehicle]?.[key];return film&&typeof film.src==='string'&&film.src.startsWith('assets/media/')?film:null;}
