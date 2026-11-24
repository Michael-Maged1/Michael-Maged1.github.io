
/* ========================= 50-taxi.js ========================= */
/* ------------------------- التاكسي ------------------------- */
/* ------------------------- شكل التاكسي ------------------------- */
function extrudeSide(pts, width, bevel) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const depth = Math.max(.02, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
    curveSegments: 4, steps: 1,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function sideQuadGeo(p1, p2, p3, p4) {
  const s = new THREE.Shape();
  s.moveTo(p1[0], p1[1]);
  s.lineTo(p2[0], p2[1]);
  s.lineTo(p3[0], p3[1]);
  s.lineTo(p4[0], p4[1]);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

/* ------------------------- لوحات السيارات المصرية (محافظة أسيوط) ------------------------- */
const EGYPT_PLATE_LETTERS = [
  { ar: 'أ', en: 'A' }, { ar: 'ب', en: 'B' }, { ar: 'ج', en: 'G' },
  { ar: 'د', en: 'D' }, { ar: 'ر', en: 'R' }, { ar: 'س', en: 'S' },
  { ar: 'ص', en: 'C' }, { ar: 'ط', en: 'T' }, { ar: 'ع', en: 'E' },
  { ar: 'ف', en: 'F' }, { ar: 'ق', en: 'K' }, { ar: 'ل', en: 'L' },
  { ar: 'م', en: 'M' }, { ar: 'ن', en: 'N' }, { ar: 'هـ', en: 'H' },
  { ar: 'و', en: 'W' }
];
// AR_DIGITS معرّف مسبقاً في 00-config.js لاستخدامه عبر جميع أجزاء اللعبة

function randomEgyptianPlateData() {
  // أول حرف على اليمين يكون دائماً "ي" (رمز محافظة أسيوط) وباقي الحروف والأرقام عشوائية
  const rightLetter = { ar: 'ي', en: 'Y' };
  const midLetter = EGYPT_PLATE_LETTERS[Math.floor(Math.random() * EGYPT_PLATE_LETTERS.length)];
  const leftLetter = EGYPT_PLATE_LETTERS[Math.floor(Math.random() * EGYPT_PLATE_LETTERS.length)];
  const letters = [rightLetter, midLetter, leftLetter];

  const d1 = 1 + Math.floor(Math.random() * 9);
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);
  const digits = [d1, d2, d3];

  return { letters, digits };
}

function createEgyptianLicensePlateTexture(plateInfo) {
  const info = plateInfo || randomEgyptianPlateData();
  return canvasTex(512, 256, g => {
    const w = 512, h = 256, r = 24;

    // حواف خارجية داكنة مع زوايا دائرية
    g.fillStyle = '#0f172a';
    if (typeof g.roundRect === 'function') {
      g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
    } else {
      g.fillRect(0, 0, w, h);
    }

    g.save();
    if (typeof g.roundRect === 'function') {
      g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, r - 3); g.clip();
    }

    // خلفية بيضاء عاكسة للجزء السفلي
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, w, h);

    // شريط علوي (النمط المصري الرسمي: سماوي للملاكي، برتقالي للأجرة والميكروباص)
    const barH = 82;
    const isCommercial = info.isCommercial || info.type === 'commercial' || info.type === 'micro';
    const topCol0 = isCommercial ? '#f38218' : '#0288d1';
    const topCol1 = isCommercial ? '#d35400' : '#0277bd';
    const topCol2 = isCommercial ? '#b44400' : '#01579b';
    const blueGrad = g.createLinearGradient(0, 6, 0, barH);
    blueGrad.addColorStop(0, topCol0);
    blueGrad.addColorStop(0.5, topCol1);
    blueGrad.addColorStop(1, topCol2);
    g.fillStyle = blueGrad;
    g.fillRect(6, 6, w - 12, barH);

    // خط فاصل أسود أفقي أسفل الشريط السماوي
    g.fillStyle = '#0f172a';
    g.fillRect(6, barH + 4, w - 12, 3);

    // مسامير التثبيت الفضية في الزاويتين العلوية يميناً ويساراً
    for (const bx of [38, w - 38]) {
      const by = 42;
      g.beginPath(); g.arc(bx, by, 15, 0, Math.PI * 2);
      g.fillStyle = '#94a3b8'; g.fill();
      g.strokeStyle = '#334155'; g.lineWidth = 2; g.stroke();

      g.beginPath(); g.arc(bx - 2, by - 2, 11, 0, Math.PI * 2);
      g.fillStyle = '#f1f5f9'; g.fill();
    }

    // كلمة EGYPT على اليسار
    const headY = 46;
    g.font = '900 38px Arial, sans-serif';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255, 255, 255, 0.4)';
    g.fillText('EGYPT', 76, headY + 1.5);
    g.fillStyle = '#0b1320';
    g.fillText('EGYPT', 74, headY);

    // كلمة مـصـر على اليمين
    g.font = 'bold 44px Tahoma, "Cairo", "Segoe UI", sans-serif';
    g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255, 255, 255, 0.4)';
    g.fillText('مـصـر', w - 74, headY + 1.5);
    g.fillStyle = '#0b1320';
    g.fillText('مـصـر', w - 76, headY);

    // خط فاصل رأسي رمادي بين الأرقام والحروف في المنتصف
    const midX = w / 2;
    g.fillStyle = '#94a3b8';
    g.fillRect(midX - 4, barH + 7, 8, h - barH - 14);
    g.strokeStyle = '#64748b'; g.lineWidth = 1;
    g.strokeRect(midX - 4, barH + 7, 8, h - barH - 14);

    // الجزء الأيمن: الحروف (أول حرف على اليمين يرمز لأسيوط "ي")
    const rightW = (w - 12) - (midX + 4);
    const letterX = [
      midX + rightW * 0.82, // أقصى اليمين: "ي"
      midX + rightW * 0.50, // المنتصف
      midX + rightW * 0.18  // اليسار
    ];
    const arY = barH + (h - barH) * 0.38;
    const enY = barH + (h - barH) * 0.77;

    for (let i = 0; i < 3; i++) {
      const lx = letterX[i];
      const item = info.letters[i];

      // الحرف العربي (كبير وبارز في الأعلى)
      g.font = '900 66px Tahoma, "Cairo", "Segoe UI", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.fillText(item.ar, lx - 1.5, arY - 1.5);
      g.fillStyle = '#09101d';
      g.fillText(item.ar, lx, arY);

      // الحرف الإنجليزي المطابق (في الأسفل)
      g.font = '900 36px Arial, sans-serif';
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.fillText(item.en, lx - 1, enY - 1);
      g.fillStyle = '#09101d';
      g.fillText(item.en, lx, enY);
    }

    // الجزء الأيسر: الأرقام (أرقام عربية شرقية فوق وأرقام إنجليزية تحتها)
    const leftW = (midX - 4) - 12;
    const numCount = info.digits.length;
    for (let j = 0; j < numCount; j++) {
      const dx = 12 + leftW * ((j + 0.5) / numCount);
      const val = info.digits[j];
      const arChar = AR_DIGITS[val] || String(val);

      // الرقم العربي (في الأعلى)
      g.font = '900 68px Tahoma, "Cairo", "Segoe UI", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.fillText(arChar, dx - 1.5, arY - 1.5);
      g.fillStyle = '#09101d';
      g.fillText(arChar, dx, arY);

      // الرقم الإنجليزي (في الأسفل)
      g.font = '900 36px Arial, sans-serif';
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.fillText(String(val), dx - 1, enY - 1);
      g.fillStyle = '#09101d';
      g.fillText(String(val), dx, enY);
    }

    g.restore();

    // إطار خارجي معدني بارز
    g.strokeStyle = '#0f172a'; g.lineWidth = 5;
    if (typeof g.roundRect === 'function') {
      g.beginPath(); g.roundRect(5, 5, w - 10, h - 10, r - 2); g.stroke();
    } else {
      g.strokeRect(5, 5, w - 10, h - 10);
    }
  });
}

function createLicensePlateMesh(plateTex, w = .48, h = .24) {
  const g = new THREE.Group();
  const frameGeo = new THREE.BoxGeometry(w + 0.016, h + 0.016, 0.012);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.85, metalness: 0.2 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.castShadow = true;
  g.add(frame);

  const faceGeo = new THREE.PlaneGeometry(w, h);
  const faceMat = (plateTex instanceof THREE.Material) ? plateTex : new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.1 });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.007;
  g.add(face);
  return g;
}

function makeTaxi(carDef, paintHex) {
  if(carDef?.uploaded)return makeUploadedCarRig(carDef,paintHex);
  const c = carDef || (typeof CARS !== 'undefined' ? CARS[0] : { body: 'sedan', color1: 0xeba812, color2: 0x101218 });
  const kind = c.body || 'sedan';
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const defaultCol = kind === 'sedan' ? 0xeba812 : c.color1;
  const primaryCol = (paintHex !== null && paintHex !== undefined) ? paintHex : defaultCol;
  const yellow = new THREE.MeshPhysicalMaterial({ color: primaryCol, roughness: .26, metalness: .42, clearcoat: 1, clearcoatRoughness: .17, envMapIntensity: .8 });
  const black = new THREE.MeshStandardMaterial({ color: c.color2, roughness: .42, metalness: .3 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x597580, roughness: .06, metalness: .2, envMapIntensity: 1.2,
    transparent: true, opacity: .68, depthWrite: false, side: THREE.DoubleSide,
  });
  const cabinTint = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: .85 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9e0e8, roughness: .14, metalness: .95 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: .95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: kind === 'sport' ? 0xe0b440 : 0xcbd2da, roughness: .22, metalness: .9 });
  const red = new THREE.MeshStandardMaterial({ color: 0xdf1c1c, emissive: 0x9a0e0e, emissiveIntensity: 1.0, roughness: .35 });
  const revWhite = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, emissive: 0x606670, emissiveIntensity: .4, roughness: .3 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xff9f1a, emissive: 0x994a00, emissiveIntensity: .8, roughness: .35 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfff8e2, emissive: 0xffeec2, emissiveIntensity: 1.15, roughness: .25 });

  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    body.add(mesh);
    return mesh;
  };

  let wheelPos = [[1.32, .84], [1.32, -.84], [-1.32, .84], [-1.32, -.84]];
  let wheelR = .34;
  let headlightX = 2.13, headlightY = .70, taillightX = -2.14, taillightY = .71;
  let signY = 1.56, signX = -.18, plateX = -2.155, plateY = .70;
  let driverX = -.06, driverZ = -.35;

  if (kind === 'micro') {
    const microBody = [
      [-2.35, .52], [-2.42, .72], [-2.40, 1.72], [-2.02, 1.94],
      [1.92, 1.94], [2.32, 1.64], [2.42, .72], [2.35, .52],
    ];
    add(new THREE.Mesh(extrudeSide(microBody, 1.92, .06), yellow), 0, 0, 0);
    const microCh = [
      [-2.25, .24], [-2.32, .42], [-2.30, .55], [2.30, .55], [2.32, .42], [2.25, .24],
    ];
    add(new THREE.Mesh(extrudeSide(microCh, 1.66, .04), black), 0, 0, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(3.85, .56, 1.95), glass), -.05, 1.44, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(4.45, .18, 1.95), black), 0, .94, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(2.6, .08, 1.48), chrome), -.2, 1.98, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.22, .22, 1.94), black), 2.38, .42, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.22, .22, 1.94), black), -2.38, .42, 0);
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .18), black), 1.95, 1.24, s * .98);
      add(new THREE.Mesh(new THREE.BoxGeometry(.10, .24, .06), black), 2.00, 1.24, s * 1.07);
    }
    wheelPos = [[1.56, .88], [1.56, -.88], [-1.56, .88], [-1.56, -.88]];
    wheelR = .36;
    headlightX = 2.40; headlightY = .82;
    taillightX = -2.40; taillightY = .85;
    signY = 2.10; signX = .95; plateX = -2.44; plateY = .56;
    driverX = 1.45; driverZ = -.42;
  } else if (kind === 'sport') {
    const sportPts = [
      [-2.14, .42], [-2.18, .56], [-2.06, .84], [-1.35, .88],
      [1.25, .85], [2.04, .74], [2.16, .58], [2.14, .42],
    ];
    add(new THREE.Mesh(extrudeSide(sportPts, 1.88, .05), yellow), 0, 0, 0);
    const sportCh = [
      [-2.04, .22], [-2.10, .34], [-2.08, .44], [2.08, .44], [2.10, .34], [2.04, .22],
    ];
    add(new THREE.Mesh(extrudeSide(sportCh, 1.62, .03), black), 0, 0, 0);
    const cabPts = [[-1.32, .84], [-.82, 1.29], [.26, 1.30], [.92, .83]];
    add(new THREE.Mesh(extrudeSide(cabPts, 1.64, .03), glass), 0, 0, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.06, .04, 1.56), black), -.28, 1.305, 0);
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.3, .02, .16), black), 1.48, .82, s * .22);
      add(new THREE.Mesh(new THREE.BoxGeometry(.05, .26, .06), black), -1.85, .98, s * .62);
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(.36, .05, 1.82), black), -1.92, 1.12, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.22, .16, 1.92), black), 2.12, .34, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.22, .16, 1.92), black), -2.12, .34, 0);
    for (const s of [-1, 1]) {
      const exh = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .16, 10), chrome);
      exh.rotation.z = Math.PI / 2;
      add(exh, -2.19, .30, s * .54);
      add(new THREE.Mesh(new THREE.BoxGeometry(.12, .10, .045), black), .90, .94, s * .98);
    }
    headlightX = 2.13; headlightY = .64;
    taillightX = -2.15; taillightY = .72;
    signY = 1.42; signX = -.25; plateX = -2.19; plateY = .52;
    driverX = -.15; driverZ = -.36;
  } else {
    /* تاكسي أسيوط كلاسيك (لادا 2107 / فيات) أو حديث — شكل الفيديو */
    const upperPts = kind === 'modern'
      ? [[-2.06, .46], [-2.10, .64], [-2.00, .90], [-1.40, .94], [1.20, .92], [1.98, .82], [2.08, .66], [2.06, .46]]
      : [[-2.08, .44], [-2.08, .86], [-1.42, .90], [1.05, .90], [2.02, .84], [2.08, .56], [2.04, .44]];
    add(new THREE.Mesh(extrudeSide(upperPts, 1.80, .04), yellow), 0, 0, 0);

    const chassisPts = [
      [-2.00, .24], [-2.05, .36], [-2.02, .46], [2.02, .46], [2.05, .36], [2.00, .24],
    ];
    add(new THREE.Mesh(extrudeSide(chassisPts, 1.56, .03), black), 0, 0, 0);

    // التوزيع الأيقوني لتاكسي أسيوط في الموقع: السقف والأبواب الوسطى سوداء، والكبوت والشنطة صفراء
    if (kind === 'sedan') {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.74, .47, 1.815), black), -.18, .67, 0);
    }

    // السقف الأسود والأعمدة + زجاج حقيقي شفاف
    const roofX = -.28, roofW = kind === 'modern' ? 1.38 : 1.42;
    add(new THREE.Mesh(new THREE.BoxGeometry(roofW, .06, 1.58), kind === 'modern' ? yellow : black), roofX, 1.44, 0);

    const ws = new THREE.Mesh(new THREE.BoxGeometry(.03, .79, 1.48), glass);
    ws.position.set(.70, 1.16, 0);
    ws.rotation.z = Math.atan2(.56, .56);
    body.add(ws);

    const rw = new THREE.Mesh(new THREE.BoxGeometry(.03, .71, 1.48), glass);
    rw.position.set(-1.20, 1.16, 0);
    rw.rotation.z = Math.atan2(-.44, .56);
    body.add(rw);

    for (const s of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.92, .50), glass);
      sw.position.set(-.26, 1.16, s * .815);
      sw.rotation.y = s > 0 ? 0 : Math.PI;
      body.add(sw);
    }

    const pillar = (x1, y1, x2, y2, thick, z) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, thick, .06), black);
      m.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
      m.rotation.z = Math.atan2(dy, dx);
      body.add(m);
    };
    for (const s of [-1, 1]) {
      pillar(.98, .88, .42, 1.44, .065, s * .83);
      pillar(-1.42, .88, -.98, 1.44, .08, s * .83);
      add(new THREE.Mesh(new THREE.BoxGeometry(.065, .54, .065), black), -.28, 1.16, s * .83);
      add(new THREE.Mesh(new THREE.BoxGeometry(2.38, .028, .025), chrome), -.22, .895, s * .85);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.42, .028, .025), chrome), -.28, 1.42, s * .84);
      for (const x of [-.28, -1.26]) {
        add(new THREE.Mesh(new THREE.BoxGeometry(.016, .34, .02), black), x, .70, s * .915);
      }
      add(new THREE.Mesh(new THREE.BoxGeometry(.18, .04, .05), chrome), -.78, .79, s * .92);
      add(new THREE.Mesh(new THREE.BoxGeometry(.18, .04, .05), chrome), -1.68, .79, s * .92);
      add(new THREE.Mesh(new THREE.BoxGeometry(.04, .035, .12), black), .88, 1.00, s * .90);
      add(new THREE.Mesh(new THREE.BoxGeometry(.12, .11, .045), black), .91, 1.03, s * .98);
    }

    // مقصورة داخلية نظيفة + مساند الرأس + لمبة الفرامل التالتة في الزجاج الخلفي
    add(new THREE.Mesh(new THREE.BoxGeometry(.55, .14, 1.38), cabinTint), -.18, .66, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.12, .38, .44), cabinTint), -.24, .88, -.35);
    add(new THREE.Mesh(new THREE.BoxGeometry(.12, .38, .44), cabinTint), -.24, .88, .35);
    add(new THREE.Mesh(new THREE.BoxGeometry(.10, .14, .24), cabinTint), -.26, 1.14, -.35);
    add(new THREE.Mesh(new THREE.BoxGeometry(.10, .14, .24), cabinTint), -.26, 1.14, .35);
    add(new THREE.Mesh(new THREE.BoxGeometry(.26, .36, 1.36), cabinTint), -.88, .85, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.26, .20, 1.40), black), .62, .84, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.04, .05, .26), red), -.96, 1.38, 0);

    // شريط أسود بين المصابيح الخلفية + صادم أمامي وخلفي أسود + شكمان
    add(new THREE.Mesh(new THREE.BoxGeometry(.03, .17, 1.66), black), -2.125, .70, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.20, .16, 1.86), black), 2.10, .38, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.06, .24, .92), black), 2.13, .67, 0);
    for (let i = 0; i < 3; i++) {
      add(new THREE.Mesh(new THREE.BoxGeometry(.025, .022, .86), chrome), 2.16, .60 + i * .07, 0);
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(.22, .16, 1.86), black), -2.14, .38, 0);
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .22, 8), chrome);
    exh.rotation.z = Math.PI / 2;
    add(exh, -2.23, .26, .54);
  }

  // السواق جوه الكابينة + مقعد الراكب الخلفي (يظهر لما الزبون يركب)
  const drv = new THREE.Group();
  const dBody = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .24, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: .85 }));
  dBody.position.y = .96;
  const dHead = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xb0744e, roughness: .8 }));
  dHead.position.y = 1.24;
  const dHair = new THREE.Mesh(new THREE.SphereGeometry(.135, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55),
    new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 1 }));
  dHair.position.y = 1.27;
  drv.add(dBody, dHead, dHair);
  drv.position.set(driverX, 0, driverZ);
  body.add(drv);

  const passengerSeat = new THREE.Group();
  const pShirt = new THREE.MeshStandardMaterial({ color: 0x2f9fb3, roughness: .85 });
  const pB = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .22, 3, 6), pShirt);
  pB.position.y = .95;
  const pH = new THREE.Mesh(new THREE.SphereGeometry(.125, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xc28558, roughness: .8 }));
  pH.position.y = 1.22;
  const pHr = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55),
    new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 }));
  pHr.position.y = 1.25;
  passengerSeat.add(pB, pH, pHr);
  passengerSeat.position.set(kind === 'micro' ? -.1 : -.62, 0, .35);
  passengerSeat.visible = false;
  passengerSeat.userData.shirtMat = pShirt;
  body.add(passengerSeat);

  // فوانيس أمامية ومصابيح خلفية مقسمة
  for (const s of [-1, 1]) {
    if (kind === 'sedan') {
      add(new THREE.Mesh(new THREE.BoxGeometry(.05, .17, .32), white), headlightX + .01, headlightY - .02, s * .62);
      add(new THREE.Mesh(new THREE.BoxGeometry(.05, .17, .12), amber), headlightX + .01, headlightY - .02, s * .84);
    } else {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(.135, .135, .05, 14), chrome);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(headlightX, headlightY, s * .58);
      body.add(ring);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.105, .105, .06, 14), white);
      lens.rotation.z = Math.PI / 2;
      lens.position.set(headlightX + .01, headlightY, s * .58);
      body.add(lens);
      add(new THREE.Mesh(new THREE.BoxGeometry(.05, .08, .22), amber), headlightX - .02, headlightY - .14, s * .79);
    }

    // مصابيح خلفية مقسمة (أحمر + أبيض ريفرس + برتقالي)
    add(new THREE.Mesh(new THREE.BoxGeometry(.05, .15, .28), red), taillightX - .02, taillightY - .03, s * .68);
    add(new THREE.Mesh(new THREE.BoxGeometry(.055, .07, .14), revWhite), taillightX - .025, taillightY - .07, s * .46);
    add(new THREE.Mesh(new THREE.BoxGeometry(.055, .08, .14), amber), taillightX - .025, taillightY + .01, s * .46);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: GLOW_TEX, color: 0xffe2a0, transparent: true, opacity: .45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(1.4, 1.4, 1);
    glow.position.set(headlightX + .11, headlightY, s * .58);
    body.add(glow);
  }

  // فانوس التاكسي فوق السقف (تاكسي + TAXI مثل الموقع)
  if (c.taxiSign === true && kind !== 'sport') {
    const signLabel = kind === 'micro' ? 'أسيوط' : 'تاكسي';
    const signTex = canvasTex(220, 64, g => {
      g.fillStyle = '#f5c828'; g.fillRect(0, 0, 220, 64);
      g.strokeStyle = '#14161a'; g.lineWidth = 4; g.strokeRect(2, 2, 216, 60);
      g.fillStyle = '#111'; g.font = '900 32px Cairo, Tahoma, Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(signLabel, 130, 32);
      if (kind !== 'micro') {
        g.fillStyle = '#111'; g.font = '900 13px Arial';
        g.fillText('TAXI', 38, 34);
      }
    });
    add(new THREE.Mesh(new THREE.BoxGeometry(.34, .21, .94),
      new THREE.MeshBasicMaterial({ color: 0xf5c828 })), signX, signY, 0);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(.90, .19), signMat);
      p.position.set(signX + s * .175, signY, 0);
      p.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      body.add(p);
    }
    const signGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: GLOW_TEX, color: 0xffe066, transparent: true, opacity: .28,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    signGlow.scale.set(1.9, 1.1, 1);
    signGlow.position.set(signX, signY + .06, 0);
    body.add(signGlow);
  }

  // لوحة الأرقام المصرية لأسيوط (شريط سماوي فوق + أرقام وحروف أسيوط تحت)
  const plateTex = createEgyptianLicensePlateTexture();
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: .35, metalness: .1 });
  const rearPlate = createLicensePlateMesh(plateMat, .48, .24);
  rearPlate.position.set(plateX, plateY, 0);
  rearPlate.rotation.y = -Math.PI / 2;
  body.add(rearPlate);

  const frontPlate = createLicensePlateMesh(plateMat, .48, .24);
  frontPlate.position.set(-plateX, plateY * .88, 0);
  frontPlate.rotation.y = Math.PI / 2;
  body.add(frontPlate);

  // العجل
  const wheels = [];
  for (const [wx, wz] of wheelPos) {
    const wg = new THREE.Group();
    wg.position.set(wx, wheelR, wz);
    wg.rotation.order = 'YXZ';

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, .22, 32), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wg.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * .63, wheelR * .63, .235, 14), rimMat);
    rim.rotation.x = Math.PI / 2;
    wg.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * .22, wheelR * .22, .245, 10), black);
    hub.rotation.x = Math.PI / 2;
    wg.add(hub);

    for (let k = 0; k < 5; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(.028, wheelR * .88, .24), rimMat);
      spoke.rotation.z = k * Math.PI / 5;
      wg.add(spoke);
    }

    for (const side of [-1,1]) {
      const sidewall = new THREE.Mesh(new THREE.TorusGeometry(wheelR*.79,.045,6,32),tireMat);
      sidewall.position.z=side*.115; wg.add(sidewall);
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(wheelR*.5,wheelR*.5,.012,24),chrome);
      disc.rotation.x=Math.PI/2;disc.position.z=side*.12;wg.add(disc);
      for(let n=0;n<5;n++) {
        const bolt=new THREE.Mesh(new THREE.SphereGeometry(.017,6,4),chrome);
        const a=n*Math.PI*2/5;bolt.position.set(Math.cos(a)*.09,Math.sin(a)*.09,side*.14);wg.add(bolt);
      }
    }
    group.add(wg);
    wheels.push(wg);
  }

  detailVehicle(body, kind === 'micro' ? 4.8 : 4.2, kind === 'micro' ? 1.94 : 1.82, kind === 'micro');

  // ضوء الفوانيس
  const spot = new THREE.SpotLight(0xffe6b0, 140, 60, .52, .6, 1.4);
  spot.position.set(headlightX + .05, headlightY + .04, 0);
  spot.target.position.set(30, 0, 0);
  group.add(spot, spot.target);

  // إضاءة خفيفة على العربية نفسها بالليل
  const lamp = new THREE.PointLight(0xffdca8, 0, 11, 2);
  lamp.position.set(0, 1.7, 0);
  group.add(lamp);

  group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return applyImportedTaxi({ group, body, wheels, spot, lamp, wheelR, passengerSeat }, c, paintHex);
}

const taxi = new THREE.Group();
scene.add(taxi);
const taxiRig = { group: taxi, body: null, wheels: [], spot: null, lamp: null, wheelR: .34, passengerSeat: null };
let taxiBody = null;
let taxiWheels = [];

let stateReady = false;

function swapTaxi(carIdx, paintOverride) {
  const c = CARS[carIdx] || CARS[0];
  const paintHex = paintOverride !== undefined
    ? paintOverride
    : (stateReady && G.paints && G.paints[c.id] != null ? G.paints[c.id] : null);
  const rig = makeTaxi(c, paintHex);
  taxi.clear();
  while (rig.group.children.length) taxi.add(rig.group.children[0]);
  // لا نعرض أي بديل هندسي مكعب أثناء انتظار موديل السيارة الحقيقي.
  taxi.visible = !rig.modelPending;
  taxiRig.body = rig.body;
  taxiRig.wheels = rig.wheels;
  taxiRig.spot = rig.spot;
  taxiRig.lamp = rig.lamp;
  taxiRig.wheelR = rig.wheelR;
  taxiRig.passengerSeat = rig.passengerSeat;
  taxiRig.cockpit = rig.cockpit;taxiRig.cabinEye=rig.cabinEye;taxiRig.signals=rig.signals;taxiRig.headlights=rig.headlights||null;if(rig.signals)rig.body.add(rig.signals.group);
  taxiBody = rig.body;
  taxiWheels = rig.wheels;
  if (stateReady) applyCarStats();
}

swapTaxi(0, null);

/* ========================= 52-uploaded-car-rig.js ========================= */
/* Real user-supplied car assets, with separately animated wheel assemblies. */
function extractSteeringWheelFromNeishi(o, spec) {
  const geo = o.geometry;
  const pos = geo?.attributes?.position;
  const normal = geo?.attributes?.normal;
  const uv = geo?.attributes?.uv;
  const idx = geo?.index;
  if (!pos || !idx) return null;
  const triCount = idx.count / 3;

  const v2t = new Map();
  for (let t = 0; t < triCount; t++) {
    for (let j = 0; j < 3; j++) {
      const vi = idx.getX(t * 3 + j);
      if (!v2t.has(vi)) v2t.set(vi, []);
      v2t.get(vi).push(t);
    }
  }

  const visitedTri = new Uint8Array(triCount);
  const isWheelTri = new Uint8Array(triCount);
  const wheelCenter = new THREE.Vector3(0.38, 0.985, -0.371);

  for (let t = 0; t < triCount; t++) {
    if (visitedTri[t]) continue;
    const compTris = [];
    const queue = [t];
    visitedTri[t] = 1;

    while (queue.length > 0) {
      const curT = queue.pop();
      compTris.push(curT);

      for (let j = 0; j < 3; j++) {
        const vi = idx.getX(curT * 3 + j);
        const adj = v2t.get(vi) || [];
        for (const nxt of adj) {
          if (!visitedTri[nxt]) {
            visitedTri[nxt] = 1;
            queue.push(nxt);
          }
        }
      }
    }

    const box = new THREE.Box3();
    for (const curT of compTris) {
      for (let j = 0; j < 3; j++) {
        const vi = idx.getX(curT * 3 + j);
        const v = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi)).applyMatrix4(o.matrixWorld);
        box.expandByPoint(v);
      }
    }
    const center = new THREE.Vector3();
    box.getCenter(center);

    if (center.distanceTo(wheelCenter) < 0.22 && box.max.x < 0.52 && Math.abs(center.z - (-0.371)) < 0.18) {
      for (const curT of compTris) isWheelTri[curT] = 1;
    }
  }

  let wheelTriCount = 0, dashTriCount = 0;
  for (let t = 0; t < triCount; t++) {
    if (isWheelTri[t]) wheelTriCount++;
    else dashTriCount++;
  }
  if (wheelTriCount === 0) return null;

  const newDashIndices = new Uint16Array(dashTriCount * 3);
  let dPtr = 0;
  for (let t = 0; t < triCount; t++) {
    if (!isWheelTri[t]) {
      newDashIndices[dPtr++] = idx.getX(t * 3);
      newDashIndices[dPtr++] = idx.getX(t * 3 + 1);
      newDashIndices[dPtr++] = idx.getX(t * 3 + 2);
    }
  }
  geo.setIndex(new THREE.BufferAttribute(newDashIndices, 1));

  const wheelPositions = [];
  const wheelNormals = [];
  const wheelUVs = [];
  const wheelIndices = [];
  const oldVToNewV = new Map();

  for (let t = 0; t < triCount; t++) {
    if (isWheelTri[t]) {
      for (let j = 0; j < 3; j++) {
        const oldVIdx = idx.getX(t * 3 + j);
        if (!oldVToNewV.has(oldVIdx)) {
          const newVIdx = oldVToNewV.size;
          oldVToNewV.set(oldVIdx, newVIdx);

          const v = new THREE.Vector3(pos.getX(oldVIdx), pos.getY(oldVIdx), pos.getZ(oldVIdx)).applyMatrix4(o.matrixWorld);
          const n = new THREE.Vector3(normal.getX(oldVIdx), normal.getY(oldVIdx), normal.getZ(oldVIdx)).transformDirection(o.matrixWorld);

          wheelPositions.push(v.x, v.y, v.z);
          wheelNormals.push(n.x, n.y, n.z);
          if (uv) wheelUVs.push(uv.getX(oldVIdx), uv.getY(oldVIdx));
        }
        wheelIndices.push(oldVToNewV.get(oldVIdx));
      }
    }
  }

  const wheelGeo = new THREE.BufferGeometry();
  wheelGeo.setAttribute('position', new THREE.Float32BufferAttribute(wheelPositions, 3));
  wheelGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wheelNormals, 3));
  if (uv) wheelGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wheelUVs, 2));
  wheelGeo.setIndex(wheelIndices);

  wheelGeo.computeBoundingBox();
  const wc = new THREE.Vector3();
  wheelGeo.boundingBox.getCenter(wc);
  wheelGeo.center();
  wheelGeo.rotateZ(0.506);

  return { wheelGeo, center: wc };
}

function uploadedCarVisual(key,color){
 const base=key.replace(/_traffic$/,''),spec=UPLOADED_MODELS[base],asset=importedModels.loaded[base]||importedModels.loaded[key];if(!spec||!asset)return null;
 const holder=new THREE.Group(),model=(typeof cloneSkeleton==='function'?cloneSkeleton(asset.scene):asset.scene.clone(true));holder.add(model);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);model.position.y-=bounds.min.y;const materials=new Map();
 const eye = spec.eye || [-0.1, 1.28, -0.37];
 let extractedWheel = null, neishiMat = null;
 model.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;
  if(key.endsWith('_traffic')&&o.geometry&&!o.geometry.attributes.normal)o.geometry.computeVertexNormals();
  if(!key.endsWith('_traffic')&&o.geometry?.attributes?.position&&(o.material?.name==='neishi_mat'||(Array.isArray(o.material)&&o.material.some(m=>m?.name==='neishi_mat')))){
   extractedWheel = extractSteeringWheelFromNeishi(o, spec);
   neishiMat = Array.isArray(o.material) ? o.material.find(m => m?.name === 'neishi_mat') : o.material;
  }
  const convert=original=>{if(materials.has(original.uuid))return materials.get(original.uuid);const isPaint=spec.paint&&spec.paint.some(name=>original.name===name),isGlass=/glass|vitre|steclo|windshield|fara|lens|lamp|light|blinker|window/i.test(original.name||''),isChrome=/chrome|alloy|metal|silver|mirror|exhaust|nickel|rim|wheel|logo|emblem/i.test(original.name||'');let mat;if(isPaint){mat=new THREE.MeshPhysicalMaterial({color:(color!==undefined&&color!==null)?new THREE.Color(color):(original.color?original.color.clone():new THREE.Color(0xffffff)),map:original.map||null,normalMap:original.normalMap||null,metalness:.35,roughness:.18,clearcoat:1,clearcoatRoughness:.08,reflectivity:.95,envMapIntensity:1.35});}else if(isGlass){mat=new THREE.MeshPhysicalMaterial({color:original.color?original.color.clone():new THREE.Color(0x283842),map:original.map||null,metalness:.15,roughness:.05,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:Math.max(0.38,Math.min(0.68,original.opacity||0.52)),reflectivity:.98,envMapIntensity:1.6,depthWrite:true,depthTest:true});}else{mat=original.clone();if(isChrome){mat.metalness=Math.max(.88,mat.metalness||0);mat.roughness=Math.min(.18,mat.roughness??.3);mat.envMapIntensity=1.45;}else{mat.envMapIntensity=.95;}}mat.transmission=0;if(mat.thickness!==undefined)mat.thickness=0;mat.name=original.name;if(!isGlass){mat.transparent=false;mat.opacity=1.0;mat.depthWrite=true;mat.depthTest=true;mat.alphaTest=0;if(original.side!==THREE.DoubleSide)mat.side=THREE.FrontSide;}materials.set(original.uuid,mat);return mat;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});
 surfaceSetup(model);holder.userData.asset=base;
 holder.userData.extractedWheel = extractedWheel;
 holder.userData.neishiMat = neishiMat;
 if(typeof populateVehicleOccupants==='function')populateVehicleOccupants(holder, base);
 return holder;
}
function createInteractiveCockpit(c, parentBody, visual){
 if (typeof THREE === 'undefined') return null;
 const eye = c?.eye || [-0.1, 1.28, -0.37];
 const root = new THREE.Group();
 root.name = 'CockpitGroup';

 const ext = visual?.userData?.extractedWheel;
 const wheelCenter = ext?.center || new THREE.Vector3(eye[0] + 0.40, eye[1] - 0.284, eye[2]);
 const steerRoot = new THREE.Group();
 steerRoot.position.copy(wheelCenter);
 steerRoot.rotation.z = -0.506;
 root.add(steerRoot);

 const wheelPivot = new THREE.Group();
 steerRoot.add(wheelPivot);

 if (ext?.wheelGeo && visual?.userData?.neishiMat) {
  const wheelMesh = new THREE.Mesh(ext.wheelGeo, visual.userData.neishiMat);
  wheelMesh.castShadow = true;
  wheelMesh.receiveShadow = true;
  wheelPivot.add(wheelMesh);
 } else {
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x181b1f, roughness: 0.65, metalness: 0.12 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.6, metalness: 0.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdde4ec, roughness: 0.15, metalness: 0.95 });
  const rimGeo = new THREE.TorusGeometry(0.172, 0.016, 16, 44);
  rimGeo.rotateY(Math.PI / 2);
  wheelPivot.add(new THREE.Mesh(rimGeo, leatherMat));
  const hubGeo = new THREE.CylinderGeometry(0.048, 0.044, 0.026, 24);
  hubGeo.rotateZ(Math.PI / 2);
  wheelPivot.add(new THREE.Mesh(hubGeo, spokeMat));
  const ringGeo = new THREE.TorusGeometry(0.046, 0.003, 8, 24);
  ringGeo.rotateY(Math.PI / 2);
  ringGeo.translate(-0.013, 0, 0);
  wheelPivot.add(new THREE.Mesh(ringGeo, chromeMat));
 }

 const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a584, roughness: 0.70, metalness: 0.05 });
 const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1d2530, roughness: 0.85 });

 // 1. Left Hand & Arm
 const handL = new THREE.Group();
 handL.position.set(0.008, 0.015, -0.172);
 const palmL = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.050), skinMat);
 palmL.position.set(-0.004, 0, 0);
 handL.add(palmL);
 for (let i = 0; i < 4; i++) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0048, 0.034, 8), skinMat);
  f.position.set(0.016, (i - 1.5) * 0.009, 0.010);
  f.rotation.z = Math.PI / 2.3;
  handL.add(f);
 }
 const thumbL = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0058, 0.030, 8), skinMat);
 thumbL.position.set(-0.012, 0.014, 0.004);
 thumbL.rotation.x = Math.PI / 4;
 handL.add(thumbL);
 const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.010, 16), new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.3, metalness: 0.85 }));
 watch.position.set(-0.038, 0, 0);
 watch.rotation.z = Math.PI / 2;
 handL.add(watch);
 const sleeveGeoL = new THREE.CylinderGeometry(0.036, 0.048, 0.38, 16);
 sleeveGeoL.translate(0, -0.19, 0);
 const sleeveL = new THREE.Mesh(sleeveGeoL, sleeveMat);
 sleeveL.position.set(-0.035, 0, 0);
 const dirL = new THREE.Vector3(-0.65, -0.72, -0.22).normalize();
 sleeveL.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirL);
 handL.add(sleeveL);
 wheelPivot.add(handL);

 // 2. Right Hand & Arm
 const handR = new THREE.Group();
 handR.position.set(0.008, 0.015, 0.172);
 const palmR = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.050), skinMat);
 palmR.position.set(-0.004, 0, 0);
 handR.add(palmR);
 for (let i = 0; i < 4; i++) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0048, 0.034, 8), skinMat);
  f.position.set(0.016, (i - 1.5) * 0.009, -0.010);
  f.rotation.z = Math.PI / 2.3;
  handR.add(f);
 }
 const thumbR = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0058, 0.030, 8), skinMat);
 thumbR.position.set(-0.012, 0.014, -0.004);
 thumbR.rotation.x = -Math.PI / 4;
 handR.add(thumbR);
 const sleeveGeoR = new THREE.CylinderGeometry(0.036, 0.048, 0.38, 16);
 sleeveGeoR.translate(0, -0.19, 0);
 const sleeveR = new THREE.Mesh(sleeveGeoR, sleeveMat);
 sleeveR.position.set(-0.035, 0, 0);
 const dirR = new THREE.Vector3(-0.65, -0.72, 0.22).normalize();
 sleeveR.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirR);
 handR.add(sleeveR);
 wheelPivot.add(handR);

 // 3. Working Infotainment Screen
 const screenRoot = new THREE.Group();
 screenRoot.position.set(0.575, 1.085, 0.000);
 screenRoot.rotation.order = 'YXZ';
 screenRoot.rotation.y = -Math.PI / 2 - 0.12;
 screenRoot.rotation.x = -0.25;

 const frame = new THREE.Mesh(
  new THREE.BoxGeometry(0.334, 0.144, 0.005),
  new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.35, metalness: 0.7 })
 );
 frame.position.z = -0.0026;
 screenRoot.add(frame);

 let screenCanvas = null, screenCtx = null, screenTex = null;
 if (typeof document !== 'undefined' && document.createElement) {
  screenCanvas = document.createElement('canvas');
  if (screenCanvas && typeof screenCanvas.getContext === 'function') {
   screenCanvas.width = 512;
   screenCanvas.height = 256;
   screenCtx = screenCanvas.getContext('2d');
   screenTex = new THREE.CanvasTexture(screenCanvas);
   screenTex.wrapS = screenTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const dispGeo = new THREE.PlaneGeometry(0.330, 0.140);
  dispGeo.translate(0, 0, 0.001);
  const dispMat = new THREE.MeshStandardMaterial({
   map: screenTex,
   emissiveMap: screenTex,
   emissive: 0xffffff,
   // Keep the infotainment readable at night without washing out the
   // windshield view from the dashboard camera.
   emissiveIntensity: 0.16,
   roughness: 0.10,
   metalness: 0.05
  });
  const display = new THREE.Mesh(dispGeo, dispMat);
  screenRoot.add(display);
 }
 root.add(screenRoot);

 // مقصورة BMW تحتاج كتلة تابلوه واضحة حتى لا تبدو عجلة القيادة والأنوار
 // عائمة عند الدخول قبل اكتمال تفاصيل المقصورة الأصلية في ملف GLB.
 if(c?.id==='policeBMW'){
  const dashMat=new THREE.MeshStandardMaterial({color:0x171b20,roughness:.62,metalness:.18});
  const trimMat=new THREE.MeshStandardMaterial({color:0x343b42,roughness:.42,metalness:.58});
  const dash=new THREE.Mesh(new THREE.BoxGeometry(.42,.28,1.34),dashMat);
  dash.position.set(.48,.74,0);dash.castShadow=true;dash.receiveShadow=true;root.add(dash);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(.26,.09,.76),trimMat);
  hood.position.set(.38,1.01,-.37);hood.rotation.z=-.08;root.add(hood);
  const center=new THREE.Mesh(new THREE.BoxGeometry(.12,.18,.42),trimMat);
  center.position.set(.56,.88,0);root.add(center);
 }

 if (parentBody) parentBody.add(root);

 return {
  root,
  steerRoot,
  wheelPivot,
  handL,
  handR,
  screenRoot,
  screenCanvas,
  screenCtx,
  screenTex,
  baseWheelY: steerRoot.position.y,
  baseWheelZ: steerRoot.position.z,
  currentSteer: 0,
  screenTimer: 0
 };
}
function makeUploadedCarRig(c,paint){
 const group=new THREE.Group(),body=new THREE.Group();group.add(body);const visual=uploadedCarVisual(c.asset,paint),modelPending=!!c.uploaded&&!visual;const wheels=[];
 if(visual){body.add(visual);if(c.police){configureOriginalPoliceModel(body);tintPoliceRearWindows(body,c);}group.updateMatrixWorld(true);group.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});for(const name of ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']){const node=visual.getObjectByName(name);if(!node)continue;const pivot=new THREE.Group();pivot.position.copy(node.getWorldPosition(new THREE.Vector3()));group.add(pivot);pivot.attach(node);pivot.userData.restY=pivot.position.y;wheels.push(pivot);}}
 const cockpit = createInteractiveCockpit(c, body, visual);
 const signals=typeof createVehicleSignals==='function'?createVehicleSignals(c,visual):null,[hx,hy,hz]=signals?.anchors?.head||[(c.length||4.4)/2-.28,.78,(c.halfWidth||.9)*.66];
 const spot=new THREE.SpotLight(0xffeed8,18,85,.52,.65);spot.position.set(hx+.03,hy,-hz);spot.target.position.set(24,.12,-.75);
 const spotR=new THREE.SpotLight(0xffeed8,18,85,.52,.65);spotR.position.set(hx+.03,hy,hz);spotR.target.position.set(24,.12,.75);
 group.add(spot,spot.target,spotR,spotR.target);
 const bulbs=[],glows=[];
 for(const side of [-1,1]){
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.048,8,6),new THREE.MeshBasicMaterial({color:0xfff4d6,toneMapped:false,transparent:true,opacity:.62}));
  bulb.scale.set(.35,.75,1.3);bulb.position.set(hx-.015,hy,side*hz);body.add(bulb);bulbs.push(bulb);
  if(typeof GLOW_TEX!=='undefined'){
   const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:0xffe8b0,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false}));
   glow.scale.set(.74,.48,1);glow.position.set(hx+.03,hy,side*hz);body.add(glow);glows.push(glow);
  }
 }
 if(typeof createEgyptianLicensePlateTexture==='function'&&typeof createLicensePlateMesh==='function'){
  const pTex=createEgyptianLicensePlateTexture();
  const pMat=new THREE.MeshStandardMaterial({map:pTex,roughness:.35,metalness:.1});
  const fp=createLicensePlateMesh(pMat,.48,.24), rp=createLicensePlateMesh(pMat,.48,.24);
  const a=signals?.anchors||(typeof getVehicleLampAnchors==='function'?getVehicleLampAnchors(c,visual):null);
  const halfL=(c.length||4.4)/2;
  const fx=halfL+.006;
  const fy=a?.head?Math.max(.34,a.head[1]*.46):.40;
  const rx=-halfL-.006;
  const ry=a?.brake?Math.max(.44,a.brake[1]*.52):.50;
  fp.position.set(fx,fy,0);fp.rotation.y=Math.PI/2;body.add(fp);
  rp.position.set(rx,ry,0);rp.rotation.y=-Math.PI/2;body.add(rp);
 }
 const lamp=new THREE.PointLight(0xffe9cd,0,5);lamp.position.set(0,(c.eye?.[1]||1.2)+.12,0);lamp.userData.nightIntensity=1.5;group.add(lamp);
 return {group,body,wheels,spot,lamp,modelPending,headlights:{spots:[spot,spotR],bulbs,glows,anchors:signals?.anchors||{head:[hx,hy,hz]}},wheelR:c.id==='micra'?.29:c.id==='xtrail'?.37:.33,passengerSeat:null,cabinEye:c.eye,signals,cockpit,driverOccupant:visual?.userData?.driverOccupant,passengerOccupant:visual?.userData?.passengerOccupant};
}

/* ========================= 53-police-livery.js ========================= */
/* Keep the supplied Sheriff Cruiser's original meshes, paint, decals and materials. */
function configureOriginalPoliceModel(body){
 const emergency=[];
 body.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
  const channel=/^(?:roof_light_(blue|red|white)(?:\.\d+)?|emit_(blue|red))$/.exec(material.name);const colorCh=channel?.[1]||channel?.[2];if(colorCh)emergency.push({material,side:colorCh==='red'?1:colorCh==='blue'?0:2,intensity:material.emissiveIntensity,emissive:material.emissive.clone()});
 }});
 body.userData.emergencyLights=emergency;
}
function updatePoliceLights(t){
 const list=taxiBody?.userData.emergencyLights;if(!list)return;
 const on=G.mode==='police'&&POLICE.siren,phase=Math.floor(t/.14)%4;
 for(const light of list){light.material.emissive.copy(light.emissive);if(on&&light.emissive.getHex()===0)light.material.emissive.setHex(light.side===1?0xff1724:light.side===0?0x126dff:0xffffff);const flash=light.side===2?phase===0:(phase<2?light.side===0:light.side===1);light.material.emissiveIntensity=on?(flash?Math.max(4,light.intensity):0):light.intensity;}
}
function tintPoliceRearWindows(body,c){
 body.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(body),height=bounds.max.y-bounds.min.y,meshes=[];body.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&/windows|glass|transparent_clear|steclo/i.test(o.material.name))meshes.push(o);});
 const v=new THREE.Vector3(),inverse=new THREE.Matrix4().copy(body.matrixWorld).invert();
 for(const mesh of meshes){const g=mesh.geometry,positions=g.attributes.position,index=g.index,ordinary=[],rear=[],transform=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),count=index?index.count:positions.count;
  for(let i=0;i<count;i+=3){let x=0,y=0,z=0;for(let k=0;k<3;k++){const j=index?index.getX(i+k):i+k;v.fromBufferAttribute(positions,j).applyMatrix4(transform);x+=v.x/3;y+=v.y/3;z+=v.z/3;}const target=x<-.22&&y>height*.62&&(Math.abs(z)>(c.halfWidth||.9)*.52||x<-c.length*.32)?rear:ordinary;for(let k=0;k<3;k++)target.push(index?index.getX(i+k):i+k);}
  if(!rear.length)continue;const tint=mesh.material.clone();tint.name+='_RearPrivacyTint';tint.map=null;tint.color.setHex(0x071018);tint.transmission=0;tint.transparent=false;tint.opacity=1;tint.roughness=.28;tint.metalness=.12;tint.side=THREE.FrontSide;tint.depthWrite=true;const copy=g.clone();copy.setIndex(ordinary.concat(rear));copy.clearGroups();if(ordinary.length)copy.addGroup(0,ordinary.length,0);copy.addGroup(ordinary.length,rear.length,1);mesh.geometry=copy;mesh.material=[mesh.material,tint];
 }
}

/* ========================= 55-actors.js ========================= */
/* ------------------------- الناس ------------------------- */
const SKIN = [0xc58a5e, 0xa86f4a, 0x8a5738, 0xd9a477, 0x6f442c];
const SHIRTS = [0xd94f3d, 0x3d6bd9, 0x3f8f6b, 0x8f3f7e, 0xc9b45a, 0x2f9fb3, 0xe07b39, 0x6b5bd9];

function makePerson(shirt, skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({color:shirt,roughness:.94});
  const skinMat = new THREE.MeshStandardMaterial({color:skin,roughness:.76});
  const pantsMat = new THREE.MeshStandardMaterial({color:pick([0x29313c,0x42423a,0x182a40,0x605344]),roughness:.95});
  const shoeMat = new THREE.MeshStandardMaterial({color:0x24201d,roughness:.8});
  const hairMat = new THREE.MeshStandardMaterial({color:pick([0x201711,0x30251c,0x171719,0x4b3e33]),roughness:1});
  const eyesMat = new THREE.MeshStandardMaterial({color:0x201b17,roughness:.6});
  const sphere = new THREE.SphereGeometry(1,16,12);
  function ell(parent,mat,pos,scale) {
    const m=new THREE.Mesh(sphere,mat);m.position.set(...pos);m.scale.set(...scale);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function limb(parent,mat,len,r1,r2) {
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,10),mat);
    m.position.y=-len/2;m.castShadow=true;parent.add(m);return m;
  }
  // Human proportions: 1.76 m, shoulders, neck, jaw and separate limbs.
  ell(g,shirtMat,[0,1.17,0],[.225,.31,.125]);
  ell(g,pantsMat,[0,.91,0],[.19,.145,.115]);
  ell(g,skinMat,[0,1.47,0],[.063,.095,.063]);
  const head=new THREE.Group();head.position.y=1.615;g.add(head);
  ell(head,skinMat,[0,0,0],[.105,.145,.105]);
  ell(head,skinMat,[0,-.065,.023],[.078,.073,.078]);
  ell(head,skinMat,[0,-.014,.104],[.025,.036,.033]);
  for(const side of [-1,1]) {
    ell(head,skinMat,[side*.105,-.008,0],[.021,.038,.022]);
    ell(head,eyesMat,[side*.041,.018,.095],[.011,.007,.005]);
    ell(head,hairMat,[side*.041,.039,.092],[.029,.006,.007]);
  }
  ell(head,skinMat,[0,-.073,.094],[.028,.005,.006]);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(1,16,12,0,Math.PI*2,0,Math.PI*.53),hairMat);
  hair.scale.set(.109,.151,.11);hair.position.y=.013;head.add(hair);
  if(Math.random()<.35) ell(head,hairMat,[0,-.07,.047],[.08,.055,.063]);
  const arms=[],legs=[],knees=[];
  for(const side of [-1,1]) {
    const arm=new THREE.Group();arm.position.set(side*.222,1.35,0);arm.rotation.z=side*.08;g.add(arm);arms.push(arm);
    ell(arm,shirtMat,[0,-.055,0],[.079,.12,.082]);
    limb(arm,skinMat,.26,.055,.042);
    const elbow=new THREE.Group();elbow.position.y=-.26;elbow.rotation.x=-.13;arm.add(elbow);
    ell(elbow,skinMat,[0,0,0],[.044,.045,.044]);limb(elbow,skinMat,.24,.043,.03);
    ell(elbow,skinMat,[0,-.27,.01],[.036,.064,.026]);
    const leg=new THREE.Group();leg.position.set(side*.097,.91,0);g.add(leg);legs.push(leg);
    limb(leg,pantsMat,.405,.089,.063);
    const knee=new THREE.Group();knee.position.y=-.405;leg.add(knee);knees.push(knee);
    ell(knee,pantsMat,[0,0,0],[.065,.067,.065]);limb(knee,pantsMat,.39,.061,.044);
    ell(knee,shoeMat,[0,-.40,.045],[.066,.065,.13]);
    const sole=new THREE.Mesh(new THREE.BoxGeometry(.132,.025,.23),shoeMat);sole.position.set(0,-.444,.04);knee.add(sole);
  }
  // Shirt placket, collar, seams and occasional shoulder bag.
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.008,.31,.006),new THREE.MeshStandardMaterial({color:0x687174,roughness:1}));
  seam.position.set(0,1.22,.124);g.add(seam);
  for(const side of [-1,1]) ell(g,shirtMat,[side*.048,1.425,.065],[.045,.028,.06]);
  if(Math.random()<.3) {
    const bag=new THREE.Mesh(new THREE.BoxGeometry(.14,.24,.22),new THREE.MeshStandardMaterial({color:0x554132,roughness:.9}));
    bag.position.set(.27,.96,0);bag.castShadow=true;g.add(bag);
  }
  g.userData.shirtMat=shirtMat;g.userData.walk={arms,legs,knees};
  const h=rand(.94,1.06);g.scale.set(h,h,h);
  const lod=new THREE.LOD();lod.addLevel(g,0);
  const distant=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.57,2,6),shirtMat);torso.position.y=1.12;distant.add(torso);
  const farHead=new THREE.Mesh(new THREE.SphereGeometry(.115,6,4),skinMat);farHead.position.y=1.62;distant.add(farHead);
  for(const side of [-1,1]) {const leg=new THREE.Mesh(new THREE.CylinderGeometry(.067,.044,.83,5),pantsMat);leg.position.set(side*.095,.48,0);distant.add(leg);}
  distant.scale.copy(g.scale);lod.addLevel(distant,55);lod.addLevel(new THREE.Group(),220);
  lod.userData=g.userData;return lod;
}

function animatePerson(person, phase, strength=1) {
  if(animateImportedPerson(person, phase, strength))return;
  const rig=person.userData.walk;if(!rig)return;
  for(let i=0;i<2;i++) {
    // Biomechanical heel-to-toe gait: hip swing (0.42 rad), knee flexion (0.72 rad) on back-swing,
    // and arm counter-swing (0.32 rad) with natural lateral clearance.
    const a=phase+i*Math.PI, swing=Math.sin(a), back=Math.max(0,-swing);
    const lift=Math.max(0,Math.sin(a+Math.PI*.18));
    rig.legs[i].rotation.x=(swing*.42+lift*.055)*strength;
    rig.knees[i].rotation.x=(back*.72+lift*.10)*strength;
    rig.arms[i].rotation.x=-swing*.32*strength;
    rig.arms[i].rotation.z=(i?-.045:.045)*Math.abs(swing)*strength;
  }
}

const peds = [];
for (let i = 0; i < 44; i++) {
  const p = makePerson(pick(SHIRTS), pick(SKIN));
  const side = Math.random() < .5 ? 1 : -1;
  p.position.set((i<16?rand(-85,85):rand(-HALF + 40, HALF - 40)), .34, side * rand(18.6, 22.8));
  p.rotation.y = Math.PI / 2;
  scene.add(p);
  peds.push({ mesh: p, speed: rand(.35, .9) * (Math.random() < .5 ? 1 : -1), z: p.position.z, phase: rand(0, 6) });
}

/* ------------------------- الزبون ------------------------- */
const passenger = makePerson(0x2f9fb3, 0xb87b50);
passenger.visible = false;
scene.add(passenger);

/* ------------------------- ماركر الزبون ------------------------- */
const pickupMarker = new THREE.Group();
pickupMarker.visible = false;
scene.add(pickupMarker);

const pHatch = new THREE.Mesh(
  new THREE.PlaneGeometry(6.4, 4.2),
  new THREE.MeshBasicMaterial({
    map: pickupHatchTex, transparent: true, opacity: .9, depthWrite: false,
  })
);
pHatch.rotation.x = -Math.PI / 2;
pHatch.position.y = .04;
pickupMarker.add(pHatch);

const pRing = new THREE.Mesh(
  new THREE.TorusGeometry(5.8, .12, 8, 36),
  new THREE.MeshBasicMaterial({ color: 0xffc61a })
);
pRing.rotation.x = Math.PI / 2;
pRing.position.y = .07;
pickupMarker.add(pRing);

const pDisc = new THREE.Mesh(
  new THREE.CircleGeometry(5.8, 36),
  new THREE.MeshBasicMaterial({
    map: RADIAL_TEX, color: 0xffc61a, transparent: true, opacity: .6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
pDisc.rotation.x = -Math.PI / 2;
pDisc.position.y = .035;
pickupMarker.add(pDisc);

const pBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(.7, 1.5, 7.5, 18, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xffc61a, transparent: true, opacity: .3, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
pBeam.position.y = 3.75;
pickupMarker.add(pBeam);

const pLabel = labelSprite('اتفضل اركب', '#ffd34d');
pLabel.scale.set(3.2, .8, 1);
pLabel.position.y = 4.0;
pickupMarker.add(pLabel);

/* ------------------------- ماركر الوجهة ------------------------- */
const destMarker = new THREE.Group();
destMarker.visible = false;
scene.add(destMarker);

const dRing = new THREE.Mesh(
  new THREE.TorusGeometry(6.5, .12, 8, 40),
  new THREE.MeshBasicMaterial({ color: 0x3dff8a })
);
dRing.rotation.x = Math.PI / 2;
dRing.position.y = .07;
destMarker.add(dRing);

const dDisc = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 40),
  new THREE.MeshBasicMaterial({
    map: RADIAL_TEX, color: 0x3dff8a, transparent: true, opacity: .45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
dDisc.rotation.x = -Math.PI / 2;
dDisc.position.y = .035;
destMarker.add(dDisc);

const dBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(.65, 1.15, 7, 18, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0x3dff8a, transparent: true, opacity: .15, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
dBeam.position.y = 3.5;
destMarker.add(dBeam);

const dLabel = labelSprite('الوجهة', '#5dffa0');
dLabel.position.y = 3.8;
destMarker.add(dLabel);

/* ------------------------- سهم الوجهة الطاير ------------------------- */
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, 1.9);
arrowShape.lineTo(1.55, .35);
arrowShape.lineTo(.58, .35);
arrowShape.lineTo(.58, -1.9);
arrowShape.lineTo(-.58, -1.9);
arrowShape.lineTo(-.58, .35);
arrowShape.lineTo(-1.55, .35);
arrowShape.closePath();
const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, {
  depth: .42, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 1,
});
arrowGeo.center();
const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshStandardMaterial({
  color: 0x3dff8a, emissive: 0x1fa85a, emissiveIntensity: 1.0,
  roughness: .35, metalness: .15,
}));
arrow.visible = false;
arrow.scale.setScalar(.62);
scene.add(arrow);

const arrowGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: GLOW_TEX, color: 0x3dff8a, transparent: true, opacity: .3,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
arrowGlow.scale.set(9, 9, 1);
arrowGlow.visible = false;
scene.add(arrowGlow);

/* ========================= 56-police-actors.js ========================= */
/* Fictional adult game actors in Egyptian-style summer police uniforms. */
function makeEgyptianOfficer(){
 const p=makePerson(0xf0efe8,0xaa774f),navy=new THREE.MeshStandardMaterial({color:0x132234,roughness:.75}),whiteCap=new THREE.MeshStandardMaterial({color:0xf4f3ed,roughness:.6}),gold=new THREE.MeshStandardMaterial({color:0xc9a84c,metalness:.6,roughness:.32}),leather=new THREE.MeshStandardMaterial({color:0x1a1817,roughness:.55});
 const capCrown=new THREE.Mesh(new THREE.CylinderGeometry(.125,.11,.055,14),whiteCap);capCrown.position.y=1.79;p.add(capCrown);
 const capBand=new THREE.Mesh(new THREE.CylinderGeometry(.112,.116,.038,14),navy);capBand.position.y=1.745;p.add(capBand);
 const brim=new THREE.Mesh(new THREE.BoxGeometry(.18,.02,.12),leather);brim.position.set(0,1.735,.10);p.add(brim);
 const eagle=new THREE.Mesh(new THREE.BoxGeometry(.032,.032,.015),gold);eagle.position.set(0,1.78,.115);p.add(eagle);
 const badge=new THREE.Mesh(new THREE.BoxGeometry(.05,.058,.018),gold);badge.position.set(-.09,1.32,.132);p.add(badge);
 for(const sx of[-.19,.19]){const ep=new THREE.Mesh(new THREE.BoxGeometry(.10,.022,.055),navy);ep.position.set(sx,1.48,0);p.add(ep);const star=new THREE.Mesh(new THREE.BoxGeometry(.022,.01,.022),gold);star.position.set(sx,1.495,0);p.add(star);}
 const belt=new THREE.Mesh(new THREE.BoxGeometry(.41,.055,.265),leather);belt.position.set(0,.98,0);p.add(belt);
 const buckle=new THREE.Mesh(new THREE.BoxGeometry(.055,.045,.02),gold);buckle.position.set(0,.98,.138);p.add(buckle);
 const radio=new THREE.Mesh(new THREE.BoxGeometry(.04,.095,.035),leather);radio.position.set(.215,1.02,.04);p.add(radio);
 for(const leg of p.userData.walk.legs)leg.traverse(o=>{if(o.isMesh)o.material.color.setHex(0x132234);});
 for(let i=0;i<3;i++){const flag=new THREE.Mesh(new THREE.BoxGeometry(.016,.018,.078),new THREE.MeshBasicMaterial({color:[0xce2936,0xf4f2e8,0x121821][i]}));flag.position.set(.25,1.36-i*.018,0);p.add(flag);}
 return p;
}
function makePoliceSuspect(){return makePerson(pick([0x6e7973,0x8b705d,0x616a7a]),pick(SKIN));}

function clearPoliceActors(){
 if(typeof POLICE==='undefined'||!POLICE.actors)return;
 for(const a of POLICE.actors){
  if(!a)continue;
  if(typeof scene!=='undefined'&&scene.remove)scene.remove(a);
  if(a.traverse){
   a.traverse(o=>{
    if(o.geometry)o.geometry.dispose?.();
    if(o.material){
     if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
     else o.material.dispose?.();
    }
   });
  }
 }
 POLICE.actors=[];
}

function spawnPoliceCrimeScene(stop,incident){
 clearPoliceActors();
 if(!stop||typeof scene==='undefined')return;
 const cx=stop.x,cz=stop.z;
 const cy=typeof navigationStopHeight==='function'?navigationStopHeight(stop):(typeof car!=='undefined'?car.y||0:0);

 let fx=1,fz=0;
 if(stop.roadIndex!==undefined&&typeof ASSYUT!=='undefined'&&ASSYUT.roads?.[stop.roadIndex]){
  for(const seg of ASSYUT.segments||[]){
   if(seg.road===stop.roadIndex&&seg.length>4){
    const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z;
    const d=Math.hypot(cx-(seg.a.x+seg.b.x)*0.5,cz-(seg.a.z+seg.b.z)*0.5);
    if(d<50){fx=dx/seg.length;fz=dz/seg.length;break;}
   }
  }
 }
 const nx=-fz,nz=fx;

 // 1. Two suspects handcuffed in center of crime scene
 for(let i=0;i<2;i++){
  const s=makePoliceSuspect();
  const side=i===0?-0.55:0.55;
  s.position.set(cx+nx*side,cy,cz+nz*side);
  s.rotation.y=Math.atan2(-fz,fx)+(i===0?0.35:-0.35);
  const walk=s.userData?.walk;
  if(walk&&walk.arms&&walk.arms.length>=2){
   walk.arms[0].rotation.set(0.65,-0.3,-0.38);
   walk.arms[1].rotation.set(0.65,0.3,0.38);
  }
  s.userData.isPoliceSuspect=true;
  scene.add(s);
  POLICE.actors.push(s);
 }

 // 2. Two Egyptian police officers securing the perimeter
 for(let i=0;i<2;i++){
  const off=makeEgyptianOfficer();
  const dir=i===0?-1.5:1.5;
  off.position.set(cx+fx*dir,cy,cz+fz*dir);
  off.lookAt(cx,cy,cz);
  off.userData.isPoliceOfficer=true;
  scene.add(off);
  POLICE.actors.push(off);
 }

 // 3. Crowd of 6 Egyptian citizen spectators gathered around
 const crowdTotal=6;
 for(let i=0;i<crowdTotal;i++){
  const bystander=makePerson(pick(SHIRTS),pick(SKIN));
  const angle=(i/crowdTotal)*Math.PI*2+rand(-0.2,0.2);
  const radius=rand(2.8,4.6);
  const px=cx+Math.cos(angle)*radius*nx+Math.sin(angle)*radius*fx;
  const pz=cz+Math.cos(angle)*radius*nz+Math.sin(angle)*radius*fz;
  bystander.position.set(px,cy,pz);
  bystander.lookAt(cx+rand(-0.4,0.4),cy+1.2,cz+rand(-0.4,0.4));

  const walk=bystander.userData?.walk;
  if(walk&&walk.arms&&walk.arms.length>=2){
   if(i%3===0)walk.arms[0].rotation.set(-1.1,-0.2,-0.25);
   else if(i%3===1)walk.arms[1].rotation.set(-0.75,0.4,0.35);
  }
  bystander.userData.isCrowdBystander=true;
  bystander.userData.baseY=cy;
  bystander.userData.phase=rand(0,Math.PI*2);
  bystander.traverse?.(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  scene.add(bystander);
  POLICE.actors.push(bystander);
 }

 // 4. Parked incident squad car
 if(typeof makeTrafficCar==='function'){
  const carMesh=makeTrafficCar('modern',0x223042);
  carMesh.position.set(cx+fx*4.2+nx*1.5,cy,cz+fz*4.2+nz*1.5);
  carMesh.rotation.y=Math.atan2(-fz,fx)+0.22;
  carMesh.traverse?.(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  scene.add(carMesh);
  POLICE.actors.push(carMesh);
 }

 // 5. Emergency flashing strobe light
 const strobe=new THREE.PointLight(0x0055ff,3,30);
 strobe.castShadow=false;
 strobe.position.set(cx+fx*4.2+nx*1.5,cy+1.75,cz+fz*4.2+nz*1.5);
 strobe.userData.isStrobe=true;
 scene.add(strobe);
 POLICE.actors.push(strobe);

 // 6. Traffic safety cones
 for(let k=0;k<4;k++){
  const cone=new THREE.Group();
  const coneBody=new THREE.Mesh(
   new THREE.CylinderGeometry(0.04,0.18,0.55,10),
   new THREE.MeshStandardMaterial({color:0xff4d00,roughness:0.5})
  );
  coneBody.position.y=0.275;
  const stripe=new THREE.Mesh(
   new THREE.CylinderGeometry(0.09,0.13,0.16,10),
   new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.2})
  );
  stripe.position.y=0.28;
  cone.add(coneBody,stripe);
  cone.traverse?.(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  const offsetDist=(k-1.5)*2.2;
  cone.position.set(cx+fx*offsetDist-nx*2.5,cy,cz+fz*offsetDist-nz*2.5);
  scene.add(cone);
  POLICE.actors.push(cone);
 }
}

function spawnPoliceStationOfficers(station){
 clearPoliceActors();
 if(!station?.stop||typeof scene==='undefined')return;
 const sx=station.stop.x,sz=station.stop.z;
 const sy=typeof navigationStopHeight==='function'?navigationStopHeight(station.stop):0;
 for(let i=0;i<2;i++){
  const off=makeEgyptianOfficer();
  off.position.set(sx+(i===0?-1.8:1.8),sy,sz+2.2);
  off.rotation.y=Math.PI;
  off.userData.isPoliceOfficer=true;
  scene.add(off);
  POLICE.actors.push(off);
 }
}

function updatePoliceActors(dt){
 if(typeof POLICE==='undefined'||!POLICE.actors||POLICE.actors.length===0)return;
 const now=Date.now();
 const strobe=POLICE.actors.find(a=>a.userData?.isStrobe);
 if(strobe&&strobe.color){
  strobe.color.setHex((Math.floor(now/130)%2===0)?0xff1525:0x0066ff);
 }
 for(const a of POLICE.actors){
  if(a.userData?.isCrowdBystander&&a.userData.baseY!==undefined){
   a.position.y=a.userData.baseY+Math.sin(now*0.003+a.userData.phase)*0.012;
  }
 }
}

/* ========================= 57-pedestrian-life.js ========================= */
/* Sidewalk walkers, cautious crossings, couples and families share one group state. */
const WALKING_GROUPS=[];
function pedestrianEdges(){return ASSYUT.edges.filter(e=>{if(ASSYUT.roads[e.road].width<4||e.length<=12)return false;if(INFRA?.profiles&&INFRA.profiles.has(e.road))return false;const na=ASSYUT.nodes[e.a],nb=ASSYUT.nodes[e.b];if(assyutRoadHeightAt(na.x,na.z)>0.35||assyutRoadHeightAt(nb.x,nb.z)>0.35)return false;return true;});}
function pedestrianFrame(edge){const a=ASSYUT.nodes[edge.a],b=ASSYUT.nodes[edge.b],len=Math.hypot(b.x-a.x,b.z-a.z);return {a,b,len,fx:(b.x-a.x)/len,fz:(b.z-a.z)/len};}
function groupPosition(g,offset=null){
 const road=ASSYUT.roads[g.edge.road];
 if(offset===null){
  offset=g.side*(road.width/2+(g.gutter?0.15:1.05));
 }
 const f=pedestrianFrame(g.edge);
 return {x:f.a.x+f.fx*g.s-f.fz*offset,z:f.a.z+f.fz*g.s+f.fx*offset};
}
function initializePedestrianLife(){
 for(const p of peds)scene.remove(p.mesh);peds.length=0;
 const eligible=pedestrianEdges(),near=eligible.filter(e=>Math.hypot(ASSYUT.nodes[e.a].x-ASSYUT.start.x,ASSYUT.nodes[e.a].z-ASSYUT.start.z)<230);
 // الأغلب الساحق يمشي على الرصيف، مع عبور منظم من رصيف لآخر ونسبة نادرة بجانب الرصيف.
 for(let i=0;i<82;i++){
  const family=i%7===0,couple=!family&&i%4===0,mode=i%5===0?'fast':i%4===0?'slow':'normal';
  const pool=i<55&&near.length?near:eligible,edge=pool[i%pool.length],f=pedestrianFrame(edge);
  const gutter=i===11||i===43;
  const canCross=!family&&(i%7===1);
  const crossIn=canCross?(i===1?12:(35+(i*9)%75)):999999;
  const speed=family?.85:mode==='fast'?1.85:mode==='slow'?.75:1.25;
  const g={id:i,edge,s:4+(i*3.7)%Math.max(1,f.len-8),side:i%2===0?1:-1,speed,state:'walk',gutter,crossIn,crossProgress:0,waitTime:0,members:[],family,mode,canCross};
  const count=family?4:couple?2:1;
  for(let j=0;j<count;j++){
   const child=family&&j>=2,mesh=makePerson(pick(SHIRTS),pick(SKIN));mesh.scale.setScalar(child?.65:1.0);scene.add(mesh);
   const fVec={x:f.fx,z:f.fz};
   const spread=(j%2-.5)*.42,behind=Math.floor(j/2)*.65;
   const base=groupPosition(g);
   const px=base.x-fVec.x*behind-fVec.z*spread,pz=base.z-fVec.z*behind+fVec.x*spread;
   mesh.position.set(px,.18,pz);
   const p={mesh,speed:g.speed,phase:(i*1.3+j*.9)%6.28,child,life:g,member:j};peds.push(p);g.members.push(p);
  }
  WALKING_GROUPS.push(g);
 }
}
function crossingSafe(g){
 const f=pedestrianFrame(g.edge),center=groupPosition(g,0),width=ASSYUT.roads[g.edge.road].width;
 const crossesIn=width/Math.max(.5,g.speed)+1.1;
 for(const t of traffic){const dx=t.mesh.position.x-center.x,dz=t.mesh.position.z-center.z,along=dx*f.fx+dz*f.fz,across=-dx*f.fz+dz*f.fx;if(Math.abs(across)>width/2+2||Math.abs(along)>60)continue;const toward=(Math.cos(t.mesh.rotation.y)*f.fx-Math.sin(t.mesh.rotation.y)*f.fz)*along<0;if(toward&&t.speed>.8&&Math.abs(along)<Math.max(8,Math.min(5,crossesIn)*t.speed+4))return false;}
 const dx=car.x-center.x,dz=car.z-center.z,along=dx*f.fx+dz*f.fz,across=-dx*f.fz+dz*f.fx,toward=(Math.cos(car.heading)*f.fx-Math.sin(car.heading)*f.fz)*along*car.speed<0;
 if(typeof G!=='undefined'&&G.mode==='police'&&typeof POLICE!=='undefined'&&POLICE.siren&&Math.hypot(dx,dz)<50)return false;
 return !(Math.abs(across)<width/2+2&&toward&&Math.abs(car.speed)>.8&&Math.abs(along)<Math.max(10,Math.abs(car.speed)*4));
}
function updateAssyutPeds(dt){
 for(const g of WALKING_GROUPS){
  let f=pedestrianFrame(g.edge),moving=g.state!=='wait';
  if(g.state==='walk'){
   g.s+=g.speed*dt;g.crossIn-=dt;
   if(g.s>f.len-1){
    const choices=ASSYUT.adj[g.edge.b].map(a=>ASSYUT.edges[a.edge]).filter(e=>{if(e.b===g.edge.a||ASSYUT.roads[e.road].width<4)return false;if(INFRA?.profiles&&INFRA.profiles.has(e.road))return false;const na=ASSYUT.nodes[e.a],nb=ASSYUT.nodes[e.b];if(assyutRoadHeightAt(na.x,na.z)>0.35||assyutRoadHeightAt(nb.x,nb.z)>0.35)return false;return true;});
    if(choices.length&&Math.random()<.75){
     g.edge=pick(choices);g.s=1.2;f=pedestrianFrame(g.edge);
     const newBase=groupPosition(g);for(const p of g.members){p.mesh.position.x=newBase.x;p.mesh.position.z=newBase.z;}
    }else{
     const reverse=ASSYUT.adj[g.edge.b].map(a=>ASSYUT.edges[a.edge]).find(e=>{if(e.b!==g.edge.a)return false;if(INFRA?.profiles&&INFRA.profiles.has(e.road))return false;const na=ASSYUT.nodes[e.a],nb=ASSYUT.nodes[e.b];if(assyutRoadHeightAt(na.x,na.z)>0.35||assyutRoadHeightAt(nb.x,nb.z)>0.35)return false;return true;});
     if(reverse){
      g.edge=reverse;g.s=1.2;f=pedestrianFrame(g.edge);
      const newBase=groupPosition(g);for(const p of g.members){p.mesh.position.x=newBase.x;p.mesh.position.z=newBase.z;}
     }else{
      g.s=f.len-1.2;g.speed=-Math.abs(g.speed);
     }
    }
   }else if(g.s<1.2&&g.speed<0){
    g.speed=Math.abs(g.speed);g.s=1.2;
   }
   if(g.canCross&&g.crossIn<=0&&f.len>22&&g.s>7&&g.s<f.len-7){g.state='wait';g.crossIn=rand(50,110);g.waitTime=0;g.gutter=false;}
  }else if(g.state==='wait'){
   g.waitTime+=dt;moving=false;
   if(crossingSafe(g)){g.state='cross';g.crossProgress=0;STREET_LIFE.pedestrianYields++;}
   else if(g.waitTime>16){g.state='walk';g.crossIn=rand(30,60);}
  }else if(g.state==='cross'){
   const road=ASSYUT.roads[g.edge.road],width=road.width+2.1;
   g.crossProgress+=Math.max(1.3,g.speed*1.3)*dt/width;
   if(g.crossProgress>=1){g.side*=-1;g.state='walk';g.crossProgress=0;}
  }
  const road=ASSYUT.roads[g.edge.road];
  const sidewalkOffset=g.side*(road.width/2+(g.gutter?0.15:1.05));
  const offset=g.state==='cross'?sidewalkOffset*(1-2*g.crossProgress):sidewalkOffset;
  const base=groupPosition(g,offset);
  const direction=g.state==='cross'?{x:f.fz*g.side,z:-f.fx*g.side}:{x:f.fx,z:f.fz};
  for(const p of g.members){
   const member=p.member,spread=(member%2-.5)*.42,behind=Math.floor(member/2)*.65;
   const tx=base.x-direction.x*behind-direction.z*spread,tz=base.z-direction.z*behind+direction.x*spread;
   const dx=tx-p.mesh.position.x,dz=tz-p.mesh.position.z,dist=Math.hypot(dx,dz),step=Math.min(dist,Math.max(.6,g.speed*(p.child?1.15:1.1))*dt*2.5);
   if(dist>.01){
    p.mesh.position.x+=dx/dist*step;
    p.mesh.position.z+=dz/dist*step;
    const targetRot=Math.atan2(dx,dz);
    let rotDiff=(targetRot-p.mesh.rotation.y)%(Math.PI*2);
    if(rotDiff>Math.PI)rotDiff-=Math.PI*2;
    if(rotDiff<-Math.PI)rotDiff+=Math.PI*2;
    p.mesh.rotation.y+=rotDiff*(1-Math.exp(-dt*9.5));
   }
   const near=Math.hypot(p.mesh.position.x-car.x,p.mesh.position.z-car.z);
   if(near<2.5&&Math.abs(car.speed)>1){const awayX=p.mesh.position.x-car.x,awayZ=p.mesh.position.z-car.z,n=Math.max(.01,Math.hypot(awayX,awayZ));p.mesh.position.x+=awayX/n*dt*2;p.mesh.position.z+=awayZ/n*dt*2;if(car.hitCd<=0){car.hitCd=.8;sfxThud();setObjective('انتبه للمشاة · خفّف السرعة',1800);}}
   const walkBob=moving?Math.abs(Math.sin(p.phase*2))*.026:0;
   p.mesh.rotation.x=moving?.038:0;
   p.mesh.rotation.z=moving?Math.sin(p.phase)*.022:0;
   const elevation=g.state==='cross'?lerp(.18,.028,Math.sin(Math.min(1,Math.max(0,g.crossProgress))*Math.PI)):(g.gutter?.03:.18);
   const rh=assyutRoadHeightAt(p.mesh.position.x,p.mesh.position.z);
   const groundH=(rh>0&&rh<0.4)?rh:0;
   p.mesh.position.y=groundH+elevation+walkBob;
   p.phase+=moving?dt*g.speed*6:0;
   if(near<90)animatePerson(p.mesh,p.phase,moving?1:0);
  }
 }
}
initializePedestrianLife();

/* ========================= 60-traffic.js ========================= */
/* ------------------------- الترافيك ------------------------- */
const traffic = [];

const TRAFFIC_GEO = new Map();
const TRAFFIC_DIMS = {
  car: [2.12, .93],
  modern: [2.16, .95],
  micro: [2.50, 1.00],
  tuktuk: [1.35, .68],
  bus: [4.35, 1.19],
  tram: [5.40, 1.15],
};

function buildTrafficGeos(kind) {
  if (kind === 'tuktuk') {
    return {
      body: extrudeSide([
        [-1.25, .36], [-1.32, .64], [-1.26, 1.56], [-.25, 1.66],
        [.65, 1.62], [1.10, 1.10], [1.28, .66], [1.22, .36],
      ], 1.28, .04),
      chassis: extrudeSide([
        [-1.18, .20], [-1.24, .34], [1.18, .34], [1.14, .20],
      ], 1.18, .03),
      band: new THREE.BoxGeometry(1.15, .45, 1.32),
      bandY: 1.24,
      wheel: [.26, .92, .56],
      roof: null,
    };
  }
  if (kind === 'tram') {
    return {
      body: extrudeSide([
        [-5.25, .48], [-5.35, .75], [-5.30, 2.75], [-4.95, 3.02],
        [4.95, 3.02], [5.30, 2.75], [5.35, .75], [5.25, .48],
      ], 2.24, .06),
      chassis: extrudeSide([
        [-5.10, .18], [-5.18, .35], [-5.16, .50], [5.16, .50], [5.18, .35], [5.10, .18],
      ], 1.98, .04),
      band: new THREE.BoxGeometry(9.6, .88, 2.27),
      bandY: 2.08,
      stripe: new THREE.BoxGeometry(10.5, .28, 2.28),
      stripeY: 1.25,
      wheel: [.36, 3.8, .92],
      roof: null,
    };
  }
  if (kind === 'bus') {
    return {
      body: extrudeSide([
        [-4.18, .92], [-4.30, 1.08], [-4.30, 2.50], [-3.94, 2.82],
        [3.94, 2.82], [4.30, 2.50], [4.30, 1.08], [4.18, .92],
      ], 2.32, .07),
      chassis: extrudeSide([
        [-4.06, .26], [-4.14, .50], [-4.14, .94], [4.14, .94], [4.14, .50], [4.06, .26],
      ], 2.04, .05),
      band: new THREE.BoxGeometry(7.44, .82, 2.34),
      bandY: 2.06,
      wheel: [.50, 2.86, 1.06],
      roof: null,
    };
  }
  if (kind === 'micro') {
    return {
      body: extrudeSide([
        [-2.40, .54], [-2.45, .72], [-2.43, 1.66], [-2.06, 1.84],
        [1.98, 1.84], [2.36, 1.60], [2.45, .72], [2.40, .54],
      ], 1.94, .06),
      chassis: extrudeSide([
        [-2.30, .24], [-2.37, .42], [-2.36, .56], [2.36, .56], [2.37, .42], [2.30, .24],
      ], 1.62, .04),
      band: new THREE.BoxGeometry(3.86, .54, 1.96),
      bandY: 1.38,
      stripe: new THREE.BoxGeometry(4.74, .18, 1.96),
      stripeY: .94,
      wheel: [.36, 1.60, .88],
      roof: null,
    };
  }
  if (kind === 'modern') {
    return {
      body: extrudeSide([
        [-2.06, .46], [-2.12, .64], [-2.02, .88], [-1.32, .94],
        [1.12, .90], [1.96, .74], [2.14, .58], [2.10, .44],
      ], 1.84, .05),
      chassis: extrudeSide([
        [-1.96, .22], [-2.02, .36], [-2.00, .48], [2.00, .48], [2.04, .36], [1.96, .22],
      ], 1.56, .03),
      cabin: extrudeSide([[-1.48, .88], [-.88, 1.36], [.28, 1.37], [1.02, .86]], 1.62, .03),
      roof: new THREE.BoxGeometry(1.18, .045, 1.56),
      wheel: [.35, 1.36, .83],
      band: null,
    };
  }
  // سيدان كلاسيك (مرسيدس W123 / لادا)
  return {
    body: extrudeSide([
      [-2.08, .48], [-2.12, .72], [-2.04, .88], [-1.36, .91],
      [1.08, .90], [1.98, .84], [2.10, .64], [2.06, .48],
    ], 1.80, .04),
    chassis: extrudeSide([
      [-1.96, .24], [-2.02, .38], [-2.00, .50], [2.00, .50], [2.02, .38], [1.96, .24],
    ], 1.54, .03),
    cabin: extrudeSide([[-1.42, .88], [-1.00, 1.41], [.32, 1.42], [.96, .88]], 1.60, .03),
    roof: new THREE.BoxGeometry(1.30, .05, 1.56),
    wheel: [.34, 1.32, .81],
    band: null,
  };
}

function makeTrafficCar(kind, color) {
  const g = new THREE.Group();
  const geo = TRAFFIC_GEO.get(kind) || (() => {
    const built = buildTrafficGeos(kind);
    TRAFFIC_GEO.set(kind, built);
    return built;
  })();

  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: .3, metalness: .35, clearcoat: .85, clearcoatRoughness: .2, envMapIntensity: .7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: .55, metalness: .35 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dfe6, roughness: .16, metalness: .92 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x122230, roughness: .08, metalness: .76,
    emissive: 0x060f16, emissiveIntensity: .38,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0e0e11, roughness: .95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc2cbd4, roughness: .22, metalness: .9 });

  if (kind === 'car' || kind === 'modern') detailVehicle(g, 4.2, 1.84);
  const body = new THREE.Mesh(geo.body, paint);
  body.castShadow = true;
  g.add(body);

  if (geo.chassis) {
    const ch = new THREE.Mesh(geo.chassis, dark);
    ch.castShadow = true;
    g.add(ch);
  }

  if (geo.cabin) {
    const cab = new THREE.Mesh(geo.cabin, glassMat);
    cab.castShadow = true;
    g.add(cab);
    if (geo.roof) {
      const roof = new THREE.Mesh(geo.roof, paint);
      roof.position.set(-.34, 1.40, 0);
      g.add(roof);
    }
  }
  if (geo.band) {
    const bandMat = kind === 'tram'
      ? new THREE.MeshStandardMaterial({ color: 0x264458, emissive: 0xffd28a, emissiveIntensity: .42, roughness: .15 })
      : glassMat;
    const band = new THREE.Mesh(geo.band, bandMat);
    band.position.y = geo.bandY;
    g.add(band);
  }
  if (geo.stripe) {
    const stCol = kind === 'tram' ? 0xf2c21a : 0x1e4d8c;
    const stripe = new THREE.Mesh(geo.stripe, new THREE.MeshStandardMaterial({ color: stCol, roughness: .45 }));
    stripe.position.y = geo.stripeY;
    g.add(stripe);
  }

  // لمسات إضافية حسب النوع (شبك كروم للكلاسيك، سبور للحديثة، قوس كهربا للترام)
  if (kind === 'car') {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(.05, .28, .66), chrome);
    grille.position.set(2.08, .68, 0);
    g.add(grille);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.18, .10, 1.82), chrome);
    bar.position.set(2.05, .39, 0);
    g.add(bar);
    const rbar = new THREE.Mesh(new THREE.BoxGeometry(.18, .10, 1.82), chrome);
    rbar.position.set(-2.07, .39, 0);
    g.add(rbar);
  } else if (kind === 'modern') {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(.06, .22, .94), dark);
    grille.position.set(2.12, .56, 0);
    g.add(grille);
  }
  if ((kind === 'car' || kind === 'modern') && typeof createEgyptianLicensePlateTexture === 'function' && typeof createLicensePlateMesh === 'function') {
    const pTex = createEgyptianLicensePlateTexture();
    const pMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: .35, metalness: .1 });
    const fp = createLicensePlateMesh(pMat, .44, .22);
    const rp = createLicensePlateMesh(pMat, .44, .22);
    fp.position.set(2.14, .38, 0); fp.rotation.y = Math.PI / 2; g.add(fp);
    rp.position.set(-2.14, .48, 0); rp.rotation.y = -Math.PI / 2; g.add(rp);
  } else if (kind === 'tram') {
    // بانتوجراف الترام (قوس الكهربا للسلك العلوي)
    const pant1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, .08, .08), chrome);
    pant1.position.set(0, 4.1, 0); pant1.rotation.z = .65;
    const pant2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, .08, .08), chrome);
    pant2.position.set(0, 5.1, 0); pant2.rotation.z = -.65;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(.25, .06, 1.1), chrome);
    shoe.position.set(0, 5.95, 0);
    g.add(pant1, pant2, shoe);
  }

  const [wr, wx, wz] = geo.wheel;
  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      if (kind === 'tuktuk' && sx > 0 && sz > 0) continue;
      const steer = new THREE.Group();
      steer.position.set(sx * wx, wr, kind === 'tuktuk' && sx > 0 ? 0 : sz * wz);
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, .22, 14), tireMat);
      tire.rotation.x = Math.PI / 2;
      wg.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wr * .60, wr * .60, .235, 12), rimMat);
      rim.rotation.x = Math.PI / 2;
      wg.add(rim);
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(wr * 1.05, .045, .245), tireMat);
      wg.add(spoke);
      steer.add(wg);
      g.add(steer);
      wheels.push({ steer, spin: wg, radius: wr, front: sx > 0 });
    }
  }
  g.userData.wheels = wheels;

  const halfL = kind === 'tram' ? 5.3 : kind === 'bus' ? 4.3 : kind === 'micro' ? 2.45 : kind === 'tuktuk' ? 1.28 : kind === 'modern' ? 2.12 : 2.08;
  const halfW = kind === 'tram' ? 1.12 : kind === 'bus' ? 1.16 : kind === 'micro' ? .97 : kind === 'tuktuk' ? .64 : .91;
  const lightY = kind === 'tram' ? .82 : kind === 'bus' ? .72 : kind === 'micro' ? .74 : kind === 'tuktuk' ? .58 : kind === 'modern' ? .62 : .68;

  // كشافات أمامية ومصابيح خلفية
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(.05, .15, .34),
      new THREE.MeshBasicMaterial({ color: 0xfff5d4 }));
    hl.position.set(halfL - .02, lightY, s * halfW * .64);
    g.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(.05, .14, .30),
      new THREE.MeshBasicMaterial({ color: 0xff2828 }));
    tl.position.set(-halfL + .02, lightY, s * halfW * .64);
    g.add(tl);
  }

  g.userData.paint = color;
  g.userData.modelKey=kind==='modern'?pick(['qashqai','sentra18','epower','versa','xtrail','altima','sport370','roadster']):kind==='micro'?pick(['traffic_hiace','traffic_sprinter']):kind==='bus'?'traffic_bus3d':kind==='tuktuk'?'traffic_tuktuk':pick(['fiat1300','micra','versa','sentra18']);
  return g;
}

const TRAFFIC_COLORS = [0xc9b478, 0xb8bec6, 0x2c3440, 0xd94f3d, 0x3d6bd9, 0x3f8f6b, 0x736c62, 0xe8e8e8, 0x4a6b8a];

function addTraffic(kind, color, axis, c, lane, dir, pos) {
  const mesh = makeTrafficCar(kind, color);
  if (axis === 'x') {
    mesh.position.set(pos, 0, c + lane);
    mesh.rotation.y = dir > 0 ? 0 : Math.PI;
  } else {
    mesh.position.set(c + lane, 0, pos);
    mesh.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  scene.add(mesh);
  const spd = kind === 'tram' ? 11 : kind === 'bus' ? rand(7, 10) : kind === 'micro' ? rand(8, 13) : rand(9, 17);
  traffic.push({
    mesh, axis, c, lane, dir, kind,
    hl: TRAFFIC_DIMS[kind][0], hw: TRAFFIC_DIMS[kind][1],
    speed: spd, baseSpeed: spd, honkBoost: 0,
  });
}

// كورنيش
for (let i = 0; i < 34; i++) {
  const r = Math.random();
  const kind = r < .08 ? 'bus' : r < .24 ? 'micro' : r < .42 ? 'tuktuk' : r < .72 ? 'modern' : 'car';
  const color = kind === 'micro' ? 0xe9e9e9 : kind === 'tuktuk' ? 0x16181e : pick(TRAFFIC_COLORS);
  const dir = Math.random() < .5 ? 1 : -1;
  const lane = dir > 0 ? pick([4.2, 9.4, 14.2]) : pick([-4.2, -9.4, -14.2]);
  addTraffic(kind, color, 'x', 0, lane, dir, rand(-HALF + 40, HALF - 40));
}

// شوارع داخل البلد (أفقي)
const INLAND_TRAFFIC_LINES = [
  { z: 64,  half: 5.5, n: 4, speedLanes: [2.6] },
  { z: 140, half: 11,  n: 6, speedLanes: [6.4] },
  { z: 210, half: 5,   n: 4, speedLanes: [2.4] },
  { z: 274, half: 12,  n: 6, speedLanes: [5.0] },
];
for (const line of INLAND_TRAFFIC_LINES) {
  for (let i = 0; i < line.n; i++) {
    const r = Math.random();
    const kind = r < .08 ? 'bus' : r < .26 ? 'micro' : r < .62 ? 'modern' : 'car';
    const color = kind === 'micro' ? 0xe9e9e9 : pick(TRAFFIC_COLORS);
    const dir = Math.random() < .5 ? 1 : -1;
    const lane = dir * pick(line.speedLanes);
    addTraffic(kind, color, 'x', line.z, lane, dir, rand(-HALF + 60, HALF - 60));
  }
}

// شوارع رأسية واسعة
for (const vx of [-960, -480, 0, 480, 960]) {
  for (let i = 0; i < 3; i++) {
    const kind = Math.random() < .25 ? 'micro' : Math.random() < .6 ? 'modern' : 'car';
    const dir = Math.random() < .5 ? 1 : -1;
    const lane = dir * 4.8;
    addTraffic(kind, pick(TRAFFIC_COLORS), 'z', vx, lane, dir, rand(30, CITY_Z1 - 20));
  }
}

/* ========================= 61-street-life.js ========================= */
/* Traffic follows the directed OSM road graph, in metres and seconds. */
const STREET_LIFE={time:0,overtakes:0,stops:0,pedestrianYields:0,version:3,blockedMoves:0};
function lifeRoad(edge){return ASSYUT.roads[edge.road];}
function edgeFrame(edge){const a=ASSYUT.nodes[edge.a],b=ASSYUT.nodes[edge.b],length=Math.hypot(b.x-a.x,b.z-a.z);return {a,b,length,fx:(b.x-a.x)/length,fz:(b.z-a.z)/length};}
const TRAFFIC_MODELS_EXTRA=['traffic_peugeot405','traffic_corolla','traffic_logan','traffic_lada','traffic_tucson','traffic_hilux','traffic_sprinter','traffic_hiace'];
function chooseNextEdge(t){
 const choices=ASSYUT.adj[t.edge.b].map(a=>ASSYUT.edges[a.edge]).filter(e=>e&&ASSYUT.roads[e.road].width>=(t.kind==='bus'?10:6));
 const forward=choices.filter(e=>e.b!==t.edge.a),list=forward.length?forward:choices;
 if(!list.length)return null;
 const old=edgeFrame(t.edge);
 const scored=list.map(e=>{const f=edgeFrame(e),dot=old.fx*f.fx+old.fz*f.fz;return {e,dot,score:dot+Math.random()*.75};}).filter(x=>x.dot>-.55);
 const pool=scored.length?scored:list.map(e=>{const f=edgeFrame(e);return {e,dot:0,score:old.fx*f.fx+old.fz*f.fz+Math.random()*.75};});
 pool.sort((a,b)=>b.score-a.score);
 return Math.random()<.22?pick(pool).e:pool[0].e;
}
function makeStreetRider(bicycle=true){
 const rider=makePerson(pick(SHIRTS),pick(SKIN));
 rider.scale.setScalar(.92);rider.rotation.order='YXZ';rider.rotation.y=Math.PI/2;rider.rotation.x=bicycle?.24:.16;
 rider.position.set(bicycle?-.18:-.16,bicycle?.01:-.04,0);
 const rig=rider.userData.walk;
 if(rig)for(let i=0;i<2;i++){rig.arms[i].rotation.x=bicycle?-1.18:-1.05;rig.legs[i].rotation.x=-.95;rig.knees[i].rotation.x=1.25;}
 rider.userData.cycleBicycle=bicycle;
 return rider;
}
function animateStreetRider(rider,phase,bicycle){
 const rig=rider?.userData?.walk;if(!rig)return;
 const tilt=bicycle?.24:.16,hx=bicycle?-.18:-.16,hy=bicycle?.82:.76,cx=bicycle?.03:.08,cy=bicycle?.33:.28,cr=bicycle?.135:.025;
 const L1=.375,L2=.380;
 for(let i=0;i<2;i++){
  const ph=phase+(i===0?0:Math.PI),px=cx+Math.cos(ph)*cr,py=cy+Math.sin(ph)*cr;
  const dx=px-hx,dy=py-hy,d=clamp(Math.hypot(dx,dy),.20,L1+L2-.02);
  const gamma=Math.atan2(dx,-dy),delta=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1));
  const interior=Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1));
  rig.legs[i].rotation.x=-(gamma+delta)-tilt;
  rig.knees[i].rotation.x=Math.PI-interior;
 }
}
function makeTwoWheeler(kind,color){
 const g=new THREE.Group(),bicycle=kind==='bicycle',r=bicycle?.35:.30,wb=bicycle?1.12:1.30;
 const rubber=new THREE.MeshStandardMaterial({color:0x15191a,roughness:.9}),metal=new THREE.MeshStandardMaterial({color:0xaab1b4,metalness:.8,roughness:.32}),paint=new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.3});
 const wheels=[];for(const x of [-wb/2,wb/2]){const w=new THREE.Group();w.position.set(x,r,0);const tire=new THREE.Mesh(new THREE.TorusGeometry(r,bicycle?.025:.075,8,24),rubber);w.add(tire);const rim=new THREE.Mesh(new THREE.TorusGeometry(r-.045,.012,6,24),metal);w.add(rim);for(let j=0;j<12;j++){const spoke=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,r*1.8,4),metal);spoke.rotation.z=j*Math.PI/6;w.add(spoke);}g.add(w);wheels.push(w);}
 const bar=(a,b,rad=.020,mat=paint)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,v.length(),8),mat);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(m);return m;};
 const seatTop=bicycle?.81:.76,bb=bicycle?[0.03,0.33,0]:[0.05,0.33,0];
 for(const [a,b]of [[[-wb/2,r,0],[-.14,.78,0]],[[-.14,.78,0],bb],[bb,[-wb/2,r,0]],[[-.14,.78,0],[.38,.84,0]],[[.38,.84,0],bb],[[.38,.84,0],[wb/2,r,0]]])bar(a,b);
 bar([-.14,.76,0],[-.17,seatTop,0],.016,metal);
 bar([.38,.84,0],[.44,.99,0],.018,metal);bar([.44,.99,-.24],[.44,.99,.24],.016,metal);
 for(const side of [-1,1]){const grip=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.10,8),rubber);grip.rotation.x=Math.PI/2;grip.position.set(.44,.99,side*.21);g.add(grip);}
 const saddle=new THREE.Mesh(new THREE.BoxGeometry(.30,.07,.17),rubber);saddle.position.set(-.18,seatTop+.02,0);g.add(saddle);
 let crank=null,pedals=[];
 if(bicycle){
  crank=new THREE.Group();crank.position.set(...bb);
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.014,14),metal);ring.rotation.x=Math.PI/2;crank.add(ring);
  for(const [side,ang]of [[-1,0],[1,Math.PI]]){
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.135,.018,.014),metal);arm.position.set(Math.cos(ang)*.067,Math.sin(ang)*.067,side*.085);arm.rotation.z=ang;crank.add(arm);
   const pad=new THREE.Mesh(new THREE.BoxGeometry(.08,.018,.055),rubber);pad.position.set(Math.cos(ang)*.135,Math.sin(ang)*.135,side*.12);crank.add(pad);pedals.push(pad);
  }
  g.add(crank);
 }else{const engine=new THREE.Mesh(new THREE.BoxGeometry(.42,.33,.34),metal);engine.position.set(0,.47,0);g.add(engine);const tank=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),paint);tank.scale.set(.28,.16,.23);tank.position.set(.18,.80,0);g.add(tank);bar([-.65,.4,.23],[-.12,.35,.23],.055,metal);}
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(bicycle?.045:.09,12,8),new THREE.MeshStandardMaterial({color:0xfff1ce,emissive:0xffc96b,emissiveIntensity:.8}));lamp.position.set(.48,.92,0);g.add(lamp);
 const rider=makeStreetRider(bicycle);animateStreetRider(rider,0,bicycle);g.add(rider);g.userData={paint:color,wheels,rider,crank,pedals,twoWheeler:true};return g;
}
function initializeStreetTraffic(){
 for(const t of traffic)scene.remove(t.mesh);traffic.length=0;
 const eligible=ASSYUT.edges.filter(e=>lifeRoad(e).width>=5&&e.length>9),near=eligible.filter(e=>Math.hypot(ASSYUT.nodes[e.a].x-ASSYUT.start.x,ASSYUT.nodes[e.a].z-ASSYUT.start.z)<260);
 let carSequence=0,extraSequence=0;
 const civilianUploaded=UPLOADED_CAR_DEFINITIONS.filter(d=>!d.police);
 // كثافة أعلى حتى لا تبدو شبكة أسيوط مهجورة، مع الحفاظ على التوزيع العشوائي.
 for(let i=0;i<170;i++){
  const r=Math.random(),kind=i===0?'bicycle':i===1?'motorcycle':r<.10?'bicycle':r<.21?'motorcycle':r<.27?'tuktuk':r<.37?'micro':r<.42?'bus':r<.71?'modern':'car';
  const color=kind==='tuktuk'?0x16181e:pick(TRAFFIC_COLORS),mesh=['bicycle','motorcycle'].includes(kind)?makeTwoWheeler(kind,color):makeTrafficCar(kind,color);
  const pool=(i<90&&near.length?near:eligible).filter(e=>kind!=='bus'||lifeRoad(e).width>=10),edge=pick(pool.length?pool:eligible),frame=edgeFrame(edge),s=rand(0,frame.length),width=lifeRoad(edge).width,offset=kind==='bicycle'?Math.max(.4,width/2-.65):Math.min(width*.26,2.3);
  const y=infrastructureEdgeHeight(edge,s),p={x:frame.a.x+frame.fx*s-frame.fz*offset,z:frame.a.z+frame.fz*s+frame.fx*offset};
  const hl=kind==='bicycle'?.90:kind==='motorcycle'?1.02:TRAFFIC_DIMS[kind][0],hw=kind==='bicycle'?.36:kind==='motorcycle'?.41:TRAFFIC_DIMS[kind][1];
  if(!trafficFootprintClear(p.x,p.z,Math.atan2(-frame.fz,frame.fx),hl+.45,hw+.12,y))continue;
  if(traffic.some(t=>Math.hypot(t.mesh.position.x-p.x,t.mesh.position.z-p.z)<8.5&&Math.abs((t.mesh.position.y||0)-y)<2.5))continue;
  if(kind==='car'||kind==='modern'){
   if(carSequence<civilianUploaded.length)mesh.userData.modelKey=civilianUploaded[carSequence++].asset;
   else if(extraSequence++%5<3)mesh.userData.modelKey=TRAFFIC_MODELS_EXTRA[(extraSequence-1)%TRAFFIC_MODELS_EXTRA.length];
   else mesh.userData.modelKey=civilianUploaded[carSequence++%civilianUploaded.length].asset;
  }else if(kind==='micro'){
   mesh.userData.modelKey=Math.random()<.60?'traffic_hiace':'traffic_sprinter';
  }else if(kind==='tuktuk')mesh.userData.modelKey='traffic_tuktuk';
  else if(kind==='motorcycle')mesh.userData.modelKey='traffic_moped';
  else if(kind==='bicycle')mesh.userData.modelKey='traffic_bicycle';
  else if(kind==='bus')mesh.userData.modelKey='traffic_bus3d';
  mesh.rotation.order='YZX';
  mesh.position.set(p.x,y,p.z);mesh.rotation.y=Math.atan2(-frame.fz,frame.fx);scene.add(mesh);
  const roll=Math.random(),mKey=mesh.userData.modelKey||'';
  let style='normal';
  if(kind==='micro'||kind==='motorcycle'||/sport|roadster|sprinter|hilux/i.test(mKey)){style=roll<.55?'aggressive':(roll<.85?'normal':'cautious');}
  else if(kind==='tuktuk'){style=roll<.55?'nimble':(roll<.85?'normal':'cautious');}
  else if(kind==='bus'||/lada|fiat1300/i.test(mKey)){style=roll<.45?'cautious':'normal';}
  else{style=roll<.28?'aggressive':(roll<.58?'cautious':'normal');}

  let speed,personality,accel,laneRate;
  if(style==='aggressive'){
   speed=kind==='motorcycle'?rand(10.5,15.5):rand(10,14.5);personality=rand(1.15,1.35);accel=rand(3.2,4.4);laneRate=rand(3.0,4.4);
  }else if(style==='cautious'){
   speed=kind==='bicycle'?rand(2.2,3.8):kind==='bus'?rand(4.5,6.5):rand(5,7.2);personality=rand(.75,.90);accel=rand(1.2,1.8);laneRate=1.3;
  }else if(style==='nimble'){
   speed=rand(5.5,8.5);personality=rand(.95,1.2);accel=rand(2.2,3.2);laneRate=rand(3.4,4.8);
  }else{
   speed=kind==='bicycle'?rand(2.8,5.3):kind==='bus'?rand(5,8):kind==='tuktuk'?rand(4.5,7.8):kind==='motorcycle'?rand(7,12):rand(6.5,10.5);personality=rand(.92,1.12);accel=rand(1.9,2.6);laneRate=rand(1.6,2.2);
  }
  traffic.push({mesh,kind,edge,s,offset,laneTarget:offset,dir:1,hl,hw,speed,baseSpeed:speed,honkBoost:0,decision:rand(2,8),stopTime:0,stopAt:null,laneTimer:0,personality,yielding:false,pedalPhase:rand(0,6.28),style,accel,laneRate,flashTimer:0,stuckTimer:0,weavePhase:rand(0,6.28)});
 }
}
function streetAhead(t,point){const f=edgeFrame(t.edge),dx=point.x-t.mesh.position.x,dz=point.z-t.mesh.position.z;return {along:dx*f.fx+dz*f.fz,across:-dx*f.fz+dz*f.fx};}
function safePassingLane(t,target){
 const tx=t.mesh.position.x,tz=t.mesh.position.z,ty=t.mesh.position.y||0;
 return !traffic.some(o=>{
  if(o===t||Math.abs((o.mesh.position.y||0)-ty)>2.2)return false;
  const dx=o.mesh.position.x-tx,dz=o.mesh.position.z-tz;
  if(Math.abs(dx)>36||Math.abs(dz)>36)return false;
  const q=streetAhead(t,o.mesh.position);
  return q.along>-15&&q.along<32&&Math.abs((t.offset+q.across)-target)<t.hw+o.hw+.5;
 });
}
const _trafficDesired = new THREE.Vector3();
const _trafficCandidate = new THREE.Vector3();

function updateAssyutTraffic(dt){
 STREET_LIFE.time+=dt;
 for(const t of traffic){
  const before={edge:t.edge,s:t.s,offset:t.offset,heading:t.mesh.rotation.y};
  const f=edgeFrame(t.edge),road=lifeRoad(t.edge),remaining=f.length-t.s;
  const tx=t.mesh.position.x,tz=t.mesh.position.z,ty=t.mesh.position.y||0;
  const isFar=Math.abs(tx-car.x)>150||Math.abs(tz-car.z)>150;

  if(isFar){
   let farDist=0;
   if(t.stopAt!==null){
    const gap=t.stopAt-t.s;
    if(gap<.45&&t.speed<.4){
     t.stopTime-=dt;
     if(!t.stoppedCounted){STREET_LIFE.stops++;t.stoppedCounted=true;}
     if(t.stopTime<=0){t.stopAt=null;t.stoppedCounted=false;}
    }else{
     t.speed=Math.max(0,Math.min(t.speed,Math.sqrt(9*Math.max(0,gap))));
     farDist=t.speed*dt;t.s+=farDist;
    }
   }else{
    farDist=t.speed*dt;t.s+=farDist;
   }
   if(farDist>0){
    if(t.mesh.userData.twoWheeler){
     const rWheel=t.kind==='bicycle'?.35:.30;
     for(const w of t.mesh.userData.wheels||[])w.rotation.z-=farDist/rWheel;
     if(t.kind==='bicycle'){
      t.pedalPhase=(t.pedalPhase||0)+farDist/.24;
      if(t.mesh.userData.crank){t.mesh.userData.crank.rotation.z=-t.pedalPhase;for(const p of t.mesh.userData.pedals||[])p.rotation.z=t.pedalPhase;}
      if(typeof animateStreetRider==='function')animateStreetRider(t.mesh.userData.rider,t.pedalPhase,true);
      if(t.mesh.userData.riderDetail&&typeof animateCycleRider==='function')animateCycleRider(t.mesh.userData.riderDetail,t.pedalPhase);
     }
    }else{
     for(const list of [t.mesh.userData.wheels,t.mesh.userData.farWheels]){
      if(!list)continue;
      for(const w of list)if(w.spin)w.spin.rotation.z-=farDist/(w.radius||.32);
     }
    }
   }
   if(t.s>=f.length){
    const next=chooseNextEdge(t);
    if(next){t.s-=f.length;t.edge=next;}
    else t.s=0;
   }
   const nf=edgeFrame(t.edge);
   t.mesh.position.set(nf.a.x+nf.fx*t.s-nf.fz*t.offset,infrastructureEdgeHeight(t.edge,t.s),nf.a.z+nf.fz*t.s+nf.fx*t.offset);
   t.mesh.rotation.y=Math.atan2(-nf.fz,nf.fx);
   continue;
  }

  t.honkBoost=Math.max(0,t.honkBoost-dt);t.laneTimer=Math.max(0,t.laneTimer-dt);t.decision-=dt;
  if(t.decision<=0){t.decision=rand(7,18);if(t.stopAt===null&&remaining>25&&Math.random()<(t.kind==='micro'?.32:.055)){t.stopAt=Math.min(f.length-7,t.s+rand(10,24));t.stopTime=rand(2,5);}}
  let target=t.baseSpeed*t.personality,nearest=Infinity,leaderSpeed=target,leader=null;
  for(const o of traffic){
   if(o===t||Math.abs((o.mesh.position.y||0)-ty)>2.2)continue;
   const dx=o.mesh.position.x-tx,dz=o.mesh.position.z-tz;
   if(Math.abs(dx)>46||Math.abs(dz)>46)continue;
   const q=streetAhead(t,o.mesh.position);
   if(q.along>0&&q.along<45&&Math.abs(q.across)<t.hw+o.hw+.35&&q.along-t.hl-o.hl<nearest){
    nearest=q.along-t.hl-o.hl;leaderSpeed=o.speed;leader=o;
   }
  }
  const player=streetAhead(t,{x:car.x,z:car.z}),playerForward=Math.cos(car.heading)*f.fx-Math.sin(car.heading)*f.fz;
  if(Math.abs(car.y-ty)<=2.2&&player.along>0&&player.along<45&&Math.abs(player.across)<t.hw+vehicleParameters().halfWidth+.35&&player.along-t.hl-vehicleParameters().halfLength<nearest){nearest=player.along-t.hl-vehicleParameters().halfLength;leaderSpeed=Math.max(0,car.speed*playerForward);leader=car;}
  const wide=road.width>=11,inner=Math.min(road.width*.12,1.3),outer=Math.min(road.width*.32,3.3);
  const passDist=t.style==='aggressive'?34:27,passRatio=t.style==='aggressive'?.85:.65;
  const policeSiren=typeof G!=='undefined'&&G.mode==='police'&&typeof POLICE!=='undefined'&&POLICE.siren&&!t.policeSuspect;
  let policeYielding=false;
  if(policeSiren){
   const dxP=car.x-tx,dzP=car.z-tz,distP=Math.hypot(dxP,dzP);
   if(distP<72&&Math.abs(car.y-ty)<3.8){
    policeYielding=true;
    const curbOffset=Math.max(.65,road.width/2-t.hw-.35);
    t.laneTarget=curbOffset;
    t.laneTimer=2.5;
    t.laneRate=Math.max(t.laneRate||2.0,4.5);
    if(player.along<0&&player.along>-60){
     const yieldSpeed=Math.max(.5,t.baseSpeed*.24);
     target=Math.min(target,yieldSpeed);
     if(player.along>-16&&Math.abs(player.across)<4.2){target=Math.min(target,.2);}
    }else if(player.along>=0&&player.along<26){
     target=Math.min(target,t.baseSpeed*.38);
    }else if(playerForward<-.3&&player.along>0&&player.along<48){
     target=Math.min(target,t.baseSpeed*.48);
    }
    if(remaining<22&&distP<42){target=0;}
   }
  }
  if(!policeYielding){
   if(wide&&nearest<passDist&&leaderSpeed<t.baseSpeed*passRatio&&remaining>35&&t.laneTimer===0&&safePassingLane(t,inner)){t.laneTarget=inner;t.laneTimer=t.style==='aggressive'?rand(3.5,5.5):7;STREET_LIFE.overtakes++;}
   if(t.laneTimer===0&&t.laneTarget!==outer&&wide&&safePassingLane(t,outer))t.laneTarget=outer;
  }
  if(t.style==='nimble'||t.kind==='tuktuk'||t.kind==='motorcycle'){
   t.weavePhase=(t.weavePhase||0)+dt*rand(1.2,2.0);
   const weaveAmp=policeYielding?0:Math.min(.28,road.width*.04);
   const targetOffset=clamp(t.laneTarget+Math.sin(t.weavePhase)*weaveAmp,.4,road.width/2-t.hw-.2);
   t.offset+=(targetOffset-t.offset)*(1-Math.exp(-dt*(t.laneRate||3.6)));
  }else{
   t.offset+=(t.laneTarget-t.offset)*(1-Math.exp(-dt*(t.laneRate||1.6)));
  }
  if(Number.isFinite(nearest)){
   const gapBase=t.style==='aggressive'?1.4:t.style==='cautious'?3.2:2.2;
   const timeHeadway=t.style==='aggressive'?.78:t.style==='cautious'?1.45:1.1;
   const desired=gapBase+t.speed*timeHeadway+Math.max(0,t.speed*(t.speed-leaderSpeed)/(2*Math.sqrt(2*4.5)));
   target=Math.min(target,Math.max(0,leaderSpeed+(nearest-desired)*(t.style==='aggressive'?.85:.65)));
   if(nearest<1)target=0;
   if(t.honkCd)t.honkCd-=dt;
   if((!t.honkCd||t.honkCd<=0)&&nearest<6.5&&t.speed<.8&&Math.random()<0.006){
    t.honkCd=rand(14,32);
    if(typeof sfxTrafficHonk==='function')sfxTrafficHonk(t.kind||'modern',tx,tz);
   }
  }
  // Turning vehicles slow before the corner and yield to occupied intersections.
  if(remaining<22){
   if(!t.nextEdge)t.nextEdge=chooseNextEdge(t);
   if(t.nextEdge){const nf=edgeFrame(t.nextEdge),dot=f.fx*nf.fx+f.fz*nf.fz;target=Math.min(target,Math.sqrt(Math.max(2,2.3*(remaining+3)))*(dot<.8?.65:1));}
   else {
    // A dead-end (including a bridge approach whose far end is a barrier)
    // is a stopping point, never a valid place to drive into.
    const stopGap=Math.max(4.5,t.hl+2.8);
    target=Math.min(target,Math.sqrt(9*Math.max(0,remaining-stopGap)));
    if(remaining<=stopGap+.35)target=0;
   }
   if(ASSYUT.adj[t.edge.b].length>=3){
    const node=ASSYUT.nodes[t.edge.b],busy=traffic.some(o=>o!==t&&o!==leader&&Math.abs((o.mesh.position.y||0)-ty)<2.2&&Math.hypot(o.mesh.position.x-node.x,o.mesh.position.z-node.z)<6&&o.speed>.4);
    if(busy&&remaining>3)target=Math.min(target,Math.sqrt(5*Math.max(0,remaining-t.hl-4)));
   }
  }
  // Signal approach is shared with the player's real stop-line geometry.
  for(const light of TRAFFIC_LIGHTS)for(const a of light.approaches||[]){if(f.fx*a.fx+f.fz*a.fz<.8)continue;const q=streetAhead(t,a.stop);if(q.along<0||q.along>45||Math.abs(q.across)>road.width/2)continue;if(light[a.axis+'State']!=='green')target=Math.min(target,Math.sqrt(8*Math.max(0,q.along-t.hl-.5)));}
  t.yielding=policeYielding;
  for(const p of peds){if(p.life?.state!=='cross')continue;const q=streetAhead(t,p.mesh.position);if(q.along>0&&q.along<25&&Math.abs(q.across)<t.hw+1.1){target=Math.min(target,Math.sqrt(8*Math.max(0,q.along-t.hl-2)));t.yielding=true;}}
  if(t.stopAt!==null){const gap=t.stopAt-t.s;target=Math.min(target,Math.sqrt(9*Math.max(0,gap)));if(gap<.45&&t.speed<.4){t.stopTime-=dt;if(!t.stoppedCounted){STREET_LIFE.stops++;t.stoppedCounted=true;}if(t.stopTime<=0){t.stopAt=null;t.stoppedCounted=false;}}}
  const old=t.speed;
  const maxAccel=(t.accel||(t.kind==='bicycle'?.9:2.1))*dt;
  const maxBrake=(t.style==='aggressive'?-9.5:-7.5)*dt;
  t.speed+=clamp(target-t.speed,maxBrake,maxAccel);
  t.speed=Math.max(0,t.speed);
  t.braking=t.speed<old-.015||(t.yielding&&t.speed>.4);
  for(const m of t.mesh.userData.brakeMaterials||[]){m.emissive.setHex(0xff2010);m.emissiveIntensity=t.braking||t.stopAt!==null&&t.speed<.5?.85:.10;}
  t.mesh.rotation.x=0;
  const stepDist=t.speed*dt;t.s+=stepDist;
  if(!t.curve&&t.nextEdge){const next=edgeFrame(t.nextEdge),dot=f.fx*next.fx+f.fz*next.fz,den=f.fx*next.fz-f.fz*next.fx,r=Math.min(7,f.length*.35,next.length*.35);if(dot>-.15&&Math.abs(den)>.25&&r>.5&&t.s>f.length-r){const offset=Math.min(lifeRoad(t.nextEdge).width*.26,Math.max(.4,lifeRoad(t.nextEdge).width/2-t.hw-.2)),p0={x:f.b.x-f.fx*r-f.fz*t.offset,z:f.b.z-f.fz*r+f.fx*t.offset},p2={x:f.b.x+next.fx*r-next.fz*offset,z:f.b.z+next.fz*r+next.fx*offset},a=clamp(((p2.x-p0.x)*next.fz-(p2.z-p0.z)*next.fx)/den,.25*r,2.0*r),p1={x:p0.x+f.fx*a,z:p0.z+f.fz*a};t.curve={next:t.nextEdge,r,p0,p1,p2,offset};}}
  const curve=t.curve;
  if(t.s>=f.length+(curve?curve.r:0)){
   const next=curve?.next||t.nextEdge||chooseNextEdge(t);
   if(next){t.s-=f.length;t.edge=next;t.nextEdge=null;t.stopAt=null;t.curve=null;const nextWidth=ASSYUT.roads[next.road].width;t.laneTarget=Math.min(nextWidth*.26,2.3);t.offset=Math.min(t.offset,Math.max(.4,nextWidth/2-t.hw-.2));}
   else{t.speed=0;t.nextEdge=null;t.s=Math.max(0,f.length-Math.max(4.5,t.hl+2.8));}
  }
  const nf=edgeFrame(t.edge);_trafficDesired.set(nf.a.x+nf.fx*t.s-nf.fz*t.offset,infrastructureEdgeHeight(t.edge,t.s),nf.a.z+nf.fz*t.s+nf.fx*t.offset);let heading=Math.atan2(-nf.fz,nf.fx);
  if(t.curve){const q=t.curve,u=clamp((t.s-f.length+q.r)/(2*q.r),0,1),v=1-u;_trafficDesired.x=v*v*q.p0.x+2*v*u*q.p1.x+u*u*q.p2.x;_trafficDesired.z=v*v*q.p0.z+2*v*u*q.p1.z+u*u*q.p2.z;_trafficDesired.y=lerp(infrastructureEdgeHeight(t.edge,Math.min(t.s,f.length)),infrastructureEdgeHeight(q.next,q.r*u),u);heading=-Math.atan2(v*(q.p1.z-q.p0.z)+u*(q.p2.z-q.p1.z),v*(q.p1.x-q.p0.x)+u*(q.p2.x-q.p1.x));}
  const previousHeading=t.mesh.rotation.y,turn=Math.atan2(Math.sin(heading-previousHeading),Math.cos(heading-previousHeading)),posBlend=1-Math.exp(-dt*14),rotBlend=1-Math.exp(-dt*11);
  _trafficCandidate.copy(t.mesh.position).lerp(_trafficDesired,posBlend);
  _trafficCandidate.y=lerp(t.mesh.position.y,_trafficDesired.y,1-Math.exp(-dt*20));
  const rotation=previousHeading+turn*rotBlend;
  if(trafficFootprintClear(_trafficCandidate.x,_trafficCandidate.z,rotation,t.hl,t.hw,_trafficCandidate.y)){t.mesh.position.copy(_trafficCandidate);t.mesh.rotation.y=rotation;}
  else if(trafficFootprintClear(_trafficDesired.x,_trafficDesired.z,heading,t.hl,t.hw,_trafficDesired.y)&&!segmentHitsBuilding(t.mesh.position,_trafficDesired,t.hw+.18)){t.mesh.position.copy(_trafficDesired);t.mesh.rotation.y=heading;}
  else{t.edge=before.edge;t.s=before.s;t.offset=clamp(before.offset-Math.sign(before.offset-Math.min(1.3,road.width*.15))*0.15,0.4,road.width/2-t.hw-.2);t.speed=0;t.curve=null;t.nextEdge=null;t.laneTarget=Math.min(1.3,road.width*.15);t.laneTimer=2;STREET_LIFE.blockedMoves++;}
  const s0=Math.max(0,t.s-1),s1=Math.min(nf.length,t.s+1),ds=Math.max(1.2,s1-s0);
  t.mesh.rotation.order='YZX';
  const targetPitch=clamp(Math.atan2(infrastructureEdgeHeight(t.edge,s1)-infrastructureEdgeHeight(t.edge,s0),ds),-0.12,0.12);
  t.mesh.rotation.z=clamp(lerp(t.mesh.rotation.z||0,targetPitch,1-Math.exp(-dt*9)),-0.12,0.12);
  const turnRate = turn / Math.max(0.001, dt);
  const latAccel = t.speed * turnRate;
  const longAccel = (t.speed - old) / Math.max(0.001, dt);
  if(t.mesh.userData.twoWheeler){
   const targetLean = clamp(-Math.atan2(latAccel, 9.81) * 0.92, -0.52, 0.52);
   t.lean = (t.lean || 0) + (targetLean - (t.lean || 0)) * (1 - Math.exp(-dt * 15));
   t.mesh.rotation.x = t.lean;
   const forkDive = clamp(longAccel * 0.008, -0.09, 0.04);
   t.mesh.rotation.z = clamp(lerp(t.mesh.rotation.z || 0, targetPitch + forkDive, 1 - Math.exp(-dt * 12)), -0.18, 0.18);
   const rWheel=t.kind==='bicycle'?.35:.30;
   for(const w of t.mesh.userData.wheels)w.rotation.z-=stepDist/rWheel;
   if(t.kind==='bicycle'){
    t.pedalPhase=(t.pedalPhase||0)+stepDist/.24;
    if(t.mesh.userData.crank){t.mesh.userData.crank.rotation.z=-t.pedalPhase;for(const p of t.mesh.userData.pedals||[])p.rotation.z=t.pedalPhase;}
    animateStreetRider(t.mesh.userData.rider,t.pedalPhase,true);
    if(t.mesh.userData.riderDetail)animateCycleRider(t.mesh.userData.riderDetail,t.pedalPhase);
   }
  }else{
   const rollCoeff = (t.kind === 'bus') ? 0.024 : (t.kind === 'tuktuk') ? 0.032 : (t.kind === 'micro') ? 0.024 : 0.018;
   const targetRoll = clamp(latAccel * rollCoeff, -0.14, 0.14);
   t.roll = (t.roll || 0) + (targetRoll - (t.roll || 0)) * (1 - Math.exp(-dt * 12));
   t.mesh.rotation.x = t.roll;
   const brakeDive = clamp(longAccel * 0.007, -0.07, 0.03);
   t.pitch = (t.pitch || 0) + (brakeDive - (t.pitch || 0)) * (1 - Math.exp(-dt * 12));
   t.mesh.rotation.z = clamp(lerp(t.mesh.rotation.z || 0, targetPitch + t.pitch, 1 - Math.exp(-dt * 10)), -0.18, 0.18);
   const steerAngle=clamp(turn*2.2,-.42,.42);
   for(const list of [t.mesh.userData.wheels,t.mesh.userData.farWheels]){
    if(!list)continue;
    for(const w of list){if(w.steer&&w.front)w.steer.rotation.y+=(steerAngle-w.steer.rotation.y)*Math.min(1,dt*10);if(w.spin)w.spin.rotation.z-=stepDist/(w.radius||.32);}
   }
  }
  const dx=t.mesh.position.x-car.x,dz=t.mesh.position.z-car.z;
  if(Math.abs((t.mesh.position.y||0)-car.y)<1.9&&dx*dx+dz*dz<64){
   const hit=obbContact(playerBounds(),{x:t.mesh.position.x,z:t.mesh.position.z,heading:t.mesh.rotation.y,hl:t.hl,hw:t.hw});
   if(hit){
    const closingX=car.vel.x-nf.fx*t.speed,closingZ=car.vel.y-nf.fz*t.speed;
    const closing=closingX*hit.nx+closingZ*hit.nz;
    car.x+=hit.nx*(hit.depth+.003);car.z+=hit.nz*(hit.depth+.003);
    if(closing<0){
     const mass=vehicleParameters().mass,otherMass=t.kind==='bus'?6200:t.kind==='micro'?2200:1350;
     const restitution=0.35;
     const impulse=-(1+restitution)*closing/(1/mass+1/otherMass);
     car.vel.x+=hit.nx*(impulse/mass);car.vel.y+=hit.nz*(impulse/mass);

     const contactX=(car.x+t.mesh.position.x)/2,contactZ=(car.z+t.mesh.position.z)/2;
     const pArmX=contactX-car.x,pArmZ=contactZ-car.z;
     const pTorque=(pArmX*hit.nz-pArmZ*hit.nx)*(impulse/mass);
     car.yawRate=clamp((car.yawRate||0)+pTorque*0.24,-6.5,6.5);
     car.roll=clamp((car.roll||0)-(hit.nx*pArmZ-hit.nz*pArmX)*0.045,-0.38,0.38);

     syncCarSpeed();
     recordImpact(-closing,'خبطة! حافظ على مسافة الأمان');
     if(typeof spawnVehicleSparks==='function')spawnVehicleSparks(contactX,(car.y+t.mesh.position.y)/2+0.35,contactZ,closingX,closingZ,7);
     if(typeof sfxCrash==='function')sfxCrash();
    }
    t.speed=Math.max(0,Math.min(t.speed,car.speed*0.5));
   }
  }
 }
}
initializeStreetTraffic();

/* ========================= 65-assyut-signals.js ========================= */
/* Simulation signals at real junctions; timing is game-authored, not live city timing. */
{
 const selected=[];
 const candidates=ASSYUT.junctions.slice().sort((a,b)=>Math.hypot(a.x-ASSYUT.start.x,a.z-ASSYUT.start.z)-Math.hypot(b.x-ASSYUT.start.x,b.z-ASSYUT.start.z));
 for(const j of candidates){if(selected.some(p=>Math.hypot(p.x-j.x,p.z-j.z)<170))continue;selected.push(j);if(selected.length>=16)break;}
 for(const [i,j]of selected.entries()){
  const tl={x:j.x,z:j.z,lifeNode:j.node,halfX:7,halfZ:7,timer:i*4%28,xState:'green',zState:'red',xBulbs:[],zBulbs:[],approaches:[]};
  const incoming=ASSYUT.edges.filter(e=>e.b===j.node),used=[];
  for(const edge of incoming){
   const f=edgeFrame(edge),road=ASSYUT.roads[edge.road],heading=Math.atan2(-f.fz,f.fx);if(used.some(h=>Math.abs(Math.atan2(Math.sin(h-heading),Math.cos(h-heading)))<.4))continue;used.push(heading);
   const axis=Math.abs(f.fx)>Math.abs(f.fz)?'x':'z',stop={x:j.x-f.fx*Math.max(12,...j.arms.map(a=>a.width/2+4)),z:j.z-f.fz*Math.max(12,...j.arms.map(a=>a.width/2+4))},offset=Math.min(road.width*.25,2.5),root=new THREE.Group();root.position.set(stop.x,0,stop.z);root.rotation.y=heading;
   let tries=0;while(onDrivingRoad(stop.x-f.fz*(road.width/2+1.4),stop.z+f.fx*(road.width/2+1.4),.15)&&tries++<8){stop.x-=f.fx*3;stop.z-=f.fz*3;}if(tries>=8)continue;root.position.set(stop.x,0,stop.z);
   const metal=new THREE.MeshStandardMaterial({color:0x303b36,roughness:.55,metalness:.3}),post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,6.7,8),metal);post.position.set(0,3.35,road.width/2+1.4);root.add(post);
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,road.width/2+1.4-offset),metal);arm.position.set(0,6.6,(road.width/2+1.4+offset)/2);root.add(arm);
   const head=new THREE.Group();head.position.set(0,5.55,offset);head.rotation.y=-Math.PI/2;root.add(head);
   const casing=new THREE.Mesh(new THREE.BoxGeometry(1.02,2.65,.28),new THREE.MeshStandardMaterial({color:0x101914,roughness:.75}));head.add(casing);
   const make=(y,c)=>{const mat=new THREE.MeshBasicMaterial({color:c,toneMapped:false});const m=new THREE.Mesh(new THREE.CircleGeometry(.30,24),mat);m.position.set(0,y,.15);head.add(m);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:c,transparent:true,opacity:.55,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));glow.position.set(0,y,.18);glow.scale.set(1.5,1.5,1);head.add(glow);return {mat,glow};};
   const r=make(.8,0xff1610),y=make(0,0xffc323),gr=make(-.8,0x1bff64);const bulbs={r:r.mat,y:y.mat,gr:gr.mat,redGlow:r.glow,yellowGlow:y.glow,greenGlow:gr.glow};tl[axis+'Bulbs'].push(bulbs);
   const line=new THREE.Mesh(new THREE.BoxGeometry(.32,.02,Math.max(2,road.width/2-.5)),new THREE.MeshStandardMaterial({color:0xe7e3ce}));line.position.set(0,.045,offset);root.add(line);REAL_CITY.group.add(root);
   const approach={edge,axis,fx:f.fx,fz:f.fz,nx:-f.fz,nz:f.fx,stop,width:road.width};tl.approaches.push(approach);
   const px=stop.x-f.fz*(road.width/2+1.4),pz=stop.z+f.fx*(road.width/2+1.4);if(!onDrivingRoad(px,pz,.1))ROAD_FURNITURE.push({x:px,z:pz,kind:'signal'});
  }
  TRAFFIC_LIGHTS.push(tl);
 }
 updateTrafficLights(0);
}
function assyutSignalAhead(){
 let best=null;const fx=Math.cos(car.heading),fz=-Math.sin(car.heading);
 for(const light of TRAFFIC_LIGHTS)for(const a of light.approaches||[]){if(fx*a.fx+fz*a.fz<.8)continue;const dx=a.stop.x-car.x,dz=a.stop.z-car.z,distance=dx*a.fx+dz*a.fz-vehicleParameters().halfLength,across=dx*a.nx+dz*a.nz;if(Math.abs(across)>a.width/2||distance<-1||distance>110)continue;if(!best||distance<best.distance)best={light,axis:a.axis,distance,state:light[a.axis+'State']};}
 return best;
}
function checkAssyutLights(prevX,prevZ){
 const fx=Math.cos(car.heading),fz=-Math.sin(car.heading),bounds=vehicleParameters();if(car.speed<1.2||car.redFineCd>0)return;
 for(const light of TRAFFIC_LIGHTS)for(const a of light.approaches||[]){if(light[a.axis+'State']!=='red'||fx*a.fx+fz*a.fz<.8)continue;const across=(car.x-a.stop.x)*a.nx+(car.z-a.stop.z)*a.nz;if(Math.abs(across)>a.width/2-.2)continue;const extent=bounds.halfLength*(fx*a.fx+fz*a.fz)+bounds.halfWidth*Math.abs(fx*a.nx+fz*a.nz),before=(prevX-a.stop.x)*a.fx+(prevZ-a.stop.z)*a.fz+extent,after=(car.x-a.stop.x)*a.fx+(car.z-a.stop.z)*a.fz+extent;
  if(before<0&&after>=0){car.redFineCd=6;G.money=Math.max(0,G.money-40);saveProgress();if(rideBusy())M.hits++;sfxFine();flashScreen();floatText('−40 ج.م · إشارة حمراء','#ff685d');setObjective('تجاوزت خط التوقف والإشارة حمراء · مخالفة 40 ج.م',3500);return;}
 }
}
