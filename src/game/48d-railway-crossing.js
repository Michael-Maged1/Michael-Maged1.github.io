/* =====================================================================
   مزلقان سكة حديد أسيوط والطريق الزراعي الريفي الفوتوغرافي
   - مزلقان قطار واقعي (Railroad Level Crossing) بأذرع هيدروليكية وإشارات ضوئية وجرس
   - قطار سكك حديد مصر (جرار أزرق وأصفر مع عربات ركاب) يمر دورياً
   - حقول زراعية خضراء يانعة (برسيم ومحاصيل) ونخيل صعيدي وأبراج حمام فخارية
   - ميكروباص تويوتا هايس أبيض بنمرة أجرة أسيوط البرتقالية "ي د س ٤٩٩٢"
   ===================================================================== */

const RAILWAY_CROSSING = {
  group: new THREE.Group(),
  center: { x: 561.66, y: 0.0, z: 450.65 },
  roadDir: new THREE.Vector3(0.539, 0, 0.842).normalize(),
  railDir: new THREE.Vector3(-0.842, 0, 0.539).normalize(),
  state: 'idle', // 'idle' | 'warning' | 'lowering' | 'passing' | 'raising'
  timer: 0,
  cycleTimer: 18, // يبدأ بعد 18 ثانية من تشغيل اللعبة
  cycleInterval: 75, // يمر كل 75 ثانية تلقائياً
  gateAngle: 1.25, // 1.25 rad = مرفوع 72°، 0.0 = مغلق أفقي
  gateL: null,
  gateR: null,
  lights: [],
  lightPhase: 0,
  train: null,
  trainPos: -240, // المسافة على طول السكة (-240 إلى +240)
  trainActive: false,
  hiaceMesh: null,
  bellOsc: null,
  bellGain: null,
  lastBellTime: 0,
  collisionBox: null
};

if (typeof REAL_CITY !== 'undefined' && REAL_CITY.group) {
  REAL_CITY.group.add(RAILWAY_CROSSING.group);
} else if (typeof scene !== 'undefined') {
  scene.add(RAILWAY_CROSSING.group);
}

// ---------------------------------------------------------------------
// 1. توليد فرشة السكة الحديد وقضبان الفولاذ والفلنكات (400 متر عبر الحقول)
// ---------------------------------------------------------------------
function buildRailwayTracks() {
  const g = RAILWAY_CROSSING.group;
  const cx = RAILWAY_CROSSING.center.x, cz = RAILWAY_CROSSING.center.z;
  const rx = RAILWAY_CROSSING.railDir.x, rz = RAILWAY_CROSSING.railDir.z;
  const fx = RAILWAY_CROSSING.roadDir.x, fz = RAILWAY_CROSSING.roadDir.z;
  const railAngle = Math.atan2(rz, rx);

  // أ. فرشة البازلت الحصوية الداكنة المرتفعة (Ballast Bed)
  const ballastLen = 420;
  const ballastW = 4.4;
  const ballastTex = canvasTex(256, 256, ctx => {
    ctx.fillStyle = '#3a3632'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const c = Math.random();
      ctx.fillStyle = c < 0.4 ? '#252320' : c < 0.7 ? '#4a4540' : '#5a544c';
      ctx.fillRect(Math.random() * 254, Math.random() * 254, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
  });
  ballastTex.wrapS = ballastTex.wrapT = THREE.RepeatWrapping;
  ballastTex.repeat.set(ballastW, ballastLen / 3);

  const ballastMat = new THREE.MeshStandardMaterial({
    map: ballastTex,
    roughness: 0.94,
    metalness: 0.05
  });
  const ballastGeo = new THREE.BoxGeometry(ballastW, 0.12, ballastLen);
  const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
  ballastMesh.position.set(cx, 0.05, cz);
  ballastMesh.rotation.y = -railAngle + Math.PI / 2;
  ballastMesh.receiveShadow = true;
  g.add(ballastMesh);

  // ب. الفلنكات الخشبية والخرسانية المتباعدة بانتظام (Ties / Sleepers)
  const sleeperCount = Math.floor(ballastLen / 0.68);
  const sleeperGeo = new THREE.BoxGeometry(2.6, 0.15, 0.23);
  const sleeperMat = new THREE.MeshStandardMaterial({
    color: 0x3e352d,
    roughness: 0.92,
    metalness: 0.08
  });
  const sleeperMesh = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
  sleeperMesh.castShadow = true;
  sleeperMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tieRotY = -railAngle;
  let sIdx = 0;
  for (let dist = -ballastLen / 2 + 1; dist < ballastLen / 2 - 1 && sIdx < sleeperCount; dist += 0.68) {
    const px = cx + rx * dist;
    const pz = cz + rz * dist;
    dummy.position.set(px, 0.13, pz);
    dummy.rotation.set(0, tieRotY, 0);
    dummy.updateMatrix();
    sleeperMesh.setMatrixAt(sIdx++, dummy.matrix);
  }
  sleeperMesh.instanceMatrix.needsUpdate = true;
  g.add(sleeperMesh);

  // ج. قضبان السكة الحديد الفولاذية المزدوجة (Dual Steel Rails)
  // مقاس الاتساع القياسي المصري: 1.435 متر (±0.7175 م من المنتصف)
  const railGaugeHalf = 0.7175;
  const railGeo = new THREE.BoxGeometry(0.075, 0.14, ballastLen);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xa0a8b2,
    metalness: 0.92,
    roughness: 0.22,
    envMapIntensity: 0.9
  });

  for (const side of [-1, 1]) {
    const railMesh = new THREE.Mesh(railGeo, railMat);
    const offsetX = fx * railGaugeHalf * side;
    const offsetZ = fz * railGaugeHalf * side;
    railMesh.position.set(cx + offsetX, 0.22, cz + offsetZ);
    railMesh.rotation.y = -railAngle + Math.PI / 2;
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    g.add(railMesh);
  }

  // د. ألواح خشب ومطاط المزلقان في منطقة تقاطع الأسفلت (Crossing Flange Fillers)
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: 0.88 });
  const innerPlank = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.13, 9.4), plankMat);
  innerPlank.position.set(cx, 0.16, cz);
  innerPlank.rotation.y = Math.atan2(fz, fx) - Math.PI / 2;
  innerPlank.receiveShadow = true;
  g.add(innerPlank);
}

// ---------------------------------------------------------------------
// 2. أعمدة المزلقان وإشارات التحذير المتناوبة والحواجز المخططة
// ---------------------------------------------------------------------
function buildCrossingSignals() {
  const g = RAILWAY_CROSSING.group;
  const cx = RAILWAY_CROSSING.center.x, cz = RAILWAY_CROSSING.center.z;
  const fx = RAILWAY_CROSSING.roadDir.x, fz = RAILWAY_CROSSING.roadDir.z;
  const rx = RAILWAY_CROSSING.railDir.x, rz = RAILWAY_CROSSING.railDir.z;

  const roadHalfW = 4.2;
  const postDist = 7.8; // بعد العمود عن السكة على الطريق

  // تجهيز خامة الصليب الخشبي (Crossbuck "X" Sign: "انتبه للقطار")
  const crossbuckTex = canvasTex(256, 64, ctx => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#d62828'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 58);
    ctx.font = 'bold 24px Tahoma, "Cairo", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111827';
    ctx.fillText('انتبه للقطار', 128, 32);
  });
  const crossbuckMat = new THREE.MeshStandardMaterial({ map: crossbuckTex, roughness: 0.4 });

  // خامة ذراع الحاجز المخطط أحمر وأبيض عاكس (Barriers)
  const barrierTex = canvasTex(256, 32, ctx => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#d62828';
    for (let x = 0; x < 256; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0);
      ctx.lineTo(x + 12, 32); ctx.lineTo(x - 12, 32);
      ctx.fill();
    }
  });
  barrierTex.wrapS = THREE.RepeatWrapping;
  barrierTex.repeat.set(4, 1);
  const barrierMat = new THREE.MeshStandardMaterial({ map: barrierTex, roughness: 0.5, metalness: 0.1 });

  // خامة العامود المخطط أبيض وأسود
  const postTex = canvasTex(32, 128, ctx => {
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, 32, 128);
    ctx.fillStyle = '#1f2428';
    for (let y = 0; y < 128; y += 32) ctx.fillRect(0, y, 32, 16);
  });
  const postMat = new THREE.MeshStandardMaterial({ map: postTex, roughness: 0.6 });

  // بناء عمودين على جانبي المزلقان (قبل وبعد السكة)
  const sides = [
    { dir: 1, sideOffset: 1 },
    { dir: -1, sideOffset: -1 }
  ];

  sides.forEach((side, idx) => {
    const postGroup = new THREE.Group();
    const px = cx + fx * postDist * side.dir + rx * (roadHalfW + 0.8) * side.sideOffset;
    const pz = cz + fz * postDist * side.dir + rz * (roadHalfW + 0.8) * side.sideOffset;
    postGroup.position.set(px, 0, pz);

    // توجيه العمود ليواجه السيارات القادمة
    const faceAngle = Math.atan2(fz * -side.dir, fx * -side.dir);
    postGroup.rotation.y = faceAngle;

    // أ. قاعدة خرسانية وصندوق الموتور الحديدي
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.7), new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 }));
    baseMesh.position.y = 0.225;
    postGroup.add(baseMesh);

    const motorBox = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.52), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 }));
    motorBox.position.y = 0.75;
    postGroup.add(motorBox);

    // ب. العمود الرأسي المخطط (3.6 متر)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3.2, 12), postMat);
    mast.position.y = 2.4;
    mast.castShadow = true;
    postGroup.add(mast);

    // ج. علامة الصليب "X" (Crossbuck)
    const bladeGeo = new THREE.BoxGeometry(1.6, 0.22, 0.04);
    const blade1 = new THREE.Mesh(bladeGeo, crossbuckMat);
    blade1.position.set(0, 3.45, 0.08);
    blade1.rotation.z = Math.PI / 4;
    postGroup.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeo, crossbuckMat);
    blade2.position.set(0, 3.45, 0.08);
    blade2.rotation.z = -Math.PI / 4;
    postGroup.add(blade2);

    // د. جرس المزلقان المعدني في القمة (Bell Dome)
    const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 }));
    bellDome.position.set(0, 3.75, 0);
    postGroup.add(bellDome);

    // هـ. لوحة الإشارة البيضاوية مع فانوسي التحذير الأحمرين الوامضين
    const backplate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.44, 0.04), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }));
    backplate.position.set(0, 2.85, 0.1);
    postGroup.add(backplate);

    // فانوس يسار وفانوس يمين
    const lampGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
    lampGeo.rotateX(Math.PI / 2);
    const leftLampMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0x000000, roughness: 0.2 });
    const rightLampMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0x000000, roughness: 0.2 });

    const leftLamp = new THREE.Mesh(lampGeo, leftLampMat);
    leftLamp.position.set(-0.35, 2.85, 0.14);
    postGroup.add(leftLamp);

    const rightLamp = new THREE.Mesh(lampGeo, rightLampMat);
    rightLamp.position.set(0.35, 2.85, 0.14);
    postGroup.add(rightLamp);

    const pointLight = new THREE.PointLight(0xff1e1e, 0, 14);
    pointLight.position.set(0, 2.85, 0.35);
    postGroup.add(pointLight);

    RAILWAY_CROSSING.lights.push({ leftMat: leftLampMat, rightMat: rightLampMat, pointLight });

    // و. ذراع حاجز المزلقان القابل للرفع والنزول (Hydraulic Barrier Arm)
    const barrierArmHolder = new THREE.Group();
    barrierArmHolder.position.set(0, 0.95, 0);

    // ذراع البوابة بطول 5.2 متر لغلق الحارة المرورية بالكامل
    const armGeo = new THREE.BoxGeometry(0.06, 0.18, 5.2);
    armGeo.translate(0, 0, 2.6); // النقل بحيث يكون المحور عند القاعدة
    const armMesh = new THREE.Mesh(armGeo, barrierMat);
    armMesh.castShadow = true;
    barrierArmHolder.add(armMesh);

    // ثقل التوازن الحديدي خلف المحور (Counterweight)
    const weightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.65), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }));
    weightMesh.position.set(0, 0, -0.42);
    barrierArmHolder.add(weightMesh);

    // زاوية أولية: مرفوع 72° (1.25 راديان)
    barrierArmHolder.rotation.x = -1.25;
    postGroup.add(barrierArmHolder);

    if (idx === 0) RAILWAY_CROSSING.gateL = barrierArmHolder;
    else RAILWAY_CROSSING.gateR = barrierArmHolder;

    g.add(postGroup);
  });
}

// ---------------------------------------------------------------------
// 3. كشك خفير المزلقان الريفي المصري (Watchman Cabin)
// ---------------------------------------------------------------------
function buildWatchmanCabin() {
  const g = RAILWAY_CROSSING.group;
  const cx = RAILWAY_CROSSING.center.x, cz = RAILWAY_CROSSING.center.z;
  const fx = RAILWAY_CROSSING.roadDir.x, fz = RAILWAY_CROSSING.roadDir.z;
  const rx = RAILWAY_CROSSING.railDir.x, rz = RAILWAY_CROSSING.railDir.z;

  const cabinGroup = new THREE.Group();
  // موقع الكشك بجوار المزلقان مباشرة
  const kx = cx + fx * 11.5 + rx * 7.5;
  const kz = cz + fz * 11.5 + rz * 7.5;
  cabinGroup.position.set(kx, 0, kz);
  cabinGroup.rotation.y = Math.atan2(fz, fx) - Math.PI / 2;

  // جدران الكشك بالطوب الأحمر الصعيدي ومونة إسمنتية
  const wallMat = REAL_CITY.brickTex ? new THREE.MeshStandardMaterial({ map: REAL_CITY.brickTex, roughness: 0.88 }) : new THREE.MeshStandardMaterial({ color: 0x9e432c, roughness: 0.85 });
  const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.1, 3.2), wallMat);
  cabinBody.position.y = 1.55;
  cabinBody.castShadow = true;
  cabinBody.receiveShadow = true;
  cabinGroup.add(cabinBody);

  // سقف الكشك مع بروز تندة صاج مموج
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.6, metalness: 0.4 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 3.6), roofMat);
  roof.position.y = 3.18;
  cabinGroup.add(roof);

  // شباك مراقبة المزلقان بشيش خشب أخضر
  const winMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.1), winMat);
  windowFrame.position.set(0, 1.6, 1.62);
  cabinGroup.add(windowFrame);

  // لافتة سكك حديد مصر الرسمية: "مزلقان أسيوط رقم ٤٢"
  const signTex = canvasTex(256, 64, ctx => {
    ctx.fillStyle = '#0f3854'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#e2b342'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 58);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Tahoma, "Cairo", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('سكك حديد مصر - مزلقان ٤٢', 128, 32);
  });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 }));
  signMesh.position.set(0, 2.55, 1.62);
  cabinGroup.add(signMesh);

  // دكة خشبية خارجية تحت التندة مع إبريق شاي صعيدي
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 0.5), benchMat);
  bench.position.set(0, 0.21, 2.2);
  cabinGroup.add(bench);

  g.add(cabinGroup);
}

// ---------------------------------------------------------------------
// 4. قطار سكك حديد مصر (جرار أزرق وأصفر + عربات ركاب مكيفة)
// ---------------------------------------------------------------------
function buildEgyptianTrain() {
  const trainGroup = new THREE.Group();
  const railAngle = Math.atan2(RAILWAY_CROSSING.railDir.z, RAILWAY_CROSSING.railDir.x);

  // أ. جرار القطار الديزل الكندي/الهنشل (اللون الأزرق المميز مع مقدمة صفراء)
  const locoGroup = new THREE.Group();
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55, metalness: 0.25 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6, metalness: 0.15 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });

  // هيكل الجرار الرئيسي (طول 16 متر، ارتفاع 3.6 متر)
  const locoBody = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.2, 16.0), blueMat);
  locoBody.position.y = 2.4;
  locoBody.castShadow = true;
  locoGroup.add(locoBody);

  // مقدمة الجرار الصفراء التحذيرية
  const locoNose = new THREE.Mesh(new THREE.BoxGeometry(2.92, 3.1, 2.2), yellowMat);
  locoNose.position.set(0, 2.38, 8.1);
  locoGroup.add(locoNose);

  // كشاف أمامي رئيسي مشرق
  const headLampGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.15, 16);
  headLampGeo.rotateX(Math.PI / 2);
  const headLampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbeb, emissiveIntensity: 1.5 });
  const headLamp = new THREE.Mesh(headLampGeo, headLampMat);
  headLamp.position.set(0, 3.1, 9.2);
  locoGroup.add(headLamp);

  // شعاع ضوء الكشاف
  const trainSpot = new THREE.SpotLight(0xfff7ed, 4.0, 65, Math.PI / 6, 0.4);
  trainSpot.position.set(0, 3.1, 9.2);
  trainSpot.target.position.set(0, 0, 45);
  locoGroup.add(trainSpot);
  locoGroup.add(trainSpot.target);

  // شباك كابينة السائق الأمامي
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 }));
  cabGlass.position.set(0, 3.1, 7.95);
  locoGroup.add(cabGlass);

  // عادم الجرار السقفي
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.6, 12), darkMat);
  exhaust.position.set(0, 4.25, -2.5);
  locoGroup.add(exhaust);

  trainGroup.add(locoGroup);

  // ب. عربات ركاب القطار (3 عربات ركاب زرقاء وبيضاء)
  const coachMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
  const coachStripeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
  const coachRoofMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

  for (let c = 0; c < 3; c++) {
    const coachGroup = new THREE.Group();
    coachGroup.position.set(0, 0, -10.5 - c * 18.5);

    // جسم العربة (18 متر)
    const cBody = new THREE.Mesh(new THREE.BoxGeometry(2.85, 3.1, 17.8), coachMat);
    cBody.position.y = 2.35;
    cBody.castShadow = true;
    coachGroup.add(cBody);

    // شريط أبيض بطول العربة
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.85, 17.8), coachStripeMat);
    stripe.position.y = 2.45;
    coachGroup.add(stripe);

    // صف شبابيك الركاب المستطيلة الداكنة
    const winRow = new THREE.Mesh(new THREE.BoxGeometry(2.91, 0.55, 16.5), darkMat);
    winRow.position.y = 2.45;
    coachGroup.add(winRow);

    // سقف العربة المقوس
    const cRoof = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.35, 17.8), coachRoofMat);
    cRoof.position.y = 4.0;
    coachGroup.add(cRoof);

    trainGroup.add(coachGroup);
  }

  // ضبط دوران وحركة القطار على طول اتجاه السكة
  trainGroup.rotation.y = -railAngle + Math.PI / 2;
  trainGroup.position.set(RAILWAY_CROSSING.center.x, 0, RAILWAY_CROSSING.center.z);
  trainGroup.visible = false;

  RAILWAY_CROSSING.train = trainGroup;
  RAILWAY_CROSSING.group.add(trainGroup);
}

// ---------------------------------------------------------------------
// 5. حقول زراعية خضراء ونخيل وبيوت ريفية وأبراج حمام (Photographic Rural Land)
// ---------------------------------------------------------------------
function buildRuralAgriculturalScenery() {
  const g = RAILWAY_CROSSING.group;
  const cx = RAILWAY_CROSSING.center.x, cz = RAILWAY_CROSSING.center.z;
  const fx = RAILWAY_CROSSING.roadDir.x, fz = RAILWAY_CROSSING.roadDir.z;
  const rx = RAILWAY_CROSSING.railDir.x, rz = RAILWAY_CROSSING.railDir.z;

  // أ. حقول البرسيم والمحاصيل الخضراء الفوتوغرافية الواسعة
  const cropTex = canvasTex(256, 256, ctx => {
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0, 0, 256, 256);
    // خطوط وحرث زراعي متوازي
    for (let y = 0; y < 256; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? '#22481e' : '#386f32';
      ctx.fillRect(0, y, 256, 4);
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(75, 145, 65, 0.35)' : 'rgba(30, 65, 25, 0.35)';
      ctx.fillRect(Math.random() * 254, Math.random() * 254, 3, 3);
    }
  });
  cropTex.wrapS = cropTex.wrapT = THREE.RepeatWrapping;
  cropTex.repeat.set(12, 12);

  const cropMat = new THREE.MeshStandardMaterial({
    map: cropTex,
    color: 0x4ade80,
    roughness: 0.95,
    metalness: 0.02
  });

  // مساحات حقول خضراء على الأرباع الأربعة حول تقاطع المزلقان
  const fieldOffsets = [
    { x: 55, z: 55 },
    { x: -55, z: 55 },
    { x: 55, z: -55 },
    { x: -55, z: -55 }
  ];

  fieldOffsets.forEach(fo => {
    const fieldGeo = new THREE.PlaneGeometry(90, 90);
    const fieldMesh = new THREE.Mesh(fieldGeo, cropMat);
    fieldMesh.rotation.x = -Math.PI / 2;
    fieldMesh.position.set(cx + fo.x, 0.015, cz + fo.z);
    fieldMesh.receiveShadow = true;
    g.add(fieldMesh);
  });

  // ب. بيوت ريفية مع أبراج حمام فخارية أسطوانية (Clay Pigeon Towers)
  const ruralHouses = [
    { distF: 45, distR: 35, floors: 2 },
    { distF: -48, distR: 38, floors: 1 },
    { distF: 52, distR: -36, floors: 2 },
    { distF: -42, distR: -42, floors: 1 }
  ];

  const pigeonClayMat = new THREE.MeshStandardMaterial({ color: 0xbc6c25, roughness: 0.88 });
  const brickMat = REAL_CITY.brickTex ? new THREE.MeshStandardMaterial({ map: REAL_CITY.brickTex, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 });

  ruralHouses.forEach(rh => {
    const hGroup = new THREE.Group();
    const hx = cx + fx * rh.distF + rx * rh.distR;
    const hz = cz + fz * rh.distF + rz * rh.distR;
    hGroup.position.set(hx, 0, hz);

    const houseH = rh.floors * 3.4;
    const houseW = 12, houseD = 10;
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), brickMat);
    hBody.position.y = houseH / 2;
    hBody.castShadow = true;
    hBody.receiveShadow = true;
    hGroup.add(hBody);

    // أبراج الحمام الفخارية الأسطوانية الصعيدية فوق السطح (Pigeon Towers)
    const towerRadius = 1.1;
    const towerHeight = 3.6;
    const pTower1 = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius * 0.75, towerRadius, towerHeight, 14), pigeonClayMat);
    pTower1.position.set(houseW * 0.28, houseH + towerHeight / 2, houseD * 0.26);
    pTower1.castShadow = true;
    hGroup.add(pTower1);

    const pTower2 = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius * 0.75, towerRadius, towerHeight, 14), pigeonClayMat);
    pTower2.position.set(-houseW * 0.28, houseH + towerHeight / 2, houseD * 0.26);
    pTower2.castShadow = true;
    hGroup.add(pTower2);

    // قباب طينية صغيرة فوق أبراج الحمام
    const domeGeo = new THREE.SphereGeometry(towerRadius * 0.76, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome1 = new THREE.Mesh(domeGeo, pigeonClayMat);
    dome1.position.set(houseW * 0.28, houseH + towerHeight, houseD * 0.26);
    hGroup.add(dome1);

    const dome2 = new THREE.Mesh(domeGeo, pigeonClayMat);
    dome2.position.set(-houseW * 0.28, houseH + towerHeight, houseD * 0.26);
    hGroup.add(dome2);

    g.add(hGroup);
  });

  // ج. أعمدة كهرباء خشبية ريفية بأسلاك ممتدة بمحاذاة السكة
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x111827 });

  const poleCount = 6;
  const poleSpacing = 42;
  const wirePoints = [];

  for (let i = -3; i <= 3; i++) {
    const px = cx + rx * (i * poleSpacing) + fx * 14.5;
    const pz = cz + rz * (i * poleSpacing) + fz * 14.5;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 8), poleMat);
    pole.position.set(px, 3.6, pz);
    pole.castShadow = true;
    g.add(pole);

    // عارضة خشبية في الأعلى مع عوازل
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), poleMat);
    crossArm.position.set(px, 6.8, pz);
    crossArm.rotation.y = Math.atan2(rz, rx);
    g.add(crossArm);

    wirePoints.push(new THREE.Vector3(px, 6.85, pz));
  }

  // سلك كهرباء ممتد بين الأعمدة
  if (wirePoints.length > 1) {
    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
    const wireLine = new THREE.Line(wireGeo, wireMat);
    g.add(wireLine);
  }

  // د. شريط الطريق الزراعي الفوتوغرافي مع طبان ترابي وخط أبيض متقطع (مطابق للصورة)
  const roadLen = 120;
  const roadW = 7.6;
  const shoulderW = 2.4;
  const roadAngle = Math.atan2(fz, fx);

  // الطبان الترابي الرملي على الجانبين
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8d775f, roughness: 0.96 });
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(shoulderW, roadLen), dirtMat);
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.rotation.z = -roadAngle + Math.PI / 2;
    const offX = rx * (roadW / 2 + shoulderW / 2) * s;
    const offZ = rz * (roadW / 2 + shoulderW / 2) * s;
    shoulder.position.set(cx + offX, 0.018, cz + offZ);
    shoulder.receiveShadow = true;
    g.add(shoulder);
  }

  // الأسفلت الزراعي الداكن مع خط أبيض متقطع في المنتصف
  const asphStripTex = canvasTex(128, 512, ctx => {
    ctx.fillStyle = '#3c3834'; ctx.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#2c2925' : '#4d4842';
      ctx.fillRect(Math.random() * 126, Math.random() * 510, 2, 2);
    }
    ctx.fillStyle = 'rgba(235, 235, 235, 0.88)';
    for (let y = 16; y < 512; y += 64) {
      ctx.fillRect(61, y, 6, 36);
    }
  });
  asphStripTex.wrapS = asphStripTex.wrapT = THREE.RepeatWrapping;
  asphStripTex.repeat.set(1, 4);

  const asphStripMat = new THREE.MeshStandardMaterial({ map: asphStripTex, roughness: 0.92 });
  const asphMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadLen), asphStripMat);
  asphMesh.rotation.x = -Math.PI / 2;
  asphMesh.rotation.z = -roadAngle + Math.PI / 2;
  asphMesh.position.set(cx, 0.022, cz);
  asphMesh.receiveShadow = true;
  g.add(asphMesh);

  // خط الوقوف الأبيض العريض أمام المزلقان
  const stopLineMat = new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(roadW * 0.95, 0.65), stopLineMat);
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.rotation.z = -roadAngle + Math.PI / 2;
    stopLine.position.set(cx + fx * 8.6 * s, 0.026, cz + fz * 8.6 * s);
    g.add(stopLine);
  }

  // هـ. زراعة نخيل بلح صعيدي واقعي على طول الطريق وفي الغيطان
  const palmSpots = [
    { df: -18, dr: -9.5, sc: 1.15 },
    { df: -38, dr: -12.0, sc: 1.05 },
    { df: -58, dr: -10.5, sc: 1.25 },
    { df: -28, dr: 14.5, sc: 1.1 },
    { df: -48, dr: 16.0, sc: 1.2 },
    { df: 22, dr: -11.0, sc: 1.1 },
    { df: 42, dr: -13.5, sc: 1.3 },
    { df: 62, dr: -10.0, sc: 1.15 },
    { df: 26, dr: 12.5, sc: 1.2 },
    { df: 46, dr: 15.0, sc: 1.05 },
    { df: 68, dr: 14.0, sc: 1.25 },
    { df: 15, dr: -25.0, sc: 1.35 },
    { df: -20, dr: 30.0, sc: 1.2 }
  ];

  const palmTrunkMat = (typeof REAL_CITY !== 'undefined' && REAL_CITY.palmBarkTex)
    ? new THREE.MeshStandardMaterial({ map: REAL_CITY.palmBarkTex, roughness: 0.92 })
    : new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.95 });

  const palmLeafMat = (typeof REAL_CITY !== 'undefined' && REAL_CITY.palmFrondTex)
    ? new THREE.MeshStandardMaterial({ map: REAL_CITY.palmFrondTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.75 })
    : new THREE.MeshStandardMaterial({ color: 0x3d7830, side: THREE.DoubleSide, roughness: 0.8 });

  palmSpots.forEach(ps => {
    const px = cx + fx * ps.df + rx * ps.dr;
    const pz = cz + fz * ps.df + rz * ps.dr;
    const sc = ps.sc;
    const pGroup = new THREE.Group();
    pGroup.position.set(px, 0, pz);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * sc, 0.26 * sc, 6.2 * sc, 8), palmTrunkMat);
    trunk.position.y = 3.1 * sc;
    trunk.castShadow = true;
    pGroup.add(trunk);

    const crownGeo = new THREE.SphereGeometry(2.4 * sc, 8, 6);
    crownGeo.scale(1, 0.45, 1);
    const crown = new THREE.Mesh(crownGeo, palmLeafMat);
    crown.position.y = 6.2 * sc;
    crown.castShadow = true;
    pGroup.add(crown);

    g.add(pGroup);
  });
}

// ---------------------------------------------------------------------
// 6. ميكروباص تويوتا هايس أبيض بنمرة أجرة أسيوط البرتقالية "ي د س ٤٩٩٢"
// ---------------------------------------------------------------------
function spawnWaitingWhiteHiace() {
  const g = RAILWAY_CROSSING.group;
  const cx = RAILWAY_CROSSING.center.x, cz = RAILWAY_CROSSING.center.z;
  const fx = RAILWAY_CROSSING.roadDir.x, fz = RAILWAY_CROSSING.roadDir.z;

  // موقع التوقف: أمام حاجز المزلقان بمسافة 3 أمتار منتظراً عبور القطار (تطابق تام مع زاوية الكاميرا في الصورة!)
  const stopDist = 11.2;
  const hx = cx - fx * stopDist;
  const hz = cz - fz * stopDist;

  // إنشاء سيارة الميكروباص تويوتا هايس البيضاء
  const hiaceHolder = new THREE.Group();
  hiaceHolder.position.set(hx, 0, hz);
  hiaceHolder.rotation.y = Math.atan2(fz, fx) - Math.PI / 2; // متجهة نحو المزلقان

  // تحميل أو توليد مجسم الميكروباص الأبيض الواقعي
  const whitePaint = new THREE.MeshStandardMaterial({
    color: 0xf8f9fa,
    roughness: 0.28,
    metalness: 0.15
  });
  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.1,
    metalness: 0.85
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.12
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9
  });

  // جسم الميكروباص التويوتا هايس الأسطواني الأنيق
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.85, 4.95), whitePaint);
  bodyMesh.position.y = 1.25;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  hiaceHolder.add(bodyMesh);

  // السقف المرتفع الانسيابي (High Roof)
  const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.42, 4.6), whitePaint);
  roofMesh.position.y = 2.25;
  hiaceHolder.add(roofMesh);

  // الزجاج الخلفي للميكروباص (Back Window)
  const rearWin = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 0.78), darkGlassMat);
  rearWin.position.set(0, 1.48, -2.49);
  rearWin.rotation.y = Math.PI;
  hiaceHolder.add(rearWin);

  // النوافذ الجانبية الكبيرة
  for (const s of [-1, 1]) {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.65), darkGlassMat);
    sideWin.position.set(1.03 * s, 1.48, 0.2);
    sideWin.rotation.y = (Math.PI / 2) * s;
    hiaceHolder.add(sideWin);
  }

  // الزجاج الأمامي
  const frontWin = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.82), darkGlassMat);
  frontWin.position.set(0, 1.48, 2.49);
  hiaceHolder.add(frontWin);

  // دعامة الإكصدام الخلفية النيكل (Chrome Rear Bumper Guard) الظاهرة بالصورة
  const bumperGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 12), chromeMat);
  bumperGuard.rotateZ(Math.PI / 2);
  bumperGuard.position.set(0, 0.38, -2.58);
  hiaceHolder.add(bumperGuard);

  // الفوانيس الخلفية الرأسية المميزة لتويوتا هايس (أحمر وبرتقالي وأبيض)
  const tailLightGeo = new THREE.BoxGeometry(0.16, 0.65, 0.05);
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xd90429,
    emissive: 0x990000,
    emissiveIntensity: 0.6,
    roughness: 0.2
  });
  for (const ts of [-1, 1]) {
    const tl = new THREE.Mesh(tailLightGeo, tailLightMat);
    tl.position.set(0.92 * ts, 1.25, -2.50);
    hiaceHolder.add(tl);
  }

  // لمبة الفرامل العلوية في منتصف السقف الخلفي (High-mounted third brake light)
  const thirdBrake = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.06, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xef233c, emissive: 0xd90429, emissiveIntensity: 0.8 })
  );
  thirdBrake.position.set(0, 2.05, -2.49);
  hiaceHolder.add(thirdBrake);

  // مساحة الزجاج الخلفي (Rear Window Wiper)
  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
  const wiperArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.38, 0.02), wiperMat);
  wiperArm.position.set(-0.25, 1.35, -2.51);
  wiperArm.rotation.z = -0.55;
  hiaceHolder.add(wiperArm);

  // شعار تويوتا المعدني النيكل (Toyota Oval Logo)
  const logoTex = canvasTex(64, 64, ctx => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(32, 32, 28, 20, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(32, 24, 16, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(32, 32, 8, 20, 0, 0, Math.PI * 2); ctx.stroke();
  });
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, metalness: 0.9, roughness: 0.2 }));
  logoMesh.position.set(0, 1.05, -2.51);
  logoMesh.rotation.y = Math.PI;
  hiaceHolder.add(logoMesh);

  // العجلات الأربع
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelOffsets = [
    [-0.95, 0.34, 1.45],
    [0.95, 0.34, 1.45],
    [-0.95, 0.34, -1.45],
    [0.95, 0.34, -1.45]
  ];
  wheelOffsets.forEach(wo => {
    const wMesh = new THREE.Mesh(wheelGeo, tireMat);
    wMesh.position.set(wo[0], wo[1], wo[2]);
    wMesh.castShadow = true;
    hiaceHolder.add(wMesh);
  });

  // لوحة الأرقام المصرية الرسمية (أجرة أسيوط البرتقالية "ي د س ٤٩٩٢")
  if (typeof createEgyptianLicensePlateTexture === 'function' && typeof createLicensePlateMesh === 'function') {
    const hiacePlateTex = createEgyptianLicensePlateTexture({
      letters: [{ ar: 'ي', en: 'Y' }, { ar: 'د', en: 'D' }, { ar: 'س', en: 'S' }],
      digits: [4, 9, 9, 2],
      isCommercial: true
    });
    const plateMat = new THREE.MeshStandardMaterial({ map: hiacePlateTex, roughness: 0.35, metalness: 0.1 });
    const rearPlate = createLicensePlateMesh(plateMat, 0.52, 0.26);
    rearPlate.position.set(0, 0.72, -2.52);
    rearPlate.rotation.y = Math.PI;
    hiaceHolder.add(rearPlate);

    const frontPlate = createLicensePlateMesh(plateMat, 0.52, 0.26);
    frontPlate.position.set(0, 0.55, 2.52);
    hiaceHolder.add(frontPlate);
  }

  // شعار TOYOTA و HIACE على الباب الخلفي
  const emblemTex = canvasTex(128, 32, ctx => {
    ctx.clearRect(0, 0, 128, 32);
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('HIACE', 64, 16);
  });
  const emblemMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.12), new THREE.MeshStandardMaterial({ map: emblemTex, transparent: true }));
  emblemMesh.position.set(-0.48, 1.05, -2.51);
  emblemMesh.rotation.y = Math.PI;
  hiaceHolder.add(emblemMesh);

  RAILWAY_CROSSING.hiaceMesh = hiaceHolder;
  g.add(hiaceHolder);
}

// ---------------------------------------------------------------------
// 7. محاكاة الصوت الفيزيائي لجرس المزلقان وسرينة القطار (Web Audio API)
// ---------------------------------------------------------------------
function playCrossingBellSound(playerDist = 999) {
  const audioCtx = (typeof getAC === 'function' ? getAC() : (typeof AC !== 'undefined' ? AC : null));
  if (!audioCtx || typeof G === 'undefined' || !G.sound || G.state !== 'play') return;
  if (playerDist > 110) return;
  const att = Math.max(0, 1 - playerDist / 110);

  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1840, now);

    gain.gain.setValueAtTime(0.055 * att, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.34);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect((typeof master !== 'undefined' && master) ? master : audioCtx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.36);
    osc2.stop(now + 0.36);
  } catch (_) {}
}

function playTrainHornSound(playerDist = 999) {
  const audioCtx = (typeof getAC === 'function' ? getAC() : (typeof AC !== 'undefined' ? AC : null));
  if (!audioCtx || typeof G === 'undefined' || !G.sound || G.state !== 'play') return;
  if (playerDist > 150) return;
  const att = Math.max(0, 1 - playerDist / 150);

  try {
    const now = audioCtx.currentTime;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(750, now);
    lp.connect((typeof master !== 'undefined' && master) ? master : audioCtx.destination);

    const freqs = [220, 277, 330];
    freqs.forEach(f => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.042 * att, now + 0.18);
      gain.gain.setValueAtTime(0.042 * att, now + 1.1);
      gain.gain.linearRampToValueAtTime(0.0005, now + 1.65);

      osc.connect(gain);
      gain.connect(lp);
      osc.start(now);
      osc.stop(now + 1.7);
    });
  } catch (_) {}
}

// ---------------------------------------------------------------------
// 8. دورة المحاكاة المستمرة للمزلقان وحركة القطار وإشارات المرور
// ---------------------------------------------------------------------
function updateRailwayCrossing(dt) {
  if (typeof G !== 'undefined' && G.state !== 'play') return;
  RAILWAY_CROSSING.cycleTimer += dt;
  const rc = RAILWAY_CROSSING;

  let playerDist = 999;
  if (typeof car !== 'undefined' && car.x != null) {
    playerDist = Math.hypot(car.x - rc.center.x, car.z - rc.center.z);
  }

  if (rc.state === 'idle' && (rc.cycleTimer >= rc.cycleInterval || (playerDist < 75 && rc.cycleTimer > 20))) {
    rc.state = 'warning';
    rc.timer = 0;
    rc.cycleTimer = 0;
  }

  if (rc.state === 'warning') {
    rc.timer += dt;
    rc.lightPhase += dt * 2.5;
    if (rc.timer - rc.lastBellTime >= 0.48) {
      rc.lastBellTime = rc.timer;
      playCrossingBellSound(playerDist);
    }
    updateCrossingLights(rc.lightPhase);

    if (rc.timer >= 3.0) {
      rc.state = 'lowering';
      rc.timer = 0;
      playTrainHornSound(playerDist);
    }
  } else if (rc.state === 'lowering') {
    rc.timer += dt;
    rc.lightPhase += dt * 2.5;
    if (rc.timer - rc.lastBellTime >= 0.48) {
      rc.lastBellTime = rc.timer;
      playCrossingBellSound(playerDist);
    }
    updateCrossingLights(rc.lightPhase);

    const progress = Math.min(1.0, rc.timer / 3.2);
    rc.gateAngle = (1.0 - progress) * 1.25;
    if (rc.gateL) rc.gateL.rotation.x = -rc.gateAngle;
    if (rc.gateR) rc.gateR.rotation.x = -rc.gateAngle;

    if (progress >= 1.0) {
      rc.state = 'passing';
      rc.timer = 0;
      rc.trainActive = true;
      rc.trainPos = -220;
      if (rc.train) rc.train.visible = true;
    }
  } else if (rc.state === 'passing') {
    rc.timer += dt;
    rc.lightPhase += dt * 2.5;
    if (rc.timer - rc.lastBellTime >= 0.48) {
      rc.lastBellTime = rc.timer;
      playCrossingBellSound(playerDist);
    }
    updateCrossingLights(rc.lightPhase);

    rc.trainPos += dt * 17.5;
    if (rc.train) {
      const rx = rc.railDir.x, rz = rc.railDir.z;
      rc.train.position.set(rc.center.x + rx * rc.trainPos, 0, rc.center.z + rz * rc.trainPos);
    }

    if (rc.timer > 3.0 && rc.timer < 3.2 && !rc.hornSounded) {
      rc.hornSounded = true;
      playTrainHornSound(playerDist);
    }

    // انتهاء مرور القطار وتجاوز المزلقان بالكامل
    if (rc.trainPos > 220) {
      rc.state = 'raising';
      rc.timer = 0;
      rc.trainActive = false;
      rc.hornSounded = false;
      if (rc.train) rc.train.visible = false;
    }
  } else if (rc.state === 'raising') {
    rc.timer += dt;
    // رفع الأذرع تدريجياً خلال 3 ثوانٍ
    const progress = Math.min(1.0, rc.timer / 3.0);
    rc.gateAngle = progress * 1.25;
    if (rc.gateL) rc.gateL.rotation.x = -rc.gateAngle;
    if (rc.gateR) rc.gateR.rotation.x = -rc.gateAngle;

    // استمرار وميض خفيف أثناء الارتفاع
    updateCrossingLights(rc.timer * 2.0);

    if (progress >= 1.0) {
      rc.state = 'idle';
      rc.timer = 0;
      turnOffCrossingLights();
    }
  }

  // حاجز اصطدام مؤقت أثناء نزول الأذرع لمنع اقتحام المزلقان
  if (rc.state === 'lowering' || rc.state === 'passing') {
    if (typeof car !== 'undefined' && car.x != null && playerDist < 9.5) {
      // توجيه وتثبيت سرعة سيارة اللاعب خارج السكة
      const toCrossing = Math.hypot(car.x - rc.center.x, car.z - rc.center.z);
      if (toCrossing < 7.2) {
        car.speed = Math.min(car.speed, 0);
        if (car.vel) car.vel.multiplyScalar(0.2);
      }
    }
  }
}

// وميض الإشارات الحمراء المتناوبة
function updateCrossingLights(phase) {
  const leftOn = Math.sin(phase) > 0;
  RAILWAY_CROSSING.lights.forEach(l => {
    l.leftMat.emissive.setHex(leftOn ? 0xff1e1e : 0x000000);
    l.leftMat.emissiveIntensity = leftOn ? 1.8 : 0;
    l.rightMat.emissive.setHex(!leftOn ? 0xff1e1e : 0x000000);
    l.rightMat.emissiveIntensity = !leftOn ? 1.8 : 0;
    l.pointLight.intensity = 2.4;
  });
}

function turnOffCrossingLights() {
  RAILWAY_CROSSING.lights.forEach(l => {
    l.leftMat.emissive.setHex(0x000000);
    l.rightMat.emissive.setHex(0x000000);
    l.pointLight.intensity = 0;
  });
}

// ---------------------------------------------------------------------
// 9. تهيئة المزلقان وإضافته إلى معالم خريطة أسيوط
// ---------------------------------------------------------------------
function initRailwayCrossing() {
  buildRailwayTracks();
  buildCrossingSignals();
  buildWatchmanCabin();
  buildEgyptianTrain();
  buildRuralAgriculturalScenery();
  spawnWaitingWhiteHiace();

  // إضافة معلم "مزلقان سكة حديد أسيوط" لأماكن الخريطة الرسمية
  if (typeof ASSYUT !== 'undefined' && Array.isArray(ASSYUT.places)) {
    const crossingPlace = {
      name: 'مزلقان سكة حديد أسيوط',
      x: RAILWAY_CROSSING.center.x,
      z: RAILWAY_CROSSING.center.z,
      roadIndex: 198,
      type: 'crossing'
    };
    if (!ASSYUT.places.some(p => p.name === crossingPlace.name)) {
      ASSYUT.places.push(crossingPlace);
      if (typeof PLACES !== 'undefined' && Array.isArray(PLACES)) {
        PLACES.push(crossingPlace);
      }
    }
  }
}

// دالة انتقال فوري مباشرة لتجربة ومعاينة المزلقان والميكروباص الأبيض
function teleportToRailwayCrossing(driveHiace) {
  if (typeof car === 'undefined' || typeof camera === 'undefined') return;
  const rc = RAILWAY_CROSSING;
  const fx = rc.roadDir.x, fz = rc.roadDir.z;

  if (driveHiace && typeof switchCar === 'function') {
    try { switchCar('hiace'); } catch (_) {}
    if (rc.hiaceMesh) rc.hiaceMesh.visible = false;
    car.x = rc.center.x - fx * 11.2;
    car.z = rc.center.z - fz * 11.2;
  } else {
    if (rc.hiaceMesh) rc.hiaceMesh.visible = true;
    car.x = rc.center.x - fx * 17.5;
    car.z = rc.center.z - fz * 17.5;
  }
  car.heading = Math.atan2(fx, fz) + Math.PI / 2;
  car.speed = 0;
  car.steer = 0;
  if (car.vel) car.vel.set(0, 0);

  // إغلاق الحواجز فوراً وتشغيل الإشارات والقطار للاستمتاع بالمشهد
  rc.state = 'lowering';
  rc.timer = 0;
  rc.cycleTimer = 0;
  rc.gateAngle = 0;
  if (rc.gateL) rc.gateL.rotation.x = 0;
  if (rc.gateR) rc.gateR.rotation.x = 0;
  updateCrossingLights(Math.PI / 2);

  if (typeof camReady !== 'undefined') camReady = false;
  if (typeof updateCamera === 'function') {
    try { updateCamera(0.016); } catch (_) {}
  }

  if (typeof setObjective === 'function') {
    setObjective('🚂 مزلقان سكة حديد أسيوط · الميكروباص الأبيض "ي د س ٤٩٩٢"', 4500);
  }
}

// الربط مع نافذة التطبيق العامة
if (typeof window !== 'undefined') {
  window.RAILWAY_CROSSING = RAILWAY_CROSSING;
  window.updateRailwayCrossing = updateRailwayCrossing;
  window.teleportToRailwayCrossing = teleportToRailwayCrossing;
}

// تشغيل البناء
initRailwayCrossing();
