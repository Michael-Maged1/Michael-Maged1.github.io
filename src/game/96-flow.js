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
