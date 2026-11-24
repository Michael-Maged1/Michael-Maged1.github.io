
/* ========================= 70-state.js ========================= */
/* =====================================================================
   حالة اللعبة
   ===================================================================== */
let MAXSPEED = 36;

/* التخزين المحلي بشكل آمن (بيشتغل حتى لو المتصفح مانع التخزين) */
const store = {
  get(k, d = '0') {
    try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, String(v)); } catch { /* تجاهل */ }
  },
  json(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch { return d; }
  },
};

const car = {
  x: ASSYUT.start.x, z: ASSYUT.start.z, heading: ASSYUT.start.heading, speed: 0, steer: 0,
  vel: new THREE.Vector2(), shake: 0, hitCd: 0,
  y: 0, vy: 0, pitch: 0, roll: 0, bumpCd: 0, curbCd: 0, curbBlock: 0,
  redWait: 0, redFineCd: 0, yawRate: 0, wheelAngle: 0, reverseHold: 0, longAccel: 0, lateralAccel: 0,
};

car.y=assyutRoadHeightAt(car.x,car.z);

/* إعدادات اللعبة الافتراضية الموحدة — تبدأ نظيفة لكل لاعب جديد ولا تفرض إعدادات من جهاز لآخر */
function getDeviceClockMinutes() {
  if (typeof navigator !== 'undefined' && navigator.userAgent === 'test') return 12 * 60;
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

const DEFAULT_SETTINGS = {
  graphicsQuality: 'balanced', // 'perf' (سلس 60+ فريم) | 'balanced' (متوازن) | 'high' (عالي)
  sound: true,
  music: true,
  camMode: 0,
  clock: getDeviceClockMinutes(),
  weather: 'clear',
  dynWeather: true,
  cycle: true,
};

const G = {
  state: 'menu',
  mode: 'rides',
  graphicsQuality: store.get('assyut_graphics_quality', DEFAULT_SETTINGS.graphicsQuality) || 'balanced',
  money: +store.get('alex_taxi_money'),
  xp: +store.get('alex_taxi_xp'),
  trips: +store.get('alex_taxi_trips'),
  branch: +store.get('alex_taxi_branch'),
  bestRace: +store.get('alex_taxi_best'),
  bestSurvival: +store.get('alex_taxi_best_surv'),
  combo: 0,
  // البداية حسب التوقيت الحقيقي على جهاز المستخدم
  clock: getDeviceClockMinutes(),
  cycle: true,
  timeRate: 1.2,
  timeSpeed: 2.4,
  weather: store.get('alex_taxi_weather', DEFAULT_SETTINGS.weather) || DEFAULT_SETTINGS.weather,
  dynWeather: true,
  weatherTimer: 95,
  sound: store.get('alex_taxi_sound', DEFAULT_SETTINGS.sound ? '1' : '0') !== '0',
  music: store.get('alex_taxi_music', DEFAULT_SETTINGS.music ? '1' : '0') !== '0',
  station: +store.get('alex_taxi_station') || 0,
  carIdx: clamp(+store.get('alex_taxi_car') || 0, 0, CARS.length - 1),
  owned: store.json('alex_taxi_owned', ['classic']),
  upgrades: store.json('alex_taxi_upgrades', {}),
  paints: store.json('alex_taxi_paints', { qashqai: 0x16181b, altima: 0x16181b }),
  achievements: store.json('alex_taxi_ach', []),
  conditions: store.json('alex_driver_conditions', {}),
  totalEarned: Math.max(0,+store.get('alex_driver_earned','0')||0),
  ratingTotal: Math.max(0,+store.get('alex_driver_rating_total','0')||0),
  ratedTrips: Math.max(0,+store.get('alex_driver_rated','0')||0),
  fuel: clamp(+store.get('assyut_fuel','100')||100, 15, 100),
  dailyCleanTrips: 0,
  dailyBonusClaimed: false,
  camMode: 0,
  menuT: 0,
  hudT: 0,
};

function resetSettingsToDefault() {
  G.graphicsQuality = DEFAULT_SETTINGS.graphicsQuality;
  G.sound = DEFAULT_SETTINGS.sound;
  G.music = DEFAULT_SETTINGS.music;
  G.camMode = DEFAULT_SETTINGS.camMode;
  G.clock = DEFAULT_SETTINGS.clock;
  G.weather = DEFAULT_SETTINGS.weather;
  G.dynWeather = DEFAULT_SETTINGS.dynWeather;
  G.cycle = DEFAULT_SETTINGS.cycle;

  store.set('assyut_graphics_quality', G.graphicsQuality);
  store.set('alex_taxi_sound', G.sound ? '1' : '0');
  store.set('alex_taxi_music', G.music ? '1' : '0');
  store.set('alex_taxi_cam', G.camMode);
  store.set('alex_taxi_clock', G.clock);
  store.set('alex_taxi_weather', G.weather);
  store.set('alex_taxi_dynw', '1');
  store.set('alex_taxi_cycle', '1');

  if (typeof applyGraphicsSettings === 'function') applyGraphicsSettings(G.graphicsQuality);
  if (typeof setSound === 'function') setSound(G.sound);
  if (typeof setMusic === 'function') setMusic(G.music);
  if (typeof setCamMode === 'function') setCamMode(G.camMode);
  if (typeof updateHUD === 'function') updateHUD();
}

// ترحيل مرة واحدة من النسخة التي كانت تبدأ عند الغروب، حتى لا تظل جلسة
// قديمة محفوظة على 18:30 بعد تحديث اللعبة.
if(store.get('alex_taxi_daylight_default','0')!=='1'){
 G.clock=getDeviceClockMinutes();
 store.set('alex_taxi_clock',Math.round(G.clock));
 store.set('alex_taxi_daylight_default','1');
}

const fleetAliases={classic:'qashqai',sunny:'qashqai',modern:'qashqai',azera:'qashqai',sentra:'sentra18',linea:'versa',bmw:'altima',tucson:'xtrail',micro:'qashqai',sport:'sport370'};
const allowedCars=new Set(CARS.map(c=>c.id));
G.owned=[...new Set(['qashqai',...(Array.isArray(G.owned)?G.owned:[]).map(id=>fleetAliases[id]||id).filter(id=>allowedCars.has(id))])];
for(const key of ['upgrades','paints','conditions'])if(!G[key]||typeof G[key]!=='object'||Array.isArray(G[key]))G[key]={};
if(store.get('alex_driver_version','0')!=='1'){
 for(const [old,id] of Object.entries(fleetAliases)){
  if(G.upgrades[old]&&!G.upgrades[id])G.upgrades[id]=G.upgrades[old];
 }
 G.carIdx=0;store.set('alex_taxi_car',0);store.set('alex_driver_version','1');
}
if(!G.owned.includes(CARS[G.carIdx]?.id))G.carIdx=0;
for(const c of CARS)G.conditions[c.id]=Number.isFinite(G.conditions[c.id])?clamp(G.conditions[c.id],0,100):100;
if(!Array.isArray(G.achievements))G.achievements=[];
if(CARS[G.carIdx]?.available===false)G.carIdx=0;
// Grant the requested main car once while preserving cash, owned vehicles and later selections.
if(!G.owned.includes('qashqai'))G.owned.push('qashqai');
if(store.get('assyut_uploaded_fleet_v1','0')!=='1'){
 G.carIdx=CARS.findIndex(c=>c.id==='qashqai');store.set('alex_taxi_car',G.carIdx);store.set('assyut_uploaded_fleet_v1','1');
}
stateReady = true;

const M = {
  phase: 'none',
  pickupX: 0, pickupZ: 0, pickupName: '',
  destX: 0, destZ: 0, destName: '',
  pType: null, hits: 0,
  baseFare: 0, fare: 0, tripTime: 0, timer: 0,
  boss: false, hold: 0, respawn: 0, after: null,
  race: null,
};

/* إحصائيات العربية الحالية (بعد الترقيات) */
function carStats() {
  const c = CARS[G.carIdx] || CARS[0];
  const ups = G.upgrades[c.id] || {};
  let top = c.topSpeed, acc = c.accel, brk = c.brake, grp = c.grip, str = c.steer;
  let suspLvl = ups.suspension || 0;
  for (const u of UPGRADES) {
    const lvl = ups[u.id] || 0;
    if (lvl > 0 && lvl < u.levels.length) {
      const b = u.levels[lvl].bonus;
      if (u.stat === 'topSpeed') top += b;
      else if (u.stat === 'brake') brk += b;
      else if (u.stat === 'grip') grp += b;
      else if (u.stat === 'steer') str += b;
    }
  }
  return {
    topSpeed: top * (.72 + .28*(G.conditions[c.id]??100)/100),
    accel: (acc + (top - c.topSpeed) * .45) * (.6 + .4*(G.conditions[c.id]??100)/100),
    brake: brk * (.8 + .2*(G.conditions[c.id]??100)/100),
    grip: grp,
    steer: str,
    bumpDamp: 1 - suspLvl * .28,
    fareBonus: c.fareBonus || 1,
  };
}

function applyCarStats() {
  MAXSPEED = Math.max(90, carStats().topSpeed * 2.5);
}
applyCarStats();

const RANKS = [
  { xp: 0, name: 'مبتدئ' },
  { xp: 400, name: 'أسطى' },
  { xp: 1200, name: 'كابتن' },
  { xp: 2600, name: 'نجم الكورنيش' },
  { xp: 5000, name: 'زعيم أسيوط' },
  { xp: 9000, name: 'أسطورة' },
];

function rankInfo() {
  let i = 0;
  while (i + 1 < RANKS.length && G.xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i], next = RANKS[i + 1];
  const p = next ? (G.xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { name: cur.name, p: clamp(p, 0, 1), next };
}

function unlockAchievement(id) {
  if (G.achievements.includes(id)) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  G.achievements.push(id);
  G.money += ach.reward;
  saveProgress();
  if (typeof sfxCash === 'function') sfxCash();
  if (typeof floatText === 'function') floatText(`🏆 ${ach.name} (+${fmt(ach.reward)} ج.م)`, '#ffd34d');
  if (typeof setObjective === 'function') setObjective(`إنجاز جديد ${ach.icon} <b>${ach.name}</b> · مكافأة ${fmt(ach.reward)} ج.م`, 4200);
}

function checkAchievements() {
  if (G.trips >= 1) unlockAchievement('first_trip');
  if (G.trips >= 10) unlockAchievement('trips_10');
  if (G.trips >= 25) unlockAchievement('trips_25');
  if (G.combo >= 5) unlockAchievement('combo_5');
  if (G.money >= 10000) unlockAchievement('rich_10k');
  if (G.owned.length > 1) unlockAchievement('buy_car');
}

function saveProgress() {
  store.set('alex_driver_conditions',JSON.stringify(G.conditions));
  store.set('alex_driver_earned',G.totalEarned);
  store.set('alex_driver_rating_total',G.ratingTotal);
  store.set('alex_driver_rated',G.ratedTrips);
  store.set('alex_taxi_money', Math.round(G.money));
  store.set('alex_taxi_xp', Math.round(G.xp));
  store.set('alex_taxi_trips', G.trips);
  store.set('alex_taxi_branch', G.branch);
  store.set('alex_taxi_best', G.bestRace);
  store.set('alex_taxi_best_surv', G.bestSurvival);
  store.set('alex_taxi_clock', Math.round(G.clock));
  store.set('alex_taxi_cycle', G.cycle ? '1' : '0');
  store.set('alex_taxi_weather', G.weather);
  store.set('alex_taxi_dynw', G.dynWeather ? '1' : '0');
  store.set('alex_taxi_music', G.music ? '1' : '0');
  store.set('alex_taxi_station', G.station);
  store.set('alex_taxi_car', G.mode==='police'?POLICE.uberCarIdx:G.carIdx);
  store.set('alex_taxi_owned', JSON.stringify(G.owned));
  store.set('alex_taxi_upgrades', JSON.stringify(G.upgrades));
  store.set('alex_taxi_paints', JSON.stringify(G.paints));
  store.set('alex_taxi_ach', JSON.stringify(G.achievements));
  store.set('assyut_graphics_quality', G.graphicsQuality || 'balanced');
  store.set('assyut_fuel', Math.round(G.fuel == null ? 100 : G.fuel));
}

/* ========================= 72-audio.js ========================= */
/* =====================================================================
   الصوت: المحرك والمؤثرات مولّد، مع طبقة أجواء شارع مصرية مرخّصة
   ===================================================================== */
let AC = null, master = null, engOsc = null, engOsc2 = null, engSub = null, engRumbleGain = null, engGain = null, engFilter = null;
let windGain = null, skidGain = null, brakeGain = null, seaGain = null, rainGain = null;
let cityAmbience = null, audioNoiseBuf = null;

function makeWarmSaturationCurve(k = 2.2) {
  const n = 512, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(k * x);
  }
  return curve;
}

function noiseBurst(dur = 0.14, freq = 900, q = 1.2, vol = 0.14, type = 'bandpass', slideTo = 0) {
  if (!AC || !G.sound || !audioNoiseBuf) return;
  const now = AC.currentTime;
  const src = AC.createBufferSource();
  src.buffer = audioNoiseBuf;
  src.loop = true;
  const flt = AC.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(freq, now);
  if (slideTo > 0) flt.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
  flt.Q.value = q;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(vol, now + Math.min(0.008, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(flt); flt.connect(g); g.connect(master);
  src.start(now, Math.random() * 1.2);
  src.stop(now + dur + 0.02);
}

function syncCityAmbience() {
  if (!cityAmbience) return;
  const on = !!G.sound && G.state === 'play' && !window.__deferAudio;
  cityAmbience.volume = on ? .12 : 0;
  if (on) cityAmbience.play().catch(() => { });
  else cityAmbience.pause();
}

function initAudio() {
  if (AC) { try { AC.resume(); } catch (_) { } return; }
  const AudioCtx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) return;
  try {
    AC = new AudioCtx();
    master = AC.createGain();
    master.gain.value = G.sound ? .7 : 0;
    master.connect(AC.destination);
    if (typeof Audio !== 'undefined') {
      try {
        cityAmbience = new Audio('assets/audio/cairo-street-cc0.mp3');
        cityAmbience.loop = true;
        cityAmbience.preload = 'auto';
        syncCityAmbience();
      } catch (_) { }
    }

    // محرك احتراق داخلي متعدد التوافقات + صوت عادم دافئ
    engOsc = AC.createOscillator();
    engOsc.type = 'sawtooth';
    engOsc.frequency.value = 48;

    engOsc2 = AC.createOscillator();
    engOsc2.type = 'triangle';
    engOsc2.frequency.value = 96;

    engSub = AC.createOscillator();
    engSub.type = 'sine';
    engSub.frequency.value = 24;

    const engMix = AC.createGain(); engMix.gain.value = 1;
    const gEng1 = AC.createGain(); gEng1.gain.value = 0.55;
    const gEng2 = AC.createGain(); gEng2.gain.value = 0.35;
    const gEngSub = AC.createGain(); gEngSub.gain.value = 0.65;

    let engShaper = null;
    if (typeof AC.createWaveShaper === 'function') {
      try {
        engShaper = AC.createWaveShaper();
        engShaper.curve = makeWarmSaturationCurve(1.9);
      } catch (_) { engShaper = null; }
    }

    engFilter = AC.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 280;
    engFilter.Q.value = 1.6;

    engGain = AC.createGain();
    engGain.gain.value = 0;

    engOsc.connect(gEng1); gEng1.connect(engMix);
    engOsc2.connect(gEng2); gEng2.connect(engMix);
    engSub.connect(gEngSub); gEngSub.connect(engMix);
    if (engShaper) { engMix.connect(engShaper); engShaper.connect(engFilter); }
    else engMix.connect(engFilter);
    engFilter.connect(engGain);
    engGain.connect(master);

    engOsc.start();
    engOsc2.start();
    engSub.start();

    const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audioNoiseBuf = buf;

    // هدير العادم الخفيف المرتبط بدوران المحرك
    const rumbleSrc = AC.createBufferSource();
    rumbleSrc.buffer = buf; rumbleSrc.loop = true;
    const rumbleLp = AC.createBiquadFilter();
    rumbleLp.type = 'lowpass'; rumbleLp.frequency.value = 140;
    engRumbleGain = AC.createGain(); engRumbleGain.gain.value = 0;
    rumbleSrc.connect(rumbleLp); rumbleLp.connect(engRumbleGain); engRumbleGain.connect(master);
    rumbleSrc.start();

    const noise = AC.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const bp = AC.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 680; bp.Q.value = .65;
    windGain = AC.createGain(); windGain.gain.value = 0;
    noise.connect(bp); bp.connect(windGain); windGain.connect(master);
    noise.start();

    // صرير الكاوتش الناعم: احتكاك مطاط دافئ بالأسفلت بدون صفير حاد
    const skid = AC.createBufferSource();
    skid.buffer = buf; skid.loop = true;
    const skidScrub = AC.createBiquadFilter();
    skidScrub.type = 'bandpass'; skidScrub.frequency.value = 680; skidScrub.Q.value = 1.8;
    const skidLp = AC.createBiquadFilter();
    skidLp.type = 'lowpass'; skidLp.frequency.value = 1350;
    skidGain = AC.createGain(); skidGain.gain.value = 0;
    skid.connect(skidScrub); skidScrub.connect(skidLp); skidLp.connect(skidGain);
    skidGain.connect(master);
    skid.start();

    // صوت فرامل ناعم وواقعي من داخل المقصورة (بدون صفير أو وش مزعج)
    const brakeSrc = AC.createBufferSource();
    brakeSrc.buffer = buf; brakeSrc.loop = true;
    const brakeLp = AC.createBiquadFilter();
    brakeLp.type = 'lowpass'; brakeLp.frequency.value = 260;
    brakeGain = AC.createGain(); brakeGain.gain.value = 0;
    brakeSrc.connect(brakeLp); brakeLp.connect(brakeGain);
    brakeGain.connect(master);
    brakeSrc.start();

    // صوت موج البحر
    const seaSrc = AC.createBufferSource();
    seaSrc.buffer = buf; seaSrc.loop = true;
    const seaLp = AC.createBiquadFilter();
    seaLp.type = 'lowpass'; seaLp.frequency.value = 340;
    seaGain = AC.createGain(); seaGain.gain.value = 0;
    seaSrc.connect(seaLp); seaLp.connect(seaGain); seaGain.connect(master);
    seaSrc.start();

    // صوت المطر الواقعي: ضوضاء وردية دافئة (صوت السقف والأسفلت) + قطرات ناعمة على الزجاج (بدون وش تليفزيون حاد)
    const rainBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const rd = rainBuf.getChannelData(0);
    let lastSample = 0;
    for (let i = 0; i < rd.length; i++) {
      const white = Math.random() * 2 - 1;
      lastSample = lastSample * 0.74 + white * 0.26;
      rd[i] = lastSample * 1.6;
    }
    const rainSrc = AC.createBufferSource();
    rainSrc.buffer = rainBuf; rainSrc.loop = true;

    const rainRoofLp = AC.createBiquadFilter();
    rainRoofLp.type = 'lowpass'; rainRoofLp.frequency.value = 820;

    const rainGlassBp = AC.createBiquadFilter();
    rainGlassBp.type = 'bandpass'; rainGlassBp.frequency.value = 1900; rainGlassBp.Q.value = 0.75;

    const rainPatterGain = AC.createGain();
    rainPatterGain.gain.value = 0.35;

    rainGain = AC.createGain(); rainGain.gain.value = 0;
    rainSrc.connect(rainRoofLp); rainRoofLp.connect(rainGain);
    rainSrc.connect(rainGlassBp); rainGlassBp.connect(rainPatterGain); rainPatterGain.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();

    musicKick();
  } catch (err) {
    console.warn('initAudio error handled:', err);
  }
}

function tone(freq, dur = .12, type = 'square', vol = .12, slide = 0) {
  if (!AC || !G.sound) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, AC.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), AC.currentTime + dur);
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(AC.currentTime + dur);
}

function sfxPickup() { tone(587, .09, 'sine', .12); setTimeout(() => tone(880, .14, 'sine', .11), 85); }
function sfxCheckpoint() { tone(659, .08, 'sine', .11); setTimeout(() => tone(988, .12, 'sine', .10), 80); }
function sfxCash() {
  tone(880, .07, 'sine', .12);
  setTimeout(() => tone(1174, .09, 'sine', .11), 70);
  setTimeout(() => tone(1568, .16, 'sine', .10), 140);
}
function sfxCrash() {
  // خبطة هيكل سيارة دافئة ومكتومة من داخل المقصورة (بدون ضجيج حاد أو إزعاج)
  tone(92, .16, 'sine', .11, -56);
  noiseBurst(0.13, 340, 0.85, 0.075, 'lowpass');
}
let scrapeAudioCd = 0;
function sfxScrape(vol = 0.08) {
  if (typeof AC === 'undefined' || !AC || !G.sound || scrapeAudioCd > 0) return;
  scrapeAudioCd = 0.18;
  const v = Math.min(0.055, vol * 0.45);
  noiseBurst(0.08, 480 + Math.random() * 280, 1.4, v, 'bandpass');
}
function sfxBump() {
  // مطب صناعي: ارتطام مساعدين وإطارات مطاطية
  tone(92, .14, 'sine', .17, -52);
  noiseBurst(0.075, 190, 0.9, 0.11, 'lowpass');
}
function sfxThud() {
  tone(72, .12, 'sine', .14, -36);
  noiseBurst(0.06, 150, 0.8, 0.09, 'lowpass');
}
function sfxFail() { tone(330, .16, 'triangle', .11, -110); setTimeout(() => tone(220, .28, 'triangle', .10, -70), 150); }
function sfxFine() { tone(784, .09, 'sine', .10); setTimeout(() => tone(587, .15, 'sine', .10, -40), 100); }
function sfxTrafficBeep() { sfxTrafficHonk('modern'); }
function sfxUI() { tone(620, .038, 'sine', .045, 120); }

function isMusicPlaying() {
  if (!G.sound || !G.music || G.state !== 'play') return false;
  if (typeof RADIO !== 'undefined' && RADIO.audio && !RADIO.audio.paused && RADIO.audio.currentTime > 0) return true;
  if (typeof MUSIC !== 'undefined' && MUSIC.timer !== null) return true;
  return false;
}

function sfxTrafficHonk(kind = 'modern', x, z) {
  if (!AC || !G.sound) return;
  const now = AC.currentTime;
  let distFactor = 1.0;
  if (typeof car !== 'undefined' && Number.isFinite(x) && Number.isFinite(z)) {
    const dist = Math.hypot(x - car.x, z - car.z);
    if (dist > 75) return;
    distFactor = Math.max(0, 1 - dist / 75);
  }
  const duck = isMusicPlaying() ? 0.65 : 1.0;
  const masterVol = (0.042 + distFactor * 0.058) * duck;
  const lpFreq = 1400 + distFactor * 2600;

  if (kind === 'micro') {
    // ميكروباص أسيوط: النقرة المزدوجة الشهيرة (طـط!)
    for (let tap = 0; tap < 2; tap++) {
      const tStart = now + tap * 0.105;
      const tDur = 0.065;
      for (const f of [465, 580]) {
        const osc = AC.createOscillator(), g = AC.createGain(), flt = AC.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f + 8, tStart);
        osc.frequency.exponentialRampToValueAtTime(f, tStart + 0.015);
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(lpFreq, tStart);
        g.gain.setValueAtTime(0.0001, tStart);
        g.gain.linearRampToValueAtTime(masterVol * 0.92, tStart + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, tStart + tDur);
        osc.connect(flt); flt.connect(g); g.connect(master);
        osc.start(tStart); osc.stop(tStart + tDur + 0.02);
      }
    }
  } else if (kind === 'truck' || kind === 'bus') {
    // نقل / أتوبيس: كلاكس هوائي عميق وقوي
    const tDur = 0.36;
    for (const f of [185, 235]) {
      const osc = AC.createOscillator(), g = AC.createGain(), flt = AC.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(Math.min(lpFreq, 980), now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(masterVol * 1.15, now + 0.015);
      g.gain.setValueAtTime(masterVol * 1.1, now + tDur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, now + tDur);
      osc.connect(flt); flt.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + tDur + 0.03);
    }
  } else if (kind === 'tuktuk') {
    // توك توك: صوت زنان حاد مميز (باجاج)
    const tDur = 0.13;
    for (const f of [630, 770]) {
      const osc = AC.createOscillator(), g = AC.createGain(), flt = AC.createBiquadFilter();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(Math.min(lpFreq, 1400), now);
      flt.Q.value = 1.2;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(masterVol * 0.75, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + tDur);
      osc.connect(flt); flt.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + tDur + 0.02);
    }
  } else if (kind === 'motorcycle' || kind === 'scooter') {
    // دراجة نارية: بيب قرصي خفيف
    const tDur = 0.10;
    const osc = AC.createOscillator(), g = AC.createGain(), flt = AC.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(510, now);
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(lpFreq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(masterVol * 0.85, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + tDur);
    osc.connect(flt); flt.connect(g); g.connect(master);
    osc.start(now); osc.stop(now + tDur + 0.02);
  } else {
    // سيارات ملاكي وتاكسي: كلاكس نغمي ثنائي حلزوني أصلي (405 هرتز و 498 هرتز)
    const tDur = 0.18;
    for (const f of [405, 498]) {
      const osc = AC.createOscillator(), g = AC.createGain(), flt = AC.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f + 8, now);
      osc.frequency.exponentialRampToValueAtTime(f, now + 0.02);
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(lpFreq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(masterVol, now + 0.01);
      g.gain.setValueAtTime(masterVol * 0.95, now + tDur * 0.68);
      g.gain.exponentialRampToValueAtTime(0.0001, now + tDur);
      osc.connect(flt); flt.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + tDur + 0.02);
    }
  }
}

function honk() {
  if (typeof G !== 'undefined' && G.mode === 'police' && typeof policeAirHorn === 'function') {
    policeAirHorn();
  } else if (typeof naturalHonk === 'function') {
    naturalHonk();
  }
  if (typeof honkReact === 'function') honkReact();
}

function setSound(on) {
  G.sound = on;
  store.set('alex_taxi_sound', on ? '1' : '0');
  if (master) master.gain.value = on ? .7 : 0;
  $('btnSound').textContent = on ? '🔊' : '🔇';
  $('btnSound').classList.toggle('off', !on);
  $('menuSound').textContent = on ? '🔊 الصوت: مفتوح' : '🔇 الصوت: مقفول';
  syncCityAmbience();
}

/* ========================= 73-emergency-audio.js ========================= */
/* =====================================================================
   صوت الطوارئ وسارينة الشرطة المصرية والكلاكس الواقعي
   ===================================================================== */
const EMERGENCY_AUDIO = {
  osc1: null,
  osc2: null,
  oscSub: null,
  gain: null,
  hpFilter: null,
  bpFilter: null,
  lpFilter: null,
  airHornDuck: 0,
  tracks: null,
  activeTrack: null,
  realFailed: {},
};

const SIREN_AUDIO_FILES = {
  wail: 'assets/audio/police-siren-studio.mp3',
  yelp: 'assets/audio/police-siren.mp3',
  hilo: 'assets/audio/police-siren-euro.mp3',
};

function ensureRealSirenTracks() {
  if (EMERGENCY_AUDIO.tracks || typeof Audio === 'undefined') return EMERGENCY_AUDIO.tracks;
  EMERGENCY_AUDIO.tracks = {};
  for (const [mode, src] of Object.entries(SIREN_AUDIO_FILES)) {
    try {
      const a = new Audio(src);
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      a.addEventListener('error', () => { EMERGENCY_AUDIO.realFailed[mode] = true; });
      EMERGENCY_AUDIO.tracks[mode] = a;
    } catch (_) {
      EMERGENCY_AUDIO.realFailed[mode] = true;
    }
  }
  return EMERGENCY_AUDIO.tracks;
}

function makeSirenSaturationCurve(k = 2.8) {
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(k * x) * 0.82 + (x > 0 ? 0.18 * Math.sin(x * Math.PI) : 0);
  }
  return curve;
}

function updateEmergencyAudio() {
  if (!AC) return;
  const now = AC.currentTime;

  if (!EMERGENCY_AUDIO.osc1) {
    // 1. المذبذب الأساسي (الموجة الرئيسية لصوت البوق)
    const o1 = AC.createOscillator();
    o1.type = 'sawtooth';

    // 2. المذبذب التوافقي الثاني (أوكتاف علوي ناتج عن ضغط الهواء داخل عنق السماعة 2x)
    const o2 = AC.createOscillator();
    o2.type = 'sawtooth';

    // 3. مذبذب رنين جسم السماعة وتردد الشارع العميق (Sub-Octave 0.5x)
    const oSub = AC.createOscillator();
    oSub.type = 'sine';

    const g1 = AC.createGain(); g1.gain.value = 0.82;
    const g2 = AC.createGain(); g2.gain.value = 0.28;
    const gSub = AC.createGain(); gSub.gain.value = 0.18;

    const preGain = AC.createGain(); preGain.gain.value = 1.15;

    // 4. محاكي التشبع الصوتي لمكبر بوق الطوارئ المعدني 100W (WaveShaper Overdrive)
    let shaper = null;
    if (typeof AC.createWaveShaper === 'function') {
      try {
        shaper = AC.createWaveShaper();
        shaper.curve = makeSirenSaturationCurve(2.8);
        shaper.oversample = '2x';
      } catch (_) { shaper = null; }
    }

    // 5. فلاتر التشكيل الصوتي لسماعات Whelen / Federal Signal المعتمدة بدوريات مصر:
    const hp = AC.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 460;
    hp.Q.value = 0.8;

    const bp = AC.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1260;
    bp.Q.value = 1.35;

    const lp = AC.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3500;
    lp.Q.value = 1.0;

    // صدى خفيف يحاكي ارتداد صوت السرينة بين مباني شوارع المدينة
    let delay = null, delayGain = null;
    if (typeof AC.createDelay === 'function') {
      try {
        delay = AC.createDelay(0.1);
        delay.delayTime.value = 0.034;
        delayGain = AC.createGain();
        delayGain.gain.value = 0.16;
      } catch (_) { delay = null; }
    }

    const mainGain = AC.createGain();
    mainGain.gain.value = 0;

    o1.connect(g1); g1.connect(preGain);
    o2.connect(g2); g2.connect(preGain);
    oSub.connect(gSub); gSub.connect(preGain);

    let lastNode = preGain;
    if (shaper) { lastNode.connect(shaper); lastNode = shaper; }
    lastNode.connect(hp);
    hp.connect(bp);
    bp.connect(lp);
    lp.connect(mainGain);

    if (delay && delayGain) {
      lp.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(mainGain);
    }

    mainGain.connect(master);

    o1.start();
    o2.start();
    oSub.start();

    EMERGENCY_AUDIO.osc1 = o1;
    EMERGENCY_AUDIO.osc2 = o2;
    EMERGENCY_AUDIO.oscSub = oSub;
    EMERGENCY_AUDIO.gain = mainGain;
    EMERGENCY_AUDIO.hpFilter = hp;
    EMERGENCY_AUDIO.bpFilter = bp;
    EMERGENCY_AUDIO.lpFilter = lp;
  }

  const active = typeof POLICE !== 'undefined' && G.mode === 'police' && G.state === 'play' && POLICE.siren && G.sound;
  const isUrgent = (typeof car !== 'undefined' && Math.abs(car.speed) > 22) || (typeof POLICE !== 'undefined' && ['respond', 'pursuit', 'transport'].includes(POLICE.phase));
  const isBMW = typeof CARS !== 'undefined' && typeof G !== 'undefined' && CARS[G.carIdx]?.id === 'policeBMW';

  // اختيار النغمة الواقعية
  const userTone = typeof POLICE !== 'undefined' ? (POLICE.sirenTone || 'auto') : 'auto';
  let mode = userTone;
  if (userTone === 'auto') {
    if (isUrgent) mode = 'yelp';
    else if (isBMW && typeof POLICE !== 'undefined' && POLICE.phase === 'patrol' && Math.abs(car?.speed || 0) < 18) mode = 'hilo';
    else mode = 'wail';
  }

  const hornDucking = EMERGENCY_AUDIO.airHornDuck > now ? 0.30 : 1.0;

  // تشغيل ملف الصوت الحقيقي المسجل للسرينة أولاً (وإيقاف المذبذب عند نجاحه)
  const tracks = ensureRealSirenTracks();
  const realTrack = tracks && !EMERGENCY_AUDIO.realFailed[mode] ? tracks[mode] : null;
  let usingRealAudio = false;
  if (tracks) {
    for (const [m, a] of Object.entries(tracks)) {
      if (!a) continue;
      if (active && m === mode && realTrack === a) {
        usingRealAudio = true;
        a.volume = 0.44 * hornDucking;
        if (a.paused) a.play().catch(() => { EMERGENCY_AUDIO.realFailed[m] = true; });
      } else {
        if (!a.paused) { a.pause(); a.currentTime = 0; }
        a.volume = 0;
      }
    }
  }

  let freq = 800;
  let glide = 0.024;

  if (mode === 'yelp') {
    const yelpPeriod = 0.285;
    const p = (now % yelpPeriod) / yelpPeriod;
    const sweep = p < 0.68
      ? Math.pow(p / 0.68, 0.82)
      : 1 - Math.pow((p - 0.68) / 0.32, 1.35);
    freq = 710 + sweep * 760;
    glide = 0.012;
  } else if (mode === 'hilo') {
    const hiloPeriod = 0.84;
    const p = (now % hiloPeriod) / hiloPeriod;
    freq = p < 0.5 ? 950 : 730;
    glide = 0.018;
  } else {
    const wailPeriod = 4.3;
    const p = (now % wailPeriod) / wailPeriod;
    const sweep = p < 0.54
      ? 0.5 - 0.5 * Math.cos((p / 0.54) * Math.PI)
      : 0.5 + 0.5 * Math.cos(((p - 0.54) / 0.46) * Math.PI);
    freq = 630 + Math.pow(sweep, 1.12) * 800;
    glide = 0.028;
  }

  EMERGENCY_AUDIO.osc1.frequency.setTargetAtTime(freq, now, glide);
  EMERGENCY_AUDIO.osc2.frequency.setTargetAtTime(freq * 2, now, glide);
  EMERGENCY_AUDIO.oscSub.frequency.setTargetAtTime(freq * 0.5, now, glide);

  const targetGain = (active && !usingRealAudio) ? (0.088 * hornDucking) : 0;
  EMERGENCY_AUDIO.gain.gain.setTargetAtTime(targetGain, now, active ? 0.05 : 0.12);
}

// كلاكس الشرطة الهوائي الإلكتروني الواقعي (القرن / البوق القاطع)
function policeAirHorn() {
  if (!AC || !G.sound) return;
  const now = AC.currentTime;
  EMERGENCY_AUDIO.airHornDuck = now + 0.42;

  const tDur = 0.34;
  const masterVol = isMusicPlaying() ? 0.085 : 0.11;

  // النغمتان الرئيستان لبوق الطوارئ الإلكتروني (176 هرتز و 235 هرتز)
  const tones = [176, 235];
  for (const f of tones) {
    const o = AC.createOscillator(), g = AC.createGain(), flt = AC.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, now);
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(520, now);
    flt.Q.value = 1.8;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(masterVol, now + 0.006);
    g.gain.setValueAtTime(masterVol * 0.94, now + tDur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, now + tDur);

    o.connect(flt); flt.connect(g); g.connect(master);
    o.start(now); o.stop(now + tDur + 0.04);
  }

  // طبقة قرن هوائي حادة علوية لقطع حركة المرور
  const oHigh = AC.createOscillator(), gHigh = AC.createGain(), fltHigh = AC.createBiquadFilter();
  oHigh.type = 'square';
  oHigh.frequency.setValueAtTime(352, now);
  fltHigh.type = 'bandpass';
  fltHigh.frequency.setValueAtTime(1180, now);
  fltHigh.Q.value = 1.9;

  gHigh.gain.setValueAtTime(0.0001, now);
  gHigh.gain.linearRampToValueAtTime(masterVol * 0.45, now + 0.005);
  gHigh.gain.exponentialRampToValueAtTime(0.0001, now + tDur);

  oHigh.connect(fltHigh); fltHigh.connect(gHigh); gHigh.connect(master);
  oHigh.start(now); oHigh.stop(now + tDur + 0.04);
}

// كلاكس سيارة اللاعب العادية فائق الواقعية (كهرومغناطيسي ثنائي نغمي بمواصفات Hella/Bosch الأصلية)
let LAST_HONK_TIME = 0;

function naturalHonk(overrideCarId) {
  if (!AC || !G.sound) return;
  const now = AC.currentTime;
  const isDoubleTap = (now - LAST_HONK_TIME) < 0.28 && (now - LAST_HONK_TIME) > 0.06;
  LAST_HONK_TIME = now;

  const duck = isMusicPlaying() ? 0.75 : 1.0;
  const masterVol = 0.095 * duck;

  // تحديد نغمة البوق الدقيقة بناءً على طراز السيارة
  const c = (typeof CARS !== 'undefined' && typeof G !== 'undefined' && CARS[G.carIdx]) ? CARS[G.carIdx] : null;
  const carId = overrideCarId || c?.id || 'qashqai';

  let fLow = 405, fHigh = 498; // التردد القياسي لكلاكس السيارات الحديثة (بوش وهيلا: نغمتين متناغمتين 405 هرتز و 498 هرتز)
  let tDur = isDoubleTap ? 0.14 : 0.22;
  let formFreq = 1850;

  if (carId === 'fiat1300') {
    // كلاكس قرصي كلاسيكي معدني حاد للفيات 1300
    fLow = 338; fHigh = 422;
    formFreq = 1650;
  } else if (carId === 'hiace' || c?.body === 'micro') {
    // ميكروباص أسيوط: بوق حاد نفاذ وسريع
    fLow = 465; fHigh = 582;
    tDur = 0.16;
    formFreq = 2100;
  } else if (c?.police) {
    // دوريات الشرطة عند استخدام الكلاكس العادي
    fLow = 392; fHigh = 486;
    formFreq = 1800;
  } else if (carId === 'micra') {
    // هاتشباك خفيفة
    fLow = 428; fHigh = 524;
    formFreq = 1950;
  } else if (carId === 'roadster' || carId === 'sport370') {
    // رياضية فخمة
    fLow = 412; fHigh = 508;
    formFreq = 1900;
  }

  // مجمع الترددات الأساسية
  const preGain = AC.createGain();
  preGain.gain.value = 1.0;

  // محاكي تشبع الغشاء الفولاذي الكهرومغناطيسي للكلاكس (WaveShaper Overdrive)
  let shaper = null;
  if (typeof AC.createWaveShaper === 'function') {
    try {
      shaper = AC.createWaveShaper();
      shaper.curve = makeSirenSaturationCurve(3.0);
      shaper.oversample = '2x';
    } catch (_) { shaper = null; }
  }

  // فلتر تجويف البوق الحلزوني (Snail Horn Bell Flare Resonance)
  const bp = AC.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.setValueAtTime(formFreq, now);
  bp.Q.value = 1.6;
  bp.gain.value = 4.5;

  // قطع الترددات الخفيضة جداً أسفل تردد البوق
  const hp = AC.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(280, now);
  hp.Q.value = 0.7;

  // قطع الخشونة الرقمية العالية فوق 4.2 كيلو هرتز لصوت معدني طبيعي
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4200, now);
  lp.Q.value = 1.0;

  // صدى ارتداد صوت الكلاكس في الشارع (32ms Slapback)
  let delay = null, delayGain = null;
  if (typeof AC.createDelay === 'function') {
    try {
      delay = AC.createDelay(0.1);
      delay.delayTime.value = 0.032;
      delayGain = AC.createGain();
      delayGain.gain.value = 0.15;
    } catch (_) { delay = null; }
  }

  const outGain = AC.createGain();
  outGain.gain.setValueAtTime(0.0001, now);
  outGain.gain.linearRampToValueAtTime(masterVol, now + 0.008);
  outGain.gain.setValueAtTime(masterVol * 0.95, now + tDur * 0.72);
  outGain.gain.exponentialRampToValueAtTime(0.0001, now + tDur);

  // توصيل المسار الصوتي
  let chain = preGain;
  if (shaper) { chain.connect(shaper); chain = shaper; }
  chain.connect(hp);
  hp.connect(bp);
  bp.connect(lp);
  lp.connect(outGain);

  if (delay && delayGain) {
    lp.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(outGain);
  }

  outGain.connect(master);

  // تشغيل النغمتين الأساسيتين (Low Tone & High Tone) مع انخفاض ميكانيكي طفيف في أول 22ms
  const tones = [
    { freq: fLow, vol: 0.88, overVol: 0.26 },
    { freq: fHigh, vol: 0.94, overVol: 0.22 }
  ];

  for (const t of tones) {
    // 1. المذبذب الأساسي للغشاء
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(t.freq + 10, now);
    o.frequency.exponentialRampToValueAtTime(t.freq, now + 0.022);
    g.gain.setValueAtTime(t.vol, now);
    o.connect(g); g.connect(preGain);
    o.start(now); o.stop(now + tDur + 0.04);

    // 2. التوافق الأوكتافي لعنق البوق (Octave Harmonic 2x)
    const o2 = AC.createOscillator(), g2 = AC.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime((t.freq + 10) * 2, now);
    o2.frequency.exponentialRampToValueAtTime(t.freq * 2, now + 0.022);
    g2.gain.setValueAtTime(t.overVol, now);
    o2.connect(g2); g2.connect(preGain);
    o2.start(now); o2.stop(now + tDur + 0.04);
  }

  // ضربة التماس المعدنية الأولى (Mechanical Point-Contact Impact)
  const clickOsc = AC.createOscillator(), clickGain = AC.createGain(), clickFlt = AC.createBiquadFilter();
  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(2600, now);
  clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.012);
  clickFlt.type = 'bandpass';
  clickFlt.frequency.setValueAtTime(2400, now);
  clickFlt.Q.value = 1.8;
  clickGain.gain.setValueAtTime(masterVol * 0.42, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
  clickOsc.connect(clickFlt); clickFlt.connect(clickGain); clickGain.connect(master);
  clickOsc.start(now); clickOsc.stop(now + 0.016);
}

/* ========================= 74-music.js ========================= */
/* =====================================================================
   الموسيقى — بتتولد لحظياً بالكود (مفيش أي ملف صوت محمّل)
   ===================================================================== */
const MAQAM = {
  hijaz: [0, 1, 4, 5, 7, 8, 11],      // حجاز
  nahawand: [0, 2, 3, 5, 7, 8, 10],   // نهاوند
  rast: [0, 2, 4, 5, 7, 9, 11],       // راست
  bayati: [0, 1.5, 3, 5, 7, 8, 10],   // بياتي (ربع تون شرقي)
};

const STATIONS = [
  { name: 'إذاعة أسيوط', maqam: 'hijaz', root: 50, bpm: 86, style: 'tarab', color: '#f0c24a' },
  { name: 'راديو الكورنيش', maqam: 'nahawand', root: 48, bpm: 110, style: 'pop', color: '#4ad0f0' },
  { name: 'FM 98.7 أسيوط', maqam: 'rast', root: 52, bpm: 126, style: 'baladi', color: '#f07a4a' },
  { name: 'سهرة بحري', maqam: 'bayati', root: 50, bpm: 102, style: 'maqsum', color: '#8ef08a' },
];

const RHYTHMS = {
  tarab: ['D', '-', 't', '-', '-', 't', 'D', '-', '-', '-', 't', '-', 'D', '-', 't', '-'],
  pop: ['D', '-', 't', 't', 'D', '-', 't', '-', 'D', '-', 't', 't', 'D', '-', 't', 't'],
  baladi: ['D', 'D', '-', 't', 'D', '-', 't', 't', 'D', 'D', '-', 't', 'D', '-', 't', 't'],
  maqsum: ['D', '-', 't', '-', '-', 't', 'D', '-', '-', 't', '-', '-', 't', '-', 't', '-'],
};

const MUSIC_VOL = .34;
const MUSIC = { gain: null, timer: null, next: 0, step: 0, phrase: null, noise: null };

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function musicNoise() {
  if (MUSIC.noise) return MUSIC.noise;
  const b = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  MUSIC.noise = b;
  return b;
}

function musicInit() {
  if (!AC || MUSIC.gain) return;
  MUSIC.gain = AC.createGain();
  MUSIC.gain.gain.value = 0;
  MUSIC.gain.connect(master);
}

function musicKick() {
  syncRecordedRadio();
  if (!AC) return;
  musicInit();
  const now = AC.currentTime;
  MUSIC.gain.gain.cancelScheduledValues(now);
  MUSIC.gain.gain.setTargetAtTime(G.music && !(RADIO.tracks[RADIO.mode]||[]).length ? MUSIC_VOL : 0, now, .3);
  if (G.music && !(RADIO.tracks[RADIO.mode]||[]).length && !STATIONS[G.station%STATIONS.length].kind && !MUSIC.timer) {
    MUSIC.next = Math.max(MUSIC.next, now + .12);
    MUSIC.timer = setInterval(scheduleMusic, 90);
  } else if ((!G.music||STATIONS[G.station%STATIONS.length].kind) && MUSIC.timer) {
    clearInterval(MUSIC.timer);
    MUSIC.timer = null;
  }
}

function setMusic(on) {
  RADIO.blocked=false;
  G.music = on;
  store.set('alex_taxi_music', on ? '1' : '0');
  musicKick();
  sfxUI();
  updateMusicUI();
  setObjective(on ? '🎵 الموسيقى شغالة' : '🔇 الموسيقى مقفولة', 1600);
}

function setStation(i) {
  G.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
  store.set('alex_taxi_station', G.station);
  MUSIC.step = 0;
  MUSIC.phrase = null;
  if (AC) MUSIC.next = AC.currentTime + .08;
  musicKick();updateMusicUI();
  setObjective(`📻 ${STATIONS[G.station].name}`, 2200);
  sfxUI();
}

/* آلات */
function mOud(t, midi, dur, vol = .15) {
  const f = mtof(midi);
  for (const [type, det, v] of [['sawtooth', 0, vol], ['triangle', 7, vol * .55]]) {
    const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.setValueAtTime(det, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(620, t + dur * .85);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(MUSIC.gain);
    o.start(t); o.stop(t + dur + .03);
  }
}

function mQanun(t, midi, vol = .07) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(mtof(midi), t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .006);
  g.gain.exponentialRampToValueAtTime(.0001, t + .5);
  o.connect(g); g.connect(MUSIC.gain);
  o.start(t); o.stop(t + .52);
}

function mBass(t, midi, dur = .4, vol = .17) {
  const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
  o.type = 'triangle';
  o.frequency.setValueAtTime(mtof(midi), t);
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .015);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(MUSIC.gain);
  o.start(t); o.stop(t + dur + .02);
}

function mDum(t, vol = .3) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(126, t);
  o.frequency.exponentialRampToValueAtTime(46, t + .17);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + .23);
  o.connect(g); g.connect(MUSIC.gain);
  o.start(t); o.stop(t + .25);
}

function mTak(t, vol = .11) {
  const s = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = musicNoise();
  bp.type = 'bandpass';
  bp.frequency.value = 2600;
  bp.Q.value = 1.4;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  s.connect(bp); bp.connect(g); g.connect(MUSIC.gain);
  s.start(t); s.stop(t + .09);
}

function mClap(t, vol = .09) {
  const s = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = musicNoise();
  bp.type = 'bandpass';
  bp.frequency.value = 1500;
  bp.Q.value = 1.1;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + .16);
  s.connect(bp); bp.connect(g); g.connect(MUSIC.gain);
  s.start(t); s.stop(t + .18);
}

/* جملة لحنية جديدة كل 4 بارات */
function makePhrase(st) {
  const out = [];
  let deg = 3;
  for (let i = 0; i < 16; i++) {
    if (i % 8 === 0) { out.push(0); continue; }
    deg = clamp(deg + Math.round(rand(-2.4, 2.4)), 0, 11);
    out.push(deg);
  }
  return out;
}

function degreeToMidi(st, deg) {
  const sc = MAQAM[st.maqam];
  const oct = Math.floor(deg / 7);
  return st.root + 12 + sc[((deg % 7) + 7) % 7] + oct * 12;
}

function scheduleMusic() {
  if (!AC || !G.music || (RADIO.tracks[RADIO.mode]||[]).length) return;
  const st = STATIONS[G.station % STATIONS.length];
  if(st.kind)return;
  const spb = 60 / st.bpm / 4;              // مدة 1/16
  let guard = 0;
  while (MUSIC.next < AC.currentTime + .4 && guard++ < 64) {
    const s = MUSIC.step;
    if (s % 64 === 0 || !MUSIC.phrase) MUSIC.phrase = makePhrase(st);
    const inBar = s % 16;
    const bar = Math.floor(s / 16);
    const sym = RHYTHMS[st.style][inBar];

    if (sym === 'D') mDum(MUSIC.next, .3);
    else if (sym === 't') mTak(MUSIC.next, .1);
    if (st.style !== 'tarab' && (inBar === 4 || inBar === 12)) mClap(MUSIC.next, .075);

    if (sym === 'D' && inBar % 8 === 0) mBass(MUSIC.next, st.root - 12, spb * 7, .16);

    if (inBar % 2 === 0) {
      const deg = MUSIC.phrase[((bar % 2) * 8 + inBar / 2) % 16];
      if (deg !== null && deg !== undefined && !(inBar === 0 && bar % 2 === 1)) {
        mOud(MUSIC.next, degreeToMidi(st, deg), spb * (inBar % 8 === 0 ? 7 : 3), .14);
      }
    }

    if (inBar === 6 && bar % 2 === 0) {
      mQanun(MUSIC.next, degreeToMidi(st, 7 + (bar % 3)), .055);
    }

    MUSIC.step = (s + 1) % 64;
    MUSIC.next += spb;
  }
}

function updateMusicUI() {
  const b = $('btnMusic');
  if (b) {
    b.textContent = '🎵';
    b.classList.toggle('off', !G.music);
  }
  const st = STATIONS[G.station % STATIONS.length];
  const lbl = $('nowPlaying');
  if (lbl) lbl.textContent = G.music ? st.name : 'الموسيقى مقفولة';
}

/* ========================= 75-police-station-architecture.js ========================= */
/* Egyptian station-inspired architecture; gameplay entrances are placed on clear local streets. */
function stationEntranceCandidate(index,previous){
 const target={x:ASSYUT.start.x+(index?170:-150),z:ASSYUT.start.z+(index?105:-105)};
 const options=ASSYUT.segments.filter(s=>s.width>=6&&s.length>20&&!INFRA.profiles.has(s.road)&&ASSYUT.navigableNodes.has(s.aNode)&&ASSYUT.navigableNodes.has(s.bNode)).map(s=>({s,x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2})).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));
 for(const routeLimit of[500,900])for(const p of options){if(Math.hypot(p.x-ASSYUT.start.x,p.z-ASSYUT.start.z)>600||previous&&Math.hypot(p.x-previous.stop.x,p.z-previous.stop.z)<115)continue;if(driveSurfaceCandidates(p.x,p.z).some(q=>INFRA.profiles.has(q.road)))continue;const s=p.s,tx=(s.b.x-s.a.x)/s.length,tz=(s.b.z-s.a.z)/s.length;
  for(const side of[1,-1]){const nx=-tz*side,nz=tx*side,cx=p.x+nx*(s.width/2+12.3),cz=p.z+nz*(s.width/2+12.3),yaw=Math.atan2(nx,nz);let free=true;
   for(const [lx,lz]of[[0,0],[-8,-5.5],[8,-5.5],[-8,5.5],[8,5.5]]){const x=cx+Math.cos(yaw)*lx+Math.sin(yaw)*lz,z=cz-Math.sin(yaw)*lx+Math.cos(yaw)*lz,n=nearestAssyutRoad({x,z});if(n.distance<n.width/2+2.2||driveSurfaceCandidates(x,z).some(q=>q.distance<q.s.width/2+2.2)){free=false;break;}}
   if(!free||roadCutsOrientedBuilding(cx,cz,yaw,8,5.5,1.4)||bridgeCutsBox(cx,cz,24,20,3.5))continue;const stop={x:p.x+nx*(s.width/2+1.3),z:p.z+nz*(s.width/2+1.3),roadIndex:s.road,height:.18},route=roadRoute(ASSYUT.start,stop);if(!route.reachable||route.length>routeLimit)continue;return{cx,cz,yaw,stop,tx,tz,nx,nz};
  }
 }
 return null;
}
function makePoliceStationBuilding(name){
 const group=new THREE.Group();
 const stoneTex=canvasTex(128,128,g=>{g.fillStyle=name.includes('ثاني')?'#b7beb9':'#c7bc9f';g.fillRect(0,0,128,128);g.strokeStyle='rgba(70,66,58,.24)';g.lineWidth=2;for(let y=0;y<128;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();for(let x=(y/24)%2?16:0;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+24);g.stroke();}}});stoneTex.wrapS=stoneTex.wrapT=THREE.RepeatWrapping;stoneTex.repeat.set(3,2);
 const sand=new THREE.MeshStandardMaterial({map:stoneTex,color:0xffffff,roughness:.88}),baseStone=new THREE.MeshStandardMaterial({color:0x666e72,roughness:.92}),trim=new THREE.MeshStandardMaterial({color:0xebe4d4,roughness:.75}),blue=new THREE.MeshStandardMaterial({color:0x133c6e,roughness:.45}),gold=new THREE.MeshStandardMaterial({color:0xc9a33d,metalness:.65,roughness:.32}),glass=new THREE.MeshStandardMaterial({color:0x162b36,roughness:.22,metalness:.35}),iron=new THREE.MeshStandardMaterial({color:0x3f494f,metalness:.65,roughness:.45});
 const box=(w,h,d,x,y,z,m)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;group.add(a);return a;};
 box(16,10.2,11,0,5.1,0,sand);box(16.25,2.9,11.2,0,1.45,0,baseStone);box(17.1,.38,11.6,0,10.28,0,trim);box(16.4,.35,11.1,0,10.72,0,blue);
 for(const y of[3.0,6.65])box(16.35,.22,11.2,0,y,0,trim);
 for(const x of[-7.8,-4.5,4.5,7.8])box(.42,10.1,.35,x,5.05,-5.52,trim);
 for(const y of[1.8,5.5,8.4])for(const x of[-6.1,-3,3,6.1]){box(1.65,1.8,.16,x,y,-5.58,trim);box(1.32,1.48,.06,x,y,-5.68,glass);for(const dx of[-.4,0,.4])box(.04,1.48,.05,x+dx,y,-5.73,iron);}
 // مدخل القسم المميز بأعمدة ومظلة وفوانيس زرقاء وشعار الشرطة
 box(3.0,3.2,.14,0,1.76,-5.62,blue);box(.16,3.15,.08,-.04,1.76,-5.7,glass);box(.16,3.15,.08,.04,1.76,-5.7,glass);
 for(const x of[-1.9,1.9]){const col=new THREE.Mesh(new THREE.CylinderGeometry(.20,.23,3.5,10),trim);col.position.set(x,1.9,-6.25);col.castShadow=true;group.add(col);}
 box(4.5,.34,2.1,0,3.62,-6.15,trim);box(4.65,.18,2.22,0,3.82,-6.18,blue);
 for(const x of[-1.65,1.65]){const beacon=new THREE.Mesh(new THREE.SphereGeometry(.17,10,10),new THREE.MeshBasicMaterial({color:0x389bff}));beacon.position.set(x,3.98,-7.1);group.add(beacon);}
 for(let st=0;st<3;st++)box(4.6-st*.3,.11,1.9-st*.28,0,.22+st*.09,-6.1,baseStone);
 const crest=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,12),gold);crest.rotation.x=Math.PI/2;crest.position.set(0,6.65,-5.64);group.add(crest);
 const face=new THREE.MeshStandardMaterial({map:roadSignTexture('قسم '+(name.includes('أول')?'أول':'ثاني')+' · أسيوط'),roughness:.4});
 const fascia=box(9.0,1.24,.12,0,4.55,-5.66,[iron,iron,iron,iron,iron,face]);fascia.name='StationWallSign';
 // هوائي اتصالات أعلى القسم وسارية العلم
 const tower=new THREE.Mesh(new THREE.CylinderGeometry(.04,.11,3.2,6),iron);tower.position.set(4.5,11.9,1.5);group.add(tower);
 for(const x of[-7,7]){box(.40,2.8,.40,x,1.4,-9.5,trim);for(let j=0;j<6;j++)box(.05,1.15,.06,x+(x<0?j*.38:-j*.38),1.0,-9.5,iron);}
 // كشك حراسة وبوابة حواجز بألوان الشرطة والمرور
 box(1.75,2.45,1.75,5.3,1.35,-8.1,trim);box(1.9,.18,1.9,5.3,2.65,-8.1,blue);box(1.3,1.05,1.8,5.3,1.65,-8.1,glass);
 box(2.4,.68,.46,-3.8,.45,-9.5,new THREE.MeshStandardMaterial({color:0xd8d8d0,roughness:.9}));box(.7,.70,.48,-3.8,.46,-9.5,blue);
 box(2.4,.68,.46,3.1,.45,-9.5,new THREE.MeshStandardMaterial({color:0xc93b36,roughness:.85}));
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,7.4,8),iron);mast.position.set(-6.5,3.7,-7);group.add(mast);
 for(let i=0;i<3;i++){const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.28),new THREE.MeshStandardMaterial({color:[0xc82530,0xf6f3ea,0x151d26][i],side:THREE.DoubleSide,roughness:.8}));flag.position.set(-5.82,7.1-i*.28,-7);group.add(flag);}
 const paving=box(23,.16,19,0,.10,-2.7,new THREE.MeshStandardMaterial({color:0x9ea299,roughness:.93}));paving.receiveShadow=true;
 return group;
}
function createStationArrivalBay(station){
 const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:0x236e69,roughness:.9}),white=new THREE.MeshBasicMaterial({color:0xebf4df});
 const floor=new THREE.Mesh(new THREE.BoxGeometry(8,.035,3.4),paint);floor.position.y=.19;group.add(floor);
 for(const z of[-1.65,1.65]){const line=new THREE.Mesh(new THREE.BoxGeometry(8,.012,.10),white);line.position.set(0,.215,z);group.add(line);}for(const x of[-3.95,3.95]){const line=new THREE.Mesh(new THREE.BoxGeometry(.10,.012,3.4),white);line.position.set(x,.215,0);group.add(line);}
 const word=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.85),new THREE.MeshStandardMaterial({map:roadSignTexture('منطقة التسليم'),roughness:.8}));word.rotation.x=-Math.PI/2;word.position.y=.223;group.add(word);group.position.set(station.stop.x,0,station.stop.z);group.rotation.y=-Math.atan2(station.tz,station.tx);REAL_CITY.group.add(group);station.bay=group;
}
function policeStationArrival(station){const dx=car.x-station.stop.x,dz=car.z-station.stop.z;return Math.abs(dx*station.tx+dz*station.tz)<6&&Math.abs(dx*station.nx+dz*station.nz)<3.5&&Math.abs(car.y-.18)<.9;}

/* ========================= 75-recorded-radio.js ========================= */
/* Invisible role-specific MP3 playlists. Local server scans folders on every refresh. */
const RADIO={audio:null,signature:'',blocked:false,mode:'',tracks:{police:[],uber:[]},bag:[],last:'',failed:new Set(),loading:false,refreshAt:0};
function shuffledTracks(tracks,last){const bag=[...tracks];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag[bag.length-1]===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];return bag;}
async function refreshMusicFolders(){
 if(RADIO.loading)return;RADIO.loading=true;RADIO.refreshAt=Date.now()+60000;
 try{
  const r=await fetch('assets/music/playlist.json',{cache:'no-store'});
  if(r.ok){
   const data=await r.json();
   for(const role of ['police','uber']){
    const list=(data[role]||[]).filter(s=>typeof s==='string'&&s.startsWith('assets/music/'+role+'/')&&/\.mp3$/i.test(s));
    if(list.length)RADIO.tracks[role]=list;
   }
  }
 }catch{}finally{RADIO.loading=false;syncRecordedRadio();}
}
function nextRoleSong(){
 const available=(RADIO.tracks[RADIO.mode]||[]).filter(s=>!RADIO.failed.has(s));
 if(!available.length){RADIO.audio?.pause();return;}
 if(!RADIO.bag.length)RADIO.bag=shuffledTracks(available,RADIO.last);
 const src=RADIO.bag.pop();if(!available.includes(src)){nextRoleSong();return;}
 RADIO.last=src;RADIO.audio.src=src;RADIO.blocked=false;
 if(G.music&&G.sound&&G.state==='play')RADIO.audio.play().catch(()=>{RADIO.blocked=true;});
}
function syncRecordedRadio(){
 syncCityAmbience();
 const role=G.mode==='police'?'police':'uber',on=G.music&&G.sound&&G.state==='play';
 if(Date.now()>RADIO.refreshAt&&!RADIO.loading&&typeof fetch==='function')void refreshMusicFolders();
 if(RADIO.mode!==role){RADIO.mode=role;RADIO.bag=[];RADIO.last='';RADIO.failed.clear();if(RADIO.audio){RADIO.audio.pause();RADIO.audio.removeAttribute('src');}}
 if(typeof window.Audio!=='function')return;
 if(!RADIO.audio){RADIO.audio=new Audio();RADIO.audio.controls=false;RADIO.audio.preload='none';RADIO.audio.onended=nextRoleSong;RADIO.audio.onerror=()=>{RADIO.failed.add(RADIO.last);nextRoleSong();};}
 const tracks=RADIO.tracks[role]||[];
 if(!tracks.length){RADIO.audio.pause();return;}
 if(MUSIC.timer){clearInterval(MUSIC.timer);MUSIC.timer=null;}if(MUSIC.gain&&AC)MUSIC.gain.gain.setTargetAtTime(0,AC.currentTime,.15);
 const sirenActive=role==='police'&&typeof POLICE!=='undefined'&&POLICE.siren;
 RADIO.audio.volume=sirenActive?.1:.32;
 if(on){if(!RADIO.last)nextRoleSong();else if(RADIO.audio.paused&&!RADIO.blocked&&!RADIO.failed.has(RADIO.last))RADIO.audio.play().catch(()=>{RADIO.blocked=true;});}else RADIO.audio.pause();
}

/* ========================= 76-navigation.js ========================= */
/* Directed navigation on the real OpenStreetMap graph, including one-way streets. */
const NAV_STREET_SPECS=[];
const DRIVER_ROADS={nodes:ASSYUT.nodes,edges:ASSYUT.edges,adj:ASSYUT.adj};
{
 const n=ASSYUT.nodes.length,seen=new Uint8Array(n),order=[],reverse=Array.from({length:n},()=>[]);
 for(const e of ASSYUT.edges)reverse[e.b].push(e.a);
 for(let root=0;root<n;root++){if(seen[root])continue;const stack=[[root,0]];seen[root]=1;while(stack.length){const top=stack[stack.length-1],adj=ASSYUT.adj[top[0]];if(top[1]<adj.length){const v=adj[top[1]++].to;if(!seen[v]){seen[v]=1;stack.push([v,0]);}}else{order.push(top[0]);stack.pop();}}}
 const labels=new Int32Array(n).fill(-1),groups=[];
 for(let i=order.length-1;i>=0;i--){const root=order[i];if(labels[root]>=0)continue;const id=groups.length,list=[],stack=[root];labels[root]=id;while(stack.length){const u=stack.pop();list.push(u);for(const v of reverse[u])if(labels[v]<0){labels[v]=id;stack.push(v);}}groups.push(list);}
 const largest=groups.reduce((a,b)=>b.length>a.length?b:a,[]),allowed=new Set(largest);ASSYUT.navigableNodes=allowed;
 const places=ASSYUT.places.filter(p=>{const near=nearestAssyutRoad(p);return allowed.has(near.segment.aNode)&&allowed.has(near.segment.bNode);});
 ASSYUT.places=places.length>2?places:ASSYUT.places;MAP.places=ASSYUT.places;PLACES.splice(0,PLACES.length,...ASSYUT.places);
 // Start on a clear ground-level lane, facing its permitted traffic direction.
 const spawnEdges=ASSYUT.edges.filter(e=>allowed.has(e.a)&&allowed.has(e.b)&&e.length>28&&ASSYUT.roads[e.road].width>=9&&!INFRA.profiles.has(e.road)).sort((a,b)=>{const x=ASSYUT.nodes[a.a],y=ASSYUT.nodes[a.b],u=ASSYUT.nodes[b.a],v=ASSYUT.nodes[b.b];return Math.hypot((x.x+y.x)/2,(x.z+y.z)/2)-Math.hypot((u.x+v.x)/2,(u.z+v.z)/2);});
 const galaaEdge=spawnEdges.find(e=>(ASSYUT.roads[e.road]?.name?.includes("الجلاء")||e.segment===5)&&!driveSurfaceCandidates((ASSYUT.nodes[e.a].x+ASSYUT.nodes[e.b].x)/2,(ASSYUT.nodes[e.a].z+ASSYUT.nodes[e.b].z)/2).some(p=>INFRA.profiles.has(p.road)));
 const edge=galaaEdge||spawnEdges.find(e=>{const f=edgeFrame(e),x=(f.a.x+f.b.x)/2,z=(f.a.z+f.b.z)/2;return !driveSurfaceCandidates(x,z).some(p=>INFRA.profiles.has(p.road));})||spawnEdges[0];
 if(edge){const f=edgeFrame(edge);ASSYUT.start={x:(f.a.x+f.b.x)/2-f.fz*2,z:(f.a.z+f.b.z)/2+f.fx*2,heading:Math.atan2(-f.fz,f.fx),segment:edge.segment,road:edge.road};car.x=ASSYUT.start.x;car.z=ASSYUT.start.z;car.heading=ASSYUT.start.heading;car.y=0;car.surfaceRoad=edge.road;}

}
function closestRoadEdges(point){
 let near=nearestAssyutRoad(point);if(Number.isInteger(point.roadIndex)&&ASSYUT.roads[point.roadIndex]){let best=null;for(const index of ASSYUT.roads[point.roadIndex].segments){const s=ASSYUT.segments[index],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((point.x-s.a.x)*dx+(point.z-s.a.z)*dz)/(s.length*s.length),0,1),p={x:s.a.x+dx*t,z:s.a.z+dz*t},distance=Math.hypot(point.x-p.x,point.z-p.z);if(!best||distance<best.distance)best={index,t,point:p,distance};}if(best&&best.distance<18)near=best;}if(!near)return [];
 return ASSYUT.edges.filter(e=>e.segment===near.index).map(edge=>({edge,t:edge.dir===1?near.t:1-near.t,point:{...near.point},distance:near.distance}));
}
function roadRoute(from,to){
 const starts=closestRoadEdges(from),ends=closestRoadEdges(to),n=ASSYUT.nodes.length,start=n,goal=n+1,extra=new Map(),put=(a,e)=>{if(!extra.has(a))extra.set(a,[]);extra.get(a).push(e);};
 const useHeading=Number.isFinite(from.heading)&&(from.speed||0)>1.8,fx=useHeading?Math.cos(from.heading):0,fz=useHeading?-Math.sin(from.heading):0;
 for(const s of starts){let pen=0;if(useHeading&&s.edge.length>.5){const na=ASSYUT.nodes[s.edge.a],nb=ASSYUT.nodes[s.edge.b],dot=((nb.x-na.x)*fx+(nb.z-na.z)*fz)/s.edge.length;if(dot<-.25)pen=(1-dot)*45;}put(start,{to:s.edge.b,cost:s.distance+(1-s.t)*s.edge.length+pen,via:{...s.point,roadIndex:s.edge.road}});}
 for(const e of ends)put(e.edge.a,{to:goal,cost:e.t*e.edge.length+e.distance,via:{...e.point,roadIndex:e.edge.road}});
 for(const s of starts)for(const e of ends)if(s.edge===e.edge&&e.t>=s.t)put(start,{to:goal,cost:s.distance+(e.t-s.t)*s.edge.length+e.distance,via:{...s.point,roadIndex:s.edge.road},viaEnd:{...e.point,roadIndex:e.edge.road}});
 const costs=new Float64Array(n+2).fill(Infinity),prev=Array(n+2),heap=[];costs[start]=0;
 const push=(node,cost)=>{let i=heap.length;heap.push({node,cost});while(i>0){const p=(i-1)>>1;if(heap[p].cost<=cost)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let k=i,l=i*2+1,r=l+1;if(l<heap.length&&heap[l].cost<heap[k].cost)k=l;if(r<heap.length&&heap[r].cost<heap[k].cost)k=r;if(k===i)break;[heap[k],heap[i]]=[heap[i],heap[k]];i=k;}}return first;};
 push(start,0);
 while(heap.length){const {node:u,cost}=pop();if(cost>costs[u])continue;if(u===goal)break;for(const e of [...(ASSYUT.adj[u]||[]),...(extra.get(u)||[])]){const sum=cost+e.cost;if(sum<costs[e.to]){costs[e.to]=sum;prev[e.to]={u,e};push(e.to,sum);}}}
 if(!Number.isFinite(costs[goal]))return {points:[{...from}],length:Infinity,reachable:false};
 const chain=[];let cur=goal;while(cur!==start&&prev[cur]){chain.push(prev[cur]);cur=prev[cur].u;}chain.reverse();
 const points=[{...from}];for(const {e}of chain){if(e.via)points.push({...e.via});if(e.viaEnd)points.push({...e.viaEnd});if(e.to<n)points.push({...ASSYUT.nodes[e.to],roadIndex:Number.isInteger(e.edge)?ASSYUT.edges[e.edge].road:e.via?.roadIndex});}points.push({...to});
 return {points:points.filter((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.1),length:costs[goal],reachable:true};
}
function riderRoadStop(point){return assyutRoadStop(point);}

function refreshRideNavigation(){
 const target=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ,roadIndex:M.pickupRoad}:M.phase==='toDest'?{x:M.destX,z:M.destZ,roadIndex:M.destRoad}:null;
 setNavigationTarget(target);
}
function rideNavigationAim(){
 const nav=RIDE.navigation;if(!nav?.reachable)return null;const p=nav.points,progress=navigationProgress(nav);if(!progress)return p[p.length-1];
 const final=nav.target||p[p.length-1];
 let left=clamp(Math.abs(car.speed)*.45+5,5,11),a=progress;
 for(let i=progress.index;i<p.length-1;i++){
  const b=p[i+1],distance=Math.hypot(b.x-a.x,b.z-a.z);
  if(left<=distance){const t=left/Math.max(.01,distance);return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),roadIndex:b.roadIndex};}
  left-=distance;
  // Show the corner itself until reached, never aim diagonally across the block.
  if(i<p.length-2&&distance>2){const c=p[i+2],ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z;if((ux*vx+uz*vz)/Math.max(.01,distance*Math.hypot(vx,vz))<.94)return b;}
  a=b;
 }
 return final;
}
function navigationArrowTarget(lookAhead=20){
 const nav=RIDE.navigation;if(!nav?.reachable)return null;const p=nav.points,progress=navigationProgress(nav);if(!progress)return p[p.length-1];
 const final=nav.target||p[p.length-1];
 let left=clamp(Math.max(lookAhead,Math.abs(car.speed)*.7+15),14,28),a=progress,walked=0;
 for(let i=progress.index;i<p.length-1;i++){
  const b=p[i+1],distance=Math.hypot(b.x-a.x,b.z-a.z);
  if(distance<.05){a=b;continue;}
  if(left<=distance){const t=left/distance;return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),roadIndex:b.roadIndex};}
  left-=distance;walked+=distance;
  if(walked>4&&i<p.length-2&&distance>2){const c=p[i+2],ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z;if((ux*vx+uz*vz)/Math.max(.01,distance*Math.hypot(vx,vz))<.92)return b;}
  a=b;
 }
 return final;
}
function navigationArrowGuide(){
 const nav=RIDE.navigation;if(!nav?.reachable)return null;
 const pts=remainingNavigationPoints(),final=nav.target||pts[pts.length-1];
 if(pts.length<2)return {lead:0,guide:final,final};
 let walked=0,cornerDist=Infinity,guide=final;
 for(let i=0;i<pts.length-1;i++){
  const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<.05)continue;
  if(i<pts.length-2&&cornerDist===Infinity){
   const c=pts[i+2],len2=Math.hypot(c.x-b.x,c.z-b.z);
   if(len2>.5&&((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z))/(len*len2)<.86)cornerDist=walked+len;
  }
  walked+=len;
 }
 const lead=cornerDist<15?clamp(cornerDist,7,15):15;
 const sampleAt=dist=>{let rem=dist;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<.05)continue;if(rem<=len){const t=rem/len;return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),roadIndex:b.roadIndex};}rem-=len;}return final;};
 const guideDist=cornerDist<15?cornerDist+12:Math.min(lead+12,cornerDist<Infinity?cornerDist:lead+12);
 guide=sampleAt(guideDist);
 return {lead,guide,final};
}

function curbsideRidePlace(place){const p=nearestAssyutRoad(place);if(!p)return {...place};const side=p.side;return {...place,x:p.point.x+p.nx*side*(p.width/2+1),z:p.point.z+p.nz*side*(p.width/2+1)};}

// Keep progress along one route; do not send the driver back to each fresh projection.
function navigationProgress(nav){
 const p=nav?.points;if(!p?.length)return null;const startIdx=Math.max(0,(nav.cursor||0)-2);let best=null,span=0;
 for(let i=startIdx;i<Math.min(p.length-1,startIdx+30);i++){const a=p[i],b=p[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.01)continue;const t=clamp(((car.x-a.x)*dx+(car.z-a.z)*dz)/(len*len),0,1),x=a.x+dx*t,z=a.z+dz*t,d=Math.hypot(x-car.x,z-car.z);if(!best||d<best.distance-.12)best={index:i,t,x,z,distance:d,len};if(i>=startIdx+2){span+=len;if(span>180)break;}}
 if(!best)return {index:0,t:1,x:p[0].x,z:p[0].z,distance:Math.hypot(car.x-p[0].x,car.z-p[0].z),len:0};
 nav.cursor=best.index;let remaining=(1-best.t)*best.len;for(let i=best.index+1;i<p.length-1;i++)remaining+=Math.hypot(p[i+1].x-p[i].x,p[i+1].z-p[i].z);nav.remaining=remaining;return best;
}
function setNavigationTarget(target){
 if(!target){RIDE.navigation=null;return;}
 let nav=RIDE.navigation,progress=navigationProgress(nav);
 if(!nav?.reachable||!nav.target||Math.hypot(nav.target.x-target.x,nav.target.z-target.z)>.5||!progress||progress.distance>28){nav=roadRoute({x:car.x,z:car.z,roadIndex:car.surfaceRoad,heading:car.heading,speed:car.speed},target);nav.target={...target};nav.cursor=0;RIDE.navigation=nav;RIDE.navIndex=1;navigationProgress(nav);}
}
function nearbyNavigationStop(from,minDistance=65,maxDistance=350){
 const candidates=ASSYUT.segments.filter(s=>{
  if(s.width<7||s.length<=18||INFRA.profiles.has(s.road)||!ASSYUT.navigableNodes.has(s.aNode)||!ASSYUT.navigableNodes.has(s.bNode))return false;
  const d=Math.hypot((s.a.x+s.b.x)/2-from.x,(s.a.z+s.b.z)/2-from.z);
  return d>=minDistance*0.7&&d<=maxDistance*0.95;
 });
 for(let tries=0;tries<Math.min(18,candidates.length);tries++){const index=Math.floor(Math.random()*candidates.length),s=candidates.splice(index,1)[0],offset=Math.max(.5,s.width/2-2),nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,sign=ASSYUT.roads[s.road].oneway==='-1'?-1:1,p={x:(s.a.x+s.b.x)/2+nx*offset*sign,z:(s.a.z+s.b.z)/2+nz*offset*sign,roadIndex:s.road,name:ASSYUT.roads[s.road].name},route=roadRoute(from,p);if(route.reachable&&route.length>=minDistance&&route.length<=maxDistance)return {...p,route};}
 return null;
}
function remainingNavigationPoints(){const nav=RIDE.navigation,p=navigationProgress(nav);return p?[{x:p.x,z:p.z},...nav.points.slice(p.index+1)]:nav?.points||[];}
function renderRouteGuidance(){const panel=$('routeGuidance');if(!panel)return;const aim=rideNavigationAim(),nav=RIDE.navigation,active=G.state==='play'&&!!aim&&!!nav?.target;panel.classList.toggle('hidden',!active);if(!active)return;const dx=aim.x-car.x,dz=aim.z-car.z,fx=Math.cos(car.heading),fz=-Math.sin(car.heading),angle=Math.atan2(dx*(-fz)+dz*fx,dx*fx+dz*fz),near=(nav.remaining??Infinity)<14;panel.textContent=near?'◎ قف داخل الدائرة المضيئة لإنهاء المرحلة':`${Math.abs(angle)>2.3?'↶ لف وارجع بأمان':angle>.45?'↱ اتجه يمينًا':angle<-.45?'↰ اتجه يسارًا':'↑ استمر للأمام'} · ${Math.ceil(nav.remaining??nav.length)} م متبقية`;}
function navigationStopHeight(point){if(Number.isFinite(point.height))return point.height;if(Number.isInteger(point.roadIndex)&&ASSYUT.roads[point.roadIndex]){let best=null;for(const index of ASSYUT.roads[point.roadIndex].segments){const s=ASSYUT.segments[index],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((point.x-s.a.x)*dx+(point.z-s.a.z)*dz)/(s.length*s.length),0,1),d=Math.hypot(point.x-s.a.x-dx*t,point.z-s.a.z-dz*t);if(!best||d<best.d)best={d,h:infrastructureHeight(s.road,s.s0+t*s.length)};}if(best)return best.h;}return assyutRoadHeightAt(point.x,point.z);}

/* ========================= 77-police-mode.js ========================= */
const POLICE={phase:'off',uberCarIdx:G.carIdx,nextIn:8,patrolTime:0,navTimer:0,hold:0,call:null,station:null,siren:false,completed:+store.get('assyut_police_completed','0')||0,nextStation:+store.get('assyut_police_next_station',String((+store.get('assyut_police_completed','0')||0)%2))%2,earned:0,clipToken:0,clipDone:false,actors:[],stations:[]};
function policeBusy(){return G.mode==='police'&&!['off','patrol'].includes(POLICE.phase);}
function policeTarget(){return POLICE.phase==='pursuit'&&POLICE.suspect?.mesh?{x:POLICE.suspect.mesh.position.x,z:POLICE.suspect.mesh.position.z,roadIndex:POLICE.suspect.edge?.road}:POLICE.phase==='respond'?POLICE.call?.stop:POLICE.phase==='transport'?POLICE.station?.stop:null;}
function navigablePoliceStop(point){let best=null;for(const seg of ASSYUT.segments){if(INFRA.profiles.has(seg.road)||!ASSYUT.navigableNodes.has(seg.aNode)||!ASSYUT.navigableNodes.has(seg.bNode))continue;const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,t=clamp(((point.x-seg.a.x)*dx+(point.z-seg.a.z)*dz)/(seg.length*seg.length),0,1),p={x:seg.a.x+dx*t,z:seg.a.z+dz*t},dist=Math.hypot(p.x-point.x,p.z-point.z);if(!best||dist<best.dist)best={dist,p,seg};}if(!best)return assyutRoadStop(point);const s=best.seg,dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length,offset=Math.max(.5,s.width/2-2),side=ASSYUT.roads[s.road].oneway==='-1'?-1:1;return{x:best.p.x-dz*offset*side,z:best.p.z+dx*offset*side,roadIndex:s.road};}
function createPoliceStations(){
 const definitions=[{name:'قسم أول',lat:27.1719625,lon:31.180828125},{name:'قسم ثاني',lat:27.1822362,lon:31.1969446}];
 for(let i=0;i<definitions.length;i++){
  const d=definitions[i],entrance=stationEntranceCandidate(i,POLICE.stations[0]);if(!entrance)throw Error('No clear station entrance');const {cx,cz,yaw}=entrance;
  for(let j=REAL_CITY.buildings.length-1;j>=0;j--){const b=REAL_CITY.buildings[j];if(Math.abs(b.x-cx)<b.w/2+20&&Math.abs(b.z-cz)<b.d/2+20){REAL_CITY.group.remove(b.mesh);REAL_CITY.buildings.splice(j,1);for(let k=MAP.buildings.length-1;k>=0;k--){const m=MAP.buildings[k];if(Math.abs((m.x0+m.x1)/2-b.x)<.1&&Math.abs((m.z0+m.z1)/2-b.z)<.1)MAP.buildings.splice(k,1);}}}
  for(const mesh of REAL_CITY.group.children.slice())if(mesh.isMesh&&['BoxGeometry','CylinderGeometry'].includes(mesh.geometry.type)&&Math.hypot(mesh.position.x-cx,mesh.position.z-cz)<22)REAL_CITY.group.remove(mesh);
  for(let j=ROAD_FURNITURE.length-1;j>=0;j--)if(Math.hypot(ROAD_FURNITURE[j].x-cx,ROAD_FURNITURE[j].z-cz)<22)ROAD_FURNITURE.splice(j,1);
  const group=makePoliceStationBuilding(d.name);group.position.set(cx,0,cz);group.rotation.y=yaw;REAL_CITY.group.add(group);
  const ex=Math.abs(Math.cos(yaw))*8+Math.abs(Math.sin(yaw))*5.5,ez=Math.abs(Math.sin(yaw))*8+Math.abs(Math.cos(yaw))*5.5;MAP.buildings.push({x0:cx-ex,x1:cx+ex,z0:cz-ez,z1:cz+ez,h:10.3,oriented:{x:cx,z:cz,heading:yaw,hl:8,hw:5.5}});
  STATION_SURFACES.push({x:cx,z:cz,yaw});
  const station={...d,...entrance,x:cx,z:cz,building:group};POLICE.stations.push(station);createStationArrivalBay(station);addMountedRoadSign(d.name+' ←',{x:station.stop.x-station.tx*22,z:station.stop.z-station.tz*22});
 }
}

function preparePoliceMode(mode){
 if(mode==='police'){if(G.mode!=='police')POLICE.uberCarIdx=G.carIdx;G.carIdx=CARS.indexOf(selectedPoliceVehicle());if(!G.owned.includes(CARS[G.carIdx].id))G.owned.push(CARS[G.carIdx].id);swapTaxi(G.carIdx);}
 else if(G.mode==='police'){G.carIdx=POLICE.uberCarIdx;swapTaxi(G.carIdx);stopPoliceShift();}
}
function clearPoliceSuspect(){if(!POLICE.suspect)return;const i=traffic.indexOf(POLICE.suspect);if(i>=0)traffic.splice(i,1);if(POLICE.suspect.mesh)scene.remove(POLICE.suspect.mesh);POLICE.suspect=null;}
function stopPoliceShift(){
 stopPoliceLiveClip();
 if(typeof clearPoliceActors==='function')clearPoliceActors();
 clearPoliceSuspect();
 POLICE.phase='off';
 POLICE.siren=false;
 POLICE.clipToken++;
 if(typeof destMarker!=='undefined')destMarker.visible=false;
 const panel=$('policeMovie');
 if(panel){panel.classList.add('hidden');panel.innerHTML='';}
 const dispatch=$('policeDispatch');
 if(dispatch)dispatch.classList.add('hidden');
 updateHUD();
}
function startPoliceShift(){clearDriverRequest();POLICE.phase='patrol';POLICE.nextIn=8;POLICE.patrolTime=0;POLICE.call=null;POLICE.station=null;POLICE.hold=0;POLICE.siren=false;POLICE.earned=0;M.phase='none';RIDE.navigation=null;setObjective('دورية شرطة أسيوط · تحرّك وانتظر البلاغ · J للتحكم بالسرينة',5000);renderPoliceDispatch();updateHUD();}
function issuePoliceCall(){
 if(POLICE.phase!=='patrol'||G.mode!=='police')return false;
 const stop=nearbyNavigationStop({x:car.x,z:car.z,roadIndex:car.surfaceRoad},60,350);if(!stop)return false;
 const station=POLICE.stations[POLICE.nextStation];if(!station)return false;
 const incidents=[
  {id:'brawl',label:'مشاجرة واعتداء في الطريق العام',speed:0},
  {id:'stolen',label:'ضبط سيارة مسروقة ومحاصرة الجناة',speed:0},
  {id:'checkpoint',label:'اشتباه واستيقاف أمني بالشارع',speed:0}
 ];
 const isTestEnv=typeof navigator!=='undefined'&&navigator.userAgent==='test';
 const pursuitCandidate=!isTestEnv&&POLICE.completed>0&&Math.random()<0.45&&typeof traffic!=='undefined'&&traffic.length?traffic.find(t=>t?.mesh&&Math.hypot(t.mesh.position.x-car.x,t.mesh.position.z-car.z)>60):null;
 if(pursuitCandidate){
  pursuitCandidate.policeSuspect=true;
  pursuitCandidate.baseSpeed=Math.max(pursuitCandidate.baseSpeed||14,19);
  POLICE.suspect=pursuitCandidate;
  POLICE.call={...stop,stop,count:1,type:'pursuit',label:'مطاردة سيارة هاربة ترفض التوقف'};
  POLICE.station=station;
  POLICE.phase='pursuit';
  POLICE.siren=true;
  POLICE.hold=0;
  M.phase='policeScene';
  pickupMarker.visible=false;
  destMarker.visible=false;
  refreshPoliceNavigation();
  setObjective('🚨 مطاردة جارية · لاحق السيارة الهاربة وحاصرها لإيقافها',5000);
  sfxPickup();
  renderPoliceDispatch();
  updateHUD();
  return true;
 }
 const incident=pick(incidents);
 POLICE.call={...stop,stop,count:2,type:incident.id,label:incident.label};
 POLICE.station=station;
 POLICE.phase='respond';
 POLICE.siren=true;
 POLICE.hold=0;
 M.phase='policeScene';
 pickupMarker.visible=false;
 destMarker.position.set(stop.x,navigationStopHeight(stop)+.08,stop.z);
 destMarker.visible=true;

 if(typeof spawnPoliceCrimeScene==='function')spawnPoliceCrimeScene(stop,incident);

 refreshPoliceNavigation();
 setObjective(`🚨 ${incident.label} · توجّه للموقع فوراً لتأمين المكان والقبض على المشتبه بهم`,5000);
 sfxPickup();
 renderPoliceDispatch();
 updateHUD();
 return true;
}
function refreshPoliceNavigation(){const target=policeTarget();if(!target){RIDE.navigation=null;return;}setNavigationTarget(target);POLICE.navTimer=2.5;}
function playPoliceClip(type){
 if(!['pursuit','respond','transport'].includes(POLICE.phase))return false;
 POLICE.phase=type==='arrest'?'arrestVideo':'handoffVideo';
 POLICE.siren=false;
 POLICE.clipDone=false;
 const token=++POLICE.clipToken;
 car.speed=0;car.vel.set(0,0);
 G.state='cinematic';
 pickupMarker.visible=false;destMarker.visible=false;
 for(const a of POLICE.actors)if(a)a.visible=false;
 updateHUD();

 const film=policeFilmFor(CARS[G.carIdx].id,type,POLICE.station);
 const panel=$('policeMovie');
 if(!panel)return false;
 const title=type==='arrest'?'تأمين الموقع والقبض على المشتبه بهم':`تسليم المشتبه بهم إلى ${POLICE.station?.name||'قسم الشرطة'}`;

 panel.innerHTML=`
  <video id="policeMovieVideo" playsinline preload="auto"></video>
  <div class="policeMovieInner">
   <div class="policeMovieHeader">
    <span class="policeMovieBadge">🚨 ${film?'مشهد تمثيلي':'مشهد ثلاثي الأبعاد'}</span>
    <h2 class="policeMovieTitle">${title}</h2>
   </div>
   <div class="policeMovieFooter">
    <button id="policeMovieMute" class="policeMovieBtn policeMovieMuteBtn">🔊 تشغيل الصوت</button>
    <button id="policeMovieSkip" class="policeMovieBtn">متابعة الدورية ⏭</button>
   </div>
  </div>`;
 panel.classList.remove('hidden');

 let clipTimer=null;
 const cleanupAndFinish=()=>{
  if(clipTimer){clearTimeout(clipTimer);clipTimer=null;}
  finishPoliceClip(token);
 };
 const skipBtn=$('policeMovieSkip');
 if(skipBtn)skipBtn.onclick=cleanupAndFinish;

 if(!film){
  playPoliceLiveClip(type,token);
  renderPoliceDispatch();
  return true;
 }

 const video=$('policeMovieVideo');
 const muteBtn=$('policeMovieMute');
 if(!video){
  playPoliceLiveClip(type,token);
  renderPoliceDispatch();
  return true;
 }

 video.src=film.src;
 video.muted=!G.sound;
 if(muteBtn){
  muteBtn.textContent=video.muted?'🔇 الصوت مكتوم':'🔊 كتم الصوت';
  muteBtn.onclick=()=>{
   video.muted=!video.muted;
   muteBtn.textContent=video.muted?'🔇 الصوت مكتوم':'🔊 كتم الصوت';
  };
 }

 video.onended=cleanupAndFinish;
 video.onerror=e=>{
  console.warn('Police video error, falling back to 3D clip',e);
  if(!POLICE.clipDone&&token===POLICE.clipToken){
   playPoliceLiveClip(type,token);
  }
 };

 if(typeof video.play==='function'){
  const p=video.play();
  if(p&&typeof p.catch==='function'){
   p.catch(err=>{
    console.warn('Police video autoplay with sound blocked, trying muted',err);
    video.muted=true;
    if(muteBtn)muteBtn.textContent='🔇 اضغط لتشغيل الصوت';
    if(typeof video.play==='function'){
     video.play().catch(err2=>{
      console.warn('Muted autoplay failed, switching to 3D clip',err2);
      playPoliceLiveClip(type,token);
     });
    }
   });
  }
 }

 clipTimer=setTimeout(()=>{
  if(!POLICE.clipDone&&token===POLICE.clipToken&&(!video.currentTime||video.currentTime<0.1)){
   console.warn('Police video timed out, switching to 3D live clip');
   playPoliceLiveClip(type,token);
  }
 },4000);

 renderPoliceDispatch();
 return true;
}
function finishPoliceClip(token=POLICE.clipToken){
 if(token!==POLICE.clipToken||POLICE.clipDone||!['arrestVideo','handoffVideo'].includes(POLICE.phase))return false;
 stopPoliceLiveClip();
 POLICE.clipDone=true;
 const panel=$('policeMovie');
 if(panel){
  panel.classList.add('hidden');
  panel.innerHTML='';
 }
 G.state='play';
 POLICE.hold=0;

 if(POLICE.phase==='arrestVideo'){
  if(typeof clearPoliceActors==='function')clearPoliceActors();
  clearPoliceSuspect();
  POLICE.phase='transport';
  POLICE.siren=true;
  M.phase='policeReturn';
  RIDE.navigation=null;
  const p=POLICE.station.stop;
  destMarker.position.set(p.x,navigationStopHeight(p)+.08,p.z);
  destMarker.visible=true;
  refreshPoliceNavigation();
  if(typeof spawnPoliceStationOfficers==='function')spawnPoliceStationOfficers(POLICE.station);
  setObjective(`تم تأمين الموقع · انقل المشتبه بهم فوراً إلى ${POLICE.station.name}`,5000);
 }else{
  if(typeof clearPoliceActors==='function')clearPoliceActors();
  POLICE.phase='patrol';
  POLICE.siren=false;
  M.phase='none';
  POLICE.completed++;
  POLICE.nextStation=1-POLICE.stations.indexOf(POLICE.station);
  store.set('assyut_police_next_station',POLICE.nextStation);
  POLICE.earned+=180;
  G.money+=180;
  G.xp+=65;
  store.set('assyut_police_completed',POLICE.completed);
  saveProgress();
  RIDE.navigation=null;
  destMarker.visible=false;
  POLICE.nextIn=rand(12,20);
  sfxCash();
  setObjective('تم التسليم بنجاح · مكافأة المهمة 180 ج.م · استأنف الدورية',5000);
 }
 renderPoliceDispatch();
 updateHUD();
 return true;
}
function updatePoliceMission(dt){
 if(G.mode!=='police')return;
 POLICE.navTimer-=dt;
 if(POLICE.phase==='patrol'){
  POLICE.patrolTime+=dt;POLICE.nextIn-=dt;
  if(POLICE.nextIn<=0&&(Math.abs(car.speed)>.5||POLICE.patrolTime>18))issuePoliceCall();
  return;
 }
 if(typeof updatePoliceActors==='function')updatePoliceActors(dt);

 const target=policeTarget();
 if(!target)return;
 if(POLICE.navTimer<=0)refreshPoliceNavigation();
 const distance=Math.hypot(target.x-car.x,target.z-car.z),stopped=Math.hypot(car.vel.x,car.vel.y)<1.2;

 if(POLICE.phase==='pursuit'){
  if(!POLICE.suspect||!POLICE.suspect.mesh){POLICE.phase='respond';}
  else{
   POLICE.suspect.speed=Math.max(POLICE.suspect.speed||18,18);
   if(distance<11){
    POLICE.hold+=dt;
    showPrompt(`🚨 جاري محاصرة السيارة الهاربة (${Math.min(100,Math.round((POLICE.hold/1.2)*100))}%)`);
    if(POLICE.hold>=1.2){POLICE.suspect.speed=0;playPoliceClip('arrest');}
   }else{
    POLICE.hold=0;
    if(distance<35)showPrompt('اقترب من السيارة الهاربة واعترض طريقها لإيقافها');
    else hidePrompt();
   }
  }
 }else if(POLICE.phase==='respond'){
  if(distance<10&&Math.abs(car.y-navigationStopHeight(target))<2.2&&stopped){
   POLICE.hold+=dt;
   showPrompt(`🚨 جاري تأمين الموقع ونقل المتهمين إلى الدورية (${Math.min(100,Math.round((POLICE.hold/1.0)*100))}%)`);
   if(POLICE.hold>=1.0)playPoliceClip('arrest');
  }else{
   POLICE.hold=0;
   if(distance<30)showPrompt('اقترب من القوة الأمنية وتوقّف لتأمين الموقع واستلام المقبوض عليهم');
   else hidePrompt();
  }
 }else if(POLICE.phase==='transport'){
  if(policeStationArrival(POLICE.station)&&stopped){
   POLICE.hold+=dt;
   showPrompt(`🚨 جاري تسليم المقبوض عليهم أمام ${POLICE.station.name} (${Math.min(100,Math.round((POLICE.hold/1.0)*100))}%)`);
   if(POLICE.hold>=1.0)playPoliceClip('handoff');
  }else{
   POLICE.hold=0;
   if(distance<28)showPrompt('قف داخل منطقة التسليم المحددة أمام '+POLICE.station.name);
   else hidePrompt();
  }
 }
}
function renderPoliceDispatch(){const panel=$('policeDispatch');if(!panel)return;const active=G.mode==='police'&&G.state!=='menu';panel.classList.toggle('hidden',!active);if(!active)return;const target=policeTarget(),distance=target?Math.round(RIDE.navigation?.remaining??Math.hypot(target.x-car.x,target.z-car.z)):0;const title=POLICE.phase==='patrol'?'دورية جارية · انتظار بلاغ':POLICE.phase==='pursuit'?'🚨 مطاردة جارية':POLICE.phase==='respond'?'🚨 بلاغ جديد':'التسليم: '+POLICE.station.name;const html=`<small>شرطة أسيوط · غرفة العمليات</small><b>${title}</b><span>${POLICE.phase==='pursuit'?(POLICE.call?.label||'مشتبه به هارب'):POLICE.phase==='respond'?POLICE.call.name:POLICE.phase==='patrol'?'تحرّك داخل المدينة':POLICE.station.name}${target?' · '+distance+' م':''}</span><small>مهمات مكتملة ${POLICE.completed} · J للسرينة · K لتغيير النغمة</small>`;if(panel._lastHtml!==html){panel._lastHtml=html;panel.innerHTML=html;}}
createPoliceStations();ROUTE_OBSTACLES.version=-1;
addEventListener('keydown',e=>{
  if(G.mode==='police'&&G.state==='play'){
    if(e.code==='KeyJ'&&!e.repeat){POLICE.siren=!POLICE.siren;updateHUD();}
    if(e.code==='KeyK'&&!e.repeat&&POLICE.siren){
      const tones=['auto','wail','yelp','hilo'];
      const nextIdx=(tones.indexOf(POLICE.sirenTone||'auto')+1)%tones.length;
      POLICE.sirenTone=tones[nextIdx];
      const names={auto:'تلقائي ذكي (حسب السرعة والدورية)',wail:'عويل كلاسيكي (Wail)',yelp:'يلب سريع (Yelp)',hilo:'ثنائية النغمة (Hi-Lo)'};
      if(typeof showPrompt==='function'){
        showPrompt(`🚨 نغمة السرينة: ${names[POLICE.sirenTone]}`);
        setTimeout(()=>{if(typeof hidePrompt==='function')hidePrompt();},2200);
      }
      updateHUD();
    }
  }
});

function stopPoliceLiveClip(){if(POLICE.liveFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(POLICE.liveFrame);POLICE.liveFrame=0;if(POLICE.movieRenderer){POLICE.movieRenderer.domElement.remove();POLICE.movieRenderer.dispose();POLICE.movieRenderer.forceContextLoss();POLICE.movieRenderer=null;}}
function playPoliceLiveClip(kind,token){
 stopPoliceLiveClip();
 const panel=$('policeMovie');
 if(!panel)return;
 const badge=panel.querySelector?.('.policeMovieBadge')||panel.querySelector?.('small');
 if(badge)badge.textContent='🚨 مشهد ثلاثي الأبعاد';

 const movie=createPoliceMovie(kind,POLICE.station?.name||'قسم أول'),renderer=new THREE.WebGLRenderer({antialias:true}),scale=Math.min(1,1280/innerWidth,720/innerHeight);
 renderer.setSize(Math.round(innerWidth*scale),Math.round(innerHeight*scale));
 movie.camera.aspect=innerWidth/innerHeight;
 movie.camera.updateProjectionMatrix();
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.domElement.style='position:absolute;inset:0;display:block;width:100vw;height:100dvh;object-fit:cover;z-index:1;';
 POLICE.movieRenderer=renderer;
 const video=$('policeMovieVideo');
 if(video)video.replaceWith(renderer.domElement);
 else panel.prepend(renderer.domElement);
 const skipBtn=$('policeMovieSkip');
 if(skipBtn)skipBtn.onclick=()=>finishPoliceClip(token);
 const start=performance.now();
 const frame=()=>{if(token!==POLICE.clipToken||POLICE.clipDone||!POLICE.movieRenderer)return;const t=Math.min(6,(performance.now()-start)/1000);movie.update(t);renderer.render(movie.scene,movie.camera);if(t>=6){finishPoliceClip(token);return;}POLICE.liveFrame=requestAnimationFrame(frame);};
 POLICE.liveFrame=requestAnimationFrame(frame);
}

/* ========================= 78-driver.js ========================= */
/* Ride lifecycle and wallet transactions. An offered destination and fare are immutable. */
const RIDE={online:true,offer:null,offerLeft:0,nextIn:5,receipt:null,receiptLeft:0,expanded:false,sessionEarned:0,sessionTrips:0,declined:0,sequence:0,navigation:null,navIndex:1,navTimer:0,notice:''};
const DRIVER_NAMES=['أحمد','مريم','محمد','سارة','يوسف','نور','مصطفى','دينا','عمر','فاطمة'];
const RIDE_PREFERENCES=[
 {id:'quiet',label:'عايز هدوء',icon:'🤫'},
 {id:'radio',label:'شغّل الراديو',icon:'📻'},
 {id:'smooth',label:'سواقة هادية',icon:'🫶'},
 {id:'fast',label:'مستعجل',icon:'⏱️'}
];
const PAINT_PRICE=250;
function rideBusy(){return M.phase==='toPick'||M.phase==='toDest'||(G.mode==='police'&&policeBusy());}
function currentCarCondition(){const id=(CARS[G.carIdx]||CARS[0]).id;return clamp(Number.isFinite(G.conditions[id])?G.conditions[id]:100,0,100);}
function repairPrice(){const missing=100-currentCarCondition();return missing<.05?0:Math.ceil(40+missing*4);}
function applyVehicleDamage(impact){
 if(impact<2)return;
 const id=(CARS[G.carIdx]||CARS[0]).id;
 G.conditions[id]=Math.max(0,currentCarCondition()-clamp((impact-1.4)*.65,.5,17));
 applyCarStats();saveProgress();
}
function clearDriverRequest(){RIDE.offer=null;RIDE.offerLeft=0;RIDE.navigation=null;RIDE.receipt=null;RIDE.receiptLeft=0;RIDE.expanded=false;}
function startDriverShift(){
 clearDriverRequest();RIDE.online=true;RIDE.nextIn=5;RIDE.sessionEarned=0;RIDE.sessionTrips=0;RIDE.notice='أنت متصل — تحرّك وانتظر طلبًا قريبًا';M.phase='none';M.respawn=0;
 passenger.visible=false;pickupMarker.visible=false;destMarker.visible=false;
 renderDriverPhone(true);setObjective('أنت متصل الآن · أول طلب سيظهر على هاتفك',4000);
}
function makeRideOffer(){
 if(RIDE.offer||RIDE.receipt||rideBusy()||!RIDE.online)return null;
 const pickup=nearbyNavigationStop({x:car.x,z:car.z,roadIndex:car.surfaceRoad},60,300);if(!pickup){RIDE.nextIn=3;return null;}
 const dest=nearbyNavigationStop(pickup,120,450);if(!dest){RIDE.nextIn=3;return null;}
 const route=roadRoute(pickup,dest);
 const approach=roadRoute({x:car.x,z:car.z,roadIndex:car.surfaceRoad},pickup);
 if(!Number.isFinite(route.length)||!Number.isFinite(approach.length)){RIDE.nextIn=3;return null;}
 const w=WEATHERS.find(w=>w.id===G.weather)||WEATHERS[0];
 const fare=Math.max(45,Math.round((24+route.length*.105)*w.fareBonus/5)*5);
 const preference=pick(RIDE_PREFERENCES);
 const offer={id:++RIDE.sequence,pickup:{...pickup},dest:{...dest},name:pick(DRIVER_NAMES),pType:pick(PASSENGER_TYPES),preference,fare:Math.round(fare*(preference.id==='fast'?1.08:1)),distance:Math.round(route.length),pickupDistance:Math.round(approach.length),minutes:Math.max(1,Math.ceil(route.length/12/60)),route};
 RIDE.offer=offer;RIDE.offerLeft=22;RIDE.expanded=true;RIDE.notice='طلب رحلة جديد';
 sfxPickup();renderDriverPhone(true);return offer;
}
function acceptRideOffer(){
 if(!RIDE.offer||RIDE.offerLeft<=0||rideBusy()||G.state!=='play')return false;
 const o=RIDE.offer;
 M.phase='toPick';M.pickupX=o.pickup.x;M.pickupZ=o.pickup.z;M.pickupName=o.pickup.name;M.pickupRoad=o.pickup.roadIndex;
 M.destX=o.dest.x;M.destZ=o.dest.z;M.destName=o.dest.name;M.destRoad=o.dest.roadIndex;
 M.pType=o.pType;M.preference=o.preference;M.riderName=o.name;M.baseFare=o.fare;M.fare=o.fare;M.quotedFare=o.fare;M.tripDistance=o.distance;M.offerId=o.id;
 M.hits=0;M.speedViolations=0;M.comfortPenalty=0;M.hold=0;M.tripTime=0;M.timer=0;M.boss=false;M.after=null;M.respawn=0;
 RIDE.offer=null;RIDE.offerLeft=0;RIDE.receipt=null;RIDE.navTimer=0;
 passenger.position.set(M.pickupX,assyutRoadHeightAt(M.pickupX,M.pickupZ)+.18,M.pickupZ);passenger.visible=true;
 pickupMarker.position.set(M.pickupX,navigationStopHeight({x:M.pickupX,z:M.pickupZ,roadIndex:M.pickupRoad})+.08,M.pickupZ);pickupMarker.visible=true;destMarker.visible=false;
 refreshRideNavigation();RIDE.notice='في الطريق إلى الراكب';
 renderDriverPhone(true);updateHUD();setObjective(`توجّه إلى <b>${M.pickupName}</b> لاستلام ${M.riderName}`,4000);return true;
}
function rejectRideOffer(expired=false){
 if(!RIDE.offer)return false;
 RIDE.offer=null;RIDE.offerLeft=0;RIDE.declined++;RIDE.nextIn=rand(8,16);RIDE.expanded=false;
 RIDE.notice=expired?'انتهت مهلة الطلب — نبحث عن رحلة أخرى':'تم رفض الطلب — نبحث عن رحلة أخرى';
 renderDriverPhone(true);return true;
}
function boardRidePassenger(){
 if(M.phase!=='toPick')return false;
 const d=Math.hypot(car.x-M.pickupX,car.z-M.pickupZ);
 if(d>=7||Math.abs(car.y-navigationStopHeight({x:M.pickupX,z:M.pickupZ,roadIndex:M.pickupRoad}))>=1||Math.hypot(car.vel.x,car.vel.y)>=1.4)return false;
 M.phase='toDest';M.hold=0;M.tripTime=0;M.fare=M.quotedFare;
 passenger.visible=false;pickupMarker.visible=false;destMarker.position.set(M.destX,navigationStopHeight({x:M.destX,z:M.destZ,roadIndex:M.destRoad})+.08,M.destZ);destMarker.visible=true;
 refreshRideNavigation();RIDE.navTimer=0;RIDE.notice='الراكب معك — الرحلة بدأت';
 sfxPickup();renderDriverPhone(true);setObjective(`${M.riderName} ركب · الوجهة <b>${M.destName}</b> · ${fmt(M.quotedFare)} ج.م`,5000);return true;
}
function completeRideTrip(){
 if(M.phase!=='toDest')return false;
 const d=Math.hypot(car.x-M.destX,car.z-M.destZ);
 if(d>=8.5||Math.abs(car.y-navigationStopHeight({x:M.destX,z:M.destZ,roadIndex:M.destRoad}))>=1||Math.hypot(car.vel.x,car.vel.y)>=1.4)return false;
 const speedPenalty=Math.min(1,(M.speedViolations||0)/18),hitPenalty=(M.hits||0)*.25,comfortPenalty=Math.min(1.2,(M.comfortPenalty||0)/14);
 let tip=0;
 if(M.preference==='quiet'&&typeof isMusicPlaying==='function'&&!isMusicPlaying())tip=15;
 else if(M.preference==='radio'&&typeof isMusicPlaying==='function'&&isMusicPlaying())tip=15;
 else if(M.preference==='smooth'&&(M.hits||0)===0&&(M.comfortPenalty||0)<2)tip=20;
 else if(M.preference==='fast'&&M.tripTime>0&&M.tripTime<=Math.max(25,(M.tripDistance||400)/11))tip=25;
 const pay=Math.round(M.quotedFare*(1-Math.min(.25,comfortPenalty*.08)))+tip,rating=clamp(+(5-hitPenalty-speedPenalty-comfortPenalty).toFixed(1),1,5);
 const receipt={id:M.offerId,pay,tip,rating,name:M.riderName,pickup:M.pickupName,dest:M.destName,time:M.tripTime,distance:M.tripDistance,preference:M.preference};
 // End the trip before crediting it, so repeated actions cannot pay twice.
 M.phase='none';M.hold=0;M.timer=0;
 G.money+=pay;G.xp+=35;G.trips++;G.totalEarned+=pay;G.ratingTotal+=rating;G.ratedTrips++;
 if((M.hits||0)===0&&rating>=4.5&&!G.dailyBonusClaimed){
  G.dailyCleanTrips=(G.dailyCleanTrips||0)+1;
  if(G.dailyCleanTrips>=3){G.dailyBonusClaimed=true;G.money+=300;G.totalEarned+=300;if(typeof floatText==='function')floatText('🏆 تحدي الوردية: 3 رحلات نظيفة (+300 ج.م)','#ffd34d');}
 }
 RIDE.sessionEarned+=pay;RIDE.sessionTrips++;RIDE.navigation=null;RIDE.receipt=receipt;RIDE.receiptLeft=8;RIDE.nextIn=rand(12,22);RIDE.expanded=true;RIDE.notice=tip?`اكتملت الرحلة (+${tip} ج.م بقشيش)`:'اكتملت الرحلة';
 passenger.visible=false;pickupMarker.visible=false;destMarker.visible=false;arrow.visible=false;arrowGlow.visible=false;
 hidePrompt();saveProgress();sfxCash();floatText(`+${fmt(pay)} ج.م`,'#8be7b8');
 renderDriverPhone(true);updateHUD();setObjective(`اكتملت الرحلة · أُضيف ${fmt(pay)} ج.م إلى محفظتك`,4000);return true;
}
function updateDriverShift(dt){
 if(RIDE.offer){RIDE.offerLeft=Math.max(0,RIDE.offerLeft-dt);if(RIDE.offerLeft<=0)rejectRideOffer(true);return;}
 if(!rideBusy()){
  if(RIDE.receipt){RIDE.receiptLeft-=dt;if(RIDE.receiptLeft<=0){RIDE.receipt=null;RIDE.expanded=false;renderDriverPhone(true);}return;}
  if(RIDE.online){RIDE.nextIn-=dt;if(RIDE.nextIn<=0)makeRideOffer();}return;
 }
 if(M.phase==='toDest'){
  M.tripTime+=dt;
  if(Math.abs(car.longAccel||0)>5.5||Math.abs(car.lateralAccel||0)>4.8)M.comfortPenalty=(M.comfortPenalty||0)+dt;
  if(Math.abs(car.speed)>20)M.speedViolations=(M.speedViolations||0)+dt;
  M.reactCooldown=(M.reactCooldown||4)-dt;
  if((M.hits||0)>(M._lastHits||0)){M._lastHits=M.hits;M.reactCooldown=7;if(typeof floatText==='function')floatText('الراكب: حاسب يا أسطى!','#ff8a8a');}
  else if(M.reactCooldown<=0){
   M.reactCooldown=11;
   const musicOn=typeof isMusicPlaying==='function'&&isMusicPlaying();
   if(M.preference==='quiet'&&musicOn&&typeof floatText==='function')floatText('الراكب: ممكن نوطي الكاسيت شوية؟','#ffd34d');
   else if(M.preference==='radio'&&!musicOn&&typeof floatText==='function')floatText('الراكب: شغّلنا الراديو لو سمحت 🎵','#ffd34d');
   else if(M.tripTime>12&&(M.hits||0)===0&&(M.comfortPenalty||0)<1.5&&typeof floatText==='function')floatText('الراكب: سواقتك هادية ومريحة 👍','#8be7b8');
  }
 }
 RIDE.navTimer-=dt;if(RIDE.navTimer<=0){RIDE.navTimer=2.5;refreshRideNavigation();}
 const target=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ}:{x:M.destX,z:M.destZ};
 const d=Math.hypot(target.x-car.x,target.z-car.z),stopped=Math.hypot(car.vel.x,car.vel.y)<1.4&&Math.abs(car.y-navigationStopHeight({...target,roadIndex:M.phase==='toPick'?M.pickupRoad:M.destRoad}))<1,near=d<(M.phase==='toPick'?7:8.5);
 if(near&&stopped){M.hold+=dt;showPrompt(M.phase==='toPick'?'انتظر لحظة… الراكب يركب':'انتظر لحظة… إنهاء الرحلة');if(M.hold>=1.1){if(M.phase==='toPick')boardRidePassenger();else completeRideTrip();}}
 else{M.hold=0;if(d<15)showPrompt(M.phase==='toPick'?'قف بجوار الراكب لبدء الرحلة':'قف بأمان لإنهاء الرحلة');else hidePrompt();}
}
function fleetTransaction(action,value){
 if(rideBusy())return {ok:false,message:'أكمل الرحلة أولًا قبل استخدام الصيانة'};
 const c=CARS[G.carIdx]||CARS[0];let amount=0;if(c.police&&action==='paint')return {ok:false,message:'طلاء الدورية الرسمي ثابت'};
 if(action==='repair'){
  amount=repairPrice();if(amount<=0)return {ok:false,message:'العربية بحالة ممتازة'};
  if(G.money<amount)return {ok:false,message:'رصيدك لا يكفي للإصلاح'};
  G.money-=amount;G.conditions[c.id]=100;
 }else if(action==='paint'){
  const paint=CAR_PAINTS.find(p=>p.id===value);if(!paint)return {ok:false,message:'لون غير متاح'};
  const hex=paint.hex??c.color1,current=G.paints[c.id]??c.color1;
  if(current===hex)return {ok:false,message:'هذا هو لون العربية الحالي'};
  amount=PAINT_PRICE;if(G.money<amount)return {ok:false,message:'رصيدك لا يكفي للطلاء'};
  G.money-=amount;if(paint.hex===null)delete G.paints[c.id];else G.paints[c.id]=paint.hex;
 }else if(action==='buy'||action==='select'){
  const i=Number(value),next=CARS[i];if(next?.uploaded&&MODEL_PACKED[next.asset]&&!importedModels.loaded[next.asset])return {ok:false,loading:true,message:'جاري تحميل السيارة'};if(next?.available===false)return {ok:false,message:'أضف ملف السيارة الأصلي GLB أولًا'};if(!Number.isInteger(i)||!next)return {ok:false,message:'عربية غير متاحة'};
  if(action==='buy'){
   if(G.owned.includes(next.id))return {ok:false,message:'العربية ملكك بالفعل'};
   amount=next.price;if(G.money<amount)return {ok:false,message:'رصيدك لا يكفي لشراء العربية'};
   G.money-=amount;G.owned.push(next.id);G.conditions[next.id]=100;
  }else if(!G.owned.includes(next.id))return {ok:false,message:'اشترِ العربية أولًا'};
  G.carIdx=i;if(next.police)store.set("assyut_police_vehicle",next.id);
 }else return {ok:false,message:'عملية غير متاحة'};
 car.speed=0;car.vel.set(0,0);car.steer=0;car.yawRate=0;car.wheelAngle=0;
 saveProgress();swapTaxi(G.carIdx);applyCarStats();updateHUD();return {ok:true,amount,message:action==='repair'?'تم إصلاح العربية بالكامل':action==='paint'?'تم تغيير لون العربية':action==='buy'?'مبروك العربية الجديدة':'تم اختيار العربية'};
}

/* ========================= 79-phone.js ========================= */
function drawBuildingFootprint(ctx,b,tx,tz,scale){
 if(!b.oriented){ctx.fillRect(tx(b.x0),tz(b.z0),(b.x1-b.x0)*scale,(b.z1-b.z0)*scale);return;}
 const o=b.oriented,c=Math.cos(o.heading),s=Math.sin(o.heading);ctx.beginPath();[[-o.hl,-o.hw],[o.hl,-o.hw],[o.hl,o.hw],[-o.hl,o.hw]].forEach(([x,z],i)=>{const px=tx(o.x+c*x+s*z),pz=tz(o.z-s*x+c*z);if(i)ctx.lineTo(px,pz);else ctx.moveTo(px,pz);});ctx.closePath();ctx.fill();
}
/* Driver phone: UI changes never pause driving or silently accept a request. */
let driverPhoneSignature='';
function driverRating(){return G.ratedTrips>0?(G.ratingTotal/G.ratedTrips).toFixed(2):'5.00';}
function driverStateTitle(){return RIDE.offer?'طلب رحلة جديد':M.phase==='toPick'?'التوجّه إلى الراكب':M.phase==='toDest'?'رحلة جارية':RIDE.receipt?'تم الوصول':'أنت متصل';}
function renderDriverPhone(force=false){
 const phone=$('driverPhone'),chip=$('driverPhoneChip'),playing=G.mode==='rides'&&G.state==='play';
 phone.classList.toggle('phoneHidden',!playing||!RIDE.expanded);chip.classList.toggle('hidden',!playing||RIDE.expanded);
 const chipText=rideBusy()?(M.phase==='toPick'?'في الطريق للراكب':'رحلة جارية'):RIDE.offer?'طلب جديد':RIDE.notice||'متصل · في انتظار الرحلات';
 $('driverChipText').textContent=chipText;
 const signature=[RIDE.offer?.id||0,M.phase,RIDE.receipt?.id||0,RIDE.online,RIDE.expanded,G.carIdx].join(':');
 if(!force&&signature===driverPhoneSignature)return;driverPhoneSignature=signature;
 const header=`<div class="phoneNotch"></div><div class="phoneStatus"><span>${String(Math.floor(G.clock/60)%24).padStart(2,'0')}:${String(Math.floor(G.clock%60)).padStart(2,'0')}</span><span>● ▰</span></div><div class="phoneAppHead"><div><b>Uber <span>Driver</span></b><small>أسيوط · ${driverStateTitle()}</small></div><button data-driver-act="collapse" aria-label="تصغير الهاتف">−</button></div>`;
 let content='',actions='';
 if(RIDE.offer){const o=RIDE.offer;content=`
  <div class="requestLabel"><span class="onlineDot"></span> طلب جديد <span class="rideProduct">UberX</span></div>
  <div class="quoteAmount">${fmt(o.fare)} <small>ج.م</small></div><div class="quoteNote">صافي أجرة الرحلة · تُضاف بعد التوصيل</div>
  <canvas id="ridePhoneMap" width="560" height="270" aria-label="خريطة تعرض نقطة الركوب ونقطة الوصول"></canvas>
  <div class="rideStops"><div><i class="pickupDot"></i><span><small>نقطة الركوب · ${o.name}</small><b>${o.pickup.name}</b></span></div><div><i class="dropDot"></i><span><small>الوجهة</small><b>${o.dest.name}</b></span></div></div>
  <div class="rideSafety">${o.preference?.icon||'💬'} ${o.preference?.label||'طلب عادي'} · ${o.pType?.name||'راكب'}</div>
  <div class="requestMeta"><span>${formatDist(o.distance)} · نحو ${o.minutes} د</span><span>يبعد ${formatDist(o.pickupDistance)}</span></div>
  <div class="offerTimer"><i id="offerTimeBar"></i></div><div class="offerTimeText">ينتهي الطلب خلال <b id="offerSeconds">22</b> ث</div>
  `;
  actions='<div class="requestActions"><button class="acceptRide" data-driver-act="accept">قبول الرحلة <kbd>1</kbd></button><button class="declineRide" data-driver-act="reject">رفض <kbd>2</kbd></button></div>';
 }else if(rideBusy()){
  const pickup=M.phase==='toPick',target=pickup?M.pickupName:M.destName;
  content=`<div class="activeRideTag">${pickup?'توجّه لنقطة الركوب':'الراكب معك'}</div><div class="activeRider"><span>${M.pType?.icon||'◉'}</span><div><b>${M.riderName}</b><small>${pickup?'ينتظرك في '+M.pickupName:'إلى '+M.destName}</small></div><strong>${fmt(M.quotedFare)}<small>ج.م</small></strong></div><div class="rideSafety">${M.preference?.icon||'💬'} ${M.preference?.label||'طلب عادي'}</div>
  <canvas id="ridePhoneMap" width="560" height="310" aria-label="مسار الوصول عبر الشوارع"></canvas>
  <div class="navInstruction"><span>↱</span><div><small>${pickup?'استلام الراكب':'الوجهة النهائية'}</small><b>${target}</b></div><strong id="phoneNavDistance">—</strong></div>
  <div class="rideStops compact"><div><i class="pickupDot"></i><span>${M.pickupName}</span></div><div><i class="dropDot"></i><span>${M.destName}</span></div></div>
  <div class="rideSafety">${pickup?'قف قريبًا من الراكب ليركب تلقائيًا.':'قف بأمان عند الوجهة لإنهاء الرحلة.'}</div><button class="phoneSecondary" data-driver-act="collapse">العودة للقيادة</button>`;
 }else if(RIDE.receipt){const r=RIDE.receipt;content=`<div class="rideReceiptCheck">✓</div><h3 class="rideReceiptTitle">رحلة مكتملة</h3><div class="quoteAmount">+${fmt(r.pay)} <small>ج.م</small></div><p class="receiptNote">أُضيفت الأجرة إلى محفظتك</p><div class="receiptRoute">${r.pickup} ← ${r.dest}</div><div class="receiptStats"><div><small>تقييم الراكب</small><b>★ ${r.rating.toFixed(1)}</b></div><div><small>أرباح الوردية</small><b>${fmt(RIDE.sessionEarned)} ج.م</b></div></div><div class="rideSafety">نبحث عن رحلتك التالية…</div><button class="acceptRide" data-driver-act="dismiss">متابعة القيادة</button>`;
 }else content=`<div class="onlineRadar"><i></i><span>↗</span></div><h3 class="rideReceiptTitle">جاهز للمشوار القادم</h3><p class="receiptNote">تحرّك في المدينة. ستظهر الطلبات هنا أثناء القيادة.</p><canvas id="ridePhoneMap" width="560" height="245" aria-label="موقعك الحالي في المدينة"></canvas><div class="receiptStats"><div><small>أرباح الوردية</small><b>${fmt(RIDE.sessionEarned)} ج.م</b></div><div><small>رحلات الوردية</small><b>${RIDE.sessionTrips}</b></div></div><div class="rideSafety">${RIDE.notice||'أنت متصل — نبحث عن ركاب قريبين'}</div>`;
 phone.innerHTML=header+`<div class="phoneBody">${content}</div>${actions}<div class="phoneHomeBar"></div>`;
 drawDriverPhoneMap();
}
function updateDriverPhone(){
 renderDriverPhone();
 if(RIDE.offer){const seconds=$('offerSeconds'),bar=$('offerTimeBar');if(seconds)seconds.textContent=Math.ceil(RIDE.offerLeft);if(bar)bar.style.width=(RIDE.offerLeft/22*100)+'%';}
 if(rideBusy()){
  const target=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ}:{x:M.destX,z:M.destZ};
  const d=$('phoneNavDistance');if(d)d.textContent=formatDist(RIDE.navigation?.remaining??RIDE.navigation?.length??Math.hypot(target.x-car.x,target.z-car.z));
 }
 const menuCar=$('menuDriverCar');if(menuCar)menuCar.textContent=(CARS[G.carIdx]||CARS[0]).name;
 const cond=$('carCondition'),earn=$('shiftEarned'),rating=$('driverRating'),menuMoney=$('menuDriverMoney');
 if(cond)cond.textContent=Math.round(currentCarCondition())+'%';if(earn)earn.textContent=fmt(RIDE.sessionEarned);if(rating)rating.textContent=driverRating();if(menuMoney)menuMoney.textContent=fmt(G.money);
 if(RIDE.expanded&&G.state==='play')drawDriverPhoneMap();
}
function drawDriverPhoneMap(){
 const canvas=$('ridePhoneMap');if(!canvas||!RIDE.expanded)return;
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 let route,from,to;
 if(RIDE.offer){route=RIDE.offer.route.points;from=RIDE.offer.pickup;to=RIDE.offer.dest;}
 else if(rideBusy()){route=remainingNavigationPoints();from={x:car.x,z:car.z};to=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ}:{x:M.destX,z:M.destZ};}
 else{from={x:car.x-150,z:car.z-85};to={x:car.x+150,z:car.z+85};route=[];}
 const all=[from,to,...route];let x0=Math.min(...all.map(p=>p.x)),x1=Math.max(...all.map(p=>p.x)),z0=Math.min(...all.map(p=>p.z)),z1=Math.max(...all.map(p=>p.z));
 const scale=Math.min((W-72)/Math.max(140,x1-x0),(H-60)/Math.max(95,z1-z0)),cx=(x0+x1)/2,cz=(z0+z1)/2;
 const tx=x=>(x-cx)*scale+W/2,ty=z=>(z-cz)*scale+H/2;
 ctx.fillStyle='#e8ece7';ctx.fillRect(0,0,W,H);

 ctx.fillStyle='#d5dcd3';for(const b of MAP.buildings){const x=tx(b.x0),y=ty(b.z0),w=(b.x1-b.x0)*scale,h=(b.z1-b.z0)*scale;if(x+w<0||x>W||y+h<0||y>H)continue;drawBuildingFootprint(ctx,b,tx,ty,scale);}
 ctx.lineCap='round';
 for(const road of ASSYUT.roads){ctx.strokeStyle='#fafbf8';ctx.lineWidth=Math.max(2,road.width*scale);ctx.beginPath();road.points.forEach((p,i)=>i?ctx.lineTo(tx(p.x),ty(p.z)):ctx.moveTo(tx(p.x),ty(p.z)));ctx.stroke();}
 if(route.length){for(const [color,width]of[['#ffffff',9],['#173e32',5]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();route.forEach((p,i)=>i?ctx.lineTo(tx(p.x),ty(p.z)):ctx.moveTo(tx(p.x),ty(p.z)));ctx.stroke();}}
 const dot=(p,color,r=7)=>{ctx.beginPath();ctx.arc(tx(p.x),ty(p.z),r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();};
 if(RIDE.offer){dot(from,'#19734c');ctx.fillStyle='#141d1a';ctx.fillRect(tx(to.x)-6,ty(to.z)-6,12,12);}
 else if(rideBusy())dot(to,M.phase==='toPick'?'#19734c':'#151d1a');
 const carX=tx(car.x),carZ=ty(car.z);if(carX>-10&&carX<W+10&&carZ>-10&&carZ<H+10)dot(car,'#4278c8',6);
 ctx.fillStyle='#64716a';ctx.font='15px Tahoma';ctx.textAlign='left';ctx.fillText('N ↑',14,24);
}
$('driverPhone').addEventListener('click',e=>{
 const button=e.target.closest('[data-driver-act]');if(!button)return;
 const action=button.dataset.driverAct;
 if(action==='accept')acceptRideOffer();else if(action==='reject')rejectRideOffer();
 else if(action==='collapse'){RIDE.expanded=false;renderDriverPhone(true);}
 else if(action==='dismiss'){RIDE.receipt=null;RIDE.receiptLeft=0;RIDE.expanded=false;renderDriverPhone(true);}
});
$('driverPhoneChip').addEventListener('click',()=>{RIDE.expanded=true;renderDriverPhone(true);});
addEventListener('keydown',e=>{
 if(G.state!=='play'||G.mode!=='rides'||e.repeat)return;
 if(e.code==='Digit1'&&RIDE.offer){e.preventDefault();acceptRideOffer();}
 if(e.code==='Digit2'&&RIDE.offer){e.preventDefault();rejectRideOffer();}
 if(e.code==='KeyF'){RIDE.expanded=!RIDE.expanded;renderDriverPhone(true);}
});

/* ========================= 80-missions.js ========================= */
/* =====================================================================
   المهام
   ===================================================================== */
function setObjective(html, ms = 4200) {
  const el = $('objective');
  el.innerHTML = html;
  el.classList.add('on');
  clearTimeout(setObjective._t);
  setObjective._t = setTimeout(() => el.classList.remove('on'), ms);
}
function showPrompt(txt) {
  const el = $('prompt');
  el.textContent = txt;
  el.classList.add('on');
}
function hidePrompt() { $('prompt').classList.remove('on'); }

function floatText(txt, color = '#3dff8a') {
  const el = $('floaty');
  el.textContent = txt;
  el.style.color = color;
  el.style.left = (innerWidth / 2 - 60 + rand(-40, 40)) + 'px';
  el.style.top = (innerHeight * .54) + 'px';
  el.style.transition = 'none';
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'all 1.05s ease-out';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-80px)';
  }));
}

/* اختيار مكان عشوائي بعيد عن العربية مسافة معينة */
function pickPlace(fromX, fromZ, minD, maxD, excludeName) {
  let opts = PLACES.filter(p => {
    if (excludeName && p.name === excludeName) return false;
    const d = Math.hypot(p.x - fromX, p.z - fromZ);
    return d > minD && d < maxD;
  });
  if (!opts.length) opts = PLACES.filter(p => !excludeName || p.name !== excludeName);
  if (!opts.length) opts = PLACES;
  return pick(opts);
}

function startMission() {
  if(G.mode==='rides'){startDriverShift();return;}
  M.phase = 'toPick';
  M.boss = G.mode === 'boss';
  if (G.mode !== 'survival') M.timer = M.boss ? 90 : 0;
  M.hold = 0;
  M.fare = 0;
  M.hits = 0;
  M.respawn = 0;
  M.after = null;

  // اختيار نوع الزبون
  const pool = G.xp >= 1200 || (typeof DN !== 'undefined' && DN.night > .5)
    ? PASSENGER_TYPES
    : PASSENGER_TYPES.filter(p => p.id !== 'vip');
  M.pType = pick(pool);
  if (passenger.userData.shirtMat) {
    passenger.userData.shirtMat.color.setHex(M.pType.shirt);
  }

  const min = M.boss ? 90 : 110;
  const max = M.boss ? 380 : 780;
  const st = pickPlace(car.x, car.z, min, max);
  M.pickupX = st.x;
  M.pickupZ = st.z;
  M.pickupName = st.name;

  passenger.position.set(st.x, .34, st.z);
  passenger.rotation.y = Math.PI;
  passenger.visible = true;
  pickupMarker.position.set(st.x, .35, st.z);
  pickupMarker.visible = true;
  destMarker.visible = false;
  arrow.visible = false;
  arrowGlow.visible = false;

  setObjective(M.boss
    ? 'تحدي الزعيم 👑 · استلم الزبون قبل ما الوقت يخلص!'
    : `روح لـ <b>${st.name}</b> · ${M.pType.icon} ${M.pType.name} مستنيك`, 5200);
  updateHUD();
}

function boardPassenger() {
  if(G.mode==='rides')return boardRidePassenger();
  if (M.phase !== 'toPick') return;
  M.phase = 'toDest';
  M.hold = 0;
  M.hits = 0;
  passenger.visible = false;
  pickupMarker.visible = false;

  const pt = M.pType || PASSENGER_TYPES[0];
  const dest = pickPlace(M.pickupX, M.pickupZ, 240, 900, M.pickupName);
  M.destX = dest.x;
  M.destZ = dest.z;
  M.destName = dest.name;
  const dist = Math.hypot(dest.x - M.pickupX, dest.z - M.pickupZ);
  const wObj = WEATHERS.find(w => w.id === G.weather) || WEATHERS[0];
  const carBonus = carStats().fareBonus;
  M.baseFare = (18 + dist * .075) * pt.fareMul * carBonus * wObj.fareBonus;
  M.fare = M.baseFare;
  M.tripTime = 0;
  destMarker.position.set(dest.x, .35, dest.z);
  destMarker.visible = true;

  if (G.mode === 'checkpoint') {
    M.timer = Math.round(clamp((48 + dist * .085) * pt.timeMul, 45, 130));
  }

  const greet = pick(pt.greet);
  setObjective(`${pt.icon} "${greet}" → <b>${dest.name}</b>`, 5600);
  sfxPickup();
  updateHUD();
}

function completeTrip() {
  if(G.mode==='rides')return completeRideTrip();
  if (M.phase !== 'toDest') return;
  const pt = M.pType || PASSENGER_TYPES[0];
  const dist = Math.hypot(M.destX - M.pickupX, M.destZ - M.pickupZ);
  const expected = dist / 13;
  const fastTip = M.tripTime < expected ? Math.round(M.baseFare * pt.tipBonus) : 0;
  const cleanTip = M.hits === 0 ? Math.round(M.baseFare * .2) : 0;
  G.combo = Math.min(G.combo + 1, 9);
  const mult = G.combo >= 3 ? 2 : 1;
  const bossMul = M.boss ? 3 : 1;
  const pay = Math.round((M.fare + fastTip + cleanTip) * mult * bossMul);

  G.money += pay;
  G.xp += 35 + Math.round(dist / 16);
  G.trips++;
  if (G.mode === 'survival') {
    M.survTrips = (M.survTrips || 0) + 1;
    M.survEarned = (M.survEarned || 0) + pay;
    if (M.survTrips > G.bestSurvival) G.bestSurvival = M.survTrips;
    const bonusSec = Math.round(clamp(20 + dist / 45, 22, 34));
    M.timer = Math.min(M.timer + bonusSec, 120);
    floatText(`+${fmt(pay)} ج.م · +${bonusSec}ث ⏱`, '#ffd34d');
  } else {
    floatText(`+${fmt(pay)} ج.م`, '#ffd34d');
  }

  saveProgress();
  sfxCash();
  const bye = pick(pt.bye);
  const tags = [
    cleanTip > 0 ? '⭐ سواقة نضيفة' : '',
    mult > 1 ? '🔥 كومبو ×2' : '',
    G.weather === 'rain' ? '🌧️ بونص مطر' : (G.weather === 'fog' ? '🌫️ بونص شبورة' : ''),
  ].filter(Boolean).join(' · ');
  setObjective(`${pt.icon} "${bye}" · +<b>${fmt(pay)} ج.م</b>${tags ? ' · ' + tags : ''}`, 5200);

  if (G.weather === 'rain') unlockAchievement('rain_trip');
  if (M.boss) unlockAchievement('beat_boss');
  checkAchievements();

  const wasBoss = M.boss;
  M.phase = 'none';
  if (G.mode !== 'survival') M.timer = 0;
  M.boss = false;
  destMarker.visible = false;
  pickupMarker.visible = false;
  arrow.visible = false;
  arrowGlow.visible = false;
  hidePrompt();

  M.respawn = G.mode === 'survival' ? .6 : 1.5;
  if (wasBoss) {
    M.respawn = .8;
    M.after = { type: 'boss', pay };
  } else if (G.mode !== 'survival' && G.trips % 3 === 0) {
    M.respawn = 1.4;
    M.after = { type: 'branch' };
  } else {
    M.after = { type: 'normal' };
  }
  updateHUD();
}

function failMission() {
  const mode = G.mode;
  G.combo = 0;
  M.phase = 'none';
  M.timer = 0;
  M.boss = false;
  M.respawn = 0;
  M.after = null;
  passenger.visible = false;
  destMarker.visible = false;
  pickupMarker.visible = false;
  arrow.visible = false;
  arrowGlow.visible = false;
  hidePrompt();
  sfxFail();
  if (mode === 'race') {
    showModal(`
      <div class="popBadge">السباق خلص</div>
      <h2>الوقت جاب آخره ⏱</h2>
      <p>وصلت لنقطة ${M.race ? M.race.idx : 0} من 4. جرّب تاني وخُد النقط أسرع.</p>
      <button class="bigBtn" data-act="retry">سباق تاني 🏁</button>
      <button class="softBtn" data-act="menu">القائمة الرئيسية</button>
    `);
  } else if (mode === 'survival') {
    showModal(`
      <div class="popBadge">خلصت الوردية</div>
      <h2>الوقت خلص يا أسطى ⏳</h2>
      <p>وردية جامدة على كورنيش أسيوط!</p>
      <div class="statGrid">
        <div><b>${M.survTrips || 0}</b><span>مشوار في الوردية</span></div>
        <div><b>${fmt(M.survEarned || 0)}</b><span>ج.م أرباح</span></div>
        <div><b>${G.bestSurvival}</b><span>أفضل رقم قياسي</span></div>
        <div><b>${fmt(G.money)}</b><span>رصيدك الكلي</span></div>
      </div>
      <button class="bigBtn" data-act="retry">وردية تانية ⏳</button>
      <button class="softBtn" data-act="menu">القائمة الرئيسية</button>
    `);
  } else {
    showModal(`
      <div class="popBadge">الوقت خلص</div>
      <h2>فات الوقت! ⏱</h2>
      <p>${mode === 'boss' ? 'الزعيم مش بيرحم… جرّب تاني وكن أسرع.' : 'الزبون زهق ومشي. جرّب المشوار تاني.'}</p>
      <button class="bigBtn" data-act="retry">حاول تاني ▶</button>
      <button class="softBtn" data-act="menu">القائمة الرئيسية</button>
    `);
  }
}

function startRace() {
  const seq = [];
  let fromX = car.x, fromZ = car.z;
  for (let i = 0; i < 4; i++) {
    const st = pickPlace(fromX, fromZ, 200, 720, i > 0 ? seq[i - 1].name : null);
    seq.push(st);
    fromX = st.x;
    fromZ = st.z;
  }
  M.race = { seq, idx: 0 };
  M.phase = 'race';
  M.timer = 120;
  M.boss = false;
  passenger.visible = false;
  pickupMarker.visible = false;
  placeRaceMarker();
  arrow.visible = true;
  arrowGlow.visible = true;
  setObjective('سباق المدينة 🏁 · عدّي أول نقطة!', 5000);
  updateHUD();
}

function placeRaceMarker() {
  const st = M.race.seq[M.race.idx];
  destMarker.position.set(st.x, .35, st.z);
  destMarker.visible = true;
}

function raceCheckpoint() {
  M.race.idx++;
  M.timer = Math.min(M.timer + 6, 150);
  sfxCheckpoint();
  if (M.race.idx >= M.race.seq.length) {
    finishRace();
  } else {
    placeRaceMarker();
    setObjective(`نقطة ${M.race.idx + 1} من ${M.race.seq.length} · +6 ثانية ⏱`, 2600);
  }
}

function finishRace() {
  const left = Math.max(0, M.timer);
  const pay = 400 + Math.round(left * 10);
  G.money += pay;
  G.xp += 180;
  G.trips++;
  if (left > G.bestRace) G.bestRace = Math.round(left);
  unlockAchievement('win_race');
  checkAchievements();
  saveProgress();
  sfxCash();
  M.phase = 'none';
  destMarker.visible = false;
  arrow.visible = false;
  arrowGlow.visible = false;
  M.timer = 0;
  showModal(`
    <div class="popBadge">خلص السباق</div>
    <h2>عاش يا أسطى! 🏁</h2>
    <p>عدّيت كل النقط على كورنيش أسيوط.</p>
    <div class="statGrid">
      <div><b>${fmt(pay)}</b><span>ج.م مكافأة</span></div>
      <div><b>${Math.round(left)} ث</b><span>وقت متبقي</span></div>
      <div><b>${Math.round(G.bestRace)} ث</b><span>أفضل نتيجة</span></div>
      <div><b>+180</b><span>XP</span></div>
    </div>
    <button class="bigBtn" data-act="retry">سباق تاني 🏁</button>
    <button class="softBtn" data-act="menu">القائمة الرئيسية</button>
  `);
}

function showBossWin(pay) {
  showModal(`
    <div class="popBadge">كسبت التحدي</div>
    <h2>غلبت الزعيم! 👑</h2>
    <p>وصّلت الزبون في الوقت المناسب… الكورنيش بقى بيتك.</p>
    <div class="statGrid">
      <div><b>${fmt(pay)}</b><span>ج.م</span></div>
      <div><b>×3</b><span>مكافأة الزعيم</span></div>
      <div><b>${fmt(G.money)}</b><span>رصيدك</span></div>
      <div><b>${G.trips}</b><span>مشوار</span></div>
    </div>
    <button class="bigBtn" data-act="retry">تحدي تاني 👑</button>
    <button class="softBtn" data-act="menu">القائمة الرئيسية</button>
  `);
}

function branchPopup() {
  G.branch++;
  saveProgress();
  const names = ['فرع النميس', 'فرع الهلالي', 'فرع الوليدية', 'فرع المحطة', 'فرع رياض', 'فرع الجامعة', 'فرع الجمهورية'];
  const name = names[G.branch % names.length];
  showModal(`
    <div class="popBadge">فرع جديد!</div>
    <h2>${name} 🏁</h2>
    <p>فتحت فرع جديد على الكورنيش. الزباين بقوا عارفين اسمك… كمّل واكسب أكتر.</p>
    <div class="statGrid">
      <div><b>${fmt(G.money)}</b><span>إجمالي الأرباح</span></div>
      <div><b>${G.trips}</b><span>مشوار مكتمل</span></div>
      <div><b>${fmt(G.xp)}</b><span>XP</span></div>
      <div><b>${G.branch}</b><span>فرع مفتوح</span></div>
    </div>
    <button class="bigBtn" data-act="close">يلا كمّل ▶</button>
  `);
}

function handleG() {
  if (G.state !== 'play') return;
  if (M.phase === 'toPick') {
    const d = Math.hypot(passenger.position.x - car.x, passenger.position.z - car.z);
    if (d < 10) boardPassenger();
  } else if (M.phase === 'toDest') {
    const d = Math.hypot(destMarker.position.x - car.x, destMarker.position.z - car.z);
    if (d < 17) completeTrip();
  }
}

function updateMission(dt) {
  if (typeof taxiRig !== 'undefined' && taxiRig?.passengerOccupant) taxiRig.passengerOccupant.visible = (M.phase === 'toDest');
  if(G.mode==='police'){updatePoliceMission(dt);return;}
  if(G.mode==='rides'){updateDriverShift(dt);return;}
  if (M.phase === 'none') {
    if (M.respawn > 0) {
      M.respawn -= dt;
      if (M.respawn <= 0) {
        const after = M.after;
        M.after = null;
        if (after && after.type === 'boss') showBossWin(after.pay);
        else if (after && after.type === 'branch') branchPopup();
        else if (G.state === 'play') startMission();
      }
    }
    return;
  }

  // العداد
  const timed = M.phase === 'toDest' || M.phase === 'race' || (M.boss && M.phase === 'toPick') || G.mode === 'survival';
  if (M.timer > 0 && timed) {
    M.timer -= dt;
    if (M.timer <= 0) {
      M.timer = 0;
      failMission();
      return;
    }
  }

  if (M.phase === 'toDest') {
    M.tripTime += dt;
    M.fare = M.baseFare + M.tripTime * .55;
  }

  if (M.phase === 'toPick') {
    const d = Math.hypot(passenger.position.x - car.x, passenger.position.z - car.z);
    if (d < 11 && Math.abs(car.speed) < 3.4) {
      showPrompt(d < 7 ? 'اضغط G — اركب الزبون 🤝' : 'قرّب من الرصيف وبطّئ');
      if (d < 7 && Math.abs(car.speed) < 1.4) {
        M.hold += dt;
        if (M.hold > .7) boardPassenger();
      } else M.hold = 0;
    } else {
      hidePrompt();
      M.hold = 0;
    }
  } else if (M.phase === 'toDest') {
    const d = Math.hypot(destMarker.position.x - car.x, destMarker.position.z - car.z);
    if (d < 17 && Math.abs(car.speed) < 4.5) {
      showPrompt(d < 12 ? 'اضغط G — نزّل الزبون ✅' : 'بطّئ شوية… الوجهة قريبة');
      if (d < 8.5 && Math.abs(car.speed) < 1.4) {
        M.hold += dt;
        if (M.hold > .7) completeTrip();
      } else M.hold = 0;
    } else {
      hidePrompt();
      M.hold = 0;
    }
  } else if (M.phase === 'race') {
    const st = M.race.seq[M.race.idx];
    const d = Math.hypot(st.x - car.x, st.z - car.z);
    if (d < 18) raceCheckpoint();
    hidePrompt();
  }
}

/* ========================= 82-hud.js ========================= */
/* =====================================================================
   الواجهة
   ===================================================================== */
function formatDist(m) {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' كم';
  return Math.round(m) + ' م';
}
function formatTime(s) {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function updateMissionCard() {
  if(G.mode==='police'){$('mission').classList.add('hidden');return;}
  const card = $('mission');
  if (M.phase === 'none'||G.mode==='rides') { card.classList.add('hidden'); return; }
  card.classList.remove('hidden');

  const timeTxt = M.timer > 0 ? '⏱ ' + formatTime(M.timer) : '—';

  if (M.phase === 'toPick') {
    const pt = M.pType || PASSENGER_TYPES[0];
    const d = Math.hypot(passenger.position.x - car.x, passenger.position.z - car.z);
    $('mIcon').textContent = M.boss ? '👑' : pt.icon;
    $('mTitle').textContent = M.boss ? 'تحدي الزعيم 👑' : `${pt.name} مستني`;
    $('mDest').textContent = 'استلم من: ' + M.pickupName;
    $('mFare').innerHTML = '—';
    $('mDist').textContent = '📍 ' + formatDist(d);
    $('mTime').textContent = timeTxt;
  } else if (M.phase === 'toDest') {
    const pt = M.pType || PASSENGER_TYPES[0];
    const d = Math.hypot(destMarker.position.x - car.x, destMarker.position.z - car.z);
    $('mIcon').textContent = pt.icon;
    $('mTitle').textContent = `${pt.name} راكب`;
    $('mDest').textContent = 'وصّله لـ: ' + M.destName;
    $('mFare').innerHTML = `${fmt(M.fare)}<small>ج.م</small>`;
    $('mDist').textContent = '📍 ' + formatDist(d);
    $('mTime').textContent = timeTxt;
  } else if (M.phase === 'race') {
    const st = M.race.seq[M.race.idx];
    const d = Math.hypot(st.x - car.x, st.z - car.z);
    $('mIcon').textContent = '🏁';
    $('mTitle').textContent = 'سباق الكورنيش';
    $('mDest').textContent = `نقطة ${M.race.idx + 1} من ${M.race.seq.length} · ${st.name}`;
    $('mFare').innerHTML = '🏆';
    $('mDist').textContent = '📍 ' + formatDist(d);
    $('mTime').textContent = '⏱ ' + formatTime(M.timer);
  }
}

function drawSpeedo() {
  const cvs = $('speedoCanvas');
  if (!cvs) return;
  const g = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  g.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H * 0.62;
  const r = H * 0.52;
  const startAng = Math.PI * 0.82;
  const endAng = Math.PI * 2.18;
  const sweep = endAng - startAng;

  g.beginPath();
  g.arc(cx, cy, r, startAng, endAng);
  g.strokeStyle = 'rgba(255,255,255,0.15)';
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.stroke();

  const spdKmh = Math.round(Math.abs(car.speed) * 3.6);
  const maxKmh = 180;
  const pct = clamp(spdKmh / maxKmh, 0, 1);

  if (pct > 0.005) {
    const curEnd = startAng + pct * sweep;
    const grad = g.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(0.55, '#f59e0b');
    grad.addColorStop(1, '#ef4444');
    g.beginPath();
    g.arc(cx, cy, r, startAng, curEnd);
    g.strokeStyle = grad;
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.stroke();

    const nx = cx + Math.cos(curEnd) * r;
    const ny = cy + Math.sin(curEnd) * r;
    g.beginPath();
    g.arc(nx, ny, 4.5, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.strokeStyle = grad;
    g.lineWidth = 2;
    g.stroke();
  }

  for (let i = 0; i <= 8; i++) {
    const ang = startAng + (i / 8) * sweep;
    const isMajor = (i % 2 === 0);
    const r1 = r - (isMajor ? 8 : 5);
    const r2 = r + 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    g.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
    g.strokeStyle = isMajor ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)';
    g.lineWidth = isMajor ? 2.0 : 1.0;
    g.stroke();
  }

  $('kmh').textContent = spdKmh;
  const curGear = car.speed < -0.5 ? 'R' : Math.abs(car.speed) < 0.5 ? 'N' : 'D';
  $('gear').textContent = curGear;
  if ($('tGText')) $('tGText').textContent = curGear;

  if ($('clusterTripDist')) {
    const distKm = Math.max(1, Math.floor((G.odometer || 0) / 1000) || 4);
    $('clusterTripDist').textContent = String(distKm).padStart(2, '0');
  }

  const wheelEl = $('virtualWheel');
  if (wheelEl) {
    const deg = (car.wheelAngle || 0) * 88;
    wheelEl.style.transform = `rotate(${deg}deg)`;
  }

  const gasActive = keys.KeyW || keys.ArrowUp || touch.gas;
  const brkActive = keys.KeyS || keys.ArrowDown || touch.brk;
  const hbActive = keys.Space || touch.hb;
  if ($('tGas')) $('tGas').classList.toggle('pedalPressed', !!gasActive);
  if ($('tBrk')) $('tBrk').classList.toggle('pedalPressed', !!brkActive);
  if ($('tHbk')) $('tHbk').classList.toggle('hbActive', !!hbActive);

  // إشارة الانعطاف على التابلوه وإضاءة الليل
  const blinkOn = Math.floor(performance.now() / 360) % 2 === 0;
  const sigL = blinkOn && (car.turnSignal < 0 || car.hazards);
  const sigR = blinkOn && (car.turnSignal > 0 || car.hazards);
  if (sigL || sigR) {
    g.fillStyle = '#3dff8a';
    g.font = 'bold 14px sans-serif';
    g.textAlign = 'center';
    if (sigL) g.fillText('◀', cx - r * 0.55, cy - r * 0.28);
    if (sigR) g.fillText('▶', cx + r * 0.55, cy - r * 0.28);
  }
  const hr = (G.clock / 60) % 24;
  const isNight = hr >= 18 || hr < 6;
  const dash = $('dashboardCockpit');
  if (dash) dash.style.filter = isNight ? 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.28))' : '';

  drawRearViewMirror();
}

function drawRearViewMirror() {
  const cvs = $('rearMirrorCanvas');
  if (!cvs) return;
  // Don't waste CPU/canvas cycles redrawing when parked or if element is hidden
  if (Math.abs(car.speed || 0) < 0.05 && drawRearViewMirror._drawn) return;
  drawRearViewMirror._drawn = true;
  const g = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  g.clearRect(0, 0, W, H);

  // 1. سماء الأفق الخلفي متدرجة بألوان واقعية
  const skyGrad = g.createLinearGradient(0, 0, 0, H * 0.45);
  skyGrad.addColorStop(0, '#2b4461');
  skyGrad.addColorStop(1, '#8ed1e8');
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, W, H * 0.45);

  // صورة ظلية لمباني وأبراج الأفق في الخلفية
  g.fillStyle = '#223242';
  g.fillRect(10, H * 0.32, 22, H * 0.13);
  g.fillRect(35, H * 0.26, 18, H * 0.19);
  g.fillRect(56, H * 0.35, 14, H * 0.10);
  g.fillRect(W - 75, H * 0.30, 24, H * 0.15);
  g.fillRect(W - 48, H * 0.24, 16, H * 0.21);
  g.fillRect(W - 28, H * 0.34, 20, H * 0.11);

  // 2. الأسفلت والأرضية الخلفية بآفاق منظورية
  const roadGrad = g.createLinearGradient(0, H * 0.45, 0, H);
  roadGrad.addColorStop(0, '#32363d');
  roadGrad.addColorStop(1, '#181a1d');
  g.fillStyle = roadGrad;
  g.fillRect(0, H * 0.45, W, H * 0.55);

  // أرصفة الطريق الجانبية (أبيض وأسود مصري)
  const vanishX = W * 0.5, vanishY = H * 0.45;
  g.fillStyle = '#424850';
  g.beginPath();
  g.moveTo(0, H); g.lineTo(vanishX - 35, vanishY); g.lineTo(vanishX - 24, vanishY); g.lineTo(0, H - 12);
  g.fill();
  g.beginPath();
  g.moveTo(W, H); g.lineTo(vanishX + 35, vanishY); g.lineTo(vanishX + 24, vanishY); g.lineTo(W, H - 12);
  g.fill();

  // خطوط أطراف الأسفلت المائلة
  g.strokeStyle = '#5a6472';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(vanishX - 22, vanishY);
  g.lineTo(8, H);
  g.moveTo(vanishX + 22, vanishY);
  g.lineTo(W - 8, H);
  g.stroke();

  // خطوط منتصف الطريق المتقطعة المتحركة مع سرعة السيارة
  const timeSec = (typeof performance !== 'undefined') ? performance.now() * 0.001 : Date.now() * 0.001;
  const speedOffset = (timeSec * (car.speed || 0) * 1.8) % 18;
  g.strokeStyle = 'rgba(235, 242, 248, 0.75)';
  g.lineWidth = 1.8;
  for (let dy = speedOffset; dy < H - vanishY; dy += 14) {
    const y0 = vanishY + dy;
    const y1 = Math.min(H, y0 + 7);
    if (y0 < vanishY + 2) continue;
    g.beginPath();
    g.moveTo(vanishX, y0);
    g.lineTo(vanishX, y1);
    g.stroke();
  }

  // خط التوجيه الأخضر المركزي (HUD GPS Arrow)
  g.strokeStyle = 'rgba(16, 185, 129, 0.9)';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(vanishX, vanishY + 4);
  g.lineTo(vanishX, H - 3);
  g.stroke();

  // 3. رسم المركبات القادمة من الخلف بدقة منظورية حقيقية
  if (typeof traffic !== 'undefined' && traffic && traffic.length) {
    const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
    for (const v of traffic) {
      if (!v || !v.mesh) continue;
      const dx = v.mesh.position.x - car.x;
      const dz = v.mesh.position.z - car.z;
      // المسافة الخلفية الفعلية
      const distBehind = -(dx * fx + dz * fz);
      // المسافة العرضية (يمين / يسار)
      const distLat = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);

      if (distBehind > 2.5 && distBehind < 65 && Math.abs(distLat) < 18) {
        const factor = clamp(1 - (distBehind / 65), 0.08, 1);
        const mirrorVehX = vanishX + distLat * factor * 5.2;
        const mirrorVehY = vanishY + factor * (H - vanishY - 2);
        const isHiace = v.kind === 'hiace' || v.kind === 'micro' || v.kind === 'sprinter';
        const vehW = Math.max(10, (isHiace ? 32 : 26) * factor);
        const vehH = Math.max(7, (isHiace ? 24 : 17) * factor);

        // هيكل المركبة في المرآة
        g.fillStyle = isHiace ? '#edf2f7' : '#1e242b';
        g.fillRect(mirrorVehX - vehW / 2, mirrorVehY - vehH, vehW, vehH);

        // زجاج السيارة الأمامي
        g.fillStyle = '#1e3a4c';
        g.fillRect(mirrorVehX - vehW * 0.38, mirrorVehY - vehH + 1.5, vehW * 0.76, vehH * 0.42);

        // كشافات الإضاءة الأمامية المضيئة
        g.fillStyle = '#fffbeb';
        g.beginPath();
        const lampR = Math.max(1.4, 2.8 * factor);
        g.arc(mirrorVehX - vehW * 0.36, mirrorVehY - 3, lampR, 0, Math.PI * 2);
        g.arc(mirrorVehX + vehW * 0.36, mirrorVehY - 3, lampR, 0, Math.PI * 2);
        g.fill();

        // هالة نور الكشافات
        g.fillStyle = 'rgba(255, 240, 160, 0.28)';
        g.beginPath();
        g.arc(mirrorVehX - vehW * 0.36, mirrorVehY - 3, lampR * 2.2, 0, Math.PI * 2);
        g.arc(mirrorVehX + vehW * 0.36, mirrorVehY - 3, lampR * 2.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // تحديث عداد الركاب
  if ($('passengersCount')) {
    if (G.car === 'hiace') {
      $('passengersCount').textContent = '14';
    } else if (M.phase === 'toDest') {
      $('passengersCount').textContent = '4';
    } else {
      $('passengersCount').textContent = '1';
    }
  }
}

function renderLeaderboard() {}

function updateHUD() {
  if ($('btnSiren')) {
    $('btnSiren').classList.toggle('hidden', G.mode !== 'police');
    $('btnSiren').classList.toggle('activeSiren', !!(typeof POLICE !== 'undefined' && POLICE.siren));
    $('btnSiren').title = 'سرينة الشرطة (J للتشغيل والإيقاف · K لتغيير النغمة)';
  }
  if ($('tSiren')) {
    $('tSiren').classList.toggle('hidden', G.mode !== 'police');
    $('tSiren').classList.toggle('activeSiren', !!(typeof POLICE !== 'undefined' && POLICE.siren));
    $('tSiren').title = 'سرينة الشرطة (J للتشغيل والإيقاف · K لتغيير النغمة)';
  }
  if (typeof checkOrientationTip === 'function') checkOrientationTip();
  $('modeTitle').textContent=G.mode==='police'?'شرطة أسيوط':'Uber Driver';$('modeSubtitle').textContent=G.mode==='police'?'دورية · قسم أول وقسم ثاني':'وردية أسيوط';renderPoliceDispatch();
  const rk = rankInfo();
  $('rankName').textContent = rk.name;
  $('xp').textContent = fmt(G.xp);
  $('xpfill').style.width = (rk.p * 100).toFixed(1) + '%';
  $('money').textContent = fmt(G.money);
  if ($('fuelLevel')) {
    const fPct = Math.round(G.fuel == null ? 100 : G.fuel);
    $('fuelLevel').textContent = fPct + '%';
    $('fuelLevel').style.color = fPct <= 20 ? '#ff5a5a' : fPct <= 40 ? '#ffd34d' : '';
  }

  const hh = Math.floor(G.clock / 60) % 24;
  const mm = Math.floor(G.clock % 60);
  const wObj = WEATHERS.find(w => w.id === G.weather) || WEATHERS[0];
  $('clockTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${wObj.icon}`;

  // اسم الحي الحالي
  if ($('zoneBadge') && typeof PLACES !== 'undefined') {
    let best = PLACES[0], bestD = Infinity;
    for (const p of PLACES) {
      const d = (p.x - car.x) * (p.x - car.x) + (p.z - car.z) * (p.z - car.z);
      if (d < bestD) { bestD = d; best = p; }
    }
    $('zoneBadge').textContent = best.name;
  }

  updateMissionCard();
  drawSpeedo();
  updateDriverPhone();
  updateSignalHint();

  const combo = $('combo');
  if (G.combo >= 3) {
    combo.classList.remove('hidden');
    combo.textContent = `كومبو ×2 🔥 (${G.combo})`;
  } else combo.classList.add('hidden');
}

/* =====================================================================
   المودالات
   ===================================================================== */
let modalPrev = 'menu';

function showModal(html) {
  if (G.state !== 'modal') modalPrev = (G.state === 'menu') ? 'menu' : 'play';
  G.state = 'modal';
  const hasClose = /data-act=["']close["']/.test(html);
  $('modalPanel').innerHTML = html + (hasClose ? '' : '<div style="margin-top:16px"><button class="bigBtn" data-act="close">متابعة القيادة</button></div>');
  $('modal').classList.remove('hidden');
  $('prompt').classList.remove('on');
}
if (typeof $ === 'function' && $('modal')) {
  $('modal').addEventListener('click', e => {
    if (e.target === $('modal')) closeModal();
  });
}
function closeModal() {
  $('modal').classList.add('hidden');
  if (modalPrev === 'play') {
    G.state = 'play';
    if (G.mode!=='rides' && M.phase === 'none' && !M.race && M.respawn <= 0) {
      M.respawn = .3;
      M.after = { type: 'normal' };
    }
  } else {
    G.state = 'menu';
  }
}

/* =====================================================================
   الإدخال
   ===================================================================== */
const keys = {};
const touch = { left: false, right: false, gas: false, brk: false, hb: false };

const CAM_LABELS=['خارج قريب','خارج بعيد','من الداخل (التابلوه)','علوية'];
function setCamMode(mode){
  G.camMode=((+mode||0)%4+4)%4;
  for(const b of document.querySelectorAll?.('.camBtn')||[])b.classList?.toggle?.('active',+b.dataset?.cam===G.camMode);
  if($('setCam'))$('setCam').value=String(G.camMode);
}
for(const b of document.querySelectorAll?.('.camBtn')||[])b.addEventListener?.('click',()=>{setCamMode(+b.dataset.cam);setObjective('وجهة النظر: '+CAM_LABELS[G.camMode],1300);});
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyG') handleG();
  if (e.code === 'KeyH') honk();
  if (e.code === 'KeyC') {
    setCamMode(G.camMode + 1);
    setObjective('وجهة النظر: ' + CAM_LABELS[G.camMode], 1500);
  }
  if (e.code === 'KeyM') setSound(!G.sound);
  if (e.code === 'KeyN') setMusic(!G.music);
  if (e.code === 'KeyT') {
    const cur = TIME_PRESETS.findIndex(p => Math.abs(p.t - G.clock) < 1);
    setTimePreset(cur < 0 ? 1 : cur + 1);
  }
  if (e.code === 'KeyV') {
    const idx = WEATHERS.findIndex(w => w.id === G.weather);
    setWeather(WEATHERS[(idx + 1) % WEATHERS.length].id);
    updateHUD();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (G.state === 'play') pauseGame();
    else if (G.state === 'pause') resumeGame();
    else if (G.state === 'modal') closeModal();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });

function bindTouch(id, prop) {
  const el = $(id);
  if (!el) return;
  const on = e => {
    e.preventDefault();
    touch[prop] = true;
    el.classList.add('activeTouch');
    document.body.classList.add('touch');
  };
  const off = e => {
    e.preventDefault();
    touch[prop] = false;
    el.classList.remove('activeTouch');
  };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
function setupSteerControls() {
  const btnL = $('tL');
  const btnR = $('tR');
  const deck = $('steerDeck') || $('wheelDeck');
  if (!btnL || !btnR) return;

  function setSteer(left, right) {
    touch.left = !!left;
    touch.right = !!right;
    btnL.classList.toggle('activeTouch', touch.left);
    btnR.classList.toggle('activeTouch', touch.right);
    document.body.classList.add('touch');
  }

  // Pointer events on Left button (Turns Left)
  btnL.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { btnL.setPointerCapture(e.pointerId); } catch {}
    setSteer(true, false);
  });
  btnL.addEventListener('pointerup', e => {
    e.preventDefault();
    try { btnL.releasePointerCapture(e.pointerId); } catch {}
    setSteer(false, false);
  });
  btnL.addEventListener('pointercancel', e => {
    e.preventDefault();
    setSteer(false, false);
  });

  // Pointer events on Right button (Turns Right)
  btnR.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { btnR.setPointerCapture(e.pointerId); } catch {}
    setSteer(false, true);
  });
  btnR.addEventListener('pointerup', e => {
    e.preventDefault();
    try { btnR.releasePointerCapture(e.pointerId); } catch {}
    setSteer(false, false);
  });
  btnR.addEventListener('pointercancel', e => {
    e.preventDefault();
    setSteer(false, false);
  });

  // Support sliding smoothly between left and right arrows
  if (deck) {
    deck.addEventListener('pointermove', e => {
      if (e.buttons === 0 && !e.pressure) return;
      const rectL = btnL.getBoundingClientRect();
      const rectR = btnR.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;
      const inL = x >= rectL.left - 10 && x <= rectL.right + 5 && y >= rectL.top - 20 && y <= rectL.bottom + 20;
      const inR = x >= rectR.left - 5 && x <= rectR.right + 10 && y >= rectR.top - 20 && y <= rectR.bottom + 20;
      if (inL) setSteer(true, false);
      else if (inR) setSteer(false, true);
    });
  }
}
setupSteerControls();
bindTouch('tGas', 'gas');
bindTouch('tBrk', 'brk');
bindTouch('tHbk', 'hb');
if ($('tG')) $('tG').addEventListener('pointerdown', e => { e.preventDefault(); document.body.classList.add('touch'); handleG(); });
if ($('tHonk')) $('tHonk').addEventListener('pointerdown', e => { e.preventDefault(); document.body.classList.add('touch'); honk(); });
if ($('tCam')) $('tCam').addEventListener('pointerdown', e => { e.preventDefault(); document.body.classList.add('touch'); setCamMode(G.camMode + 1); });
if ($('tSiren')) $('tSiren').addEventListener('pointerdown', e => {
  e.preventDefault();
  document.body.classList.add('touch');
  if (G.mode === 'police') {
    POLICE.siren = !POLICE.siren;
    sfxUI();
    updateHUD();
  }
});

function checkOrientationTip() {
  const tip = $('orientationTip');
  if (!tip) return;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('dismiss_orient_tip') === '1'; } catch {}
  const isPortraitMobile = innerHeight > innerWidth && innerWidth <= 640;
  tip.classList.toggle('hidden', dismissed || !isPortraitMobile || G.state !== 'play');
}
if ($('closeOrientTip')) {
  $('closeOrientTip').addEventListener('click', () => {
    $('orientationTip')?.classList.add('hidden');
    try { sessionStorage.setItem('dismiss_orient_tip', '1'); } catch {}
  });
}
addEventListener('resize', checkOrientationTip);

if ('ontouchstart' in window || matchMedia('(pointer: coarse)').matches) {
  document.body.classList.add('touch');
}
addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') document.body.classList.add('touch');
  initAudio();
}, { once: true });

function releaseDrivingInput(){
  for(const k of Object.keys(keys))keys[k]=false;
  for(const k of Object.keys(touch))touch[k]=false;
  resetSimulationClock();
  if(G.state==='play')pauseGame();
}
addEventListener('blur',releaseDrivingInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseDrivingInput();});

if($('btnSiren'))$('btnSiren').addEventListener('click',()=>{if(G.mode==='police'){POLICE.siren=!POLICE.siren;sfxUI();updateHUD();}});

/* ========================= 83-vehicle-signals.js ========================= */
const VEHICLE_SIGNALS={brake:false,reverse:false,left:false,right:false,blink:0,manual:0,hazards:false};
/* Exact surface-measured lamp sockets (FL/RL positive half-widths mirrored across Z=0) for each imported vehicle GLB. */
function getUploadedLampAnchorsTable(){
 return {
  qashqai:{head:[2.00,.85,.61],frontTurn:[1.93,.88,.75],brake:[-2.04,1.03,.66],reverse:[-2.10,1.03,.46],rearTurn:[-2.00,1.03,.75]},
  roadster:{head:[1.85,.75,.61],frontTurn:[1.77,.76,.74],brake:[-1.94,.86,.61],reverse:[-2.00,.82,.47],rearTurn:[-1.89,.88,.70]},
  micra:{head:[1.61,.79,.59],frontTurn:[1.56,.82,.65],brake:[-1.69,.77,.63],reverse:[-1.74,.69,.54],rearTurn:[-1.71,.75,.73]},
  sentra18:{head:[2.13,.71,.54],frontTurn:[2.04,.75,.66],brake:[-2.14,.88,.61],reverse:[-2.18,.84,.44],rearTurn:[-2.10,.89,.73]},
  sport370:{head:[1.83,.67,.61],frontTurn:[1.76,.68,.73],brake:[-1.95,.76,.59],reverse:[-2.00,.74,.46],rearTurn:[-1.91,.80,.70]},
  epower:{head:[2.08,.68,.63],frontTurn:[1.97,.72,.78],brake:[-2.17,.90,.62],reverse:[-2.22,.91,.43],rearTurn:[-2.10,.92,.76]},
  versa:{head:[2.00,.68,.58],frontTurn:[1.96,.68,.56],brake:[-2.04,.88,.63],reverse:[-2.08,.84,.52],rearTurn:[-2.02,.85,.63]},
  xtrail:{head:[2.15,.75,.61],frontTurn:[1.96,.95,.73],brake:[-2.13,1.15,.64],reverse:[-2.17,1.16,.47],rearTurn:[-2.05,1.14,.77]},
  altima:{head:[2.21,.66,.61],frontTurn:[2.03,.71,.79],brake:[-2.25,.90,.62],reverse:[-2.31,.90,.44],rearTurn:[-2.20,.87,.75]},
  fiat1300:{head:[1.88,.61,.51],frontTurn:[1.79,.61,.68],brake:[-1.95,.72,.52],reverse:[-1.95,.72,.47],rearTurn:[-1.92,.72,.61]},
  policeSuburban:{head:[2.48,.93,.80],frontTurn:[2.55,1.00,.84],brake:[-2.62,1.04,.84],reverse:[-2.65,.92,.84],rearTurn:[-2.64,1.14,.85]},
  policeDuster:{head:[1.98,.78,.68],frontTurn:[1.90,.82,.74],brake:[-2.03,.92,.74],reverse:[-2.06,.86,.62],rearTurn:[-2.00,.94,.77]}
 };
}
function getVehicleLampAnchors(c,visual){
 const key=c?.asset||c?.id,exact=getUploadedLampAnchorsTable()[key];
 if(exact)return exact;
 const box=visual?new THREE.Box3().setFromObject(visual):null;
 const maxX=box&&isFinite(box.max.x)?box.max.x:(c?.length||4.4)/2,minX=box&&isFinite(box.min.x)?box.min.x:-(c?.length||4.4)/2;
 const h=box&&isFinite(box.max.y)?box.max.y:1.55,hw=c?.halfWidth||.9;
 return{head:[maxX-.14,h*.48,hw*.66],frontTurn:[maxX-.18,h*.50,hw*.77],brake:[minX+.06,h*.56,hw*.70],reverse:[minX+.04,h*.52,hw*.52],rearTurn:[minX+.07,h*.56,hw*.79]};
}
function createVehicleSignals(c,visual){
 const group=new THREE.Group(),brakeMats=[],a=getVehicleLampAnchors(c,visual);
 const lens=(x,y,z,color,w=.12,ht=.062)=>{const mat=new THREE.MeshBasicMaterial({color,toneMapped:false,transparent:true,opacity:1});const mesh=new THREE.Mesh(new THREE.BoxGeometry(.034,ht,w),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const brakes=[],reverse=[],left=[],right=[];
 if(c.id==='policeSuburban'){
  for(const side of [-1,1]){reverse.push(lens(a.reverse[0],a.reverse[1],side*a.reverse[2],0xf3f7ff,.075,.055));const target=side<0?left:right;target.push(lens(a.frontTurn[0],a.frontTurn[1],side*a.frontTurn[2],0xffae18,.085,.055),lens(a.rearTurn[0],a.rearTurn[1],side*a.rearTurn[2],0xffae18,.085,.055));}
  group.traverse(o=>{if(o.isMesh){o.scale.x=.35;o.scale.y=.65;}});
 }else if(!c.police)
 for(const side of [-1,1]){brakes.push(lens(a.brake[0]-.008,a.brake[1],side*a.brake[2],0xff2420,.14,.062));reverse.push(lens(a.reverse[0]-.01,a.reverse[1],side*a.reverse[2],0xf3f7ff,.10,.052));const target=side<0?left:right;target.push(lens(a.frontTurn[0]+.01,a.frontTurn[1],side*a.frontTurn[2],0xffae18,.11,.052),lens(a.rearTurn[0]-.01,a.rearTurn[1],side*a.rearTurn[2],0xffae18,.10,.052));}
 if(visual)visual.traverse(o=>{if(o.isMesh&&/red.?glass|brakelight|back_lights|red_lens|weideng|glass_solid_red|glass_basic_red/i.test(o.material?.name||''))brakeMats.push(o.material);});
 return {group,brakes,reverse,left,right,brakeMats,anchors:a};
}
function updateVehicleSignals(dt){
 const s=VEHICLE_SIGNALS;s.blink=(s.blink+dt)% .9;
 const braking=keys.KeyS||keys.ArrowDown||touch.brk||keys.Space||touch.hb;
 s.brake=!!braking&&car.speed>-.15;s.reverse=car.speed<-.15;
 const steer=(keys.KeyA||keys.ArrowLeft||touch.left?1:0)-(keys.KeyD||keys.ArrowRight||touch.right?1:0);
 s.left=s.hazards||s.manual===-1||(!s.manual&&steer>0);s.right=s.hazards||s.manual===1||(!s.manual&&steer<0);
 const rig=taxiRig.signals;if(!rig)return;
 for(const o of rig.brakes){o.material.color.setHex(s.brake?0xff1410:0x67130f);o.material.opacity=s.brake?1:.35;}
 for(const m of rig.brakeMats){m.emissive.setHex(0xff2416);m.emissiveIntensity=s.brake?2:.08;}
 for(const o of rig.reverse)o.visible=s.reverse;
 for(const o of rig.left)o.visible=s.left&&s.blink<.45;
 for(const o of rig.right)o.visible=s.right&&s.blink<.45;
}
addEventListener('keydown',e=>{if(G.state!=='play'||e.repeat)return;if(e.code==='KeyQ')VEHICLE_SIGNALS.manual=VEHICLE_SIGNALS.manual===-1?0:-1;if(e.code==='KeyE')VEHICLE_SIGNALS.manual=VEHICLE_SIGNALS.manual===1?0:1;if(e.code==='KeyZ')VEHICLE_SIGNALS.hazards=!VEHICLE_SIGNALS.hazards;});

/* ========================= 84-dynamics.js ========================= */
/* Vehicle simulation: metres, seconds, radians. Kept independent of rendering for deterministic checks. */
const SIM_STEP = 1 / 120;
const PHYSICS_GRAVITY = 9.81;
function approachZero(value, amount) { return Math.sign(value) * Math.max(0, Math.abs(value) - amount); }
function vehicleParameters() {
 const stats=carStats(),definition=CARS[G.carIdx]||CARS[0],kind=definition.body;
 const onRoad=typeof onDrivingRoad==='function'?onDrivingRoad(car.x,car.z,0.5):true;
 return {...stats, rain:G.weather==='rain', offroad:!onRoad, slopeSin:car.slopeSin||0, airborne:!!car.airborne,
  wheelbase:definition.wheelbase||(kind==='micro'?2.95:2.65),
  halfLength:definition.length?definition.length/2:definition.id==='sunny'?2.2125:kind==='micro'?2.4:2.1, halfWidth:definition.halfWidth||(kind==='micro'?.97:.91),
  mass:definition.mass||(kind==='micro'?2100:kind==='sedan'?1150:1450)};
}
function advanceVehicle(s,input,p,dt) {
 const oldSpeed=s.speed,wet=p.rain?.70:1,surfaceGrip=p.offroad?.78:1,contactGrip=p.airborne?.35:1;
 const gripBonus=Math.min(1.16,Math.max(.8,p.grip/8.5));
 const traction=PHYSICS_GRAVITY*.94*wet*surfaceGrip*contactGrip*gripBonus;
 let v=s.vel.x*Math.cos(s.heading)-s.vel.y*Math.sin(s.heading);
 const previousSide=s.vel.x*Math.sin(s.heading)+s.vel.y*Math.cos(s.heading);
 let acceleration=0;
 s.reverseHold=s.reverseHold||0;
 s.throttle=s.throttle||0;
 s.brakePedal=s.brakePedal||0;
 const targetThrottle=(input.gas&&!input.brake)?1:0;
 s.throttle+=(targetThrottle-s.throttle)*(1-Math.exp(-dt*(targetThrottle?8.5:14)));
 const targetBrake=input.brake?1:0;
 s.brakePedal+=(targetBrake-s.brakePedal)*(1-Math.exp(-dt*(targetBrake?16:20)));

 const effectiveTopSpeed = p.topSpeed || 36;
 // Give the brake pedal enough authority at city speeds without allowing
 // an arcade-style instant stop.  The old cap made the heavier cars feel
 // as if the brakes were worn out, especially in the rain.
 const maxBrakeGrip = traction * .95;
 if(input.gas&&!input.brake) {
  s.reverseHold=0;
  if(v<-.15)v=approachZero(v,Math.min(p.brake*.42,maxBrakeGrip)*dt);
  else {
   const ratio=Math.min(1,Math.max(0,v)/effectiveTopSpeed);
   const dragAtTop=.18+.0028*effectiveTopSpeed*effectiveTopSpeed;
   const fullAccel=Math.min(traction*.85,p.accel*.35*(1-ratio*ratio)+dragAtTop*ratio*ratio);
   acceleration=fullAccel*(.35+.65*s.throttle);
  }
 } else if(input.brake) {
  if(v>.04||input.gas) {
   const brakeMult = Math.min(p.brake*.38*(.58+.42*s.brakePedal), maxBrakeGrip);
   v=approachZero(v,brakeMult*dt);
   s.reverseHold=0;
  }
  else {s.reverseHold+=dt;if(s.reverseHold>.32)acceleration=-2.6*Math.max(0,1-Math.abs(v)/6);else v=0;}
 } else s.reverseHold=0;
 v+=acceleration*dt;
 // جاذبية المنحدرات (الكباري والأنفاق) ومقاومة الهواء والأسفلت
 const slopeGravity=PHYSICS_GRAVITY*(p.slopeSin||0);
 v-=slopeGravity*dt;
 const rollingBase=.18+(p.offroad?.42:0);
 const resistance=rollingBase+.0028*v*v+(!input.gas&&!input.brake?.30:0);
 v=approachZero(v,resistance*dt);
 if(input.handbrake)v=approachZero(v,(p.rain?3.8:5.2)*dt*(p.airborne?.25:1));
 v=Math.max(-8,Math.min(effectiveTopSpeed,v));
 if(Math.abs(v)<.025&&!input.gas&&!input.brake&&Math.abs(p.slopeSin||0)<.02)v=0;
 const steerTarget=(input.left?1:0)-(input.right?1:0);
 const steerRate=(steerTarget===0)?(18+Math.abs(v)*.32):(steerTarget*s.steer<0?24:18);
 s.steer+=(steerTarget-s.steer)*(1-Math.exp(-dt*steerRate));
 const speedSteerDamp=1/(1+Math.max(0,Math.abs(v)-18)*.012);
 const angleLimit=Math.min(.68,Math.atan(traction*1.65*p.wheelbase/(v*v*.62+4))*1.24)*speedSteerDamp;
 const steeringGain=Math.max(.85,Math.min(1.2,(p.steer||2)/2));
 s.wheelAngle=s.steer*angleLimit*steeringGain;
 let desiredYaw=v/p.wheelbase*Math.tan(s.wheelAngle);
 const yawLimit=traction*1.11/Math.max(2,Math.abs(v));
 desiredYaw=Math.max(-yawLimit,Math.min(yawLimit,desiredYaw));
 if(input.handbrake&&Math.abs(v)>6)desiredYaw*=1.18;
 s.yawRate=(s.yawRate||0)+(desiredYaw-(s.yawRate||0))*(1-Math.exp(-dt*(input.handbrake?4.5:18)));
 if(Math.abs(v)<.03)s.yawRate=0;
 s.heading+=s.yawRate*dt;
 s.heading=Math.atan2(Math.sin(s.heading),Math.cos(s.heading));
 const fx=Math.cos(s.heading),fz=-Math.sin(s.heading),rx=-fz,rz=fx;
 // Preserve lateral momentum while giving modern street cornering grip under throttle (handbrake still drifts).
 let side=previousSide+v*Math.sin(s.yawRate*dt);
 const sideRate=input.handbrake?1.5:Math.max(12.5,p.grip*1.38)*wet*surfaceGrip*contactGrip;
 const baseBudget=Math.sqrt(Math.max(.35,traction*traction-Math.min(traction*.82,Math.abs(acceleration))**2));
 const lateralBudget=input.handbrake?baseBudget:Math.max(baseBudget,Math.abs(v*s.yawRate)*1.12);
 side=approachZero(side,Math.min(Math.abs(side)*sideRate,lateralBudget)*dt);
 s.vel.x=fx*v+rx*side;s.vel.y=fz*v+rz*side;
 s.speed=v;
 const rawLongAccel=(Math.abs(v)<.05&&!input.gas&&!input.brake)?0:clamp((v-oldSpeed)/Math.max(.001,dt),-16,12);
 s.longAccel=(s.longAccel||0)+(rawLongAccel-(s.longAccel||0))*(1-Math.exp(-dt*15));
 s.lateralAccel=s.yawRate*v;
 s.x+=s.vel.x*dt;s.z+=s.vel.y*dt;
}
function obbContact(a,b) {
 const af={x:Math.cos(a.heading||0),z:-Math.sin(a.heading||0)},ar={x:-af.z,z:af.x};
 const bf={x:Math.cos(b.heading||0),z:-Math.sin(b.heading||0)},br={x:-bf.z,z:bf.x};
 const dx=a.x-b.x,dz=a.z-b.z;
 let depth=Infinity,nx=0,nz=0;
 for(const axis of [af,ar,bf,br]) {
  const ra=a.hl*Math.abs(af.x*axis.x+af.z*axis.z)+a.hw*Math.abs(ar.x*axis.x+ar.z*axis.z);
  const rb=b.hl*Math.abs(bf.x*axis.x+bf.z*axis.z)+b.hw*Math.abs(br.x*axis.x+br.z*axis.z);
  const projection=dx*axis.x+dz*axis.z,overlap=ra+rb-Math.abs(projection);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;const sign=projection>=0?1:-1;nx=axis.x*sign;nz=axis.z*sign;}
 }
 return {depth,nx,nz};
}
function playerBounds() {const p=vehicleParameters();return {x:car.x,z:car.z,heading:car.heading,hl:p.halfLength,hw:p.halfWidth};}
function syncCarSpeed() {car.speed=car.vel.x*Math.cos(car.heading)-car.vel.y*Math.sin(car.heading);}
const SPARK_COUNT = 55;
let sparkMesh = null;
let sparkData = null;

function initSparkSystem() {
 if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;
 const positions = new Float32Array(SPARK_COUNT * 3);
 for (let i = 0; i < SPARK_COUNT; i++) {
  positions[i * 3 + 1] = -500;
 }
 const geo = new THREE.BufferGeometry();
 geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
 const mat = new THREE.PointsMaterial({
  color: 0xffb84d,
  size: 0.17,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending
 });
 sparkMesh = new THREE.Points(geo, mat);
 sparkMesh.frustumCulled = false;
 scene.add(sparkMesh);

 sparkData = [];
 for (let i = 0; i < SPARK_COUNT; i++) {
  sparkData.push({ x: 0, y: -500, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
 }
}

function spawnVehicleSparks(x, y, z, tangentX, tangentZ, count = 6) {
 if (!sparkMesh && typeof scene !== 'undefined') initSparkSystem();
 if (!sparkData) return;
 let spawned = 0;
 for (let i = 0; i < SPARK_COUNT && spawned < count; i++) {
  const p = sparkData[i];
  if (p.life <= 0) {
   p.x = x + (Math.random() - 0.5) * 0.25;
   p.y = y + Math.random() * 0.15;
   p.z = z + (Math.random() - 0.5) * 0.25;
   p.vx = -tangentX * 0.45 + (Math.random() - 0.5) * 4.5;
   p.vy = 1.2 + Math.random() * 3.2;
   p.vz = -tangentZ * 0.45 + (Math.random() - 0.5) * 4.5;
   p.life = 0.16 + Math.random() * 0.16;
   spawned++;
  }
 }
}

function updateVehicleSparks(dt) {
 if (!sparkMesh || !sparkData) return;
 const pos = sparkMesh.geometry.attributes.position.array;
 let active = false;
 for (let i = 0; i < SPARK_COUNT; i++) {
  const p = sparkData[i];
  if (p.life > 0) {
   p.life -= dt;
   p.vy -= 14 * dt;
   p.x += p.vx * dt;
   p.y += p.vy * dt;
   p.z += p.vz * dt;
   const groundY = typeof roadHeightAt === 'function' ? roadHeightAt(p.x, p.z) + 0.03 : 0.03;
   if (p.y < groundY && p.vy < 0) {
    p.y = groundY;
    p.vy = -p.vy * 0.35;
    p.vx *= 0.65;
    p.vz *= 0.65;
   }
   pos[i * 3] = p.x;
   pos[i * 3 + 1] = p.y;
   pos[i * 3 + 2] = p.z;
   active = true;
  } else {
   pos[i * 3 + 1] = -500;
  }
 }
 if (active) sparkMesh.geometry.attributes.position.needsUpdate = true;
}

function staticContact(hit) {
 if (!hit) return 0;
 car.x += hit.nx * (hit.depth + 0.002);
 car.z += hit.nz * (hit.depth + 0.002);
 const closing = car.vel.x * hit.nx + car.vel.y * hit.nz;

 const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
 const rx = -fz, rz = fx;
 const frontDot = hit.nx * fx + hit.nz * fz;
 const sideDot = hit.nx * rx + hit.nz * rz;

 const tangentX = car.vel.x - hit.nx * (car.vel.x * hit.nx + car.vel.y * hit.nz);
 const tangentZ = car.vel.y - hit.nz * (car.vel.x * hit.nx + car.vel.y * hit.nz);
 const tangentSpeed = Math.hypot(tangentX, tangentZ);

 if (closing >= 0) {
  // احتكاك حك مستمر أثناء الانزلاق بجانب مبنى أو سور (Scraping drag)
  if (tangentSpeed > 3.2) {
   const frictionDecel = Math.min(tangentSpeed * 0.5, 6.5 * SIM_STEP);
   car.vel.x -= (tangentX / tangentSpeed) * frictionDecel;
   car.vel.y -= (tangentZ / tangentSpeed) * frictionDecel;
   if (typeof sfxScrape === 'function') sfxScrape(Math.min(0.2, tangentSpeed / 15));
   spawnVehicleSparks(car.x - hit.nx * 0.9, car.y + 0.35, car.z - hit.nz * 0.9, tangentX, tangentZ, 3);
  }
  syncCarSpeed();
  return 0;
 }

 const impact = -closing;
 // ارتداد صدمة فيزيائي مرن
 const restitution = impact > 12 ? 0.06 : impact > 5 ? 0.08 : 0.10;
 car.vel.x -= closing * (1 + restitution) * hit.nx;
 car.vel.y -= closing * (1 + restitution) * hit.nz;

 // احتكاك كولوم مع الأسطح عند الصدمة
 const normalForce = Math.max(1.2, impact * 1.35 + Math.abs(car.speed) * 0.15);
 const frictionDrop = Math.min(tangentSpeed * 0.8, normalForce * 0.075);
 if (tangentSpeed > 0.1) {
  car.vel.x -= (tangentX / tangentSpeed) * frictionDrop;
  car.vel.y -= (tangentZ / tangentSpeed) * frictionDrop;
 }

 // عزم دوران للصدمات الزاوية والجانبية (Off-Center Rotational Torque)
 const angularTorque = sideDot * impact * 0.32 - frontDot * sideDot * impact * 0.20;
 car.yawRate = clamp((car.yawRate || 0) + angularTorque, -6.5, 6.5);

 // رد فعل هيكل السيارة (غطسة الصدمة وتمايلها)
 if (frontDot < -0.3) {
  car.pitch = clamp((car.pitch || 0) + impact * 0.018, -0.35, 0.35);
 } else if (frontDot > 0.3) {
  car.pitch = clamp((car.pitch || 0) - impact * 0.016, -0.35, 0.35);
 }
 car.roll = clamp((car.roll || 0) - sideDot * impact * 0.03, -0.38, 0.38);

 if (tangentSpeed > 3.2 || impact > 4.5) {
  if (typeof sfxScrape === 'function') sfxScrape(Math.min(0.25, tangentSpeed / 14));
  spawnVehicleSparks(car.x - hit.nx * 0.9, car.y + 0.35, car.z - hit.nz * 0.9, tangentX, tangentZ, 7);
 }

 syncCarSpeed();
 return impact;
}
function recordImpact(impact,message,curb=false) {
 if(impact<1.4||car.hitCd>0)return;
 applyVehicleDamage(impact);
 car.hitCd=.65;car.shake=Math.max(car.shake,Math.min(.85,impact/18));
 if(impact>3){G.combo=0;M.hits++;sfxCrash();flashScreen();}else sfxThud();
 if(message)setObjective(message,1800);
}
function contactAabb(x0,x1,z0,z1) {
 return obbContact(playerBounds(),{x:(x0+x1)/2,z:(z0+z1)/2,hl:(x1-x0)/2,hw:(z1-z0)/2,heading:0});
}
let simulationAccumulator=0;
function resetSimulationClock(){simulationAccumulator=0;}
function runFixedSimulation(frameDelta,active,stepFunction){
 if(!active){simulationAccumulator=0;return 0;}
 simulationAccumulator+=Math.min(Math.max(0,frameDelta),.25);
 let steps=0;
 while(simulationAccumulator+1e-10>=SIM_STEP&&steps<30){
  simulationAccumulator-=SIM_STEP;steps++;
  if(stepFunction(SIM_STEP)===false){simulationAccumulator=0;break;}
 }
 return steps*SIM_STEP;
}

/* ========================= 86-physics.js ========================= */
/* =====================================================================
   الفيزياء
   ===================================================================== */
function physics(dt) {
  const gas = keys.KeyW || keys.ArrowUp || touch.gas;
  const brk = keys.KeyS || keys.ArrowDown || touch.brk;
  const left = keys.KeyA || keys.ArrowLeft || touch.left;
  const right = keys.KeyD || keys.ArrowRight || touch.right;
  const hb = keys.Space || touch.hb;

  const prevX=car.x,prevZ=car.z;
  advanceVehicle(car,{gas,brake:brk,left,right,handbrake:hb},vehicleParameters(),dt);

  const ext=vehicleParameters();
  const b=ASSYUT.bounds;
  if(car.z>b.z1-ext.halfWidth){car.z=b.z1-ext.halfWidth;staticContact({nx:0,nz:-1,depth:0});}
  if(car.z<b.z0+ext.halfWidth){car.z=b.z0+ext.halfWidth;staticContact({nx:0,nz:1,depth:0});}
  if(car.x>b.x1-ext.halfLength){car.x=b.x1-ext.halfLength;staticContact({nx:-1,nz:0,depth:0});}
  if(car.x<b.x0+ext.halfLength){car.x=b.x0+ext.halfLength;staticContact({nx:1,nz:0,depth:0});}

  resolveBuildings();
  resolveCurbs(prevX, prevZ);
  resolveMedian(prevZ);
  resolveTrees();resolveInfrastructureRails();
  checkTrafficLights(prevX, prevZ, dt);
  checkCitySpeedLimit(dt);
  updateSuspension(dt);

  car.shake = Math.max(0, car.shake - dt * 2.2);
  car.hitCd = Math.max(0, car.hitCd - dt);
  car.redFineCd = Math.max(0, car.redFineCd - dt);
  car.redBonusCd = Math.max(0, (car.redBonusCd || 0) - dt);
  car.speedWarnCd = Math.max(0, (car.speedWarnCd || 0) - dt);
}

/* ------------------------- تصادم المباني ------------------------- */
const SOLID = { cell: 40, map: new Map(), built: false };
function buildSolidGrid() {
  SOLID.map.clear();
  for (const b of MAP.buildings) {
    const i0 = Math.floor(b.x0 / SOLID.cell), i1 = Math.floor(b.x1 / SOLID.cell);
    const j0 = Math.floor(b.z0 / SOLID.cell), j1 = Math.floor(b.z1 / SOLID.cell);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = i + ',' + j;
        let arr = SOLID.map.get(k);
        if (!arr) SOLID.map.set(k, arr = []);
        arr.push(b);
      }
    }
  }
  SOLID.built = true;
}

function resolveBuildings() {
  if(car.y<-0.6)return;
  if(!SOLID.built)buildSolidGrid();
  const ci=Math.floor(car.x/SOLID.cell),cj=Math.floor(car.z/SOLID.cell),seen=new Set();
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++) {
    const list=SOLID.map.get((ci+di)+','+(cj+dj));if(!list)continue;
    for(const b of list){if(seen.has(b))continue;seen.add(b);
      const hit=b.oriented?obbContact(playerBounds(),b.oriented):contactAabb(b.x0,b.x1,b.z0,b.z1);
      if(hit)recordImpact(staticContact(hit),'خبطت في مبنى — خفّف السرعة');
    }
  }
}

/* ------------------------- المطبات ------------------------- */
const BUMPS = [];
const BUMP_MAT = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: .85, metalness: .1 });
const BUMP_STRIPE = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: .6, metalness: .15 });

function addBump(cx, cz, hw, hl, axisOrHeading, h = .14, yBase = null) {
  const isHeading = typeof axisOrHeading === 'number';
  const heading = isHeading ? axisOrHeading : (axisOrHeading === 'x' ? 0 : Math.PI / 2);
  const bump = { cx, cz, hw, hl, heading, axis: isHeading ? undefined : axisOrHeading, h };
  BUMPS.push(bump);

  if (typeof scene === 'undefined') return;
  const y = yBase !== null ? yBase : (typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(cx, cz) : 0);

  const group = new THREE.Group();
  group.position.set(cx, y + .012, cz);
  group.rotation.y = heading;

  // جسد المطب المحدب الممتد عبر عرض الشارع
  const geo = new THREE.CylinderGeometry(hl, hl, hw * 2, 16, 1, false, 0, Math.PI);
  geo.rotateZ(Math.PI / 2);
  geo.rotateY(Math.PI / 2);
  geo.scale(1, h / hl, 1);
  const baseMesh = new THREE.Mesh(geo, BUMP_MAT);
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // خطوط تحذيرية صفراء متناوبة على المطب (نمط أصفر وأسود)
  const stripeSegments = Math.max(3, Math.floor((hw * 2) / 1.5));
  const segW = (hw * 2) / stripeSegments;
  for (let s = 0; s < stripeSegments; s += 2) {
    const zLocal = -hw + (s + 0.5) * segW;
    const sGeo = new THREE.CylinderGeometry(hl * 1.01, hl * 1.01, segW * 0.85, 12, 1, false, 0, Math.PI);
    sGeo.rotateZ(Math.PI / 2);
    sGeo.rotateY(Math.PI / 2);
    sGeo.scale(1, (h * 1.02) / (hl * 1.01), 1);
    const stripeMesh = new THREE.Mesh(sGeo, BUMP_STRIPE);
    stripeMesh.position.set(0, 0.002, zLocal);
    stripeMesh.receiveShadow = true;
    group.add(stripeMesh);
  }

  if (typeof REAL_CITY !== 'undefined' && REAL_CITY.group) REAL_CITY.group.add(group);
  else scene.add(group);
}

function bumpHeightAt(x, z) {
  let maxH = 0;
  for (let i = 0; i < BUMPS.length; i++) {
    const b = BUMPS[i];
    const dx = x - b.cx, dz = z - b.cz;
    let dAlong, dAcross;
    if (b.heading !== undefined) {
      const fx = Math.cos(b.heading), fz = -Math.sin(b.heading);
      dAlong = dx * fx + dz * fz;
      dAcross = -dx * fz + dz * fx;
    } else if (b.axis === 'x') {
      dAlong = dx; dAcross = dz;
    } else {
      dAlong = dz; dAcross = dx;
    }
    if (Math.abs(dAcross) > b.hw || Math.abs(dAlong) > b.hl) continue;
    const v = b.h * Math.cos((dAlong / b.hl) * (Math.PI * 0.5));
    if (v > maxH) maxH = v;
  }
  return maxH;
}

function initAssyutSpeedBumps() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.junctions || !ASSYUT.junctions.length) return;
  const bumpJunctions = [];
  const candidates = ASSYUT.junctions.slice().sort((a,b)=>Math.hypot(a.x-ASSYUT.start.x,a.z-ASSYUT.start.z)-Math.hypot(b.x-ASSYUT.start.x,b.z-ASSYUT.start.z));
  for (const j of candidates) {
    if (bumpJunctions.some(p => Math.hypot(p.x - j.x, p.z - j.z) < 95)) continue;
    bumpJunctions.push(j);
    if (bumpJunctions.length >= 30) break;
  }
  for (const j of bumpJunctions) {
    const incoming = ASSYUT.edges.filter(e => e.b === j.node), used = [];
    for (const edge of incoming) {
      const f = typeof edgeFrame === 'function' ? edgeFrame(edge) : null;
      if (!f) continue;
      const road = ASSYUT.roads[edge.road], heading = Math.atan2(-f.fz, f.fx);
      if (used.some(h => Math.abs(Math.atan2(Math.sin(h - heading), Math.cos(h - heading))) < 0.45)) continue;
      used.push(heading);
      const armW = Math.max(10, ...j.arms.map(a => a.width / 2 + 4));
      const bx = j.x - f.fx * (armW + 18), bz = j.z - f.fz * (armW + 18);
      if (typeof onDrivingRoad === 'function' && !onDrivingRoad(bx, bz, 0.4)) continue;
      if (BUMPS.some(b => Math.hypot(b.cx - bx, b.cz - bz) < 15)) continue;
      addBump(bx, bz, Math.min(road.width * 0.42, 9), 0.75, heading, 0.14);
    }
  }
}
initAssyutSpeedBumps();

/* ------------------------- حدود الأرصفة ------------------------- */
const CURB_LINES=CURB_SEGMENTS;

function curbHit(soft) {
  if (car.curbCd > 0) return;
  car.curbCd = .45;
  if (soft) sfxThud(); else sfxCrash();
}

function resolveCurbs() {} // Kerbs are tyre contact surfaces, not invisible walls.
const MEDIAN_HALF=.98;
function resolveMedian() {}
function roadHeightAt(x,z){
 if(typeof ASSYUT!=='undefined')return sampledDriveHeight(x,z,car.y,car.surfaceRoad) + bumpHeightAt(x,z);
 let h=bumpHeightAt(x,z);
 for(const t of ROAD_RAMPS)if(Math.abs(z-t.z)<t.width/2)h=Math.max(h,t.height*clamp((t.half-Math.abs(x-t.x))/1.8,0,1));
 for(const s of WALK_SURFACES){const edge=Math.min(x-s.x0,s.x1-x,z-s.z0,s.z1-z);if(edge>-.22)h=Math.max(h,s.height*clamp((edge+.22)/.44,0,1));}
 return h;
}
function resolveTrees() {
  if(car.y<-0.6)return;
  const bounds=playerBounds(),fx=Math.cos(car.heading),fz=-Math.sin(car.heading),rx=-fz,rz=fx;
  for(const t of TREES){
    const dx=t.x-car.x,dz=t.z-car.z;if(dx*dx+dz*dz>16)continue;
    const lx=dx*fx+dz*fz,lz=dx*rx+dz*rz;
    const px=clamp(lx,-bounds.hl,bounds.hl),pz=clamp(lz,-bounds.hw,bounds.hw);
    let nx=px-lx,nz=pz-lz,d=Math.hypot(nx,nz),insideDepth=0;
    if(d>=t.r)continue;
    if(d<1e-6){const ax=bounds.hl-Math.abs(lx),az=bounds.hw-Math.abs(lz);if(ax<az){nx=lx>0?-1:1;nz=0;d=1;insideDepth=t.r+ax;}else{nx=0;nz=lz>0?-1:1;d=1;insideDepth=t.r+az;}}
    const hit={nx:(nx*fx+nz*rx)/d,nz:(nx*fz+nz*rz)/d,depth:insideDepth||Math.max(.01,t.r-d)};
    recordImpact(staticContact(hit),'خبطت في نخلة — خفّف السرعة');
  }
}

/* ------------------------- إشارات المرور ------------------------- */
function checkTrafficLights(prevX,prevZ,dt){
 if(G.mode==='police'&&POLICE.siren)return;
 if(TRAFFIC_LIGHTS.some(t=>t.approaches))return checkAssyutLights(prevX,prevZ);
 for(const tl of TRAFFIC_LIGHTS)for(const axis of ['x','z']){
  const forward=axis==='x'?Math.cos(car.heading):-Math.sin(car.heading);if(Math.abs(forward)<.70||car.speed<1.2)continue;
  const dir=forward>0?1:-1,across=axis==='x'?Math.abs(car.z-tl.z):Math.abs(car.x-tl.x),half=axis==='x'?tl.halfZ:tl.halfX;if(across>half-.7)continue;
  const stop=(axis==='x'?tl.x:tl.z)-dir*((axis==='x'?tl.halfX:tl.halfZ)+2.5);
  const extent=Math.abs(forward)*vehicleParameters().halfLength+(axis==='x'?Math.abs(Math.sin(car.heading)):Math.abs(Math.cos(car.heading)))*vehicleParameters().halfWidth;
  const before=(axis==='x'?prevX:prevZ)+dir*extent,after=(axis==='x'?car.x:car.z)+dir*extent;
  const state=axis==='x'?tl.xState:tl.zState;
  if((before-stop)*dir<0&&(after-stop)*dir>=0&&state==='red'&&car.redFineCd<=0){
   car.redFineCd=6;G.money=Math.max(0,G.money-40);saveProgress();G.combo=0;if(rideBusy())M.hits++;sfxFine();flashScreen();floatText('−40 ج.م · إشارة حمراء','#ff685d');setObjective('تجاوزت خط التوقف والإشارة حمراء · مخالفة 40 ج.م',3500);
  }
 }
}

/* ------------------------- تعليق العربية ------------------------- */
function updateSuspension(dt) {
  selectDrivingSurface();
  const cs = carStats();
  const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
  const wheelbase=vehicleParameters().wheelbase,track=1.48,rx=-fz,rz=fx;
  const samples=[];
  for(const axle of [1,-1])for(const side of [-1,1])samples.push(roadHeightAt(car.x+fx*axle*wheelbase/2+rx*side*track/2,car.z+fz*axle*wheelbase/2+rz*side*track/2));
  car.wheelGround=samples;
  const hf=(samples[0]+samples[1])/2,hr=(samples[2]+samples[3])/2;
  const target=(hf+hr)/2;
  car.slopeSin = clamp((hf - hr) / Math.max(1.5, wheelbase), -0.28, 0.28);
  car.airborne = (car.y - target) > 0.08;
  const omega=12/Math.sqrt(Math.max(.55,cs.bumpDamp));
  car.vy+=((target-car.y)*omega*omega-2*.88*omega*car.vy)*dt;
  car.y=clamp(car.y+car.vy*dt,-4,8);
  if(car.y<target-.035){if(target-car.y<.45){car.y=target-.035;car.vy=Math.max(0,car.vy);}}
  // Weight transfer simulation: longitudinal dive/squat and lateral centrifugal roll
  const def = CARS[G.carIdx] || CARS[0];
  const isHeavy = def.body === 'micro' || (def.mass && def.mass > 1800);
  const diveFactor = (car.longAccel < 0) ? (isHeavy ? 0.0036 : 0.0028) : (isHeavy ? 0.0020 : 0.0016);
  const accelPitch = clamp((car.longAccel || 0) * diveFactor, -0.045, 0.030);
  const slopePitch = clamp(Math.atan2(hf - hr, wheelbase), -0.10, 0.10);
  const pitchTarget = clamp(slopePitch + accelPitch, -0.065, 0.065);

  const slopeRoll = -clamp(Math.atan2((samples[1] + samples[3] - samples[0] - samples[2]) / 2, track), -0.10, 0.10);
  const rollFactor = isHeavy ? 0.0055 : (def.body === 'sport' ? 0.0030 : 0.0042);
  const centrifugalRoll = clamp((car.lateralAccel || 0) * rollFactor, -0.045, 0.045);
  const rollTarget = clamp(slopeRoll + centrifugalRoll, -0.065, 0.065);

  // Bump harmonic oscillation
  car.suspensionJolt = (car.suspensionJolt || 0);
  car.suspensionJoltVel = (car.suspensionJoltVel || 0);
  car.suspensionJoltVel += (-car.suspensionJolt * 140 - car.suspensionJoltVel * 14) * dt;
  car.suspensionJolt += car.suspensionJoltVel * dt;

  // 2nd-order damped harmonic spring-damper suspension for Pitch & Roll
  car.pitchVel = car.pitchVel || 0;
  car.rollVel = car.rollVel || 0;

  const omegaP = 14.0, zetaP = 0.88;
  const pitchAcc = omegaP * omegaP * (pitchTarget + car.suspensionJolt * 0.12 - (car.pitch || 0)) - 2 * zetaP * omegaP * car.pitchVel;
  car.pitchVel += pitchAcc * dt;
  car.pitch = clamp((car.pitch || 0) + car.pitchVel * dt, -0.075, 0.075);

  const omegaR = 13.0, zetaR = 0.85;
  const rollAcc = omegaR * omegaR * (rollTarget - (car.roll || 0)) - 2 * zetaR * omegaR * car.rollVel;
  car.rollVel += rollAcc * dt;
  car.roll = clamp((car.roll || 0) + car.rollVel * dt, -0.075, 0.075);
  if(typeof updateVehicleSparks==='function')updateVehicleSparks(dt);
  if(typeof updateBrakeEffects==='function')updateBrakeEffects(dt);

  const bumpH = bumpHeightAt(car.x, car.z);
  if (bumpH > 0.02) {
    const curSpeed = Math.abs(car.speed);
    const safeSpeed = 5.5; // حوالي 20 كم/س للعبور الآمن فوق المطب
    if (curSpeed > safeSpeed) {
      const excess = curSpeed - safeSpeed;
      // فرملة وإبطاء فيزيائي حقيقي للسيارة عند أكل المطب بسرعة
      const decel = Math.min(excess, (22 + excess * 2.2) * dt * (bumpH / 0.12));
      const newSpeed = Math.max(safeSpeed * 0.65, curSpeed - decel);
      const ratio = newSpeed / (curSpeed || 1);
      car.vel.x *= ratio;
      car.vel.y *= ratio;
      car.speed = Math.sign(car.speed) * newSpeed;

      // A speed bump compresses the suspension; it should not launch the
      // car like a ramp.  Scale the impulse by the actual bump height and
      // cap it to a small, passenger-car-sized hop.
      const bumpImpulse=clamp((bumpH/.14)*excess*.045,0,.42);
      car.vy += bumpImpulse;
      car.vy=clamp(car.vy,-2.8,2.0);
      car.suspensionJoltVel = clamp(car.suspensionJoltVel + excess * 0.16 * (bumpH / .14), -1.8, 1.8);
      const severity = clamp(excess / 12, 0.25, 1.0);
      car.shake = Math.max(car.shake, severity * 0.65);

      if ((car.bumpCd || 0) <= 0) {
        car.bumpCd = 0.55;
        sfxBump();
        floatText('⚠️ مطب صناعي — تم تخفيض السرعة', '#f2c21a');
        if (severity > 0.45) {
          flashScreen();
          if (rideBusy() && severity > 0.6) {
            M.hits = (M.hits || 0) + 1;
            setObjective('أكلت المطب بسرعة عالية! الراكب انزعج وتأثر التقييم', 3000);
          } else {
            setObjective('مطب صناعي — خفّف السرعة عند التقاطعات', 2500);
          }
        }
      }
    }
  }

  if(target-car.y>.08&&!INFRA.profiles.has(car.surfaceRoad)&&car.bumpCd<=0&&Math.abs(car.speed)>6){
    car.bumpCd=.55;const severity=clamp((Math.abs(car.speed)-5)/22,0,1);
    car.shake=Math.max(car.shake,severity*.45*cs.bumpDamp);sfxBump();
    if(severity>.5)setObjective('مطب — خفّف السرعة',1500);
  }
  car.bumpCd = Math.max(0, car.bumpCd - dt);
  car.curbCd = Math.max(0, car.curbCd - dt);
  car.curbBlock = Math.max(0, car.curbBlock - dt);
}

function checkCitySpeedLimit(dt) {
  // تم إلغاء حد السرعة — السرعة غير محدودة بالكامل في أي مكان على الخريطة
  return;
}

function updateTaxiVisual(dt) {
  updateVehicleSignals(dt);updatePoliceLights(performance.now()*.001);
  if(typeof updateVisualOverhaulEffects==='function')updateVisualOverhaulEffects(dt);
  taxi.position.set(car.x, car.y, car.z);
  taxi.rotation.y = car.heading;
  if (taxiBody) {
    taxiBody.rotation.z = car.pitch;
    taxiBody.rotation.x = car.roll;
  }
  if (taxiRig.passengerSeat) {
    const riding = M.phase === 'toDest';
    taxiRig.passengerSeat.visible = riding;
    if (riding && M.pType && taxiRig.passengerSeat.userData.shirtMat) {
      taxiRig.passengerSeat.userData.shirtMat.color.setHex(M.pType.shirt);
    }
  }
  if(taxiRig.cockpit){
   const c=taxiRig.cockpit,q=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0);
   for(const [name,angle] of [['SteeringWheelRoot',(car.wheelAngle||0)*8],['SpeedNeedle',clamp(Math.abs(car.speed)*3.6/180,0,1)*Math.PI*1.5],['RPMNeedle',(.13+Math.min(.65,Math.abs(car.speed)/65))*Math.PI*1.5]]){const n=c[name];if(n)n.quaternion.copy(n.userData.rest).multiply(q.setFromAxisAngle(axis,angle));}
  }
  const wr = taxiRig.wheelR || .34;
  for (let i = 0; i < taxiWheels.length; i++) {
    const w = taxiWheels[i];
    if(w.userData.restY!==undefined){
      const suspensionTravel=clamp((car.wheelGround?.[i]||0)-car.y,-.045,.045);
      w.position.y=w.userData.restY+suspensionTravel;
    }
    // Roll the wheel mesh inside its steering pivot, so steering never tilts its axle.
    if(w.children[0])w.children[0].rotateZ(-car.speed*dt/wr);
    if (i < 2) w.rotation.y = car.wheelAngle || 0;
  }
}

/* =====================================================================
   الترافيك والمشاة
   ===================================================================== */
let flashTimer = 0;
function flashScreen() {
  const el = $('flash');
  el.style.opacity = '1';
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 150);
}

function honkReact() {
  const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
  let replied = false;
  for (const t of traffic) {
    if (t.kind === 'tram') continue;
    const dx = t.mesh.position.x - car.x;
    const dz = t.mesh.position.z - car.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 900 && (dx * fx + dz * fz) > 0) {
      t.honkBoost = 2.6;
      if (!replied) {
        replied = true;
        const delay = 140 + Math.random() * 120;
        const tx = t.mesh.position.x, tz = t.mesh.position.z, kind = t.kind || 'modern';
        setTimeout(() => {
          if (typeof sfxTrafficHonk === 'function') sfxTrafficHonk(kind, tx, tz);
          else if (typeof sfxTrafficBeep === 'function') sfxTrafficBeep();
        }, delay);
      }
    }
  }
}

function updateTraffic(dt) {
  if(typeof ASSYUT!=='undefined')return updateAssyutTraffic(dt);
  for (let i = 0; i < traffic.length; i++) {
    const t = traffic[i];
    t.honkBoost = Math.max(0, (t.honkBoost || 0) - dt);
    let targetSpd = t.baseSpeed * (t.honkBoost > 0 ? 1.45 : 1.0);

    // التوقف عند الإشارة الحمرا
    if (typeof TRAFFIC_LIGHTS !== 'undefined') {
      const px = t.mesh.position.x, pz = t.mesh.position.z;
      for (const tl of TRAFFIC_LIGHTS) {
        if (t.axis === 'x' && Math.abs(pz - tl.z) < tl.halfZ) {
          if (tl.xState !== 'green') {
            const stopPos = tl.x - t.dir * (tl.halfX + t.hl + 2.5);
            const distAhead = (stopPos - px) * t.dir;
            if(distAhead>0&&distAhead<65)targetSpd=Math.min(targetSpd,Math.sqrt(2*3.5*Math.max(0,distAhead-1.5)));
          }
        } else if (t.axis === 'z' && Math.abs(px - tl.x) < tl.halfX) {
          if (tl.zState !== 'green') {
            const stopPos = tl.z - t.dir * (tl.halfZ + t.hl + 2.5);
            const distAhead = (stopPos - pz) * t.dir;
            if(distAhead>0&&distAhead<65)targetSpd=Math.min(targetSpd,Math.sqrt(2*3.5*Math.max(0,distAhead-1.5)));
          }
        }
      }
    }

    // مسافة أمان من العربية اللي قدامها
    if (targetSpd > 0) {
      for (let j = 0; j < traffic.length; j++) {
        if (i === j) continue;
        const o = traffic[j];
        if (o.axis !== t.axis || o.c !== t.c || o.dir !== t.dir || Math.abs(o.lane - t.lane) > 1.2) continue;
        const posT = t.axis === 'x' ? t.mesh.position.x : t.mesh.position.z;
        const posO = o.axis === 'x' ? o.mesh.position.x : o.mesh.position.z;
        const gap = (posO - posT) * t.dir - (t.hl + o.hl);
        if(gap>0&&gap<55)targetSpd=Math.min(targetSpd,Math.max(0,(gap-3)*.8));
      }
    }

    const trafficPos=t.axis==='x'?t.mesh.position.x:t.mesh.position.z;
    const playerPos=t.axis==='x'?car.x:car.z;
    const acrossPlayer=t.axis==='x'?car.z-t.mesh.position.z:car.x-t.mesh.position.x;
    const playerGap=(playerPos-trafficPos)*t.dir-t.hl-vehicleParameters().halfLength;
    if(Math.abs(acrossPlayer)<t.hw+1.2&&playerGap>0&&playerGap<Math.max(12,t.speed*1.7))
      targetSpd=Math.min(targetSpd,Math.max(0,(playerGap-3)*.65));
    const trafficAccel=t.kind==='bus'?1.3:2.4;
    t.speed+=clamp(targetSpd-t.speed,-5.5*dt,trafficAccel*dt);

    if (t.axis === 'x') {
      t.mesh.position.x += t.dir * t.speed * dt;
      const dx = t.mesh.position.x - car.x;
      if (dx > 460) t.mesh.position.x -= 920;
      if (dx < -460) t.mesh.position.x += 920;
    } else {
      t.mesh.position.z += t.dir * t.speed * dt;
      if (t.mesh.position.z > CITY_Z1 + 30) t.mesh.position.z = 24;
      if (t.mesh.position.z < 16) t.mesh.position.z = CITY_Z1 + 24;
    }

    const tx = t.mesh.position.x, tz = t.mesh.position.z, ty = t.mesh.position.y || 0;
    if (Math.abs(car.y - ty) <= 1.9 && Math.abs(tx - car.x) < t.hl + 4 && Math.abs(tz - car.z) < t.hl + 4) {
      const hit = obbContact(playerBounds(), { x: tx, z: tz, heading: t.mesh.rotation.y, hl: t.hl, hw: t.hw });
      if (hit) {
        car.x += hit.nx * (hit.depth + 0.003);
        car.z += hit.nz * (hit.depth + 0.003);
        const tfx = Math.cos(t.mesh.rotation.y), tfz = -Math.sin(t.mesh.rotation.y);
        const closingX = car.vel.x - tfx * t.speed;
        const closingZ = car.vel.y - tfz * t.speed;
        const closing = closingX * hit.nx + closingZ * hit.nz;

        if (closing < 0) {
          const mass = vehicleParameters().mass;
          const otherMass = t.kind === 'bus' ? 6200 : t.kind === 'micro' ? 2200 : 1350;
          const restitution = 0.35;
          const impulse = -(1 + restitution) * closing / (1 / mass + 1 / otherMass);

          // 1. ارتداد ودفع سيارة اللاعب مع عزم الدوران
          car.vel.x += hit.nx * (impulse / mass);
          car.vel.y += hit.nz * (impulse / mass);

          const contactX = (car.x + tx) / 2, contactZ = (car.z + tz) / 2;
          const pArmX = contactX - car.x, pArmZ = contactZ - car.z;
          const pTorque = (pArmX * hit.nz - pArmZ * hit.nx) * (impulse / mass);
          car.yawRate = clamp((car.yawRate || 0) + pTorque * 0.24, -6.5, 6.5);
          car.roll = clamp((car.roll || 0) - (hit.nx * pArmZ - hit.nz * pArmX) * 0.045, -0.38, 0.38);

          const tImpulse = impulse / otherMass;
          const align = hit.nx * tfx + hit.nz * tfz;
          t.speed = Math.max(0, t.speed - align * tImpulse * 0.85);

          syncCarSpeed();
          recordImpact(-closing, 'خبطة! حافظ على مسافة الأمان');
          car.shake = Math.max(car.shake || 0, clamp(-closing * 0.14, 0.35, 1.35));
          car.suspensionJoltVel = clamp((car.suspensionJoltVel || 0) + clamp(-closing * 0.16, 0.25, 1.4), -1.8, 1.8);
          if (-closing > 3.5 && typeof flashScreen === 'function') flashScreen();
          if (typeof spawnVehicleSparks === 'function') {
            spawnVehicleSparks(contactX, (car.y + ty) / 2 + 0.35, contactZ, closingX, closingZ, 14);
          }
          if (typeof sfxCrash === 'function') sfxCrash();
        }
      }
    }
  }
}

function updatePeds(dt) {
  if(typeof ASSYUT!=='undefined')return updateAssyutPeds(dt);
  const now = performance.now() * .001;
  for (const p of peds) {
    p.mesh.position.x += p.speed * dt;
    if (Math.abs(p.mesh.position.x - car.x) > 300) {
      p.mesh.position.x = car.x + (p.speed > 0 ? -290 : 290);
    }
    // تفادي المشاة لو طلعت على الرصيف
    const dx = p.mesh.position.x - car.x;
    const dz = p.mesh.position.z - car.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 2.25 && d2 > .001) {
      const d = Math.sqrt(d2);
      p.mesh.position.x += (dx / d) * (1.6 - d);
      p.mesh.position.z = clamp(p.mesh.position.z + (dz / d) * (1.6 - d), -23, 23);
      if (car.hitCd <= 0 && Math.abs(car.speed) > 4) {
        car.hitCd = .8;
        sfxThud();
        setObjective('حاسب المشاة على الرصيف! 🚶', 1800);
      }
    }
    p.phase += dt * Math.abs(p.speed) * 7;
    p.mesh.rotation.y = p.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.mesh.position.y = .34 + Math.abs(Math.sin(p.phase)) * .018;
    if(d2<65*65)animatePerson(p.mesh, p.phase);
  }
}

/* ========================= 87-brake-effects.js ========================= */
/* Brake & tire effects: realistic rubber tire tracks, drift smoke, and weight feedback. */
const SKID_MARK_COUNT = 140;
let skidMarkPool = null;
let skidMarkCursor = 0;
let skidMarkTex = null;

function initSkidMarkSystem() {
  if (skidMarkPool || typeof THREE === 'undefined' || typeof scene === 'undefined') return;
  skidMarkPool = [];
  skidMarkTex = canvasTex(64, 128, g => {
    g.clearRect(0, 0, 64, 128);
    const grad = g.createLinearGradient(14, 0, 50, 0);
    grad.addColorStop(0, 'rgba(14,14,16,0)');
    grad.addColorStop(0.2, 'rgba(14,14,16,0.88)');
    grad.addColorStop(0.45, 'rgba(14,14,16,0.55)');
    grad.addColorStop(0.55, 'rgba(14,14,16,0.88)');
    grad.addColorStop(0.8, 'rgba(14,14,16,0.88)');
    grad.addColorStop(1, 'rgba(14,14,16,0)');
    g.fillStyle = grad;
    g.fillRect(14, 0, 36, 128);
  });
  const geo = new THREE.PlaneGeometry(0.26, 1.35);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: skidMarkTex,
    color: 0x141416,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });
  for (let i = 0; i < SKID_MARK_COUNT; i++) {
    const mark = new THREE.Mesh(geo, mat.clone());
    mark.visible = false; mark.userData.age = 0; mark.renderOrder = 3;
    scene.add(mark); skidMarkPool.push(mark);
  }
}

function updateBrakeEffects(dt) {
  const braking = keys.KeyS || keys.ArrowDown || touch.brk;
  const handbrake = keys.Space || touch.hb;
  const speed = Math.abs(car.speed || 0);
  const lateralSlip = Math.abs(car.lateralAccel || 0);
  const hardBraking = braking && (car.longAccel < -3.2) && speed > 4.2;
  const drifting = (handbrake && speed > 3.0) || (lateralSlip > 5.0 && speed > 5.0);
  const onRoad = typeof onDrivingRoad === 'function' ? onDrivingRoad(car.x, car.z, 0.5) : true;

  if ((!hardBraking && !drifting) || car.airborne || !onRoad) {
    updateSkidMarks(dt);
    return;
  }
  initSkidMarkSystem();
  if (!skidMarkPool) return;

  car.skidMarkCd = (car.skidMarkCd || 0) - dt;
  if (car.skidMarkCd <= 0) {
    car.skidMarkCd = 0.055;
    const p = vehicleParameters();
    const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
    const rx = -fz, rz = fx;
    const track = 1.48;
    const velYaw = Math.hypot(car.vel?.x || 0, car.vel?.y || 0) > 1.5 ? Math.atan2(-car.vel.y, car.vel.x) : car.heading;
    const wetScale = (typeof G !== 'undefined' && G.weather === 'rain') ? 0.38 : 1;

    const axles = drifting ? [-1] : [1, -1];
    for (const axle of axles) {
      for (const side of [-1, 1]) {
        const x = car.x + fx * axle * (p.wheelbase / 2) + rx * side * (track / 2);
        const z = car.z + fz * axle * (p.wheelbase / 2) + rz * side * (track / 2);
        const mark = skidMarkPool[skidMarkCursor++ % SKID_MARK_COUNT];
        const rY = (typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(x, z) : roadHeightAt(x, z));
        mark.position.set(x, rY + 0.024, z);
        mark.rotation.set(0, velYaw, 0);
        mark.scale.set(1, 1, clamp(speed / 15, 0.75, 1.45));
        const intensity = (drifting ? 0.62 : clamp(0.18 + (-car.longAccel) * 0.035, 0.22, 0.56)) * wetScale;
        mark.material.opacity = intensity;
        mark.userData.age = 0;
        mark.visible = true;
      }
    }
  }
  updateSkidMarks(dt);
}

function updateSkidMarks(dt) {
  if (!skidMarkPool) return;
  for (const mark of skidMarkPool) {
    if (!mark.visible) continue;
    mark.userData.age += dt;
    if (mark.userData.age > 18) {
      mark.visible = false;
    } else {
      mark.material.opacity = Math.max(0.015, mark.material.opacity * (1 - dt * 0.07));
    }
  }
}

/* ========================= 90-view.js ========================= */
// The road overlay and minimap consume the same remaining route, including every corner.
const routeRibbonGeometry=new THREE.BufferGeometry(),routeRibbonPositions=new Float32Array(1800);
routeRibbonGeometry.setAttribute('position',new THREE.BufferAttribute(routeRibbonPositions,3));routeRibbonGeometry.setDrawRange(0,0);
const routeRibbon=new THREE.Mesh(routeRibbonGeometry,new THREE.MeshBasicMaterial({color:0x29f39a,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));routeRibbon.frustumCulled=false;scene.add(routeRibbon);
function updateRoadRibbon(){
 const points=remainingNavigationPoints();routeRibbon.visible=G.state==='play'&&['rides','police'].includes(G.mode)&&points.length>1;
 let count=0,left=145;
 if(routeRibbon.visible)for(let i=0;i<points.length-1&&left>0&&count<594;i++){
  const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)continue;
  const limit=Math.min(length,left),nx=-dz/length*.36,nz=dx/length*.36;
  for(let d=0;d<limit&&count<594;d+=3){const end=Math.min(limit,d+3),p={x:a.x+dx*d/length,z:a.z+dz*d/length,roadIndex:b.roadIndex},q={x:a.x+dx*end/length,z:a.z+dz*end/length,roadIndex:b.roadIndex},h=navigationStopHeight(p)+.11,k=navigationStopHeight(q)+.11;
   for(const v of [[p.x+nx,h,p.z+nz],[p.x-nx,h,p.z-nz],[q.x+nx,k,q.z+nz],[q.x+nx,k,q.z+nz],[p.x-nx,h,p.z-nz],[q.x-nx,k,q.z-nz]]){routeRibbonPositions.set(v,count*3);count++;}
  }left-=limit;
 }
 routeRibbonGeometry.setDrawRange(0,count);routeRibbonGeometry.attributes.position.needsUpdate=true;
}
/* =====================================================================
   الماركرات والسهم
   ===================================================================== */
function updateMarkers(dt) {
  renderRouteGuidance();
  updateRoadRibbon();
  const t = performance.now() * .001;

  pRing.scale.setScalar(1 + Math.sin(t * 3) * .07);
  pDisc.material.opacity = .42 + Math.sin(t * 3) * .14;
  pBeam.material.opacity = .24 + Math.sin(t * 2.1) * .07;
  pRing.rotation.z += dt * .7;

  dRing.scale.setScalar(1 + Math.sin(t * 2.6) * .06);
  dDisc.material.opacity = .3 + Math.sin(t * 2.6) * .1;
  dRing.rotation.z -= dt * .6;

  let target = null, arrowGuide = null;
  let color = 0x3dff8a;
  if(G.mode==='police')target=policeTarget();
  else if(M.phase==='toPick')target=pickupMarker.position;
  else if (M.phase === 'toDest' || M.phase === 'race') target = destMarker.position;
  if((G.mode==='rides'||G.mode==='police')&&target)arrowGuide=navigationArrowGuide();
  if((!target || G.fuel <= 5) && G.fuel < 25 && typeof nearestFuelStation === 'function'){
    const fs = nearestFuelStation();
    if(fs){ target = fs; arrowGuide = null; color = 0xfacc15; }
  }

  if (target) {
    const wasVisible = arrow.visible;
    arrow.visible = true;
    arrowGlow.visible = true;
    arrow.material.color.setHex(color);
    arrow.material.emissive.setHex(0x1fa85a);
    arrowGlow.material.color.setHex(color);
    arrow.scale.setScalar(.76);

    // ضع السهم أمام السيارة عند التقاطع القادم أو على مسافة واضحة حتى لا يحجبه السقف ويوجه يميناً ويساراً بدقة
    const fwdX = Math.cos(car.heading), fwdZ = -Math.sin(car.heading);
    const finalDist = Math.hypot(target.x - car.x, target.z - car.z);
    const guide = arrowGuide?.guide || target;
    let ax, az;
    if (finalDist < 15) {
      ax = target.x; az = target.z;
    } else {
      const lead = arrowGuide ? Math.min(arrowGuide.lead, finalDist) : clamp(14 + Math.abs(car.speed) * .15, 14, 18);
      ax = car.x + fwdX * lead;
      az = car.z + fwdZ * lead;
    }
    const baseH = Math.max(car.y, navigationStopHeight({x: ax, z: az, roadIndex: car.surfaceRoad}));
    const desiredPos = new THREE.Vector3(ax, baseH + (finalDist < 15 ? 3.5 : 2.95) + Math.sin(t * 2.4) * .18, az);

    let dx = guide.x - ax, dz = guide.z - az;
    const gLen = Math.hypot(dx, dz);
    if (gLen < 1.8) { dx = target.x - car.x; dz = target.z - car.z; }
    const hLen = Math.hypot(dx, dz);
    const dirX = hLen > .1 ? dx / hLen : fwdX;
    const dirZ = hLen > .1 ? dz / hLen : fwdZ;

    // توجيه رأس السهم مباشرة ناحية الاتجاه الفعلي على الخريطة (يمين = يمين ويسار = يسار دون انقلاب)
    const yAxis = (finalDist < 12
      ? new THREE.Vector3(dirX * .28, -.96, dirZ * .28)
      : new THREE.Vector3(dirX * .93, -.36, dirZ * .93)).normalize();
    let faceHint = new THREE.Vector3(-fwdX * .48, .88, -fwdZ * .48).normalize();
    if (Math.abs(yAxis.dot(faceHint)) > .95) faceHint.set(0, 0, 1);
    const xAxis = new THREE.Vector3().crossVectors(yAxis, faceHint).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));

    const blend = (!wasVisible || !dt) ? 1 : Math.min(1, dt * 11);
    arrow.position.lerp(desiredPos, blend);
    arrow.quaternion.slerp(targetQuat, blend);

    arrowGlow.position.copy(arrow.position);
    arrowGlow.scale.set(6.5, 6.5, 1);
  } else {
    arrow.visible = false;
    arrowGlow.visible = false;
  }
}

/* =====================================================================
   الكاميرا
   ===================================================================== */
const camLook = new THREE.Vector3(0, 2, 0);
let camHeading = 0, camHeight = 0, camReady = false;

function updateCamera(dt) {
  dt = (typeof dt === 'number' && Number.isFinite(dt) && dt > 0) ? Math.min(dt, 0.1) : 0.016;
  if (!Number.isFinite(G.menuT)) G.menuT = 0;

  if (G.state === 'menu') {
    camReady = false;
    G.menuT += dt;
    const startX = (typeof ASSYUT !== 'undefined' && ASSYUT.start && Number.isFinite(ASSYUT.start.x)) ? ASSYUT.start.x : 0;
    const startZ = (typeof ASSYUT !== 'undefined' && ASSYUT.start && Number.isFinite(ASSYUT.start.z)) ? ASSYUT.start.z : 0;
    const cx = startX + Math.sin(G.menuT * .055) * 35;
    camera.position.set(cx - 10, 7.8, startZ + 13);
    camera.lookAt(startX + 20, 2.2, startZ);
    return;
  }

  const carX = (typeof car !== 'undefined' && Number.isFinite(car.x)) ? car.x : 0;
  const carY = (typeof car !== 'undefined' && Number.isFinite(car.y)) ? car.y : 0;
  const carZ = (typeof car !== 'undefined' && Number.isFinite(car.z)) ? car.z : 0;
  const carH = (typeof car !== 'undefined' && Number.isFinite(car.heading)) ? car.heading : 0;

  if (!camReady || !Number.isFinite(camHeading) || !Number.isFinite(camHeight)) {
    camHeading = carH;
    camHeight = carY;
    camReady = true;
  }
  if (typeof updateCockpitDynamics === 'function') updateCockpitDynamics(dt);
  const dh = Math.atan2(Math.sin(carH - camHeading), Math.cos(carH - camHeading));
  camHeading += dh * (1 - Math.exp(-dt * 9.5));
  camHeight += (carY - camHeight) * (1 - Math.exp(-dt * 14));
  if (!Number.isFinite(camHeading)) camHeading = carH;
  if (!Number.isFinite(camHeight)) camHeight = carY;

  const fwd = new THREE.Vector3(Math.cos(carH), 0, -Math.sin(carH));
  const cfwd = new THREE.Vector3(Math.cos(camHeading), 0, -Math.sin(camHeading));
  const base = new THREE.Vector3(carX, camHeight, carZ);
  let desired, look, fov = 58;

  const isLong = (typeof CARS !== 'undefined' && CARS[G.carIdx]?.length || 4.4) > 4.8;
  if (typeof taxiRig !== 'undefined' && taxiRig?.driverOccupant) taxiRig.driverOccupant.visible = (G.camMode !== 2);
  if (G.camMode === 0) {
    // الافتراضي: منظور GTA V من الخلف بمسافة متوازنة تُبرز الشارع والعمارات الطوب الأحمر على الجانبين
    desired = base.clone().addScaledVector(cfwd, isLong ? -6.3 : -5.5).add(new THREE.Vector3(0, isLong ? 2.22 : 2.02, 0));
    look = base.clone().addScaledVector(fwd, isLong ? 15.0 : 14.0).add(new THREE.Vector3(0, isLong ? 1.42 : 1.32, 0));
    fov = 62;
  } else if (G.camMode === 1) {
    // من بره وبعيد
    desired = base.clone().addScaledVector(cfwd, -9.6).add(new THREE.Vector3(0, 3.6, 0));
    look = base.clone().addScaledVector(fwd, 11).add(new THREE.Vector3(0, 1.35, 0));
    fov = 62;
  } else if (G.camMode === 2) {
    // من داخل السيارة عند التابلوه
    if (typeof taxi !== 'undefined') taxi.updateMatrixWorld(true);
    const cabin = (typeof taxiBody !== 'undefined' && taxiBody) || (typeof taxi !== 'undefined' && taxi);
    const eye = (typeof taxiRig !== 'undefined' && taxiRig.cabinEye) || [-.12, 1.24, -.36];
    if (cabin) {
      desired = cabin.localToWorld(new THREE.Vector3(...eye));
      look = cabin.localToWorld(new THREE.Vector3(eye[0] + 20, eye[1] - .06, eye[2]));
    } else {
      desired = base.clone().addScaledVector(cfwd, -4.6).add(new THREE.Vector3(0, 1.82, 0));
      look = base.clone().addScaledVector(fwd, 10.5).add(new THREE.Vector3(0, 1.15, 0));
    }
    camera.position.copy(desired);
    camLook.copy(look);
    camera.near = .03; camera.fov = 74; camera.updateProjectionMatrix();
    camera.lookAt(look);
    return;
  } else {
    desired = base.clone().add(new THREE.Vector3(0, 24, -14));
    look = base.clone().addScaledVector(fwd, 6);
    fov = 60;
  }
  if ((G.camMode === 0 || G.camMode === 1) && desired && carY < -0.45) {
    // إبقاء الكاميرا داخل النفق وعدم ارتفاعها فوق السقف
    desired = base.clone().addScaledVector(cfwd, -4.4).add(new THREE.Vector3(0, 1.75, 0));
  }
  if (camera.fov !== fov || camera.near !== .1) {
    camera.fov = fov; camera.near = .1; camera.updateProjectionMatrix();
  }

  if (desired && Number.isFinite(desired.x) && Number.isFinite(desired.y) && Number.isFinite(desired.z)) {
    camera.position.copy(desired);
  }
  if (look && Number.isFinite(look.x) && Number.isFinite(look.y) && Number.isFinite(look.z)) {
    if (!Number.isFinite(camLook.x) || !Number.isFinite(camLook.y) || !Number.isFinite(camLook.z)) {
      camLook.copy(look);
    } else {
      camLook.lerp(look, 1 - Math.exp(-dt * 14));
    }
    camera.lookAt(camLook);
  }

  if (car.shake > 0) {
    camera.position.x += (Math.random() - .5) * car.shake * .55;
    camera.position.y += (Math.random() - .5) * car.shake * .32;
    camera.position.z += (Math.random() - .5) * car.shake * .55;
  }
}

/* =====================================================================
   الخريطة المصغرة
   ===================================================================== */
const mmCtx = $('minimap').getContext('2d');

function drawMinimap() {
  const cvs = $('minimap');
  if (!cvs) return;
  const W = cvs.width, H = cvs.height || W;
  const cx = W / 2, cy = H / 2;
  const span = 260, s = Math.min(W, H) / span;
  const tx = x => cx + (x - car.x) * s;
  const tz = z => cy + (z - car.z) * s;

  mmCtx.save();
  mmCtx.clearRect(0, 0, W, H);
  mmCtx.beginPath();
  mmCtx.rect(0, 0, W, H);
  mmCtx.clip();

  mmCtx.fillStyle = '#121820';
  mmCtx.fillRect(0, 0, W, H);

  // شبكة الشوارع بأسلوب رادار GTA V
  mmCtx.strokeStyle = '#5a6878';
  mmCtx.lineCap = 'round';
  for (const road of ASSYUT.roads) {
    if (!road.points.some(p => Math.abs(p.x - car.x) < 180 && Math.abs(p.z - car.z) < 180)) continue;
    mmCtx.lineWidth = Math.max(2.4, road.width * s * 1.12);
    mmCtx.beginPath();
    road.points.forEach((p, i) => i ? mmCtx.lineTo(tx(p.x), tz(p.z)) : mmCtx.moveTo(tx(p.x), tz(p.z)));
    mmCtx.stroke();
  }

  // المباني
  mmCtx.fillStyle = '#222b36';
  const carX = car.x, carZ = car.z;
  for (const b of MAP.buildings) {
    if (Math.abs(b.x0 - carX) > 140 && Math.abs(b.x1 - carX) > 140) continue;
    if (Math.abs(b.z0 - carZ) > 140 && Math.abs(b.z1 - carZ) > 140) continue;
    drawBuildingFootprint(mmCtx, b, tx, tz, s);
  }

  // إشارات المرور على المينيماب
  if (typeof TRAFFIC_LIGHTS !== 'undefined') {
    for (const tl of TRAFFIC_LIGHTS) {
      const mx = tx(tl.x), mz = tz(tl.z);
      if (mx < -6 || mx > W + 6 || mz < -6 || mz > H + 6) continue;
      mmCtx.fillStyle = tl.xState === 'red' ? '#ff4d4d' : tl.xState === 'yellow' ? '#ffc61a' : '#3dff8a';
      mmCtx.beginPath();
      mmCtx.arc(mx, mz, 2.8, 0, 7);
      mmCtx.fill();
    }
  }

  // محطات الوقود
  if (typeof FUEL_STATIONS !== 'undefined') {
    for (const fs of FUEL_STATIONS) {
      const mx = tx(fs.x), mz = tz(fs.z);
      if (mx < -8 || mx > W + 8 || mz < -8 || mz > H + 8) continue;
      mmCtx.fillStyle = '#22c55e';
      mmCtx.beginPath();
      mmCtx.arc(mx, mz, 4.5, 0, 7);
      mmCtx.fill();
      mmCtx.strokeStyle = '#ffffff';
      mmCtx.lineWidth = 1.2;
      mmCtx.stroke();
    }
  }

  // سيارات المرور
  for (const t of traffic) {
    mmCtx.fillStyle = t.policeSuspect ? '#ff3b3b' : (t.dir > 0 ? '#e2c56a' : '#88a4df');
    mmCtx.beginPath();
    mmCtx.arc(tx(t.mesh.position.x), tz(t.mesh.position.z), t.policeSuspect ? 3.8 : 2.2, 0, 7);
    mmCtx.fill();
  }

  // مسار الـ GPS باللون الأزرق النيوني / الفيروزي المميز لـ GTA V
  if ((G.mode === 'rides' || G.mode === 'police') && RIDE.navigation) {
    mmCtx.strokeStyle = '#38bdf8';
    mmCtx.lineWidth = 4;
    mmCtx.lineCap = 'round';
    mmCtx.beginPath();
    remainingNavigationPoints().forEach((p, i) => i ? mmCtx.lineTo(tx(p.x), tz(p.z)) : mmCtx.moveTo(tx(p.x), tz(p.z)));
    mmCtx.stroke();
  }

  let tgt = null, col = '#38bdf8';
  if (G.mode === 'police') { const p = policeTarget(); if (p) tgt = p; col = '#61b8ff'; }
  else if (M.phase === 'toPick') { tgt = pickupMarker.position; col = '#ffc61a'; }
  else if (M.phase === 'toDest' || M.phase === 'race') { tgt = destMarker.position; col = '#2ecc71'; }
  if ((!tgt || G.fuel <= 5) && G.fuel < 25 && typeof nearestFuelStation === 'function') {
    const fs = nearestFuelStation();
    if (fs) { tgt = fs; col = '#facc15'; }
  }

  if (tgt) {
    let px = tx(tgt.x), pz = tz(tgt.z);
    const pad = 12;
    const off = px < pad || px > W - pad || pz < pad || pz > H - pad;
    px = clamp(px, pad, W - pad);
    pz = clamp(pz, pad, H - pad);

    mmCtx.fillStyle = col;
    mmCtx.beginPath();
    mmCtx.arc(px, pz, off ? 5 : 6, 0, 7);
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.8;
    mmCtx.stroke();
  }

  // سهم سيارة اللاعب أسلوب GTA V (شيفرون أبيض مع حدود داكنة)
  mmCtx.save();
  mmCtx.translate(cx, cy);
  mmCtx.rotate(-car.heading);
  mmCtx.fillStyle = '#ffffff';
  mmCtx.beginPath();
  mmCtx.moveTo(9, 0);
  mmCtx.lineTo(-6, 6);
  mmCtx.lineTo(-3, 0);
  mmCtx.lineTo(-6, -6);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.strokeStyle = 'rgba(0,0,0,0.85)';
  mmCtx.lineWidth = 1.5;
  mmCtx.stroke();
  mmCtx.restore();

  mmCtx.restore();

  // تحديث شريطي الصحة والدرع لـ GTA V
  const hFill = $('gtaHealthFill');
  if (hFill) {
    const hp = clamp(1 - (car.damage || 0) / 100, 0.15, 1);
    hFill.style.width = (hp * 100) + '%';
  }
}

function drawCockpitScreen(ctx) {
  if (!ctx) return;
  const W = 512, H = 256;
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 1. Dark Automotive Background
  ctx.fillStyle = '#0f151c';
  ctx.fillRect(0, 0, W, H);

  // 2. Map Area (Heading-Up Navigation)
  const mapCX = W / 2, mapCY = H / 2 + 10;
  const span = 190, s = (H * 0.9) / span;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 36, W, H - 64);
  ctx.clip();

  ctx.translate(mapCX, mapCY);
  const headingAngle = (typeof car !== 'undefined' ? car.heading : 0);
  ctx.rotate(-headingAngle - Math.PI / 2);

  const tx = x => (x - (car?.x || 0)) * s;
  const tz = z => (z - (car?.z || 0)) * s;

  // Buildings
  if (typeof MAP !== 'undefined' && MAP.buildings) {
    ctx.fillStyle = '#1c2530';
    for (const b of MAP.buildings) {
      if (Math.abs(b.x0 - car.x) > 140 || Math.abs(b.z0 - car.z) > 140) continue;
      if (typeof drawBuildingFootprint === 'function') {
        drawBuildingFootprint(ctx, b, x => tx(x), z => tz(z), s);
      } else {
        ctx.fillRect(tx(b.x0), tz(b.z0), (b.x1 - b.x0) * s, (b.z1 - b.z0) * s);
      }
    }
  }

  // Roads
  if (typeof ASSYUT !== 'undefined' && ASSYUT.roads) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const road of ASSYUT.roads) {
      if (!road.points.some(p => Math.abs(p.x - car.x) < 140 && Math.abs(p.z - car.z) < 140)) continue;
      ctx.strokeStyle = '#273440';
      ctx.lineWidth = Math.max(3, road.width * s + 2);
      ctx.beginPath();
      road.points.forEach((p, i) => i ? ctx.lineTo(tx(p.x), tz(p.z)) : ctx.moveTo(tx(p.x), tz(p.z)));
      ctx.stroke();

      ctx.strokeStyle = '#384858';
      ctx.lineWidth = Math.max(2, road.width * s);
      ctx.stroke();
    }
  }

  // Traffic Lights
  if (typeof TRAFFIC_LIGHTS !== 'undefined') {
    for (const tl of TRAFFIC_LIGHTS) {
      const mx = tx(tl.x), mz = tz(tl.z);
      if (Math.abs(mx) > W || Math.abs(mz) > H) continue;
      ctx.fillStyle = tl.xState === 'red' ? '#ff3b30' : tl.xState === 'yellow' ? '#ffcc00' : '#34c759';
      ctx.beginPath();
      ctx.arc(mx, mz, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Traffic Vehicles
  if (typeof traffic !== 'undefined') {
    for (const t of traffic) {
      const mx = tx(t.mesh.position.x), mz = tz(t.mesh.position.z);
      if (Math.abs(mx) > W || Math.abs(mz) > H) continue;
      ctx.fillStyle = t.dir > 0 ? '#ffb300' : '#4fc3f7';
      ctx.beginPath();
      ctx.arc(mx, mz, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Active GPS Route Line
  if ((G.mode === 'rides' || G.mode === 'police') && typeof RIDE !== 'undefined' && RIDE.navigation && typeof remainingNavigationPoints === 'function') {
    const pts = remainingNavigationPoints();
    if (pts && pts.length > 1) {
      ctx.strokeStyle = '#00838f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(tx(p.x), tz(p.z)) : ctx.moveTo(tx(p.x), tz(p.z)));
      ctx.stroke();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }

  // Target Destination Pin
  let tgt = null, tgtCol = '#ffc107';
  if (G.mode === 'police' && typeof policeTarget === 'function') { tgt = policeTarget(); tgtCol = '#29b6f6'; }
  else if (M.phase === 'toPick' && typeof pickupMarker !== 'undefined') { tgt = pickupMarker.position; tgtCol = '#ffc107'; }
  else if ((M.phase === 'toDest' || M.phase === 'race') && typeof destMarker !== 'undefined') { tgt = destMarker.position; tgtCol = '#00e676'; }

  if (tgt) {
    const px = tx(tgt.x), pz = tz(tgt.z);
    ctx.fillStyle = tgtCol;
    ctx.beginPath();
    ctx.arc(px, pz, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Navigational Chevron (Player Car Arrow)
  ctx.save();
  ctx.fillStyle = '#00b0ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 4);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // end map transform

  // 3. Top Header Bar
  ctx.fillStyle = '#090d13';
  ctx.fillRect(0, 0, W, 36);
  ctx.strokeStyle = '#222f3d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(W, 36);
  ctx.stroke();

  // GPS indicator
  ctx.fillStyle = '#00e676';
  ctx.beginPath();
  ctx.arc(22, 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#8ea1b4';
  ctx.textAlign = 'left';
  ctx.fillText('GPS HD', 32, 22);

  // Street Name (Center)
  const currentRoad = (typeof nearestAssyutRoad === 'function' && typeof car !== 'undefined') ? nearestAssyutRoad({ x: car.x, z: car.z }) : null;
  const streetName = currentRoad?.name || 'وسط أسيوط · شارع رئيسي';
  ctx.fillStyle = '#1e2936';
  ctx.fillRect(W / 2 - 120, 6, 240, 24);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(streetName, W / 2, 23);

  // Speed and Gear (Right)
  const spd = Math.round(Math.abs(car?.speed || 0) * 3.6);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText(spd + ' KM/H', W - 42, 23);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('[D]', W - 18, 23);

  // 4. Bottom Footer Bar
  ctx.fillStyle = '#090d13';
  ctx.fillRect(0, H - 28, W, 28);
  ctx.strokeStyle = '#222f3d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 28);
  ctx.lineTo(W, H - 28);
  ctx.stroke();

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#78909c';
  ctx.textAlign = 'center';
  const modeText = G?.mode === 'police' ? 'دورية شرطة أسيوط · اتصال لاسلكي' : (M?.phase === 'toPick' ? 'متجه لاستلام العميل · ملاحة ذكية' : (M?.phase === 'toDest' ? 'توصيل الراكب للوجهة' : 'أوبر أسيوط · جاهز للطلبات'));
  ctx.fillText(modeText, W / 2, H - 10);

  ctx.restore();
}

function updateCockpitDynamics(dt) {
  if (typeof taxiRig === 'undefined' || !taxiRig?.cockpit) return;
  const c = taxiRig.cockpit;
  if (c.wheelPivot) {
    // Use the actual road-wheel angle, with a realistic steering-wheel
    // ratio.  Rotating the hands and wheel by the raw keyboard input made
    // the arms snap through an implausibly large angle.
    const targetAngle = clamp(-(car.wheelAngle || 0) * 1.22, -0.92, 0.92);
    c.currentSteer = (c.currentSteer || 0) + (targetAngle - (c.currentSteer || 0)) * (1 - Math.exp(-dt * 12));
    c.wheelPivot.rotation.x = c.currentSteer;
  }
  if (c.steerRoot) {
    const bump = (car.vy || 0) * 0.006;
    const lat = typeof clamp === 'function' ? clamp((car.lateralAccel || 0) * 0.0015, -0.006, 0.006) : 0;
    c.steerRoot.position.y = (c.baseWheelY !== undefined ? c.baseWheelY : c.steerRoot.position.y) + bump;
    c.steerRoot.position.z = (c.baseWheelZ !== undefined ? c.baseWheelZ : c.steerRoot.position.z) + lat;
  }
  if (c.screenTex && c.screenCtx && (typeof G === 'undefined' || G.camMode === 2)) {
    c.screenTimer = (c.screenTimer || 0) + dt;
    if (c.screenTimer > 0.08) {
      c.screenTimer = 0;
      drawCockpitScreen(c.screenCtx);
      c.screenTex.needsUpdate = true;
    }
  }
}

/* ========================= 91-realism.js ========================= */
/* =====================================================================
   واقعية القيادة: محطات البنزين والوقود + مسّاحات المطر + إضاءة التابلوه
   ===================================================================== */
const FUEL_STATIONS = [];
let _fuelLowWarned = false;
let _refuelSoundCd = 0;

function nearestFuelStation() {
  if (!FUEL_STATIONS.length || typeof car === 'undefined') return null;
  let best = null, bestD = Infinity;
  for (const st of FUEL_STATIONS) {
    const d = Math.hypot(st.x - car.x, st.z - car.z);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best;
}

function initFuelStations() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.segments || typeof REAL_CITY === 'undefined') return;
  const sx = ASSYUT.start?.x || 0, sz = ASSYUT.start?.z || 0;
  const targets = [
    { name: 'محطة وطنية · وسط البلد', color: 0x0f7a44, accent: 0xfacc15, prefX: sx + 85, prefZ: sz - 65 },
    { name: 'محطة شيل أوت · الجمهورية', color: 0xd92323, accent: 0xfbbf24, prefX: sx + 280, prefZ: sz + 190 },
    { name: 'محطة توتال · الكورنيش', color: 0x1d4ed8, accent: 0xf97316, prefX: sx - 280, prefZ: sz - 80 },
    { name: 'محطة موبيل · الجامعة', color: 0x0369a1, accent: 0xef4444, prefX: sx - 120, prefZ: sz + 260 },
  ];
  for (const spec of targets) {
    let bestSeg = null, bestD = Infinity;
    for (const s of ASSYUT.segments) {
      if (s.width < 8.5 || s.length < 22 || INFRA?.profiles?.has(s.road)) continue;
      const mx = (s.a.x + s.b.x) * 0.5, mz = (s.a.z + s.b.z) * 0.5;
      if (FUEL_STATIONS.some(f => Math.hypot(f.x - mx, f.z - mz) < 120)) continue;
      const d = Math.hypot(mx - spec.prefX, mz - spec.prefZ);
      if (d < bestD) { bestD = d; bestSeg = s; }
    }
    if (!bestSeg) continue;
    const mx = (bestSeg.a.x + bestSeg.b.x) * 0.5, mz = (bestSeg.a.z + bestSeg.b.z) * 0.5;
    const nx = -(bestSeg.b.z - bestSeg.a.z) / bestSeg.length, nz = (bestSeg.b.x - bestSeg.a.x) / bestSeg.length;
    const padX = mx + nx * (bestSeg.width / 2 + 3.4), padZ = mz + nz * (bestSeg.width / 2 + 3.4);
    const yaw = Math.atan2(-nz, nx) + Math.PI / 2;

    // إزالة أي مبنى متداخل مع ساحة البنزينة لتظهر بوضوح من الشارع
    if (Array.isArray(REAL_CITY.buildings)) {
      for (let j = REAL_CITY.buildings.length - 1; j >= 0; j--) {
        const b = REAL_CITY.buildings[j];
        if (Math.abs(b.x - padX) < b.w / 2 + 7 && Math.abs(b.z - padZ) < b.d / 2 + 7) {
          REAL_CITY.group.remove(b.mesh);
          REAL_CITY.buildings.splice(j, 1);
          if (typeof MAP !== 'undefined' && Array.isArray(MAP.buildings)) {
            for (let k = MAP.buildings.length - 1; k >= 0; k--) {
              const m = MAP.buildings[k];
              if (Math.abs((m.x0 + m.x1) / 2 - b.x) < 0.2 && Math.abs((m.z0 + m.z1) / 2 - b.z) < 0.2) MAP.buildings.splice(k, 1);
            }
          }
        }
      }
    }

    const grp = new THREE.Group();
    grp.position.set(padX, 0, padZ);
    grp.rotation.y = yaw;

    // أرضية أسفلت/خرسانة المحطة ومنطقة التفويل
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(12.6, 0.12, 9.2),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.88 })
    );
    slab.position.set(0, 0.06, -0.4);
    slab.receiveShadow = true;
    grp.add(slab);

    // جزيرة الطلمبات المرتفعة بحواف صفراء وسوداء
    const island = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.20, 1.25),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.78 })
    );
    island.position.set(0, 0.16, -1.1);
    island.receiveShadow = true;
    grp.add(island);

    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.75, 24),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, 0.14, 1.15);
    grp.add(padRing);

    // مظلة المحطة مع إضاءة LED سفلية ولافتة المحطة
    const canopyMat = new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.25, roughness: 0.42 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.62, 6.8), canopyMat);
    canopy.position.set(0, 4.65, -0.5);
    grp.add(canopy);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(11.8, 0.20, 7.0),
      new THREE.MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.48 })
    );
    trim.position.set(0, 4.42, -0.5);
    grp.add(trim);

    const ledMat = new THREE.MeshBasicMaterial({ color: 0xfff8e7 });
    for (const lx of [-3.4, 0, 3.4]) {
      const led = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), ledMat);
      led.rotation.x = Math.PI / 2;
      led.position.set(lx, 4.32, -0.5);
      grp.add(led);
    }

    if (typeof canvasTex === 'function') {
      const signTex = canvasTex(256, 64, g => {
        g.fillStyle = '#0f172a';
        g.fillRect(0, 0, 256, 64);
        g.strokeStyle = '#facc15';
        g.lineWidth = 4;
        g.strokeRect(3, 3, 250, 58);
        g.fillStyle = '#ffffff';
        g.font = 'bold 24px Tahoma, Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText('⛽ ' + spec.name.split('·')[0].trim(), 128, 42);
      });
      const signFace = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.15, 0.22), signFace);
      signMesh.position.set(0, 5.55, 2.9);
      grp.add(signMesh);

      // لوحة أسعار البنزين الجانبية (Totem)
      const totemTex = canvasTex(128, 256, g => {
        g.fillStyle = '#111827';
        g.fillRect(0, 0, 128, 256);
        g.strokeStyle = '#facc15';
        g.lineWidth = 4;
        g.strokeRect(3, 3, 122, 250);
        g.fillStyle = '#facc15';
        g.font = 'bold 20px Tahoma, Arial';
        g.textAlign = 'center';
        g.fillText('الأسعار', 64, 34);
        const rows = [['95', '17.00', '#ef4444'], ['92', '15.25', '#22c55e'], ['80', '13.75', '#3b82f6'], ['سولار', '13.50', '#f59e0b']];
        rows.forEach((r, i) => {
          const y = 76 + i * 44;
          g.fillStyle = r[2];
          g.fillRect(10, y - 22, 42, 28);
          g.fillStyle = '#fff';
          g.font = 'bold 14px Tahoma, Arial';
          g.fillText(r[0], 31, y - 3);
          g.fillStyle = '#a7f3d0';
          g.font = 'bold 18px monospace';
          g.fillText(r[1], 88, y - 2);
        });
      });
      const totem = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.3, 0.28), new THREE.MeshBasicMaterial({ map: totemTex }));
      totem.position.set(5.4, 2.2, 2.6);
      grp.add(totem);
      const totemPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      totemPost.position.set(5.4, 0.6, 2.6);
      grp.add(totemPost);
    }

    // كشك الكاشير والميني ماركت الخلفي بواجهة زجاجية مضيئة
    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 2.9, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 })
    );
    kiosk.position.set(0, 1.5, -3.5);
    kiosk.castShadow = true;
    grp.add(kiosk);
    const kioskGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.65),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x38bdf8, emissiveIntensity: 0.32, roughness: 0.15 })
    );
    kioskGlass.position.set(0, 1.45, -2.29);
    grp.add(kioskGlass);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.45, metalness: 0.35 });
    const darkBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x86efac });

    for (const sx of [-3.4, 3.4]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.44, 4.35, 0.44), pillarMat);
      pil.position.set(sx, 2.2, -1.1);
      grp.add(pil);

      // حاجز حماية أصفر عند طرفي جزيرة الطلمبات
      const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 8), bollardMat);
      bol.position.set(sx * 0.92, 0.62, -1.1);
      grp.add(bol);

      // طلمبة بنزين مفصلة (هيكل + رأس ملون + شاشة رقمية + خرطوم)
      const px = sx * 0.48;
      const pumpBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.55, 0.52), darkBodyMat);
      pumpBase.position.set(px, 0.98, -1.1);
      pumpBase.castShadow = true;
      grp.add(pumpBase);

      const pumpTop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.32, 0.56), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.4 }));
      pumpTop.position.set(px, 1.85, -1.1);
      grp.add(pumpTop);

      for (const faceZ of [-0.27, 0.27]) {
        const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.26), screenMat);
        lcd.position.set(px, 1.38, -1.1 + faceZ);
        if (faceZ < 0) lcd.rotation.y = Math.PI;
        grp.add(lcd);
      }

      const hose = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 12, Math.PI), hoseMat);
      hose.rotation.z = Math.PI;
      hose.position.set(px + 0.36, 1.1, -1.1);
      grp.add(hose);
    }

    // عامل بنزينة بزي المحطة
    if (typeof makePerson === 'function' && typeof SKIN !== 'undefined') {
      const worker = makePerson(spec.color, pick(SKIN), 'adult');
      worker.position.set(-2.3, 0.12, 0.15);
      worker.rotation.y = 0.4;
      grp.add(worker);
    }

    // سيارة راكنة بتفوّل في الحارة الثانية من المحطة
    const carSlot = new THREE.Group();
    carSlot.position.set(1.2, 0.12, -2.15);
    grp.add(carSlot);
    if (!FUEL_STATIONS._carSlots) FUEL_STATIONS._carSlots = [];
    FUEL_STATIONS._carSlots.push({ slot: carSlot, key: pick(['traffic_logan', 'traffic_corolla', 'traffic_tucson', 'traffic_lada']), color: pick([0xe5e7eb, 0x1e3a8a, 0x991b1b, 0x374151]) });

    REAL_CITY.group.add(grp);
    FUEL_STATIONS.push({ x: padX, z: padZ, name: spec.name, ring: padRing });
  }

  function spawnStationCars() {
    if (typeof vehicleVisual !== 'function' || typeof importedModels === 'undefined' || !FUEL_STATIONS._carSlots) return true;
    let pending = 0;
    for (const sc of FUEL_STATIONS._carSlots) {
      if (sc.done) continue;
      if (!importedModels?.loaded?.[sc.key]) { pending++; continue; }
      const vis = vehicleVisual(sc.key, sc.color);
      if (vis) {
        vis.scale.setScalar(0.92);
        sc.slot.add(vis);
        sc.done = true;
      }
    }
    return pending === 0;
  }
  if (!spawnStationCars() && typeof setInterval === 'function') {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (spawnStationCars() || tries > 30) clearInterval(timer);
    }, 600);
  }
}
initFuelStations();

function updateFuelAndStations(dt) {
  if (typeof G === 'undefined' || G.state !== 'play') return;
  const isTest = (typeof navigator !== 'undefined' && navigator.userAgent === 'test');
  if (isTest) return;

  _refuelSoundCd = Math.max(0, _refuelSoundCd - dt);
  const sp = Math.abs(car.speed || 0);
  if (sp > 0.5 && G.fuel > 0) {
    G.fuel = Math.max(0, G.fuel - sp * dt * 0.016);
  }

  if (G.fuel <= 0) {
    G.fuel = 0;
    if (car.speed > 6.5) car.speed = Math.max(6.5, car.speed - 14 * dt);
    if (!_fuelLowWarned) {
      _fuelLowWarned = true;
      if (typeof setObjective === 'function') setObjective('⛽ البنزين خلص! اتجه إلى محطة وطنية أو شيل أوت (على الخريطة)', 5000);
    }
  } else if (G.fuel < 18 && !_fuelLowWarned) {
    _fuelLowWarned = true;
    if (typeof floatText === 'function') floatText('⛽ البنزين منخفض · مرّ على أقرب محطة', '#facc15');
  } else if (G.fuel >= 25) {
    _fuelLowWarned = false;
  }

  for (const st of FUEL_STATIONS) {
    if (st.ring) st.ring.material.opacity = 0.45 + 0.35 * Math.sin(performance.now() * 0.005);
    const d = Math.hypot(car.x - st.x, car.z - st.z);
    if (d < 9.5 && sp < 4.5 && G.fuel < 99.5) {
      const add = Math.min(100 - G.fuel, 26 * dt);
      const cost = Math.ceil(add * 2);
      if (G.money >= cost) {
        G.money -= cost;
        G.fuel = Math.min(100, G.fuel + add);
      } else if (G.fuel < 35) {
        G.fuel = Math.min(35, G.fuel + add);
      }
      if (typeof showPrompt === 'function') showPrompt(`⛽ تفويل في ${st.name}: ${Math.round(G.fuel)}%`);
      if (G.fuel >= 99.5 && _refuelSoundCd <= 0) {
        _refuelSoundCd = 3;
        if (typeof sfxCash === 'function') sfxCash();
        if (typeof saveProgress === 'function') saveProgress();
        if (typeof floatText === 'function') floatText('⛽ تم تفويل السيارة بالكامل!', '#8be7b8');
      }
      if (typeof updateHUD === 'function') updateHUD();
    }
  }
}

let _wiperEl = null;
function updateCockpitRealism() {
  if (typeof document === 'undefined' || !document.body) return;
  if (!_wiperEl) {
    _wiperEl = document.createElement('div');
    _wiperEl.id = 'cockpitWipers';
    _wiperEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:12;display:none;overflow:hidden;';
    _wiperEl.innerHTML = '<div id="wiperBladeL" style="position:absolute;bottom:-18px;left:22%;width:9px;height:44vh;background:linear-gradient(180deg,rgba(15,23,42,.92),rgba(30,41,59,.95));border-radius:6px;transform-origin:bottom center;box-shadow:0 0 8px rgba(0,0,0,.5)"></div><div id="wiperBladeR" style="position:absolute;bottom:-18px;left:56%;width:9px;height:44vh;background:linear-gradient(180deg,rgba(15,23,42,.92),rgba(30,41,59,.95));border-radius:6px;transform-origin:bottom center;box-shadow:0 0 8px rgba(0,0,0,.5)"></div>';
    document.body.appendChild(_wiperEl);
  }
  const active = typeof G !== 'undefined' && G.state === 'play' && G.camMode === 2 && G.weather === 'rain';
  _wiperEl.style.display = active ? 'block' : 'none';
  if (active) {
    const t = performance.now() * 0.0042;
    const sweep = -48 + (0.5 - 0.5 * Math.cos(t)) * 96;
    const bl = document.getElementById('wiperBladeL'), br = document.getElementById('wiperBladeR');
    if (bl) bl.style.transform = `rotate(${sweep.toFixed(1)}deg)`;
    if (br) br.style.transform = `rotate(${sweep.toFixed(1)}deg)`;
  }
}

/* ========================= 95-front-end.js ========================= */
/* Two-stage title screen: role first, then a visual selection of ready patrol cars. */
let patrolLaunching=false;
function showRoleScreen(){
 $('roleScreen').classList.remove('hidden');$('patrolScreen').classList.add('hidden');$('menu').dataset.screen='roles';
}
function showPatrolScreen(){
 $('roleScreen').classList.add('hidden');$('patrolScreen').classList.remove('hidden');$('menu').dataset.screen='patrol';renderPatrolVehicles();$('patrolTitle').focus?.();
}
function renderPatrolVehicles(){
 const grid=$('patrolVehicleGrid');if(!grid)return;
 const cars=CARS.filter(c=>c.police&&!c.localImport&&c.available!==false),selected=selectedPoliceVehicle();
 grid.innerHTML=cars.map((c,i)=>{const active=c.id===selected.id,name=c.id==='policeSuburban'?'سوبربان شريف':c.id==='policeDuster'?'رينو داستر':'BMW 320i',tag=c.id==='policeSuburban'?'SUBURBAN SHERIFF CRUISER':c.id==='policeDuster'?'RENAULT DUSTER POLICE':'BMW 320i POLICE',image=MENU_CAR_IMAGES[c.id]||CAR_THUMBS[c.id]||CAR_THUMBS.qashqai;
 return `<button class="patrolVehicle ${active?'selected':''}" data-patrol-car="${c.id}" aria-pressed="${active}"><span class="vehicleTopline"><small>دورية / 0${i+1}</small><i>${active?'✓':'○'}</i></span><img src="${image}" alt="${c.name}"><span class="vehicleName">${name}</span><small class="vehicleModel" dir="ltr">${tag}</small><span class="vehicleSpecs"><span>${Math.round(c.topSpeed*3.6)}<small>كم/س</small></span><span>${c.id==='policeSuburban'?'دورية كبيرة':'دورية مدمجة'}<small>الفئة</small></span></span><span class="vehicleSelected">${active?'تم اختيار الدورية':'اختر هذه الدورية'} <b>${active?'✓':'←'}</b></span></button>`;}).join('');
 grid.querySelectorAll('[data-patrol-car]').forEach(btn=>btn.addEventListener('click',()=>{if(patrolLaunching)return;sfxUI();selectPoliceVehicle(btn.dataset.patrolCar);grid.querySelector(`[data-patrol-car="${btn.dataset.patrolCar}"]`)?.focus();}));
 $('patrolFleetCount').textContent=`${cars.length} سيارات جاهزة`;
 $('patrolSelectionStatus').textContent=patrolLaunching?'جارٍ تجهيز الدورية…':`${selected.id==='policeSuburban'?'سوبربان شريف':selected.id==='policeDuster'?'رينو داستر':'BMW 320i'} · جاهزة للانطلاق`;
 $('startPatrol').disabled=patrolLaunching;
}

async function runWithLaunchTransition(mode, carAsset, title, tip, icon='🚗'){
 const trans=$('launchTransition'),bar=$('launchBarFill'),pct=$('launchTransPct'),titleEl=$('launchTransTitle'),tipEl=$('launchTransTip'),iconEl=$('launchTransIcon'),imgEl=$('launchTransImg'),statusEl=$('launchTransStatus');
 if(titleEl&&title)titleEl.textContent=title;
 if(tipEl&&tip)tipEl.textContent=tip;
 if(iconEl&&icon)iconEl.textContent=icon;
 if(imgEl){
  const thumb=(typeof MENU_CAR_IMAGES!=='undefined'&&MENU_CAR_IMAGES[carAsset])||(typeof CAR_THUMBS!=='undefined'&&(CAR_THUMBS[carAsset]||CAR_THUMBS.qashqai))||'';
  if(thumb){imgEl.src=thumb;imgEl.classList.remove('hidden');iconEl?.classList.add('hidden');}
  else{imgEl.classList.add('hidden');iconEl?.classList.remove('hidden');}
 }
 if(statusEl)statusEl.textContent='تجهيز المحرك والمسارات…';
 if(bar)bar.style.width='20%';
 if(pct)pct.textContent='20%';
 if(trans)trans.classList.remove('hidden','fadeOut');

 const waitFrame=()=>typeof requestAnimationFrame==='function'?new Promise(r=>requestAnimationFrame(r)):new Promise(r=>setTimeout(r,16));
 const update=async(p,txt)=>{
  if(bar)bar.style.width=p+'%';
  if(pct)pct.textContent=p+'%';
  if(statusEl&&txt)statusEl.textContent=txt;
  await waitFrame();
 };

 try{
  await update(40,'تحميل مجسم السيارة وإعداد نظام القيادة…');
  if(carAsset){
   try{await ensureVehicleModel(carAsset);}catch(err){console.warn('Vehicle model fallback:',err);}
  }
  await update(75,'تهيئة رسوميات شوارع أسيوط…');
  await waitFrame();
  await update(100,'انطلاق الوردية!');

  // تأجيل الصوت حتى يكتمل رسم أول إطار مرئي للعبة على الشاشة
  window.__deferAudio=true;
  startRun(mode);
  if(typeof updateCamera==='function')updateCamera(0);
  if(typeof updateDayNight==='function')updateDayNight(0);
  if(typeof updateSceneBudgets==='function')updateSceneBudgets(1);
  if(typeof renderer!=='undefined'&&typeof scene!=='undefined'&&typeof camera!=='undefined'){
   try{renderer.render(scene,camera);}catch(_){}
  }
  await waitFrame();
  await waitFrame();

  if(trans){
   trans.classList.add('fadeOut');
   await new Promise(r=>setTimeout(r,260));
   trans.classList.add('hidden');trans.classList.remove('fadeOut');
  }
  window.__deferAudio=false;
  initAudio();
  if(typeof syncCityAmbience==='function')syncCityAmbience();
  if(typeof syncRecordedRadio==='function')syncRecordedRadio();
  return true;
 }catch(e){
  console.error('Launch error:',e);
  window.__deferAudio=false;
  startRun(mode);
  initAudio();
  if(trans)trans.classList.add('hidden');
  return false;
 }
}

async function launchSelectedPatrol(){
 if(patrolLaunching)return false;patrolLaunching=true;renderPatrolVehicles();sfxUI();
 const selected=selectedPoliceVehicle();
 const carName=selected.id==='policeSuburban'?'سوبربان شريف':selected.id==='policeDuster'?'رينو داستر':'BMW 320i';
 try{
  await runWithLaunchTransition('police',selected.asset,`جارٍ تجهيز ${carName} وانطلاق الدورية…`,'تجهيز دورية الشرطة وشوارع أسيوط للتعامل مع البلاغات وتأمين المدينة','🚓');
  return true;
 }catch(e){
  $('patrolSelectionStatus').textContent='تعذّر تجهيز الدورية. حاول مرة أخرى.';
  return false;
 }finally{
  patrolLaunching=false;
  if($('startPatrol'))$('startPatrol').disabled=false;
 }
}
$('patrolBack').addEventListener('click',()=>{if(!patrolLaunching){sfxUI();showRoleScreen();}});
$('startPatrol').addEventListener('click',launchSelectedPatrol);
addEventListener('keydown',e=>{if(e.key==='Escape'&&G.state==='menu'&&$('menu').dataset.screen==='patrol'&&!patrolLaunching){showRoleScreen();document.querySelector('[data-mode="police"]')?.focus();}});

/* ========================= 96-ads.js ========================= */
/* =====================================================================
   إعدادات إعلانات جوجل أدسنس (Google AdSense) — متوافقة مع سياسات جوجل
   ===================================================================== */
const ADS_CONFIG = {
  enabled: true,
  client: 'ca-pub-1820524955775833',
  slots: {
    menu: '0000000000',     // اختياري: ضع رقم الوحدة الإعلانية للقائمة الرئيسية عند إنشائها
    pause: '0000000000',    // اختياري: ضع رقم الوحدة الإعلانية لقائمة التوقف المؤقت عند إنشائها
    gameplay: '0000000000', // اختياري: ضع رقم الوحدة الإعلانية للعب (أعلى يسار الشاشة) عند إنشائها
  },
};

function isAdSenseConfigured() {
  return !!(
    ADS_CONFIG.enabled &&
    typeof ADS_CONFIG.client === 'string' &&
    /^ca-pub-\d{10,}$/.test(ADS_CONFIG.client)
  );
}

function mountAdSlot(containerId, slotId, targetId = containerId) {
  const wrap = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  const target = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
  if (!wrap || !target) return;
  if (!isAdSenseConfigured() || !/^\d{6,}$/.test(String(slotId || ''))) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  if (target.dataset.adMounted) return;
  target.dataset.adMounted = '1';
  target.innerHTML = `<span class="adLabel">إعلان</span><ins class="adsbygoogle" style="display:block" data-ad-client="${ADS_CONFIG.client}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (_) {}
}

function initGoogleAds() {
  if (typeof document === 'undefined' || !isAdSenseConfigured()) return;
  const hasScript = typeof document.querySelector === 'function' && document.querySelector('script[data-adsense-client]');
  if (!hasScript && document.head && typeof document.createElement === 'function') {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    if (s.dataset) s.dataset.adsenseClient = ADS_CONFIG.client;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADS_CONFIG.client)}`;
    document.head.appendChild?.(s);
  }
  mountAdSlot('adMenuBanner', ADS_CONFIG.slots.menu);
  mountAdSlot('adPauseBanner', ADS_CONFIG.slots.pause);
  mountAdSlot('adPlayBanner', ADS_CONFIG.slots.gameplay, 'adPlayInner');
  const closeBtn = document.getElementById('adPlayClose');
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = '1';
    closeBtn.onclick = () => document.getElementById('adPlayBanner')?.classList.add('hidden');
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGoogleAds);
  else initGoogleAds();
}

/* ========================= 96-flow.js ========================= */
/* =====================================================================
   التشغيل والإيقاف
   ===================================================================== */
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  $('pause').classList.remove('hidden');
}
function resumeGame() {
  if (G.state !== 'pause') return;
  G.state = 'play';
  $('pause').classList.add('hidden');
}
function toMenu() {
  if(G.mode==='police'){preparePoliceMode('rides');G.mode='rides';}
  G.state = 'menu';
  if(typeof showRoleScreen==='function')showRoleScreen();
  $('objective').classList.remove('on');
  clearDriverRequest();
  $('hud').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('modal').classList.add('hidden');
  $('menu').classList.remove('hidden');
  M.phase = 'none';
  M.timer = 0;
  M.race = null;
  M.boss = false;
  M.respawn = 0;
  M.after = null;
  passenger.visible = false;
  pickupMarker.visible = false;
  destMarker.visible = false;
  arrow.visible = false;
  arrowGlow.visible = false;
  hidePrompt();
  updateHUD();
}

function startRun(mode) {
  initAudio();
  mode=mode==='police'?'police':'rides';preparePoliceMode(mode);
  G.mode = mode;
  G.state = 'play';
  G.combo = 0;
  G.menuT = 0;

  if (typeof location !== 'undefined' && location.search && location.search.includes('crossing')) {
    G.clock = 12 * 60; // وقت الظهيرة المشمس 12:00 م تماماً كالصورة المرجعية
    setTimeout(() => {
      if (typeof teleportToRailwayCrossing === 'function') {
        teleportToRailwayCrossing(location.search.includes('crossing_hiace'));
      }
    }, 100);
  } else if (typeof location !== 'undefined' && location.search && location.search.includes('village') && typeof VILLAGE_ROADS !== 'undefined' && (VILLAGE_ROADS.targetSeg || (typeof ASSYUT !== 'undefined' && ASSYUT.segments && ASSYUT.segments[801]))) {
    const s = VILLAGE_ROADS.targetSeg || ASSYUT.segments[801];
    G.clock = 13.5 * 60; // وقت الظهيرة المشمس 1:30 م كما في الصورة المرجعية
    if (s) {
      const spawnT = 0.22;
      car.x = lerp(s.a.x, s.b.x, spawnT);
      car.z = lerp(s.a.z, s.b.z, spawnT);
      car.heading = s.heading;
      car.surfaceRoad = s.road;
    } else {
      car.x=ASSYUT.start.x;car.z=ASSYUT.start.z;car.heading=ASSYUT.start.heading;
    }
  } else {
    car.x=ASSYUT.start.x;car.z=ASSYUT.start.z;car.heading=ASSYUT.start.heading;
  }
  car.speed = 0; car.steer = 0; car.shake = 0; car.hitCd = 0;
  car.vel.set(0, 0);
  car.surfaceRoad=ASSYUT.start.road;car.yawRate=0;car.wheelAngle=0;car.reverseHold=0;car.longAccel=0;car.lateralAccel=0;
  car.y=assyutRoadHeightAt(car.x,car.z);car.vy=0;car.pitch=0;car.roll=0;resetSimulationClock();

  M.phase = 'none';
  M.timer = 0;
  M.boss = false;
  M.race = null;
  M.respawn = 0;
  M.after = null;
  M.hold = 0;

  passenger.visible = false;
  pickupMarker.visible = false;
  destMarker.visible = false;
  arrow.visible = false;
  arrowGlow.visible = false;

  $('menu').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('modal').classList.add('hidden');
  $('hud').classList.remove('hidden');

  camLook.set(car.x + 10, 1.4, car.z);
  camera.position.set(car.x - 8.2, 4.1, car.z);

  G.cycle=true;G.dynWeather=true;
  if(mode==='police')startPoliceShift();
  else if (mode === 'race') startRace();
  else {
    if (mode === 'survival') {
      M.timer = 65;
      M.survTrips = 0;
      M.survEarned = 0;
    }
    startMission();
  }

  renderLeaderboard();
  updateHUD();
  if (mode === 'roam') setObjective('يلا بينا يا أسطى 🚕 · امشي على الكورنيش', 3000);
  else if (mode === 'survival') setObjective('وردية البقاء ⏳ · كل مشوار بيزوّدلك وقت!', 3500);
}

function resetProgress() {
  G.money = 0;
  G.xp = 0;
  G.trips = 0;
  G.branch = 0;
  G.bestRace = 0;
  G.bestSurvival = 0;
  G.combo = 0;
  G.carIdx = 0;
  G.owned = ['qashqai'];
  G.conditions=Object.fromEntries(CARS.map(c=>[c.id,100]));
  G.totalEarned=0;G.ratingTotal=0;G.ratedTrips=0;clearDriverRequest();
  G.upgrades = {};
  G.paints = {};
  G.achievements = [];
  if (typeof swapTaxi === 'function') swapTaxi(0);
  saveProgress();
  updateHUD();
  renderLeaderboard();
  closeModal();
  setObjective('اتصفّر كل حاجة… يلا نبدأ من الأول', 3000);
}

/* =====================================================================
   المودالات والأزرار
   ===================================================================== */
function clockLabel(mins) {
  const hh = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const mm = Math.floor(((mins % 60) + 60) % 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

const TIME_PRESETS = [
  { t: 5.5 * 60, name: 'الفجر 🌅' },
  { t: 12 * 60, name: 'النهار ☀️' },
  { t: 18.5 * 60, name: 'الغروب 🌇' },
  { t: 21.5 * 60, name: 'الليل 🌙' },
];

function setTimePreset(i) {
  const p = TIME_PRESETS[((i % 4) + 4) % 4];
  G.clock = p.t;
  store.set('alex_taxi_clock', Math.round(G.clock));
  updateHUD();
  setObjective('الوقت: ' + p.name, 1800);
}

function openSettings() {
  const currentQuality = G.graphicsQuality || 'balanced';
  const currentCar = CARS[G.carIdx] || CARS[0];
  const cond = Math.round(currentCarCondition());

  showModal(`
    <div class="settingsPanel">
      <div class="settingsHeader">
        <div class="settingsTitle">
          <span class="settingsIcon">⚙️</span>
          <div>
            <h2>إعدادات اللعبة</h2>
            <small>ضبط الأداء والرسوم والتحكم لتجربة قيادة سلسة</small>
          </div>
        </div>
      </div>

      <div class="settingsGrid">
        <!-- 1. كارت الرسومات والأداء -->
        <div class="settingCard">
          <div class="settingCardHeader">
            <span class="cardIcon">⚡</span>
            <div>
              <strong>جودة الرسوم والأداء (FPS Booster)</strong>
              <small>اختر النمط المناسب لجهازك لمنع التقطيع والتهنيج في المتصفح</small>
            </div>
          </div>
          <div class="qualityButtons" role="group" aria-label="خيارات جودة الرسوم">
            <button class="qualityBtn ${currentQuality==='perf'?'active':''}" data-act="setQuality" data-val="perf" type="button">
              <span class="qTitle">🚀 فائق السلاسة</span>
              <span class="qDesc">أعلى فريمات (60+ FPS) للهواتف والأجهزة الضعيفة</span>
            </button>
            <button class="qualityBtn ${currentQuality==='balanced'?'active':''}" data-act="setQuality" data-val="balanced" type="button">
              <span class="qTitle">⚖️ متوازن (موصى به)</span>
              <span class="qDesc">أداء ممتاز مع جودة بصرية ممتعة</span>
            </button>
            <button class="qualityBtn ${currentQuality==='high'?'active':''}" data-act="setQuality" data-val="high" type="button">
              <span class="qTitle">✨ جودة عالية</span>
              <span class="qDesc">أعلى تفاصيل وظلال واقعية للأجهزة القوية</span>
            </button>
          </div>
        </div>

        <!-- 2. كارت الصوتيات والموسيقى -->
        <div class="settingCard">
          <div class="settingCardHeader">
            <span class="cardIcon">🔊</span>
            <div>
              <strong>الأصوات والراديو</strong>
              <small>تحكم في أصوات المحرك والكلاكس والموسيقى الحماسية</small>
            </div>
          </div>
          <div class="settingTogglesRow">
            <div class="settingItem">
              <span>مؤثرات الصوت (المحرك والكلاكس)</span>
              <button class="toggleBtn ${G.sound?'on':'off'}" data-act="sound" type="button">
                <span class="toggleDot"></span>
                <span class="toggleText">${G.sound?'شغال 🔊':'مكتوم 🔇'}</span>
              </button>
            </div>
            <div class="settingItem">
              <span>راديو الكاسيت والموسيقى</span>
              <button class="toggleBtn ${G.music?'on':'off'}" data-act="music" type="button">
                <span class="toggleDot"></span>
                <span class="toggleText">${G.music?'شغال 🎵':'متوقف 🔇'}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 3. كارت الكاميرا والتحكم -->
        <div class="settingCard">
          <div class="settingCardHeader">
            <span class="cardIcon">🎥</span>
            <div>
              <strong>الكاميرا والتحكم</strong>
              <small>اختر زاوية الرؤية المفضلة للقيادة</small>
            </div>
          </div>
          <div class="settingItem">
            <span>زاوية الكاميرا الحالية</span>
            <select id="setCam" class="settingSelect" aria-label="زاوية الكاميرا">
              <option value="0" ${G.camMode===0?'selected':''}>خارج قريب (مريح وتفاعلي)</option>
              <option value="1" ${G.camMode===1?'selected':''}>خارج بعيد (رؤية محيطية واسعة)</option>
              <option value="2" ${G.camMode===2?'selected':''}>التابلوه (من داخل صالون السيارة)</option>
              <option value="3" ${G.camMode===3?'selected':''}>علوي (سينمائي من الأعلى)</option>
            </select>
          </div>
          <div class="settingHint">
            <span>📱 تحكم الهاتف: أسهم توجيه لمسية كبيرة وسريعة الاستجابة (يسار / يمين) أسفل الشاشة.</span>
          </div>
        </div>

        <!-- 4. كارت السيارة والصيانة -->
        <div class="settingCard">
          <div class="settingCardHeader">
            <span class="cardIcon">🚗</span>
            <div>
              <strong>الصيانة والسيارات</strong>
              <small>${currentCar.name} · حالة ${cond}%</small>
            </div>
          </div>
          <button class="actionBtn" data-act="maintenance" type="button">فتح الجراج · تغيير العربية · الطلاء والصيانة</button>
        </div>

        <!-- 5. كارت استعادة الافتراضيات وتصفير اللعب -->
        <div class="settingCard dangerZone">
          <div class="settingCardHeader">
            <span class="cardIcon">🔄</span>
            <div>
              <strong>الإعدادات الافتراضية والتقدم</strong>
              <small>استعادة الضبط القياسي لجميع اللاعبين أو إعادة تعيين التقدم</small>
            </div>
          </div>
          <div class="settingsActionsRow">
            <button class="softActionBtn" data-act="restoreDefaults" type="button" title="إرجاع كافة خيارات الجودة والصوت والكاميرا للإعدادات الافتراضية الموصى بها">
              استعادة الإعدادات الافتراضية
            </button>
            <button class="dangerActionBtn" data-act="reset" type="button" title="تصفير الرصيد والمشاوير والبدء من الصفر">
              تصفير التقدم بالكامل
            </button>
          </div>
        </div>
      </div>

      <button class="bigBtn settingsCloseBtn" data-act="close" type="button">تم الحفظ والعودة للعبة ✓</button>
    </div>
  `);

  const sel = $('setCam');
  if (sel) {
    sel.value = String(G.camMode);
    sel.onchange = () => {
      setCamMode(+sel.value);
      setObjective('وجهة النظر: ' + CAM_LABELS[G.camMode], 1500);
    };
  }
}

let garageTab = 'repair';

function garageHTML(){
 if(G.mode==='police'&&garageTab==='paint')garageTab='repair';
 const current=CARS[G.carIdx]||CARS[0],condition=currentCarCondition(),busy=rideBusy();
 const disabled=busy?'disabled':'',cost=repairPrice();
 const header=`<div class="maintenanceHeading"><div><small>إدارة العربية</small><h2>الصيانة والسيارات</h2></div><div class="maintenanceWallet">${fmt(G.money)} <small>ج.م</small></div></div><p class="maintenanceCar">${current.name} · الحالة ${Math.round(condition)}%</p><div class="conditionBar"><i style="width:${condition}%;background:${condition<35?'#e48e80':'#8be7b8'}"></i></div><div class="garageTabs"><button class="gTab ${garageTab==='repair'?'active':''}" data-act="tabRepair">الإصلاح</button><button class="gTab ${garageTab==='cars'?'active':''}" data-act="tabCars">تغيير العربية</button><button class="gTab ${garageTab==='paint'?'active':''}" data-act="tabPaint" ${G.mode==='police'?'disabled':''}>الطلاء</button></div>${busy?'<p class="maintenanceNotice">أكمل الرحلة الحالية أولًا. الصيانة وتغيير العربية متاحان بين الرحلات.</p>':''}`;
 let content='';
 if(garageTab==='cars')content=`<div class="garageGrid">${CARS.map((c,i)=>({c,i})).filter(({c})=>!c.localImport&&c.available!==false&&(G.mode==='police'?c.police:!c.police)).sort((a,b)=>(b.i===G.carIdx?10:b.c.uploaded?5:0)-(a.i===G.carIdx?10:a.c.uploaded?5:0)).map(({c,i})=>{
  const owned=G.owned.includes(c.id),selected=i===G.carIdx;
  return `<div class="carCard ${selected?'selected':''}">${CAR_THUMBS[c.id]?`<img class="carPreview" src="${CAR_THUMBS[c.id]}" alt="${c.name}" loading="lazy">`:'<div style="font-size:48px;padding:22px">🚓</div>'}<div class="ccName">${c.name}</div><div class="ccDesc">${c.desc}</div><div class="ccStat"><span>حالة ${Math.round(G.conditions[c.id]??100)}%</span><span>${Math.round(c.topSpeed*3.6)} كم/س</span></div><button class="${selected?'softBtn':'bigBtn'}" data-act="${owned?'fleetSelect':'fleetBuy'}" data-ci="${i}" ${selected||busy||(!owned&&G.money<c.price)?'disabled':''}>${selected?'العربية الحالية':owned?'استخدام العربية':`شراء · ${fmt(c.price)} ج.م`}</button>${c.id==='qashqai'&&!c.uploaded?'<button class="softBtn" data-act="flipQashqai">عكس اتجاه المجسم</button>':''}</div>`;
 }).join('')}</div><p class="maintenanceHint">شراء العربية مرة واحدة. العربيات التي تملكها يمكنك التبديل بينها مجانًا.</p>`;
 else if(garageTab==='paint')content=`<p class="maintenanceHint">تغيير اللون: <b>${fmt(PAINT_PRICE)} ج.م</b> لكل عملية. يشمل الرجوع للون الأصلي.</p><div class="paintGrid">${CAR_PAINTS.map(p=>{
  const hex=p.hex??current.color1,active=hex===(G.paints[current.id]??current.color1);
  return `<button class="paintSw ${active?'active':''}" data-act="fleetPaint" data-pid="${p.id}" ${active||busy||G.money<PAINT_PRICE?'disabled':''}><span class="paintDot" style="background:#${hex.toString(16).padStart(6,'0')}"></span><span>${p.name}</span><small>${active?'الحالي':fmt(PAINT_PRICE)+' ج.م'}</small></button>`;
 }).join('')}</div>`;
 else content=`<div class="repairCard"><div class="repairIcon">🔧</div><h3>${condition>=99.95?'العربية بحالة ممتازة':'إصلاح '+current.name}</h3><p>الخبطات تقلّل حالة العربية وأداءها. الإصلاح يعيد الحالة إلى 100%.</p><div class="repairBreakdown"><span>الحالة الحالية</span><b>${Math.round(condition)}%</b></div><div class="repairBreakdown"><span>تكلفة الإصلاح الكامل</span><b>${fmt(cost)} ج.م</b></div><button class="bigBtn" data-act="fleetRepair" ${busy||cost===0||G.money<cost?'disabled':''}>${cost===0?'لا تحتاج إصلاحًا':`إصلاح ودفع ${fmt(cost)} ج.م`}</button>${cost>G.money?'<small>أكمل مشاوير أخرى لتغطية تكلفة الإصلاح.</small>':''}</div>`;
 return header+content+'<button class="softBtn" data-act="settingsBack">رجوع للإعدادات</button><button class="bigBtn" data-act="close">عودة</button>';
}

function openGarage() {
  showModal(garageHTML());
}

function openAchievements() {
  const rows = ACHIEVEMENTS.map(a => {
    const done = G.achievements.includes(a.id);
    return `<div class="achRow ${done ? 'done' : ''}">
      <div class="achIco">${a.icon}</div>
      <div class="achInfo">
        <div class="achName">${a.name}</div>
        <div class="achDesc">${a.desc}</div>
      </div>
      <div class="achRew">${done ? '✓ مكتمل' : `+${fmt(a.reward)} ج.م`}</div>
    </div>`;
  }).join('');

  showModal(`
    <h2>الإنجازات 🎖️</h2>
    <p>مكتمل: <b style="color:var(--gold)">${G.achievements.length}</b> من ${ACHIEVEMENTS.length}</p>
    <div>${rows}</div>
    <button class="bigBtn" data-act="close">تمام</button>
  `);
}

$('modalPanel').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  sfxUI();
  if(act==='flipQashqai'){const c=CARS.find(c=>c.id==='qashqai');c.orientation=(c.orientation||0)+Math.PI;store.set('assyut_qashqai_orientation',c.orientation);if(CARS[G.carIdx].id==='qashqai')swapTaxi(G.carIdx);return;}
  if (act === 'close') closeModal();
  else if (act === 'setQuality') {
    const q = b.dataset.val;
    if (q) {
      G.graphicsQuality = q;
      store.set('assyut_graphics_quality', q);
      if (typeof applyGraphicsSettings === 'function') applyGraphicsSettings(q);
      const labels = { perf: 'فائق السلاسة (60+ FPS)', balanced: 'متوازن', high: 'جودة عالية' };
      setObjective('تم ضبط نمط الأداء إلى: ' + (labels[q] || q), 2500);
      openSettings();
    }
  } else if (act === 'restoreDefaults') {
    if (typeof resetSettingsToDefault === 'function') resetSettingsToDefault();
    setObjective('تمت استعادة الإعدادات الافتراضية القياسية بنجاح ⚙️', 3000);
    openSettings();
  } else if (act === 'retry') {
    const mode = G.mode;
    closeModal();
    startRun(mode);
  } else if (act === 'menu') {
    closeModal();
    toMenu();
  } else if (act === 'reset') {
    resetProgress();
  } else if (act === 'sound') {
    setSound(!G.sound);
    openSettings();
  } else if (act === 'music') {
    setMusic(!G.music);
    openSettings();
  } else if (act === 'cycle') {
    G.cycle = !G.cycle;
    store.set('alex_taxi_cycle', G.cycle ? '1' : '0');
    openSettings();
  } else if (act === 'dynw') {
    G.dynWeather = !G.dynWeather;
    store.set('alex_taxi_dynw', G.dynWeather ? '1' : '0');
    openSettings();
  } else if (act.startsWith('w_')) {
    setWeather(act.slice(2));
    updateHUD();
    openSettings();
  } else if (act[0] === 't' && act.length === 2) {
    setTimePreset(+act[1]);
    openSettings();
  } else if (act === 'tabCars') {
    garageTab = 'cars';
    openGarage();
  } else if (act === 'tabUpg') {
    garageTab = 'upgrades';
    openGarage();
  } else if (act === 'tabPaint') {
    garageTab = 'paint';
    openGarage();
  } else if(act==='maintenance'){
    garageTab='repair';openGarage();
  } else if(act==='settingsBack'){
    openSettings();
  } else if(act==='tabRepair'){
    garageTab='repair';openGarage();
  } else if(['fleetRepair','fleetPaint','fleetBuy','fleetSelect'].includes(act)){
    const action={fleetRepair:'repair',fleetPaint:'paint',fleetBuy:'buy',fleetSelect:'select'}[act];
    if(action==='buy'||action==='select'){const next=CARS[Number(b.dataset.ci)];if(next?.uploaded&&!importedModels.loaded[next.asset]){b.disabled=true;b.textContent='جاري تحميل السيارة…';try{await ensureVehicleModel(next.asset);}catch(e){setObjective('تعذّر تحميل السيارة · رصيدك لم يتغير',3500);openGarage();return;}}}
    const result=fleetTransaction(action,action==='paint'?b.dataset.pid:b.dataset.ci);
    if(result.ok){sfxCash();setObjective(result.message+(result.amount?' · −'+fmt(result.amount)+' ج.م':''),3000);}
    else{sfxFail();setObjective(result.message,3000);}
    openGarage();
  }
});

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 sfxUI();
 if(btn.dataset.mode==='police'){showPatrolScreen();return;}
 if(typeof runWithLaunchTransition==='function'){
  runWithLaunchTransition('rides', CARS[G.carIdx]?.asset || 'qashqai', 'جارٍ تجهيز سيارة أوبر والانطلاق…', 'استعد لاستقبال المشاوير وخدمة ركاب أسيوط', '🚕');
 } else {
  initAudio();
  startRun('rides');
 }
}));

$('btnSound').addEventListener('click', () => { sfxUI(); setSound(!G.sound); });
$('btnMusic').addEventListener('click', () => { initAudio(); setMusic(!G.music); });
$('menuSound').addEventListener('click', () => { initAudio(); sfxUI(); setSound(!G.sound); });
if ($('menuGarage')) $('menuGarage').addEventListener('click', () => { initAudio(); sfxUI(); openGarage(); });
if ($('menuAch')) $('menuAch').addEventListener('click', () => { initAudio(); sfxUI(); openAchievements(); });
if ($('btnAch')) $('btnAch').addEventListener('click', () => { sfxUI(); openAchievements(); });
$('btnSettings').addEventListener('click', () => { sfxUI(); openSettings(); });
$('btnGarage').addEventListener('click', () => { sfxUI(); openGarage(); });
$('btnResume').addEventListener('click', () => { sfxUI(); resumeGame(); });
$('btnRestart').addEventListener('click', () => {
  sfxUI();
  $('pause').classList.add('hidden');
  startRun(G.mode);
});
$('btnMenu').addEventListener('click', () => { sfxUI(); toMenu(); });

updateMusicUI();

$('menuSettings').addEventListener('click',openSettings);

// الانتقال التلقائي لمزلقان السكة الحديد والميكروباص الأبيض عند تمرير الباراميتر
if (typeof location !== 'undefined' && location.search && location.search.includes('crossing')) {
  const dismissAndTeleport = () => {
    try {
      if (typeof loadingUI !== 'undefined') loadingUI.finish();
      const s = document.getElementById('loadingScreen');
      if (s) s.remove();
      startRun('rides');
      if (typeof teleportToRailwayCrossing === 'function') {
        teleportToRailwayCrossing(location.search.includes('crossing_hiace'));
      }
    } catch (_) {}
  };
  setTimeout(dismissAndTeleport, 300);
  setTimeout(dismissAndTeleport, 1200);
}

// مفاتيح اختصار سريعة للمعاينة في المتصفح: X لمشاهدة الميكروباص من الخلف، Z لقيادة الميكروباص نفسه
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyX' && typeof teleportToRailwayCrossing === 'function') {
      teleportToRailwayCrossing(false);
    } else if (e.code === 'KeyZ' && typeof teleportToRailwayCrossing === 'function') {
      teleportToRailwayCrossing(true);
    }
  });
}

/* ========================= 97-police-movie-studio.js ========================= */
/* Small offline-renderable scenes used by the two mission video transitions. */
function createPoliceMovie(kind,label='قسم أول'){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xc4d2d8);scene.add(new THREE.HemisphereLight(0xffffff,0x707366,2.7));const sun=new THREE.DirectionalLight(0xffefd8,2.5);sun.position.set(-4,8,5);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x737675,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
 const c=CARS[G.carIdx]?.police?CARS[G.carIdx]:CARS.find(c=>c.police),rig=makeUploadedCarRig(c);scene.add(rig.group);
 const movieCamera=new THREE.PerspectiveCamera(48,16/9,.04,70);movieCamera.position.set(-8.4,3.1,6.2);movieCamera.lookAt(kind==='arrest'?-1:1,1,0);
 const actors=[];const officerCount=3,suspectCount=2;
 for(let i=0;i<suspectCount;i++){const actor=makePoliceSuspect();scene.add(actor);actors.push({mesh:actor,officer:false,lane:i===0?-.34:.34,back:i*.75});}
 for(let i=0;i<officerCount;i++){const actor=makeEgyptianOfficer();scene.add(actor);actors.push({mesh:actor,officer:true,lane:i===0?-.95:i===1?.95:0,back:i===2?1.4:.25});}
 let hatch=null;
 if(kind==='arrest'){
  const opening=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.24),new THREE.MeshBasicMaterial({color:0x111a21,side:THREE.DoubleSide}));opening.rotation.y=-Math.PI/2;opening.position.set(-c.length/2-.05,1.03,0);scene.add(opening);
  hatch=new THREE.Group();hatch.position.set(-c.length/2-.08,1.65,0);const panel=new THREE.Mesh(new THREE.BoxGeometry(.045,1.15,1.57),new THREE.MeshStandardMaterial({color:0x101316}));panel.position.y=-.575;hatch.add(panel);scene.add(hatch);
 }else{
  rig.group.position.set(-2.6,0,2.2);
  const station=makePoliceStationBuilding(label);station.rotation.y=Math.PI/2;station.position.set(8.5,0,0);scene.add(station);

 }
 return {scene,camera:movieCamera,update(t){const progress=clamp((t-.5)/4.5,0,1);if(hatch)hatch.rotation.z=-1.15*clamp(t/.8,0,1);for(const a of actors){const x=kind==='arrest'?lerp(-6-a.back,-2.1-a.back*.1,progress):lerp(-3.9-a.back,3.8-a.back*.1,progress);a.mesh.position.set(x,.03,a.lane);a.mesh.rotation.y=Math.PI/2;a.mesh.visible=progress<(a.officer?.99:.92);animatePerson(a.mesh,t*6,progress<1?1:0);if(a.officer)for(const arm of a.mesh.userData.walk.arms)arm.rotation.x=-.45;}},duration:6};
}

/* ========================= 98-performance.js ========================= */
/* Keep deterministic vehicle physics at 120Hz, traffic decisions at 30Hz. */
let streetAccumulator=0,budgetAccumulator=0,_lowFpsStreak=0;
let _fpsFrames=0,_fpsLastTime=performance.now();
const PERFORMANCE={trafficHz:30,drawCalls:0,triangles:0,visibleBuildings:0,fps:60};
const _scratchPos=new THREE.Vector3();
function updateStreetCadence(dt){
 streetAccumulator+=Math.min(0.066,dt);
 let steps=0;
 while(streetAccumulator>=1/30 && steps<2){
  updateTraffic(1/30);
  updateTrafficLights(1/30);
  updatePeds(1/30);
  streetAccumulator-=1/30;
  steps++;
 }
 if(streetAccumulator>=1/30)streetAccumulator=0;
}
function updateSceneBudgets(dt){
 _fpsFrames++;
 const _now=performance.now();
 if(_now-_fpsLastTime>=1000){
  PERFORMANCE.fps=Math.round((_fpsFrames*1000)/(_now-_fpsLastTime));
  _fpsFrames=0;_fpsLastTime=_now;
  if(G.state==='play'&&PERFORMANCE.fps>0&&PERFORMANCE.fps<22){
   _lowFpsStreak++;
   if(_lowFpsStreak>=4&&G.graphicsQuality!=='low'&&typeof applyGraphicsSettings==='function'){
    applyGraphicsSettings('low');
    _lowFpsStreak=0;
   }
  }else{_lowFpsStreak=0;}
 }
 budgetAccumulator+=dt;if(budgetAccumulator<.08)return;budgetAccumulator=0;
 const q=typeof G!=='undefined'?G.graphicsQuality:'medium';
 const MAX_BLDG_DIST=q==='low'?140:q==='high'?225:175,MAX_BLDG_DIST2=MAX_BLDG_DIST*MAX_BLDG_DIST;
 const DETAIL_DIST=q==='low'?45:q==='high'?75:55,DETAIL_DIST2=DETAIL_DIST*DETAIL_DIST;
 const TRAFFIC_VIS=q==='low'?130:q==='high'?200:155,TRAFFIC_VIS2=TRAFFIC_VIS*TRAFFIC_VIS;
 const PED_VIS=q==='low'?50:q==='high'?85:65,PED_VIS2=PED_VIS*PED_VIS;
 const SIGN_VIS=q==='low'?110:150,SIGN_VIS2=SIGN_VIS*SIGN_VIS;
 const cx=G.state==='menu'?camera.position.x:car.x,cz=G.state==='menu'?camera.position.z:car.z;
 for(const sign of REAL_CITY.signs||[]){
  sign.getWorldPosition(_scratchPos);
  const dx=_scratchPos.x-cx,dz=_scratchPos.z-cz;
  if(Math.abs(dx)>SIGN_VIS||Math.abs(dz)>SIGN_VIS){sign.visible=false;continue;}
  sign.visible=(dx*dx+dz*dz)<SIGN_VIS2;
 }
 let visible=0;
 for(const b of REAL_CITY.buildings){
  const dx=b.x-cx,dz=b.z-cz;
  if(Math.abs(dx)>MAX_BLDG_DIST||Math.abs(dz)>MAX_BLDG_DIST){b.mesh.visible=false;continue;}
  const d2=dx*dx+dz*dz;
  const isVis=d2<MAX_BLDG_DIST2;
  b.mesh.visible=isVis;
  if(!isVis)continue;
  visible++;
  const showDetails=d2<DETAIL_DIST2;
  for(let i=1;i<b.mesh.children.length;i++)b.mesh.children[i].visible=showDetails;
 }
 for(const t of traffic){
  const dx=t.mesh.position.x-cx,dz=t.mesh.position.z-cz;
  if(Math.abs(dx)>TRAFFIC_VIS||Math.abs(dz)>TRAFFIC_VIS){t.mesh.visible=false;continue;}
  t.mesh.visible=(dx*dx+dz*dz)<TRAFFIC_VIS2;
 }
 for(const p of peds){
  const dx=p.mesh.position.x-cx,dz=p.mesh.position.z-cz;
  if(Math.abs(dx)>PED_VIS||Math.abs(dz)>PED_VIS){p.mesh.visible=false;continue;}
  p.mesh.visible=(dx*dx+dz*dz)<PED_VIS2;
 }
 PERFORMANCE.visibleBuildings=visible;PERFORMANCE.drawCalls=renderer.info?.render.calls||0;PERFORMANCE.triangles=renderer.info?.render.triangles||0;
}

// Architecture never moves; avoid recomputing thousands of static world transforms per frame.
REAL_CITY.group.updateMatrixWorld(true);
REAL_CITY.group.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
REAL_CITY.group.updateMatrixWorld=function(){};

/* ========================= 99-loop.js ========================= */
/* =====================================================================
   الحلقة الرئيسية
   ===================================================================== */
const gameClock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  try {
    const wallDt=gameClock.getDelta();
    const dt = Math.min(wallDt, .25);
    seaUniforms.uT.value += dt;
    document.body.classList.toggle('playing', G.state === 'play');

    const simulated=runFixedSimulation(dt,G.state==='play',step=>{
      physics(step);
      return G.state==='play';
    });
    if(G.state==='play'){
      updateMission(simulated||dt);
      updateStreetCadence(simulated);
      updateTaxiVisual(dt);
      G.hudT+=simulated;
      if(G.hudT>.1){G.hudT=0;updateHUD();drawMinimap();}
    }

    // صوت الموتور والبيئة مع محاكاة 5 سرعات ناقل حركة
    if (engGain && AC) {
      const sp = Math.abs(car.speed);
      const on = G.sound && G.state === 'play' && !window.__deferAudio;
      const c = CARS[G.carIdx] || CARS[0];
      const maxSp = Math.max(15, typeof MAXSPEED !== 'undefined' ? MAXSPEED : 45);
      const ratio = clamp(sp / maxSp, 0, 1.15);
      // منحنى RPM يحاكي تعشيق 5 غيارات للسيارة
      const gear = Math.min(4, Math.floor(ratio * 4.5));
      const gearLow = gear / 4.5;
      const gearSpan = 1 / 4.5;
      const rpm = sp < 0.8 ? 0.14 : clamp(0.24 + ((ratio - gearLow) / gearSpan) * 0.72 + gear * 0.04, 0.18, 1.0);
      const baseHz = c.id === 'sport370' || c.id === 'roadster' ? 42 : c.body === 'micro' ? 32 : 36;
      const maxHz = c.id === 'sport370' || c.id === 'roadster' ? 168 : c.body === 'micro' ? 115 : 138;
      const throttle = (keys.KeyW || keys.ArrowUp || touch.gas) ? 1 : 0;
      const engHz = baseHz + rpm * (maxHz - baseHz) + throttle * 6;

      // موازنة ديناميكية للأصوات (Audio Ducking) عند تشغيل أغاني الكاسيت
      const musicActive = typeof isMusicPlaying === 'function' && isMusicPlaying();
      const duckRain = musicActive ? 0.38 : 1.0;
      const duckEngine = musicActive ? 0.65 : 1.0;
      const duckWind = musicActive ? 0.50 : 1.0;

      engGain.gain.setTargetAtTime(on ? (.026 + rpm * .048 + throttle * .018) * duckEngine : 0, AC.currentTime, .09);
      engOsc.frequency.setTargetAtTime(engHz, AC.currentTime, .06);
      if (typeof engOsc2 !== 'undefined' && engOsc2) engOsc2.frequency.setTargetAtTime(engHz * 2, AC.currentTime, .06);
      if (typeof engSub !== 'undefined' && engSub) engSub.frequency.setTargetAtTime(engHz * 0.5, AC.currentTime, .06);
      if (typeof engFilter !== 'undefined' && engFilter) engFilter.frequency.setTargetAtTime(220 + rpm * 540 + throttle * 240, AC.currentTime, .08);
      if (typeof engRumbleGain !== 'undefined' && engRumbleGain) engRumbleGain.gain.setTargetAtTime(on ? (.018 + rpm * .024 + throttle * .014) * duckEngine : 0, AC.currentTime, .09);

      windGain.gain.setTargetAtTime(on ? (Math.pow(clamp(sp / maxSp, 0, 1), 1.4) * .048) * duckWind : 0, AC.currentTime, .2);
      const brakingInput = keys.KeyS || keys.ArrowDown || touch.brk || keys.Space || touch.hb;
      const drifting = Math.abs(car.latVel || 0) > 6.5 && sp > 10;
      skidGain.gain.setTargetAtTime(on && ((keys.Space || touch.hb) && sp > 10 || drifting) ? .026 : 0, AC.currentTime, .08);
      if (brakeGain) {
        const brakePressure = car.brakePedal || (brakingInput ? 1 : 0);
        brakeGain.gain.setTargetAtTime(on && brakingInput && sp > 4 ? Math.min(.014, .005 + brakePressure * .009) : 0, AC.currentTime, .06);
      }
      if (seaGain) {
        const nearSea = clamp(1 - (car.z - 12) / 40, 0, 1);
        const wave = .5 + .5 * Math.sin(performance.now() * .0006);
        seaGain.gain.setTargetAtTime(0, AC.currentTime, .25);
      }
      if (rainGain) {
        rainGain.gain.setTargetAtTime(on ? rainBlend * .026 * duckRain : 0, AC.currentTime, .25);
      }
    }

    if (!window.__deferAudio) { updateEmergencyAudio(); syncRecordedRadio(); }
    if (G.state === 'pause') return;
    updateCamera(dt);
    updateMarkers(dt);

    // السما والبحر يتبعوا اللاعب
    sky.position.set(camera.position.x, 0, camera.position.z);
    clouds.position.x = camera.position.x * .8;
    sea.position.x = camera.position.x;

    updateDayNight(wallDt);
    updateWeather(wallDt);

    renderDriverPhone();
    updateArchitectureDetails();
    if(typeof updateVillageRoads==='function')updateVillageRoads(dt);
    if(typeof updateRailwayCrossing==='function')updateRailwayCrossing(dt);
    if(typeof updateFuelAndStations==='function')updateFuelAndStations(dt);
    if(typeof updateCockpitRealism==='function')updateCockpitRealism();
    updateSceneBudgets(dt);
    if(!window.__deferRender&&G.state!=='cinematic'&&G.state!=='menu')renderer.render(scene, camera);
  } catch(loopErr) {
    console.error('Frame loop non-fatal error:', loopErr);
    try {
      if(!window.__deferRender&&G.state!=='cinematic'&&G.state!=='menu')renderer.render(scene, camera);
    } catch(_) {}
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (typeof applyGraphicsSettings === 'function') applyGraphicsSettings(G.graphicsQuality);
  renderer.setSize(innerWidth, innerHeight);
});

/* بداية */
if (typeof applyGraphicsSettings === 'function') applyGraphicsSettings(G.graphicsQuality);
swapTaxi(G.carIdx);
window.__game = {
  POLICE_FILMS, policeStationArrival, INFRA, infrastructureRoadPoint, updateTaxiVisual, navigationStopHeight, updateMarkers, navigationProgress, rideNavigationAim, selectDrivingSurface, renderScene:()=>{updateDayNight(0);updateArchitectureDetails();renderer.render(scene,camera)}, updateCamera, updateTrafficLights, updateHUD, drawMinimap, updatePeds, startRun, openGarage, ROAD_FURNITURE, onDrivingRoad, roadHeightAt, WALK_SURFACES,
  resumeRendering:()=>{gameClock.getDelta();loop();}, POLICE, issuePoliceCall, updatePoliceMission, finishPoliceClip, playPoliceClip, createPoliceMovie, VEHICLE_SIGNALS, updateVehicleSignals, PERFORMANCE, updateSceneBudgets, updateStreetCadence,
  POLICE_BMW, installPoliceBMW, restorePoliceBMW, selectedPoliceVehicle, selectPoliceVehicle, UPLOADED_MODELS, ensureVehicleModel, makeUploadedCarRig, ASSYUT, REAL_CITY, STREET_LIFE, WALKING_GROUPS, QASHQAI_SOURCE, installQashqai, chooseQashqaiFile,
  RIDE, makeRideOffer, acceptRideOffer, rejectRideOffer, boardRidePassenger, completeRideTrip, fleetTransaction, repairPrice, currentCarCondition, roadRoute, riderRoadStop, startDriverShift, assets: importedModels, surfaces: surfaceAssets, runFixedSimulation, resetSimulationClock, G, M, car, taxi, camera, physics, updateSuspension, updateTraffic, bumpHeightAt,
  setMusic, setStation, setTimePreset, setWeather, swapTaxi, carStats, MUSIC, getAC: () => AC,
  arrow, arrowGlow, passenger, pickupMarker, destMarker,
  BUMPS, CURB_LINES, TREES, TRAFFIC_LIGHTS, traffic, MAP, CARS, UPGRADES, WEATHERS, ACHIEVEMENTS,
  saveProgress, store,
  snapCam: () => {
    const fwd = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    camera.position.set(car.x - fwd.x * 8.2, 4.1, car.z - fwd.z * 8.2);
    camLook.set(car.x + fwd.x * 12, 1.6, car.z + fwd.z * 12);
    camera.lookAt(camLook);
  },
};
updateHUD();
setSound(G.sound);
loop();
initImportedModels().then(async()=>{await loadPoliceFilms();await restoreQashqai();updatePoliceVehicleUI();});
