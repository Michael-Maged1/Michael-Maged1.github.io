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
