// The road overlay and minimap consume the same remaining route, including every corner.
const routeRibbonGeometry=new THREE.BufferGeometry(),routeRibbonPositions=new Float32Array(1800);
routeRibbonGeometry.setAttribute('position',new THREE.BufferAttribute(routeRibbonPositions,3));routeRibbonGeometry.setDrawRange(0,0);
const routeRibbon=new THREE.Mesh(routeRibbonGeometry,new THREE.MeshBasicMaterial({color:0x29f39a,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));routeRibbon.frustumCulled=false;scene.add(routeRibbon);
function updateRoadRibbon(){
 const points=remainingNavigationPoints();routeRibbon.visible=G.state==='play'&&['rides','police'].includes(G.mode)&&points.length>1;
 let count=0,left=145;
 if(routeRibbon.visible)for(let i=0;i<points.length-1&&left>0&&count<594;i++){
  const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)continue;
  const limit=Math.min(length,left),nx=-dz/length*.36,nz=dx/length*.36;
  for(let d=0;d<limit&&count<594;d+=3){const end=Math.min(limit,d+3),p={x:a.x+dx*d/length,z:a.z+dz*d/length,roadIndex:b.roadIndex},q={x:a.x+dx*end/length,z:a.z+dz*end/length,roadIndex:b.roadIndex},h=navigationStopHeight(p)+.11,k=navigationStopHeight(q)+.11;
   for(const v of [[p.x+nx,h,p.z+nz],[p.x-nx,h,p.z-nz],[q.x+nx,k,q.z+nz],[q.x+nx,k,q.z+nz],[p.x-nx,h,p.z-nz],[q.x-nx,k,q.z-nz]]){routeRibbonPositions.set(v,count*3);count++;}
  }left-=limit;
 }
 routeRibbonGeometry.setDrawRange(0,count);routeRibbonGeometry.attributes.position.needsUpdate=true;
}
/* =====================================================================
   الماركرات والسهم
   ===================================================================== */
function updateMarkers(dt) {
  renderRouteGuidance();
  updateRoadRibbon();
  const t = performance.now() * .001;

  pRing.scale.setScalar(1 + Math.sin(t * 3) * .07);
  pDisc.material.opacity = .42 + Math.sin(t * 3) * .14;
  pBeam.material.opacity = .24 + Math.sin(t * 2.1) * .07;
  pRing.rotation.z += dt * .7;

  dRing.scale.setScalar(1 + Math.sin(t * 2.6) * .06);
  dDisc.material.opacity = .3 + Math.sin(t * 2.6) * .1;
  dRing.rotation.z -= dt * .6;

  let target = null, arrowGuide = null;
  const color = 0x3dff8a;
  if(G.mode==='police')target=policeTarget();
  else if(M.phase==='toPick')target=pickupMarker.position;
  else if (M.phase === 'toDest' || M.phase === 'race') target = destMarker.position;
  if((G.mode==='rides'||G.mode==='police')&&target)arrowGuide=navigationArrowGuide();

  if (target) {
    const wasVisible = arrow.visible;
    arrow.visible = true;
    arrowGlow.visible = true;
    arrow.material.color.setHex(color);
    arrow.material.emissive.setHex(0x1fa85a);
    arrowGlow.material.color.setHex(color);
    arrow.scale.setScalar(.76);

    // ضع السهم أمام السيارة عند التقاطع القادم أو على مسافة واضحة حتى لا يحجبه السقف ويوجه يميناً ويساراً بدقة
    const fwdX = Math.cos(car.heading), fwdZ = -Math.sin(car.heading);
    const finalDist = Math.hypot(target.x - car.x, target.z - car.z);
    const guide = arrowGuide?.guide || target;
    let ax, az;
    if (finalDist < 15) {
      ax = target.x; az = target.z;
    } else {
      const lead = arrowGuide ? Math.min(arrowGuide.lead, finalDist) : clamp(14 + Math.abs(car.speed) * .15, 14, 18);
      ax = car.x + fwdX * lead;
      az = car.z + fwdZ * lead;
    }
    const baseH = Math.max(car.y, navigationStopHeight({x: ax, z: az, roadIndex: car.surfaceRoad}));
    const desiredPos = new THREE.Vector3(ax, baseH + (finalDist < 15 ? 3.5 : 2.95) + Math.sin(t * 2.4) * .18, az);

    let dx = guide.x - ax, dz = guide.z - az;
    const gLen = Math.hypot(dx, dz);
    if (gLen < 1.8) { dx = target.x - car.x; dz = target.z - car.z; }
    const hLen = Math.hypot(dx, dz);
    const dirX = hLen > .1 ? dx / hLen : fwdX;
    const dirZ = hLen > .1 ? dz / hLen : fwdZ;

    // توجيه رأس السهم مباشرة ناحية الاتجاه الفعلي على الخريطة (يمين = يمين ويسار = يسار دون انقلاب)
    const yAxis = (finalDist < 12
      ? new THREE.Vector3(dirX * .28, -.96, dirZ * .28)
      : new THREE.Vector3(dirX * .93, -.36, dirZ * .93)).normalize();
    let faceHint = new THREE.Vector3(-fwdX * .48, .88, -fwdZ * .48).normalize();
    if (Math.abs(yAxis.dot(faceHint)) > .95) faceHint.set(0, 0, 1);
    const xAxis = new THREE.Vector3().crossVectors(yAxis, faceHint).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));

    const blend = (!wasVisible || !dt) ? 1 : Math.min(1, dt * 11);
    arrow.position.lerp(desiredPos, blend);
    arrow.quaternion.slerp(targetQuat, blend);

    arrowGlow.position.copy(arrow.position);
    arrowGlow.scale.set(6.5, 6.5, 1);
  } else {
    arrow.visible = false;
    arrowGlow.visible = false;
  }
}

/* =====================================================================
   الكاميرا
   ===================================================================== */
const camLook = new THREE.Vector3(0, 2, 0);
let camHeading = 0, camHeight = 0, camReady = false;

function updateCamera(dt) {
  dt = (typeof dt === 'number' && Number.isFinite(dt) && dt > 0) ? Math.min(dt, 0.1) : 0.016;
  if (!Number.isFinite(G.menuT)) G.menuT = 0;

  if (G.state === 'menu') {
    camReady = false;
    G.menuT += dt;
    const startX = (typeof ASSYUT !== 'undefined' && ASSYUT.start && Number.isFinite(ASSYUT.start.x)) ? ASSYUT.start.x : 0;
    const startZ = (typeof ASSYUT !== 'undefined' && ASSYUT.start && Number.isFinite(ASSYUT.start.z)) ? ASSYUT.start.z : 0;
    const cx = startX + Math.sin(G.menuT * .055) * 35;
    camera.position.set(cx - 10, 7.8, startZ + 13);
    camera.lookAt(startX + 20, 2.2, startZ);
    return;
  }

  const carX = (typeof car !== 'undefined' && Number.isFinite(car.x)) ? car.x : 0;
  const carY = (typeof car !== 'undefined' && Number.isFinite(car.y)) ? car.y : 0;
  const carZ = (typeof car !== 'undefined' && Number.isFinite(car.z)) ? car.z : 0;
  const carH = (typeof car !== 'undefined' && Number.isFinite(car.heading)) ? car.heading : 0;

  if (!camReady || !Number.isFinite(camHeading) || !Number.isFinite(camHeight)) {
    camHeading = carH;
    camHeight = carY;
    camReady = true;
  }
  if (typeof updateCockpitDynamics === 'function') updateCockpitDynamics(dt);
  const dh = Math.atan2(Math.sin(carH - camHeading), Math.cos(carH - camHeading));
  camHeading += dh * (1 - Math.exp(-dt * 9.5));
  camHeight += (carY - camHeight) * (1 - Math.exp(-dt * 14));
  if (!Number.isFinite(camHeading)) camHeading = carH;
  if (!Number.isFinite(camHeight)) camHeight = carY;

  const fwd = new THREE.Vector3(Math.cos(carH), 0, -Math.sin(carH));
  const cfwd = new THREE.Vector3(Math.cos(camHeading), 0, -Math.sin(camHeading));
  const base = new THREE.Vector3(carX, camHeight, carZ);
  let desired, look, fov = 58;

  const isLong = (typeof CARS !== 'undefined' && CARS[G.carIdx]?.length || 4.4) > 4.8;
  if (typeof taxiRig !== 'undefined' && taxiRig?.driverOccupant) taxiRig.driverOccupant.visible = (G.camMode !== 2);
  if (G.camMode === 0) {
    // الافتراضي: منظور GTA V من الخلف بمسافة متوازنة تُبرز الشارع والعمارات الطوب الأحمر على الجانبين
    desired = base.clone().addScaledVector(cfwd, isLong ? -6.3 : -5.5).add(new THREE.Vector3(0, isLong ? 2.22 : 2.02, 0));
    look = base.clone().addScaledVector(fwd, isLong ? 15.0 : 14.0).add(new THREE.Vector3(0, isLong ? 1.42 : 1.32, 0));
    fov = 62;
  } else if (G.camMode === 1) {
    // من بره وبعيد
    desired = base.clone().addScaledVector(cfwd, -9.6).add(new THREE.Vector3(0, 3.6, 0));
    look = base.clone().addScaledVector(fwd, 11).add(new THREE.Vector3(0, 1.35, 0));
    fov = 62;
  } else if (G.camMode === 2) {
    // من داخل السيارة عند التابلوه
    if (typeof taxi !== 'undefined') taxi.updateMatrixWorld(true);
    const cabin = (typeof taxiBody !== 'undefined' && taxiBody) || (typeof taxi !== 'undefined' && taxi);
    const eye = (typeof taxiRig !== 'undefined' && taxiRig.cabinEye) || [-.12, 1.24, -.36];
    if (cabin) {
      desired = cabin.localToWorld(new THREE.Vector3(...eye));
      look = cabin.localToWorld(new THREE.Vector3(eye[0] + 20, eye[1] - .06, eye[2]));
    } else {
      desired = base.clone().addScaledVector(cfwd, -4.6).add(new THREE.Vector3(0, 1.82, 0));
      look = base.clone().addScaledVector(fwd, 10.5).add(new THREE.Vector3(0, 1.15, 0));
    }
    camera.position.copy(desired);
    camLook.copy(look);
    camera.near = .03; camera.fov = 74; camera.updateProjectionMatrix();
    camera.lookAt(look);
    return;
  } else {
    desired = base.clone().add(new THREE.Vector3(0, 24, -14));
    look = base.clone().addScaledVector(fwd, 6);
    fov = 60;
  }
  if (camera.fov !== fov || camera.near !== .1) {
    camera.fov = fov; camera.near = .1; camera.updateProjectionMatrix();
  }

  if (desired && Number.isFinite(desired.x) && Number.isFinite(desired.y) && Number.isFinite(desired.z)) {
    camera.position.copy(desired);
  }
  if (look && Number.isFinite(look.x) && Number.isFinite(look.y) && Number.isFinite(look.z)) {
    if (!Number.isFinite(camLook.x) || !Number.isFinite(camLook.y) || !Number.isFinite(camLook.z)) {
      camLook.copy(look);
    } else {
      camLook.lerp(look, 1 - Math.exp(-dt * 14));
    }
    camera.lookAt(camLook);
  }

  if (car.shake > 0) {
    camera.position.x += (Math.random() - .5) * car.shake * .55;
    camera.position.y += (Math.random() - .5) * car.shake * .32;
    camera.position.z += (Math.random() - .5) * car.shake * .55;
  }
}

/* =====================================================================
   الخريطة المصغرة
   ===================================================================== */
const mmCtx = $('minimap').getContext('2d');

function drawMinimap() {
  const cvs = $('minimap');
  if (!cvs) return;
  const W = cvs.width, H = cvs.height || W;
  const cx = W / 2, cy = H / 2;
  const span = 260, s = Math.min(W, H) / span;
  const tx = x => cx + (x - car.x) * s;
  const tz = z => cy + (z - car.z) * s;

  mmCtx.save();
  mmCtx.clearRect(0, 0, W, H);
  mmCtx.beginPath();
  mmCtx.rect(0, 0, W, H);
  mmCtx.clip();

  mmCtx.fillStyle = '#121820';
  mmCtx.fillRect(0, 0, W, H);

  // شبكة الشوارع بأسلوب رادار GTA V
  mmCtx.strokeStyle = '#5a6878';
  mmCtx.lineCap = 'round';
  for (const road of ASSYUT.roads) {
    if (!road.points.some(p => Math.abs(p.x - car.x) < 180 && Math.abs(p.z - car.z) < 180)) continue;
    mmCtx.lineWidth = Math.max(2.4, road.width * s * 1.12);
    mmCtx.beginPath();
    road.points.forEach((p, i) => i ? mmCtx.lineTo(tx(p.x), tz(p.z)) : mmCtx.moveTo(tx(p.x), tz(p.z)));
    mmCtx.stroke();
  }

  // المباني
  mmCtx.fillStyle = '#222b36';
  const carX = car.x, carZ = car.z;
  for (const b of MAP.buildings) {
    if (Math.abs(b.x0 - carX) > 140 && Math.abs(b.x1 - carX) > 140) continue;
    if (Math.abs(b.z0 - carZ) > 140 && Math.abs(b.z1 - carZ) > 140) continue;
    drawBuildingFootprint(mmCtx, b, tx, tz, s);
  }

  // إشارات المرور على المينيماب
  if (typeof TRAFFIC_LIGHTS !== 'undefined') {
    for (const tl of TRAFFIC_LIGHTS) {
      const mx = tx(tl.x), mz = tz(tl.z);
      if (mx < -6 || mx > W + 6 || mz < -6 || mz > H + 6) continue;
      mmCtx.fillStyle = tl.xState === 'red' ? '#ff4d4d' : tl.xState === 'yellow' ? '#ffc61a' : '#3dff8a';
      mmCtx.beginPath();
      mmCtx.arc(mx, mz, 2.8, 0, 7);
      mmCtx.fill();
    }
  }

  // سيارات المرور
  for (const t of traffic) {
    mmCtx.fillStyle = t.dir > 0 ? '#e2c56a' : '#88a4df';
    mmCtx.beginPath();
    mmCtx.arc(tx(t.mesh.position.x), tz(t.mesh.position.z), 2.2, 0, 7);
    mmCtx.fill();
  }

  // مسار الـ GPS باللون الأزرق النيوني / الفيروزي المميز لـ GTA V
  if ((G.mode === 'rides' || G.mode === 'police') && RIDE.navigation) {
    mmCtx.strokeStyle = '#38bdf8';
    mmCtx.lineWidth = 4;
    mmCtx.lineCap = 'round';
    mmCtx.beginPath();
    remainingNavigationPoints().forEach((p, i) => i ? mmCtx.lineTo(tx(p.x), tz(p.z)) : mmCtx.moveTo(tx(p.x), tz(p.z)));
    mmCtx.stroke();
  }

  let tgt = null, col = '#38bdf8';
  if (G.mode === 'police') { const p = policeTarget(); if (p) tgt = p; col = '#61b8ff'; }
  else if (M.phase === 'toPick') { tgt = pickupMarker.position; col = '#ffc61a'; }
  else if (M.phase === 'toDest' || M.phase === 'race') { tgt = destMarker.position; col = '#2ecc71'; }

  if (tgt) {
    let px = tx(tgt.x), pz = tz(tgt.z);
    const pad = 12;
    const off = px < pad || px > W - pad || pz < pad || pz > H - pad;
    px = clamp(px, pad, W - pad);
    pz = clamp(pz, pad, H - pad);

    mmCtx.fillStyle = col;
    mmCtx.beginPath();
    mmCtx.arc(px, pz, off ? 5 : 6, 0, 7);
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.8;
    mmCtx.stroke();
  }

  // سهم سيارة اللاعب أسلوب GTA V (شيفرون أبيض مع حدود داكنة)
  mmCtx.save();
  mmCtx.translate(cx, cy);
  mmCtx.rotate(-car.heading);
  mmCtx.fillStyle = '#ffffff';
  mmCtx.beginPath();
  mmCtx.moveTo(9, 0);
  mmCtx.lineTo(-6, 6);
  mmCtx.lineTo(-3, 0);
  mmCtx.lineTo(-6, -6);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.strokeStyle = 'rgba(0,0,0,0.85)';
  mmCtx.lineWidth = 1.5;
  mmCtx.stroke();
  mmCtx.restore();

  mmCtx.restore();

  // تحديث شريطي الصحة والدرع لـ GTA V
  const hFill = $('gtaHealthFill');
  if (hFill) {
    const hp = clamp(1 - (car.damage || 0) / 100, 0.15, 1);
    hFill.style.width = (hp * 100) + '%';
  }
}

function drawCockpitScreen(ctx) {
  if (!ctx) return;
  const W = 512, H = 256;
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 1. Dark Automotive Background
  ctx.fillStyle = '#0f151c';
  ctx.fillRect(0, 0, W, H);

  // 2. Map Area (Heading-Up Navigation)
  const mapCX = W / 2, mapCY = H / 2 + 10;
  const span = 190, s = (H * 0.9) / span;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 36, W, H - 64);
  ctx.clip();

  ctx.translate(mapCX, mapCY);
  const headingAngle = (typeof car !== 'undefined' ? car.heading : 0);
  ctx.rotate(-headingAngle - Math.PI / 2);

  const tx = x => (x - (car?.x || 0)) * s;
  const tz = z => (z - (car?.z || 0)) * s;

  // Buildings
  if (typeof MAP !== 'undefined' && MAP.buildings) {
    ctx.fillStyle = '#1c2530';
    for (const b of MAP.buildings) {
      if (Math.abs(b.x0 - car.x) > 140 || Math.abs(b.z0 - car.z) > 140) continue;
      if (typeof drawBuildingFootprint === 'function') {
        drawBuildingFootprint(ctx, b, x => tx(x), z => tz(z), s);
      } else {
        ctx.fillRect(tx(b.x0), tz(b.z0), (b.x1 - b.x0) * s, (b.z1 - b.z0) * s);
      }
    }
  }

  // Roads
  if (typeof ASSYUT !== 'undefined' && ASSYUT.roads) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const road of ASSYUT.roads) {
      if (!road.points.some(p => Math.abs(p.x - car.x) < 140 && Math.abs(p.z - car.z) < 140)) continue;
      ctx.strokeStyle = '#273440';
      ctx.lineWidth = Math.max(3, road.width * s + 2);
      ctx.beginPath();
      road.points.forEach((p, i) => i ? ctx.lineTo(tx(p.x), tz(p.z)) : ctx.moveTo(tx(p.x), tz(p.z)));
      ctx.stroke();

      ctx.strokeStyle = '#384858';
      ctx.lineWidth = Math.max(2, road.width * s);
      ctx.stroke();
    }
  }

  // Traffic Lights
  if (typeof TRAFFIC_LIGHTS !== 'undefined') {
    for (const tl of TRAFFIC_LIGHTS) {
      const mx = tx(tl.x), mz = tz(tl.z);
      if (Math.abs(mx) > W || Math.abs(mz) > H) continue;
      ctx.fillStyle = tl.xState === 'red' ? '#ff3b30' : tl.xState === 'yellow' ? '#ffcc00' : '#34c759';
      ctx.beginPath();
      ctx.arc(mx, mz, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Traffic Vehicles
  if (typeof traffic !== 'undefined') {
    for (const t of traffic) {
      const mx = tx(t.mesh.position.x), mz = tz(t.mesh.position.z);
      if (Math.abs(mx) > W || Math.abs(mz) > H) continue;
      ctx.fillStyle = t.dir > 0 ? '#ffb300' : '#4fc3f7';
      ctx.beginPath();
      ctx.arc(mx, mz, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Active GPS Route Line
  if ((G.mode === 'rides' || G.mode === 'police') && typeof RIDE !== 'undefined' && RIDE.navigation && typeof remainingNavigationPoints === 'function') {
    const pts = remainingNavigationPoints();
    if (pts && pts.length > 1) {
      ctx.strokeStyle = '#00838f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(tx(p.x), tz(p.z)) : ctx.moveTo(tx(p.x), tz(p.z)));
      ctx.stroke();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }

  // Target Destination Pin
  let tgt = null, tgtCol = '#ffc107';
  if (G.mode === 'police' && typeof policeTarget === 'function') { tgt = policeTarget(); tgtCol = '#29b6f6'; }
  else if (M.phase === 'toPick' && typeof pickupMarker !== 'undefined') { tgt = pickupMarker.position; tgtCol = '#ffc107'; }
  else if ((M.phase === 'toDest' || M.phase === 'race') && typeof destMarker !== 'undefined') { tgt = destMarker.position; tgtCol = '#00e676'; }

  if (tgt) {
    const px = tx(tgt.x), pz = tz(tgt.z);
    ctx.fillStyle = tgtCol;
    ctx.beginPath();
    ctx.arc(px, pz, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Navigational Chevron (Player Car Arrow)
  ctx.save();
  ctx.fillStyle = '#00b0ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 4);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // end map transform

  // 3. Top Header Bar
  ctx.fillStyle = '#090d13';
  ctx.fillRect(0, 0, W, 36);
  ctx.strokeStyle = '#222f3d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(W, 36);
  ctx.stroke();

  // GPS indicator
  ctx.fillStyle = '#00e676';
  ctx.beginPath();
  ctx.arc(22, 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#8ea1b4';
  ctx.textAlign = 'left';
  ctx.fillText('GPS HD', 32, 22);

  // Street Name (Center)
  const currentRoad = (typeof nearestAssyutRoad === 'function' && typeof car !== 'undefined') ? nearestAssyutRoad({ x: car.x, z: car.z }) : null;
  const streetName = currentRoad?.name || 'وسط أسيوط · شارع رئيسي';
  ctx.fillStyle = '#1e2936';
  ctx.fillRect(W / 2 - 120, 6, 240, 24);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(streetName, W / 2, 23);

  // Speed and Gear (Right)
  const spd = Math.round(Math.abs(car?.speed || 0) * 3.6);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText(spd + ' KM/H', W - 42, 23);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('[D]', W - 18, 23);

  // 4. Bottom Footer Bar
  ctx.fillStyle = '#090d13';
  ctx.fillRect(0, H - 28, W, 28);
  ctx.strokeStyle = '#222f3d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 28);
  ctx.lineTo(W, H - 28);
  ctx.stroke();

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#78909c';
  ctx.textAlign = 'center';
  const modeText = G?.mode === 'police' ? 'دورية شرطة أسيوط · اتصال لاسلكي' : (M?.phase === 'toPick' ? 'متجه لاستلام العميل · ملاحة ذكية' : (M?.phase === 'toDest' ? 'توصيل الراكب للوجهة' : 'أوبر أسيوط · جاهز للطلبات'));
  ctx.fillText(modeText, W / 2, H - 10);

  ctx.restore();
}

function updateCockpitDynamics(dt) {
  if (typeof taxiRig === 'undefined' || !taxiRig?.cockpit) return;
  const c = taxiRig.cockpit;
  if (c.wheelPivot) {
    // Use the actual road-wheel angle, with a realistic steering-wheel
    // ratio.  Rotating the hands and wheel by the raw keyboard input made
    // the arms snap through an implausibly large angle.
    const targetAngle = clamp(-(car.wheelAngle || 0) * 1.22, -0.92, 0.92);
    c.currentSteer = (c.currentSteer || 0) + (targetAngle - (c.currentSteer || 0)) * (1 - Math.exp(-dt * 12));
    c.wheelPivot.rotation.x = c.currentSteer;
  }
  if (c.steerRoot) {
    const bump = (car.vy || 0) * 0.006;
    const lat = typeof clamp === 'function' ? clamp((car.lateralAccel || 0) * 0.0015, -0.006, 0.006) : 0;
    c.steerRoot.position.y = (c.baseWheelY !== undefined ? c.baseWheelY : c.steerRoot.position.y) + bump;
    c.steerRoot.position.z = (c.baseWheelZ !== undefined ? c.baseWheelZ : c.steerRoot.position.z) + lat;
  }
  if (c.screenTex && c.screenCtx && (typeof G === 'undefined' || G.camMode === 2)) {
    c.screenTimer = (c.screenTimer || 0) + dt;
    if (c.screenTimer > 0.08) {
      c.screenTimer = 0;
      drawCockpitScreen(c.screenCtx);
      c.screenTex.needsUpdate = true;
    }
  }
}
