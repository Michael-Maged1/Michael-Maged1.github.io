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
