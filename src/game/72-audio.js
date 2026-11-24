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
