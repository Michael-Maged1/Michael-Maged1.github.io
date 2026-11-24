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
