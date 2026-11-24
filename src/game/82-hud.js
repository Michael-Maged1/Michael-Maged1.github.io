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
