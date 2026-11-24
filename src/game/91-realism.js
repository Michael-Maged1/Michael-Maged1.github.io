/* =====================================================================
   واقعية القيادة: محطات البنزين والوقود + مسّاحات المطر + إضاءة التابلوه
   ===================================================================== */
const FUEL_STATIONS = [];
let _fuelLowWarned = false;
let _refuelSoundCd = 0;

function initFuelStations() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.segments || typeof REAL_CITY === 'undefined') return;
  const targets = [
    { name: 'محطة وطنية · الكورنيش', color: 0x0f7a44, accent: 0xfacc15, prefX: -320, prefZ: -60 },
    { name: 'محطة شيل أوت · الجمهورية', color: 0xd92323, accent: 0xfbbf24, prefX: 280, prefZ: 190 },
  ];
  for (const spec of targets) {
    let bestSeg = null, bestD = Infinity;
    for (const s of ASSYUT.segments) {
      if (s.width < 9 || s.length < 22 || INFRA?.profiles?.has(s.road)) continue;
      const mx = (s.a.x + s.b.x) * 0.5, mz = (s.a.z + s.b.z) * 0.5;
      const d = Math.hypot(mx - spec.prefX, mz - spec.prefZ);
      if (d < bestD) { bestD = d; bestSeg = s; }
    }
    if (!bestSeg) continue;
    const mx = (bestSeg.a.x + bestSeg.b.x) * 0.5, mz = (bestSeg.a.z + bestSeg.b.z) * 0.5;
    const nx = -(bestSeg.b.z - bestSeg.a.z) / bestSeg.length, nz = (bestSeg.b.x - bestSeg.a.x) / bestSeg.length;
    const padX = mx + nx * (bestSeg.width / 2 + 2.8), padZ = mz + nz * (bestSeg.width / 2 + 2.8);
    const yaw = Math.atan2(-nz, nx) + Math.PI / 2;

    const grp = new THREE.Group();
    grp.position.set(padX, 0, padZ);
    grp.rotation.y = yaw;

    // أرضية خرسانية ومنطقة تفويل مضيئة
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 0.08, 6.2),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 })
    );
    slab.position.y = 0.04;
    slab.receiveShadow = true;
    grp.add(slab);

    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 2.35, 24),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, 0.1, 0.8);
    grp.add(padRing);

    // مظلة المحطة وأعمدتها
    const canopyMat = new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.25, roughness: 0.5 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.45, 5.6), canopyMat);
    canopy.position.set(0, 4.3, -0.4);
    grp.add(canopy);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(9.35, 0.16, 5.75),
      new THREE.MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.35 })
    );
    trim.position.set(0, 4.15, -0.4);
    grp.add(trim);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5, metalness: 0.3 });
    for (const sx of [-3.6, 3.6]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.38, 4.1, 0.38), pillarMat);
      pil.position.set(sx, 2.05, -1.6);
      grp.add(pil);
      // طلمبة بنزين
      const pump = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 1.55, 0.45),
        new THREE.MeshStandardMaterial({ color: spec.accent, roughness: 0.45 })
      );
      pump.position.set(sx * 0.45, 0.82, -1.4);
      grp.add(pump);
    }

    REAL_CITY.group.add(grp);
    FUEL_STATIONS.push({ x: padX, z: padZ, name: spec.name, ring: padRing });
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
    if (d < 8.5 && sp < 3.5 && G.fuel < 99.5) {
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
