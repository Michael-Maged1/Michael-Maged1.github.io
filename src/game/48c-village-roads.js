/* =====================================================================
   شوارع وقرى وريف أسيوط الشعبية
   - حبال زينة معلقة بين المباني (Festive Bunting)
   - عربية زفة وحنة العروسين بالبالونات الملونة (Celebration Zaffa Pickup)
   - موتوسيكلات صيني مركونة على الأرصفة (Parked Village Motorcycles)
   - دكاكين، أقفاص خضار، تندات قماش، وكراسي قهوة بلدي
   ===================================================================== */

const VILLAGE_ROADS = {
  group: new THREE.Group(),
  balloons: [],
  buntingMesh: null,
  pickup: null,
  motorcycles: 0,
  marketProps: 0,
  time: 0
};

if (typeof REAL_CITY !== 'undefined' && REAL_CITY.group) {
  REAL_CITY.group.add(VILLAGE_ROADS.group);
}

// ---------------------------------------------------------------------
// 1. حبال زينة معلقة بأعلام مثلثة ملونة ترفرف فوق شوارع القرى الشعبية
// ---------------------------------------------------------------------
function addVillageFestiveBunting() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.segments) return;
  const isVill = typeof REAL_CITY !== 'undefined' && REAL_CITY.isVillageSeg ? REAL_CITY.isVillageSeg : (s => s && s.width < 9.5);

  const colors = [
    new THREE.Color(0xff2a6d), // وردي فاقع
    new THREE.Color(0x00d2d3), // تركواز
    new THREE.Color(0xffe600), // أصفر شمسي
    new THREE.Color(0x10ac84), // أخضر زمردي
    new THREE.Color(0x9b5de5), // بنفسجي مبهج
    new THREE.Color(0xff6b6b), // أحمر مرجاني
    new THREE.Color(0xff9f43), // برتقالي مشرق
    new THREE.Color(0x54a0ff)  // أزرق سماوي
  ];

  const ropeVerts = [];
  const pennantVerts = [];
  const pennantColors = [];

  let count = 0;
  const targetSegIdx = (VILLAGE_ROADS.targetSeg?.index != null) ? VILLAGE_ROADS.targetSeg.index : 801;
  const buntingIndices = [targetSegIdx, targetSegIdx + 1];
  for (let i = 0; i < ASSYUT.segments.length; i += 3) {
    if (!buntingIndices.includes(i)) buntingIndices.push(i);
  }

  for (const si of buntingIndices) {
    const seg = ASSYUT.segments[si];
    if (!seg || !isVill(seg) || seg.length < 18 || seg.width > 9.5) continue;
    if (count >= 120) break;

    const step = 20;
    for (let d = 8; d < seg.length - 8; d += step) {
      const t = d / seg.length;
      const mx = lerp(seg.a.x, seg.b.x, t);
      const mz = lerp(seg.a.z, seg.b.z, t);
      const nx = -(seg.b.z - seg.a.z) / seg.length;
      const nz = (seg.b.x - seg.a.x) / seg.length;

      const halfW = seg.width / 2 + 1.2;
      const p0 = { x: mx - nx * halfW, y: 5.25, z: mz - nz * halfW };
      const p1 = { x: mx + nx * halfW, y: 5.25, z: mz + nz * halfW };
      const pMid = { x: mx, y: 4.88, z: mz }; // تدلي الحبل بانحناء خفيف طبيعي (catenary sag)

      // حبل الزينة
      const segs = 6;
      for (let k = 0; k < segs; k++) {
        const u0 = k / segs, u1 = (k + 1) / segs;
        const ptA = {
          x: lerp(p0.x, p1.x, u0),
          y: lerp(lerp(p0.y, pMid.y, u0), lerp(pMid.y, p1.y, u0), u0),
          z: lerp(p0.z, p1.z, u0)
        };
        const ptB = {
          x: lerp(p0.x, p1.x, u1),
          y: lerp(lerp(p0.y, pMid.y, u1), lerp(pMid.y, p1.y, u1), u1),
          z: lerp(p0.z, p1.z, u1)
        };
        ropeVerts.push(ptA.x, ptA.y, ptA.z, ptB.x, ptB.y, ptB.z);
      }

      // الأعلام المثلثة المعلقة
      const flagCount = Math.max(5, Math.floor(halfW * 2.2));
      for (let f = 0; f < flagCount; f++) {
        const u = (f + 0.5) / flagCount;
        const fx = lerp(p0.x, p1.x, u);
        const fy = lerp(lerp(p0.y, pMid.y, u), lerp(pMid.y, p1.y, u), u);
        const fz = lerp(p0.z, p1.z, u);

        const col = colors[(count + f) % colors.length];
        const flagW = 0.22, flagH = 0.44;
        const dx = (p1.x - p0.x) / (halfW * 2), dz = (p1.z - p0.z) / (halfW * 2);
        const perpX = -dz, perpZ = dx;

        const leftX = fx - dx * (flagW * 0.5), leftZ = fz - dz * (flagW * 0.5);
        const rightX = fx + dx * (flagW * 0.5), rightZ = fz + dz * (flagW * 0.5);
        const tipX = fx + perpX * 0.05, tipY = fy - flagH, tipZ = fz + perpZ * 0.05;

        // مثلث مزدوج الوجه
        pennantVerts.push(leftX, fy, leftZ, rightX, fy, rightZ, tipX, tipY, tipZ);
        pennantVerts.push(rightX, fy, rightZ, leftX, fy, leftZ, tipX, tipY, tipZ);
        for (let c = 0; c < 6; c++) pennantColors.push(col.r, col.g, col.b);
      }
      count++;
    }
  }

  if (ropeVerts.length) {
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(ropeVerts, 3));
    const rMat = new THREE.LineBasicMaterial({ color: 0x484c50, transparent: true, opacity: 0.75 });
    const ropeLines = new THREE.LineSegments(rGeo, rMat);
    VILLAGE_ROADS.group.add(ropeLines);
  }

  if (pennantVerts.length) {
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pennantVerts, 3));
    pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pennantColors, 3));
    pGeo.computeVertexNormals();
    const pMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
      side: THREE.DoubleSide
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.castShadow = true;
    VILLAGE_ROADS.group.add(pMesh);
    VILLAGE_ROADS.buntingMesh = pMesh;
  }
}

// ---------------------------------------------------------------------
// 2. عربية زفة وحنة أم شيماء مع باقة بالونات هيليوم ملونة عائمة
// ---------------------------------------------------------------------
function addCelebrationZaffaPickup() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.segments) return;
  const isVill = typeof REAL_CITY !== 'undefined' && REAL_CITY.isVillageSeg ? REAL_CITY.isVillageSeg : (s => s && s.width < 9.5);

  // اختيار شارع ريفي شعبي متكامل محاط بالمباني من الجانبين (شارع عمر بن عبد العزيز)
  let targetSeg = (ASSYUT.segments && ASSYUT.segments[801]) ? ASSYUT.segments[801] : null;
  if (!targetSeg || !isVill(targetSeg)) {
    targetSeg = ASSYUT.segments.find(s => isVill(s) && s.length > 35);
  }
  if (!targetSeg) return;
  VILLAGE_ROADS.targetSeg = targetSeg;

  const t = 0.52;
  const px = lerp(targetSeg.a.x, targetSeg.b.x, t);
  const pz = lerp(targetSeg.a.z, targetSeg.b.z, t);
  const heading = Math.atan2(targetSeg.b.x - targetSeg.a.x, targetSeg.b.z - targetSeg.a.z);
  const groundY = (typeof assyutRoadHeightAt === 'function') ? assyutRoadHeightAt(px, pz) : 0.03;

  const zaffaGroup = new THREE.Group();
  zaffaGroup.position.set(px, groundY, pz);
  zaffaGroup.rotation.y = heading;

  // هيكل بيك أب شفروليه الدبابة / هايلوكس أبيض مصري
  const whitePaint = new THREE.MeshStandardMaterial({ color: 0xf5f5f7, roughness: 0.28, metalness: 0.2, envMapIntensity: 0.9 });
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x1a242c, roughness: 0.12, metalness: 0.8, envMapIntensity: 1.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.18, metalness: 0.9, envMapIntensity: 1.5 });
  const blackPlast = new THREE.MeshStandardMaterial({ color: 0x222224, roughness: 0.82 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.88 });

  // كابينة السائق
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.05, 1.75), whitePaint);
  cab.position.set(0, 0.95, 0.35);
  cab.castShadow = true;
  zaffaGroup.add(cab);

  // الزجاج الأمامي
  const windGlass = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 0.15), darkGlass);
  windGlass.position.set(0, 1.15, 1.18);
  windGlass.rotation.x = -0.32;
  zaffaGroup.add(windGlass);

  // الكبوت ومقدمة السيارة
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.58, 1.25), whitePaint);
  hood.position.set(0, 0.72, 1.75);
  hood.castShadow = true;
  zaffaGroup.add(hood);

  // الشبك والصدام
  const grill = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.32, 0.08), chromeMat);
  grill.position.set(0, 0.68, 2.38);
  zaffaGroup.add(grill);

  // الكشافات الأمامية المضيئة
  const headlampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6cf, emissiveIntensity: 0.8 });
  for (const sx of [-0.68, 0.68]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.08), headlampMat);
    lamp.position.set(sx, 0.72, 2.38);
    zaffaGroup.add(lamp);
  }

  // حوض النقل الخلفي (Bed)
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.25, 2.35), whitePaint);
  bedFloor.position.set(0, 0.55, -1.35);
  bedFloor.castShadow = true;
  zaffaGroup.add(bedFloor);

  // جوانب الحوض
  for (const sx of [-0.85, 0.85]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 2.35), whitePaint);
    sideWall.position.set(sx, 0.86, -1.35);
    zaffaGroup.add(sideWall);
  }
  const rearTailgate = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.52, 0.08), whitePaint);
  rearTailgate.position.set(0, 0.86, -2.52);
  zaffaGroup.add(rearTailgate);

  // يافطة حنة أم شيماء على الباب الخلفي (Tailgate celebration banner)
  const bannerTex = canvasTex(256, 96, g => {
    g.fillStyle = '#ff2a6d';
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#ffe600';
    g.lineWidth = 4;
    g.strokeRect(3, 3, 250, 90);
    g.fillStyle = '#ffffff';
    g.font = 'bold 24px Tahoma, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('🎈 حنة أم شيماء 🎈', 128, 42);
    g.font = 'bold 18px Tahoma, Arial, sans-serif';
    g.fillStyle = '#ffe600';
    g.fillText('ألف مبروك للعروسين', 128, 76);
  });
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), bannerMat);
  bannerMesh.position.set(0, 0.88, -2.57);
  bannerMesh.rotation.y = Math.PI;
  zaffaGroup.add(bannerMesh);

  // حديد الحماية فوق الحوض (Roll bar)
  const barMat = chromeMat;
  for (const sx of [-0.78, 0.78]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), barMat);
    post.position.set(sx, 1.35, -0.28);
    zaffaGroup.add(post);
  }
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.62, 8), barMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, 1.76, -0.28);
  zaffaGroup.add(topBar);

  // العجلات الأربع
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-0.85, 0.38, 1.55],
    [0.85, 0.38, 1.55],
    [-0.85, 0.38, -1.45],
    [0.85, 0.38, -1.45]
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    zaffaGroup.add(wheel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.29, 12), chromeMat);
    rim.rotateZ(Math.PI / 2);
    rim.position.set(wx, wy, wz);
    zaffaGroup.add(rim);
  }

  // باقة بالونات الهيليوم المبهجة (22 بالونة ملونة تطفو وتهتز في الهواء)
  const balloonColors = [
    0xff2a6d, 0x00d2d3, 0xffe600, 0x10ac84, 0x9b5de5,
    0xff6b6b, 0xff9f43, 0x54a0ff, 0x5f27cd, 0xff5252,
    0x2ed573, 0x1e90ff, 0xffa502, 0xff4757, 0x70a1ff
  ];
  const balloonGeo = new THREE.SphereGeometry(0.22, 12, 10);
  balloonGeo.scale(1, 1.25, 1); // شكل بيضاوي واقعي للبالونة

  const anchorPoint = new THREE.Vector3(0, 1.76, -0.28);
  const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });

  for (let i = 0; i < 22; i++) {
    const colHex = balloonColors[i % balloonColors.length];
    const bMat = new THREE.MeshStandardMaterial({
      color: colHex,
      roughness: 0.22,
      metalness: 0.1,
      envMapIntensity: 0.95
    });
    const bMesh = new THREE.Mesh(balloonGeo, bMat);

    // توزيع عنقودي نصف كروي فوق الحوض
    const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.4;
    const spreadR = 0.25 + (i % 4) * 0.22;
    const heightY = 2.45 + Math.floor(i / 5) * 0.38;

    const baseX = Math.cos(angle) * spreadR;
    const baseY = heightY;
    const baseZ = -0.75 + Math.sin(angle) * spreadR * 0.85;

    bMesh.position.set(baseX, baseY, baseZ);
    bMesh.castShadow = true;
    zaffaGroup.add(bMesh);

    // خيط ربط البالونة بحديد الحوض
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(baseX, baseY - 0.25, baseZ),
      anchorPoint
    ]);
    const bLine = new THREE.Line(lineGeo, stringMat);
    zaffaGroup.add(bLine);

    VILLAGE_ROADS.balloons.push({
      mesh: bMesh,
      line: bLine,
      baseX,
      baseY,
      baseZ,
      phase: i * 0.45
    });
  }

  VILLAGE_ROADS.group.add(zaffaGroup);
  VILLAGE_ROADS.pickup = zaffaGroup;
}

// ---------------------------------------------------------------------
// 3. موتوسيكلات مركونة على الأرصفة فقط (باستخدام المجسم ثلاثي الأبعاد الحقيقي، بعيداً تماماً عن نهر الطريق)
// ---------------------------------------------------------------------
function addParkedVillageMotorcycles() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.segments) return;
  const isVill = typeof REAL_CITY !== 'undefined' && REAL_CITY.isVillageSeg ? REAL_CITY.isVillageSeg : (s => s && s.width < 9.5);

  const spots = [];
  const targetSegIdx = (VILLAGE_ROADS.targetSeg?.index != null) ? VILLAGE_ROADS.targetSeg.index : 801;
  const segIndices = [targetSegIdx, targetSegIdx + 1];
  for (let i = 0; i < ASSYUT.segments.length; i += 6) {
    if (!segIndices.includes(i)) segIndices.push(i);
  }

  for (const si of segIndices) {
    const seg = ASSYUT.segments[si];
    if (!seg || !isVill(seg) || seg.length < 18) continue;
    if (spots.length >= 24) break;

    const t = 0.25 + ((spots.length % 3) * 0.25);
    const mx = lerp(seg.a.x, seg.b.x, t);
    const mz = lerp(seg.a.z, seg.b.z, t);
    const nx = -(seg.b.z - seg.a.z) / seg.length;
    const nz = (seg.b.x - seg.a.x) / seg.length;
    const side = (spots.length % 2 === 0) ? 1 : -1;

    const sidewalkShift = side * (seg.width / 2 + 1.35);
    const px = mx + nx * sidewalkShift;
    const pz = mz + nz * sidewalkShift;

    // التأكد التام إن الموتوسيكل على الرصيف وليس في نهر أي شارع أو تقاطع
    if (typeof onDrivingRoad === 'function' && onDrivingRoad(px, pz, 1.4)) continue;
    if (typeof nearestAssyutRoad === 'function') {
      const near = nearestAssyutRoad({ x: px, z: pz });
      if (!near || near.distance < near.width / 2 + 0.95 || near.distance > near.width / 2 + 2.4) continue;
    }
    const groundY = (typeof assyutRoadHeightAt === 'function') ? assyutRoadHeightAt(px, pz) : 0.18;
    const roadHeading = Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
    spots.push({ px, pz, groundY, rotY: roadHeading + (side === 1 ? -0.22 : Math.PI + 0.22) });
  }

  function spawnRealMopeds() {
    const src = (typeof importedModels !== 'undefined' && importedModels?.loaded?.traffic_moped?.scene) || null;
    if (!src) return false;
    let placed = 0;
    for (const sp of spots) {
      const clone = src.clone(true);
      clone.position.set(sp.px, sp.groundY + 0.18, sp.pz);
      clone.rotation.set(0, sp.rotY, -0.10);
      clone.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      VILLAGE_ROADS.group.add(clone);
      placed++;
    }
    VILLAGE_ROADS.motorcycles = placed;
    return true;
  }

  // انتظار تحميل مجسم traffic-moped.glb ثلاثي الأبعاد الحقيقي بدل رسم مكعبات بدائية
  if (!spawnRealMopeds() && typeof setInterval === 'function') {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (spawnRealMopeds() || tries > 30) clearInterval(timer);
    }, 500);
  }
}

// ---------------------------------------------------------------------
// 4. دكاكين ومحلات ريفية وتندات قماش وأقفاص خضار وكراسي قهوة بلدي
// ---------------------------------------------------------------------
function addVillageMarketLife() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.segments) return;
  const isVill = typeof REAL_CITY !== 'undefined' && REAL_CITY.isVillageSeg ? REAL_CITY.isVillageSeg : (s => s && s.width < 9.5);

  const awningColors = [0x991b1b, 0x1e3a8a, 0x065f46, 0xb45309];
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5d3b, roughness: 0.92 });
  const chairColors = [0x2563eb, 0xdc2626, 0x16a34a, 0xd97706];

  let propsCount = 0;
  const targetSegIdx = (VILLAGE_ROADS.targetSeg?.index != null) ? VILLAGE_ROADS.targetSeg.index : 801;
  const marketSegIndices = [targetSegIdx, targetSegIdx + 1];
  for (let i = 0; i < ASSYUT.segments.length; i += 6) {
    if (!marketSegIndices.includes(i)) marketSegIndices.push(i);
  }

  for (const si of marketSegIndices) {
    const seg = ASSYUT.segments[si];
    if (!seg || !isVill(seg) || seg.length < 20) continue;
    if (propsCount >= 35) break;

    const t = 0.35 + ((propsCount % 2) * 0.3);
    const mx = lerp(seg.a.x, seg.b.x, t);
    const mz = lerp(seg.a.z, seg.b.z, t);
    const nx = -(seg.b.z - seg.a.z) / seg.length;
    const nz = (seg.b.x - seg.a.x) / seg.length;
    const side = (propsCount % 2 === 0) ? 1 : -1;

    const shopX = mx + nx * side * (seg.width / 2 + 2.4);
    const shopZ = mz + nz * side * (seg.width / 2 + 2.4);
    const groundY = (typeof assyutRoadHeightAt === 'function') ? assyutRoadHeightAt(shopX, shopZ) : 0.18;
    const roadHeading = Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z);

    const propGroup = new THREE.Group();
    propGroup.position.set(shopX, groundY + 0.18, shopZ);
    propGroup.rotation.y = roadHeading + (side === 1 ? -Math.PI / 2 : Math.PI / 2);

    // تندة قماش مقلمة بارزة للمحل
    const awningMat = new THREE.MeshStandardMaterial({
      color: awningColors[propsCount % awningColors.length],
      roughness: 0.78,
      side: THREE.DoubleSide
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 1.45), awningMat);
    awning.position.set(0, 2.75, 0.65);
    awning.rotation.x = 0.22;
    propGroup.add(awning);

    // أقفاص خضار وفاكهة خشبية مرصوصة أمام الدكان
    for (let c = 0; c < 3; c++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.42), woodMat);
      crate.position.set(-0.85 + c * 0.62, 0.14, 0.25);
      propGroup.add(crate);
      // قفص ثاني فوقه
      if (c % 2 === 0) {
        const topCrate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.26, 0.40), woodMat);
        topCrate.position.set(-0.85 + c * 0.62, 0.40, 0.25);
        topCrate.rotation.y = 0.08;
        propGroup.add(topCrate);
      }
    }

    // كراسي قهوة بلدي وطاولة بلاستيك مستديرة
    if (propsCount % 2 === 1) {
      const chMat = new THREE.MeshStandardMaterial({ color: chairColors[propsCount % chairColors.length], roughness: 0.85 });
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.58, 12), chMat);
      table.position.set(0.65, 0.29, 0.85);
      propGroup.add(table);
      for (const ang of [0, Math.PI * 0.7, Math.PI * 1.3]) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), chMat);
        chair.position.set(0.65 + Math.cos(ang) * 0.55, 0.21, 0.85 + Math.sin(ang) * 0.55);
        propGroup.add(chair);
      }
    }

    VILLAGE_ROADS.group.add(propGroup);
    propsCount++;
  }
  VILLAGE_ROADS.marketProps = propsCount;
}

// ---------------------------------------------------------------------
// 5. التحديث المستمر للحركة (رفرفة البالونات والأعلام في الهواء)
// ---------------------------------------------------------------------
function updateVillageRoads(dt) {
  VILLAGE_ROADS.time += dt;
  const time = VILLAGE_ROADS.time;

  // اهتزاز وتمايل بالونات الزفة في النسيم
  for (const b of VILLAGE_ROADS.balloons) {
    b.mesh.position.y = b.baseY + Math.sin(time * 2.4 + b.phase) * 0.07;
    b.mesh.position.x = b.baseX + Math.sin(time * 1.7 + b.phase * 0.8) * 0.05;
    b.mesh.rotation.z = Math.sin(time * 2.0 + b.phase) * 0.06;
  }
}

// تشغيل كافة إضافات القرى والشوارع الريفية عند التحميل
function initVillageRoads() {
  if (typeof ASSYUT === 'undefined') return;
  addVillageFestiveBunting();
  addCelebrationZaffaPickup();
  addParkedVillageMotorcycles();
  addVillageMarketLife();
}

initVillageRoads();
