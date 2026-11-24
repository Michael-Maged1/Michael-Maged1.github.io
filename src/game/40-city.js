/* ------------------------- الأرض والطريق ------------------------- */
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD, ROAD_HALF * 2),
  surfaceMaterial('asphalt',WORLD,ROAD_HALF*2,0xb8b8b4,5)
);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

/* رصيف الكورنيش — البحري متصل والداخلي مقطوع عند الشوارع الجانبية */
function walkTexture(w,d){return surfaceMaterial('paving',w,d,0xd7d2c8,3);}
function curbMatFor(len) {
  const tex = curbStripeTex.clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, len / 3.2), 1);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: .75 });
}
const WALK_SURFACES=[];
function addWalkBox(x0, x1, z0, z1, mat) {
  const w = x1 - x0, d = z1 - z0;
  if (w <= 0 || d <= 0) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, .34, d), mat || walkTexture(w, d));
  m.position.set((x0 + x1) / 2, .17, (z0 + z1) / 2);
  m.receiveShadow = true;
  WALK_SURFACES.push({x0,x1,z0,z1,height:.34});
  scene.add(m);
}
{
  // الرصيف البحري: بلاط رمادي + ممشى طوب أحمر جنب السور
  addWalkBox(-HALF, HALF, -ROAD_HALF - 4.4, -ROAD_HALF, walkTexture(WORLD, 4.4));
  const brickTex = brickWalkTex.clone();
  brickTex.needsUpdate = true;
  brickTex.repeat.set(WORLD / 3.5, 1.4);
  addWalkBox(-HALF, HALF, -ROAD_HALF - WALK_W, -ROAD_HALF - 4.4,
    surfaceMaterial('paving',WORLD,3.6,0xc9b3a4,3));

  const curb = new THREE.Mesh(new THREE.BoxGeometry(WORLD, .35, .44), curbMatFor(WORLD));
  curb.position.set(0, .175, -ROAD_HALF - .1);
  curb.receiveShadow = true;
  scene.add(curb);

  const bounds = [-HALF];
  for (const v of V_STREETS) bounds.push(v.x - v.half, v.x + v.half);
  bounds.push(HALF);
  for (let i = 0; i < bounds.length; i += 2) {
    const x0 = bounds[i], x1 = bounds[i + 1];
    if (x1 - x0 < 2) continue;
    addWalkBox(x0, x1, ROAD_HALF, ROAD_HALF + WALK_W, walkTexture(x1 - x0, WALK_W));
    const c = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .35, .44), curbMatFor(x1 - x0));
    c.position.set((x0 + x1) / 2, .175, ROAD_HALF + .1);
    c.receiveShadow = true;
    scene.add(c);
  }

  const bank=new THREE.Mesh(new THREE.BoxGeometry(WORLD,.55,9),surfaceMaterial('stone',WORLD,9,0xb4a385,4));bank.position.set(0,-.6,-28.8);bank.receiveShadow=true;scene.add(bank);

}

const MEDIAN_SEGMENTS=[];
const median=new THREE.Group();
let medianStart=-HALF;
for(const v of [...V_STREETS,{x:HALF+1,half:1}]){
  const end=Math.min(HALF,v.x-v.half-1);
  if(end>medianStart){
    MEDIAN_SEGMENTS.push({x0:medianStart,x1:end});WALK_SURFACES.push({x0:medianStart,x1:end,z0:-1,z1:1,height:.22});
    const m=new THREE.Mesh(new THREE.BoxGeometry(end-medianStart,.22,2),surfaceMaterial('stone',end-medianStart,2,0x8c8e74,3));
    m.position.set((medianStart+end)/2,.11,0);m.receiveShadow=true;median.add(m);
  }
  medianStart=v.x+v.half+1;
}
scene.add(median);

/* خطوط الطريق */
const dummy = new THREE.Object3D();
{
  const dashGeo = new THREE.BoxGeometry(2.9, .025, .16);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xb9b8aa, roughness:.94 });
  const zs = [-10.8, -5.4, 5.4, 10.8];
  const count = Math.ceil(WORLD / 9) * zs.length;
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, count);
  let n = 0;
  for (const z of zs) {
    for (let x = -HALF; x < HALF; x += 9) {
      if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+1))continue;
      dummy.position.set(x, .028, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      dashes.setMatrixAt(n++, dummy.matrix);
    }
  }
  dashes.count = n;
  dashes.frustumCulled = false;
  scene.add(dashes);
}
{
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xcac7b7, roughness:.92 });
  for (const z of [-15.35, 15.35]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, .16), edgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, .03, z);
    scene.add(line);
  }
  const yMat = new THREE.MeshStandardMaterial({ color: 0xc0a64d, roughness:.95 });
  for (const z of [-1.05, 1.05]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, .14), yMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, .03, z);
    scene.add(line);
  }
}
/* خطوط عبور المشاة */
{
  const cwGeo = new THREE.PlaneGeometry(.62, 30);
  cwGeo.rotateX(-Math.PI / 2);
  const cwMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: .9,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const positions = [];
  for (let x = -HALF + 120; x < HALF - 60; x += 240) positions.push(x);
  const inst = new THREE.InstancedMesh(cwGeo, cwMat, positions.length * 8);
  let n = 0;
  for (const x of positions) {
    for (let i = 0; i < 8; i++) {
      dummy.position.set(x + i * 1.35 - 4.7, .03, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(n++, dummy.matrix);
    }
  }
  inst.count = n;
  inst.frustumCulled = false;
  scene.add(inst);
}
/* أسهم على الأسفلت */
{
  const arrowTex = canvasTex(64, 128, g => {
    g.clearRect(0, 0, 64, 128);
    g.fillStyle = '#f1ead6';
    g.beginPath(); g.moveTo(32, 4); g.lineTo(60, 58); g.lineTo(42, 58);
    g.lineTo(42, 124); g.lineTo(22, 124); g.lineTo(22, 58); g.lineTo(4, 58);
    g.closePath(); g.fill();
  });
  const geo = new THREE.PlaneGeometry(1.4, 3.2);
  geo.rotateX(-Math.PI / 2);
  const g1 = geo.clone(); g1.rotateY(-Math.PI / 2);
  const g2 = geo.clone(); g2.rotateY(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true });
  for (const [z, g] of [[9.4, g1], [-9.4, g2]]) {
    const inst = new THREE.InstancedMesh(g, mat, 24);
    let n = 0;
    for (let x = -HALF + 60; x < HALF - 60; x += 100) {
      dummy.position.set(x, .032, z);
      dummy.updateMatrix();
      inst.setMatrixAt(n++, dummy.matrix);
    }
    inst.count = n;
    inst.frustumCulled = false;
    scene.add(inst);
  }
}

/* ------------------------- شوارع وحارات المدينة ------------------------- */
function addStreetPlane(axis, c, half, from, to, y) {
  const len = to - from;
  const tex = asphaltTex.clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, len / 18), Math.max(1, (half * 2) / 7));
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(axis === 'x' ? len : half * 2, axis === 'x' ? half * 2 : len),
    surfaceMaterial('asphalt',axis==='x'?len:half*2,axis==='x'?half*2:len,0xc0bdb4,5)
  );
  m.rotation.x = -Math.PI / 2;
  if (axis === 'x') m.position.set((from + to) / 2, y, c);
  else m.position.set(c, y, (from + to) / 2);
  m.receiveShadow = true;
  scene.add(m);
}

for (const h of H_STREETS) {
  if (h.kind === 'corniche') continue;
  addStreetPlane('x', h.z, h.half, -HALF, HALF, .0015);
}
for (const v of V_STREETS) {
  addStreetPlane('z', v.x, v.half, 16, CITY_Z1, .002);
}

/* أرصفة البلوكات + الحارات */
const walkMatFor=w=>walkTexture(w,WALK_IN);

for (const b of BLOCKS) {
  const { x0, x1, z0, z1 } = b;
  if (b.band === 0) {
    addWalkBox(x0, x0 + WALK_IN, 24, z1 - WALK_IN, walkMatFor(z1 - 24));
    addWalkBox(x1 - WALK_IN, x1, 24, z1 - WALK_IN, walkMatFor(z1 - 24));
    addWalkBox(x0, x1, z1 - WALK_IN, z1, walkMatFor(x1 - x0));
  } else {
    addWalkBox(x0, x1, z0, z0 + WALK_IN, walkMatFor(x1 - x0));
    addWalkBox(x0, x1, z1 - WALK_IN, z1, walkMatFor(x1 - x0));
    const cz = (z0 + z1) / 2;
    const az0 = cz - ALLEY_W / 2, az1 = cz + ALLEY_W / 2;
    for (const [sx0, sx1] of [[x0, x0 + WALK_IN], [x1 - WALK_IN, x1]]) {
      addWalkBox(sx0, sx1, z0 + WALK_IN, az0, walkMatFor(az0 - z0));
      addWalkBox(sx0, sx1, az1, z1 - WALK_IN, walkMatFor(z1 - az1));
    }

    // حارة ضيقة وسط البلوك
    const len = x1 - x0;
    const t = asphaltTex.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, len / 14), ALLEY_W / 5);
    const alley = new THREE.Mesh(
      new THREE.PlaneGeometry(len, ALLEY_W),
      surfaceMaterial('asphalt',len,ALLEY_W,0xb8b4aa,5)
    );
    alley.rotation.x = -Math.PI / 2;
    alley.position.set((x0 + x1) / 2, .0045, cz);
    alley.receiveShadow = true;
    scene.add(alley);
    MAP.alleys.push({ x0, x1, z0: az0, z1: az1 });
  }
}

/* خطوط منتصف الشوارع الجديدة + قضبان الترام (شارع ١٤٠ سبورتنج) */
{
  const dashGeo = new THREE.BoxGeometry(2.6, .02, .15);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xb9b8aa, roughness:.94 });
  const items = [];
  for (const h of H_STREETS) {
    if (h.kind === 'corniche') continue;
    const zs = h.kind === 'wide' ? [h.z - h.half * .52, h.z + h.half * .52] : [h.z];
    for (const z of zs) {
      for (let x = -HALF + 8; x < HALF - 8; x += 11) items.push([x, z, 0]);
    }
  }
  for (const v of V_STREETS) {
    const xs = v.kind === 'wide' ? [v.x - v.half * .42, v.x + v.half * .42] : [v.x];
    for (const x of xs) {
      for (let z = 22; z < CITY_Z1 - 4; z += 11) items.push([x, z, Math.PI / 2]);
    }
  }
  const inst = new THREE.InstancedMesh(dashGeo, dashMat, items.length);
  items.forEach(([x, z, r], i) => {
    dummy.position.set(x, .03, z);
    dummy.rotation.set(0, r, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });
  inst.frustumCulled = false;
  scene.add(inst);


}

/* سور الكورنيش المميز (أعمدة حجرية بكور + شبك حديد أسود بدوائر) */
{
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xded5c8, roughness: .85 });
  // قاعدة السور البيضاء
  const baseWall = new THREE.Mesh(new THREE.BoxGeometry(WORLD, .54, .42), stoneMat);
  baseWall.position.set(0, .58, -24.15);
  scene.add(baseWall);

  // شبك الحديد الأسود بدوائر متكررة بين الأعمدة
  const grTex = ironGrilleTex.clone();
  grTex.needsUpdate = true;
  grTex.repeat.set(WORLD / 3.8, 1);
  const grille = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, .72),
    new THREE.MeshStandardMaterial({
      map: grTex, transparent: true, alphaTest: .35,
      roughness: .45, metalness: .65, side: THREE.DoubleSide,
    })
  );
  grille.position.set(0, 1.21, -24.15);
  scene.add(grille);

  // أعمدة السور المربعة كل 4.5 متر وفوقها كرة حجرية
  const pilGeo = new THREE.BoxGeometry(.54, 1.30, .52);
  const capGeo = new THREE.BoxGeometry(.64, .12, .62);
  const ballGeo = new THREE.SphereGeometry(.23, 10, 8);
  const pc = Math.ceil(WORLD / 4.5);
  const pillars = new THREE.InstancedMesh(pilGeo, stoneMat, pc);
  const caps = new THREE.InstancedMesh(capGeo, stoneMat, pc);
  const balls = new THREE.InstancedMesh(ballGeo, stoneMat, pc);
  let pn = 0;
  for (let x = -HALF; x < HALF; x += 4.5) {
    dummy.position.set(x, .96, -24.15);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pillars.setMatrixAt(pn, dummy.matrix);

    dummy.position.set(x, 1.65, -24.15);
    dummy.updateMatrix();
    caps.setMatrixAt(pn, dummy.matrix);

    dummy.position.set(x, 1.90, -24.15);
    dummy.updateMatrix();
    balls.setMatrixAt(pn, dummy.matrix);
    pn++;
  }
  pillars.count = pn; caps.count = pn; balls.count = pn;
  pillars.frustumCulled = false; caps.frustumCulled = false; balls.frustumCulled = false;
  scene.add(pillars, caps, balls);

  // عربات أكل وشاي على الرصيف البحري
  const cartMat = new THREE.MeshStandardMaterial({ color: 0xbec5cc, roughness: .45, metalness: .6 });
  const redUmb = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: .8, side: THREE.DoubleSide });
  for (let x = -HALF + 75; x < HALF - 75; x += 130) {
    const cg = new THREE.Group();
    cg.position.set(x, .34, -22.5);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, .95), cartMat);
    box.position.y = .5; cg.add(box);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 2.2, 6), cartMat);
    pole.position.y = 1.6; cg.add(pole);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.35, .55, 8, 1, true), redUmb);
    umb.position.y = 2.6; cg.add(umb);
    scene.add(cg);
  }
}

/* ------------------------- المباني والمحلات ------------------------- */
const buildingData = [];

function addBillboard(x, y, z, tex, w, h) {
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + .7, h + .7, .35),
    new THREE.MeshStandardMaterial({ color: 0x161c25, roughness: .5, metalness: .5 })
  );
  frame.position.set(x, y, z);
  scene.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  face.position.set(x, y, z - .2);
  face.rotation.y = Math.PI;
  scene.add(face);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xffb060, transparent: true, opacity: .22,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  gl.scale.set(w * 1.5, h * 1.5, 1);
  gl.position.set(x, y, z - .6);
  scene.add(gl);
  // أعمدة
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(.22, 4.5, .22),
      new THREE.MeshStandardMaterial({ color: 0x222a34, roughness: .6, metalness: .5 })
    );
    pole.position.set(x + s * (w / 2 - .7), y - h / 2 - 2.1, z);
    scene.add(pole);
  }
}

/* ------------------------- مباني الكورنيش (تفصيل + بلكونات 3D) ------------------------- */
const BALCONIES = [];
const LAUNDRY = [];

function detailedBuilding(cx, w, d, h) {
  const tint=pick([0xe2d4bf,0xd5c7b6,0xc9c2b5,0xbdb7ad,0xdbcfbb,0xc4bba8]);
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingSurfaces(w,h,d,tint));
  architecturalFacade(cx,26,w,h,Math.PI,true);
  architecturalFacade(cx-w/2,26+d/2,d,h,-Math.PI/2,false);
  architecturalFacade(cx+w/2,26+d/2,d,h,Math.PI/2,false);
  b.position.set(cx, h / 2, 26 + d / 2);
  b.castShadow = true;
  b.receiveShadow = true;
  scene.add(b);
  buildingData.push({ x: cx, z: 26 + d / 2, w, d, h });
  MAP.buildings.push({ x0: cx - w / 2, x1: cx + w / 2, z0: 26, z1: 26 + d, h });

  // بلكونات 3D بارزة على الأدوار العليا + غسيل ملون
  const floors = Math.floor((h - 5) / 3.6);
  const cols = Math.max(1, Math.floor(w / 6.5));
  for (let fl = 0; fl < floors; fl++) {
    const by = 5.0 + fl * 3.5;
    for (let c = 0; c < cols; c++) {
      if (Math.random() < .28) continue;
      const bx = cx - w / 2 + (c + .5) * (w / cols);
      BALCONIES.push({ x: bx, y: by, z: 25.35, w: Math.min(3.8, (w / cols) * .68) });
      if (Math.random() < .35) {
        LAUNDRY.push({
          x: bx + rand(-.8, .8), y: by + .65, z: 24.82,
          col: pick([0xe63946, 0x3a86ff, 0xffbe0b, 0xffffff, 0x2ec4b6]),
        });
      }
    }
  }

  // مظلات
  if (Math.random() < .60) {
    const aw = new THREE.Mesh(
      new THREE.BoxGeometry(w * .46, .13, 1.7),
      new THREE.MeshStandardMaterial({ color: pick([0xc0392b, 0x1f6f8b, 0x2e8b57, 0xd4a017]), roughness: .9 })
    );
    aw.position.set(cx + rand(-w * .2, w * .2), 3.65, 24.9);
    aw.rotation.x = .08;
    aw.castShadow = true;
    scene.add(aw);
  }

  // لافتة نيون
  if (Math.random() < .78) {
    const sTex = pick(SIGN_TEXES);
    const sgn = new THREE.Mesh(
      new THREE.PlaneGeometry(rand(2.8, 4.4), 1.0),
      new THREE.MeshBasicMaterial({ map: sTex, transparent: true })
    );
    sgn.position.set(cx + rand(-w * .25, w * .25), 4.85, 25.35);
    sgn.rotation.y = Math.PI;
    scene.add(sgn);
    if (Math.random() < .45) {
      const gm = new THREE.SpriteMaterial({
        map: GLOW_TEX, color: 0xffc070, transparent: true, opacity: .18,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const gl = new THREE.Sprite(gm);
      gl.scale.set(6, 2.2, 1);
      gl.position.set(sgn.position.x, 4.85, 25.1);
      scene.add(gl);
      nightGlows.push({ mat: gm, day: .05, night: .38 });
    }
  }

  // بيلبورد على السطح
  if (Math.random() < .24 && h > 14) {
    addBillboard(cx, h + 4.6, 25.6, pick(BILLBOARD_TEXES), rand(8, 11), rand(4, 5.4));
  }

  // خزانات ومآذن قريبة على بعض الأسطح
  if (Math.random() < .55) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(rand(.8, 1.3), rand(.8, 1.3), rand(1.4, 2.4), 10),
      new THREE.MeshStandardMaterial({ color: pick([0x9aa6b2, 0xb7c0c9, 0x7f8a96]), roughness: .8 })
    );
    tank.position.set(cx + rand(-w * .3, w * .3), h + 1, 26 + d * .5 + rand(-2, 2));
    tank.castShadow = true;
    scene.add(tank);
  }
}

for (const b of BLOCKS) {
  if (b.band !== 0) continue;
  // حجز بلوك مكتبة الأسيوط (بين -240 و -120)
  if (b.x0 >= -250 && b.x1 <= -110) continue;
  let bx = b.x0 + 4;
  const end = b.x1 - 4;
  while (bx < end - 11) {
    let w = rand(14, 27);
    if (bx + w > end) w = end - bx;
    if (w < 11) break;
    const d = rand(20, 28);
    detailedBuilding(bx + w / 2, w, d, rand(10, 40));
    bx += w + rand(2, 5);
  }
}

/* City landmarks inspired by photographs of Assiut; the road layout is fictional. */
{
 const station=new THREE.Group();station.position.set(-180,0,43);
 const mat=surfaceMaterial('plaster',70,13,0xd5c1a1,4);
 const hall=new THREE.Mesh(new THREE.BoxGeometry(72,11,27),mat);hall.position.y=5.5;hall.castShadow=true;hall.receiveShadow=true;station.add(hall);
 const entrance=new THREE.Mesh(new THREE.BoxGeometry(18,8,.8),new THREE.MeshStandardMaterial({color:0x514e43,roughness:.8}));entrance.position.set(0,4,-13.9);station.add(entrance);
 for(let i=-3;i<=3;i++){const glass=new THREE.Mesh(new THREE.PlaneGeometry(2.1,4.5),new THREE.MeshStandardMaterial({color:0x263b42,metalness:.25,roughness:.24}));glass.position.set(i*2.45,3.3,-14.35);glass.rotation.y=Math.PI;station.add(glass);}
 const label=labelSprite('محطة قطارات أسيوط','#e7d9b9');label.position.set(0,10,-14.5);label.scale.set(18,3,1);station.add(label);
 scene.add(station);MAP.buildings.push({x0:-216,x1:-144,z0:29.5,z1:56.5,h:11});buildingData.push({x:-180,z:43,w:72,d:27,h:11});
 architecturalFacade(-180,29.5,72,11,Math.PI,false);
}

/* ------------------------- مباني داخل المدينة (Instanced) ------------------------- */
const INLAND_BUCKETS = new Map();
const INLAND_ROOF = new THREE.MeshStandardMaterial({ color: 0x3b3b42, roughness: 1 });

function inlandBuilding(x0, x1, z0, z1, h) {
  MAP.buildings.push({ x0, x1, z0, z1, h });
  buildingData.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, h });
  const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingSurfaces(w,h,d,pick([0xd6c9b8,0xc9bdac,0xc3bcb0,0xd5c7b5])));
  mesh.position.set(cx,h/2,cz);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  architecturalFacade(cx,z0,w,h,Math.PI,false);
  architecturalFacade(cx,z1,w,h,0,false);
  if(V_STREETS.some(v=>Math.abs(x0-(v.x+v.half))<8))architecturalFacade(x0,cz,d,h,-Math.PI/2,false);
  if(V_STREETS.some(v=>Math.abs(x1-(v.x-v.half))<8))architecturalFacade(x1,cz,d,h,Math.PI/2,false);

}

for (const b of BLOCKS) {
  if (b.band === 0) continue;
  const ix0 = b.x0 + WALK_IN + 1.2, ix1 = b.x1 - WALK_IN - 1.2;
  const iz0 = b.z0 + WALK_IN + 1.2, iz1 = b.z1 - WALK_IN - 1.2;
  const cz = (iz0 + iz1) / 2;
  const az0 = cz - ALLEY_W / 2 - 1, az1 = cz + ALLEY_W / 2 + 1;
  const frontD = az0 - iz0;
  const backD = iz1 - az1;
  const lots = Math.random() < .5 ? 3 : 2;
  const lw = (ix1 - ix0) / lots;
  for (let i = 0; i < lots; i++) {
    const lx0 = ix0 + i * lw + .8, lx1 = ix0 + (i + 1) * lw - .8;
    if (lx1 - lx0 < 8) continue;
    if (frontD > 5) {
      const fh = rand(9, 34) * (Math.random() < .12 ? 1.7 : 1);
      inlandBuilding(lx0, lx1, iz0, iz0 + frontD * rand(.88, 1), fh);
    }
    if (backD > 5) {
      const bh = rand(10, 44) * (Math.random() < .12 ? 1.6 : 1);
      inlandBuilding(lx0, lx1, iz1 - backD * rand(.88, 1), iz1, bh);
    }
  }
}

{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (const rec of INLAND_BUCKETS.values()) {
    const inst = new THREE.InstancedMesh(
      geo, [rec.mat, rec.mat, INLAND_ROOF, INLAND_ROOF, rec.mat, rec.mat], rec.list.length
    );
    rec.list.forEach((b, i) => {
      dummy.position.set(b.cx, b.h / 2, b.cz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    scene.add(inst);
  }
}

/* ------------------------- بلكونات 3D + غسيل ملون + حجر أرصفة داخلية + مآذن ------------------------- */
if (BALCONIES.length) {
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xd8cab5, roughness: .85 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: .55, metalness: .45 });
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .22, 1.35), slabMat, BALCONIES.length);
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .85, .08), railMat, BALCONIES.length);
  const sides = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .85, 1.35), railMat, BALCONIES.length * 2);
  let si = 0;
  BALCONIES.forEach((b, i) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(b.w, 1, 1);
    dummy.updateMatrix();
    slabs.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + .48, b.z - .62);
    dummy.scale.set(b.w, 1, 1);
    dummy.updateMatrix();
    rails.setMatrixAt(i, dummy.matrix);

    for (const s of [-1, 1]) {
      dummy.position.set(b.x + s * (b.w / 2 - .04), b.y + .48, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sides.setMatrixAt(si++, dummy.matrix);
    }
  });
  slabs.castShadow = true;
  slabs.frustumCulled = false;
  rails.frustumCulled = false;
  sides.frustumCulled = false;
  scene.add(slabs, rails, sides);
}

if (LAUNDRY.length) {
  const lGeo = new THREE.BoxGeometry(.55, .65, .06);
  const lMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 });
  const lMesh = new THREE.InstancedMesh(lGeo, lMat, LAUNDRY.length);
  const col = new THREE.Color();
  LAUNDRY.forEach((l, i) => {
    dummy.position.set(l.x, l.y, l.z);
    dummy.rotation.set(0, 0, rand(-.08, .08));
    dummy.scale.set(rand(.8, 1.25), rand(.8, 1.2), 1);
    dummy.updateMatrix();
    lMesh.setMatrixAt(i, dummy.matrix);
    lMesh.setColorAt(i, col.setHex(l.col));
  });
  lMesh.frustumCulled = false;
  scene.add(lMesh);
}

buildCurbSegments();
// Kerb rendering and collision use identical intersection openings.
{
 const groups=new Map();
 for(const c of CURB_SEGMENTS){
  if(c.axis==='z'&&Math.abs(Math.abs(c.line)-ROAD_HALF)<.1)continue;
  const len=c.b-c.a,key=len.toFixed(1);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);
 }
 for(const [key,segments] of groups){
  const len=+key,inst=new THREE.InstancedMesh(new THREE.BoxGeometry(len,.34,.32),curbMatFor(len),segments.length);
  segments.forEach((c,i)=>{dummy.position.set(c.axis==='z'?(c.a+c.b)/2:c.line,.17,c.axis==='z'?c.line:(c.a+c.b)/2);dummy.rotation.set(0,c.axis==='z'?0:Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});inst.receiveShadow=true;inst.computeBoundingSphere();scene.add(inst);
 }
}

// مآذن وقباب مساجد أسيوط المميزة في الأفق الداخلي
for (const [mx, mz] of [[-530, 82], [180, 90], [660, 165], [-200, 185]]) {
  const mg = new THREE.Group();
  mg.position.set(mx, 0, mz);
  const stone = new THREE.MeshStandardMaterial({ color: 0xd9cbb2, roughness: .85 });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x3b6e52, roughness: .6 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 34, 10), stone);
  shaft.position.y = 17; mg.add(shaft);
  const bal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.0, 1.2, 10), stone);
  bal.position.y = 26; mg.add(bal);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.2, 7, 10), stone);
  top.position.y = 37; mg.add(top);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 10), domeMat);
  dome.position.y = 41.2; mg.add(dome);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(.22, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: .8, roughness: .3 }));
  spire.position.y = 43.8; mg.add(spire);
  scene.add(mg);
}

finalizeFacadeDetails();

/* Raised speed tables with 1:10 approach and departure ramps. */
const ROAD_RAMPS=[{x:180,z:82,half:4.8,width:9,height:.18},{x:-300,z:210,half:4.8,width:9,height:.18}];
for(const t of ROAD_RAMPS){
 const profile=[[-t.half,0],[-t.half+1.8,t.height],[t.half-1.8,t.height],[t.half,0]],verts=[],idx=[];
 for(const [x,y]of profile)verts.push(x,y,-t.width/2,x,y,t.width/2);
 for(let i=0;i<3;i++){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x77766b,side:THREE.DoubleSide,roughness:1}));m.position.set(t.x,.04,t.z);scene.add(m);
}
