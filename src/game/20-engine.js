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
    { bg: '#c92a2a', a: '#ffe066', t1: 'شاي العروسة', t2: 'طعم الأصالة', ic: '☕' },
    { bg: '#123d8a', a: '#7dd3ff', t1: 'كولا أسيوط', t2: 'اسقع من الحر', ic: '🥤' },
    { bg: '#0f6b5c', a: '#a8ffd8', t1: 'مطعم بحري', t2: 'سمك طازة كل يوم', ic: '🐟' },
    { bg: '#2b1a5e', a: '#ffd34d', t1: 'تاكسي أسيوط', t2: 'أسطى في كل شارع', ic: '🚕' },
    { bg: '#7a3b00', a: '#ffe9b0', t1: 'كشري التحرير', t2: 'طبقك عندنا', ic: '🍲' },
  ];
  const ad = ads[i % ads.length];
  return canvasTex(512, 256, g => {
    const gr = g.createLinearGradient(0, 0, 512, 256);
    gr.addColorStop(0, ad.bg);
    gr.addColorStop(1, '#0a0f18');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = ad.a; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
    g.globalAlpha = .2; g.fillStyle = ad.a;
    g.beginPath(); g.arc(420, 128, 150, 0, 7); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = ad.a; g.font = '900 64px Cairo, Tahoma, Arial';
    g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText(ad.t1, 480, 96);
    g.fillStyle = '#ffffff'; g.font = '700 32px Cairo, Tahoma, Arial';
    g.fillText(ad.t2, 480, 158);
    g.font = '110px Arial'; g.textAlign = 'center';
    g.fillText(ad.ic, 96, 136);
  });
}
const BILLBOARD_TEXES = [0, 1, 2, 3, 4].map(billboardTex);
