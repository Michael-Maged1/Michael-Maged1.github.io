/* Vehicle simulation: metres, seconds, radians. Kept independent of rendering for deterministic checks. */
const SIM_STEP = 1 / 120;
const PHYSICS_GRAVITY = 9.81;
function approachZero(value, amount) { return Math.sign(value) * Math.max(0, Math.abs(value) - amount); }
function vehicleParameters() {
 const stats=carStats(),definition=CARS[G.carIdx]||CARS[0],kind=definition.body;
 const onRoad=typeof onDrivingRoad==='function'?onDrivingRoad(car.x,car.z,0.5):true;
 return {...stats, rain:G.weather==='rain', offroad:!onRoad, slopeSin:car.slopeSin||0, airborne:!!car.airborne,
  wheelbase:definition.wheelbase||(kind==='micro'?2.95:2.65),
  halfLength:definition.length?definition.length/2:definition.id==='sunny'?2.2125:kind==='micro'?2.4:2.1, halfWidth:definition.halfWidth||(kind==='micro'?.97:.91),
  mass:definition.mass||(kind==='micro'?2100:kind==='sedan'?1150:1450)};
}
function advanceVehicle(s,input,p,dt) {
 const oldSpeed=s.speed,wet=p.rain?.70:1,surfaceGrip=p.offroad?.78:1,contactGrip=p.airborne?.35:1;
 const gripBonus=Math.min(1.16,Math.max(.8,p.grip/8.5));
 const traction=PHYSICS_GRAVITY*.94*wet*surfaceGrip*contactGrip*gripBonus;
 let v=s.vel.x*Math.cos(s.heading)-s.vel.y*Math.sin(s.heading);
 const previousSide=s.vel.x*Math.sin(s.heading)+s.vel.y*Math.cos(s.heading);
 let acceleration=0;
 s.reverseHold=s.reverseHold||0;
 s.throttle=s.throttle||0;
 s.brakePedal=s.brakePedal||0;
 const targetThrottle=(input.gas&&!input.brake)?1:0;
 s.throttle+=(targetThrottle-s.throttle)*(1-Math.exp(-dt*(targetThrottle?8.5:14)));
 const targetBrake=input.brake?1:0;
 s.brakePedal+=(targetBrake-s.brakePedal)*(1-Math.exp(-dt*(targetBrake?16:20)));

 const effectiveTopSpeed = p.topSpeed || 36;
 // Give the brake pedal enough authority at city speeds without allowing
 // an arcade-style instant stop.  The old cap made the heavier cars feel
 // as if the brakes were worn out, especially in the rain.
 const maxBrakeGrip = traction * .95;
 if(input.gas&&!input.brake) {
  s.reverseHold=0;
  if(v<-.15)v=approachZero(v,Math.min(p.brake*.42,maxBrakeGrip)*dt);
  else {
   const ratio=Math.min(1,Math.max(0,v)/effectiveTopSpeed);
   const dragAtTop=.18+.0028*effectiveTopSpeed*effectiveTopSpeed;
   const fullAccel=Math.min(traction*.85,p.accel*.35*(1-ratio*ratio)+dragAtTop*ratio*ratio);
   acceleration=fullAccel*(.35+.65*s.throttle);
  }
 } else if(input.brake) {
  if(v>.04||input.gas) {
   const brakeMult = Math.min(p.brake*.38*(.58+.42*s.brakePedal), maxBrakeGrip);
   v=approachZero(v,brakeMult*dt);
   s.reverseHold=0;
  }
  else {s.reverseHold+=dt;if(s.reverseHold>.32)acceleration=-2.6*Math.max(0,1-Math.abs(v)/6);else v=0;}
 } else s.reverseHold=0;
 v+=acceleration*dt;
 // جاذبية المنحدرات (الكباري والأنفاق) ومقاومة الهواء والأسفلت
 const slopeGravity=PHYSICS_GRAVITY*(p.slopeSin||0);
 v-=slopeGravity*dt;
 const rollingBase=.18+(p.offroad?.42:0);
 const resistance=rollingBase+.0028*v*v+(!input.gas&&!input.brake?.30:0);
 v=approachZero(v,resistance*dt);
 if(input.handbrake)v=approachZero(v,(p.rain?3.8:5.2)*dt*(p.airborne?.25:1));
 v=Math.max(-8,Math.min(effectiveTopSpeed,v));
 if(Math.abs(v)<.025&&!input.gas&&!input.brake&&Math.abs(p.slopeSin||0)<.02)v=0;
 const steerTarget=(input.left?1:0)-(input.right?1:0);
 const steerRate=(steerTarget===0)?(18+Math.abs(v)*.32):(steerTarget*s.steer<0?24:18);
 s.steer+=(steerTarget-s.steer)*(1-Math.exp(-dt*steerRate));
 const speedSteerDamp=1/(1+Math.max(0,Math.abs(v)-18)*.012);
 const angleLimit=Math.min(.68,Math.atan(traction*1.65*p.wheelbase/(v*v*.62+4))*1.24)*speedSteerDamp;
 const steeringGain=Math.max(.85,Math.min(1.2,(p.steer||2)/2));
 s.wheelAngle=s.steer*angleLimit*steeringGain;
 let desiredYaw=v/p.wheelbase*Math.tan(s.wheelAngle);
 const yawLimit=traction*1.11/Math.max(2,Math.abs(v));
 desiredYaw=Math.max(-yawLimit,Math.min(yawLimit,desiredYaw));
 if(input.handbrake&&Math.abs(v)>6)desiredYaw*=1.18;
 s.yawRate=(s.yawRate||0)+(desiredYaw-(s.yawRate||0))*(1-Math.exp(-dt*(input.handbrake?4.5:18)));
 if(Math.abs(v)<.03)s.yawRate=0;
 s.heading+=s.yawRate*dt;
 s.heading=Math.atan2(Math.sin(s.heading),Math.cos(s.heading));
 const fx=Math.cos(s.heading),fz=-Math.sin(s.heading),rx=-fz,rz=fx;
 // Preserve lateral momentum while giving modern street cornering grip under throttle (handbrake still drifts).
 let side=previousSide+v*Math.sin(s.yawRate*dt);
 const sideRate=input.handbrake?1.5:Math.max(12.5,p.grip*1.38)*wet*surfaceGrip*contactGrip;
 const baseBudget=Math.sqrt(Math.max(.35,traction*traction-Math.min(traction*.82,Math.abs(acceleration))**2));
 const lateralBudget=input.handbrake?baseBudget:Math.max(baseBudget,Math.abs(v*s.yawRate)*1.12);
 side=approachZero(side,Math.min(Math.abs(side)*sideRate,lateralBudget)*dt);
 s.vel.x=fx*v+rx*side;s.vel.y=fz*v+rz*side;
 s.speed=v;
 const rawLongAccel=(Math.abs(v)<.05&&!input.gas&&!input.brake)?0:clamp((v-oldSpeed)/Math.max(.001,dt),-16,12);
 s.longAccel=(s.longAccel||0)+(rawLongAccel-(s.longAccel||0))*(1-Math.exp(-dt*15));
 s.lateralAccel=s.yawRate*v;
 s.x+=s.vel.x*dt;s.z+=s.vel.y*dt;
}
function obbContact(a,b) {
 const af={x:Math.cos(a.heading||0),z:-Math.sin(a.heading||0)},ar={x:-af.z,z:af.x};
 const bf={x:Math.cos(b.heading||0),z:-Math.sin(b.heading||0)},br={x:-bf.z,z:bf.x};
 const dx=a.x-b.x,dz=a.z-b.z;
 let depth=Infinity,nx=0,nz=0;
 for(const axis of [af,ar,bf,br]) {
  const ra=a.hl*Math.abs(af.x*axis.x+af.z*axis.z)+a.hw*Math.abs(ar.x*axis.x+ar.z*axis.z);
  const rb=b.hl*Math.abs(bf.x*axis.x+bf.z*axis.z)+b.hw*Math.abs(br.x*axis.x+br.z*axis.z);
  const projection=dx*axis.x+dz*axis.z,overlap=ra+rb-Math.abs(projection);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;const sign=projection>=0?1:-1;nx=axis.x*sign;nz=axis.z*sign;}
 }
 return {depth,nx,nz};
}
function playerBounds() {const p=vehicleParameters();return {x:car.x,z:car.z,heading:car.heading,hl:p.halfLength,hw:p.halfWidth};}
function syncCarSpeed() {car.speed=car.vel.x*Math.cos(car.heading)-car.vel.y*Math.sin(car.heading);}
const SPARK_COUNT = 55;
let sparkMesh = null;
let sparkData = null;

function initSparkSystem() {
 if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;
 const positions = new Float32Array(SPARK_COUNT * 3);
 for (let i = 0; i < SPARK_COUNT; i++) {
  positions[i * 3 + 1] = -500;
 }
 const geo = new THREE.BufferGeometry();
 geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
 const mat = new THREE.PointsMaterial({
  color: 0xffaa33,
  size: 0.28,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending
 });
 sparkMesh = new THREE.Points(geo, mat);
 sparkMesh.frustumCulled = false;
 scene.add(sparkMesh);

 sparkData = [];
 for (let i = 0; i < SPARK_COUNT; i++) {
  sparkData.push({ x: 0, y: -500, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
 }
}

function spawnVehicleSparks(x, y, z, tangentX, tangentZ, count = 6) {
 if (!sparkMesh && typeof scene !== 'undefined') initSparkSystem();
 if (!sparkData) return;
 let spawned = 0;
 for (let i = 0; i < SPARK_COUNT && spawned < count; i++) {
  const p = sparkData[i];
  if (p.life <= 0) {
   p.x = x + (Math.random() - 0.5) * 0.25;
   p.y = y + Math.random() * 0.15;
   p.z = z + (Math.random() - 0.5) * 0.25;
   p.vx = -tangentX * 0.45 + (Math.random() - 0.5) * 4.5;
   p.vy = 1.2 + Math.random() * 3.2;
   p.vz = -tangentZ * 0.45 + (Math.random() - 0.5) * 4.5;
   p.life = 0.16 + Math.random() * 0.16;
   spawned++;
  }
 }
}

function updateVehicleSparks(dt) {
 if (!sparkMesh || !sparkData) return;
 const pos = sparkMesh.geometry.attributes.position.array;
 let active = false;
 for (let i = 0; i < SPARK_COUNT; i++) {
  const p = sparkData[i];
  if (p.life > 0) {
   p.life -= dt;
   p.vy -= 12 * dt;
   p.x += p.vx * dt;
   p.y += p.vy * dt;
   p.z += p.vz * dt;
   pos[i * 3] = p.x;
   pos[i * 3 + 1] = p.y;
   pos[i * 3 + 2] = p.z;
   active = true;
  } else {
   pos[i * 3 + 1] = -500;
  }
 }
 if (active) sparkMesh.geometry.attributes.position.needsUpdate = true;
}

function staticContact(hit) {
 if (!hit) return 0;
 car.x += hit.nx * (hit.depth + 0.002);
 car.z += hit.nz * (hit.depth + 0.002);
 const closing = car.vel.x * hit.nx + car.vel.y * hit.nz;

 const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
 const rx = -fz, rz = fx;
 const frontDot = hit.nx * fx + hit.nz * fz;
 const sideDot = hit.nx * rx + hit.nz * rz;

 const tangentX = car.vel.x - hit.nx * (car.vel.x * hit.nx + car.vel.y * hit.nz);
 const tangentZ = car.vel.y - hit.nz * (car.vel.x * hit.nx + car.vel.y * hit.nz);
 const tangentSpeed = Math.hypot(tangentX, tangentZ);

 if (closing >= 0) {
  // احتكاك حك مستمر أثناء الانزلاق بجانب مبنى أو سور (Scraping drag)
  if (tangentSpeed > 0.8) {
   const frictionDecel = Math.min(tangentSpeed * 0.5, 6.5 * SIM_STEP);
   car.vel.x -= (tangentX / tangentSpeed) * frictionDecel;
   car.vel.y -= (tangentZ / tangentSpeed) * frictionDecel;
   if (typeof sfxScrape === 'function') sfxScrape(Math.min(0.2, tangentSpeed / 15));
   spawnVehicleSparks(car.x - hit.nx * 0.9, car.y + 0.35, car.z - hit.nz * 0.9, tangentX, tangentZ, 3);
  }
  syncCarSpeed();
  return 0;
 }

 const impact = -closing;
 // ارتداد صدمة فيزيائي مرن
 const restitution = impact > 12 ? 0.06 : impact > 5 ? 0.08 : 0.10;
 car.vel.x -= closing * (1 + restitution) * hit.nx;
 car.vel.y -= closing * (1 + restitution) * hit.nz;

 // احتكاك كولوم مع الأسطح عند الصدمة
 const normalForce = Math.max(1.2, impact * 1.35 + Math.abs(car.speed) * 0.15);
 const frictionDrop = Math.min(tangentSpeed * 0.8, normalForce * 0.075);
 if (tangentSpeed > 0.1) {
  car.vel.x -= (tangentX / tangentSpeed) * frictionDrop;
  car.vel.y -= (tangentZ / tangentSpeed) * frictionDrop;
 }

 // عزم دوران للصدمات الزاوية والجانبية (Off-Center Rotational Torque)
 const angularTorque = sideDot * impact * 0.32 - frontDot * sideDot * impact * 0.20;
 car.yawRate = clamp((car.yawRate || 0) + angularTorque, -6.5, 6.5);

 // رد فعل هيكل السيارة (غطسة الصدمة وتمايلها)
 if (frontDot < -0.3) {
  car.pitch = clamp((car.pitch || 0) + impact * 0.018, -0.35, 0.35);
 } else if (frontDot > 0.3) {
  car.pitch = clamp((car.pitch || 0) - impact * 0.016, -0.35, 0.35);
 }
 car.roll = clamp((car.roll || 0) - sideDot * impact * 0.03, -0.38, 0.38);

 if (tangentSpeed > 2.0 || impact > 2.0) {
  if (typeof sfxScrape === 'function') sfxScrape(Math.min(0.25, tangentSpeed / 14));
  spawnVehicleSparks(car.x - hit.nx * 0.9, car.y + 0.35, car.z - hit.nz * 0.9, tangentX, tangentZ, 7);
 }

 syncCarSpeed();
 return impact;
}
function recordImpact(impact,message,curb=false) {
 if(impact<1.4||car.hitCd>0)return;
 applyVehicleDamage(impact);
 car.hitCd=.65;car.shake=Math.max(car.shake,Math.min(.85,impact/18));
 if(impact>3){G.combo=0;M.hits++;sfxCrash();flashScreen();}else sfxThud();
 if(message)setObjective(message,1800);
}
function contactAabb(x0,x1,z0,z1) {
 return obbContact(playerBounds(),{x:(x0+x1)/2,z:(z0+z1)/2,hl:(x1-x0)/2,hw:(z1-z0)/2,heading:0});
}
let simulationAccumulator=0;
function resetSimulationClock(){simulationAccumulator=0;}
function runFixedSimulation(frameDelta,active,stepFunction){
 if(!active){simulationAccumulator=0;return 0;}
 simulationAccumulator+=Math.min(Math.max(0,frameDelta),.25);
 let steps=0;
 while(simulationAccumulator+1e-10>=SIM_STEP&&steps<30){
  simulationAccumulator-=SIM_STEP;steps++;
  if(stepFunction(SIM_STEP)===false){simulationAccumulator=0;break;}
 }
 return steps*SIM_STEP;
}
