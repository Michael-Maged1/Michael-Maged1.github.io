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
