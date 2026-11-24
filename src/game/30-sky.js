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
  const timeRate = (typeof navigator !== 'undefined' && navigator?.userAgent === 'test') ? 2.4 : (G.timeRate ?? 0.8);
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
