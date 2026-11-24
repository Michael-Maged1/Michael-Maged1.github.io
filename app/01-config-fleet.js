
/* ========================= 00-config.js ========================= */

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

  // 7. ملفات الجودة للأجهزة المتوسطة (Switchable at runtime)
  presets: {
    low: {
      pixelRatio: 1.0,
      shadows: false,
      shadowMapSize: 512,
      vignette: true,
      colorGrading: true,
      bloom: false,
      fogDensity: 0.0018
    },
    medium: {
      pixelRatio: 1.25,
      shadows: true,
      shadowMapSize: 1024,
      vignette: true,
      colorGrading: true,
      bloom: false,
      fogDensity: 0.00145
    },
    high: {
      pixelRatio: 1.5,
      shadows: true,
      shadowMapSize: 2048,
      vignette: true,
      colorGrading: true,
      bloom: true,
      fogDensity: 0.0013
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

/* ========================= 01-uploaded-fleet.js ========================= */
/* User-provided assets; original creator metadata and licenses remain attached. */
const UPLOADED_MODELS={"qashqai":{"file":"upload-qashqai.glb","trafficFile":"upload-qashqai-traffic.glb","length":4.425,"paint":["carpaint_white"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2024-nissan-qashqai-glory-3d26c0e62eaa46f1bbead9f3073540b3","title":"2024 Nissan Qashqai Glory"},"eye":[-0.1,1.28,-0.37],"wheels":[{"name":"Wheel_FL","position":[1.2855697870254517,0.8010925054550171,0.34544262290000916]},{"name":"Wheel_FR","position":[1.2847360372543335,-0.8010861277580261,0.34544333815574646]},{"name":"Wheel_RL","position":[-1.3870292901992798,0.8010877370834351,0.34544259309768677]},{"name":"Wheel_RR","position":[-1.3871852159500122,-0.801089882850647,0.34544333815574646]}]},"roadster":{"file":"upload-roadster.glb","trafficFile":"upload-roadster-traffic.glb","length":4.25,"paint":["GEOMETRYcarskin_skin2"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2010-nissan-370z-roadster-dcb6c0e14751480997564a817e17da84","title":"2010 Nissan 370Z Roadster"},"eye":[-0.05,1.14,-0.34],"wheels":[{"name":"Wheel_FL","position":[1.2900736331939697,0.7504969835281372,0.36253246665000916]},{"name":"Wheel_FR","position":[1.2900731563568115,-0.7507287263870239,0.36253246665000916]},{"name":"Wheel_RL","position":[-1.263028621673584,0.7655103206634521,0.36253246665000916]},{"name":"Wheel_RR","position":[-1.2630289793014526,-0.765846848487854,0.36253246665000916]}]},"micra":{"file":"upload-micra.glb","trafficFile":"upload-micra-traffic.glb","length":3.715,"paint":["Paint1"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2004-nissan-march-micra-12-k12-117a4b23752a4659bf6db90522c4b262","title":"2004 Nissan March / Micra 1.2 K12"},"eye":[-0.1,1.18,-0.31],"wheels":[{"name":"Wheel_FL","position":[1.161912441253662,0.6421934366226196,0.3393699526786804]},{"name":"Wheel_FR","position":[1.161912202835083,-0.6421938538551331,0.3393699526786804]},{"name":"Wheel_RL","position":[-1.2713805437088013,0.6431899666786194,0.3336099684238434]},{"name":"Wheel_RR","position":[-1.2713806629180908,-0.6431900262832642,0.3336099684238434]}]},"sentra18":{"file":"upload-sentra18.glb","trafficFile":"upload-sentra18-traffic.glb","length":4.625,"paint":["Paint_MAT"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2018-nissan-sentra-sylphy-sl-e8d8321daf184fe58e41509964d61141","title":"2018 Nissan Sentra Sylphy SL"},"eye":[0.15,1.18,-0.36],"wheels":[{"name":"Wheel_FL","position":[1.4053168296813965,0.758351743221283,0.32120031118392944]},{"name":"Wheel_FR","position":[1.4057741165161133,-0.7562839388847351,0.32120031118392944]},{"name":"Wheel_RL","position":[-1.3026022911071777,0.7584114074707031,0.32120031118392944]},{"name":"Wheel_RR","position":[-1.302145004272461,-0.7562837600708008,0.32120031118392944]}]},"sport370":{"file":"upload-sport370.glb","trafficFile":"upload-sport370-traffic.glb","length":4.265,"paint":["20MI_1014010001_002"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2020-nissan-370z-sport-touring-16a10e686dcd4fe3942f904a1879c0e3","title":"2020 Nissan 370Z Sport Touring"},"eye":[-0.1,1.04,-0.34],"wheels":[{"name":"Wheel_FL","position":[1.2606370449066162,0.7781807780265808,0.3410058319568634]},{"name":"Wheel_FR","position":[1.2602715492248535,-0.7796618342399597,0.34055885672569275]},{"name":"Wheel_RL","position":[-1.3059582710266113,0.780010461807251,0.33984801173210144]},{"name":"Wheel_RR","position":[-1.3054771423339844,-0.7802006006240845,0.33984705805778503]}]},"epower":{"file":"upload-epower.glb","trafficFile":"upload-epower-traffic.glb","length":4.649,"paint":["orange14"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2021-nissan-sentra-sylphy-epower-92a9cabd5ae94cf1a745748652501307","title":"2021 Nissan Sentra Sylphy ePower"},"eye":[-0.1,1.15,-0.37],"wheels":[{"name":"Wheel_FL","position":[1.4003708362579346,0.7991044521331787,0.3346634805202484]},{"name":"Wheel_FR","position":[1.400370478630066,-0.7976799607276917,0.33466339111328125]},{"name":"Wheel_RL","position":[-1.302577257156372,0.7991046905517578,0.33388927578926086]},{"name":"Wheel_RR","position":[-1.3025774955749512,-0.7976799011230469,0.3338892161846161]}]},"versa":{"file":"upload-versa.glb","trafficFile":"upload-versa-traffic.glb","length":4.455,"paint":["Nissan_Versa__Mk2f___B17__sedan_Sense_HQinterior_2015carpaint1"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2015-nissan-versa-sedan-16-18af87c9490e4acb80a46b70ca8d86ed","title":"2015 Nissan Versa Sedan 1.6"},"eye":[0.15,1.18,-0.35],"wheels":[{"name":"Wheel_FL","position":[1.377472162246704,0.7340862154960632,0.29953235387802124]},{"name":"Wheel_FR","position":[1.3774685859680176,-0.7325552105903625,0.2995428740978241]},{"name":"Wheel_RL","position":[-1.202158808708191,0.7334045171737671,0.2995307445526123]},{"name":"Wheel_RR","position":[-1.2015469074249268,-0.7352414131164551,0.3015750050544739]}]},"xtrail":{"file":"upload-xtrail.glb","trafficFile":"upload-xtrail-traffic.glb","length":4.68,"paint":["Car_Paint"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)","source":"https://sketchfab.com/3d-models/2023-nissan-x-trail-4x4-i-f9f2cbdacac74ee7acfe1c731195ccaa","title":"2023 Nissan X-Trail 4x4-i"},"eye":[-0.1,1.37,-0.39],"wheels":[{"name":"Wheel_FL","position":[1.4016565084457397,0.7666177749633789,0.3669769763946533]},{"name":"Wheel_FR","position":[1.3834600448608398,-0.7666180729866028,0.36705660820007324]},{"name":"Wheel_RL","position":[-1.312670111656189,0.7666178345680237,0.3669769763946533]},{"name":"Wheel_RR","position":[-1.331043004989624,-0.766618013381958,0.36716189980506897]}]},"altima":{"file":"upload-altima.glb","trafficFile":"upload-altima-traffic.glb","length":4.9,"paint":["silver_altima1"],"normalized":true,"source":{"author":"Ddiaz Design (https://sketchfab.com/ddiaz-design)","license":"CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)","source":"https://sketchfab.com/3d-models/2023-nissan-altima-teana-5370d8f6b81a41a89eabfa1b91fc7160","title":"2023 Nissan Altima / Teana"},"eye":[-0.1,1.17,-0.38],"wheels":[{"name":"Wheel_FL","position":[1.4813703298568726,0.8022772669792175,0.3385041654109955]},{"name":"Wheel_FR","position":[1.4769315719604492,-0.8023136258125305,0.33948102593421936]},{"name":"Wheel_RL","position":[-1.3161413669586182,0.8023135662078857,0.33911773562431335]},{"name":"Wheel_RR","position":[-1.3192040920257568,-0.8022773265838623,0.3381408452987671]}]},"fiat1300":{"file":"upload-fiat1300.glb","trafficFile":"upload-fiat1300-traffic.glb","length":4.03,"paint":["Paint_Metallic_Orange_peel_Cream"],"normalized":true,"source":{"author":"3DDomino (https://sketchfab.com/3DDomino)","license":"CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)","source":"https://sketchfab.com/3d-models/fiat-1300-774522f085b541faa6300d3d04f9f0dd","title":"Fiat 1300"},"eye":[-0.1,1.15,-0.31],"wheels":[{"name":"Wheel_FL","position":[1.317914366722107,0.6143277287483215,0.3305942714214325]},{"name":"Wheel_FR","position":[1.3186945915222168,-0.6150343418121338,0.33064374327659607]},{"name":"Wheel_RL","position":[-1.0617624521255493,0.6135765314102173,0.354707270860672]},{"name":"Wheel_RR","position":[-1.0621134042739868,-0.6136786341667175,0.3541952669620514]}]}};
const UPLOADED_CAR_DEFINITIONS=[{"id":"qashqai","name":"نيسان قشقاي Glory 2024","emoji":"🚙","body":"modern","asset":"qashqai","available":true,"uploaded":true,"desc":"كروس أوفر رحبة · ثبات وراحة في مشاوير المدينة.","price":0,"topSpeed":42,"accel":15,"brake":27,"grip":8.8,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1440,"wheelbase":2.646,"length":4.425,"halfWidth":0.92,"eye":[-0.1,1.28,-0.37]},{"id":"roadster","name":"نيسان 370Z رودستر 2010","emoji":"🚘","body":"modern","asset":"roadster","available":true,"uploaded":true,"desc":"رودستر مكشوفة · سيارة رياضية بمقعدين.","price":16500,"topSpeed":51,"accel":21,"brake":32,"grip":10,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1550,"wheelbase":2.55,"length":4.25,"halfWidth":0.92,"eye":[-0.05,1.14,-0.34]},{"id":"micra","name":"نيسان ميكرا K12 2004","emoji":"🚘","body":"modern","asset":"micra","available":true,"uploaded":true,"desc":"هاتشباك اقتصادية · سهلة في الشوارع الضيقة.","price":2300,"topSpeed":33,"accel":12,"brake":27,"grip":8.8,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1000,"wheelbase":2.43,"length":3.715,"halfWidth":0.83,"eye":[-0.1,1.18,-0.31]},{"id":"sentra18","name":"نيسان سنترا SL 2018","emoji":"🚘","body":"modern","asset":"sentra18","available":true,"uploaded":true,"desc":"سيدان عملية · أربع أبواب ومقصورة مريحة.","price":7200,"topSpeed":42,"accel":16,"brake":32,"grip":8.8,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1350,"wheelbase":2.7,"length":4.625,"halfWidth":0.9,"eye":[0.15,1.18,-0.36]},{"id":"sport370","name":"نيسان 370Z سبورت 2020","emoji":"🚘","body":"modern","asset":"sport370","available":true,"uploaded":true,"desc":"كوبيه رياضية · تسارع قوي وثبات.","price":21000,"topSpeed":55,"accel":24,"brake":32,"grip":10,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1535,"wheelbase":2.55,"length":4.265,"halfWidth":0.93,"eye":[-0.1,1.04,-0.34]},{"id":"epower","name":"نيسان سيلفي ePower 2021","emoji":"🚘","body":"modern","asset":"epower","available":true,"uploaded":true,"desc":"سيدان ePower · استجابة سريعة للمشاوير.","price":11200,"topSpeed":43,"accel":18,"brake":32,"grip":10,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1480,"wheelbase":2.712,"length":4.649,"halfWidth":0.91,"eye":[-0.1,1.15,-0.37]},{"id":"versa","name":"نيسان فيرسا 1.6 2015","emoji":"🚘","body":"modern","asset":"versa","available":true,"uploaded":true,"desc":"سيدان اقتصادية · مناسبة للمشاوير اليومية.","price":5800,"topSpeed":38,"accel":14,"brake":27,"grip":8.8,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1130,"wheelbase":2.6,"length":4.455,"halfWidth":0.85,"eye":[0.15,1.18,-0.35]},{"id":"xtrail","name":"نيسان X-Trail 4×4 2023","emoji":"🚙","body":"modern","asset":"xtrail","available":true,"uploaded":true,"desc":"SUV عائلية · جلوس مرتفع ومساحة رحبة.","price":17800,"topSpeed":46,"accel":18,"brake":32,"grip":10,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1650,"wheelbase":2.705,"length":4.68,"halfWidth":0.94,"eye":[-0.1,1.37,-0.39]},{"id":"altima","name":"نيسان ألتيما 2023","emoji":"🚘","body":"modern","asset":"altima","available":true,"uploaded":true,"desc":"سيدان رحبة · راحة وقوة للمشاوير الطويلة.","price":14500,"topSpeed":47,"accel":19,"brake":32,"grip":10,"steer":2.2,"color1":13817302,"color2":1514528,"mass":1530,"wheelbase":2.825,"length":4.9,"halfWidth":0.93,"eye":[-0.1,1.17,-0.38]},{"id":"fiat1300","name":"فيات 1300 كلاسيك","emoji":"🚘","body":"modern","asset":"fiat1300","available":true,"uploaded":true,"desc":"كلاسيك من الستينيات · قيادة بسيطة واقتصادية.","price":1800,"topSpeed":30,"accel":10,"brake":27,"grip":8.8,"steer":2.2,"color1":13817302,"color2":1514528,"mass":980,"wheelbase":2.425,"length":4.03,"halfWidth":0.81,"eye":[-0.1,1.15,-0.31]},{"id":"hiace","name":"ميكروباص تويوتا هايس","emoji":"🚐","body":"micro","asset":"traffic_hiace","available":true,"uploaded":false,"desc":"ميكروباص أسيوط الأبيض السريع · 14 راكب وسرعة وثبات.","price":3500,"topSpeed":44,"accel":15,"brake":29,"grip":9.2,"steer":2.1,"color1":16777215,"color2":1118481,"mass":1950,"wheelbase":2.98,"length":5.15,"halfWidth":0.96,"eye":[-0.1,1.52,-0.42]}];
for(const car of UPLOADED_CAR_DEFINITIONS){const old=CARS.find(c=>c.id===car.id);if(old)Object.assign(old,car);else CARS.push(car);}

/* ========================= 03-police-car.js ========================= */
/* User-provided cruiser; Original uploaded Sheriff Cruiser appearance retained. */
UPLOADED_MODELS.policeSuburban={"file": "upload-policeSuburban.glb", "trafficFile": "upload-policeSuburban-traffic.glb", "length": 5.7, "paint": [], "source": {"author": "Mateusz Woliński (https://sketchfab.com/jeandiz)", "license": "CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)", "source": "https://sketchfab.com/3d-models/suburban-sheriff-cruiser-116f6a42deb04fd8942e6c632e37901f", "title": "Suburban Sheriff Cruiser"}, "normalized": true, "eye": [0.08, 1.48, -0.39], "wheels": []};
CARS.push({"id": "policeSuburban", "name": "شيفروليه سوبربان · دورية شرطة", "emoji": "🚓", "body": "modern", "asset": "policeSuburban", "uploaded": true, "police": true, "available": true, "price": 0, "desc": "Suburban Sheriff Cruiser بالمظهر الأصلي للنموذج المرفق.", "topSpeed": 43, "accel": 16, "brake": 34, "grip": 9.8, "steer": 2.2, "color1": 15856365, "color2": 1319992, "mass": 2500, "wheelbase": 3.3, "length": 5.7, "halfWidth": 1.03, "eye": [0.08, 1.48, -0.39]});

/* ========================= 04-police-bmw.js ========================= */
/* Bundled BMW 320i xDrive Police from user's supplied GLB, keeping original livery & details. */
UPLOADED_MODELS.policeBMW = {"file": "upload-policeBMW.glb", "trafficFile": "upload-policeBMW-traffic.glb", "length": 4.71, "paint": [], "source": {"author": "solid3DDD (https://sketchfab.com/solid3ddd)", "license": "CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)", "source": "https://sketchfab.com/3d-models/bmw-320i-police", "title": "BMW 320i Police"}, "normalized": true, "preserveAppearance": true, "police": true, "eye": [0.1, 1.14, -0.37], "wheels": []};
CARS.push({"id": "policeBMW", "name": "BMW 320i Police", "emoji": "🚓", "body": "modern", "asset": "policeBMW", "uploaded": true, "police": true, "available": true, "price": 0, "desc": "BMW 320i xDrive Police بالمظهر والكسوة الأصليين عالية الدقة.", "topSpeed": 58, "accel": 21, "brake": 37, "grip": 10.2, "steer": 2.4, "color1": 16777215, "color2": 1452356, "mass": 1600, "wheelbase": 2.85, "length": 4.71, "halfWidth": 0.92, "eye": [0.1, 1.14, -0.37]});

/* ========================= 05-police-duster.js ========================= */
/* Converted from the user-supplied USDZ; original livery and proportions retained. */
UPLOADED_MODELS.policeDuster={"file": "upload-policeDuster.glb", "trafficFile": "upload-policeDuster-traffic.glb", "length": 4.315, "paint": [], "source": {"author": "solid3DDD (https://sketchfab.com/solid3ddd)", "license": "CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)", "source": "https://sketchfab.com/3d-models/daciarenault-duster-politia-high-poly-model-8f49fb8ed805454e92293b2a4b7b3233", "title": "Dacia/Renault Duster Politia - High-poly Model", "modifications": "Converted from user-provided USDZ with original paint maps, UVs and materials; uniform scale, orientation, geometry detail budgets, four separated wheel pivots; lossless WebP for packed material channels, Meshopt compression."}, "normalized": true, "preserveAppearance": true, "police": true, "eye": [0.35, 1.25, -0.36], "wheels": []};
CARS.push({"id": "policeDuster", "name": "Dacia / Renault Duster Police", "emoji": "🚓", "body": "modern", "asset": "policeDuster", "uploaded": true, "police": true, "available": true, "price": 0, "desc": "موديل USDZ المرفق، بكسوته وتصميمه الأصليين.", "topSpeed": 44, "accel": 17, "brake": 35, "grip": 9.8, "steer": 2.3, "color1": 16777215, "color2": 1669441, "mass": 1450, "wheelbase": 2.67, "length": 4.315, "halfWidth": 0.96, "eye": [0.35, 1.25, -0.36]});

/* ========================= 10-map.js ========================= */
/* ------------------------- شبكة شوارع المدينة ------------------------- */
const CITY_Z1 = 286;                 // آخر المدينة من ناحية القبلة
const H_STREETS = [
  { z: 0,   half: ROAD_HALF, kind: 'corniche' },   // الكورنيش
  { z: 64,  half: 5.5, kind: 'narrow' },           // شارع ضيق
  { z: 140, half: 11,  kind: 'wide' },             // شارع واسع
  { z: 210, half: 5,   kind: 'narrow' },           // شارع ضيق
  { z: 274, half: 12,  kind: 'wide' },             // شارع واسع
];
const V_STREETS = [];
for (let x = -1080; x <= 1080; x += 120) {
  const wide = Math.abs(x) % 480 === 0;
  V_STREETS.push({ x, half: wide ? 12 : 6, kind: wide ? 'wide' : 'narrow' });
}

const MAP = {
  buildings: [],   // {x0,x1,z0,z1,h}
  streets: [],
  alleys: [],
  places: [],      // أماكن الزباين
};
const WALK_IN = 3.6, ALLEY_W = 7;

for (const h of H_STREETS) {
  MAP.streets.push({ axis: 'x', c: h.z, half: h.half, from: -HALF, to: HALF, kind: h.kind });
}
for (const v of V_STREETS) {
  MAP.streets.push({ axis: 'z', c: v.x, half: v.half, from: 16, to: CITY_Z1, kind: v.kind });
}

/* بلوكات المدينة بين الشوارع */
const BLOCKS = [];
for (let i = 0; i < V_STREETS.length - 1; i++) {
  const a = V_STREETS[i], b = V_STREETS[i + 1];
  const x0 = a.x + a.half, x1 = b.x - b.half;
  for (let j = 0; j < H_STREETS.length - 1; j++) {
    const h0 = H_STREETS[j], h1 = H_STREETS[j + 1];
    BLOCKS.push({ x0, x1, z0: h0.z + h0.half, z1: h1.z - h1.half, band: j });
  }
}

/* أماكن داخل المدينة — على الشوارع وفي الحارات الضيقة */
const INLAND_PLACES = [
  // شارع ضيق (الشارع الأول جوه البلد) — الزبون واقف على الرصيف
  { x: -840, z: 57.0, name: 'شارع النميس' },
  { x: -240, z: 57.0, name: 'شارع الجمهورية' },
  { x: 360,  z: 57.0, name: 'ميدان المنفذ' },
  { x: 840,  z: 57.0, name: 'شارع الهلالي' },
  // شارع واسع
  { x: -720, z: 127.2, name: 'شارع يسري راغب' },
  { x: 0,    z: 127.2, name: 'ميدان المحطة' },
  { x: 720,  z: 127.2, name: 'شارع رياض' },
  // شارع ضيق تاني
  { x: -480, z: 203.6, name: 'شارع ثابت' },
  { x: 240,  z: 203.6, name: 'شارع ٢٦ يوليو' },
  { x: 960,  z: 203.6, name: 'منطقة المجاهدين' },
  // أوسع شارع في المدينة
  { x: -960, z: 260.4, name: 'حي غرب أسيوط' },
  { x: -120, z: 260.4, name: 'حي شرق أسيوط' },
  { x: 600,  z: 260.4, name: 'حي الوليدية' },
  // حارات ضيقة (بين البلوكات) — الزبون على جنب الحارة
  { x: 540,  z: 101.9, name: 'حارة متفرعة من النميس' },
  { x: -540, z: 180.7, name: 'حارة شارع رياض' },
  { x: 63,   z: 241.2, name: 'حارة شارع الهلالي' },
];

const PLACES = [
  ...STOPS.map(s => ({ x: s.x, z: STOP_Z, name: s.name })),
  { x: -180, z: STOP_Z, name: 'جامعة أسيوط' },
  { x: -380, z: STOP_Z, name: 'كوبري الهلالي' },
  { x: 340,  z: STOP_Z, name: 'محطة قطارات أسيوط' },
  ...INLAND_PLACES,
];
MAP.places = PLACES;

/* Shared visible and collidable curb segments. */
const CURB_SEGMENTS = [];
function buildCurbSegments(){
  CURB_SEGMENTS.length=0;
  const cutsX = V_STREETS.map(v => [v.x - v.half - .3, v.x + v.half + .3]);
  const cutsZ = [...H_STREETS.map(h => [h.z - h.half - .3, h.z + h.half + .3]),...MAP.alleys.map(a=>[a.z0-.3,a.z1+.3])].sort((a,b)=>a[0]-b[0]);

  const pushSeg = (axis, line, from, to, cuts) => {
    let start = from;
    for (const [a, b] of cuts) {
      if (b <= start) continue;
      if (a >= to) break;
      if (a > start) CURB_SEGMENTS.push({ axis, line, a: start, b: Math.min(a, to) });
      start = Math.max(start, b);
    }
    if (start < to) CURB_SEGMENTS.push({ axis, line, a: start, b: to });
  };

  const corridors=[...MAP.streets,...MAP.alleys.map(a=>({axis:'x',c:(a.z0+a.z1)/2,half:(a.z1-a.z0)/2,from:a.x0,to:a.x1}))];
  for (const st of corridors) {
    if (st.axis === 'x') {
      for (const s of [-1, 1]) pushSeg('z', st.c + s * st.half, st.from, st.to, cutsX);
    } else {
      for (const s of [-1, 1]) pushSeg('x', st.c + s * st.half, st.from, st.to, cutsZ);
    }
  }
}


buildCurbSegments();

const ROAD_FURNITURE=[];
function onDrivingRoad(x,z,margin=.65){
 if(typeof ASSYUT!=='undefined'){const p=nearestAssyutRoad({x,z});return p&&p.distance<p.width/2+margin;}
 for(const st of MAP.streets){const along=st.axis==='x'?x:z,across=st.axis==='x'?z:x;if(along>=st.from-margin&&along<=st.to+margin&&Math.abs(across-st.c)<st.half+margin)return true;}
 return MAP.alleys.some(a=>x>a.x0-margin&&x<a.x1+margin&&z>a.z0-margin&&z<a.z1+margin);
}
