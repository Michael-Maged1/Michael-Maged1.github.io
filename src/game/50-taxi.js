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
