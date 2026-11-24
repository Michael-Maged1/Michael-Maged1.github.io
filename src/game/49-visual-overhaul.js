/* =====================================================================
   تحسينات بصرية شاملة — Visual Overhaul
   مدينة أسيوط: واجهات تفصيلية، تندات أصيلة، تكييفات، إنارة نيون متوهجة،
   ظل ملاصق واقعي للمركبة (Contact Shadow)، عادم حي، وفلاشر شرطة.
   (خالية تماماً من العوائق والمجسمات العشوائية في مسارات الشوارع).
   ===================================================================== */

const OVERHAUL_MATS = {
  plaster: [0xcdbb9f, 0xb99f82, 0xd8c9ad, 0xa99b83, 0xe0d2be].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .86, metalness: .02 })),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x1d3e4c, roughness: .12, metalness: .28, clearcoat: .65, envMapIntensity: .9 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x2e3636, roughness: .66, metalness: .42 }),
  awning: [0x9b3b2e, 0x1f5870, 0x4c7445, 0xc59631, 0x8a3c20].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .84 })),
  dirt: new THREE.MeshStandardMaterial({ color: 0x6c5c4b, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9b9b91, roughness: .95 }),
  acMetal: new THREE.MeshStandardMaterial({ color: 0xd4d8d8, roughness: .55, metalness: .3 }),
  curtainPattern: [0x8b261d, 0x234d6b, 0x3d6b38, 0x9e7328, 0x5c4238].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .82, side: THREE.DoubleSide })),
  cafeTable: new THREE.MeshStandardMaterial({ color: 0x6e767c, roughness: .45, metalness: .6 }),
  cafeChair: [0x1d5f9e, 0x9e2a22, 0x2f6e38].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }))
};

const OVERHAUL_SHOP_NAMES = [
  'بقالة ومينيماركت أسيوط',
  'كشري الزعيم',
  'صيدلية النور والشفاء',
  'كافيه وكافتيريا النيل',
  'حلويات ومعجنات الصعيدي',
  'عصائر وفرغلي أسيوط',
  'خدمات اتصالات ومحمول',
  'حاتي ومأكولات الأهرام',
  'فطاطري الملكة',
  'أجهزة منزلية وكهربائية',
  'بصريات ومستلزمات طبية',
  'سوبر ماركت الهدى والتقوى'
];

const OVERHAUL_COLORS = ['#8f3028', '#155a70', '#326b42', '#a05a18', '#6a2a78', '#204a60'];

function overhaulSign(text, color) {
  const tex = canvasTex(768, 180, g => {
    g.fillStyle = color; g.fillRect(0, 0, 768, 180);
    g.strokeStyle = '#f0dfb3'; g.lineWidth = 7; g.strokeRect(8, 8, 752, 164);
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff8e2'; g.font = 'bold 56px Cairo, Tahoma, Arial';
    g.fillText(text, 384, 94, 700);
  });
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.28,
    roughness: 0.55,
    side: THREE.DoubleSide
  });
  mat.userData = { base: 0.28 };
  if (typeof nightMats !== 'undefined') nightMats.push(mat);
  return new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.08), mat);
}

function addDetailedShopFront(x, z, heading, idx) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = heading;
  const w = 6.4, d = 4.7, h = 3.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), OVERHAUL_MATS.plaster[idx % OVERHAUL_MATS.plaster.length]);
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);

  const window = new THREE.Mesh(new THREE.BoxGeometry(w * .72, 1.35, .06), OVERHAUL_MATS.glass);
  window.position.set(0, 1.45, -d / 2 - .035); window.castShadow = true; g.add(window);

  for (const sx of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.6, .14), OVERHAUL_MATS.frame);
    col.position.set(sx * w * .24, 1.45, -d / 2 - .08); g.add(col);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(.82, 1.95, .08), OVERHAUL_MATS.frame);
  door.position.set(w * .30, 1.12, -d / 2 - .08); g.add(door);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(w + .25, .10, 1.0), OVERHAUL_MATS.awning[idx % OVERHAUL_MATS.awning.length]);
  awning.position.set(0, 2.55, -d / 2 - .42); awning.rotation.x = -.12; g.add(awning);

  const signTitle = OVERHAUL_SHOP_NAMES[idx % OVERHAUL_SHOP_NAMES.length];
  const signColor = OVERHAUL_COLORS[idx % OVERHAUL_COLORS.length];
  const sign = overhaulSign(signTitle, signColor);
  sign.position.set(0, 2.98, -d / 2 - .10); g.add(sign);

  const ac = new THREE.Mesh(new THREE.BoxGeometry(.62, .42, .28), OVERHAUL_MATS.concrete);
  ac.position.set(-w * .30, 2.20, -d / 2 - .22); ac.castShadow = true; g.add(ac);

  // قاعدة مدخل المحل
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(w + .7, .035, d + .7), OVERHAUL_MATS.dirt);
  dirt.position.y = .025; dirt.receiveShadow = true; g.add(dirt);

  REAL_CITY.group.add(g); return g;
}

function addUrbanInfill() {
  let added = 0;
  for (let i = 0; i < ASSYUT.places.length && added < 48; i += 2) {
    const p = ASSYUT.places[i], n = nearestAssyutRoad(p); if (!p || !n || n.width < 8) continue;
    // تجنب إضافة مبانٍ ملاصقة للكباري أو الأنفاق نهائياً منعاً للتداخل
    if (typeof INFRA !== 'undefined' && INFRA.profiles && INFRA.profiles.has(n.roadIndex)) continue;
    const side = added % 2 ? 1 : -1;
    const x = n.point.x + n.nx * (n.width / 2 + 7.5) * side;
    const z = n.point.z + n.nz * (n.width / 2 + 7.5) * side;
    if (typeof onDrivingRoad === 'function' && onDrivingRoad(x, z, 4.5)) continue;
    if (typeof segmentHitsBuilding === 'function' && segmentHitsBuilding({ x: x - 3.2, z: z - 2.5 }, { x: x + 3.2, z: z + 2.5 }, .6)) continue;
    const facingHeading = n.heading + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    addDetailedShopFront(x, z, facingHeading, added++);
  }
  REAL_CITY.visualInfill = added;
}

function addFacadeDepthPass() {
  let added = 0;
  for (const b of REAL_CITY.buildings) {
    if (!b || b.h < 10 || added > 75) continue;
    const side = added % 2 ? -1 : 1, levels = Math.min(4, Math.floor(b.h / 3.3));
    for (let fl = 0; fl < levels; fl++) {
      const y = 2.8 + fl * 3.15, x = b.x + ((added % 3) - 1) * Math.min(2.1, b.w * .18), z = b.z + side * (b.d / 2 + .08);
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.2, b.w * .32), .12, 1.0), OVERHAUL_MATS.concrete);
      balcony.position.set(x, y - .48, z + side * .48); REAL_CITY.group.add(balcony);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.min(2.8, b.w * .28), .62, .06), OVERHAUL_MATS.frame);
      rail.position.set(x, y - .10, z + side * 1.0); REAL_CITY.group.add(rail);

      if ((added + fl) % 3 === 0) {
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.6, b.w * .26), .95), OVERHAUL_MATS.curtainPattern[(added + fl) % OVERHAUL_MATS.curtainPattern.length]);
        curtain.position.set(x, y + .15, z + side * .96);
        if (side < 0) curtain.rotation.y = Math.PI;
        REAL_CITY.group.add(curtain);
      }
    }
    added++;
  }
  REAL_CITY.facadeDepth = added;
}

function addFacadeAirConditioners() {
  let count = 0;
  const acGeo = new THREE.BoxGeometry(.72, .46, .34);
  for (const b of REAL_CITY.buildings) {
    if (!b || b.h < 7 || count >= 55) continue;
    const side = count % 2 ? -1 : 1;
    const x = b.x + ((count % 4) - 1.5) * Math.min(2.5, b.w * .20);
    const y = 3.6 + (count % 3) * 3.1;
    const z = b.z + side * (b.d / 2 + .18);

    const ac = new THREE.Mesh(acGeo, OVERHAUL_MATS.acMetal);
    ac.position.set(x, y, z);
    REAL_CITY.group.add(ac);
    count++;
  }
  REAL_CITY.airConditioners = count;
}

/* ------------------------- المؤثرات الحركية والظل الملاصق ------------------------- */
const OVERHAUL_FX = {
  initialized: false,
  smokePool: [],
  smokeCursor: 0,
  smokeCd: 0,
  policeStrobeRed: null,
  policeStrobeBlue: null,
  contactShadow: null
};

function initOverhaulFX() {
  if (OVERHAUL_FX.initialized || typeof scene === 'undefined' || typeof THREE === 'undefined') return;
  OVERHAUL_FX.initialized = true;

  // 1. ظل ملاصق واقعي ثلاثي الأبعاد تحت جسم السيارة والعجلات (Ambient Contact Shadow)
  const shadowTex = canvasTex(256, 256, g => {
    g.clearRect(0, 0, 256, 256);
    // عزل ضوئي واقعي تحت شاسيه وأرضية السيارة بمحاذاة الطول والعرض
    const chassisGrad = g.createRadialGradient(128, 128, 12, 128, 128, 110);
    chassisGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
    chassisGrad.addColorStop(0.35, 'rgba(0,0,0,0.40)');
    chassisGrad.addColorStop(0.70, 'rgba(0,0,0,0.16)');
    chassisGrad.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.translate(128, 128);
    g.scale(1.0, 0.48);
    g.fillStyle = chassisGrad;
    g.beginPath();
    g.arc(0, 0, 110, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // بقع تلامس الإطارات الأربعة مع الأسفلت بمحاذاة اتجاه سير السيارة
    const wheelPositions = [[194, 52], [194, 204], [62, 52], [62, 204]];
    for (const [wx, wy] of wheelPositions) {
      const wGrad = g.createRadialGradient(wx, wy, 3, wx, wy, 24);
      wGrad.addColorStop(0, 'rgba(0,0,0,0.72)');
      wGrad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
      wGrad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = wGrad;
      g.beginPath();
      g.ellipse(wx, wy, 20, 11, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  const shadowGeo = new THREE.PlaneGeometry(4.65, 2.20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.60,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const cShadow = new THREE.Mesh(shadowGeo, shadowMat);
  cShadow.renderOrder = 2;
  scene.add(cShadow);
  OVERHAUL_FX.contactShadow = cShadow;

  // 2. تجمع جزيئات عادم السيارة
  const smokeGeo = new THREE.PlaneGeometry(0.35, 0.35);
  const smokeMat = new THREE.MeshBasicMaterial({
    map: typeof GLOW_TEX !== 'undefined' ? GLOW_TEX : null,
    color: 0xcccccc,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  for (let i = 0; i < 28; i++) {
    const p = new THREE.Mesh(smokeGeo, smokeMat.clone());
    p.visible = false;
    p.userData = { age: 0, maxAge: 1.2, vx: 0, vy: 0, vz: 0 };
    scene.add(p);
    OVERHAUL_FX.smokePool.push(p);
  }

  // 3. كشافات ستروب لسيارة الشرطة
  if (typeof taxi !== 'undefined') {
    const sR = new THREE.PointLight(0xff1724, 0, 24);
    sR.position.set(0, 1.85, -0.45);
    taxi.add(sR);
    OVERHAUL_FX.policeStrobeRed = sR;

    const sB = new THREE.PointLight(0x126dff, 0, 24);
    sB.position.set(0, 1.85, 0.45);
    taxi.add(sB);
    OVERHAUL_FX.policeStrobeBlue = sB;
  }
}

function updateVisualOverhaulEffects(dt) {
  if (!OVERHAUL_FX.initialized) initOverhaulFX();
  const t = performance.now() * 0.001;

  // 1. تحديث الظل الملاصق تحت السيارة
  if (OVERHAUL_FX.contactShadow && typeof car !== 'undefined') {
    const roadY = (typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(car.x, car.z) : car.y);
    const heightAboveRoad = Math.max(0, car.y - roadY);
    OVERHAUL_FX.contactShadow.position.set(car.x, roadY + 0.015, car.z);
    OVERHAUL_FX.contactShadow.rotation.set(0, car.heading, 0);
    const targetOpacity = clamp(0.60 - heightAboveRoad * 2.0, 0, 0.60);
    OVERHAUL_FX.contactShadow.material.opacity = targetOpacity;
    OVERHAUL_FX.contactShadow.scale.setScalar(clamp(1.0 + heightAboveRoad * 0.35, 1.0, 1.35));
    OVERHAUL_FX.contactShadow.visible = (typeof G !== 'undefined' && G.state === 'play' && targetOpacity > 0.02);
  }

  // 2. وميض سرينة الشرطة
  if (OVERHAUL_FX.policeStrobeRed && OVERHAUL_FX.policeStrobeBlue) {
    const isPoliceSiren = (typeof G !== 'undefined' && G.mode === 'police' && typeof POLICE !== 'undefined' && POLICE.siren);
    if (isPoliceSiren) {
      const strobePhase = Math.floor(t * 8) % 4;
      OVERHAUL_FX.policeStrobeRed.intensity = (strobePhase === 0 || strobePhase === 1) ? 4.2 : 0;
      OVERHAUL_FX.policeStrobeBlue.intensity = (strobePhase === 2 || strobePhase === 3) ? 4.2 : 0;
    } else {
      if (OVERHAUL_FX.policeStrobeRed.intensity > 0) OVERHAUL_FX.policeStrobeRed.intensity = 0;
      if (OVERHAUL_FX.policeStrobeBlue.intensity > 0) OVERHAUL_FX.policeStrobeBlue.intensity = 0;
    }
  }

  // 3. دخان العادم ودخان احتكاك الإطارات التفاعلي
  if (typeof car !== 'undefined' && typeof camera !== 'undefined' && OVERHAUL_FX.smokePool.length) {
    const sp = Math.abs(car.speed || 0);
    const isAccelerating = (typeof keys !== 'undefined' && (keys.KeyW || keys.ArrowUp)) || (typeof touch !== 'undefined' && touch.gas);
    const isBraking = (typeof keys !== 'undefined' && (keys.KeyS || keys.ArrowDown)) || (typeof touch !== 'undefined' && touch.brk);
    const isHb = (typeof keys !== 'undefined' && keys.Space) || (typeof touch !== 'undefined' && touch.hb);
    const onRoad = typeof onDrivingRoad === 'function' ? onDrivingRoad(car.x, car.z, 0.5) : true;
    const isRain = typeof G !== 'undefined' && G.weather === 'rain';
    const isSkidding = !car.airborne && ((isHb && sp > 3.2) || (isBraking && (car.longAccel || 0) < -3.8 && sp > 5.0) || Math.abs(car.lateralAccel || 0) > 5.0 || (!onRoad && sp > 7.5));
    OVERHAUL_FX.smokeCd -= dt;

    if (OVERHAUL_FX.smokeCd <= 0 && (sp > 0.5 || isAccelerating || isSkidding)) {
      OVERHAUL_FX.smokeCd = isSkidding ? 0.032 : isAccelerating ? 0.045 : 0.09;
      const p = OVERHAUL_FX.smokePool[OVERHAUL_FX.smokeCursor++ % OVERHAUL_FX.smokePool.length];
      const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
      const rx = -fz, rz = fx;

      if (isSkidding) {
        const side = (OVERHAUL_FX.smokeCursor % 2 === 0) ? 1 : -1;
        p.position.set(car.x - fx * 1.35 + rx * side * 0.74, Math.max(0.04, car.y + 0.12), car.z - fz * 1.35 + rz * side * 0.74);
        p.userData.age = 0;
        p.userData.maxAge = !onRoad ? 0.65 + Math.random() * 0.35 : 0.55 + Math.random() * 0.35;
        p.userData.vx = rx * side * (0.8 + Math.random() * 0.6) - fx * sp * 0.2;
        p.userData.vy = 0.6 + Math.random() * 0.8;
        p.userData.vz = rz * side * (0.8 + Math.random() * 0.6) - fz * sp * 0.2;
        p.material.opacity = !onRoad ? 0.50 : isRain ? 0.34 : 0.56;
        p.material.color.setHex(!onRoad ? 0xc8ad84 : isRain ? 0xcfe4f5 : 0xe8eaed);
        p.scale.setScalar(0.40);
        p.visible = true;
      } else {
        const ex = car.x - fx * 2.15 + rx * 0.42;
        const ey = Math.max(0.08, car.y + 0.28);
        const ez = car.z - fz * 2.15 + rz * 0.42;

        p.position.set(ex, ey, ez);
        p.userData.age = 0;
        p.userData.maxAge = 0.75 + Math.random() * 0.4;
        p.userData.vx = -fx * (0.8 + sp * 0.15) + (Math.random() - 0.5) * 0.4;
        p.userData.vy = 0.5 + Math.random() * 0.6;
        p.userData.vz = -fz * (0.8 + sp * 0.15) + (Math.random() - 0.5) * 0.4;
        p.material.opacity = isAccelerating ? 0.42 : 0.24;
        p.material.color.setHex(0xcccccc);
        p.scale.setScalar(0.28);
        p.visible = true;
      }
    }

    for (const p of OVERHAUL_FX.smokePool) {
      if (!p.visible) continue;
      p.userData.age += dt;
      const norm = p.userData.age / p.userData.maxAge;
      if (norm >= 1) {
        p.visible = false;
      } else {
        p.position.x += p.userData.vx * dt;
        p.position.y += p.userData.vy * dt;
        p.position.z += p.userData.vz * dt;
        p.scale.setScalar(0.28 + norm * 0.95);
        p.material.opacity = (1 - norm) * 0.35;
        p.quaternion.copy(camera.quaternion);
      }
    }
  }

  // 4. انعكاس الأسفلت المبلل أثناء المطر
  if (typeof G !== 'undefined' && typeof REAL_CITY !== 'undefined' && REAL_CITY.groundMat) {
    const isRain = G.weather === 'rain';
    const targetRough = isRain ? 0.26 : 0.94;
    const targetEnv = isRain ? 0.45 : 0.08;
    REAL_CITY.groundMat.roughness += (targetRough - REAL_CITY.groundMat.roughness) * Math.min(1, dt * 1.5);
    REAL_CITY.groundMat.envMapIntensity += (targetEnv - REAL_CITY.groundMat.envMapIntensity) * Math.min(1, dt * 1.5);
  }
}

function runAssyutVisualOverhaul() {
  if (typeof REAL_CITY === 'undefined' || !REAL_CITY.group) return;
  addUrbanInfill();
  addFacadeDepthPass();
  addFacadeAirConditioners();
}

runAssyutVisualOverhaul();
