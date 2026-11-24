/* =====================================================================
   الفيزياء
   ===================================================================== */
function physics(dt) {
  const gas = keys.KeyW || keys.ArrowUp || touch.gas;
  const brk = keys.KeyS || keys.ArrowDown || touch.brk;
  const left = keys.KeyA || keys.ArrowLeft || touch.left;
  const right = keys.KeyD || keys.ArrowRight || touch.right;
  const hb = keys.Space || touch.hb;

  const prevX=car.x,prevZ=car.z;
  advanceVehicle(car,{gas,brake:brk,left,right,handbrake:hb},vehicleParameters(),dt);

  const ext=vehicleParameters();
  const b=ASSYUT.bounds;
  if(car.z>b.z1-ext.halfWidth){car.z=b.z1-ext.halfWidth;staticContact({nx:0,nz:-1,depth:0});}
  if(car.z<b.z0+ext.halfWidth){car.z=b.z0+ext.halfWidth;staticContact({nx:0,nz:1,depth:0});}
  if(car.x>b.x1-ext.halfLength){car.x=b.x1-ext.halfLength;staticContact({nx:-1,nz:0,depth:0});}
  if(car.x<b.x0+ext.halfLength){car.x=b.x0+ext.halfLength;staticContact({nx:1,nz:0,depth:0});}

  resolveBuildings();
  resolveCurbs(prevX, prevZ);
  resolveMedian(prevZ);
  resolveTrees();resolveInfrastructureRails();
  checkTrafficLights(prevX, prevZ, dt);
  checkCitySpeedLimit(dt);
  updateSuspension(dt);

  car.shake = Math.max(0, car.shake - dt * 2.2);
  car.hitCd = Math.max(0, car.hitCd - dt);
  car.redFineCd = Math.max(0, car.redFineCd - dt);
  car.redBonusCd = Math.max(0, (car.redBonusCd || 0) - dt);
  car.speedWarnCd = Math.max(0, (car.speedWarnCd || 0) - dt);
}

/* ------------------------- تصادم المباني ------------------------- */
const SOLID = { cell: 40, map: new Map(), built: false };
function buildSolidGrid() {
  SOLID.map.clear();
  for (const b of MAP.buildings) {
    const i0 = Math.floor(b.x0 / SOLID.cell), i1 = Math.floor(b.x1 / SOLID.cell);
    const j0 = Math.floor(b.z0 / SOLID.cell), j1 = Math.floor(b.z1 / SOLID.cell);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = i + ',' + j;
        let arr = SOLID.map.get(k);
        if (!arr) SOLID.map.set(k, arr = []);
        arr.push(b);
      }
    }
  }
  SOLID.built = true;
}

function resolveBuildings() {
  if(!SOLID.built)buildSolidGrid();
  const ci=Math.floor(car.x/SOLID.cell),cj=Math.floor(car.z/SOLID.cell),seen=new Set();
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++) {
    const list=SOLID.map.get((ci+di)+','+(cj+dj));if(!list)continue;
    for(const b of list){if(seen.has(b))continue;seen.add(b);
      const hit=b.oriented?obbContact(playerBounds(),b.oriented):contactAabb(b.x0,b.x1,b.z0,b.z1);
      if(hit)recordImpact(staticContact(hit),'خبطت في مبنى — خفّف السرعة');
    }
  }
}

/* ------------------------- المطبات ------------------------- */
const BUMPS = [];
const BUMP_MAT = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: .85, metalness: .1 });
const BUMP_STRIPE = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: .6, metalness: .15 });

function addBump(cx, cz, hw, hl, axisOrHeading, h = .14, yBase = null) {
  const isHeading = typeof axisOrHeading === 'number';
  const heading = isHeading ? axisOrHeading : (axisOrHeading === 'x' ? 0 : Math.PI / 2);
  const bump = { cx, cz, hw, hl, heading, axis: isHeading ? undefined : axisOrHeading, h };
  BUMPS.push(bump);

  if (typeof scene === 'undefined') return;
  const y = yBase !== null ? yBase : (typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(cx, cz) : 0);

  const group = new THREE.Group();
  group.position.set(cx, y + .012, cz);
  group.rotation.y = heading;

  // جسد المطب المحدب الممتد عبر عرض الشارع
  const geo = new THREE.CylinderGeometry(hl, hl, hw * 2, 16, 1, false, 0, Math.PI);
  geo.rotateZ(Math.PI / 2);
  geo.rotateY(Math.PI / 2);
  geo.scale(1, h / hl, 1);
  const baseMesh = new THREE.Mesh(geo, BUMP_MAT);
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // خطوط تحذيرية صفراء متناوبة على المطب (نمط أصفر وأسود)
  const stripeSegments = Math.max(3, Math.floor((hw * 2) / 1.5));
  const segW = (hw * 2) / stripeSegments;
  for (let s = 0; s < stripeSegments; s += 2) {
    const zLocal = -hw + (s + 0.5) * segW;
    const sGeo = new THREE.CylinderGeometry(hl * 1.01, hl * 1.01, segW * 0.85, 12, 1, false, 0, Math.PI);
    sGeo.rotateZ(Math.PI / 2);
    sGeo.rotateY(Math.PI / 2);
    sGeo.scale(1, (h * 1.02) / (hl * 1.01), 1);
    const stripeMesh = new THREE.Mesh(sGeo, BUMP_STRIPE);
    stripeMesh.position.set(0, 0.002, zLocal);
    stripeMesh.receiveShadow = true;
    group.add(stripeMesh);
  }

  if (typeof REAL_CITY !== 'undefined' && REAL_CITY.group) REAL_CITY.group.add(group);
  else scene.add(group);
}

function bumpHeightAt(x, z) {
  let maxH = 0;
  for (let i = 0; i < BUMPS.length; i++) {
    const b = BUMPS[i];
    const dx = x - b.cx, dz = z - b.cz;
    let dAlong, dAcross;
    if (b.heading !== undefined) {
      const fx = Math.cos(b.heading), fz = -Math.sin(b.heading);
      dAlong = dx * fx + dz * fz;
      dAcross = -dx * fz + dz * fx;
    } else if (b.axis === 'x') {
      dAlong = dx; dAcross = dz;
    } else {
      dAlong = dz; dAcross = dx;
    }
    if (Math.abs(dAcross) > b.hw || Math.abs(dAlong) > b.hl) continue;
    const v = b.h * Math.cos((dAlong / b.hl) * (Math.PI * 0.5));
    if (v > maxH) maxH = v;
  }
  return maxH;
}

function initAssyutSpeedBumps() {
  if (typeof ASSYUT === 'undefined' || !ASSYUT.junctions || !ASSYUT.junctions.length) return;
  const bumpJunctions = [];
  const candidates = ASSYUT.junctions.slice().sort((a,b)=>Math.hypot(a.x-ASSYUT.start.x,a.z-ASSYUT.start.z)-Math.hypot(b.x-ASSYUT.start.x,b.z-ASSYUT.start.z));
  for (const j of candidates) {
    if (bumpJunctions.some(p => Math.hypot(p.x - j.x, p.z - j.z) < 95)) continue;
    bumpJunctions.push(j);
    if (bumpJunctions.length >= 30) break;
  }
  for (const j of bumpJunctions) {
    const incoming = ASSYUT.edges.filter(e => e.b === j.node), used = [];
    for (const edge of incoming) {
      const f = typeof edgeFrame === 'function' ? edgeFrame(edge) : null;
      if (!f) continue;
      const road = ASSYUT.roads[edge.road], heading = Math.atan2(-f.fz, f.fx);
      if (used.some(h => Math.abs(Math.atan2(Math.sin(h - heading), Math.cos(h - heading))) < 0.45)) continue;
      used.push(heading);
      const armW = Math.max(10, ...j.arms.map(a => a.width / 2 + 4));
      const bx = j.x - f.fx * (armW + 18), bz = j.z - f.fz * (armW + 18);
      if (typeof onDrivingRoad === 'function' && !onDrivingRoad(bx, bz, 0.4)) continue;
      if (BUMPS.some(b => Math.hypot(b.cx - bx, b.cz - bz) < 15)) continue;
      addBump(bx, bz, Math.min(road.width * 0.42, 9), 0.75, heading, 0.14);
    }
  }
}
initAssyutSpeedBumps();

/* ------------------------- حدود الأرصفة ------------------------- */
const CURB_LINES=CURB_SEGMENTS;

function curbHit(soft) {
  if (car.curbCd > 0) return;
  car.curbCd = .45;
  if (soft) sfxThud(); else sfxCrash();
}

function resolveCurbs() {} // Kerbs are tyre contact surfaces, not invisible walls.
const MEDIAN_HALF=.98;
function resolveMedian() {}
function roadHeightAt(x,z){
 if(typeof ASSYUT!=='undefined')return sampledDriveHeight(x,z,car.y,car.surfaceRoad) + bumpHeightAt(x,z);
 let h=bumpHeightAt(x,z);
 for(const t of ROAD_RAMPS)if(Math.abs(z-t.z)<t.width/2)h=Math.max(h,t.height*clamp((t.half-Math.abs(x-t.x))/1.8,0,1));
 for(const s of WALK_SURFACES){const edge=Math.min(x-s.x0,s.x1-x,z-s.z0,s.z1-z);if(edge>-.22)h=Math.max(h,s.height*clamp((edge+.22)/.44,0,1));}
 return h;
}
function resolveTrees() {
  const bounds=playerBounds(),fx=Math.cos(car.heading),fz=-Math.sin(car.heading),rx=-fz,rz=fx;
  for(const t of TREES){
    const dx=t.x-car.x,dz=t.z-car.z;if(dx*dx+dz*dz>16)continue;
    const lx=dx*fx+dz*fz,lz=dx*rx+dz*rz;
    const px=clamp(lx,-bounds.hl,bounds.hl),pz=clamp(lz,-bounds.hw,bounds.hw);
    let nx=px-lx,nz=pz-lz,d=Math.hypot(nx,nz),insideDepth=0;
    if(d>=t.r)continue;
    if(d<1e-6){const ax=bounds.hl-Math.abs(lx),az=bounds.hw-Math.abs(lz);if(ax<az){nx=lx>0?-1:1;nz=0;d=1;insideDepth=t.r+ax;}else{nx=0;nz=lz>0?-1:1;d=1;insideDepth=t.r+az;}}
    const hit={nx:(nx*fx+nz*rx)/d,nz:(nx*fz+nz*rz)/d,depth:insideDepth||Math.max(.01,t.r-d)};
    recordImpact(staticContact(hit),'خبطت في نخلة — خفّف السرعة');
  }
}

/* ------------------------- إشارات المرور ------------------------- */
function checkTrafficLights(prevX,prevZ,dt){
 if(G.mode==='police'&&POLICE.siren)return;
 if(TRAFFIC_LIGHTS.some(t=>t.approaches))return checkAssyutLights(prevX,prevZ);
 for(const tl of TRAFFIC_LIGHTS)for(const axis of ['x','z']){
  const forward=axis==='x'?Math.cos(car.heading):-Math.sin(car.heading);if(Math.abs(forward)<.70||car.speed<1.2)continue;
  const dir=forward>0?1:-1,across=axis==='x'?Math.abs(car.z-tl.z):Math.abs(car.x-tl.x),half=axis==='x'?tl.halfZ:tl.halfX;if(across>half-.7)continue;
  const stop=(axis==='x'?tl.x:tl.z)-dir*((axis==='x'?tl.halfX:tl.halfZ)+2.5);
  const extent=Math.abs(forward)*vehicleParameters().halfLength+(axis==='x'?Math.abs(Math.sin(car.heading)):Math.abs(Math.cos(car.heading)))*vehicleParameters().halfWidth;
  const before=(axis==='x'?prevX:prevZ)+dir*extent,after=(axis==='x'?car.x:car.z)+dir*extent;
  const state=axis==='x'?tl.xState:tl.zState;
  if((before-stop)*dir<0&&(after-stop)*dir>=0&&state==='red'&&car.redFineCd<=0){
   car.redFineCd=6;G.money=Math.max(0,G.money-40);saveProgress();G.combo=0;if(rideBusy())M.hits++;sfxFine();flashScreen();floatText('−40 ج.م · إشارة حمراء','#ff685d');setObjective('تجاوزت خط التوقف والإشارة حمراء · مخالفة 40 ج.م',3500);
  }
 }
}

/* ------------------------- تعليق العربية ------------------------- */
function updateSuspension(dt) {
  selectDrivingSurface();
  const cs = carStats();
  const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
  const wheelbase=vehicleParameters().wheelbase,track=1.48,rx=-fz,rz=fx;
  const samples=[];
  for(const axle of [1,-1])for(const side of [-1,1])samples.push(roadHeightAt(car.x+fx*axle*wheelbase/2+rx*side*track/2,car.z+fz*axle*wheelbase/2+rz*side*track/2));
  car.wheelGround=samples;
  const hf=(samples[0]+samples[1])/2,hr=(samples[2]+samples[3])/2;
  const target=(hf+hr)/2;
  const omega=12/Math.sqrt(Math.max(.55,cs.bumpDamp));
  car.vy+=((target-car.y)*omega*omega-2*.88*omega*car.vy)*dt;
  car.y=clamp(car.y+car.vy*dt,-4,8);
  if(car.y<target-.035){if(target-car.y<.45){car.y=target-.035;car.vy=Math.max(0,car.vy);}}
  // Weight transfer simulation: longitudinal dive/squat and lateral centrifugal roll
  const def = CARS[G.carIdx] || CARS[0];
  const isHeavy = def.body === 'micro' || (def.mass && def.mass > 1800);
  const diveFactor = (car.longAccel < 0) ? (isHeavy ? 0.0036 : 0.0028) : (isHeavy ? 0.0020 : 0.0016);
  const accelPitch = clamp((car.longAccel || 0) * diveFactor, -0.045, 0.030);
  const slopePitch = clamp(Math.atan2(hf - hr, wheelbase), -0.10, 0.10);
  const pitchTarget = clamp(slopePitch + accelPitch, -0.065, 0.065);

  const slopeRoll = -clamp(Math.atan2((samples[1] + samples[3] - samples[0] - samples[2]) / 2, track), -0.10, 0.10);
  const rollFactor = isHeavy ? 0.0055 : (def.body === 'sport' ? 0.0030 : 0.0042);
  const centrifugalRoll = clamp((car.lateralAccel || 0) * rollFactor, -0.045, 0.045);
  const rollTarget = clamp(slopeRoll + centrifugalRoll, -0.065, 0.065);

  // Bump harmonic oscillation
  car.suspensionJolt = (car.suspensionJolt || 0);
  car.suspensionJoltVel = (car.suspensionJoltVel || 0);
  car.suspensionJoltVel += (-car.suspensionJolt * 140 - car.suspensionJoltVel * 14) * dt;
  car.suspensionJolt += car.suspensionJoltVel * dt;

  // 2nd-order damped harmonic spring-damper suspension for Pitch & Roll
  car.pitchVel = car.pitchVel || 0;
  car.rollVel = car.rollVel || 0;

  const omegaP = 14.0, zetaP = 0.88;
  const pitchAcc = omegaP * omegaP * (pitchTarget + car.suspensionJolt * 0.12 - (car.pitch || 0)) - 2 * zetaP * omegaP * car.pitchVel;
  car.pitchVel += pitchAcc * dt;
  car.pitch = clamp((car.pitch || 0) + car.pitchVel * dt, -0.075, 0.075);

  const omegaR = 13.0, zetaR = 0.85;
  const rollAcc = omegaR * omegaR * (rollTarget - (car.roll || 0)) - 2 * zetaR * omegaR * car.rollVel;
  car.rollVel += rollAcc * dt;
  car.roll = clamp((car.roll || 0) + car.rollVel * dt, -0.075, 0.075);
  if(typeof updateVehicleSparks==='function')updateVehicleSparks(dt);
  if(typeof updateBrakeEffects==='function')updateBrakeEffects(dt);

  const bumpH = bumpHeightAt(car.x, car.z);
  if (bumpH > 0.02) {
    const curSpeed = Math.abs(car.speed);
    const safeSpeed = 5.5; // حوالي 20 كم/س للعبور الآمن فوق المطب
    if (curSpeed > safeSpeed) {
      const excess = curSpeed - safeSpeed;
      // فرملة وإبطاء فيزيائي حقيقي للسيارة عند أكل المطب بسرعة
      const decel = Math.min(excess, (22 + excess * 2.2) * dt * (bumpH / 0.12));
      const newSpeed = Math.max(safeSpeed * 0.65, curSpeed - decel);
      const ratio = newSpeed / (curSpeed || 1);
      car.vel.x *= ratio;
      car.vel.y *= ratio;
      car.speed = Math.sign(car.speed) * newSpeed;

      // A speed bump compresses the suspension; it should not launch the
      // car like a ramp.  Scale the impulse by the actual bump height and
      // cap it to a small, passenger-car-sized hop.
      const bumpImpulse=clamp((bumpH/.14)*excess*.045,0,.42);
      car.vy += bumpImpulse;
      car.vy=clamp(car.vy,-2.8,2.0);
      car.suspensionJoltVel = clamp(car.suspensionJoltVel + excess * 0.16 * (bumpH / .14), -1.8, 1.8);
      const severity = clamp(excess / 12, 0.25, 1.0);
      car.shake = Math.max(car.shake, severity * 0.65);

      if ((car.bumpCd || 0) <= 0) {
        car.bumpCd = 0.55;
        sfxBump();
        floatText('⚠️ مطب صناعي — تم تخفيض السرعة', '#f2c21a');
        if (severity > 0.45) {
          flashScreen();
          if (rideBusy() && severity > 0.6) {
            M.hits = (M.hits || 0) + 1;
            setObjective('أكلت المطب بسرعة عالية! الراكب انزعج وتأثر التقييم', 3000);
          } else {
            setObjective('مطب صناعي — خفّف السرعة عند التقاطعات', 2500);
          }
        }
      }
    }
  }

  if(target-car.y>.08&&!INFRA.profiles.has(car.surfaceRoad)&&car.bumpCd<=0&&Math.abs(car.speed)>6){
    car.bumpCd=.55;const severity=clamp((Math.abs(car.speed)-5)/22,0,1);
    car.shake=Math.max(car.shake,severity*.45*cs.bumpDamp);sfxBump();
    if(severity>.5)setObjective('مطب — خفّف السرعة',1500);
  }
  car.bumpCd = Math.max(0, car.bumpCd - dt);
  car.curbCd = Math.max(0, car.curbCd - dt);
  car.curbBlock = Math.max(0, car.curbBlock - dt);
}

function checkCitySpeedLimit(dt) {
  // تم إلغاء حد السرعة — السرعة غير محدودة بالكامل في أي مكان على الخريطة
  return;
}

function updateTaxiVisual(dt) {
  updateVehicleSignals(dt);updatePoliceLights(performance.now()*.001);
  if(typeof updateVisualOverhaulEffects==='function')updateVisualOverhaulEffects(dt);
  taxi.position.set(car.x, car.y, car.z);
  taxi.rotation.y = car.heading;
  if (taxiBody) {
    taxiBody.rotation.z = car.pitch;
    taxiBody.rotation.x = car.roll;
  }
  if (taxiRig.passengerSeat) {
    const riding = M.phase === 'toDest';
    taxiRig.passengerSeat.visible = riding;
    if (riding && M.pType && taxiRig.passengerSeat.userData.shirtMat) {
      taxiRig.passengerSeat.userData.shirtMat.color.setHex(M.pType.shirt);
    }
  }
  if(taxiRig.cockpit){
   const c=taxiRig.cockpit,q=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0);
   for(const [name,angle] of [['SteeringWheelRoot',(car.wheelAngle||0)*8],['SpeedNeedle',clamp(Math.abs(car.speed)*3.6/180,0,1)*Math.PI*1.5],['RPMNeedle',(.13+Math.min(.65,Math.abs(car.speed)/65))*Math.PI*1.5]]){const n=c[name];if(n)n.quaternion.copy(n.userData.rest).multiply(q.setFromAxisAngle(axis,angle));}
  }
  const wr = taxiRig.wheelR || .34;
  for (let i = 0; i < taxiWheels.length; i++) {
    const w = taxiWheels[i];
    if(w.userData.restY!==undefined){
      const suspensionTravel=clamp((car.wheelGround?.[i]||0)-car.y,-.045,.045);
      w.position.y=w.userData.restY+suspensionTravel;
    }
    // Roll the wheel mesh inside its steering pivot, so steering never tilts its axle.
    if(w.children[0])w.children[0].rotateZ(-car.speed*dt/wr);
    if (i < 2) w.rotation.y = car.wheelAngle || 0;
  }
}

/* =====================================================================
   الترافيك والمشاة
   ===================================================================== */
let flashTimer = 0;
function flashScreen() {
  const el = $('flash');
  el.style.opacity = '1';
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 150);
}

function honkReact() {
  const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
  let replied = false;
  for (const t of traffic) {
    if (t.kind === 'tram') continue;
    const dx = t.mesh.position.x - car.x;
    const dz = t.mesh.position.z - car.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 900 && (dx * fx + dz * fz) > 0) {
      t.honkBoost = 2.6;
      if (!replied) {
        replied = true;
        const delay = 140 + Math.random() * 120;
        const tx = t.mesh.position.x, tz = t.mesh.position.z, kind = t.kind || 'modern';
        setTimeout(() => {
          if (typeof sfxTrafficHonk === 'function') sfxTrafficHonk(kind, tx, tz);
          else if (typeof sfxTrafficBeep === 'function') sfxTrafficBeep();
        }, delay);
      }
    }
  }
}

function updateTraffic(dt) {
  if(typeof ASSYUT!=='undefined')return updateAssyutTraffic(dt);
  for (let i = 0; i < traffic.length; i++) {
    const t = traffic[i];
    t.honkBoost = Math.max(0, (t.honkBoost || 0) - dt);
    let targetSpd = t.baseSpeed * (t.honkBoost > 0 ? 1.45 : 1.0);

    // التوقف عند الإشارة الحمرا
    if (typeof TRAFFIC_LIGHTS !== 'undefined') {
      const px = t.mesh.position.x, pz = t.mesh.position.z;
      for (const tl of TRAFFIC_LIGHTS) {
        if (t.axis === 'x' && Math.abs(pz - tl.z) < tl.halfZ) {
          if (tl.xState !== 'green') {
            const stopPos = tl.x - t.dir * (tl.halfX + t.hl + 2.5);
            const distAhead = (stopPos - px) * t.dir;
            if(distAhead>0&&distAhead<65)targetSpd=Math.min(targetSpd,Math.sqrt(2*3.5*Math.max(0,distAhead-1.5)));
          }
        } else if (t.axis === 'z' && Math.abs(px - tl.x) < tl.halfX) {
          if (tl.zState !== 'green') {
            const stopPos = tl.z - t.dir * (tl.halfZ + t.hl + 2.5);
            const distAhead = (stopPos - pz) * t.dir;
            if(distAhead>0&&distAhead<65)targetSpd=Math.min(targetSpd,Math.sqrt(2*3.5*Math.max(0,distAhead-1.5)));
          }
        }
      }
    }

    // مسافة أمان من العربية اللي قدامها
    if (targetSpd > 0) {
      for (let j = 0; j < traffic.length; j++) {
        if (i === j) continue;
        const o = traffic[j];
        if (o.axis !== t.axis || o.c !== t.c || o.dir !== t.dir || Math.abs(o.lane - t.lane) > 1.2) continue;
        const posT = t.axis === 'x' ? t.mesh.position.x : t.mesh.position.z;
        const posO = o.axis === 'x' ? o.mesh.position.x : o.mesh.position.z;
        const gap = (posO - posT) * t.dir - (t.hl + o.hl);
        if(gap>0&&gap<55)targetSpd=Math.min(targetSpd,Math.max(0,(gap-3)*.8));
      }
    }

    const trafficPos=t.axis==='x'?t.mesh.position.x:t.mesh.position.z;
    const playerPos=t.axis==='x'?car.x:car.z;
    const acrossPlayer=t.axis==='x'?car.z-t.mesh.position.z:car.x-t.mesh.position.x;
    const playerGap=(playerPos-trafficPos)*t.dir-t.hl-vehicleParameters().halfLength;
    if(Math.abs(acrossPlayer)<t.hw+1.2&&playerGap>0&&playerGap<Math.max(12,t.speed*1.7))
      targetSpd=Math.min(targetSpd,Math.max(0,(playerGap-3)*.65));
    const trafficAccel=t.kind==='bus'?1.3:2.4;
    t.speed+=clamp(targetSpd-t.speed,-5.5*dt,trafficAccel*dt);

    if (t.axis === 'x') {
      t.mesh.position.x += t.dir * t.speed * dt;
      const dx = t.mesh.position.x - car.x;
      if (dx > 460) t.mesh.position.x -= 920;
      if (dx < -460) t.mesh.position.x += 920;
    } else {
      t.mesh.position.z += t.dir * t.speed * dt;
      if (t.mesh.position.z > CITY_Z1 + 30) t.mesh.position.z = 24;
      if (t.mesh.position.z < 16) t.mesh.position.z = CITY_Z1 + 24;
    }

    const tx = t.mesh.position.x, tz = t.mesh.position.z, ty = t.mesh.position.y || 0;
    if (Math.abs(car.y - ty) <= 1.9 && Math.abs(tx - car.x) < t.hl + 4 && Math.abs(tz - car.z) < t.hl + 4) {
      const hit = obbContact(playerBounds(), { x: tx, z: tz, heading: t.mesh.rotation.y, hl: t.hl, hw: t.hw });
      if (hit) {
        car.x += hit.nx * (hit.depth + 0.003);
        car.z += hit.nz * (hit.depth + 0.003);
        const tfx = Math.cos(t.mesh.rotation.y), tfz = -Math.sin(t.mesh.rotation.y);
        const closingX = car.vel.x - tfx * t.speed;
        const closingZ = car.vel.y - tfz * t.speed;
        const closing = closingX * hit.nx + closingZ * hit.nz;

        if (closing < 0) {
          const mass = vehicleParameters().mass;
          const otherMass = t.kind === 'bus' ? 6200 : t.kind === 'micro' ? 2200 : 1350;
          const restitution = 0.35;
          const impulse = -(1 + restitution) * closing / (1 / mass + 1 / otherMass);

          // 1. ارتداد ودفع سيارة اللاعب مع عزم الدوران
          car.vel.x += hit.nx * (impulse / mass);
          car.vel.y += hit.nz * (impulse / mass);

          const contactX = (car.x + tx) / 2, contactZ = (car.z + tz) / 2;
          const pArmX = contactX - car.x, pArmZ = contactZ - car.z;
          const pTorque = (pArmX * hit.nz - pArmZ * hit.nx) * (impulse / mass);
          car.yawRate = clamp((car.yawRate || 0) + pTorque * 0.24, -6.5, 6.5);
          car.roll = clamp((car.roll || 0) - (hit.nx * pArmZ - hit.nz * pArmX) * 0.045, -0.38, 0.38);

          const tImpulse = impulse / otherMass;
          const align = hit.nx * tfx + hit.nz * tfz;
          t.speed = Math.max(0, t.speed - align * tImpulse * 0.85);

          syncCarSpeed();
          recordImpact(-closing, 'خبطة! حافظ على مسافة الأمان');
          if (typeof spawnVehicleSparks === 'function') {
            spawnVehicleSparks(contactX, (car.y + ty) / 2 + 0.35, contactZ, closingX, closingZ, 8);
          }
          if (typeof sfxCrash === 'function') sfxCrash();
        }
      }
    }
  }
}

function updatePeds(dt) {
  if(typeof ASSYUT!=='undefined')return updateAssyutPeds(dt);
  const now = performance.now() * .001;
  for (const p of peds) {
    p.mesh.position.x += p.speed * dt;
    if (Math.abs(p.mesh.position.x - car.x) > 300) {
      p.mesh.position.x = car.x + (p.speed > 0 ? -290 : 290);
    }
    // تفادي المشاة لو طلعت على الرصيف
    const dx = p.mesh.position.x - car.x;
    const dz = p.mesh.position.z - car.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 2.25 && d2 > .001) {
      const d = Math.sqrt(d2);
      p.mesh.position.x += (dx / d) * (1.6 - d);
      p.mesh.position.z = clamp(p.mesh.position.z + (dz / d) * (1.6 - d), -23, 23);
      if (car.hitCd <= 0 && Math.abs(car.speed) > 4) {
        car.hitCd = .8;
        sfxThud();
        setObjective('حاسب المشاة على الرصيف! 🚶', 1800);
      }
    }
    p.phase += dt * Math.abs(p.speed) * 7;
    p.mesh.rotation.y = p.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.mesh.position.y = .34 + Math.abs(Math.sin(p.phase)) * .018;
    if(d2<65*65)animatePerson(p.mesh, p.phase);
  }
}
