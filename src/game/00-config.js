import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* =====================================================================
   تاكسي أسيوط — ALEXANDRIA TAXI
   لعبة 3D على كورنيش أسيوط وقت المغرب
   ===================================================================== */

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const fmt = n => Math.round(n).toLocaleString('en-US');
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/* =====================================================================
   إعدادات الرسوميات والإضاءة والبيئة (VISUAL_CONFIG)
   All visual, lighting & atmospheric parameters consolidated here for easy tweaking.
   ===================================================================== */
const VISUAL_CONFIG = {
  // Quality preset switchable at runtime: 'low' | 'medium' | 'high'
  preset: 'medium',

  // 1. الإضاءة والشمس (Mid-day Egyptian harsh sun)
  sun: {
    color: 0xfff8e6,             // Harsh bright warm-white sunlight
    intensity: 3.7,              // Strong direct illumination
    elevation: 58,               // Crisp afternoon-noon angle for rich building shadows
    azimuth: 135,                // Sun orientation along streets
    shadowExtent: 95,            // Wider crisp shadow box around player (~95m span)
    shadowNear: 5,
    shadowFar: 220,
    shadowBias: -0.00015,
    shadowNormalBias: 0.024,
    shadowRadius: 1.8            // Soft PCF filter radius
  },

  // 2. الإضاءة المحيطة وارتداد الضوء (Sky & Ground bounce)
  ambient: {
    color: 0xa89d8c,             // Warm desaturated dusty ambient
    intensity: 0.46
  },
  hemi: {
    skyColor: 0x4d8ac6,          // Egyptian clear sky blue
    groundColor: 0x967a5c,       // Warm sand / brick ground bounce
    intensity: 1.22
  },

  // 3. الضباب الجوي (غشاوة ترابية دافئة في الأفق كالصورة المرجعية)
  fog: {
    enabled: true,
    color: 0xd9cbb8,             // Light warm-beige haze (dusty distance)
    density: 0.00145,
    near: 120,
    far: 860
  },

  // 4. الرندرر وإدارة الألوان (Color Grading & Tone Mapping)
  color: {
    toneMapping: 'ACESFilmic',
    exposure: 1.10,              // Direct sunlight exposure level
    warmth: 1.05,                // Subtle warm tint
    saturation: 0.90,            // Muted, dusty desaturation (no neon greens)
    contrast: 1.04,              // Realistic sun contrast
    vignetteIntensity: 0.28      // Subtle cinematic edge darkening
  },

  // 5. السماء وانعكاسات البيئة (Sky Dome & Poly Haven style clear day HDRI reflections)
  sky: {
    zenithColor: 0x2462a6,       // Deep blue sky at zenith
    midColor: 0x5a94cc,          // Mid atmospheric clear blue
    horizonColor: 0xd6c6b2,      // Warm dusty desert horizon haze
    groundColor: 0x9e866e,       // Ground horizon dust
    sunDiskSize: 28,
    sunGlowOpacity: 0.45
  },

  // 6. خامات الطرق والأسفلت والأرصفة (PHASE 2: Roads and ground)
  road: {
    asphaltColor: 0xd6cdc0,      // Sun-baked dusty Egyptian asphalt tint
    asphaltRoughness: 0.94,      // High roughness (no plastic look)
    asphaltNormalScale: 1.45,    // Sharp relief for cracks and stones
    sidewalkColor: 0xc4baa8,     // PBR concrete paver stone tint
    sidewalkRoughness: 0.94,
    groundColor: 0xa29278,       // Sandy/dusty desert terrain
    curbStyle: 'black_white',    // Alternating Egyptian curb blocks
    wornMarkingsOpacity: 0.38,   // Subtle faded chipped lane markings
    dustAlongCurbs: true,        // Sand/dirt accumulation along curbs
    tarPatches: true,            // Bitumen asphalt repair patches
    oilStains: true,             // Engine oil drip stains in lanes
    manholes: true,              // Cast-iron utility covers
    cracks: true                 // Worn road stress cracks
  },

  // 7. ملفات الجودة للأجهزة المتوسطة والضعيفة (Switchable at runtime)
  presets: {
    low: {
      pixelRatio: 0.9,
      shadows: false,
      shadowMapSize: 512,
      vignette: false,
      colorGrading: false,
      bloom: false,
      fogDensity: 0.0021
    },
    medium: {
      pixelRatio: 1.0,
      shadows: true,
      shadowMapSize: 512,
      vignette: true,
      colorGrading: false,
      bloom: false,
      fogDensity: 0.00165
    },
    high: {
      pixelRatio: 1.35,
      shadows: true,
      shadowMapSize: 1024,
      vignette: true,
      colorGrading: true,
      bloom: true,
      fogDensity: 0.00135
    }
  }
};
if (typeof window !== 'undefined') {
  window.VISUAL_CONFIG = VISUAL_CONFIG;
}

/* ------------------------- ثوابت العالم ------------------------- */
const WORLD = 2400, HALF = WORLD / 2;
const ROAD_HALF = 16, WALK_W = 8;
const LANES = [4.2, 9.4, 14.2, -4.2, -9.4, -14.2];
const STOP_Z = 18.4;

const STOPS = [
  {x:-1000,name:'الوليدية'},
  {x:-860,name:'شارع الجامعة'},
  {x:-720,name:'شارع النميس'},
  {x:-580,name:'شارع الجمهورية'},
  {x:-440,name:'شارع الهلالي'},
  {x:-300,name:'ميدان المحطة'},
  {x:-160,name:'شارع يسري راغب'},
  {x:-20,name:'ميدان المنفذ'},
  {x:120,name:'شارع رياض'},
  {x:260,name:'ميدان الحرب والسلام'},
  {x:400,name:'شارع ثابت'},
  {x:540,name:'شارع ٢٦ يوليو'},
  {x:680,name:'شارع محمد علي مكارم'},
  {x:820,name:'شارع التحرير'},
  {x:960,name:'حي غرب أسيوط'}
];

/* ------------------------- الجراج: العربيات والترقيات ------------------------- */
const CARS = [];

const CAR_PAINTS = [
  { id: 'default', name: 'الأصلي', hex: null },
  { id: 'taxi', name: 'أصفر', hex: 0xf3c318 },
  { id: 'white', name: 'أبيض لؤلؤي', hex: 0xf2f4f7 },
  { id: 'red', name: 'أحمر ناري', hex: 0xd62828 },
  { id: 'blue', name: 'أزرق بحري', hex: 0x2274d6 },
  { id: 'emerald', name: 'أخضر زمردي', hex: 0x1b9c6e },
  { id: 'dark', name: 'أسود ملكي', hex: 0x1b1e26 },
  { id: 'gold', name: 'ذهبي', hex: 0xe8a317 },
];

const UPGRADES = [
  {
    id: 'engine', name: 'الموتور', emoji: '⚡', stat: 'topSpeed',
    levels: [
      { label: 'عادي', cost: 0, bonus: 0 },
      { label: 'معدّل', cost: 1200, bonus: 5 },
      { label: 'توربو', cost: 3500, bonus: 11 },
    ],
  },
  {
    id: 'brakes', name: 'الفرامل', emoji: '🛑', stat: 'brake',
    levels: [
      { label: 'عادية', cost: 0, bonus: 0 },
      { label: 'سيراميك', cost: 800, bonus: 6 },
      { label: 'ريسنج', cost: 2200, bonus: 14 },
    ],
  },
  {
    id: 'tires', name: 'الكاوتش', emoji: '🛞', stat: 'grip',
    levels: [
      { label: 'عادي', cost: 0, bonus: 0 },
      { label: 'رياضي', cost: 900, bonus: 1.8 },
      { label: 'سليكس', cost: 2500, bonus: 3.8 },
    ],
  },
  {
    id: 'suspension', name: 'المساعدين', emoji: '🔧', stat: 'steer',
    levels: [
      { label: 'عادي', cost: 0, bonus: 0 },
      { label: 'رياضي', cost: 1000, bonus: .3 },
      { label: 'بروفيشنال', cost: 2800, bonus: .65 },
    ],
  },
];

/* ------------------------- أنواع الزباين والحوارات ------------------------- */
const PASSENGER_TYPES = [
  {
    id: 'student', name: 'طالب جامعة', icon: '🎓', shirt: 0x2f9fb3,
    fareMul: .85, tipBonus: .42, timeMul: 1.0,
    greet: ['بسرعة يا أسطى المحاضرة هتبدأ!', 'صباح الفل يا هندسة، مستعجلين شوية'],
    bye: ['تسلم إيدك يا أسطى!', 'مية مية، خد البقشيش ده'],
  },
  {
    id: 'biz', name: 'رجل أعمال', icon: '💼', shirt: 0x263244,
    fareMul: 1.45, tipBonus: .35, timeMul: .78,
    greet: ['عندي ميتنج مهم… طير بينا!', 'وقتي بفلوس يا كابتن، أسرع طريق لو سمحت'],
    bye: ['شغل محترف، برافو عليك', 'مواعيدك مظبوطة، اتفضل حسابك'],
  },
  {
    id: 'tourist', name: 'سايح', icon: '📸', shirt: 0xe88d2a,
    fareMul: 1.35, tipBonus: .45, timeMul: 1.25,
    greet: ['أسيوط جميلة أوي! سوق براحتك خلينا نتفرج', 'أحلى هواء على الكورنيش! يلا بينا'],
    bye: ['رحلة تحفة! شكراً يا أسطى', 'أحلى مشوار في أسيوط'],
  },
  {
    id: 'local', name: 'ابن البلد', icon: '🛍️', shirt: 0x3f8f6b,
    fareMul: 1.05, tipBonus: .28, timeMul: 1.05,
    greet: ['على مهلك في المطبات يا ابني الله يباركلك', 'الله ينوّر يا أسطى، شغلنا الراديو'],
    bye: ['ربنا يوسع رزقك يا أسطى', 'وصلنا بالسلامة، تسلم يا بطل'],
  },
  {
    id: 'vip', name: 'زبون VIP', icon: '🌟', shirt: 0x7b3fa0,
    fareMul: 1.75, tipBonus: .5, timeMul: .88,
    greet: ['دوس بنزين ومالكش دعوة بالعدّاد!', 'عايز سواقة نضيفة وسريعة يا نجم'],
    bye: ['أنت فعلاً أسطورة الكورنيش!', 'أحسن تاكسي ركبته في حياتي'],
  },
];

/* ------------------------- الطقس ------------------------- */
const WEATHERS = [
  { id: 'clear', name: 'صحو', icon: '☀️', fareBonus: 1.0 },
  { id: 'rain', name: 'مطر', icon: '🌧️', fareBonus: 1.25 },
  { id: 'fog', name: 'شبورة', icon: '🌫️', fareBonus: 1.15 },
];

/* ------------------------- الإنجازات ------------------------- */
const ACHIEVEMENTS = [
  { id: 'first_trip', name: 'بسم الله نبدأ', desc: 'وصّل أول زبون ليك', icon: '🚕', reward: 200 },
  { id: 'trips_10', name: 'أسطى الشوارع', desc: 'كمّل 10 مشاوير', icon: '⭐', reward: 800 },
  { id: 'trips_25', name: 'ملك الكورنيش', desc: 'كمّل 25 مشوار', icon: '👑', reward: 2500 },
  { id: 'combo_5', name: 'سواقة نضيفة', desc: 'اوصل لكومبو 5 مشاوير ورا بعض بدون خبطات', icon: '🔥', reward: 1000 },
  { id: 'rich_10k', name: 'صاحب رأس مال', desc: 'وصّل رصيدك لـ 10,000 ج.م', icon: '💰', reward: 1500 },
  { id: 'buy_car', name: 'مبروك الزيرو', desc: 'اشتري عربية جديدة من الجراج', icon: '🔑', reward: 600 },
  { id: 'max_upg', name: 'تعديل احترافي', desc: 'رقّي أي قطعة لأقصى مستوى', icon: '🔧', reward: 700 },
  { id: 'rain_trip', name: 'سواق المطر', desc: 'وصّل زبون وقت المطر', icon: '🌧️', reward: 500 },
  { id: 'beat_boss', name: 'غلب الزعيم', desc: 'اكسب تحدي الزعيم', icon: '🏆', reward: 1200 },
  { id: 'win_race', name: 'بطل السباق', desc: 'خلّص سباق الكورنيش', icon: '🏁', reward: 1000 },
];
