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
