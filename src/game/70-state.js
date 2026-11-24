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
