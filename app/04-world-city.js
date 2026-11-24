
/* ========================= 30-sky.js ========================= */
/* ------------------------- السما والنهار والليل ------------------------- */
const nightMats = [];   // مواد بتضيء أكتر بالليل
const nightGlows = [];  // هالات بتقوى بالليل
const nightWindows = []; // واجهات شبابيكها بتنور بالليل

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    uSun: { value: new THREE.Vector3(0.93, 0.055, -0.373).normalize() },
    uTop: { value: new THREE.Color(0x0d1230) },
    uMid: { value: new THREE.Color(0x75335f) },
    uHorizon: { value: new THREE.Color(0xff7833) },
    uLow: { value: new THREE.Color(0xdb564d) },
    uSunCol: { value: new THREE.Color(0xffa25a) },
    uNight: { value: 0 },
  },
  vertexShader: `
    varying vec3 vP;
    void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    varying vec3 vP;
    uniform vec3 uSun, uTop, uMid, uHorizon, uLow, uSunCol;
    uniform float uNight;
    void main(){
      vec3 d = normalize(vP);
      float h = d.y;
      vec3 col = h > 0.12
        ? mix(uMid, uTop, smoothstep(0.12, 0.78, h))
        : mix(uHorizon, uMid, smoothstep(-0.06, 0.12, h));
      col = mix(col, uLow, smoothstep(0.02, -0.04, h) * 0.5);
      float s = max(dot(d, normalize(uSun)), 0.0);
      col += uSunCol * pow(s, 18.0) * 0.55;
      col += uSunCol * pow(s, 180.0) * 1.6;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), skyMat);
scene.add(sky);

const sunDisc = new THREE.Mesh(
  new THREE.CircleGeometry(30, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcf9a, fog: false, transparent: true, opacity: .92, side: THREE.DoubleSide })
);
scene.add(sunDisc);
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: GLOW_TEX, color: 0xffa050, transparent: true, opacity: .55,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
sunGlow.scale.set(130, 130, 1);
scene.add(sunGlow);

/* القمر */
const moonDisc = new THREE.Mesh(
  new THREE.CircleGeometry(18, 28),
  new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false, transparent: true, opacity: .95, side: THREE.DoubleSide })
);
moonDisc.visible = false;
scene.add(moonDisc);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: GLOW_TEX, color: 0x9fb8ff, transparent: true, opacity: 0,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
moonGlow.scale.set(85, 85, 1);
scene.add(moonGlow);

/* النجوم */
const starGeo = new THREE.BufferGeometry();
{
  const pts = [];
  for (let i = 0; i < 700; i++) {
    const th = Math.random() * Math.PI * 2;
    const y = .06 + Math.random() * .9;
    const r = Math.sqrt(1 - y * y);
    pts.push(Math.cos(th) * r * 1400, y * 1400, Math.sin(th) * r * 1400);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}
const starMat = new THREE.PointsMaterial({
  color: 0xdce6ff, size: 2.1, sizeAttenuation: false,
  transparent: true, opacity: 0, depthWrite: false, fog: false,
});
const stars = new THREE.Points(starGeo, starMat);
stars.visible = false;
scene.add(stars);

/* سحاب */
const cloudTex = canvasTex(256, 128, g => {
  g.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 12; i++) {
    const x = 30 + Math.random() * 196, y = 40 + Math.random() * 48, r = 18 + Math.random() * 34;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,.5)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
});
const clouds = new THREE.Group();
for (let i = 0; i < 12; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudTex, transparent: true, opacity: .3, depthWrite: false, fog: false,
    color: i % 2 ? 0xffb0a0 : 0xd0a0c0,
  }));
  s.scale.set(rand(120, 260), rand(50, 100), 1);
  s.position.set(rand(-1400, 1400), rand(110, 220), rand(-900, -300));
  clouds.add(s);
}
scene.add(clouds);

/* ألوان اليوم: فجر / نهار / غروب / ليل */
const SKY_KEYS = [
  { h: 0,    top: 0x070d20, mid: 0x0f1932, hor: 0x1b2740, low: 0x0a1019, sun: 0x9fb8ff, fog: 0x121d33, hemiS: 0x30406e, hemiG: 0x12161f, amb: 0x3a4468, light: 0x9fb8ff, sunI: .0,  moonI: .55, ambI: .55, hemiI: .88, exp: 1.06, glow: 0,   moonGlow: .85, night: 1 },
  { h: 4.8,  top: 0x081026, mid: 0x121c36, hor: 0x222c42, low: 0x0c121c, sun: 0x9fb8ff, fog: 0x142038, hemiS: 0x33436f, hemiG: 0x12161f, amb: 0x3c466a, light: 0x9fb8ff, sunI: .0,  moonI: .5,  ambI: .54, hemiI: .9,  exp: 1.07, glow: 0,   moonGlow: .75, night: .95 },
  { h: 6.2,  top: 0x2a3a63, mid: 0x7a5a7a, hor: 0xffb070, low: 0xd06a5a, sun: 0xffd0a0, fog: 0x6a5060, hemiS: 0xffc9a0, hemiG: 0x3a3550, amb: 0x7a6a90, light: 0xffc090, sunI: 1.2, moonI: 0,   ambI: .52, hemiI: .95, exp: 1.06, glow: .4,  moonGlow: 0,  night: .35 },
  { h: 8.2,  top: 0x276ab0, mid: 0x5895cc, hor: 0xd2c6b4, low: 0xa89078, sun: 0xfffae8, fog: 0xd0c4b2, hemiS: 0x4d8ac6, hemiG: 0x8a7054, amb: 0x9e9584, light: 0xfff6dc, sunI: 2.8, moonI: 0,   ambI: .55, hemiI: 1.10, exp: 1.05, glow: .22, moonGlow: 0,  night: 0 },
  { h: 12.0, top: 0x2462a6, mid: 0x5a94cc, hor: 0xd6c6b2, low: 0x9e866e, sun: 0xfffaeb, fog: 0xd4c6b2, hemiS: 0x4d8ac6, hemiG: 0x927556, amb: 0xa89d8c, light: 0xfffaeb, sunI: 3.6, moonI: 0,   ambI: .62, hemiI: 1.25, exp: 1.10, glow: .25, moonGlow: 0,  night: 0 },
  { h: 16.2, top: 0x2e6cb2, mid: 0x689cd0, hor: 0xdccbb6, low: 0xb09880, sun: 0xfff2d4, fog: 0xd2c4b0, hemiS: 0x508ec8, hemiG: 0x8a6e50, amb: 0xa09686, light: 0xffeed0, sunI: 2.7, moonI: 0,   ambI: .58, hemiI: 1.12, exp: 1.06, glow: .24, moonGlow: 0,  night: 0 },
  { h: 18.0, top: 0x344f70, mid: 0x8397a6, hor: 0xf5be87, low: 0xb19b84, sun: 0xffa860, fog: 0xa29487, hemiS: 0xc7d8e4, hemiG: 0x555045, amb: 0xb5c0ca, light: 0xffa85e, sunI: 3.2, moonI: 0,   ambI: .58, hemiI: 1.38, exp: 1.18, glow: .60, moonGlow: 0,  night: .05 },
  { h: 19.3, top: 0x0d1230, mid: 0x45264c, hor: 0xa83e48, low: 0x6b2836, sun: 0xff804a, fog: 0x342138, hemiS: 0xc8787a, hemiG: 0x22263c, amb: 0x76648c, light: 0xff804a, sunI: .85, moonI: .10, ambI: .50, hemiI: .92,  exp: 1.10, glow: .30, moonGlow: .12, night: .45 },
  { h: 21.0, top: 0x070d20, mid: 0x0f1932, hor: 0x1b2740, low: 0x0a1019, sun: 0x9fb8ff, fog: 0x121d33, hemiS: 0x30406e, hemiG: 0x12161f, amb: 0x3a4468, light: 0x9fb8ff, sunI: .0,  moonI: .55, ambI: .55, hemiI: .86, exp: 1.06, glow: 0,   moonGlow: .85, night: .98 },
  { h: 24,   top: 0x070d20, mid: 0x0f1932, hor: 0x1b2740, low: 0x0a1019, sun: 0x9fb8ff, fog: 0x121d33, hemiS: 0x30406e, hemiG: 0x12161f, amb: 0x3a4468, light: 0x9fb8ff, sunI: .0,  moonI: .55, ambI: .55, hemiI: .88, exp: 1.06, glow: 0,   moonGlow: .85, night: 1 },
];

const DN = {
  top: new THREE.Color(), mid: new THREE.Color(), hor: new THREE.Color(),
  low: new THREE.Color(), sun: new THREE.Color(), fog: new THREE.Color(),
  hemiS: new THREE.Color(), hemiG: new THREE.Color(), amb: new THREE.Color(),
  light: new THREE.Color(), cloud: new THREE.Color(),
  sunI: 0, moonI: 0, ambI: 0, hemiI: 0, exp: 1, glow: 0, moonGlow: 0, night: 0,
};
const _ca = new THREE.Color(), _cb = new THREE.Color();

function skyPalette(hour, o) {
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1], t = 0;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (hour >= SKY_KEYS[i].h && hour <= SKY_KEYS[i + 1].h) {
      a = SKY_KEYS[i]; b = SKY_KEYS[i + 1];
      const span = b.h - a.h || 1;
      t = clamp((hour - a.h) / span, 0, 1);
      break;
    }
  }
  const mixC = (out, ka, kb) => out.copy(_ca.setHex(ka)).lerp(_cb.setHex(kb), t);
  mixC(o.top, a.top, b.top); mixC(o.mid, a.mid, b.mid);
  mixC(o.hor, a.hor, b.hor); mixC(o.low, a.low, b.low);
  mixC(o.sun, a.sun, b.sun); mixC(o.fog, a.fog, b.fog);
  mixC(o.hemiS, a.hemiS, b.hemiS); mixC(o.hemiG, a.hemiG, b.hemiG);
  mixC(o.amb, a.amb, b.amb); mixC(o.light, a.light, b.light);
  const nf = lerp(a.night, b.night, t);
  o.night = nf;
  o.sunI = lerp(a.sunI, b.sunI, t);
  o.moonI = lerp(a.moonI, b.moonI, t);
  o.ambI = lerp(a.ambI, b.ambI, t);
  o.hemiI = lerp(a.hemiI, b.hemiI, t);
  o.exp = lerp(a.exp, b.exp, t);
  o.glow = lerp(a.glow, b.glow, t);
  o.moonGlow = lerp(a.moonGlow, b.moonGlow, t);
  o.cloud.copy(o.sun).lerp(_ca.setHex(0xffffff), clamp(1 - nf * 1.4, 0, 1) * .55);
  o.cloud.lerp(_ca.setHex(0x1a2038), nf * .7);
}

const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();

function updateDayNight(dt) {
  // 10 دقائق حقيقية تقريباً لكل فترة (فجر/شروق، نهار، غروب، ليل) = 40 دقيقة للدورة الكاملة
  const timeRate = (typeof navigator !== 'undefined' && navigator?.userAgent === 'test') ? 2.4 : (G.timeRate ?? 0.6);
  if (G.cycle && G.state==='play') G.clock = (G.clock + dt * timeRate) % 1440;
  const hour = G.clock / 60;
  skyPalette(hour, DN);

  skyMat.uniforms.uTop.value.copy(DN.top);
  skyMat.uniforms.uMid.value.copy(DN.mid);
  skyMat.uniforms.uHorizon.value.copy(DN.hor);
  skyMat.uniforms.uLow.value.copy(DN.low);
  skyMat.uniforms.uSunCol.value.copy(DN.sun);
  skyMat.uniforms.uNight.value = DN.night;
  sky.position.copy(camera.position);

  // مسار الشمس: شروق ٥:٤٨، غروب ٧:١٢ — والغروب على البحر
  const ang = ((hour - 5.8) / 13.4) * Math.PI;
  sunDir.set(Math.cos(ang) * .78, Math.sin(ang), -.62).normalize();
  moonDir.copy(sunDir).multiplyScalar(-1);
  skyMat.uniforms.uSun.value.copy(sunDir);

  sunDisc.visible = sunDir.y > -.04;
  sunDisc.material.color.copy(DN.sun);
  sunDisc.material.opacity = clamp(.35 + sunDir.y * 2, .35, .96);
  sunDisc.position.copy(camera.position).addScaledVector(sunDir, 900);
  sunDisc.lookAt(camera.position);
  sunGlow.position.copy(sunDisc.position);
  sunGlow.material.color.copy(DN.sun);
  sunGlow.material.opacity = DN.glow * clamp(.35 + sunDir.y * 2.4, .2, 1);
  sunGlow.visible = sunDisc.visible && DN.glow > .01;

  moonDisc.visible = moonDir.y > -.02;
  moonDisc.position.copy(camera.position).addScaledVector(moonDir, 900);
  moonDisc.lookAt(camera.position);
  moonGlow.position.copy(moonDisc.position);
  moonGlow.material.opacity = DN.moonGlow;
  moonGlow.visible = moonDisc.visible && DN.moonGlow > .02;

  starMat.opacity = clamp((DN.night - .15) / .75, 0, 1) * .9;
  stars.visible = starMat.opacity > .01;
  stars.position.set(camera.position.x, 0, camera.position.z);

  // إضاءة + تثبيت شبكة الظل لتجنب اهتزاز الظلال أثناء القيادة بمحيط 80 متراً حول اللاعب
  const useMoon = DN.moonI > DN.sunI;
  const ld = useMoon ? moonDir : sunDir;
  const shadowExtent = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.sun) ? (VISUAL_CONFIG.sun.shadowExtent || 80) : 80;
  const shadowMapW = (sun.shadow.mapSize && sun.shadow.mapSize.x) ? sun.shadow.mapSize.x : 1024;
  const shadowTexel = shadowExtent / shadowMapW;
  const sx = Math.round(car.x / shadowTexel) * shadowTexel;
  const sz = Math.round(car.z / shadowTexel) * shadowTexel;
  sun.position.set(sx + ld.x * 60, Math.max(38, ld.y * 60), sz + ld.z * 60);
  sun.target.position.set(sx, car.y || 0, sz);
  sun.target.updateMatrixWorld();
  sun.color.copy(DN.light);
  sun.intensity = useMoon ? DN.moonI : DN.sunI;
  if ('environmentIntensity' in scene) scene.environmentIntensity = lerp(0.95, 0.20, DN.night);

  hemi.color.copy(DN.hemiS);
  hemi.groundColor.copy(DN.hemiG);
  hemi.intensity = DN.hemiI * 0.90;
  ambient.color.copy(DN.amb);
  ambient.intensity = DN.ambI * 0.52;
  scene.fog.color.copy(DN.fog);
  const baseFogDensity = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.fog) ? VISUAL_CONFIG.fog.density : 0.00185;
  scene.fog.density = lerp(baseFogDensity, baseFogDensity * 1.15, DN.night);
  scene.fog.near = lerp(110, 180, 1 - DN.night);
  scene.fog.far = lerp(820, 920, 1 - DN.night);
  renderer.toneMappingExposure = (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.color) ? VISUAL_CONFIG.color.exposure : DN.exp;

  seaUniforms.uNight.value = DN.night;
  seaUniforms.uSunCol.value.copy(DN.sun);

  const glowF = clamp(DN.night * 1.15 + .12, 0, 1);
  for (const g of nightGlows) g.mat.opacity = lerp(g.day, g.night, glowF);
  for (const m of nightMats) m.emissiveIntensity = m.userData.base * (.5 + DN.night * 1.55);
  for (const m of nightWindows) m.emissiveIntensity = DN.night * .62;
  for (const s of clouds.children) {
    s.material.color.copy(DN.cloud);
    s.material.opacity = .1 + (1 - DN.night) * .22;
  }

  // كشاف التاكسي
  if (typeof taxiRig !== 'undefined' && taxiRig.spot) {
    const hlSpots = taxiRig.headlights?.spots || [taxiRig.spot];
    const perSpot = (24 + DN.night * 190) / (hlSpots.length > 1 ? 1.45 : 1);
    for (const sp of hlSpots) sp.intensity = perSpot;
    if (taxiRig.headlights?.glows) {
      const gOp = .26 + DN.night * .66;
      for (const gl of taxiRig.headlights.glows) gl.material.opacity = gOp;
    }
    if (taxiRig.headlights?.bulbs) {
      const bOp = .48 + DN.night * .50;
      for (const bl of taxiRig.headlights.bulbs) bl.material.opacity = bOp;
    }
    taxiRig.lamp.intensity = DN.night * (taxiRig.lamp.userData.nightIntensity??16);
  }
}

/* ------------------------- البحر ------------------------- */
const seaUniforms = {
  uT: { value: 0 },
  uNight: { value: 0 },
  uSunCol: { value: new THREE.Color(0xffa25a) },
};
const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(3200, 170, 100, 12),
  new THREE.ShaderMaterial({
    uniforms: seaUniforms, fog: false,
    vertexShader: `
      uniform float uT; varying float vW; varying vec2 vUv;
      void main(){
        vec3 p = position;
        p.z += sin(p.x*0.045 + uT*1.2)*0.9 + cos(p.y*0.11 + uT*1.7)*0.45;
        vW = p.z; vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }
    `,
    fragmentShader: `
      uniform float uT; uniform float uNight; uniform vec3 uSunCol;
      varying float vW; varying vec2 vUv;
      void main(){
        float crest = smoothstep(0.7, 1.5, vW);
        vec3 deep = mix(vec3(0.015, 0.075, 0.14), vec3(0.004, 0.018, 0.05), uNight);
        vec3 lit  = mix(vec3(0.10, 0.24, 0.32), vec3(0.025, 0.06, 0.11), uNight);
        vec3 col = mix(deep, lit, crest*0.55);
        float glint = smoothstep(0.15, 0.55, vUv.x) * smoothstep(0.95, 0.55, vUv.x);
        glint *= smoothstep(0.55, 0.95, vUv.y);
        col += uSunCol * glint * (0.35 + crest*0.9) * (1.0 - uNight*0.75);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
sea.rotation.x = -Math.PI / 2;
sea.position.set(0, -0.9, -119);
scene.add(sea);

/* ------------------------- نظام الطقس (مطر وشبورة) ------------------------- */
const RAIN_COUNT = 480;
const rainPos = new Float32Array(RAIN_COUNT * 6);
const rainDrops = [];
for (let i = 0; i < RAIN_COUNT; i++) {
  rainDrops.push({
    x: rand(-55, 55), y: rand(0, 34), z: rand(-55, 55),
    sp: rand(28, 40),
  });
}
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({
  color: 0xaad4ff, transparent: true, opacity: 0, depthWrite: false,
});
const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
rainMesh.frustumCulled = false;
rainMesh.visible = false;
scene.add(rainMesh);

let rainBlend = 0, fogBlend = 0;

function setWeather(wId, silent = false) {
  if (!WEATHERS.some(w => w.id === wId)) wId = 'clear';
  G.weather = wId;
  store.set('alex_taxi_weather', wId);
  if (!silent && typeof setObjective === 'function') {
    const w = WEATHERS.find(x => x.id === wId);
    const bonusTxt = w.fareBonus > 1 ? ` · أجرة ×${w.fareBonus}` : '';
    setObjective(`الطقس: ${w.name} ${w.icon}${bonusTxt}`, 2400);
  }
}

function updateWeather(dt) {
  if (typeof G === 'undefined') return;
  if (G.dynWeather && G.state === 'play') {
    G.weatherTimer -= dt;
    if (G.weatherTimer <= 0) {
      G.weatherTimer = rand(85, 150);
      const r = Math.random();
      const options=WEATHERS.filter(w=>w.id!==G.weather);const next=options[Math.floor(r*options.length)].id;
      if (next !== G.weather) setWeather(next, false);
    }
  }

  const rate = 1 - Math.exp(-dt * 1.6);
  rainBlend = lerp(rainBlend, G.weather === 'rain' ? 1 : 0, rate);
  fogBlend = lerp(fogBlend, G.weather === 'fog' ? 1 : 0, rate);

  // تعديل الضباب بعد دورة الليل والنهار
  const baseDensity = lerp(0.00155, 0.00185, DN.night);
  const targetDensity = fogBlend > rainBlend
    ? lerp(baseDensity, 0.0095, fogBlend)
    : lerp(baseDensity, 0.0036, rainBlend);
  scene.fog.density = targetDensity;
  const baseNear = scene.fog.near || 150;
  const baseFar = scene.fog.far || 900;
  const targetNear = fogBlend > rainBlend
    ? lerp(baseNear, 22, fogBlend)
    : lerp(baseNear, 65, rainBlend);
  const targetFar = fogBlend > rainBlend
    ? lerp(baseFar, 175, fogBlend)
    : lerp(baseFar, 360, rainBlend);
  scene.fog.near = targetNear;
  scene.fog.far = targetFar;

  if (fogBlend > .05) {
    scene.fog.color.lerp(_ca.setHex(DN.night > .5 ? 0x263248 : 0xbfc8d4), fogBlend * .55);
  } else if (rainBlend > .05) {
    scene.fog.color.lerp(_ca.setHex(DN.night > .5 ? 0x162033 : 0x5d6e82), rainBlend * .45);
  }

  // لمعان الأسفلت مع المطر والغروب
  if (typeof road !== 'undefined') {
    for(const material of roadSurfaces)material.roughness=lerp(.96,.62,rainBlend);
    road.material.metalness = 0;
  }

  // جزيئات المطر حوالين الكاميرا
  if (rainBlend > .02) {
    rainMesh.visible = true;
    rainMat.opacity = rainBlend * .42;
    const cx = camera.position.x, cz = camera.position.z;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const d = rainDrops[i];
      d.y -= d.sp * dt;
      d.x -= 4.2 * dt;
      if (d.y < 0) {
        d.y += 34;
        d.x = rand(-55, 55);
        d.z = rand(-55, 55);
      }
      if (d.x < -55) d.x += 110;
      const idx = i * 6;
      const wx = cx + d.x, wz = cz + d.z;
      rainPos[idx]     = wx;
      rainPos[idx + 1] = d.y;
      rainPos[idx + 2] = wz;
      rainPos[idx + 3] = wx - .16;
      rainPos[idx + 4] = d.y + 1.15;
      rainPos[idx + 5] = wz;
    }
    rainGeo.attributes.position.needsUpdate = true;
  } else {
    rainMesh.visible = false;
  }
}

/* ========================= 40-city.js ========================= */
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

/* ========================= 42-street-detail.js ========================= */
/* Small, correctly scaled road details. Flat repairs do not create invisible physical obstacles. */
{
 const data=[];
 for(let x=-HALF+30;x<HALF-25;x+=43){
  if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+5))continue;
  data.push({x,z:(Math.floor(x/43)%2?1:-1)*12.9});
 }
 const darkIron=new THREE.MeshStandardMaterial({color:0x494c47,roughness:.86,metalness:.18});
 const lids=new THREE.InstancedMesh(new THREE.CylinderGeometry(.43,.43,.024,24),darkIron,data.length);
 const rims=new THREE.InstancedMesh(new THREE.TorusGeometry(.40,.018,4,24),darkIron,data.length);
 const o=new THREE.Object3D();
 data.forEach((p,i)=>{o.position.set(p.x,.018,p.z);o.rotation.set(0,0,0);o.updateMatrix();lids.setMatrixAt(i,o.matrix);o.rotation.x=-Math.PI/2;o.position.y=.033;o.updateMatrix();rims.setMatrixAt(i,o.matrix);});
 lids.receiveShadow=true;rims.receiveShadow=true;scene.add(lids,rims);
 const drains=[],slots=[];
 for(let x=-HALF+20;x<HALF;x+=36){
  if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+4))continue;
  for(const z of [-15.35,15.35]){drains.push({x,z});for(let i=0;i<6;i++)slots.push({x:x-.27+i*.108,z});}
 }
 const metal=new THREE.InstancedMesh(new THREE.BoxGeometry(.72,.018,.40),darkIron,drains.length);
 const holes=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,.006,.30),new THREE.MeshStandardMaterial({color:0x141b1c,roughness:1}),slots.length);
 drains.forEach((p,i)=>{o.position.set(p.x,.016,p.z);o.rotation.set(0,0,0);o.updateMatrix();metal.setMatrixAt(i,o.matrix);});
 slots.forEach((p,i)=>{o.position.set(p.x,.028,p.z);o.updateMatrix();holes.setMatrixAt(i,o.matrix);});
 scene.add(metal,holes);
 const patchShape=new THREE.Shape();patchShape.moveTo(-1,-.5);patchShape.lineTo(.65,-.6);patchShape.lineTo(1,-.3);patchShape.lineTo(.9,.48);patchShape.lineTo(-.72,.6);patchShape.closePath();
 const patchGeo=new THREE.ShapeGeometry(patchShape);patchGeo.rotateX(-Math.PI/2);
 const patches=new THREE.InstancedMesh(patchGeo,new THREE.MeshStandardMaterial({color:0x222522,roughness:1,transparent:true,opacity:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),data.length);
 data.forEach((p,i)=>{o.position.set(p.x+7,.007,p.z*.55);o.rotation.set(0,rand(-.12,.12),0);o.scale.set(rand(1,3),1,rand(1,2.3));o.updateMatrix();patches.setMatrixAt(i,o.matrix);});patches.receiveShadow=true;scene.add(patches);
}
/* Fictitious local advertising, all ground supports outside the carriageway. */
for(const [i,x] of [-875,-595,-315,105,385,805].entries()){
 const z=25.4;if(onDrivingRoad(x,z,1))continue;
 const big=i%2===0,w=big?9:2.2,h=big?3.8:2.9,y=big?7:2;
 const mat=new THREE.MeshStandardMaterial({map:signTex(['أسيوط تجمعنا','سنتر النميس · تسوق قريب','صيانة سيارتك · خدمة يومية'][i%3],['#e6b86c','#78bec5','#95b486'][i%3]),roughness:.65});
 const panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,.18),mat);panel.position.set(x,y,z);scene.add(panel);
 for(const dx of big?[-w*.36,w*.36]:[0]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,y,8),new THREE.MeshStandardMaterial({color:0x343a3d}));post.position.set(x+dx,y/2,z);scene.add(post);ROAD_FURNITURE.push({x:x+dx,z,kind:'advert'});}
}
// Far bank makes the water read as the Nile rather than an open sea.
{const bank=new THREE.Mesh(new THREE.PlaneGeometry(4000,700),new THREE.MeshStandardMaterial({color:0x8e9470,roughness:1}));bank.rotation.x=-Math.PI/2;bank.position.set(0,.015,-550);scene.add(bank);}

/* ========================= 44-mounted-signs.js ========================= */
/* Physical signboards: authentic Egyptian royal-blue highway & Asyut street enamel faces, white lettering, steel backs and posts. */
function roadSignTexture(text,sub='أسيوط · اتجاه الطريق',arrow='⬆'){
 return canvasTex(1024,320,g=>{
  g.fillStyle='#074b8c';g.fillRect(0,0,1024,320);
  // إطار مزدوج أبيض مطابق ليافطات المرور المصرية
  g.strokeStyle='#f2f8fc';g.lineWidth=12;g.strokeRect(14,14,996,292);
  g.strokeStyle='rgba(255,255,255,0.45)';g.lineWidth=3;g.strokeRect(28,28,968,264);
  // سهم اتجاه أبيض واضح على اليسار
  g.fillStyle='#ffffff';g.font='bold 96px Tahoma, Arial';g.textAlign='center';g.textBaseline='middle';
  g.fillText(arrow,104,160);
  // اسم الشارع / المنطقة بخط عربي عريض
  g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#ffffff';g.font='bold 88px Tahoma, Cairo, Arial';
  g.fillText(text,560,126,760);
  // شريط فرعي باسم المحافظة أو التفرع
  g.fillStyle='#d8eeff';g.font='600 40px Tahoma, Cairo, Arial';
  g.fillText(sub,560,234,740);
 });
}
function highwaySignTexture(text,bg='#074b8c',subtext='',arrow='⬇'){
 return canvasTex(1024,420,g=>{
  g.fillStyle=bg;g.fillRect(0,0,1024,420);
  g.strokeStyle='#ffffff';g.lineWidth=14;g.strokeRect(16,16,992,388);
  g.strokeStyle='rgba(255,255,255,0.4)';g.lineWidth=3;g.strokeRect(32,32,960,356);
  g.fillStyle='#ffffff';g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
  g.font='bold 104px Tahoma, Cairo, Arial';
  g.fillText(text,512,subtext?132:168,900);
  if(subtext){
   g.fillStyle='#e2f2ff';g.font='600 50px Tahoma, Cairo, Arial';
   g.fillText(subtext,512,244,880);
  }
  g.fillStyle='#ffd24c';g.font='bold 84px Tahoma, Arial';
  g.fillText(arrow,512,338);
 });
}
function makeOverheadGantry(leftText,rightText,spanW=14,height=5.6,leftSub='نفق المنفذ · أسيوط'){
 const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x5a6872,metalness:.72,roughness:.35}),concrete=new THREE.MeshStandardMaterial({color:0x9da3a0,roughness:.9});
 const beam=new THREE.Mesh(new THREE.BoxGeometry(spanW+2,.45,.45),steel);beam.position.y=height;beam.castShadow=true;group.add(beam);
 const subBeam=new THREE.Mesh(new THREE.BoxGeometry(spanW+2,.12,.12),steel);subBeam.position.y=height-1.35;group.add(subBeam);
 for(const s of[-1,1]){const legX=s*(spanW/2+.8),col=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,height,12),steel);col.position.set(legX,height/2,0);col.castShadow=true;group.add(col);const base=new THREE.Mesh(new THREE.BoxGeometry(.85,.75,.85),concrete);base.position.set(legX,.375,0);base.receiveShadow=true;group.add(base);}
 const leftMat=new THREE.MeshStandardMaterial({map:highwaySignTexture(leftText,'#074b8c',leftSub,'⬇'),roughness:.38,emissive:0x0b3a66,emissiveIntensity:.22});
 const leftSign=new THREE.Mesh(new THREE.BoxGeometry(spanW*.44,1.85,.12),[steel,steel,steel,steel,leftMat,leftMat]);leftSign.position.set(-spanW*.24,height-.80,.08);leftSign.castShadow=true;group.add(leftSign);
 const rightMat=new THREE.MeshStandardMaterial({map:highwaySignTexture(rightText,'#074b8c','أسيوط · محور رئيسي','↗'),roughness:.38,emissive:0x0b3a66,emissiveIntensity:.22});
 const rightSign=new THREE.Mesh(new THREE.BoxGeometry(spanW*.44,1.85,.12),[steel,steel,steel,steel,rightMat,rightMat]);rightSign.position.set(spanW*.24,height-.80,.08);rightSign.castShadow=true;group.add(rightSign);
 return group;
}
function makeMountedRoadSign(text,w=5.0,h=1.28,y=4.2,sub='محافظة أسيوط',arrow='⬆'){
 const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x687780,metalness:.68,roughness:.4}),face=new THREE.MeshStandardMaterial({map:roadSignTexture(text,sub,arrow),roughness:.42,metalness:.16}),panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,.10),[steel,steel,steel,steel,face,face]);panel.position.y=y;panel.castShadow=true;group.add(panel);
 for(const x of[-w*.32,w*.32]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,y+h*.35,8),steel);post.position.set(x,(y+h*.35)/2,-.09);post.castShadow=true;group.add(post);}
 for(const yy of[y-h*.25,y+h*.25]){const back=new THREE.Mesh(new THREE.BoxGeometry(w*.90,.055,.10),steel);back.position.set(0,yy,-.12);group.add(back);}group.userData.mountedSign=true;return group;
}
function addMountedRoadSign(text,point,roadHint,sub='محافظة أسيوط'){
 const near=nearestAssyutRoad(point);if(!near)return null;let side=near.side||1,x=near.point.x+near.nx*side*(near.width/2+3.3),z=near.point.z+near.nz*side*(near.width/2+3.3);if(nearestAssyutRoad({x,z}).distance<near.width/2+1)return null;
 const arrow=near.road.oneway==='yes'?'⬆':(side>0?'↗':'↖');
 const sign=makeMountedRoadSign(text,5.0,1.28,4.2,sub,arrow);sign.position.set(x,assyutRoadHeightAt(x,z),z);sign.rotation.y=near.heading-Math.PI/2+(near.road.oneway==='-1'?Math.PI:0);const feet=[-1.536,1.536].map(localX=>new THREE.Vector3(localX,0,-.09).applyAxisAngle(new THREE.Vector3(0,1,0),sign.rotation.y).add(new THREE.Vector3(x,0,z)));if(feet.some(p=>onDrivingRoad(p.x,p.z,.15)))return null;(REAL_CITY.signs??=[]).push(sign);REAL_CITY.group.add(sign);for(const localX of[-1.536,1.536]){const v=new THREE.Vector3(localX,0,-.09).applyAxisAngle(new THREE.Vector3(0,1,0),sign.rotation.y);ROAD_FURNITURE.push({x:x+v.x,z:z+v.z,kind:'roadSign'});}return sign;
}
const REAL_SHOP_SIGNS=[
 ['كازيون ماركت','#c8102e','#ffd200','KAZYON · عروض يومية · أسيوط'],
 ['مطعم فول وطعمية الصعيدي','#b83214','#fff4d6','فول · طعمية · بطاطس · 24 ساعة'],
 ['ورشة ميكانيكا سيارات','#123d72','#ffd24c','ميكانيكا · عفشة · كهرباء · تغيير زيت'],
 ['كشري ومشويات أسيوط','#7a1c22','#ffe6a8','كشري · طواجن · حواوشي · مشويات'],
 ['صيدلية الشفاء','#086e49','#ffffff','د. أحمد · خدمة 24 ساعة · أسيوط'],
 ['مطعم أولاد البلد','#8c3a10','#fff2cc','فول وطعمية · سندوتشات مصرية'],
 ['مركز كاوتش وبنشر','#1e293b','#facc15','ترصيص · زوايا · تغيير زيوت · أسيوط']
].map(([name,bg,ink,sub])=>canvasTex(1024,256,g=>{g.fillStyle=bg;g.fillRect(0,0,1024,256);g.strokeStyle=ink;g.lineWidth=6;g.strokeRect(12,12,1000,232);g.fillStyle=ink;g.direction='rtl';g.textAlign='center';g.textBaseline='middle';g.font='bold 88px Tahoma, Cairo';g.fillText(name,512,104,940);g.fillStyle='#ffffff';g.font='600 36px Tahoma, Cairo';g.fillText(sub||'أسيوط',512,200,920);}));

/* ========================= 45-props.js ========================= */
/* ------------------------- أعمدة نور الشوارع ------------------------- */
{
  const lampPos = [];
  const nearVertical = x => V_STREETS.some(v => Math.abs(x - v.x) < v.half + 3);
  const nearHorizontal = z => H_STREETS.some(h => Math.abs(z - h.z) < h.half + 3);

  for (const h of H_STREETS) {
    if (h.kind === 'corniche') continue;
    const step = h.kind === 'wide' ? 58 : 70;
    for (let x = -HALF + 34; x < HALF - 34; x += step) {
      for (const s of [-1, 1]) {
        const px = x + (s > 0 ? 0 : step / 2);
        const pz = h.z + s * (h.half + 1.5);
        if (nearVertical(px)) continue;
        lampPos.push({ x: px, z: pz, nx: 0, nz: -s });
      }
    }
  }
  for (const v of V_STREETS) {
    if (v.kind !== 'wide') continue;
    for (let z = 34; z < CITY_Z1 - 26; z += 58) {
      for (const s of [-1, 1]) {
        const px = v.x + s * (v.half + 1.5);
        const pz = z + (s > 0 ? 0 : 29);
        if (nearHorizontal(pz)) continue;
        lampPos.push({ x: px, z: pz, nx: -s, nz: 0 });
      }
    }
  }

  for(let i=lampPos.length-1;i>=0;i--)if(onDrivingRoad(lampPos[i].x,lampPos[i].z,.2))lampPos.splice(i,1);
  ROAD_FURNITURE.push(...lampPos.map(p=>({x:p.x,z:p.z,kind:"streetlight"})));
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f3946, roughness: .65, metalness: .35 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .11, 7, 6), poleMat, lampPos.length);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, .12, .16), poleMat, lampPos.length);
  const heads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(.23, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8 }),
    lampPos.length
  );
  const pools = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffb060, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    lampPos.length
  );

  const glowPts = [];
  lampPos.forEach((p, i) => {
    dummy.position.set(p.x, 3.5, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x + p.nx * .68, 6.88, p.z + p.nz * .68);
    dummy.rotation.set(0, Math.atan2(-p.nz, p.nx), 0);
    dummy.updateMatrix();
    arms.setMatrixAt(i, dummy.matrix);

    const hx = p.x + p.nx * 1.42, hz = p.z + p.nz * 1.42;
    dummy.position.set(hx, 6.78, hz);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x + p.nx * 3.2, .045, p.z + p.nz * 3.2);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(5.4, 5.4, 1);
    dummy.updateMatrix();
    pools.setMatrixAt(i, dummy.matrix);

    glowPts.push(hx, 6.72, hz);
  });
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);

  for (const m of [poles, arms, heads, pools]) {
    m.frustumCulled = false;
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  }

  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPts, 3));
  const glowMat = new THREE.PointsMaterial({
    map: GLOW_TEX, color: 0xffc880, size: 9, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lampGlow = new THREE.Points(glowGeo, glowMat);
  lampGlow.frustumCulled = false;
  scene.add(lampGlow);

  nightGlows.push({ mat: glowMat, day: 0, night: .95 });
  nightGlows.push({ mat: pools.material, day: 0, night: .34 });
}

/* أفق بعيد عبر البحر */
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x51456a, roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const w = rand(20, 58), h = rand(16, 62), d = rand(16, 30);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(rand(-1500, 1500), h / 2 - 1, rand(-640, -520));
    scene.add(b);
  }

}

/* ------------------------- النخيل (جذوع حلقية + سعف متهدل + نخيل الجزيرة الوسطى) ------------------------- */
const TREES = [];
{
  const positions = [];
  for (let x = -HALF + 12; x < HALF - 12; x += 26) {
    if (Math.random() < .18) continue;
    positions.push({ x: x + rand(-3, 3), z: -21.4 + rand(-1, 1), h: rand(7.5, 11) });
    if (Math.random() < .8) positions.push({ x: x + rand(-6, 6), z: 21.4 + rand(-1, 1), h: rand(7.5, 11) });
  }
  // نخيل الجزيرة الوسطى (الكورنيش) زي الفيديو
  for (let x = -HALF + 32; x < HALF - 32; x += 38) {
    if (V_STREETS.some(v => Math.abs(x - v.x) < v.half + 5)) continue;
    positions.push({ x: x + rand(-2, 2), z: rand(-.2, .2), h: rand(8.5, 11.8) });
  }
  // نخيل جوه المدينة على أرصفة الشوارع
  for (const line of [{ z: 64, h: 5.5 }, { z: 140, h: 11 }, { z: 210, h: 5 }, { z: 274, h: 12 }]) {
    for (let x = -HALF + 40; x < HALF - 40; x += 44) {
      if (V_STREETS.some(v => Math.abs(x - v.x) < v.half + 5)) continue;
      for (const s of [-1, 1]) {
        if (Math.random() < .35) continue;
        positions.push({ x: x + rand(-2, 2), z: line.z + s * (line.h + 1.5), h: rand(6.5, 9.5) });
      }
    }
  }
  for(let i=positions.length-1;i>=0;i--){
    const p=positions[i];
    if(onDrivingRoad(p.x,p.z,.5))positions.splice(i,1);
  }
  for (const p of positions) TREES.push({ x: p.x, z: p.z, r: .55 });

  const barkTex = canvasTex(64, 128, g => {
    g.fillStyle = '#5c4128'; g.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 8) {
      g.fillStyle = y % 16 ? '#46301c' : '#6c4d32';
      g.fillRect(0, y, 64, 5);
    }
  });
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
  barkTex.repeat.set(1, 5);

  const trunkGeo = new THREE.CylinderGeometry(.22, .40, 6.5, 7);
  trunkGeo.translate(0, 3.25, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: .95 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  trunks.castShadow = true;
  trunks.frustumCulled = false;
  positions.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, rand(0, 6.28), rand(-.05, .05));
    dummy.scale.set(1, p.h / 6.5, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  scene.add(trunks);

  const leafGeo = new THREE.ConeGeometry(.42, 3.6, 5);
  leafGeo.translate(0, 1.8, 0);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2c6e3d, roughness: .9, flatShading: true, side: THREE.DoubleSide,
  });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, positions.length * 10);
  leaves.castShadow = true;
  leaves.frustumCulled = false;
  let li = 0;
  for (const p of positions) {
    for (let k = 0; k < 10; k++) {
      dummy.position.set(p.x, p.h - .15, p.z);
      dummy.rotation.set(0, k * (Math.PI * 2 / 10) + rand(-.12, .12), rand(1.1, 1.65));
      dummy.scale.set(rand(.85, 1.15), rand(.9, 1.15), rand(.85, 1.15));
      dummy.updateMatrix();
      leaves.setMatrixAt(li++, dummy.matrix);
    }
  }
  scene.add(leaves);
}

/* ------------------------- أعمدة نور الكورنيش الكلاسيكية (فانوسين) ------------------------- */
{
  const lampPos = [];
  for(let x=-HALF+8;x<HALF;x+=32){for(const p of [{x,z:-21.5},{x:x+16,z:21.8}])if(!onDrivingRoad(p.x,p.z)){lampPos.push(p);ROAD_FURNITURE.push({...p,kind:'lamp'});}}
  const poleGeo = new THREE.CylinderGeometry(.11, .19, 7.6, 8);
  poleGeo.translate(0, 3.8, 0);
  const metal = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: .5, metalness: .55 });
  const poles = new THREE.InstancedMesh(poleGeo, metal, lampPos.length);
  poles.castShadow = true;
  poles.frustumCulled = false;

  const armGeo = new THREE.BoxGeometry(2.4, .12, .12);
  const arms = new THREE.InstancedMesh(armGeo, metal, lampPos.length);
  arms.frustumCulled = false;

  const lanternGeo = new THREE.CylinderGeometry(.22, .15, .52, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4a0 });
  const bulbs = new THREE.InstancedMesh(lanternGeo, bulbMat, lampPos.length * 2);
  bulbs.frustumCulled = false;

  const glowPositions = [];
  let bi = 0;
  lampPos.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, 7.55, p.z);
    dummy.updateMatrix();
    arms.setMatrixAt(i, dummy.matrix);

    for (const s of [-1, 1]) {
      const bx = p.x + s * 1.15;
      dummy.position.set(bx, 7.30, p.z);
      dummy.updateMatrix();
      bulbs.setMatrixAt(bi++, dummy.matrix);
      glowPositions.push(bx, 7.30, p.z);
    }
  });
  scene.add(poles, arms, bulbs);

  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3));
  const glowMat = new THREE.PointsMaterial({
    map: GLOW_TEX, color: 0xffc070, size: 1.4, sizeAttenuation: true,
    transparent: true, opacity: .85, blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glows = new THREE.Points(glowGeo, glowMat);
  glows.frustumCulled = false;
  scene.add(glows);
  nightGlows.push({ mat: glowMat, day: .15, night: .95 });
}

/* ------------------------- شجيرات الجزيرة ------------------------- */
{
  const bushGeo = new THREE.SphereGeometry(1, 8, 6);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x56634a, roughness: .98, flatShading: false });
  const count = Math.ceil(WORLD / 24);
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, count);
  let n = 0;
  for (let x = -HALF + 16; x < HALF; x += 24) {
    if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+5))continue;
    dummy.position.set(x + rand(-4, 4), .68, rand(-.35, .35));
    dummy.rotation.set(0, rand(0, 6), 0);
    dummy.scale.set(rand(.55, .95), rand(.45, .72), rand(.55, .95));
    dummy.updateMatrix();
    bushes.setMatrixAt(n++, dummy.matrix);
  }
  bushes.count = n;
  bushes.frustumCulled = false;
  scene.add(bushes);
}

/* ------------------------- مواقف ومهملات ------------------------- */
{
  const signBoard = canvasTex(256, 128, g => {
    g.fillStyle = '#0b2a4a'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#ffc61a'; g.lineWidth = 6; g.strokeRect(4, 4, 248, 120);
    g.fillStyle = '#ffc61a'; g.font = '900 46px Cairo, Tahoma, Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('موقف', 128, 48);
    g.fillStyle = '#fff'; g.font = '700 24px Cairo, Tahoma, Arial';
    g.fillText('ASSIUT', 128, 96);
  });
  for (let x = -HALF + 90; x < HALF - 60; x += 260) {
    if(onDrivingRoad(x,22.9))continue;ROAD_FURNITURE.push({x,z:22.9,kind:'sign'});
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(.07, .07, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: .7 })
    );
    pole.position.set(x, 1.5, 22.9);
    scene.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, .9),
      new THREE.MeshBasicMaterial({ map: signBoard, side: THREE.DoubleSide })
    );
    board.position.set(x, 3.1, 22.9);
    board.rotation.y = Math.PI / 2;
    scene.add(board);
  }
}

/* Large, lane-facing signals. Every ground mast is placed outside the carriageway. */
const TRAFFIC_LIGHTS=[];
function signalHead(ix,axis,dir){
 const post=axis==='x'?{x:ix.x-dir*(ix.halfX+2.2),z:ix.z+dir*(ix.halfZ+2.5)}:{x:ix.x-dir*(ix.halfX+2.5),z:ix.z-dir*(ix.halfZ+2.2)};
 const center=axis==='x'?{x:post.x,z:ix.z+dir*Math.min(9.4,ix.halfZ*.58)}:{x:ix.x-dir*ix.halfX*.5,z:post.z};
 const metal=new THREE.MeshStandardMaterial({color:0x303633,metalness:.35,roughness:.55});
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.14,.19,7.1,12),metal);mast.position.set(post.x,3.55,post.z);mast.castShadow=true;scene.add(mast);
 ROAD_FURNITURE.push({...post,kind:'signal'});
 const arm=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?.18:Math.abs(center.x-post.x)+.25,.18,axis==='x'?Math.abs(center.z-post.z)+.25:.18),metal);arm.position.set((post.x+center.x)/2,7.0,(post.z+center.z)/2);scene.add(arm);
 const head=new THREE.Group();head.position.set(center.x,5.92,center.z);head.rotation.y=axis==='x'?(dir>0?-Math.PI/2:Math.PI/2):(dir>0?Math.PI:0);
 const back=new THREE.Mesh(new THREE.BoxGeometry(1.12,2.75,.32),new THREE.MeshStandardMaterial({color:0x151b18,roughness:.7}));head.add(back);
 const trim=new THREE.Mesh(new THREE.BoxGeometry(1.24,2.89,.16),new THREE.MeshStandardMaterial({color:0xc6bf91,roughness:.86}));trim.position.z=-.18;head.add(trim);
 const make=(y,color)=>{const mat=new THREE.MeshBasicMaterial({color,toneMapped:false});const disk=new THREE.Mesh(new THREE.CircleGeometry(.315,28),mat);disk.position.set(0,y,.171);head.add(disk);
 const shade=new THREE.Mesh(new THREE.TorusGeometry(.334,.044,6,28),new THREE.MeshStandardMaterial({color:0x111613,roughness:.9}));shade.position.set(0,y,.22);head.add(shade);
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.position.set(0,y,.25);glow.scale.set(1.8,1.8,1);head.add(glow);return {mat,glow};};
 const r=make(.83,0xff1610),y=make(0,0xffc323),gr=make(-.83,0x1bff64);scene.add(head);
 // A visible stop line corresponds to the front-bumper crossing used for fines.
 const stop=axis==='x'?ix.x-dir*(ix.halfX+2.5):ix.z-dir*(ix.halfZ+2.5);
 const line=new THREE.Mesh(new THREE.PlaneGeometry(axis==='x'?.44:ix.halfX-.9,axis==='x'?ix.halfZ-.9:.44),new THREE.MeshStandardMaterial({color:0xe2dfcc,roughness:.9}));line.rotation.x=-Math.PI/2;
 line.position.set(axis==='x'?stop:ix.x-dir*ix.halfX*.5,.036,axis==='x'?ix.z+dir*ix.halfZ*.5:stop);scene.add(line);
 return {r:r.mat,y:y.mat,gr:gr.mat,redGlow:r.glow,yellowGlow:y.glow,greenGlow:gr.glow};
}
for(const ix of [
 {x:-480,z:0,halfX:12,halfZ:ROAD_HALF,phase:0},{x:0,z:0,halfX:12,halfZ:ROAD_HALF,phase:6},{x:480,z:0,halfX:12,halfZ:ROAD_HALF,phase:12},{x:960,z:0,halfX:12,halfZ:ROAD_HALF,phase:18},
 {x:-480,z:140,halfX:12,halfZ:11,phase:9},{x:0,z:140,halfX:12,halfZ:11,phase:15},{x:480,z:140,halfX:12,halfZ:11,phase:3}
])TRAFFIC_LIGHTS.push({...ix,timer:ix.phase,xState:'green',zState:'red',xBulbs:[signalHead(ix,'x',1),signalHead(ix,'x',-1)],zBulbs:[signalHead(ix,'z',1),signalHead(ix,'z',-1)]});
function updateTrafficLights(dt){
 for(const tl of TRAFFIC_LIGHTS){tl.timer=(tl.timer+dt)%28;if(tl.timer<12){tl.xState='green';tl.zState='red';}else if(tl.timer<15){tl.xState='yellow';tl.zState='red';}else if(tl.timer<25){tl.xState='red';tl.zState='green';}else{tl.xState='red';tl.zState='yellow';}
 for(const [list,state]of [[tl.xBulbs,tl.xState],[tl.zBulbs,tl.zState]])for(const b of list){b.r.color.setHex(state==='red'?0xff1610:0x180705);b.y.color.setHex(state==='yellow'?0xffc323:0x181405);b.gr.color.setHex(state==='green'?0x1bff64:0x051309);if(b.redGlow){b.redGlow.visible=state==='red';b.yellowGlow.visible=state==='yellow';b.greenGlow.visible=state==='green';}}
 }
}
function signalAhead(){
 if(typeof ASSYUT!=='undefined')return assyutSignalAhead();
 let best=null;
 for(const tl of TRAFFIC_LIGHTS){for(const axis of ['x','z']){const forward=axis==='x'?Math.cos(car.heading):-Math.sin(car.heading);if(Math.abs(forward)<.72)continue;const dir=forward>0?1:-1,across=axis==='x'?Math.abs(car.z-tl.z):Math.abs(car.x-tl.x),half=axis==='x'?tl.halfZ:tl.halfX;if(across>half-.5)continue;
 const stop=(axis==='x'?tl.x:tl.z)-dir*((axis==='x'?tl.halfX:tl.halfZ)+2.5),pos=axis==='x'?car.x:car.z,distance=(stop-pos)*dir-vehicleParameters().halfLength;
 if(distance>=-2&&distance<110&&(!best||distance<best.distance))best={light:tl,axis,dir,distance,state:axis==='x'?tl.xState:tl.zState};}}
 return best;
}
function updateSignalHint(){const el=$('trafficSignalHint');if(!el)return;const signal=G.state==='play'?signalAhead():null;el.classList.toggle('hidden',!signal);if(!signal)return;
 const labels={red:'قف · إشارة حمراء',yellow:'استعد للتوقف',green:'إشارة خضراء'},colors={red:'#ff5148',yellow:'#ffd35b',green:'#63e89c'};el.style.setProperty('--signal-color',colors[signal.state]);el.innerHTML=`<i></i><span>${labels[signal.state]}</span><b>${Math.max(0,Math.round(signal.distance))} م</b>`;}
updateTrafficLights(0);

/* ========================= 46-assyut-city.js ========================= */
/* Rebuild the playable city on surveyed OSM lines. Building appearance is authored. */
let citySeed=603711;
function cityRandom(){citySeed=(Math.imul(citySeed,1664525)+1013904223)>>>0;return citySeed/4294967296;}
function cityRand(a,b){return a+cityRandom()*(b-a);}
function cityPick(items){return items[Math.floor(cityRandom()*items.length)];}
const REAL_CITY={group:new THREE.Group(),buildings:[],styles:{},roadMeshes:0,groundMat:null,externalLandmarks:[]};
function isVillageSeg(seg){
 if(!seg)return false;
 if(typeof INFRA!=='undefined'&&INFRA.profiles?.has(seg.road))return false;
 if(seg.width>9.5)return false;
 const road=ASSYUT.roads[seg.road];
 const name=road?.name||'';
 if(/زراع|قرية|درب|حارة|نزلة|درنكة|سوق|الحمراء|ريفي|ريف|شعب|صواف|عفان|بهيج|بني حسين|المطيعة|منقباد/i.test(name))return true;
 const midX=(seg.a.x+seg.b.x)/2,midZ=(seg.a.z+seg.b.z)/2;
 return (midX>450||midZ>450||midZ<-450||(midX<-450&&midZ<-300));
}
REAL_CITY.isVillageSeg=isVillageSeg;
{
 const keep=new Set([sky,clouds,sea]);
 for(const child of scene.children.slice())if(!child.isLight&&!keep.has(child)){scene.remove(child);child.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)o.geometry?.dispose();});}
 sea.visible=false; // This central district does not contain the old fictional seafront.
 for(const a of [MAP.buildings,buildingData,WALK_SURFACES,ROAD_FURNITURE,MEDIAN_SEGMENTS,CURB_SEGMENTS,TREES,TRAFFIC_LIGHTS])a.length=0;
 MAP.streets.length=0;MAP.alleys.length=0;MAP.places=ASSYUT.places;
 for(const {mesh}of nearArchitecture)mesh.visible=false;nearArchitecture.length=0;
 scene.add(REAL_CITY.group);
 const rep=(tx,rx,ry)=>{tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(rx,ry);return tx;};
 const earthTex=rep(canvasTex(256,256,g=>{g.fillStyle='#9e8f77';g.fillRect(0,0,256,256);for(let i=0;i<1100;i++){g.fillStyle=i%4===0?'rgba(135,122,98,.28)':i%3===0?'rgba(180,166,140,.22)':'rgba(110,98,76,.25)';g.fillRect(cityRandom()*252,cityRandom()*252,2+cityRandom()*10,2+cityRandom()*8);}}),160,160);
 const groundMat=REAL_CITY.groundMat=new THREE.MeshStandardMaterial({map:earthTex,color:(typeof VISUAL_CONFIG!=='undefined'&&VISUAL_CONFIG.road?.groundColor)?VISUAL_CONFIG.road.groundColor:0xa29278,roughness:.96,envMapIntensity:.08});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(6500,6500),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.03;ground.receiveShadow=true;ground.userData.cityGround=true;REAL_CITY.group.add(ground);
 const paverTex=rep(canvasTex(128,128,g=>{g.fillStyle='#c2b8a2';g.fillRect(0,0,128,128);g.strokeStyle='#887f6d';g.lineWidth=2;for(let y=0;y<128;y+=16){const off=(y/16)%2?16:0;g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();for(let x=off;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.stroke();}}for(let i=0;i<110;i++){g.fillStyle=i%2?'rgba(255,250,235,.09)':'rgba(55,48,38,.08)';g.fillRect(cityRandom()*124,cityRandom()*124,4,4);}}),1,1);
 const curbTex=rep(canvasTex(512,128,g=>{
  // بلدورة مصرية أبيض وأسود معتقة ومكسرة ومغبرة بالتراب زي شوارع أسيوط
  g.fillStyle='#d8d0c0';g.fillRect(0,0,256,128);
  g.fillStyle='#2a2927';g.fillRect(256,0,256,128);
  // فواصل الحجر وتكسير الطلاء عند الحواف
  g.fillStyle='rgba(75,68,58,0.55)';g.fillRect(252,0,8,128);g.fillRect(0,0,4,128);
  for(let i=0;i<320;i++){
   const bx=cityRandom()*508,by=cityRandom()*118;
   g.fillStyle=cityRandom()<.45?'rgba(168,152,126,0.42)':cityRandom()<.7?'rgba(42,38,34,0.34)':'rgba(225,216,198,0.32)';
   g.fillRect(bx,by,2+cityRandom()*9,2+cityRandom()*6);
  }
  // تقشير دهان خفيف على الجزء الأسود والأبيض
  for(let i=0;i<24;i++){
   g.fillStyle='rgba(150,138,118,0.48)';
   g.fillRect(cityRandom()*490,cityRandom()*30,6+cityRandom()*16,3+cityRandom()*8);
  }
  const dirtGrad=g.createLinearGradient(0,68,0,128);
  dirtGrad.addColorStop(0,'rgba(168,150,122,0)');
  dirtGrad.addColorStop(0.55,'rgba(162,144,116,0.48)');
  dirtGrad.addColorStop(1,'rgba(155,138,110,0.88)');
  g.fillStyle=dirtGrad;g.fillRect(0,68,512,60);
 }),1,1);
 const dirtVergeTex=rep(canvasTex(128,128,g=>{
  g.fillStyle='#9c8c72';g.fillRect(0,0,128,128);
  for(let i=0;i<700;i++){
   const c=cityRandom();
   g.fillStyle=c<.4?'#8a7a60':c<.7?'#b2a084':'#6e5e48';
   g.fillRect(cityRandom()*125,cityRandom()*125,1.5+cityRandom()*3,1.5+cityRandom()*3);
  }
  for(let i=0;i<80;i++){
   g.fillStyle='rgba(110,105,75,0.45)';
   g.fillRect(cityRandom()*126,cityRandom()*126,2,3);
  }
 }),2,2);
 REAL_CITY.grassMat=new THREE.MeshStandardMaterial({map:dirtVergeTex,color:0x9c8c72,roughness:.96,envMapIntensity:.08});
 const terracottaTex=rep(canvasTex(128,128,g=>{g.fillStyle='#a84632';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=16){const off=(y/16)%2?16:0;for(let x=off;x<128;x+=32){g.fillStyle=cityRandom()<.35?'#983c2a':cityRandom()<.5?'#b64f3a':'#a84632';g.fillRect(x+1,y+1,30,14);}}g.strokeStyle='rgba(50,20,14,0.45)';g.lineWidth=1.5;for(let y=0;y<=128;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();}for(let y=0;y<128;y+=16){const off=(y/16)%2?16:0;for(let x=off;x<=128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.stroke();}}}),1,1);
 // نسيج الأسفلت الريفي المعتق والترابي لشوارع وقرى أسيوط (بدون خطوط بيضاء، وترقيعات قار قديمة، وحواف ترابية)
 const villageAsphaltTex=rep(canvasTex(256,256,g=>{
  g.fillStyle='#46423d';g.fillRect(0,0,256,256);
  g.fillStyle='#2c2a27';
  g.fillRect(24,32,54,36);g.fillRect(138,105,72,50);g.fillRect(65,185,58,32);
  g.strokeStyle='#1b1a18';g.lineWidth=1.4;g.beginPath();
  g.moveTo(12,42);g.lineTo(38,50);g.lineTo(60,46);g.lineTo(76,64);
  g.moveTo(132,118);g.lineTo(168,124);g.lineTo(192,146);g.lineTo(210,152);
  g.moveTo(68,198);g.lineTo(92,202);g.lineTo(120,216);g.stroke();
  for(let i=0;i<850;i++){
   const c=cityRandom();
   g.fillStyle=c<.4?'rgba(165,152,126,0.22)':c<.7?'rgba(48,45,40,0.28)':'rgba(205,190,160,0.18)';
   g.fillRect(cityRandom()*254,cityRandom()*254,1.5+cityRandom()*3,1.5+cityRandom()*2.5);
  }
  const gradL=g.createLinearGradient(0,0,28,0);gradL.addColorStop(0,'rgba(175,158,130,0.52)');gradL.addColorStop(1,'rgba(175,158,130,0)');g.fillStyle=gradL;g.fillRect(0,0,28,256);
  const gradR=g.createLinearGradient(228,0,256,0);gradR.addColorStop(0,'rgba(175,158,130,0)');gradR.addColorStop(1,'rgba(175,158,130,0.52)');g.fillStyle=gradR;g.fillRect(228,0,28,256);
 }),1,1);
 const villageWalkTex=rep(canvasTex(128,128,g=>{
  g.fillStyle='#b4a58d';g.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=24){
   const off=(y/24)%2?12:0;g.strokeStyle='#887963';g.lineWidth=1.5;g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();
   for(let x=off;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+24);g.stroke();}
  }
  for(let i=0;i<350;i++){g.fillStyle=cityRandom()<.5?'rgba(140,126,102,0.22)':'rgba(80,72,58,0.18)';g.fillRect(cityRandom()*126,cityRandom()*126,2+cityRandom()*4,2+cityRandom()*4);}
 }),1,1);
 const villageRoadMat=new THREE.MeshStandardMaterial({map:villageAsphaltTex,roughness:.94,metalness:.04,envMapIntensity:.16});
 const villageWalkMat=new THREE.MeshStandardMaterial({map:villageWalkTex,color:0xc2b5a2,roughness:.95,envMapIntensity:.10,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 // نسيج المباني المصرية الاحترافي (طوب أحمر وأعمدة خرسانة / حجر هاشمي وشبابيك تراثية / واجهات أبراج حديثة)
 REAL_CITY.brickTex=rep(canvasTex(256,256,g=>{g.fillStyle='#964633';g.fillRect(0,0,256,256);for(let y=0;y<256;y+=9){g.fillStyle='#6b564b';g.fillRect(0,y,256,1.5);const off=(y/9)%2?10:0;for(let x=off;x<256;x+=20){g.fillStyle=cityRandom()<.35?'#813a2a':cityRandom()<.5?'#aa5640':'#944734';g.fillRect(x,y+1.5,18.6,7.5);}}g.fillStyle='rgba(0,0,0,.14)';for(const y of[0,124])g.fillRect(0,y+11,256,5);g.fillStyle='#8d8b84';for(const x of[0,118,240])g.fillRect(x,0,16,256);for(const y of[0,124])g.fillRect(0,y,256,12);g.fillStyle='#a09d95';for(const x of[2,120])g.fillRect(x,0,3,256);}),1,1);
 REAL_CITY.oldTex=rep(canvasTex(256,256,g=>{g.fillStyle='#cbb28b';g.fillRect(0,0,256,256);for(let i=0;i<360;i++){g.fillStyle=i%2?'rgba(95,72,48,.08)':'rgba(255,244,220,.09)';g.fillRect(cityRandom()*248,cityRandom()*248,5+cityRandom()*15,4+cityRandom()*11);}g.fillStyle='#9e825a';for(let y=0;y<256;y+=64){g.fillRect(0,y,256,5);g.fillStyle='rgba(0,0,0,.09)';g.fillRect(0,y+5,256,4);g.fillStyle='#9e825a';}g.strokeStyle='rgba(115,92,62,.22)';g.lineWidth=1.5;for(let y=0;y<256;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}}),1,1);
 REAL_CITY.modernTex=rep(canvasTex(256,256,g=>{g.fillStyle='#d2d7d6';g.fillRect(0,0,256,256);g.strokeStyle='rgba(65,78,86,.26)';g.lineWidth=2;for(let y=0;y<256;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}for(let x=0;x<256;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x,256);g.stroke();}g.fillStyle='rgba(255,255,255,.10)';for(let y=0;y<256;y+=64)g.fillRect(0,y,256,3);}),1,1);
 REAL_CITY.litGlass=new THREE.MeshStandardMaterial({color:0x4a5e66,roughness:.18,metalness:.3,emissive:0xffcd82,emissiveIntensity:0,envMapIntensity:.75});
 if(typeof nightWindows!=='undefined')nightWindows.push(REAL_CITY.litGlass);
 REAL_CITY.palmBarkTex=rep(canvasTex(64,128,g=>{g.fillStyle='#6e5038';g.fillRect(0,0,64,128);for(let y=0;y<128;y+=8){g.fillStyle=y%16===0?'#513825':'#7d5c40';g.fillRect(0,y,64,4);g.strokeStyle='#3d291a';g.lineWidth=1.5;g.beginPath();g.moveTo(0,y);g.lineTo(64,y+6);g.stroke();}}),1,4);
 REAL_CITY.treeBarkTex=rep(canvasTex(64,128,g=>{g.fillStyle='#594330';g.fillRect(0,0,64,128);for(let i=0;i<60;i++){g.fillStyle=i%2?'#423020':'#6e543d';g.fillRect(cityRandom()*58,cityRandom()*110,3,14+cityRandom()*18);}}),1,2);
 REAL_CITY.palmFrondTex=canvasTex(128,256,g=>{g.clearRect(0,0,128,256);g.strokeStyle='#5a7f31';g.lineWidth=4;g.beginPath();g.moveTo(64,250);g.lineTo(64,10);g.stroke();for(let y=22;y<240;y+=9){const spread=Math.sin((y/245)*Math.PI)*56+6;for(const s of[-1,1]){g.fillStyle=y%18<9?'#3d7830':'#4f8f3a';g.beginPath();g.moveTo(64,y);g.quadraticCurveTo(64+s*spread*.55,y-9,64+s*spread,y+7);g.quadraticCurveTo(64+s*spread*.45,y+4,64,y+5);g.fill();}}});
 REAL_CITY.leafCanopyTex=canvasTex(128,128,g=>{g.clearRect(0,0,128,128);const cols=['#2c5d23','#3c7b30','#4c8f3b','#65aa4a'];for(let i=0;i<150;i++){const a=cityRandom()*6.28,r=Math.sqrt(cityRandom())*52,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;g.save();g.translate(x,y);g.rotate(cityRandom()*6.28);g.fillStyle=cols[i%cols.length];g.beginPath();g.ellipse(0,0,6+cityRandom()*6,3.5+cityRandom()*3.5,0,0,7);g.fill();g.restore();}});

 const segHitsAnyRoad=(px,pz,margin)=>{
  const cx=Math.floor(px/ASSYUT.cell),cz=Math.floor(pz/ASSYUT.cell),seen=new Set();
  for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(const idx of ASSYUT.spatial.get(a+','+b)||[]){
   if(seen.has(idx))continue;seen.add(idx);const s=ASSYUT.segments[idx],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((px-s.a.x)*dx+(pz-s.a.z)*dz)/(s.length*s.length),0,1);
   if(Math.hypot(px-s.a.x-dx*t,pz-s.a.z-dz*t)<s.width/2+margin)return true;
  }return false;
 };
 const nodeDeg=new Int16Array(ASSYUT.nodes.length),nodeMaxW=new Float32Array(ASSYUT.nodes.length);
 for(const seg of ASSYUT.segments){if(INFRA.profiles.has(seg.road))continue;nodeDeg[seg.aNode]++;nodeDeg[seg.bNode]++;nodeMaxW[seg.aNode]=Math.max(nodeMaxW[seg.aNode],seg.width);nodeMaxW[seg.bNode]=Math.max(nodeMaxW[seg.bNode],seg.width);}

 const roadV=[],roadUV=[],walkV=[],walkUV=[],curbV=[],curbUV=[],lines=[],yellowLines=[],medianV=[],medianUV=[],vergeV=[],vergeUV=[];
 const villageRoadV=[],villageRoadUV=[],villageWalkV=[],villageWalkUV=[];
 const quad=(verts,uv,a,b,width,y,shift=0)=>{const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)return;const nx=-dz/len,nz=dx/len;const pts=[[a.x+nx*(shift-width/2),y,a.z+nz*(shift-width/2)],[b.x+nx*(shift-width/2),y,b.z+nz*(shift-width/2)],[b.x+nx*(shift+width/2),y,b.z+nz*(shift+width/2)],[a.x+nx*(shift+width/2),y,a.z+nz*(shift+width/2)]];for(const i of [0,2,1,0,3,2])verts.push(...pts[i]);if(uv)uv.push(0,0,width/4,len/4,0,len/4,0,0,width/4,0,width/4,len/4);};
 const vwall=(verts,uv,a,b,nx,nz,offset,y0,y1)=>{const p0=[a.x+nx*offset,y0,a.z+nz*offset],p1=[b.x+nx*offset,y0,b.z+nz*offset],p2=[b.x+nx*offset,y1,b.z+nz*offset],p3=[a.x+nx*offset,y1,a.z+nz*offset],len=Math.hypot(b.x-a.x,b.z-a.z);for(const i of[0,1,2,0,2,3])verts.push(...[p0,p1,p2,p3][i]);uv.push(0,0,len/1.2,0,len/1.2,1,0,0,len/1.2,1,0,1);};

 for(let ni=0;ni<ASSYUT.nodes.length;ni++){
  if(nodeDeg[ni]<2)continue;const nd=ASSYUT.nodes[ni],r=nodeMaxW[ni]*.52,y=.029,segs=10;
  const isVillNode=ASSYUT.segments.some(s=>(s.aNode===ni||s.bNode===ni)&&isVillageSeg(s));
  const tV=isVillNode?villageRoadV:roadV,tUV=isVillNode?villageRoadUV:roadUV;
  for(let k=0;k<segs;k++){const a0=k/segs*Math.PI*2,a1=(k+1)/segs*Math.PI*2,x0=nd.x+Math.cos(a0)*r,z0=nd.z+Math.sin(a0)*r,x1=nd.x+Math.cos(a1)*r,z1=nd.z+Math.sin(a1)*r;tV.push(nd.x,y,nd.z,x1,y,z1,x0,y,z0);tUV.push(nd.x/4,nd.z/4,x1/4,z1/4,x0/4,z0/4);}
 }
 for(const seg of ASSYUT.segments){
  if(INFRA.profiles.has(seg.road))continue;
  const isVill=isVillageSeg(seg);
  if(isVill)quad(villageRoadV,villageRoadUV,seg.a,seg.b,seg.width,.028);
  else quad(roadV,roadUV,seg.a,seg.b,seg.width,.028);
  const nx=-(seg.b.z-seg.a.z)/seg.length,nz=(seg.b.x-seg.a.x)/seg.length;
  for(let d=0;d<seg.length;d+=4){
   const end=Math.min(seg.length,d+4),a={x:lerp(seg.a.x,seg.b.x,d/seg.length),z:lerp(seg.a.z,seg.b.z,d/seg.length)},b={x:lerp(seg.a.x,seg.b.x,end/seg.length),z:lerp(seg.a.z,seg.b.z,end/seg.length)};
   for(const side of [-1,1]){
    const shift=side*(seg.width/2+1.05);
    let blocked=false;
    for(const t of [.15,.5,.85]){const px=lerp(a.x,b.x,t)+nx*shift,pz=lerp(a.z,b.z,t)+nz*shift;if(segHitsAnyRoad(px,pz,.22)){blocked=true;break;}}
    if(blocked)continue;
    if(isVill)quad(villageWalkV,villageWalkUV,a,b,2.1,.18,shift);
    else quad(walkV,walkUV,a,b,2.1,.18,shift);
    const curbOff=side*(seg.width/2+.02);
    if(side===1)vwall(curbV,curbUV,a,b,nx,nz,curbOff,0,.18);else vwall(curbV,curbUV,b,a,nx,nz,curbOff,0,.18);
    if(!isVill&&seg.width>=10.5&&cityRandom()<.48&&!segHitsAnyRoad((a.x+b.x)/2+nx*side*(seg.width/2+1.5),(a.z+b.z)/2+nz*side*(seg.width/2+1.5),.5))quad(vergeV,vergeUV,a,b,.75,.192,side*(seg.width/2+1.65));
   }
  }
  if(isVill)continue;
  const hasMedian=seg.width>=13.0&&seg.length>18;
  if(hasMedian){
   const mw=1.35,mh=.18;
   quad(medianV,medianUV,seg.a,seg.b,mw,mh);
   vwall(curbV,curbUV,seg.a,seg.b,nx,nz,mw/2,0,mh);
   vwall(curbV,curbUV,seg.b,seg.a,nx,nz,-mw/2,0,mh);
   for(const s of[-1,1])quad(yellowLines,null,seg.a,seg.b,.12,.038,s*(mw/2+.16));
   const laneShift=mw/2+(seg.width-mw)*.25;
   for(let d=3;d<seg.length-3;d+=9){
    const la={x:lerp(seg.a.x,seg.b.x,d/seg.length),z:lerp(seg.a.z,seg.b.z,d/seg.length)};
    const lb={x:lerp(seg.a.x,seg.b.x,Math.min(d+3.2,seg.length)/seg.length),z:lerp(seg.a.z,seg.b.z,Math.min(d+3.2,seg.length)/seg.length)};
    for(const s of[-1,1])quad(lines,null,la,lb,.12,.036,s*laneShift);
   }
  }else if(seg.width>=9.0&&seg.length>8){for(const yo of[-.14,.14])quad(yellowLines,null,seg.a,seg.b,.12,.038,yo);}
  else if(seg.width>=5.5&&seg.length>6){const isOneWay=!!ASSYUT.roads[seg.road]?.oneway;if(!isOneWay){for(let d=1.5;d<seg.length-1.5;d+=6.5){const a={x:lerp(seg.a.x,seg.b.x,d/seg.length),z:lerp(seg.a.z,seg.b.z,d/seg.length)},b={x:lerp(seg.a.x,seg.b.x,Math.min(d+3.0,seg.length)/seg.length),z:lerp(seg.a.z,seg.b.z,Math.min(d+3.0,seg.length)/seg.length)};quad(yellowLines,null,a,b,.13,.038);}}}
  if(seg.width>=11&&seg.length>12)for(const sside of[-1,1])quad(lines,null,seg.a,seg.b,.11,.035,sside*(seg.width/2-.32));
  if(seg.width>=8&&seg.length>12){for(const endPos of[seg.aNode,seg.bNode])if(nodeDeg[endPos]>=3){const base=endPos===seg.aNode?4.2:seg.length-4.2,ca={x:lerp(seg.a.x,seg.b.x,base/seg.length),z:lerp(seg.a.z,seg.b.z,base/seg.length)},cb={x:lerp(seg.a.x,seg.b.x,(base+1.9)/seg.length),z:lerp(seg.a.z,seg.b.z,(base+1.9)/seg.length)};for(let off=-seg.width*.38;off<=seg.width*.38;off+=1.15)quad(lines,null,ca,cb,.42,.038,off);}}
 }
 const batch=(v,uv,mat)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));if(uv?.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;REAL_CITY.group.add(m);return m;};
 const asphColor = loadEgyptianTexture('assets/textures/egypt/egypt-asphalt-color.jpg', 0.38, 0.38, true);
 const asphNorm = loadEgyptianTexture('assets/textures/asphalt/Asphalt015_1K-JPG_NormalGL.jpg', 1.15, 1.15, false);
 const asphRough = loadEgyptianTexture('assets/textures/asphalt/Asphalt015_1K-JPG_Roughness.jpg', 1.15, 1.15, false);
 const rm = (asphColor && asphNorm) ? new THREE.MeshStandardMaterial({
  map: asphColor,
  normalMap: asphNorm,
  roughnessMap: asphRough,
  color: 0xd6cdc0,
  roughness: (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.road?.asphaltRoughness) ? VISUAL_CONFIG.road.asphaltRoughness : 0.94,
  metalness: 0.02,
  normalScale: new THREE.Vector2(1.45, 1.45),
  envMapIntensity: 0.14
 }) : surfaceMaterial('asphalt',4,4,0x5c5952,4);
 if(typeof roadSurfaces!=='undefined'&&Array.isArray(roadSurfaces))roadSurfaces.push(rm);
 REAL_CITY.roadMat=rm;
 batch(roadV,roadUV,rm);
 if(villageRoadV.length)batch(villageRoadV,villageRoadUV,rm);
 const pavingColor = loadEgyptianTexture('assets/textures/paving/PavingStones128_1K-JPG_Color.jpg', 2, 2, true);
 const pavingNorm = loadEgyptianTexture('assets/textures/paving/PavingStones128_1K-JPG_NormalGL.jpg', 2, 2, false);
 const pavingRough = loadEgyptianTexture('assets/textures/paving/PavingStones128_1K-JPG_Roughness.jpg', 2, 2, false);
 const walkMat = (pavingColor && pavingNorm) ? new THREE.MeshStandardMaterial({
  map: pavingColor,
  normalMap: pavingNorm,
  roughnessMap: pavingRough,
  color: (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.road?.sidewalkColor) ? VISUAL_CONFIG.road.sidewalkColor : 0xc4baa8,
  roughness: (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.road?.sidewalkRoughness) ? VISUAL_CONFIG.road.sidewalkRoughness : 0.94,
  metalness: 0.02,
  normalScale: new THREE.Vector2(1.0, 1.0),
  envMapIntensity: 0.12,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1
 }) : new THREE.MeshStandardMaterial({map:paverTex,color:0xd8d2c4,roughness:.92,envMapIntensity:.12,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 batch(walkV,walkUV,walkMat);
 if(villageWalkV.length)batch(villageWalkV,villageWalkUV,villageWalkMat);
 if(medianV.length)batch(medianV,medianUV,new THREE.MeshStandardMaterial({map:terracottaTex,color:0xb4523e,roughness:.88,envMapIntensity:.16}));

 const wornMarkingTex = rep(canvasTex(64, 128, g => {
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(235, 230, 218, 0.90)';
  g.fillRect(8, 0, 48, 128);
  for (let i = 0; i < 35; i++) {
   g.clearRect(cityRandom() * 54 + 5, cityRandom() * 122, 2 + cityRandom() * 6, 2 + cityRandom() * 8);
  }
  for (let i = 0; i < 65; i++) {
   g.fillStyle = 'rgba(65, 60, 50, 0.38)';
   g.fillRect(cityRandom() * 46 + 9, cityRandom() * 124, 2 + cityRandom() * 4, 2 + cityRandom() * 4);
  }
 }), 1, 4);
 const lineMat = new THREE.MeshStandardMaterial({
  map: wornMarkingTex,
  color: 0xd0c6b4,
  roughness: 0.92,
  transparent: true,
  opacity: 0.38,
  envMapIntensity: 0.08,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
 });
 batch(lines, null, lineMat);

 const wornYellowTex = rep(canvasTex(64, 128, g => {
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(228, 168, 52, 0.88)';
  g.fillRect(8, 0, 48, 128);
  for (let i = 0; i < 35; i++) {
   g.clearRect(cityRandom() * 54 + 5, cityRandom() * 122, 2 + cityRandom() * 6, 2 + cityRandom() * 8);
  }
  for (let i = 0; i < 65; i++) {
   g.fillStyle = 'rgba(65, 55, 42, 0.35)';
   g.fillRect(cityRandom() * 46 + 9, cityRandom() * 124, 2 + cityRandom() * 4, 2 + cityRandom() * 4);
  }
 }), 1, 4);
 const yellowLineMat = new THREE.MeshStandardMaterial({
  map: wornYellowTex,
  color: 0xd49c3a,
  roughness: 0.88,
  metalness: 0.02,
  transparent: true,
  opacity: 0.42,
  envMapIntensity: 0.10,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
 });
 if(yellowLines.length)batch(yellowLines,null,yellowLineMat);
 if(curbV.length)batch(curbV,curbUV,new THREE.MeshStandardMaterial({map:curbTex,roughness:.88,envMapIntensity:.1,side:THREE.DoubleSide}));
 if(vergeV.length)batch(vergeV,vergeUV,REAL_CITY.grassMat);
 REAL_CITY.roadMeshes=3;
}

// طبقة تحسين مرئية للشوارع: معابر مشاة عند التقاطعات الكبيرة، بدون تسجيلها
// كأجسام صلبة حتى تظل مسارات المرور والملاحة خالية من العوائق الوهمية.
function addAssyutCrosswalkPass(){
 const mat=new THREE.MeshStandardMaterial({color:0xf1eee1,roughness:.82,metalness:0,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
 const used=[];REAL_CITY.crosswalks=REAL_CITY.crosswalks||[];
 for(let ni=0;ni<ASSYUT.nodes.length&&used.length<34;ni++){
  const node=ASSYUT.nodes[ni],links=ASSYUT.segments.filter(s=>s.aNode===ni||s.bNode===ni);
  if(!node||links.length<3)continue;
  const seg=links.find(s=>!INFRA.profiles.has(s.road)&&s.width>=8.5&&s.length>16);if(!seg)continue;
  const fromA=seg.aNode===ni,dx=fromA?(seg.b.x-seg.a.x):(seg.a.x-seg.b.x),dz=fromA?(seg.b.z-seg.a.z):(seg.a.z-seg.b.z),len=Math.hypot(dx,dz);if(len<1)continue;
  const fx=dx/len,fz=dz/len,center={x:node.x+fx*4.8,z:node.z+fz*4.8};
  if(used.some(p=>Math.hypot(p.x-center.x,p.z-center.z)<26))continue;
  used.push(center);
  const heading=Math.atan2(dx,dz),stripeW=Math.min(seg.width*.72,7.6),stripeCount=5;
  for(let k=0;k<stripeCount;k++){
   const along=(k-(stripeCount-1)/2)*.62,px=center.x+fx*along,pz=center.z+fz*along;
   const stripe=new THREE.Mesh(new THREE.BoxGeometry(stripeW,.018,.34),mat);
   stripe.position.set(px,.058,pz);stripe.rotation.y=heading;stripe.receiveShadow=true;REAL_CITY.group.add(stripe);
  }
  REAL_CITY.crosswalks.push({x:center.x,z:center.z,heading,width:stripeW});
 }
}
addAssyutCrosswalkPass();

// نموذج خارجي مرخّص CC0 يضيف نقطة بصرية واضحة من الطابع المصري، خارج حرم الطريق.
function addExternalAssyutLandmark(){
 const src=importedModels?.loaded?.landmarkMosque?.scene;
 if(!src||REAL_CITY.externalLandmarks.length)return;
 const candidates=(ASSYUT.places||[]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z));
 const place=candidates.find(p=>/مسجد|جامع|mosque/i.test(String(p.name||'')))||candidates[Math.floor(candidates.length*.18)];
 if(!place)return;
 const road=nearestAssyutRoad(place);if(!road)return;
 let x=road.point.x+road.nx*(road.width/2+24),z=road.point.z+road.nz*(road.width/2+24);
 if(nearestAssyutRoad({x,z}).distance<road.width/2+8){x=road.point.x-road.nx*(road.width/2+24);z=road.point.z-road.nz*(road.width/2+24);}
 const g=src.clone(true);g.name='AssyutLicensedMosque';g.scale.setScalar(.42);g.rotation.y=road.heading+Math.PI/2;g.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3());
 g.position.set(x,-box.min.y,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});REAL_CITY.group.add(g);
 const w=Math.max(14,size.x),d=Math.max(16,size.z),h=Math.max(20,size.y);
 const obstacle={x0:x-w/2-1,x1:x+w/2+1,z0:z-d/2-1,z1:z+d/2+1,h};MAP.buildings.push(obstacle);buildingData.push({x,z,w:w+2,d:d+2,h});
 REAL_CITY.externalLandmarks.push({mesh:g,x,z,w:w+2,d:d+2,h,source:'Innerscene CC0'});
 REAL_CITY.styles.external_mosque=(REAL_CITY.styles.external_mosque||0)+1;
}
function loadEgyptianTexture(path, rx = 1, ry = 1, isColor = null) {
 if (typeof THREE === 'undefined' || !THREE.TextureLoader) return null;
 if (typeof navigator !== 'undefined' && navigator.userAgent === 'test') return new THREE.Texture();
 try {
  const tex = new THREE.TextureLoader().load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  const treatAsColor = isColor !== null ? isColor : !/Normal|Roughness|Arm/i.test(path);
  if (treatAsColor && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if (!treatAsColor && THREE.NoColorSpace) tex.colorSpace = THREE.NoColorSpace;
  if (typeof renderer !== 'undefined' && renderer?.capabilities?.getMaxAnisotropy) {
   tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  return tex;
 } catch (e) {
  return new THREE.Texture();
 }
}

const egyptDummy = (typeof THREE !== 'undefined' && THREE.Object3D) ? new THREE.Object3D() : null;
function pushEgyptMatrix(list, x, y, z, rotX = 0, rotY = 0, rotZ = 0, sx = 1, sy = 1, sz = 1) {
 if (!egyptDummy) return;
 egyptDummy.position.set(x, y, z);
 egyptDummy.rotation.set(rotX, rotY, rotZ);
 egyptDummy.scale.set(sx, sy, sz);
 egyptDummy.updateMatrix();
 list.push(egyptDummy.matrix.clone());
}

function addEgyptInstances(parent, geo, mat, matrices, castShadow = true, receiveShadow = true) {
 if (!matrices || !matrices.length || typeof THREE === 'undefined') return null;
 const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
 for (let i = 0; i < matrices.length; i++) {
  mesh.setMatrixAt(i, matrices[i]);
 }
 mesh.instanceMatrix.needsUpdate = true;
 mesh.castShadow = castShadow !== false;
 mesh.receiveShadow = receiveShadow !== false;
 parent.add(mesh);
 return mesh;
}

function makeTiledBoxGeo(w, h, d, rx, ry, rz) {
 const geo = new THREE.BoxGeometry(w, h, d);
 const uv = geo.attributes.uv;
 for (let i = 0; i < uv.count; i++) {
  const face = Math.floor(i / 4);
  const su = (face === 0 || face === 1) ? rz : rx;
  const sv = (face === 2 || face === 3) ? rz : ry;
  uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
 }
 uv.needsUpdate = true;
 return geo;
}

const EGYPT_ASSETS = {
 concrete: null,
 brick: null,
 plasterBeige: null,
 plasterYellow: null,
 plasterWhite: null,
 plasterGreen: null,
 plasterCream: null,
 ironRailTex: null,
 woodShutterGreenTex: null,
 woodShutterBrownTex: null,
 acTex: null,
 waterTankTex: null,
 shutterTex: null,
 awningTex: null,
 shopSigns: null
};

function getEgyptAwningTex() {
 if (!EGYPT_ASSETS.awningTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.awningTex = canvasTex(512, 512, (g, w, h) => {
   // تندة قماش مصرية بهتانة من الشمس ومغبرة (مخططة أحمر طوبي وكريمي وبيج)
   const stripeW = 32;
   const colors = ['#8c3428', '#dfd4c0', '#6d4c3b', '#e3d9c6'];
   for (let x = 0; x < w; x += stripeW) {
    g.fillStyle = colors[(x / stripeW) % colors.length];
    g.fillRect(x, 0, stripeW, h);
    // ظل خفيف بين خطوط القماش
    g.fillStyle = 'rgba(28,20,14,0.16)';
    g.fillRect(x, 0, 2, h);
   }
   // نسيج قماش الكانفاس + بهتان شمس وتراب
   for (let i = 0; i < 2400; i++) {
    g.fillStyle = i % 3 === 0 ? 'rgba(218,202,175,0.12)' : 'rgba(55,40,30,0.08)';
    g.fillRect((i * 73) % w, (i * 137) % h, 2, 5);
   }
   const sunFade = g.createLinearGradient(0, 0, 0, h);
   sunFade.addColorStop(0, 'rgba(210,194,166,0.28)');
   sunFade.addColorStop(0.7, 'rgba(180,160,130,0.10)');
   sunFade.addColorStop(1, 'rgba(42,32,24,0.28)');
   g.fillStyle = sunFade;
   g.fillRect(0, 0, w, h);
   // كورنيش مقوس أسفل التندة
   g.fillStyle = '#742c22';
   g.fillRect(0, h - 42, w, 42);
   for (let x = 0; x < w; x += stripeW) {
    g.beginPath();
    g.arc(x + stripeW / 2, h - 42, stripeW / 2, 0, Math.PI);
    g.fillStyle = '#ddd2be';
    g.fill();
   }
  });
  if (EGYPT_ASSETS.awningTex) EGYPT_ASSETS.awningTex.wrapS = EGYPT_ASSETS.awningTex.wrapT = THREE.RepeatWrapping;
 }
 return EGYPT_ASSETS.awningTex;
}

function getEgyptConcreteMat() {
 if (!EGYPT_ASSETS.concrete) {
  const tex = loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_Color.jpg', 4, 4, true);
  const norm = loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_NormalGL.jpg', 4, 4, false);
  const rough = loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_Roughness.jpg', 4, 4, false);
  EGYPT_ASSETS.concrete = new THREE.MeshStandardMaterial({
   map: tex, normalMap: norm, roughnessMap: rough,
   color: 0xb6aea0, roughness: 0.92, envMapIntensity: 0.14
  });
 }
 return EGYPT_ASSETS.concrete;
}

function getEgyptBrickMat() {
 if (!EGYPT_ASSETS.brick) {
  const tex = loadEgyptianTexture('assets/textures/egypt/egypt-brick-color.jpg', 1.65, 1.65, true);
  const norm = loadEgyptianTexture('assets/textures/bricks/Bricks059_1K-JPG_NormalGL.jpg', 2.4, 2.4, false);
  const rough = loadEgyptianTexture('assets/textures/bricks/Bricks059_1K-JPG_Roughness.jpg', 2.4, 2.4, false);
  EGYPT_ASSETS.brick = new THREE.MeshStandardMaterial({
   map: tex, normalMap: norm, roughnessMap: rough,
   color: 0xe8d9cb, roughness: 0.90, normalScale: new THREE.Vector2(1.35, 1.35), envMapIntensity: 0.14
  });
 }
 return EGYPT_ASSETS.brick;
}

function getEgyptPlasterMat(colorKey, hexColor) {
 if (!EGYPT_ASSETS[colorKey]) {
  const tex = loadEgyptianTexture('assets/textures/plaster/Plaster001_1K-JPG_Color.jpg', 4, 4, true);
  const norm = loadEgyptianTexture('assets/textures/plaster/Plaster001_1K-JPG_NormalGL.jpg', 4, 4, false);
  const rough = loadEgyptianTexture('assets/textures/plaster/Plaster001_1K-JPG_Roughness.jpg', 4, 4, false);
  EGYPT_ASSETS[colorKey] = new THREE.MeshStandardMaterial({
   map: tex, normalMap: norm, roughnessMap: rough,
   color: hexColor, roughness: 0.92, envMapIntensity: 0.14
  });
 }
 return EGYPT_ASSETS[colorKey];
}

function getEgyptShutterTex() {
 if (!EGYPT_ASSETS.shutterTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.shutterTex = canvasTex(256, 512, (g, w, h) => {
   g.fillStyle = '#7c7870';
   g.fillRect(0, 0, w, h);
   for (let y = 0; y < h; y += 16) {
    const slatGrad = g.createLinearGradient(0, y, 0, y + 16);
    slatGrad.addColorStop(0, '#969086');
    slatGrad.addColorStop(0.35, '#807b72');
    slatGrad.addColorStop(0.82, '#5a5650');
    slatGrad.addColorStop(1, '#34322e');
    g.fillStyle = slatGrad;
    g.fillRect(0, y, w, 16);
   }
   // بقع صدأ وغبار شارع على الصاج
   for (let i = 0; i < 65; i++) {
    const rx = (i * 53) % w, ry = (i * 97) % h;
    g.fillStyle = i % 3 === 0 ? 'rgba(118,64,34,0.22)' : 'rgba(175,158,132,0.18)';
    g.fillRect(rx, ry, 8 + (i % 18), 4 + (i % 14));
   }
   const bottomDust = g.createLinearGradient(0, h * 0.65, 0, h);
   bottomDust.addColorStop(0, 'rgba(168,150,122,0)');
   bottomDust.addColorStop(1, 'rgba(168,150,122,0.52)');
   g.fillStyle = bottomDust;
   g.fillRect(0, h * 0.65, w, h * 0.35);
   g.strokeStyle = 'rgba(40,36,32,0.45)';
   g.lineWidth = 4;
   g.strokeRect(4, 2, w - 8, h - 4);
  });
  EGYPT_ASSETS.shutterTex.wrapS = EGYPT_ASSETS.shutterTex.wrapT = THREE.RepeatWrapping;
  EGYPT_ASSETS.shutterTex.repeat.set(1, 1);
 }
 return EGYPT_ASSETS.shutterTex;
}

function getEgyptWoodShutterTex(theme = 'green') {
 const isGreen = (theme === 'green');
 const key = isGreen ? 'woodShutterGreenTex' : 'woodShutterBrownTex';
 if (!EGYPT_ASSETS[key] && typeof canvasTex === 'function') {
  EGYPT_ASSETS[key] = canvasTex(128, 256, (g, w, h) => {
   g.fillStyle = isGreen ? '#2e4a36' : '#573d27';
   g.fillRect(0, 0, w, h);
   g.strokeStyle = isGreen ? '#1e3324' : '#382517';
   g.lineWidth = 8;
   g.strokeRect(4, 4, w - 8, h - 8);
   g.fillRect(0, h / 2 - 4, w, 8);
   for (let y = 14; y < h - 14; y += 8) {
    if (Math.abs(y - h / 2) < 8) continue;
    g.fillStyle = isGreen ? '#3c6147' : '#6f4e32';
    g.fillRect(8, y, w - 16, 4);
    g.fillStyle = isGreen ? '#1b2c20' : '#2b1b11';
    g.fillRect(8, y + 4, w - 16, 4);
   }
  });
 }
 return EGYPT_ASSETS[key];
}

function getEgyptAcTex() {
 if (!EGYPT_ASSETS.acTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.acTex = canvasTex(256, 128, (g, w, h) => {
   g.fillStyle = '#e2dfd7';
   g.fillRect(0, 0, w, h);
   g.strokeStyle = '#9e9b93';
   g.lineWidth = 4;
   g.strokeRect(2, 2, w - 4, h - 4);
   const cx = w * 0.32, cy = h * 0.5, cr = h * 0.38;
   g.fillStyle = '#2f3133';
   g.beginPath();
   g.arc(cx, cy, cr, 0, Math.PI * 2);
   g.fill();
   g.strokeStyle = '#5a5e61';
   g.lineWidth = 3;
   for (let r = 8; r < cr; r += 10) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
   }
   for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
    g.stroke();
   }
   for (let y = 20; y < h - 20; y += 10) {
    g.fillStyle = '#424547';
    g.fillRect(w * 0.62, y, w * 0.30, 4);
   }
   g.fillStyle = '#b32219';
   g.fillRect(w * 0.64, 12, 18, 5);
  });
 }
 return EGYPT_ASSETS.acTex;
}

function getEgyptIronRailTex() {
 if (!EGYPT_ASSETS.ironRailTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.ironRailTex = canvasTex(128, 128, (g, w, h) => {
   g.clearRect(0, 0, w, h);
   g.fillStyle = '#1c1f21';
   g.fillRect(0, 0, w, 8);
   g.fillRect(0, 24, w, 5);
   g.fillRect(0, h - 8, w, 8);
   for (let x = 12; x < w; x += 24) {
    g.fillRect(x - 2.5, 0, 5, h);
    g.beginPath();
    g.arc(x, h / 2, 7, 0, Math.PI * 2);
    g.stroke();
   }
   g.beginPath();
   g.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
   g.fill();
  });
  EGYPT_ASSETS.ironRailTex.wrapS = EGYPT_ASSETS.ironRailTex.wrapT = THREE.RepeatWrapping;
  EGYPT_ASSETS.ironRailTex.repeat.set(4, 1);
 }
 return EGYPT_ASSETS.ironRailTex;
}

function getEgyptShopSigns() {
 if (!EGYPT_ASSETS.shopSigns && typeof canvasTex === 'function') {
  const specs = [
   { name: 'كازيون ماركت', sub: 'KAZYON · عروض يومية · أقرب سوبر ماركت', bg: '#c8102e', fg: '#ffd200', border: '#ffffff' },
   { name: 'مطعم فول وطعمية الصعيدي', sub: 'فول بالزيت الحار · طعمية سخنة · بطاطس', bg: '#b83214', fg: '#fff6dc', border: '#f5b841' },
   { name: 'ورشة ميكانيكا وكهرباء سيارات', sub: 'صيانة جميع السيارات · عفشة · تغيير زيت', bg: '#123e72', fg: '#ffd54a', border: '#8ec5fc' },
   { name: 'كشري ومشويات أسيوط', sub: 'كشري · طواجن · حواوشي · مشويات على الفحم', bg: '#7b1d22', fg: '#fff5dc', border: '#f8b449' },
   { name: 'صيدلية الشفاء', sub: 'د. أحمد علي · خدمة 24 ساعة · أسيوط', bg: '#086e49', fg: '#ffffff', border: '#78d6a8' },
   { name: 'مطعم أولاد البلد للفول والطعمية', sub: 'فطار وعشاء مصري أصيل · خدمة 24 ساعة', bg: '#8a3a12', fg: '#fff3d6', border: '#eab308' }
  ];
  EGYPT_ASSETS.shopSigns = specs.map(item => canvasTex(1024, 256, (g, w, h) => {
   g.fillStyle = item.bg;
   g.fillRect(0, 0, w, h);
   g.strokeStyle = item.border;
   g.lineWidth = 10;
   g.strokeRect(10, 10, w - 20, h - 20);
   g.strokeStyle = 'rgba(255,255,255,0.35)';
   g.lineWidth = 3;
   g.strokeRect(18, 18, w - 36, h - 36);

   g.direction = 'rtl';
   g.textAlign = 'center';
   g.textBaseline = 'middle';
   g.fillStyle = item.fg;
   g.font = 'bold 94px Tahoma, "Segoe UI", Arial, sans-serif';
   g.fillText(item.name, w / 2, 95);

   g.fillStyle = 'rgba(255,255,255,0.92)';
   g.font = 'bold 34px Tahoma, "Segoe UI", Arial, sans-serif';
   g.fillText(item.sub, w / 2, 185);
  }));
 }
 return EGYPT_ASSETS.shopSigns || [];
}

const EGYPT_BATCHER = {
 walls: {
  brick: [],
  plasterBeige: [],
  plasterYellow: [],
  plasterWhite: [],
  plasterGreen: [],
  plasterCream: []
 },
 slabs: [],
 parapets: [],
 colMatrices: [],
 balcSlabMatrices: [],
 balcFrontRailMatrices: [],
 balcSideRailMatrices: [],
 balcDoorMatrices: [],
 winFrameMatrices: [],
 winGlassMatrices: [],
 winSillMatrices: [],
 woodShutterGreenMatrices: [],
 woodShutterBrownMatrices: [],
 acMatrices: [],
 shopShutterMatrices: [],
 awningMatrices: [],
 shopSignMatrices: [[], [], [], [], [], []],
 upColMatrices: [],
 rebarMatrices: [],
 partialWallMatrices: [],
 waterTankMatrices: [],
 tankBaseMatrices: [],
 laundryMatrices: [[], [], [], []],
 dishMatrices: [],
 stallCrateMatrices: []
};

function buildEgyptianResidential(x, z, w, d, options = {}, near = null) {
 const floors = options.floors || (4 + Math.floor(cityRandom() * 4));
 const isRedBrick = options.isRedBrick !== undefined ? options.isRedBrick : (cityRandom() < 0.88);
 const hasUnfinishedRoof = options.hasUnfinishedRoof !== undefined ? options.hasUnfinishedRoof : (isRedBrick ? (cityRandom() < 0.74) : (cityRandom() < 0.25));
 
 const plasterThemes = [
  { key: 'plasterBeige', hex: 0xdec9a4 },
  { key: 'plasterYellow', hex: 0xe5dba7 },
  { key: 'plasterWhite', hex: 0xd6d2c4 },
  { key: 'plasterGreen', hex: 0xbac8b8 },
  { key: 'plasterCream', hex: 0xdbbe9b }
 ];
 const chosenTheme = options.plasterTheme || cityPick(plasterThemes);
 const wallKey = isRedBrick ? 'brick' : chosenTheme.key;
 const shutterTheme = isRedBrick ? 'green' : (options.shutterTheme || cityPick(['green', 'brown']));

 const floorH = 3.0;
 const groundH = 3.2;
 const enclosedFloors = hasUnfinishedRoof ? (floors - 1) : floors;
 const bodyH = groundH + (enclosedFloors - 1) * floorH;
 const totalBuildingH = hasUnfinishedRoof ? (bodyH + 2.8 + 1.1) : (bodyH + 1.2);

 // 1. جدران المبنى (تجميع للـ mergeGeometries)
 const rx = Math.max(1, Math.round(w / 4));
 const ry = Math.max(1, Math.round(bodyH / 4));
 const rz = Math.max(1, Math.round(d / 4));
 const coreGeo = makeTiledBoxGeo(w, bodyH, d, rx, ry, rz);
 coreGeo.translate(x, bodyH / 2, z);
 EGYPT_BATCHER.walls[wallKey].push(coreGeo);

 const numColsX = Math.max(2, Math.round(w / 3.8));
 const stepX = w / numColsX;
 const numColsZ = Math.max(2, Math.round(d / 3.8));
 const stepZ = d / numColsZ;

 // 2. بلاطات الأسقف الخرسانية البارزة بين الأدوار (تجميع للـ mergeGeometries)
 for (let fl = 0; fl < enclosedFloors; fl++) {
  const slabY = (fl === 0) ? groundH : (groundH + fl * floorH);
  const slabGeo = new THREE.BoxGeometry(w + 0.28, 0.26, d + 0.28);
  slabGeo.translate(x, slabY, z);
  EGYPT_BATCHER.slabs.push(slabGeo);
 }

 // 3. الأعمدة الخرسانية البارزة (InstancedMesh)
 const colCoords = [];
 for (let i = 0; i <= numColsX; i++) {
  const cx = -w / 2 + i * stepX;
  colCoords.push({ x: cx, z: -d / 2 - 0.04 });
  colCoords.push({ x: cx, z: d / 2 + 0.04 });
 }
 for (let j = 1; j < numColsZ; j++) {
  const cz = -d / 2 + j * stepZ;
  colCoords.push({ x: -w / 2 - 0.04, z: cz });
  colCoords.push({ x: w / 2 + 0.04, z: cz });
 }
 for (const cp of colCoords) {
  pushEgyptMatrix(EGYPT_BATCHER.colMatrices, x + cp.x, bodyH / 2, z + cp.z, 0, 0, 0, 0.44, bodyH, 0.44);
 }

 // 4. الأدوار السكنية والمحلات: واجهات متعددة الاتجاهات تطل على الشوارع مباشرة
 function renderBuildingFacade(face, hasShops) {
  let faceW, numCols, step;
  let cx, cz, rotY;
  if (face === '-z') {
   faceW = w; numCols = numColsX; step = stepX;
   cx = x; cz = z - d / 2; rotY = 0;
  } else if (face === '+z') {
   faceW = w; numCols = numColsX; step = stepX;
   cx = x; cz = z + d / 2; rotY = Math.PI;
  } else if (face === '-x') {
   faceW = d; numCols = numColsZ; step = stepZ;
   cx = x - w / 2; cz = z; rotY = Math.PI / 2;
  } else { // '+x'
   faceW = d; numCols = numColsZ; step = stepZ;
   cx = x + w / 2; cz = z; rotY = -Math.PI / 2;
  }

  const placeOnFacade = (list, u, yPos, out, rx, extraRy, rz, sx, sy, sz) => {
   let px, pz;
   if (face === '-z') {
    px = cx + u; pz = cz - out;
   } else if (face === '+z') {
    px = cx - u; pz = cz + out;
   } else if (face === '-x') {
    px = cx - out; pz = cz + u;
   } else { // '+x'
    px = cx + out; pz = cz - u;
   }
   pushEgyptMatrix(list, px, yPos, pz, rx, rotY + extraRy, rz, sx, sy, sz);
  };

  // أ. الأدوار السكنية: بلكونات حديد وشبابيك بشيش خشبي ووحدات تكييف
  for (let fl = 1; fl < enclosedFloors; fl++) {
   const wy = groundH + (fl - 0.5) * floorH;
   for (let b = 0; b < numCols; b++) {
    const bayU = -faceW / 2 + (b + 0.5) * step;
    const bayW = step;

    if (b % 2 === 0) {
     // بلكونة مصرية
     placeOnFacade(EGYPT_BATCHER.balcSlabMatrices, bayU, wy - floorH / 2 + 0.09, 0.58, 0, 0, 0, bayW - 0.35, 0.18, 1.15);
     placeOnFacade(EGYPT_BATCHER.balcFrontRailMatrices, bayU, wy - floorH / 2 + 0.52, 1.12, 0, 0, 0, bayW - 0.35, 0.86, 0.04);
     for (const sideU of [-1, 1]) {
      placeOnFacade(EGYPT_BATCHER.balcSideRailMatrices, bayU + sideU * ((bayW - 0.35) / 2 - 0.02), wy - floorH / 2 + 0.52, 0.58, 0, 0, 0, 0.04, 0.86, 1.10);
     }
     placeOnFacade(EGYPT_BATCHER.balcDoorMatrices, bayU, wy - 0.15, 0.01, 0, 0, 0, 1.10, 2.15, 1);

     // غسيل ملون منشور على حبال البلكونة (طابع مصري أصيل)
     if (cityRandom() < 0.78) {
      const laundryColor = Math.floor(cityRandom() * 4);
      const clothCount = 2 + Math.floor(cityRandom() * 2);
      for (let ci = 0; ci < clothCount; ci++) {
       const uOffset = (ci - (clothCount - 1) / 2) * (bayW * 0.26);
       const clothCol = (laundryColor + ci) % 4;
       placeOnFacade(EGYPT_BATCHER.laundryMatrices[clothCol], bayU + uOffset, wy - floorH / 2 + 0.44, 1.15, 0.08, 0, 0, bayW * 0.22, 0.58, 1);
      }
     }

     // أطباق دش مثبتة على حديد البلكونة
     if (cityRandom() < 0.58) {
      const dishSide = cityRandom() < 0.5 ? -1 : 1;
      const dishU = bayU + dishSide * ((bayW - 0.35) / 2 - 0.15);
      placeOnFacade(EGYPT_BATCHER.dishMatrices, dishU, wy - floorH / 2 + 0.65, 1.25, -Math.PI / 3.2, dishSide * 0.28, 0, 0.72, 0.72, 0.72);
     }
    } else {
     // شباك مصري
     placeOnFacade(EGYPT_BATCHER.winSillMatrices, bayU, wy - 0.82, 0.08, 0, 0, 0, 1.55, 0.14, 0.32);
     placeOnFacade(EGYPT_BATCHER.winFrameMatrices, bayU, wy, 0.01, 0, 0, 0, 1.35, 1.55, 0.08);
     placeOnFacade(EGYPT_BATCHER.winGlassMatrices, bayU, wy, 0.02, 0, 0, 0, 1.12, 1.36, 1);

     // شيش خشبي أخضر أو بني
     const shutterList = (shutterTheme === 'green') ? EGYPT_BATCHER.woodShutterGreenMatrices : EGYPT_BATCHER.woodShutterBrownMatrices;
     placeOnFacade(shutterList, bayU - 0.80, wy, 0.04, 0, 0.22, 0, 0.38, 1.48, 0.04);
     placeOnFacade(shutterList, bayU + 0.80, wy, 0.04, 0, -0.22, 0, 0.38, 1.48, 0.04);

     // وحدة تكييف خارجية
     if (cityRandom() < 0.55) {
      placeOnFacade(EGYPT_BATCHER.acMatrices, bayU + 0.35, wy - 1.15, 0.26, 0, 0, 0, 0.74, 0.48, 0.40);
     }
    }
   }
  }

  // ب. الدور الأرضي: محلات بستائر صاج ولافتات عربي وتندات قماش مقلمة
  if (hasShops) {
   const signOffset = (options.testId === 2) ? 2 : (options.testId === 3) ? 4 : Math.floor(cityRandom() * 6);
   for (let b = 0; b < numCols; b++) {
    const bayU = -faceW / 2 + (b + 0.5) * step;
    const signW = step - 0.38;
    const signH = 0.68;

    // شتر معدني
    placeOnFacade(EGYPT_BATCHER.shopShutterMatrices, bayU, 1.35, 0.02, 0, 0, 0, step - 0.45, 2.50, 0.06);

    // لافتة عربي
    const signIdx = (signOffset + b) % 6;
    placeOnFacade(EGYPT_BATCHER.shopSignMatrices[signIdx], bayU, 2.92, 0.08, 0, 0, 0, signW, signH, 0.08);

    // تندة قماش مقلمة بارزة للمحل
    if (EGYPT_BATCHER.awningMatrices && cityRandom() < 0.88) {
     placeOnFacade(EGYPT_BATCHER.awningMatrices, bayU, 2.70, 0.65, 0.28, 0, 0, step - 0.28, 0.05, 1.35);
    }

    // فرشة بقالة واستاندات كراتين وشيبسي على الرصيف أمام المحل
    if (b === 0 && cityRandom() < 0.82) {
     placeOnFacade(EGYPT_BATCHER.stallCrateMatrices, bayU + 0.42, 0.48, 1.45, 0, 0.15, 0, 0.65, 0.95, 0.45);
     placeOnFacade(EGYPT_BATCHER.stallCrateMatrices, bayU - 0.42, 0.35, 1.35, 0, -0.12, 0, 0.75, 0.70, 0.55);
    }
   }
  }
 }

 let primaryFace = '-z';
 let secondaryFace = '+z';
 if (near && near.point) {
  const toStX = near.point.x - x;
  const toStZ = near.point.z - z;
  if (Math.abs(toStZ) >= Math.abs(toStX)) {
   primaryFace = toStZ < 0 ? '-z' : '+z';
   secondaryFace = toStX < 0 ? '-x' : '+x';
  } else {
   primaryFace = toStX < 0 ? '-x' : '+x';
   secondaryFace = toStZ < 0 ? '-z' : '+z';
  }
 }
 renderBuildingFacade(primaryFace, true);
 renderBuildingFacade(secondaryFace, false);

 // 6. السطح: إما دور أخير غير مكتمل بأعمدة وأشاير حديد، أو سطح مكتمل بسور وخزانات مياه
 if (hasUnfinishedRoof) {
  const colExtH = 2.85;
  const rebarH = 1.35;
  for (const cp of colCoords) {
   pushEgyptMatrix(EGYPT_BATCHER.upColMatrices, x + cp.x, bodyH + colExtH / 2, z + cp.z, 0, 0, 0, 0.44, colExtH, 0.44);
   for (const [rx, rz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
    pushEgyptMatrix(EGYPT_BATCHER.rebarMatrices, x + cp.x + rx, bodyH + colExtH + rebarH / 2, z + cp.z + rz, 0, 0, cityRand(-0.06, 0.06), 1, 1, 1);
   }
  }
  for (let b = 0; b < numColsX; b++) {
   if (cityRandom() < 0.65) {
    const bayX = -w / 2 + (b + 0.5) * stepX;
    pushEgyptMatrix(EGYPT_BATCHER.partialWallMatrices, x + bayX, bodyH + 0.58, z - d / 2, 0, 0, 0, stepX - 0.42, 1.15, 0.28);
   }
  }
  if (cityRandom() < 0.75) {
   pushEgyptMatrix(EGYPT_BATCHER.dishMatrices, x + cityRand(-w*0.3, w*0.3), bodyH + 0.55, z + cityRand(-d*0.3, d*0.3), -Math.PI / 3, cityRand(0, 6.28), 0, 0.82, 0.82, 0.82);
  }
 } else {
  // سور السطح الخرساني
  const paraGeo = new THREE.BoxGeometry(w + 0.24, 0.95, d + 0.24);
  paraGeo.translate(x, bodyH + 0.48, z);
  EGYPT_BATCHER.parapets.push(paraGeo);

  // خزانات مياه أسطوانية سوداء
  const tankCount = Math.min(3, Math.max(2, Math.floor(w / 6)));
  for (let t = 0; t < tankCount; t++) {
   const tx = -w * 0.30 + t * (w * 0.60 / (tankCount - 1 || 1));
   const tz = (t % 2 === 0) ? -d * 0.18 : d * 0.18;
   pushEgyptMatrix(EGYPT_BATCHER.tankBaseMatrices, x + tx, bodyH + 0.22, z + tz, 0, 0, 0, 0.85, 0.44, 0.85);
   pushEgyptMatrix(EGYPT_BATCHER.waterTankMatrices, x + tx, bodyH + 0.44 + 0.72, z + tz, 0, 0, 0, 1, 1, 1);
  }
 }

 const box = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2 - 0.8, z1: z + d / 2, h: totalBuildingH };
 MAP.buildings.push(box);
 buildingData.push({ x, z, w, d, h: totalBuildingH });
 const dummyMesh = new THREE.Object3D();
 dummyMesh.position.set(x, 0, z);
 const bStyle = isRedBrick ? 'brick' : (chosenTheme.key === 'plasterBeige' ? 'old' : chosenTheme.key === 'plasterCream' ? 'cairo' : 'modern');
 REAL_CITY.buildings.push({ mesh: dummyMesh, x, z, w, d, h: totalBuildingH, style: bStyle });
 REAL_CITY.styles[bStyle] = (REAL_CITY.styles[bStyle] || 0) + 1;
 if (numColsX > 0) REAL_CITY.styles['shop'] = (REAL_CITY.styles['shop'] || 0) + 1;
}

function flushEgyptBatcher() {
 const mergeFn = (typeof THREE !== 'undefined' && THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeGeometries) || (typeof mergeGeometries !== 'undefined' ? mergeGeometries : null);

 function mergeAndAdd(geos, mat) {
  if (!geos || !geos.length) return null;
  let mesh;
  if (mergeFn) {
   const merged = mergeFn(geos, false);
   mesh = new THREE.Mesh(merged, mat);
   for (const g of geos) g.dispose();
  } else {
   mesh = new THREE.Group();
   for (const g of geos) mesh.add(new THREE.Mesh(g, mat));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  REAL_CITY.group.add(mesh);
  return mesh;
 }

 const concreteMat = getEgyptConcreteMat();
 const brickMat = getEgyptBrickMat();
 const plasterThemes = {
  plasterBeige: { hex: 0xdec9a4 },
  plasterYellow: { hex: 0xe5dba7 },
  plasterWhite: { hex: 0xd6d2c4 },
  plasterGreen: { hex: 0xbac8b8 },
  plasterCream: { hex: 0xdbbe9b }
 };

 // دمج حوائط المباني حسب الخامة واللون
 mergeAndAdd(EGYPT_BATCHER.walls.brick, brickMat);
 for (const [key, spec] of Object.entries(plasterThemes)) {
  mergeAndAdd(EGYPT_BATCHER.walls[key], getEgyptPlasterMat(key, spec.hex));
 }

 // دمج بلاطات الأسقف والأسوار الخرسانية
 const allConcreteGeos = EGYPT_BATCHER.slabs.concat(EGYPT_BATCHER.parapets);
 mergeAndAdd(allConcreteGeos, concreteMat);

 // إنشاء وحدات InstancedMesh للعناصر المعمارية المتكررة
 const frameColor = 0x3c4a44;
 const winFrameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.75, envMapIntensity: 0.2 });
 const winGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x25353c, metalness: 0.36, roughness: 0.16, clearcoat: 0.7, envMapIntensity: 0.78 });
 const rebarMat = new THREE.MeshStandardMaterial({ color: 0x3d3835, roughness: 0.72, metalness: 0.65 });
 const ironRailMat = new THREE.MeshStandardMaterial({
  color: 0x222629,
  map: getEgyptIronRailTex(),
  transparent: true,
  alphaTest: 0.35,
  roughness: 0.45,
  metalness: 0.8
 });
 const ironRailSideMat = new THREE.MeshStandardMaterial({ color: 0x1f2324, roughness: 0.5, metalness: 0.8 });
 const woodShutterGreenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptWoodShutterTex('green'), roughness: 0.82 });
 const woodShutterBrownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptWoodShutterTex('brown'), roughness: 0.82 });
 const acMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptAcTex(), roughness: 0.75 });
 const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x181a1b, roughness: 0.84 });
 const shutterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptShutterTex(), roughness: 0.75, metalness: 0.4 });
 const awningMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptAwningTex(), roughness: 0.85, side: THREE.DoubleSide });

 const unitBox = new THREE.BoxGeometry(1, 1, 1);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.colMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.balcSlabMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, ironRailMat, EGYPT_BATCHER.balcFrontRailMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, ironRailSideMat, EGYPT_BATCHER.balcSideRailMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.PlaneGeometry(1.10, 2.15), winGlassMat, EGYPT_BATCHER.balcDoorMatrices, false, false);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.winSillMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, winFrameMat, EGYPT_BATCHER.winFrameMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.PlaneGeometry(1, 1), winGlassMat, EGYPT_BATCHER.winGlassMatrices, false, false);
 addEgyptInstances(REAL_CITY.group, unitBox, woodShutterGreenMat, EGYPT_BATCHER.woodShutterGreenMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, woodShutterBrownMat, EGYPT_BATCHER.woodShutterBrownMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, acMat, EGYPT_BATCHER.acMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, shutterMat, EGYPT_BATCHER.shopShutterMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, awningMat, EGYPT_BATCHER.awningMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.tankBaseMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.CylinderGeometry(0.70, 0.70, 1.45, 12), waterTankMat, EGYPT_BATCHER.waterTankMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.upColMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.CylinderGeometry(0.016, 0.016, 1.35, 5), rebarMat, EGYPT_BATCHER.rebarMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, brickMat, EGYPT_BATCHER.partialWallMatrices);

 // غسيل ملون بطيات قماش وظلال واقعية وأطباق دش وفرشات محلات
 const makeClothTex = (baseHex, stripeHex) => canvasTex(64, 96, (g, w, h) => {
  g.fillStyle = baseHex;
  g.fillRect(0, 0, w, h);
  if (stripeHex) {
   g.fillStyle = stripeHex;
   g.fillRect(0, h * 0.72, w, h * 0.14);
  }
  for (let x = 0; x < w; x += 8) {
   g.fillStyle = (x / 8) % 2 === 0 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.10)';
   g.fillRect(x, 0, 4, h);
  }
  const shade = g.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0.18)');
  shade.addColorStop(0.25, 'rgba(255,255,255,0.08)');
  shade.addColorStop(1, 'rgba(0,0,0,0.24)');
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);
 });
 const laundryMats = [
  new THREE.MeshStandardMaterial({ map: makeClothTex('#e5ddd0', '#c4b8a6'), roughness: 0.92, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ map: makeClothTex('#58768f', '#89a1b5'), roughness: 0.90, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ map: makeClothTex('#b87478', '#d49fa2'), roughness: 0.90, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ map: makeClothTex('#3b3d42', null), roughness: 0.92, side: THREE.DoubleSide })
 ];
 const clothPlane = new THREE.PlaneGeometry(1, 1);
 for (let c = 0; c < 4; c++) {
  addEgyptInstances(REAL_CITY.group, clothPlane, laundryMats[c], EGYPT_BATCHER.laundryMatrices[c], false, true);
 }
 const dishGeo = new THREE.SphereGeometry(0.38, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45);
 const dishMat = new THREE.MeshStandardMaterial({ color: 0xdeded8, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
 addEgyptInstances(REAL_CITY.group, dishGeo, dishMat, EGYPT_BATCHER.dishMatrices, true, true);

 const crateTex = canvasTex(128, 128, g => {
  g.fillStyle = '#b87e45'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#5c3a1a'; g.lineWidth = 3; g.strokeRect(4, 4, 120, 120);
  g.beginPath(); g.moveTo(4, 4); g.lineTo(124, 124); g.moveTo(124, 4); g.lineTo(4, 124); g.stroke();
  const chipCols = ['#c82424', '#2468c8', '#e8b824', '#24a854'];
  for (let y = 16; y < 112; y += 24) {
   g.fillStyle = chipCols[(y / 24) % 4]; g.fillRect(16, y, 96, 16);
  }
 });
 const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85 });
 addEgyptInstances(REAL_CITY.group, unitBox, crateMat, EGYPT_BATCHER.stallCrateMatrices, true, true);

 // لافتات المحلات العربية (InstancedMesh لكل لافتة)
 const shopSigns = getEgyptShopSigns();
 for (let s = 0; s < 6; s++) {
  if (EGYPT_BATCHER.shopSignMatrices[s].length) {
   const signMat = new THREE.MeshStandardMaterial({ map: shopSigns[s], roughness: 0.6 });
   addEgyptInstances(REAL_CITY.group, unitBox, signMat, EGYPT_BATCHER.shopSignMatrices[s]);
  }
 }
}

function realBuilding(x,z,w,d,h,style,footprint=null,near=null){
 const g=new THREE.Group();g.position.set(x,0,z);
 const palettes={old:[0xcbb38e,0xb89f78,0xd7c3a2],brick:[0xc68670,0xb2705b,0xd3957f],modern:[0xcfd8db,0xe3e2da,0xbcc8cc],tower:[0xd6d4ca,0xc2c8cb],shop:[0xd5c6ad,0xc7beb0],cairo:[0xdec9a4,0xd6ab84,0xc9b496,0xce9d7b],mosque:[0xeee4ce,0xe4d7bc,0xd8cab0]};
 const color=cityPick(palettes[style]||palettes.old);
 const wall=style==='brick'?new THREE.MeshStandardMaterial({map:REAL_CITY.brickTex,color,roughness:.9,envMapIntensity:.15}):style==='old'||style==='cairo'?new THREE.MeshStandardMaterial({map:REAL_CITY.oldTex,color,roughness:.92,envMapIntensity:.15}):style==='modern'||style==='tower'?new THREE.MeshStandardMaterial({map:REAL_CITY.modernTex,color,roughness:.58,metalness:.08,envMapIntensity:.38}):surfaceMaterial('plaster',w,h,color,4);
 if(wall.aoMap){wall.aoMap=null;wall.aoMapIntensity=0;}wall.envMapIntensity=wall.envMapIntensity??.18;
 const bodyH=style==='mosque'?Math.min(h,9.5):h;
 const bGeo=new THREE.BoxGeometry(w,bodyH,d);
 if(style==='brick'||style==='old'||style==='modern'||style==='cairo'){const uv=bGeo.attributes.uv,rx=Math.max(1,Math.round(w/5.5)),rz=Math.max(1,Math.round(d/5.5)),ry=Math.max(1,Math.round(bodyH/6.2));for(let i=0;i<uv.count;i++){const face=Math.floor(i/4),su=(face===0||face===1)?rz:rx,sv=(face===2||face===3)?rz:ry;uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);}uv.needsUpdate=true;}
 const b=new THREE.Mesh(bGeo,wall);b.position.y=bodyH/2;b.castShadow=true;b.receiveShadow=true;g.add(b);
 if(bodyH>6){const plinth=new THREE.Mesh(new THREE.BoxGeometry(w+.14,2.8,d+.14),new THREE.MeshStandardMaterial({color:style==='modern'||style==='tower'?0x687278:style==='mosque'?0xc7baa2:0x9c927f,roughness:.92,envMapIntensity:.12}));plinth.position.y=1.4;plinth.castShadow=true;plinth.receiveShadow=true;g.add(plinth);}
 const frameColor=style==='old'||style==='cairo'?cityPick([0x3b5842,0x524033,0x6e4a2b]):style==='brick'?0x6f6c66:style==='mosque'?0x2d684f:0x4b5860;
 const frame=new THREE.MeshStandardMaterial({color:frameColor,roughness:.76,envMapIntensity:.2}),winMat=new THREE.MeshPhysicalMaterial({color:style==='modern'||style==='tower'?0x21485b:0x25353c,metalness:.36,roughness:.16,clearcoat:.7,envMapIntensity:.78});
 const levels=Math.floor((bodyH-3)/3.2),cols=Math.max(1,Math.floor(w/3.2));
 if(levels>0&&style!=='mosque'){
  const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(1.18,1.58,.08),winMat,levels*cols*2),sills=new THREE.InstancedMesh(new THREE.BoxGeometry(1.46,.13,.28),frame,levels*cols*2),headers=new THREE.InstancedMesh(new THREE.BoxGeometry(1.46,.14,.22),frame,levels*cols*2);let n=0;const ob=new THREE.Object3D();
  windows.receiveShadow=true;sills.receiveShadow=true;headers.receiveShadow=true;
  for(let fl=0;fl<levels;fl++)for(let c=0;c<cols;c++)for(const side of [-1,1]){const wx=-w/2+(c+.5)*w/cols,wy=4.4+fl*3.2;ob.position.set(wx,wy,side*(d/2+.045));ob.rotation.set(0,0,0);ob.updateMatrix();windows.setMatrixAt(n,ob.matrix);ob.position.y-=.86;ob.position.z=side*(d/2+.12);ob.updateMatrix();sills.setMatrixAt(n,ob.matrix);ob.position.y+=1.70;ob.position.z=side*(d/2+.10);ob.updateMatrix();headers.setMatrixAt(n++,ob.matrix);}
  g.add(windows,sills,headers);
  const litSlots=Math.max(1,Math.floor(levels*cols*.28)),litWin=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.06,1.44),REAL_CITY.litGlass,litSlots);
  for(let li=0;li<litSlots;li++){const fl=Math.floor(cityRandom()*levels),c=Math.floor(cityRandom()*cols),side=cityRandom()<.5?-1:1;ob.position.set(-w/2+(c+.5)*w/cols,4.4+fl*3.2,side*(d/2+.092));ob.rotation.set(0,side>0?0:Math.PI,0);ob.updateMatrix();litWin.setMatrixAt(li,ob.matrix);}g.add(litWin);
  if(style==='old'||style==='cairo'){
   const shutters=new THREE.InstancedMesh(new THREE.BoxGeometry(.34,1.56,.08),frame,levels*cols*4);let sh=0;
   for(let fl=0;fl<levels;fl++)for(let c=0;c<cols;c++)for(const side of[-1,1])for(const sx of[-.76,.76]){ob.position.set(-w/2+(c+.5)*w/cols+sx,4.4+fl*3.2,side*(d/2+.07));ob.rotation.set(0,0,0);ob.updateMatrix();shutters.setMatrixAt(sh++,ob.matrix);}
   g.add(shutters);
  }
  const sideCols=Math.max(1,Math.floor(d/3.3)),sideWindows=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,1.5,.08),winMat,levels*sideCols*2);let sn=0;
  for(let fl=0;fl<levels;fl++)for(let c=0;c<sideCols;c++)for(const side of [-1,1]){ob.position.set(side*(w/2+.05),4.4+fl*3.2,-d/2+(c+.5)*d/sideCols);ob.rotation.set(0,Math.PI/2,0);ob.updateMatrix();sideWindows.setMatrixAt(sn++,ob.matrix);}g.add(sideWindows);
 }
 if(style==='mosque'){
  const domeMat=new THREE.MeshStandardMaterial({color:cityPick([0x2d6d53,0x35697a,0xd8c8a8]),roughness:.55,metalness:.18,envMapIntensity:.35});
  const trimMat=new THREE.MeshStandardMaterial({color:0xc9b486,roughness:.7,metalness:.25});
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w,d)*.28,Math.min(w,d)*.30,1.6,12),trimMat);drum.position.y=bodyH+.8;g.add(drum);
  const domeR=Math.min(w,d)*.27;const dome=new THREE.Mesh(new THREE.SphereGeometry(domeR,16,12,0,Math.PI*2,0,Math.PI*.55),domeMat);dome.position.y=bodyH+1.55;dome.castShadow=true;g.add(dome);
  const spire=new THREE.Mesh(new THREE.CylinderGeometry(.04,.09,1.3,6),new THREE.MeshStandardMaterial({color:0xd8b24c,metalness:.8,roughness:.3}));spire.position.y=bodyH+1.55+domeR+.5;g.add(spire);
  const minH=bodyH+11.5,mx=w*.34,mz=-d*.32;
  const minaret=new THREE.Mesh(new THREE.CylinderGeometry(.68,.95,minH,8),wall);minaret.position.set(mx,minH/2,mz);minaret.castShadow=true;g.add(minaret);
  const balcony=new THREE.Mesh(new THREE.CylinderGeometry(1.08,.96,.42,8),trimMat);balcony.position.set(mx,bodyH+5.2,mz);g.add(balcony);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.82,2.4,8),domeMat);cap.position.set(mx,minH+1.2,mz);g.add(cap);
  for(const cx of [-w*.24,0,w*.24]){const arch=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.6,.12),winMat);arch.position.set(cx,2.1,-d/2-.06);g.add(arch);}
 }
 if(style==='shop'){for(let j=0;j<Math.min(4,Math.floor(w/3.5));j++){const awning=new THREE.Mesh(new THREE.BoxGeometry(2.5,.13,.78),new THREE.MeshStandardMaterial({color:cityPick([0x2d5e49,0x8f3f2c,0x335d7a,0x9b7137]),roughness:.85,envMapIntensity:.15}));awning.position.set(-w/2+2+j*3.2,2.52,-d/2-.34);awning.castShadow=true;g.add(awning);const shutter=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.35),new THREE.MeshStandardMaterial({color:0x767870,map:ironGrilleTex,roughness:.82,envMapIntensity:.2}));shutter.position.set(-w/2+2+j*3.2,1.25,-d/2-.08);shutter.rotation.y=Math.PI;g.add(shutter);}}
 if(bodyH>10){const ac=new THREE.Mesh(new THREE.BoxGeometry(.68,.46,.42),new THREE.MeshStandardMaterial({color:0xbec0b5,roughness:.85,envMapIntensity:.2}));ac.position.set(w*.3,6.5,-d/2-.22);ac.castShadow=true;g.add(ac);}
 const slabMat=new THREE.MeshStandardMaterial({color:style==='brick'?0x8a877f:0xdedad0,roughness:.84,envMapIntensity:.16});
 if(style==='old'||style==='brick'||style==='cairo'){
  const concreteCol=new THREE.MeshStandardMaterial({color:0x8e8b84,roughness:.9,envMapIntensity:.14});
  if(style==='brick'){for(const sx of [-w/2,w/2])for(const sz of [-d/2,d/2]){const col=new THREE.Mesh(new THREE.BoxGeometry(.36,bodyH,.36),concreteCol);col.position.set(sx,bodyH/2,sz);g.add(col);}for(let sy=3.2;sy<bodyH;sy+=3.2){const slab=new THREE.Mesh(new THREE.BoxGeometry(w+.14,.18,d+.14),concreteCol);slab.position.y=sy;g.add(slab);}}
  for(let i=0;i<Math.min(3,levels);i++){const balcony=new THREE.Mesh(new THREE.BoxGeometry(w*.74,.16,.84),slabMat);balcony.position.set(0,5+i*3.2,-d/2-.38);balcony.castShadow=true;balcony.receiveShadow=true;g.add(balcony);const rail=new THREE.Mesh(new THREE.BoxGeometry(w*.74,.78,.06),frame);rail.position.set(0,5.42+i*3.2,-d/2-.78);rail.castShadow=true;g.add(rail);}
  if(style==='brick'&&bodyH>9){const parapet=new THREE.Mesh(new THREE.BoxGeometry(w+.12,.60,d+.12),concreteCol);parapet.position.y=bodyH+.28;parapet.castShadow=true;g.add(parapet);for(const [rx,rz]of[[-w*.35,-d*.35],[w*.35,-d*.35],[-w*.35,d*.35],[w*.35,d*.35]]){const rebar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.85,5),concreteCol);rebar.position.set(rx,bodyH+.7,rz);g.add(rebar);}}
  if(style==='cairo'){const cornice=new THREE.Mesh(new THREE.BoxGeometry(w+.34,.48,d+.34),slabMat);cornice.position.y=bodyH+.2;g.add(cornice);}
 }else if(style==='modern'||style==='tower'){
  for(let y=3;y<bodyH;y+=3.2){const band=new THREE.Mesh(new THREE.BoxGeometry(w+.16,.16,d+.16),slabMat);band.position.y=y;band.receiveShadow=true;g.add(band);}
  if(bodyH>24){const penthouse=new THREE.Mesh(new THREE.BoxGeometry(w*.45,2.6,d*.45),slabMat);penthouse.position.y=bodyH+1.3;penthouse.castShadow=true;g.add(penthouse);}
 }
 if(style==='shop'||(style!=='mosque'&&cityRandom()<.45)){const width=Math.min(w*.8,8),metal=new THREE.MeshStandardMaterial({color:0x59646a,roughness:.6,metalness:.4,envMapIntensity:.3}),face=new THREE.MeshStandardMaterial({map:cityPick(REAL_SHOP_SIGNS),roughness:.65,envMapIntensity:.2}),sign=new THREE.Mesh(new THREE.BoxGeometry(width,.72,.07),[metal,metal,metal,metal,metal,face]);sign.position.set(0,2.95,-d/2-.12);sign.name='WallMountedShopSign';g.add(sign);for(const x of[-width*.42,width*.42]){const fixing=new THREE.Mesh(new THREE.BoxGeometry(.08,.65,.10),metal);fixing.position.set(x,2.95,-d/2-.04);g.add(fixing);}}
 if(style==='old'||style==='brick'||style==='cairo'){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,1.15,10),new THREE.MeshStandardMaterial({color:0x1f2826,roughness:.85,envMapIntensity:.2}));tank.position.set(w*.24,bodyH+.8,0);g.add(tank);const dish=new THREE.Mesh(new THREE.ConeGeometry(.45,.2,10),new THREE.MeshStandardMaterial({color:0xdce0e2,roughness:.5,envMapIntensity:.4}));dish.position.set(-w*.24,bodyH+.75,-d*.2);dish.rotation.x=-.9;g.add(dish);}
 const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.20,.22,d+.20),new THREE.MeshStandardMaterial({color:0x888376,roughness:.95,envMapIntensity:.12}));roof.position.y=bodyH;roof.receiveShadow=true;g.add(roof);
 REAL_CITY.group.add(g);const frontPad=(style==='old'||style==='brick'||style==='shop'||style==='cairo')?.86:0;
 const box={x0:x-w/2,x1:x+w/2,z0:z-d/2-frontPad,z1:z+d/2,h:bodyH};MAP.buildings.push(box);buildingData.push({x,z,w,d:d+frontPad,h:bodyH});REAL_CITY.buildings.push({mesh:g,x,z,w,d,h:bodyH,style,footprint});REAL_CITY.styles[style]=(REAL_CITY.styles[style]||0)+1;
}
{
 const occupied=[],parkSpots=[],occGrid=new Map(),OCC_CELL=30;
 function addOcc(x,z,w,d){
  const item={x,z,w,d};occupied.push(item);
  const gx0=Math.floor((x-w/2-2)/OCC_CELL),gx1=Math.floor((x+w/2+2)/OCC_CELL);
  const gz0=Math.floor((z-d/2-2)/OCC_CELL),gz1=Math.floor((z+d/2+2)/OCC_CELL);
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){const k=gx+','+gz;if(!occGrid.has(k))occGrid.set(k,[]);occGrid.get(k).push(item);}
 }
 function hasOcc(x,z,hw,hd){
  const gx0=Math.floor((x-hw)/OCC_CELL),gx1=Math.floor((x+hw)/OCC_CELL);
  const gz0=Math.floor((z-hd)/OCC_CELL),gz1=Math.floor((z+hd)/OCC_CELL);
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){
   for(const b of occGrid.get(gx+','+gz)||[])if(Math.abs(b.x-x)<b.w/2+hw&&Math.abs(b.z-z)<b.d/2+hd)return true;
  }
  return false;
 }
 function free(x,z,w,d){
  if(Math.hypot(x-ASSYUT.start.x,z-ASSYUT.start.z)<Math.max(w,d)/2+16)return false;
  if(hasOcc(x,z,w/2+1,d/2+1.4))return false;
  if(roadCutsBuilding(x,z-.45,w,d+1.0,2.2))return false;
  if(bridgeCutsBox(x,z-.45,w,d+1.0,3.2))return false;
  const pad=1.6;
  for(const [px,pz]of [[x,z],[x-w/2,z-d/2-.9],[x+w/2,z-d/2-.9],[x-w/2,z+d/2],[x+w/2,z+d/2]]){const p=nearestAssyutRoad({x:px,z:pz});if(p&&p.distance<p.width/2+2.3+pad)return false;}
  return true;
 }
 function addPark(x,z,w,d){
  const pg=new THREE.Group();pg.position.set(x,0,z);
  const curb=new THREE.Mesh(new THREE.BoxGeometry(w,.16,d),new THREE.MeshStandardMaterial({color:0xb8b09c,roughness:.9,envMapIntensity:.1}));curb.position.y=.08;curb.receiveShadow=true;pg.add(curb);
  const lawn=new THREE.Mesh(new THREE.BoxGeometry(w-.6,.05,d-.6),REAL_CITY.grassMat);lawn.position.y=.17;lawn.receiveShadow=true;pg.add(lawn);
  const pathMat=new THREE.MeshStandardMaterial({color:0xd2c7ae,roughness:.9,envMapIntensity:.1});
  const p1=new THREE.Mesh(new THREE.BoxGeometry(w-.5,.02,1.6),pathMat);p1.position.y=.20;p1.receiveShadow=true;pg.add(p1);
  const p2=new THREE.Mesh(new THREE.BoxGeometry(1.6,.02,d-.5),pathMat);p2.position.y=.20;p2.receiveShadow=true;pg.add(p2);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(1.7,.45,.55),new THREE.MeshStandardMaterial({color:0x764c29,roughness:.85,envMapIntensity:.15}));bench.position.set(w*.22,.42,d*.22);bench.castShadow=true;pg.add(bench);
  REAL_CITY.group.add(pg);addOcc(x,z,w,d);parkSpots.push({x,z,w,d});
 }
   const styles=['old','brick','cairo','modern','shop','tower'];
  for(const f of ASSYUT.footprints){
   const xs=f.points.map(p=>p.x),zs=f.points.map(p=>p.z);
   const w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs);
   const x=(Math.max(...xs)+Math.min(...xs))/2,z=(Math.max(...zs)+Math.min(...zs))/2;
   if(w<5||d<5||w>80||d>80||!free(x,z,w,d))continue;

   const nearF=nearestAssyutRoad({x,z});
   const isVillFootprint=nearF?.segment&&isVillageSeg(nearF.segment);
   if(isVillFootprint){
    const floors=f.levels?Math.max(2,Math.min(4,Math.round(+f.levels))):(2+Math.floor(cityRandom()*3));
    buildEgyptianResidential(x,z,Math.max(w,10),Math.max(d,10),{floors,isRedBrick:true,hasUnfinishedRoof:cityRandom()<0.65,shutterTheme:cityRandom()<0.6?'green':'brown'},nearF);
   } else if(w>=13&&d>=13&&cityRandom()<0.04){
    realBuilding(x,z,w,d,Math.min(w,9.5),'mosque',f.id,nearF);
   } else if(cityRandom()<0.025){
    realBuilding(x,z,w,d,cityRand(32,50),'tower',f.id,nearF);
   } else {
    const floors=f.levels?Math.max(3,Math.min(8,Math.round(+f.levels))):(3+Math.floor(cityRandom()*6));
    buildEgyptianResidential(x,z,Math.max(w,10),Math.max(d,10),{floors},nearF);
   }
   addOcc(x,z,w,d);
  }

  // 1.5 مباني واجهات الشوارع الرئيسية (Street Corridor Canyons)
  for(let ri=0;ri<ASSYUT.roads.length;ri++){
   const r=ASSYUT.roads[ri];
   if(r.width<8||INFRA.profiles.has(ri))continue;
   for(const si of r.segments){
    const s=ASSYUT.segments[si];
    if(s.length<22)continue;
    const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length;
    const nx=-dz,nz=dx;
    const bldgW=13,bldgD=13;
    const offsetDist=r.width/2+bldgD/2+0.85;
    for(let dist=bldgW/2+1;dist<=s.length-bldgW/2-1;dist+=bldgW+1.5){
     const cx=s.a.x+dx*dist,cz=s.a.z+dz*dist;
     for(const side of[-1,1]){
      const bx=cx+nx*side*offsetDist,bz=cz+nz*side*offsetDist;
      if(free(bx,bz,bldgW,bldgD)){
       const floors=4+Math.floor(cityRandom()*4);
       buildEgyptianResidential(bx,bz,bldgW,bldgD,{
        floors,
        isRedBrick:cityRandom()<0.92,
        hasUnfinishedRoof:cityRandom()<0.78,
        shutterTheme:cityRandom()<0.6?'green':'brown'
       },{segment:s,road:ri,distance:offsetDist,width:r.width,point:{x:cx,z:cz}});
       addOcc(bx,bz,bldgW,bldgD);
      }
     }
    }
   }
  }

  const z0=ASSYUT.bounds.z0+24,z1=ASSYUT.bounds.z1-24,x0=ASSYUT.bounds.x0+24,x1=ASSYUT.bounds.x1-24;
  for(let z=z0;z<=z1;z+=25)for(let x=x0;x<=x1;x+=25){
   const near=nearestAssyutRoad({x,z});if(!near||near.distance>180||near.distance<8)continue;
   let w=cityRand(11,21),d=cityRand(11,20);
   if(!free(x,z,w,d)){w=10;d=10;if(!free(x,z,w,d))continue;}
   if(w>13&&d>13&&cityRandom()<.13){addPark(x,z,w,d);continue;}

   if(x===-151&&z===149){
    buildEgyptianResidential(x,z,Math.max(w,14),Math.max(d,14),{testId:1,floors:5,isRedBrick:false,hasUnfinishedRoof:false,plasterTheme:{key:'plasterBeige',hex:0xdec9a4},shutterTheme:'green'},near);
    addOcc(x,z,Math.max(w,14),Math.max(d,14));continue;
   }
   if(x===-176&&z===149){
    buildEgyptianResidential(x,z,Math.max(w,14),Math.max(d,14),{testId:2,floors:6,isRedBrick:false,hasUnfinishedRoof:true,plasterTheme:{key:'plasterYellow',hex:0xe5dba7},shutterTheme:'brown'},near);
    addOcc(x,z,Math.max(w,14),Math.max(d,14));continue;
   }
   if(x===-151&&z===74){
    buildEgyptianResidential(x,z,Math.max(w,15),Math.max(d,15),{testId:3,floors:5,isRedBrick:true,hasUnfinishedRoof:false,shutterTheme:'green'},near);
    addOcc(x,z,Math.max(w,15),Math.max(d,15));continue;
   }

   const isVillNear = near.segment && isVillageSeg(near.segment);
   if(isVillNear){
    const floors=2+Math.floor(cityRandom()*3);
    buildEgyptianResidential(x,z,w,d,{floors,isRedBrick:true,hasUnfinishedRoof:cityRandom()<0.65,shutterTheme:cityRandom()<0.6?'green':'brown'},near);
   } else if(w>=13&&d>=13&&cityRandom()<0.04){
    realBuilding(x,z,w,d,Math.min(w,9.5),'mosque',null,near);
   } else if(cityRandom()<0.025){
    realBuilding(x,z,w,d,cityRand(31,52),'tower',null,near);
   } else {
    const floors=3+Math.floor(cityRandom()*6);
    buildEgyptianResidential(x,z,w,d,{floors},near);
   }
   addOcc(x,z,w,d);
  }

  // تفريغ وتوليد كافة المباني المجمعة بـ InstancedMesh و mergeGeometries
  flushEgyptBatcher();
  // المساحات الخضراء والنخيل والأشجار الواقعية متعدّدة الأوراق على حواف الطرق وفي الحدائق
 const palmBarkMat=new THREE.MeshStandardMaterial({map:REAL_CITY.palmBarkTex,color:0xffffff,roughness:.94,envMapIntensity:.1});
 const treeBarkMat=new THREE.MeshStandardMaterial({map:REAL_CITY.treeBarkTex,color:0xffffff,roughness:.95,envMapIntensity:.1});
 const frondMat=new THREE.MeshStandardMaterial({map:REAL_CITY.palmFrondTex,alphaTest:.35,side:THREE.DoubleSide,roughness:.75,envMapIntensity:.2});
 const canopyMat=new THREE.MeshStandardMaterial({map:REAL_CITY.leafCanopyTex,alphaTest:.35,side:THREE.DoubleSide,roughness:.82,envMapIntensity:.18});
 const planterMat=new THREE.MeshStandardMaterial({color:0xaba28d,roughness:.9,envMapIntensity:.1});
 const treeSpots=[];
 for(const p of parkSpots){for(const [ox,oz]of[[-p.w*.28,-p.d*.28],[p.w*.28,-p.d*.28],[-p.w*.28,p.d*.28],[p.w*.28,p.d*.28]])treeSpots.push({x:p.x+ox,z:p.z+oz,palm:cityRandom()<.5,inPark:true});}
 for(let i=0;i<ASSYUT.roads.length;i++){const r=ASSYUT.roads[i];if(r.width<9||INFRA.profiles.has(i))continue;let next=10;for(const si of r.segments){const s=ASSYUT.segments[si];for(let d=next;d<s.length;d+=28){const side=d%56<28?1:-1,nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,x=lerp(s.a.x,s.b.x,d/s.length)+nx*side*(r.width/2+1.65),z=lerp(s.a.z,s.b.z,d/s.length)+nz*side*(r.width/2+1.65),p=nearestAssyutRoad({x,z});if(!p||p.distance<p.width/2+1.25||hasOcc(x,z,1.2,1.2))continue;treeSpots.push({x,z,palm:cityRandom()<.55,inPark:false});}next=(next-s.length)%28;if(next<0)next+=28;}}
 const palms=treeSpots.filter(t=>t.palm),trees=treeSpots.filter(t=>!t.palm);
 if(palms.length){
  // سعف نخل منحنٍ واقعي (8 سعفات مقوّسة لكل نخلة)
  const fv=[],fuv=[];const segs=4,fw=.82,fl=3.4;
  for(let k=0;k<segs;k++){const t0=k/segs,t1=(k+1)/segs,z0=t0*fl,z1=t1*fl,y0=Math.sin(t0*2.1)*.58-t0*t0*.95,y1=Math.sin(t1*2.1)*.58-t1*t1*.95,w0=fw*(1-t0*.3),w1=fw*(1-t1*.3);
   fv.push(-w0,y0,z0,w0,y0,z0,w1,y1,z1,-w0,y0,z0,w1,y1,z1,-w1,y1,z1);fuv.push(0,1-t0,1,1-t0,1,1-t1,0,1-t0,1,1-t1,0,1-t1);}
  const frondGeo=new THREE.BufferGeometry();frondGeo.setAttribute('position',new THREE.Float32BufferAttribute(fv,3));frondGeo.setAttribute('uv',new THREE.Float32BufferAttribute(fuv,2));frondGeo.computeVertexNormals();
  const pTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.28,5.8,8),palmBarkMat,palms.length);
  const pFronds=new THREE.InstancedMesh(frondGeo,frondMat,palms.length*8);
  const ob=new THREE.Object3D();let fi=0;
  palms.forEach((pt,idx)=>{const sc=cityRand(.85,1.22),leanX=cityRand(-.04,.04),leanZ=cityRand(-.04,.04);ob.position.set(pt.x,2.9*sc,pt.z);ob.rotation.set(leanX,cityRand(0,6.28),leanZ);ob.scale.setScalar(sc);ob.updateMatrix();pTrunks.setMatrixAt(idx,ob.matrix);
   for(let f=0;f<8;f++){ob.position.set(pt.x+leanZ*1.8*sc,5.65*sc,pt.z-leanX*1.8*sc);ob.rotation.set(f%2?-.22:.08,f/8*Math.PI*2+cityRand(-.15,.15),0);ob.scale.setScalar(sc);ob.updateMatrix();pFronds.setMatrixAt(fi++,ob.matrix);}
   TREES.push({x:pt.x,z:pt.z,r:.42});});
  pTrunks.castShadow=true;pTrunks.receiveShadow=true;pFronds.castShadow=true;pFronds.receiveShadow=true;REAL_CITY.group.add(pTrunks,pFronds);
 }
 if(trees.length){
  // أوراق شجر كثيفة متقاطعة (3 لوحات متعامدة بأوراق شفافّة تعطي حجماً طبيعياً وظلاً متفرّقاً)
  const cv=[],cuv=[];const sz=2.6;
  for(const rot of[0,Math.PI/3,Math.PI*2/3]){const cx=Math.cos(rot)*sz*.5,cz=Math.sin(rot)*sz*.5;cv.push(-cx,-sz*.45,-cz,cx,-sz*.45,cz,cx,sz*.55,cz,-cx,-sz*.45,-cz,cx,sz*.55,cz,-cx,sz*.55,-cz);cuv.push(0,0,1,0,1,1,0,0,1,1,0,1);}
  const capPlane=new THREE.PlaneGeometry(sz,sz);capPlane.rotateX(-Math.PI/2);const cp=capPlane.attributes.position,cu=capPlane.attributes.uv;
  for(const i of capPlane.index.array){cv.push(cp.getX(i),cp.getY(i)+.12,cp.getZ(i));cuv.push(cu.getX(i),cu.getY(i));}
  const canopyGeo=new THREE.BufferGeometry();canopyGeo.setAttribute('position',new THREE.Float32BufferAttribute(cv,3));canopyGeo.setAttribute('uv',new THREE.Float32BufferAttribute(cuv,2));canopyGeo.computeVertexNormals();
  const tTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.28,3.2,7),treeBarkMat,trees.length);
  const tCrowns=new THREE.InstancedMesh(canopyGeo,canopyMat,trees.length*2);
  const tBases=new THREE.InstancedMesh(new THREE.BoxGeometry(1.3,.22,1.3),planterMat,trees.length);
  const ob=new THREE.Object3D();let ci=0;
  trees.forEach((tr,idx)=>{const sc=cityRand(.88,1.28);ob.position.set(tr.x,1.6*sc,tr.z);ob.rotation.set(0,cityRand(0,6.28),0);ob.scale.setScalar(sc);ob.updateMatrix();tTrunks.setMatrixAt(idx,ob.matrix);
   for(let l=0;l<2;l++){ob.position.set(tr.x+(l?.35:-.25)*sc,(3.2+l*.9)*sc,tr.z+(l?-.25:.25)*sc);ob.rotation.set(cityRand(-.15,.15),cityRand(0,6.28),cityRand(-.15,.15));ob.scale.setScalar(sc*(l?.88:1.12));ob.updateMatrix();tCrowns.setMatrixAt(ci++,ob.matrix);}
   ob.position.set(tr.x,.11,tr.z);ob.rotation.set(0,0,0);ob.scale.setScalar(tr.inPark?.01:1);ob.updateMatrix();tBases.setMatrixAt(idx,ob.matrix);TREES.push({x:tr.x,z:tr.z,r:.42});});
  tTrunks.castShadow=true;tTrunks.receiveShadow=true;tCrowns.castShadow=true;tCrowns.receiveShadow=true;REAL_CITY.group.add(tTrunks,tCrowns,tBases);
 }
 // Lighting and street signs are attached to actual road edges.
 // أعمدة إنارة تضيء تلقائياً عند الغروب والليل مع بقع ضوئية على الأسفلت وهالات توهج
 const assyutLampPts=[];
 const lampPoleMat=new THREE.MeshStandardMaterial({color:0x33433c,roughness:.6,metalness:.35});
 const lampBulbMat=new THREE.MeshStandardMaterial({color:0xffedd0,emissive:0xffcc70,emissiveIntensity:.08});
 lampBulbMat.userData={base:1.15};
 if(typeof nightMats!=='undefined')nightMats.push(lampBulbMat);
 for(let i=0;i<ASSYUT.roads.length;i++){const r=ASSYUT.roads[i];if(r.width<9)continue;let next=0;for(const si of r.segments){const s=ASSYUT.segments[si];for(let d=next;d<s.length;d+=48){const side=i%2?1:-1,nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,x=lerp(s.a.x,s.b.x,d/s.length)+nx*side*(r.width/2+1.4),z=lerp(s.a.z,s.b.z,d/s.length)+nz*side*(r.width/2+1.4),p=nearestAssyutRoad({x,z});if(p.distance<p.width/2+.3)continue;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.10,6,6),lampPoleMat);pole.position.set(x,3,z);REAL_CITY.group.add(pole);const lamp=new THREE.Mesh(new THREE.BoxGeometry(.52,.15,.30),lampBulbMat);lamp.position.set(x,6,z);REAL_CITY.group.add(lamp);ROAD_FURNITURE.push({x,z,kind:'streetlight'});assyutLampPts.push({x,z,nx:nx*-side,nz:nz*-side});}next=(next-s.length)%48;if(next<0)next+=48;}}
 if(assyutLampPts.length){
  const poolMat=new THREE.MeshBasicMaterial({color:0xffb866,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  const pools=new THREE.InstancedMesh(new THREE.CircleGeometry(1,14),poolMat,assyutLampPts.length);
  const glowCoords=[];const dm=new THREE.Object3D();
  assyutLampPts.forEach((lp,idx)=>{
   dm.position.set(lp.x+lp.nx*2.1,.05,lp.z+lp.nz*2.1);dm.rotation.set(-Math.PI/2,0,0);dm.scale.set(5.2,5.2,1);dm.updateMatrix();pools.setMatrixAt(idx,dm.matrix);
   glowCoords.push(lp.x,5.95,lp.z);
  });
  pools.instanceMatrix.needsUpdate=true;pools.frustumCulled=false;REAL_CITY.group.add(pools);
  const gGeo=new THREE.BufferGeometry();gGeo.setAttribute('position',new THREE.Float32BufferAttribute(glowCoords,3));
  const gMat=new THREE.PointsMaterial({map:GLOW_TEX,color:0xffcf88,size:10,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const gPts=new THREE.Points(gGeo,gMat);gPts.frustumCulled=false;REAL_CITY.group.add(gPts);
  if(typeof nightGlows!=='undefined'){nightGlows.push({mat:poolMat,day:0,night:.34});nightGlows.push({mat:gMat,day:0,night:.92});}
 }
 for(const p of ASSYUT.places.filter((_,i)=>i%2===0))addMountedRoadSign(p.name,p,null,'محافظة أسيوط · '+p.name);
 // لوحات إعلانات كبيرة وصغيرة مضاءة ليلاً لبراندات وبنوك مصرية حقيقية
 const steelMat=new THREE.MeshStandardMaterial({color:0x5b666d,roughness:.55,metalness:.5});
 for(let i=0;i<ASSYUT.places.length;i+=3){
  const p=ASSYUT.places[i],n=nearestAssyutRoad(p),isSmall=i%2===1;
  const x=n.point.x+n.nx*(n.width/2+(isSmall?1.6:4.2)),z=n.point.z+n.nz*(n.width/2+(isSmall?1.6:4.2));
  if(nearestAssyutRoad({x,z}).distance<n.width/2)continue;
  const tex=cityPick(BILLBOARD_TEXES);
  const adMat=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.2,roughness:.65});
  adMat.userData={base:.45};if(typeof nightMats!=='undefined')nightMats.push(adMat);
  const ad=new THREE.Mesh(new THREE.BoxGeometry(isSmall?2.2:8.2,isSmall?2.7:3.8,.16),adMat);
  ad.position.set(x,isSmall?1.9:5.2,z);ad.rotation.y=n.heading+Math.PI/2;REAL_CITY.group.add(ad);
  const height=ad.position.y;
  for(const offset of isSmall?[0]:[-2.6,2.6]){const v=new THREE.Vector3(offset,0,-.08).applyAxisAngle(new THREE.Vector3(0,1,0),ad.rotation.y),support=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,height,8),steelMat);support.position.set(x+v.x,height/2,z+v.z);REAL_CITY.group.add(support);ROAD_FURNITURE.push({x:x+v.x,z:z+v.z,kind:'advert'});}
 }
}

/* ========================= 47-assyut-urban-details.js ========================= */
/* Egyptian urban detail pass: lightweight visual props, never solid collision. */
const ASSYUT_DETAIL_MATS={
  tank:new THREE.MeshStandardMaterial({color:0x263b48,roughness:.72,metalness:.12}),
  tankBand:new THREE.MeshStandardMaterial({color:0xb3b7ad,roughness:.68,metalness:.28}),
  dish:new THREE.MeshStandardMaterial({color:0xb8b8ad,roughness:.62,metalness:.25}),
  pole:new THREE.MeshStandardMaterial({color:0x30383b,roughness:.8,metalness:.45}),
  wire:new THREE.LineBasicMaterial({color:0x141719,transparent:true,opacity:.72}),
  awningRed:new THREE.MeshStandardMaterial({color:0x9d3425,roughness:.82}),
  awningBlue:new THREE.MeshStandardMaterial({color:0x1e5872,roughness:.82}),
  awningGreen:new THREE.MeshStandardMaterial({color:0x3e6d4b,roughness:.82}),
  crate:new THREE.MeshStandardMaterial({color:0x806044,roughness:.9}),
  curb:new THREE.MeshStandardMaterial({color:0xc7b58e,roughness:.92})
};

function addRooftopEgyptianDetails(){
  const tankGeo=new THREE.CylinderGeometry(.55,.55,1.05,12),bandGeo=new THREE.CylinderGeometry(.59,.59,.08,12);
  const dishGeo=new THREE.SphereGeometry(.46,12,6,0,Math.PI*2,0,Math.PI*.42);
  let idx=0;
  for(const b of REAL_CITY.buildings){
    if(!b||b.h<8||idx++%4!==0)continue;
    const g=new THREE.Group();g.position.set(b.x,b.h+.05,b.z);g.rotation.y=(idx%8)*.37;
    const tank=new THREE.Mesh(tankGeo,ASSYUT_DETAIL_MATS.tank);tank.position.set((idx%3-1)*.65,.55,(idx%2-.5)*.55);tank.castShadow=true;g.add(tank);
    const band=new THREE.Mesh(bandGeo,ASSYUT_DETAIL_MATS.tankBand);band.position.copy(tank.position);band.position.y+=.17;g.add(band);
    if(idx%2===0){const dish=new THREE.Mesh(dishGeo,ASSYUT_DETAIL_MATS.dish);dish.position.set(.9,.8,.15);dish.rotation.x=-Math.PI/2.7;dish.scale.set(1,.28,1);dish.castShadow=true;g.add(dish);}
    REAL_CITY.group.add(g);
  }
}

function addUtilityPolesAndWires(){
  const all=[];
  for(let ri=0;ri<ASSYUT.roads.length;ri++){
    const road=ASSYUT.roads[ri];if(road.width<9||INFRA.profiles.has(ri))continue;
    let side=ri%2?1:-1;
    for(const si of road.segments){
      const s=ASSYUT.segments[si];if(s.length<28)continue;
      const nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length;
      const points=[];
      for(let d=18;d<s.length-10;d+=72){
        const x=lerp(s.a.x,s.b.x,d/s.length)+nx*side*(road.width/2+2.7),z=lerp(s.a.z,s.b.z,d/s.length)+nz*side*(road.width/2+2.7);
        const near=nearestAssyutRoad({x,z});if(!near||near.distance<near.width/2+1.1)continue;
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.10,5.4,7),ASSYUT_DETAIL_MATS.pole);pole.position.set(x,2.7,z);pole.castShadow=true;REAL_CITY.group.add(pole);
        const arm=new THREE.Mesh(new THREE.BoxGeometry(1.15,.08,.08),ASSYUT_DETAIL_MATS.pole);arm.position.set(x,5.12,z);arm.rotation.y=near.heading;REAL_CITY.group.add(arm);
        points.push(new THREE.Vector3(x,5.12,z));
      }
      if(points.length>1){const geo=new THREE.BufferGeometry().setFromPoints(points);const line=new THREE.Line(geo,ASSYUT_DETAIL_MATS.wire);line.frustumCulled=false;REAL_CITY.group.add(line);all.push(line);}
      side*=-1;
    }
  }

  // كابلات كهرباء وتليفونات معلقة متقاطعة بين عمارات جانبي الشارع (طابع مصري أصيل)
  for(let ri=0;ri<ASSYUT.roads.length;ri++){
    const road=ASSYUT.roads[ri];if(road.width<8.5||INFRA.profiles.has(ri))continue;
    for(let si=0;si<road.segments.length;si+=2){
      const s=ASSYUT.segments[road.segments[si]];if(!s||s.length<20)continue;
      const nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length;
      for(let d=10;d<s.length-6;d+=28){
        const mx=lerp(s.a.x,s.b.x,d/s.length),mz=lerp(s.a.z,s.b.z,d/s.length);
        const baseY=assyutRoadHeightAt(mx,mz);
        const halfW=road.width/2+2.2;
        const strands=road.width>=10?2:1;
        for(let st=0;st<strands;st++){
          const y1=baseY+7.4+st*0.48+cityRand(0,1.8),y2=baseY+7.2+st*0.42+cityRand(0,1.8);
          const midY=Math.min(y1,y2)-(1.45+st*0.35);
          const pL=new THREE.Vector3(mx-nx*halfW,y1,mz-nz*halfW);
          const pM=new THREE.Vector3(mx+cityRand(-.8,.8),midY,mz+cityRand(-.8,.8));
          const pR=new THREE.Vector3(mx+nx*halfW,y2,mz+nz*halfW);
          const curve=new THREE.QuadraticBezierCurve3(pL,pM,pR);
          const pts=curve.getPoints(8);
          const geo=new THREE.BufferGeometry().setFromPoints(pts);
          const line=new THREE.Line(geo,ASSYUT_DETAIL_MATS.wire);
          line.frustumCulled=false;REAL_CITY.group.add(line);all.push(line);
        }
      }
    }
  }

  REAL_CITY.utilityWires=all.length;
}

function addEgyptianShopfrontDetails(){
  const awnings=[ASSYUT_DETAIL_MATS.awningRed,ASSYUT_DETAIL_MATS.awningBlue,ASSYUT_DETAIL_MATS.awningGreen];
  let count=0;
  for(let i=0;i<ASSYUT.places.length&&count<80;i+=2){
    const p=ASSYUT.places[i],n=nearestAssyutRoad(p);if(!p||!n)continue;
    const x=n.point.x+n.nx*(n.width/2+1.45),z=n.point.z+n.nz*(n.width/2+1.45);
    if(n.distance<n.width/2+.8)continue;
    const awning=new THREE.Mesh(new THREE.BoxGeometry(2.8,.08,1.15),awnings[count%awnings.length]);
    awning.position.set(x,2.35,z);awning.rotation.y=n.heading+Math.PI/2;awning.castShadow=true;REAL_CITY.group.add(awning);
    for(const side of[-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,1.15,6),ASSYUT_DETAIL_MATS.pole);const dx=Math.cos(n.heading)*side*.95,dz=-Math.sin(n.heading)*side*.95;leg.position.set(x+dx,1.78,z+dz);REAL_CITY.group.add(leg);}
    if(count%3===0){const crate=new THREE.Mesh(new THREE.BoxGeometry(.55,.42,.55),ASSYUT_DETAIL_MATS.crate);crate.position.set(x+n.nx*.8,.22,z+n.nz*.8);crate.rotation.y=n.heading;REAL_CITY.group.add(crate);}
    count++;
  }
  REAL_CITY.shopDetails=count;
}

function addAssyutUrbanDetailPass(){
  if(typeof REAL_CITY==='undefined'||!REAL_CITY.group)return;
  addRooftopEgyptianDetails();
  addUtilityPolesAndWires();
  addEgyptianShopfrontDetails();
}

function addRoadWearAndRepairs(){
  const roadCfg=(typeof VISUAL_CONFIG!=='undefined'&&VISUAL_CONFIG.road)?VISUAL_CONFIG.road:{};
  const patchMats=[
    new THREE.MeshStandardMaterial({color:0x27292a,roughness:.92,metalness:.05,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}),
    new THREE.MeshStandardMaterial({color:0x343739,roughness:.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}),
    new THREE.MeshStandardMaterial({color:0x414446,roughness:.96,metalness:0,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5})
  ];
  const crackMat=new THREE.LineBasicMaterial({color:0x222526,transparent:true,opacity:.52});

  const manholeTex=canvasTex(64,64,g=>{
    g.fillStyle='#2b2d2f';g.fillRect(0,0,64,64);
    g.strokeStyle='#4a4d52';g.lineWidth=3;
    g.beginPath();g.arc(32,32,28,0,Math.PI*2);g.stroke();
    g.beginPath();g.arc(32,32,19,0,Math.PI*2);g.stroke();
    g.beginPath();g.arc(32,32,10,0,Math.PI*2);g.stroke();
    for(let a=0;a<Math.PI*2;a+=Math.PI/4){
      g.beginPath();g.moveTo(32+Math.cos(a)*10,32+Math.sin(a)*10);
      g.lineTo(32+Math.cos(a)*28,32+Math.sin(a)*28);g.stroke();
    }
  });
  const manholeMat=new THREE.MeshStandardMaterial({map:manholeTex,roughness:.65,metalness:.45,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  const manholeGeo=new THREE.CircleGeometry(.46,16);
  manholeGeo.rotateX(-Math.PI/2);

  // بقع زيت محركات قديمة متسربة في منتصف الحارات (طابع الشوارع المصرية الواقعية)
  const oilTex=canvasTex(64,64,g=>{
    const rad=g.createRadialGradient(32,32,3,32,32,28);
    rad.addColorStop(0,'rgba(20,16,14,0.72)');
    rad.addColorStop(0.35,'rgba(25,20,16,0.48)');
    rad.addColorStop(0.75,'rgba(35,28,24,0.18)');
    rad.addColorStop(1,'rgba(35,28,24,0)');
    g.fillStyle=rad;
    g.beginPath();g.ellipse(32,32,28,22,0.25,0,Math.PI*2);g.fill();
    const rad2=g.createRadialGradient(42,24,1,42,24,8);
    rad2.addColorStop(0,'rgba(16,12,10,0.60)');rad2.addColorStop(1,'rgba(16,12,10,0)');
    g.fillStyle=rad2;g.beginPath();g.arc(42,24,8,0,Math.PI*2);g.fill();
  });
  const oilMat=new THREE.MeshBasicMaterial({map:oilTex,transparent:true,opacity:0.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const oilGeo=new THREE.PlaneGeometry(1.4,2.2);
  oilGeo.rotateX(-Math.PI/2);

  // شرائط تراكم أتربة وغبار رملي بجوار حواف الأرصفة
  const curbDustTex=canvasTex(128,32,g=>{
    const grad=g.createLinearGradient(0,0,0,32);
    grad.addColorStop(0,'rgba(175,155,124,0.68)');
    grad.addColorStop(0.4,'rgba(160,140,112,0.32)');
    grad.addColorStop(1,'rgba(140,122,98,0)');
    g.fillStyle=grad;g.fillRect(0,0,128,32);
    for(let i=0;i<30;i++){
      g.fillStyle=(i%2===0)?'rgba(195,178,145,0.45)':'rgba(120,105,82,0.35)';
      g.fillRect(Math.random()*128,Math.random()*10,1.5,1.5);
    }
  });
  const curbDustMat=new THREE.MeshBasicMaterial({map:curbDustTex,transparent:true,opacity:0.82,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const curbDustGeo=new THREE.PlaneGeometry(8.0,0.6);
  curbDustGeo.rotateX(-Math.PI/2);

  let patches=0,cracks=0,manholes=0,oilStains=0,curbDust=0;
  for(const s of ASSYUT.segments){
    if(s.width<7.5||s.length<16||patches>420)continue;
    const roll=cityRandom();if(roll>.55)continue;
    const t=.18+cityRandom()*.64,x=lerp(s.a.x,s.b.x,t),z=lerp(s.a.z,s.b.z,t),heading=s.heading;
    const rH=assyutRoadHeightAt(x,z);

    if(roadCfg.tarPatches!==false){
      const pMat=patchMats[Math.floor(cityRandom()*patchMats.length)];
      const patch=new THREE.Mesh(new THREE.BoxGeometry(1.5+cityRandom()*2.6,.012,.45+cityRandom()*.42),pMat);
      patch.position.set(x,rH+.012,z);patch.rotation.y=heading+cityRand(-.12,.12);patch.scale.x=Math.min(1.8,s.length/24);patch.receiveShadow=true;REAL_CITY.group.add(patch);patches++;
    }

    // بالوعات صرف صحي من الحديد الزهر في منتصف الحارات
    if(roadCfg.manholes!==false&&cityRandom()<.38&&manholes<140&&s.width>=9){
      const laneOff=(cityRandom()<.5?1:-1)*(s.width*.24);
      const nx=-Math.sin(heading),nz=-Math.cos(heading);
      const mh=new THREE.Mesh(manholeGeo,manholeMat);
      mh.position.set(x+nx*laneOff,rH+.015,z+nz*laneOff);
      mh.receiveShadow=true;REAL_CITY.group.add(mh);manholes++;
    }

    if(roadCfg.cracks!==false&&cityRandom()<.65&&cracks<220){
      const fx=Math.cos(heading),fz=-Math.sin(heading),rx=-fz,rz=fx,len=.9+cityRandom()*2.1;
      const pts=[new THREE.Vector3(x-rx*.28,rH+.016,z-rz*.28),new THREE.Vector3(x+fx*len*.35+rx*.14,rH+.016,z+fz*len*.35+rz*.14),new THREE.Vector3(x+fx*len+rx*.32,rH+.016,z+fz*len+rz*.32)];
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),crackMat);REAL_CITY.group.add(line);cracks++;
    }

    // بقع زيت محركات في منتصف مسار مرور السيارات
    if(roadCfg.oilStains!==false&&cityRandom()<.42&&oilStains<180){
      const laneOff=(cityRandom()<.5?1:-1)*(s.width*.22);
      const nx=-Math.sin(heading),nz=-Math.cos(heading);
      const oil=new THREE.Mesh(oilGeo,oilMat);
      oil.position.set(x+nx*laneOff,rH+.014,z+nz*laneOff);
      oil.rotation.y=heading+cityRand(-.2,.2);
      oil.scale.set(cityRand(.8,1.3),1,cityRand(.9,1.5));
      REAL_CITY.group.add(oil);oilStains++;
    }

    // تراكم أتربة ورمال بجانب البلدورات (طابع شوارع أسيوط)
    if(roadCfg.dustAlongCurbs!==false&&cityRandom()<.58&&curbDust<420){
      const side=cityRandom()<.5?1:-1;
      const curbOff=side*(s.width*.46);
      const nx=-Math.sin(heading),nz=-Math.cos(heading);
      const dust=new THREE.Mesh(curbDustGeo,curbDustMat);
      dust.position.set(x+nx*curbOff,rH+.013,z+nz*curbOff);
      dust.rotation.y=heading+(side>0?0:Math.PI);
      dust.scale.set(cityRand(.9,1.35),1,cityRand(1.1,1.6));
      REAL_CITY.group.add(dust);curbDust++;
    }
  }
  REAL_CITY.roadWear={patches,cracks,manholes,oilStains,curbDust};
}
addRoadWearAndRepairs();
addAssyutUrbanDetailPass();

/* ========================= 47-bridges-and-tunnels.js ========================= */
/* Playable OSM bridge/tunnel alignments; no claim of surveyed engineering heights. */
function infrastructureRoadPoint(road,d){const r=ASSYUT.roads[road];for(const si of r.segments){const s=ASSYUT.segments[si];if(d<=s.s0+s.length||si===r.segments[r.segments.length-1]){const t=clamp((d-s.s0)/s.length,0,1);return{x:lerp(s.a.x,s.b.x,t),z:lerp(s.a.z,s.b.z,t),h:infrastructureHeight(road,d),fx:(s.b.x-s.a.x)/s.length,fz:(s.b.z-s.a.z)/s.length};}}}
{
 const bridgeConcreteTex=canvasTex(128,128,g=>{g.fillStyle='#8f9693';g.fillRect(0,0,128,128);for(let i=0;i<900;i++){const v=(Math.random()*24)|0;g.fillStyle=`rgba(${v+130},${v+135},${v+132},0.15)`;g.fillRect(Math.random()*128,Math.random()*128,2,2);}g.strokeStyle='rgba(70,76,73,0.22)';g.lineWidth=1;g.strokeRect(0,0,128,128);});bridgeConcreteTex.wrapS=bridgeConcreteTex.wrapT=THREE.RepeatWrapping;bridgeConcreteTex.repeat.set(2,2);
 const barrierTex=canvasTex(256,64,g=>{g.fillStyle='#8e9693';g.fillRect(0,0,256,64);g.fillStyle='#757c79';g.fillRect(0,48,256,16);g.fillStyle='#5c6360';g.fillRect(0,16,256,24);g.fillStyle='#b8bfbc';g.fillRect(0,18,256,8);g.fillStyle='#4c524f';g.fillRect(0,38,256,2);for(let x=16;x<256;x+=64){g.fillStyle='#3c423f';g.fillRect(x,16,4,24);g.fillStyle='#e0e6e3';g.fillRect(x+1,24,2,8);}});barrierTex.wrapS=barrierTex.wrapT=THREE.RepeatWrapping;barrierTex.repeat.set(4,1);
 const barrierMat=new THREE.MeshStandardMaterial({map:barrierTex,roughness:.72,metalness:.25});
 const mat=(typeof REAL_CITY!=='undefined'&&REAL_CITY.roadMat)?REAL_CITY.roadMat:surfaceMaterial('asphalt',4,4,0x777b7c,4),concrete=new THREE.MeshStandardMaterial({map:bridgeConcreteTex,color:0x9fa6a2,roughness:.88}),pierMat=new THREE.MeshStandardMaterial({color:0x868e88,roughness:.92}),inside=new THREE.MeshStandardMaterial({color:0x536064,roughness:.9,side:THREE.DoubleSide}),vergeTex=(typeof loadEgyptianTexture==='function')?loadEgyptianTexture('assets/textures/egypt/egypt-asphalt-color.jpg',0.35,0.35,true):null,vergeMat=vergeTex?new THREE.MeshStandardMaterial({map:vergeTex,color:0xc9ba9e,roughness:.96,envMapIntensity:.08}):(REAL_CITY.grassMat||new THREE.MeshStandardMaterial({color:0xa29278,roughness:.96})),group=new THREE.Group();REAL_CITY.group.add(group);
 const makeQuad=(pts,idx,material,cast=true)=>{const v=[];for(const i of idx)v.push(...pts[i]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));const uv=[];for(let i=0;i<v.length;i+=3)uv.push(v[i]/4,v[i+2]/4);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=cast;group.add(mesh);};
 const quad=(a,b,w,yadd,material,offset=0,na={x:-a.fz,z:a.fx},nb={x:-b.fz,z:b.fx},idx=[0,2,1,0,3,2])=>{const p=[[a.x+na.x*(offset-w/2),a.h+yadd,a.z+na.z*(offset-w/2)],[b.x+nb.x*(offset-w/2),b.h+yadd,b.z+nb.z*(offset-w/2)],[b.x+nb.x*(offset+w/2),b.h+yadd,b.z+nb.z*(offset+w/2)],[a.x+na.x*(offset+w/2),a.h+yadd,a.z+na.z*(offset+w/2)]];makeQuad(p,idx,material,yadd!==.03);};
 const bridgeStops=(ri,p)=>{const road=ASSYUT.roads[ri],raw=[0,p.length];for(let d=5;d<p.length;d+=5)raw.push(d);for(const si of road.segments)raw.push(ASSYUT.segments[si].s0);raw.sort((u,v)=>u-v);const out=[];for(const d of raw)if(!out.length||d-out[out.length-1]>.2)out.push(clamp(d,0,p.length));if(out[out.length-1]<p.length-.05)out.push(p.length);return out;};
 const groundClear=(px,pz,ri)=>{if(typeof onDrivingRoad==='function'&&onDrivingRoad(px,pz,1.6))return false;const cx=Math.floor(px/ASSYUT.cell),cz=Math.floor(pz/ASSYUT.cell),seen=new Set();for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(const idx of ASSYUT.spatial.get(a+','+b)||[]){if(seen.has(idx))continue;seen.add(idx);const s=ASSYUT.segments[idx];const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((px-s.a.x)*dx+(pz-s.a.z)*dz)/(s.length*s.length),0,1),dist=Math.hypot(px-s.a.x-dx*t,pz-s.a.z-dz*t),h=infrastructureHeight(s.road,s.s0+t*s.length);if(h<1.2&&dist<s.width/2+1.4)return false;}return typeof segmentHitsBuilding!=='function'||!segmentHitsBuilding({x:px-.75,z:pz-.75},{x:px+.75,z:pz+.75},.55);};
 const addPierColumn=(px,pz,colH)=>{if(colH<.8)return;const post=new THREE.Mesh(new THREE.BoxGeometry(.75,colH,.75),pierMat);post.position.set(px,colH/2,pz);post.castShadow=true;post.receiveShadow=true;group.add(post);const foot=new THREE.Mesh(new THREE.BoxGeometry(1.15,.36,1.15),concrete);foot.position.set(px,.18,pz);foot.receiveShadow=true;group.add(foot);
  // Store the top of the physical support as well as its footprint.  A
  // support below an elevated deck must not collide with a car on that deck.
  INFRA.supports.push({x:px,z:pz,top:colH,kind:'bridge-support'});
 };
 for(const [ri,p]of INFRA.profiles){const road=ASSYUT.roads[ri],w=road.width;INFRA.structures.push(p);
  const stops=bridgeStops(ri,p),pts=stops.map(d=>infrastructureRoadPoint(ri,d));
  const norms=pts.map((pt,i)=>{const prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz)||1;return{x:-dz/l,z:dx/l};});
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],na=norms[i],nb=norms[i+1],len=Math.hypot(b.x-a.x,b.z-a.z),heading=-Math.atan2(b.z-a.z,b.x-a.x),slope=Math.atan2(b.h-a.h,len);quad(a,b,w,.03,mat,0,na,nb);
   for(const side of[-1,1]){const cx=(a.x+b.x)/2+((na.x+nb.x)/2)*side*(w/2+.15),cz=(a.z+b.z)/2+((na.z+nb.z)/2)*side*(w/2+.15),height=p.kind==='tunnel'?3.3:.70;
    const wall=new THREE.Mesh(new THREE.BoxGeometry(len+.16,height,.30),p.kind==='tunnel'?inside:barrierMat);wall.position.set(cx,(a.h+b.h)/2+height/2,cz);wall.rotation.y=heading;wall.rotation.z=slope;wall.castShadow=true;wall.receiveShadow=true;group.add(wall);INFRA.barriers.push({x:cx,z:cz,heading,hl:len/2,hw:.18,h:(a.h+b.h)/2,height,kind:p.kind,road:ri});
    if(p.kind==='tunnel'){const ga={...a,h:0},gb={...b,h:0};quad(ga,gb,24,-.018,vergeMat,side*(w/2+12.15),na,nb);}
   }
   if(p.kind==='tunnel'&&stops[i]>p.ramp*.8&&stops[i]<p.length-p.ramp*.8){quad(a,b,w+1,3.3,inside,0,na,nb);if(i%3===0){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.8,.04,.3),new THREE.MeshBasicMaterial({color:0xffe7b3,toneMapped:false}));lamp.position.set((a.x+b.x)/2,(a.h+b.h)/2+3.22,(a.z+b.z)/2);group.add(lamp);}}
   if(p.kind==='bridge'){const bw=w+.56,yT=-.02,yB=-.48;
    quad(a,b,bw,yB,concrete,0,na,nb,[0,1,2,0,2,3]);
    makeQuad([[a.x-na.x*bw/2,a.h+yT,a.z-na.z*bw/2],[b.x-nb.x*bw/2,b.h+yT,b.z-nb.z*bw/2],[b.x-nb.x*bw/2,b.h+yB,b.z-nb.z*bw/2],[a.x-na.x*bw/2,a.h+yB,a.z-na.z*bw/2]],[0,1,2,0,2,3],concrete,true);
    makeQuad([[a.x+na.x*bw/2,a.h+yT,a.z+na.z*bw/2],[b.x+nb.x*bw/2,b.h+yT,b.z+nb.z*bw/2],[b.x+nb.x*bw/2,b.h+yB,b.z+nb.z*bw/2],[a.x+na.x*bw/2,a.h+yB,a.z+nb.z*bw/2]],[0,2,1,0,3,2],concrete,true);
   }
  }
  if(p.kind==='bridge')for(let pd=18;pd<p.length-12;pd+=20){let placed=false;
   for(const shift of[0,-3,3,-6,6]){if(placed)break;const d=clamp(pd+shift,14,p.length-10),pt=infrastructureRoadPoint(ri,d);if(pt.h<1.25)continue;
    const nx=-pt.fz,nz=pt.fx,heading=-Math.atan2(pt.fz,pt.fx),colH=pt.h-.45;
    for(const mode of[w/2-.85,w/2+.95,0]){const offs=mode===0?[0]:[-mode,mode];
     if(offs.every(o=>groundClear(pt.x+nx*o,pt.z+nz*o,ri))){for(const o of offs)addPierColumn(pt.x+nx*o,pt.z+nz*o,colH);
      const capW=mode===0?Math.max(4,w-.6):mode*2+1.25,cap=new THREE.Mesh(new THREE.BoxGeometry(.95,.46,capW),concrete);cap.position.set(pt.x,pt.h-.58,pt.z);cap.rotation.y=heading;cap.castShadow=true;cap.receiveShadow=true;group.add(cap);placed=true;break;
     }
    }
   }
  }
  // Mounted on the verge, outside the bridge deck and its crash barrier.
  const start=infrastructureRoadPoint(ri,Math.min(15,p.length*.15)),sign=makeMountedRoadSign(p.name,5.2,1.05,4.1+Math.max(0,start.h));
  const sx1=start.x-start.fz*(w/2+3.5),sz1=start.z+start.fx*(w/2+3.5),sx2=start.x+start.fz*(w/2+3.5),sz2=start.z-start.fx*(w/2+3.5);
  const useFirst=groundClear(sx1,sz1,ri)||!groundClear(sx2,sz2,ri);
  sign.position.set(useFirst?sx1:sx2,0,useFirst?sz1:sz2);sign.rotation.y=-Math.atan2(start.fz,start.fx)+(useFirst?-Math.PI/2:Math.PI/2);(REAL_CITY.signs??=[]).push(sign);group.add(sign);
  if(p.kind==='tunnel'&&typeof makeOverheadGantry==='function'){
    const isManfaz=/منفذ/.test(p.name||'');
    const leftTitle=isManfaz?'نفق المنفذ':'نفق الأزهر';
    const rightTitle=isManfaz?'محطة أسيوط · شارع الجمهورية':'شارع الجيش · جامعة أسيوط';
    const gantry=makeOverheadGantry(leftTitle,rightTitle,w+1.8,5.4,isManfaz?'المنفذ · حي غرب':'الأزهر · شرق أسيوط');
    gantry.position.set(start.x,0,start.z);gantry.rotation.y=-Math.atan2(start.fz,start.fx);REAL_CITY.group.add(gantry);
    // يافطة زرقاء ثانية على مدخل النفق من الجهة المقابلة
    const endPt=infrastructureRoadPoint(ri,Math.max(p.length*.85,p.length-14));
    const gantryEnd=makeOverheadGantry(leftTitle,isManfaz?'شارع الجلاء · ميدان المحطة':'وسط أسيوط',w+1.8,5.4,isManfaz?'المنفذ · اتجاه المحطة':'نفق الأزهر');
    gantryEnd.position.set(endPt.x,0,endPt.z);gantryEnd.rotation.y=-Math.atan2(endPt.fz,endPt.fx)+Math.PI;REAL_CITY.group.add(gantryEnd);
  }
 }
 // Batch static engineering meshes to avoid hundreds of draw calls.
 const batches=new Map();group.updateMatrixWorld(true);
 for(const mesh of group.children.slice()){if(!mesh.isMesh)continue;const m=mesh.material,key=[m.type,m.color.getHex(),m.map?.uuid||'',m.side].join(':');if(!batches.has(key))batches.set(key,{mat:m,p:[],n:[],uv:[]});const b=batches.get(key),geo=mesh.geometry.clone().applyMatrix4(mesh.matrix),plain=geo.index?geo.toNonIndexed():geo,pos=plain.attributes.position,norm=plain.attributes.normal,uv=plain.attributes.uv;for(let i=0;i<pos.count;i++){b.p.push(pos.getX(i),pos.getY(i),pos.getZ(i));b.n.push(norm.getX(i),norm.getY(i),norm.getZ(i));b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}group.remove(mesh);mesh.geometry.dispose();geo.dispose();if(plain!==geo)plain.dispose();}
 for(const b of batches.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));const mesh=new THREE.Mesh(geo,b.mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 // Cut approach corridors out of the old flat ground so tunnels are genuinely below grade.
 const old=REAL_CITY.group.children.find(o=>o.userData.cityGround);if(old){REAL_CITY.group.remove(old);old.geometry.dispose();const vertices=[],uv=[];for(let z=-1050;z<1550;z+=24)for(let x=-1250;x<1250;x+=24){const p=nearestAssyutRoad({x:x+12,z:z+12}),profile=p&&INFRA.profiles.get(p.roadIndex);if(profile?.kind==='tunnel'&&p.distance<p.width/2+20)continue;const pts=[[x,-.025,z],[x+24,-.025,z+24],[x+24,-.025,z],[x,-.025,z],[x,-.025,z+24],[x+24,-.025,z+24]];for(const q of pts){vertices.push(q[0],q[1],q[2]);uv.push(q[0]/12,q[2]/12);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const terrainTex=(typeof loadEgyptianTexture==='function')?loadEgyptianTexture('assets/textures/egypt/egypt-asphalt-color.jpg',1,1,true):null;const terrainNorm=(typeof loadEgyptianTexture==='function')?loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_NormalGL.jpg',1.5,1.5,false):null;const terrainMat=terrainTex?new THREE.MeshStandardMaterial({map:terrainTex,normalMap:terrainNorm,color:0xc9ba9e,roughness:.96,metalness:0,normalScale:new THREE.Vector2(.8,.8),envMapIntensity:.08}):(REAL_CITY.groundMat||new THREE.MeshStandardMaterial({color:0xa69d88,roughness:1}));const terrain=new THREE.Mesh(geo,terrainMat);terrain.receiveShadow=true;REAL_CITY.group.add(terrain);}
}
function driveSurfaceCandidates(x,z){
 const cx=Math.floor(x/ASSYUT.cell),cz=Math.floor(z/ASSYUT.cell),seen=new Set(),result=[];
 for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(const index of ASSYUT.spatial.get(a+','+b)||[]){if(seen.has(index))continue;seen.add(index);const s=ASSYUT.segments[index],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,raw=((x-s.a.x)*dx+(z-s.a.z)*dz)/(s.length*s.length),t=clamp(raw,0,1),distance=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(distance>s.width/2+2.3)continue;result.push({road:s.road,s,t,raw,distance,height:infrastructureHeight(s.road,s.s0+t*s.length)+(distance>s.width/2?.18:0),alignment:Math.abs((dx*Math.cos(car.heading)-dz*Math.sin(car.heading))/s.length)});}
 return result;
}
function selectDrivingSurface(){
 const candidates=driveSurfaceCandidates(car.x,car.z),locked=candidates.filter(p=>p.road===car.surfaceRoad&&INFRA.profiles.has(p.road)&&p.distance<p.s.width/2+.65&&p.raw>=-.02&&p.raw<=1.02).sort((a,b)=>a.distance-b.distance)[0];
 if(locked&&Math.abs(locked.height-car.y)<1.1)return;
 let best=null;for(const p of candidates){if(p.height-car.y>.75)continue;const ramp=INFRA.profiles.has(p.road)&&Math.abs(p.height)<.65&&p.alignment>.85&&p.raw>=0&&p.raw<=1;const score=p.distance*.45+Math.abs(p.height-car.y)*2+(1-p.alignment)*1.8-(ramp?2.5:0);if(!best||score<best.score)best={...p,score};}car.surfaceRoad=best?.road;
}
function sampledDriveHeight(x,z,currentY,preferredRoad){
 for(const p of STATION_SURFACES){const dx=x-p.x,dz=z-p.z,lx=dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw),lz=dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw)+2.7;if(Math.abs(lx)<11.5&&Math.abs(lz)<9.5)return .18;}
 const candidates=driveSurfaceCandidates(x,z);
 if(Number.isInteger(preferredRoad)&&INFRA.profiles.has(preferredRoad)){const same=candidates.filter(p=>p.road===preferredRoad).sort((a,b)=>a.distance-b.distance)[0];if(same&&same.height-currentY<=1.05)return same.height;}
 let best=null;for(const p of candidates){if(p.height-currentY>.85)continue;const score=p.distance*.45+Math.abs(p.height-currentY)*2;if(!best||score<best.score)best={...p,score};}return best?best.height:assyutRoadHeightAt(x,z);
}
function resolveInfrastructureRails(){
 for(const b of INFRA.barriers){
  if(Math.abs(car.x-b.x)>b.hl+4||Math.abs(car.z-b.z)>b.hl+4)continue;
  const bh=b.height??.70;
  // حاجز الكوبري لا ينتمي إلا لسطح الطريق الذي بُني عليه؛ هذا يمنع
  // اصطدام السيارة بحاجز قريب وهي تسير فوق كوبري آخر.
  const sameDeck=b.kind!=='bridge'||car.surfaceRoad===b.road||driveSurfaceCandidates(car.x,car.z).some(p=>p.road===b.road&&p.distance<p.s.width/2+1.25);
  const lowRampSolid = b.kind === 'bridge' && b.h < 3.8 && car.y < b.h + bh;
  const solid=b.kind==='tunnel'?(car.y+1.5>=b.h&&car.y<=b.h+bh+.3):((sameDeck&&Math.abs(car.y-b.h)<1.35)||lowRampSolid);
  if(!solid)continue;
  const hit=obbContact(playerBounds(),b);if(hit)recordImpact(staticContact(hit),'حاجز الطريق · خفّف السرعة');
 }
 // Supports are vertical objects.  Check their height, not just their X/Z
 // footprint; otherwise a car driving on the deck hits a pier underneath it.
 for(const f of [...(INFRA.supports||[]),...(ROAD_FURNITURE||[])]){
  if(f.kind!=='bridge-support'||Math.abs(car.x-f.x)>5||Math.abs(car.z-f.z)>5)continue;
  const top=Number.isFinite(f.top)?f.top:2.25;
  if(car.y>top+.18)continue;
  const hit=obbContact(playerBounds(),{x:f.x,z:f.z,heading:0,hl:.38,hw:.38});
  if(hit)recordImpact(staticContact(hit),'دعامة الكوبري · خفّف السرعة');
 }
}

/* ========================= 48-assyut-special-places.js ========================= */
/* Named Assiut places: recognizable visual identities tied to OSM road names. */
const ASSYUT_SPECIALS={landmarks:[],zones:[],medianAds:0,ledScreens:0,kazyonCount:0,mechanicsCount:0,foulCount:0};

function assyutRoadByName(pattern){
  return ASSYUT.roads.filter(r=>pattern.test(String(r.name||''))&&r.length>35).sort((a,b)=>b.length-a.length)[0]||null;
}
function assyutRoadMidpoint(road,ratio=.52){
  const seg=ASSYUT.segments[road.segments[Math.floor(road.segments.length*ratio)]]||ASSYUT.segments[road.segments[0]];
  if(!seg)return null;
  return {x:(seg.a.x+seg.b.x)/2,z:(seg.a.z+seg.b.z)/2,heading:seg.heading,nx:-(seg.b.z-seg.a.z)/seg.length,nz:(seg.b.x-seg.a.x)/seg.length,tx:(seg.b.x-seg.a.x)/seg.length,tz:(seg.b.z-seg.a.z)/seg.length,width:seg.width};
}
function assyutBoard(text,sub,color='#074b8c',w=7,h=2.1){
  const tex=canvasTex(1024,300,g=>{g.fillStyle=color;g.fillRect(0,0,1024,300);g.strokeStyle='#eef6fa';g.lineWidth=10;g.strokeRect(12,12,1000,276);g.direction='rtl';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffffff';g.font='bold 74px Tahoma, Cairo';g.fillText(text,512,114,930);g.font='600 34px Tahoma, Cairo';g.fillStyle='#dceeff';g.fillText(sub,512,220,940);});
  const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.55,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);mesh.castShadow=true;return mesh;
}
function placeAssyutBoard(road,text,sub,color,side=1,along=.5){
  const p=assyutRoadMidpoint(road,along);if(!p)return;
  const x=p.x+p.nx*side*(p.width/2+2.6),z=p.z+p.nz*side*(p.width/2+2.6);
  if(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))return;
  const board=assyutBoard(text,sub,color);board.position.set(x,3.6,z);board.rotation.y=p.heading+Math.PI/2;REAL_CITY.group.add(board);
  const postMat=new THREE.MeshStandardMaterial({color:0x4d5556,roughness:.65,metalness:.35});
  for(const ox of[-2.2,2.2]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,3.4,7),postMat);const v=new THREE.Vector3(ox,0,.05).applyAxisAngle(new THREE.Vector3(0,1,0),board.rotation.y);post.position.set(x+v.x,1.7,z+v.z);REAL_CITY.group.add(post);}
  ASSYUT_SPECIALS.landmarks.push({name:text,x,z,road:road.name});
  return {x,z,heading:p.heading,nx:p.nx,nz:p.nz};
}

// 1. مبنى محطة سكة حديد أسيوط الحقيقي على يمين شارع الجلاء / ميدان المحطة
function addAsyutRailwayStation(){
  const galaa=assyutRoadByName(/شارع الجلاء/)||ASSYUT.roads[0];
  if(!galaa)return;
  const seg=ASSYUT.segments[galaa.segments[Math.min(2,galaa.segments.length-1)]]||ASSYUT.segments[0];
  if(!seg)return;
  const tx=(seg.b.x-seg.a.x)/seg.length,tz=(seg.b.z-seg.a.z)/seg.length;
  const nx=-tz,nz=tx;
  // وضع المبنى على يمين الشارع (side = 1) بمسافة آمنة خلف الرصيف
  let sx=0,sz=0,placed=false,sideChosen=1;
  for(const side of [1,-1]){
    for(const shift of [0,18,-18,34,-34]){
      const cx=(seg.a.x+seg.b.x)/2+tx*shift+nx*side*(seg.width/2+11.5);
      const cz=(seg.a.z+seg.b.z)/2+tz*shift+nz*side*(seg.width/2+11.5);
      const near=nearestAssyutRoad({x:cx,z:cz});
      if(near&&near.distance>=near.width/2+7.5){sx=cx;sz=cz;sideChosen=side;placed=true;break;}
    }
    if(placed)break;
  }
  if(!placed)return;

  const g=new THREE.Group();
  g.position.set(sx,0,sz);
  // توجيه واجهة المحطة لتقابل الشارع مباشرة
  const facingYaw=Math.atan2(-nx*sideChosen,-nz*sideChosen);
  g.rotation.y=facingYaw;

  const stoneMat=new THREE.MeshStandardMaterial({color:0xdfd1b4,roughness:.86,envMapIntensity:.16});
  const trimMat=new THREE.MeshStandardMaterial({color:0xc2ab82,roughness:.80,envMapIntensity:.18});
  const baseMat=new THREE.MeshStandardMaterial({color:0x8c8272,roughness:.92});
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x1b3340,roughness:.16,metalness:.3,clearcoat:.7,envMapIntensity:.8});
  const goldMat=new THREE.MeshStandardMaterial({color:0xd8b048,roughness:.45,metalness:.55});

  // الهيكل الرئيسي لمحطة أسيوط
  const body=new THREE.Mesh(new THREE.BoxGeometry(24,10.5,11),stoneMat);
  body.position.y=5.25;body.castShadow=true;body.receiveShadow=true;g.add(body);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(24.5,1.4,11.5),baseMat);
  plinth.position.y=.7;plinth.receiveShadow=true;g.add(plinth);
  const cornice=new THREE.Mesh(new THREE.BoxGeometry(24.8,.75,11.8),trimMat);
  cornice.position.y=10.6;cornice.castShadow=true;g.add(cornice);
  // تاج علوي كلاسيكي في منتصف المحطة
  const pediment=new THREE.Mesh(new THREE.BoxGeometry(11.5,2.4,1.2),trimMat);
  pediment.position.set(0,11.9,5.1);pediment.castShadow=true;g.add(pediment);

  // 3 بوابات مقوسة زجاجية لمدخل الركاب
  for(const ax of [-6.8,0,6.8]){
    const archGlass=new THREE.Mesh(new THREE.BoxGeometry(3.8,5.2,.18),glassMat);
    archGlass.position.set(ax,3.1,5.52);g.add(archGlass);
    const frameTop=new THREE.Mesh(new THREE.BoxGeometry(4.3,.45,.32),trimMat);
    frameTop.position.set(ax,5.8,5.56);g.add(frameTop);
    for(const px of [-2.05,2.05]){
      const pilaster=new THREE.Mesh(new THREE.BoxGeometry(.55,9.6,.52),trimMat);
      pilaster.position.set(ax+px,5.0,5.56);pilaster.castShadow=true;g.add(pilaster);
    }
  }
  // مظلة مدخل المحطة
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(18.5,.38,3.2),trimMat);
  canopy.position.set(0,5.8,6.9);canopy.castShadow=true;g.add(canopy);
  for(const cx of [-7.5,0,7.5]){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,5.6,10),stoneMat);
    col.position.set(cx,2.8,8.1);col.castShadow=true;g.add(col);
  }
  // ساعة محطة القطار الدائرية
  const clockTex=canvasTex(256,256,c=>{
    c.fillStyle='#f8f4e6';c.beginPath();c.arc(128,128,118,0,Math.PI*2);c.fill();
    c.strokeStyle='#1e3a5f';c.lineWidth=14;c.stroke();
    c.strokeStyle='#1a1a1a';c.lineWidth=10;c.beginPath();c.moveTo(128,128);c.lineTo(128,54);c.moveTo(128,128);c.lineTo(182,142);c.stroke();
  });
  const clock=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.22,20),new THREE.MeshStandardMaterial({map:clockTex,roughness:.4}));
  clock.rotation.x=Math.PI/2;clock.position.set(0,8.2,5.68);g.add(clock);

  // اليافطة الرسمية المضيئة: محطة سكة حديد أسيوط
  const stationSignTex=canvasTex(1024,256,c=>{
    c.fillStyle='#074b8c';c.fillRect(0,0,1024,256);
    c.strokeStyle='#f0c850';c.lineWidth=12;c.strokeRect(12,12,1000,232);
    c.direction='rtl';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#ffffff';c.font='bold 92px Tahoma, Cairo, Arial';
    c.fillText('محطة سكة حديد أسيوط',512,102,940);
    c.fillStyle='#ffd966';c.font='bold 42px Tahoma, Arial';
    c.fillText('ASYUT RAILWAY STATION · محطة أسيوط',512,196,920);
  });
  const stationSignMat=new THREE.MeshStandardMaterial({map:stationSignTex,emissiveMap:stationSignTex,emissive:new THREE.Color(0xffffff),emissiveIntensity:.35,roughness:.42});
  if(typeof nightMats!=='undefined')nightMats.push(stationSignMat);
  const topSign=new THREE.Mesh(new THREE.BoxGeometry(13.5,2.3,.28),stationSignMat);
  topSign.position.set(0,11.9,5.8);g.add(topSign);
  const entranceSign=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.35,.22),stationSignMat);
  entranceSign.position.set(0,6.65,8.45);g.add(entranceSign);

  REAL_CITY.group.add(g);
  MAP.buildings.push({x0:sx-11,x1:sx+11,z0:sz-6,z1:sz+6,h:12});
  ASSYUT_SPECIALS.landmarks.push({name:'محطة سكة حديد أسيوط',x:sx,z:sz,road:galaa.name});
}

// 2. فروع كازيون ماركت + ورش ميكانيكا + مطاعم فول وطعمية على أرصفة شوارع أسيوط
function addEgyptianStreetShops(){
  const tireMat=new THREE.MeshStandardMaterial({color:0x1b1d20,roughness:.92});
  const drumBlue=new THREE.MeshStandardMaterial({color:0x16548a,roughness:.55,metalness:.35});
  const drumRed=new THREE.MeshStandardMaterial({color:0xa82420,roughness:.55,metalness:.35});
  const tableMat=new THREE.MeshStandardMaterial({color:0xc5b8a0,roughness:.78});
  const chairMat=new THREE.MeshStandardMaterial({color:0x1e5c8a,roughness:.82});
  const potMat=new THREE.MeshStandardMaterial({color:0xb88438,roughness:.35,metalness:.75});
  const kazyonRed=new THREE.MeshStandardMaterial({color:0xc8102e,roughness:.65});
  const kazyonYellow=new THREE.MeshStandardMaterial({color:0xffd200,roughness:.6});

  const targetPatterns=[/شارع الجلاء/,/شارع الجمهوريه|الجمهورية/,/شارع الجيش/,/شارع يسرى راغب/,/شارع الرياض|عبد المنعم رياض/,/شارع احمد الهلالي/,/شارع النميس/];
  let idx=0;
  for(const pat of targetPatterns){
    const road=assyutRoadByName(pat);
    if(!road)continue;
    // فرع كازيون ماركت
    const kp=assyutRoadMidpoint(road,.30);
    if(kp){
      const x=kp.x+kp.nx*(kp.width/2+2.3),z=kp.z+kp.nz*(kp.width/2+2.3);
      if(!(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))){
        const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=kp.heading;
        const kiosk=new THREE.Mesh(new THREE.BoxGeometry(3.8,.16,1.2),kazyonRed);kiosk.position.set(0,2.75,0);g.add(kiosk);
        const trim=new THREE.Mesh(new THREE.BoxGeometry(3.82,.14,.14),kazyonYellow);trim.position.set(0,2.65,.56);g.add(trim);
        const board=assyutBoard('كازيون ماركت · KAZYON','أقرب سوبر ماركت ليك · عروض يومية','#c8102e',4.4,1.15);
        board.position.set(0,3.4,0);g.add(board);
        for(const sx of[-1.6,1.6]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,2.9,6),kazyonRed);pole.position.set(sx,1.45,0);g.add(pole);}
        REAL_CITY.group.add(g);
        ASSYUT_SPECIALS.kazyonCount++;
      }
    }
    // ورشة ميكانيكا وكاوتش (إطارات + براميل زيت + يافطة ورشة)
    const mp=assyutRoadMidpoint(road,.55);
    if(mp){
      const x=mp.x-mp.nx*(mp.width/2+2.15),z=mp.z-mp.nz*(mp.width/2+2.15);
      if(!(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))){
        const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=mp.heading+Math.PI;
        for(let t=0;t<3;t++){const tire=new THREE.Mesh(new THREE.TorusGeometry(.28,.10,8,14),tireMat);tire.rotation.x=Math.PI/2;tire.position.set(-.8,.12+t*.18,0);g.add(tire);}
        const drum=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.86,12),idx%2?drumBlue:drumRed);drum.position.set(.65,.43,0);drum.castShadow=true;g.add(drum);
        const sign=assyutBoard('ورشة ميكانيكا وكهرباء سيارات','عفشة · كاوتش · تغيير زيت','#123d72',3.8,1.0);
        sign.position.set(0,2.85,0);g.add(sign);
        for(const sx of[-1.3,1.3]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,2.5,6),drumBlue);p.position.set(sx,1.25,0);g.add(p);}
        REAL_CITY.group.add(g);
        ASSYUT_SPECIALS.mechanicsCount++;
      }
    }
    // مطعم فول وطعمية (قدرة فول + ترابيزات وكراسي على الرصيف + يافطة)
    const fp=assyutRoadMidpoint(road,.76);
    if(fp){
      const x=fp.x+fp.nx*(fp.width/2+2.15),z=fp.z+fp.nz*(fp.width/2+2.15);
      if(!(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))){
        const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=fp.heading;
        const cart=new THREE.Mesh(new THREE.BoxGeometry(1.5,.88,.72),tableMat);cart.position.set(-.6,.44,0);g.add(cart);
        const pot=new THREE.Mesh(new THREE.CylinderGeometry(.20,.26,.46,10),potMat);pot.position.set(-.6,1.08,0);g.add(pot);
        const tbl=new THREE.Mesh(new THREE.BoxGeometry(.9,.72,.9),tableMat);tbl.position.set(.95,.36,0);g.add(tbl);
        for(const cx of[.35,1.55]){const ch=new THREE.Mesh(new THREE.BoxGeometry(.38,.45,.38),chairMat);ch.position.set(cx,.22,0);g.add(ch);}
        const sign=assyutBoard('مطعم فول وطعمية الصعيدي','فول · طعمية سخنة · ساندوتشات','#b83214',4.0,1.05);
        sign.position.set(0,2.95,0);g.add(sign);
        REAL_CITY.group.add(g);
        ASSYUT_SPECIALS.foulCount++;
      }
    }
    idx++;
  }
}

// 3. أعمدة إعلانات الرصيف الأوسط (الجزيرة الوسطى) + يافطات وشاشات LED ضخمة
function addMedianPoleAdsAndGiantScreens(){
  const poleMat=new THREE.MeshStandardMaterial({color:0x3c454a,roughness:.55,metalness:.55});
  const frameMat=new THREE.MeshStandardMaterial({color:0x1b2024,roughness:.42,metalness:.65});

  const medianAdSpecs=[
    { title:'كازيون ماركت', sub:'عروض كل يوم في أسيوط', bg:'#c8102e', fg:'#ffd200' },
    { title:'أهلاً بكم في أسيوط', sub:'عاصمة الصعيد · قيادة آمنة', bg:'#074b8c', fg:'#ffffff' },
    { title:'شبكة 5G الأسرع', sub:'تغطية شاملة في أسيوط', bg:'#5b21b6', fg:'#f8fafc' },
    { title:'أبراج النيل السكنية', sub:'استلام فوري · كورنيش أسيوط', bg:'#0f5132', fg:'#fef08a' }
  ];
  const medianAdMats=medianAdSpecs.map(ad=>{
    const tex=canvasTex(384,640,g=>{
      g.fillStyle=ad.bg;g.fillRect(0,0,384,640);
      g.strokeStyle=ad.fg;g.lineWidth=10;g.strokeRect(12,12,360,616);
      g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=ad.fg;g.font='bold 48px Tahoma, Cairo';
      g.fillText(ad.title,192,240,330);
      g.fillStyle='#ffffff';g.font='600 30px Tahoma, Cairo';
      g.fillText(ad.sub,192,365,330);
    });
    const m=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(0xffffff),emissiveIntensity:.28,roughness:.35});
    if(typeof nightMats!=='undefined')nightMats.push(m);
    return m;
  });

  // أعمدة إعلانات على الرصيف اللي في نص الشوارع ذات الاتجاهين
  let medianCount=0;
  for(const seg of ASSYUT.segments){
    if(INFRA.profiles.has(seg.road)||seg.width<13.0||seg.length<22||medianCount>=90)continue;
    for(let d=12;d<seg.length-10&&medianCount<90;d+=28){
      const x=lerp(seg.a.x,seg.b.x,d/seg.length),z=lerp(seg.a.z,seg.b.z,d/seg.length);
      const y=assyutRoadHeightAt(x,z);
      const g=new THREE.Group();g.position.set(x,y+.18,z);g.rotation.y=seg.heading;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,6.4,8),poleMat);
      pole.position.y=3.2;pole.castShadow=true;g.add(pole);
      // ذراعين إنارة للاتجاهين
      const crossArm=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,2.2),poleMat);
      crossArm.position.y=6.2;g.add(crossArm);
      // لوحة إعلانات مضيئة مزدوجة الوجه على عمود الرصيف الأوسط
      const adMat=medianAdMats[medianCount%medianAdMats.length];
      const box=new THREE.Mesh(new THREE.BoxGeometry(.16,1.85,1.15),[adMat,adMat,frameMat,frameMat,frameMat,frameMat]);
      box.position.y=3.45;box.castShadow=true;g.add(box);
      REAL_CITY.group.add(g);
      medianCount++;
    }
  }
  ASSYUT_SPECIALS.medianAds=medianCount;

  // شاشات LED رقمية مضيئة ويافطات إعلانات ضخمة على المحاور الرئيسية
  const ledSpecs=[
    { title:'أسيوط الجديدة · سيتي مول', sub:'تسوق · مطاعم · سينما · ترفيه', bg:'#0b1938', accent:'#38bdf8' },
    { title:'كازيون ماركت — عروض الشهر', sub:'خصومات حتى 40% في جميع فروع أسيوط', bg:'#991b1b', accent:'#facc15' },
    { title:'أوبر أسيوط · مشوارك أسرع', sub:'اطلب عربيتك في أي مكان في أسيوط 24/7', bg:'#111827', accent:'#22c55e' },
    { title:'مطاعم ومشويات الصعيد', sub:'طعم أصيل · توصيل سريع لوسط أسيوط', bg:'#451a03', accent:'#fb923c' }
  ];
  const ledMats=ledSpecs.map(spec=>{
    const tex=canvasTex(1024,512,g=>{
      const grad=g.createLinearGradient(0,0,1024,512);
      grad.addColorStop(0,spec.bg);grad.addColorStop(1,'#090d16');
      g.fillStyle=grad;g.fillRect(0,0,1024,512);
      g.strokeStyle=spec.accent;g.lineWidth=14;g.strokeRect(16,16,992,480);
      g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=spec.accent;g.font='bold 78px Tahoma, Cairo';
      g.fillText(spec.title,512,185,930);
      g.fillStyle='#ffffff';g.font='600 44px Tahoma, Cairo';
      g.fillText(spec.sub,512,330,920);
      // تأثير نقاط شاشة LED خفيف
      g.fillStyle='rgba(255,255,255,0.06)';
      for(let y=0;y<512;y+=8)g.fillRect(0,y,1024,2);
    });
    return new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(0xffffff),emissiveIntensity:.72,roughness:.25});
  });

  const majorAvenues=[/شارع الجلاء/,/شارع الجمهوريه|الجمهورية/,/شارع الجيش/,/شارع يسرى راغب/,/شارع احمد الهلالي/];
  let screenCount=0;
  for(const pat of majorAvenues){
    const road=assyutRoadByName(pat);
    if(!road)continue;
    for(const ratio of [.22,.50,.78]){
      const p=assyutRoadMidpoint(road,ratio);if(!p)continue;
      const side=(screenCount%2===0)?1:-1;
      const x=p.x+p.nx*side*(p.width/2+4.8),z=p.z+p.nz*side*(p.width/2+4.8);
      if(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.8))continue;
      const g=new THREE.Group();g.position.set(x,assyutRoadHeightAt(x,z),z);
      g.rotation.y=p.heading+(side>0?Math.PI/2:-Math.PI/2);
      // عمود حديدي ضخم (Unipole)
      const pylon=new THREE.Mesh(new THREE.CylinderGeometry(.26,.34,6.8,10),poleMat);
      pylon.position.y=3.4;pylon.castShadow=true;g.add(pylon);
      // شاشة LED أو يافطة إعلانات ضخمة
      const isLED=(screenCount%2===0);
      const sw=isLED?6.8:8.6,sh=isLED?3.4:3.6;
      const mat=ledMats[screenCount%ledMats.length];
      const screen=new THREE.Mesh(new THREE.BoxGeometry(sw,sh,.32),[frameMat,frameMat,frameMat,frameMat,mat,mat]);
      screen.position.y=7.4;screen.castShadow=true;g.add(screen);
      REAL_CITY.group.add(g);
      screenCount++;
    }
  }
  ASSYUT_SPECIALS.ledScreens=screenCount;
}

function addMarketStalls(road){
  const p=assyutRoadMidpoint(road);if(!p)return;
  const colors=[0xc84a2c,0x6b9837,0xe0ad39,0x9e3c30];
  for(let i=-4;i<=4;i++){
    const side=i%2?1:-1,x=p.x+p.nx*side*(p.width/2+2.8)+p.tx*i*3.1,z=p.z+p.nz*side*(p.width/2+2.8)+p.tz*i*3.1;
    const crate=new THREE.Mesh(new THREE.BoxGeometry(1.2,.42,.85),new THREE.MeshStandardMaterial({color:colors[(i+8)%colors.length],roughness:.9}));crate.position.set(x,.27,z);crate.rotation.y=p.heading;REAL_CITY.group.add(crate);
    const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.7,.07,1.45),new THREE.MeshStandardMaterial({color:i%2?0xc23d2b:0xd8b13b,roughness:.85}));canopy.position.set(x,2.15,z);canopy.rotation.y=p.heading;REAL_CITY.group.add(canopy);
  }
  ASSYUT_SPECIALS.zones.push({name:'سوق شارع رياض',road:road.name,type:'produce'});
}
function addNileEdge(road){
  const p=assyutRoadMidpoint(road);if(!p)return;
  const water=new THREE.Mesh(new THREE.BoxGeometry(Math.min(road.length,190),.10,30),new THREE.MeshStandardMaterial({color:0x2c8190,roughness:.22,metalness:.12,transparent:true,opacity:.90}));
  water.position.set(p.x+p.nx*(p.width/2+18),-.02,p.z+p.nz*(p.width/2+18));water.rotation.y=p.heading;water.receiveShadow=true;REAL_CITY.group.add(water);
  const bank=new THREE.Mesh(new THREE.BoxGeometry(Math.min(road.length,190),.18,2.4),new THREE.MeshStandardMaterial({color:0xb49b70,roughness:.94}));
  bank.position.set(p.x+p.nx*(p.width/2+3.2),.06,p.z+p.nz*(p.width/2+3.2));bank.rotation.y=p.heading;REAL_CITY.group.add(bank);
  ASSYUT_SPECIALS.zones.push({name:'شارع البحر',road:road.name,type:'nile'});
}
function addDurnakaGate(){
  const road=assyutRoadByName(/جبل|زراع|محلي/);const p=road&&assyutRoadMidpoint(road);
  const x=p?p.x+p.nx*(p.width/2+20):ASSYUT.bounds.x0+130,z=p?p.z+p.nz*(p.width/2+20):ASSYUT.bounds.z0+150,heading=p?.heading||0;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=heading;
  const rock=new THREE.Mesh(new THREE.ConeGeometry(20,18,7),new THREE.MeshStandardMaterial({color:0x8b7158,roughness:.98}));rock.position.set(0,9,7);rock.scale.set(1.5,.9,.65);rock.castShadow=true;g.add(rock);
  const stone=new THREE.MeshStandardMaterial({color:0xd8c29b,roughness:.9});
  const wall=new THREE.Mesh(new THREE.BoxGeometry(15,5,.9),stone);wall.position.set(0,2.5,0);wall.castShadow=true;g.add(wall);
  for(const side of[-1,1]){const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.7,8,10),stone);tower.position.set(side*6.3,4,0);tower.castShadow=true;g.add(tower);}
  const arch=new THREE.Mesh(new THREE.TorusGeometry(3.0,.45,8,20,Math.PI),stone);arch.position.set(0,4.5,-.55);arch.rotation.x=Math.PI/2;g.add(arch);
  const crossMat=new THREE.MeshStandardMaterial({color:0x7b3d2e,roughness:.75});
  const v=new THREE.Mesh(new THREE.BoxGeometry(.22,2.2,.22),crossMat);v.position.set(0,9.5,0);const h=new THREE.Mesh(new THREE.BoxGeometry(1.15,.22,.22),crossMat);h.position.set(0,9.65,0);g.add(v,h);
  REAL_CITY.group.add(g);
  const board=assyutBoard('دير العذراء مريم · درنكة','طريق زراعي · جبل أسيوط الغربي','#6d3f31',8,2.3);board.position.set(x,5.8,z-1.2);board.rotation.y=heading+Math.PI/2;REAL_CITY.group.add(board);
  ASSYUT_SPECIALS.landmarks.push({name:'دير العذراء مريم · درنكة',x,z,road:road?.name||'طريق درنكة'});
}
function addAssyutNamedPlacesPass(){
  if(typeof REAL_CITY==='undefined')return;
  addAsyutRailwayStation();
  addEgyptianStreetShops();
  addMedianPoleAdsAndGiantScreens();
  const riyadh=assyutRoadByName(/شارع الرياض|عبد المنعم رياض/);if(riyadh){placeAssyutBoard(riyadh,'شارع رياض','سوق الخضار والفاكهة · أسيوط','#074b8c',1,.50);addMarketStalls(riyadh);}
  const station=assyutRoadByName(/محطة|الجمهوريه|الجمهورية/);if(station){placeAssyutBoard(station,'ميدان المحطة · شارع الجمهورية','محطة أسيوط · نفق المنفذ','#074b8c');ASSYUT_SPECIALS.zones.push({name:'شارع المحطة',road:station.name,type:'busy'});}
  const nile=assyutRoadByName(/النيل|البحرى|البحري|طراد النيل/);if(nile){placeAssyutBoard(nile,'شارع البحر','كورنيش النيل · أسيوط','#074b8c');addNileEdge(nile);}
  addDurnakaGate();REAL_CITY.specialPlaces=ASSYUT_SPECIALS;
}
addAssyutNamedPlacesPass();

/* ========================= 48b-street-life-props.js ========================= */
/* Second visual pass: lived-in street props with no gameplay collision. */
const STREET_PROP_MATS={
  wood:new THREE.MeshStandardMaterial({color:0x735039,roughness:.94}),
  crate:[0x9d5c32,0x6d8a4c,0xc08b3c,0x7a4f39].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.92})),
  tarp:[0x9a332a,0x286078,0x47754a,0xc19235].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.86})),
  bin:new THREE.MeshStandardMaterial({color:0x31555a,roughness:.9}),
  cloth:[0xd4523e,0xe4bf63,0x3d7088,0xe7e0c9].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.82,side:THREE.DoubleSide})),
  stain:new THREE.MeshStandardMaterial({color:0x121417,roughness:.18,metalness:.15,envMapIntensity:1.45,transparent:true,opacity:.68,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3})
};

function addMarketStall(x,z,heading,idx){
  const g=new THREE.Group();g.position.set(x,.02,z);g.rotation.y=heading;
  const table=new THREE.Mesh(new THREE.BoxGeometry(2.25,.48,.78),STREET_PROP_MATS.wood);table.position.y=.52;table.castShadow=true;g.add(table);
  for(const sx of[-.82,.82])for(const sz of[-.25,.25]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.72,6),STREET_PROP_MATS.wood);leg.position.set(sx,.18,sz);g.add(leg);}
  for(let i=0;i<4;i++){const basket=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.16,10),STREET_PROP_MATS.crate[(idx+i)%STREET_PROP_MATS.crate.length]);basket.position.set(-.72+i*.48,.86,(i%2?-.16:.16));g.add(basket);}
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.9,.08,1.35),STREET_PROP_MATS.tarp[idx%STREET_PROP_MATS.tarp.length]);canopy.position.y=2.28;canopy.rotation.x=-.08;g.add(canopy);
  for(const sx of[-1.08,1.08]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,1.7,6),ASSYUT_DETAIL_MATS.pole);pole.position.set(sx,1.35,0);g.add(pole);}
  REAL_CITY.group.add(g);return g;
}

function addStreetMarketProps(){
  let stalls=0,bins=0;
  for(let i=1;i<ASSYUT.places.length&&stalls<28;i+=3){
    const p=ASSYUT.places[i],n=nearestAssyutRoad(p);if(!p||!n||n.width<8)continue;
    const side=stalls%2?1:-1,x=n.point.x+n.nx*(n.width/2+2.8)*side,z=n.point.z+n.nz*(n.width/2+2.8)*side;
    if(n.distance<n.width/2+1.5)continue;
    addMarketStall(x,z,n.heading+Math.PI/2,stalls++);
    if(stalls%2===0){const bin=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.66,10),STREET_PROP_MATS.bin);bin.position.set(x+n.nx*1.8,.35,z+n.nz*1.8);REAL_CITY.group.add(bin);bins++;}
  }
  REAL_CITY.streetStalls=stalls;REAL_CITY.streetBins=bins;
}

function addRooftopLaundry(){
  let count=0;
  for(const b of REAL_CITY.buildings){
    if(!b||b.h<5||count>=24||count%3!==0){count++;continue;}
    const g=new THREE.Group();g.position.set(b.x,b.h+.18,b.z);g.rotation.y=(count%5)*.41;
    const lineMat=new THREE.LineBasicMaterial({color:0x34383a,transparent:true,opacity:.72});
    const pts=[new THREE.Vector3(-1.55,0,0),new THREE.Vector3(1.55,0,0)];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat));
    for(let i=0;i<4;i++){const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.42,.65),STREET_PROP_MATS.cloth[(count+i)%STREET_PROP_MATS.cloth.length]);cloth.position.set(-1.2+i*.8,-.33,0);cloth.rotation.y=Math.PI/2;g.add(cloth);}
    REAL_CITY.group.add(g);count++;
  }
  REAL_CITY.rooftopLaundry=Math.min(24,Math.floor(count/3));
}

function addAsphaltStains(){
  const geo=new THREE.CircleGeometry(1,14);let added=0;
  for(const s of ASSYUT.segments){
    if(added>=140||s.width<7.5||s.length<16||cityRandom()>.25)continue;
    const t=.15+cityRandom()*.70,x=lerp(s.a.x,s.b.x,t),z=lerp(s.a.z,s.b.z,t);
    const stain=new THREE.Mesh(geo,STREET_PROP_MATS.stain);
    stain.position.set(x,assyutRoadHeightAt(x,z)+.021,z);
    stain.rotation.x=-Math.PI/2;
    const isStreak=cityRandom()<.42;
    stain.scale.set(isStreak?.25+cityRandom()*.35:.45+cityRandom()*.8,isStreak?1.1+cityRandom()*1.8:.22+cityRandom()*.45,1);
    stain.rotation.z=s.heading;
    stain.receiveShadow=true;
    REAL_CITY.group.add(stain);added++;
  }
  REAL_CITY.asphaltStains=added;
}

function runStreetLifeProps(){
  if(typeof REAL_CITY==='undefined'||!REAL_CITY.group)return;
  addStreetMarketProps();addRooftopLaundry();addAsphaltStains();
}
runStreetLifeProps();

/* ========================= 48c-village-roads.js ========================= */
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

/* ========================= 48d-railway-crossing.js ========================= */
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

/* ========================= 49-visual-overhaul.js ========================= */
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
    const isSkidding = ((typeof keys !== 'undefined' && (keys.Space || keys.KeyS)) || (typeof touch !== 'undefined' && (touch.hb || touch.brk)) || Math.abs(car.lateralAccel || 0) > 4.2) && sp > 3.0;
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
        p.userData.maxAge = 0.55 + Math.random() * 0.35;
        p.userData.vx = rx * side * (0.8 + Math.random() * 0.6) - fx * sp * 0.2;
        p.userData.vy = 0.6 + Math.random() * 0.8;
        p.userData.vz = rz * side * (0.8 + Math.random() * 0.6) - fz * sp * 0.2;
        p.material.opacity = 0.58;
        p.material.color.setHex(0xf4f4f4);
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
