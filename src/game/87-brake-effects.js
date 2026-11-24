/* Brake & tire effects: realistic rubber tire tracks, drift smoke, and weight feedback. */
const SKID_MARK_COUNT = 140;
let skidMarkPool = null;
let skidMarkCursor = 0;
let skidMarkTex = null;

function initSkidMarkSystem() {
  if (skidMarkPool || typeof THREE === 'undefined' || typeof scene === 'undefined') return;
  skidMarkPool = [];
  skidMarkTex = canvasTex(64, 128, g => {
    g.clearRect(0, 0, 64, 128);
    const grad = g.createLinearGradient(14, 0, 50, 0);
    grad.addColorStop(0, 'rgba(14,14,16,0)');
    grad.addColorStop(0.2, 'rgba(14,14,16,0.88)');
    grad.addColorStop(0.45, 'rgba(14,14,16,0.55)');
    grad.addColorStop(0.55, 'rgba(14,14,16,0.88)');
    grad.addColorStop(0.8, 'rgba(14,14,16,0.88)');
    grad.addColorStop(1, 'rgba(14,14,16,0)');
    g.fillStyle = grad;
    g.fillRect(14, 0, 36, 128);
  });
  const geo = new THREE.PlaneGeometry(0.26, 1.35);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: skidMarkTex,
    color: 0x141416,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });
  for (let i = 0; i < SKID_MARK_COUNT; i++) {
    const mark = new THREE.Mesh(geo, mat.clone());
    mark.visible = false; mark.userData.age = 0; mark.renderOrder = 3;
    scene.add(mark); skidMarkPool.push(mark);
  }
}

function updateBrakeEffects(dt) {
  const braking = keys.KeyS || keys.ArrowDown || touch.brk;
  const handbrake = keys.Space || touch.hb;
  const speed = Math.abs(car.speed || 0);
  const lateralSlip = Math.abs(car.lateralAccel || 0);
  const hardBraking = braking && (car.longAccel < -3.2) && speed > 4.2;
  const drifting = (handbrake && speed > 3.0) || (lateralSlip > 5.0 && speed > 5.0);
  const onRoad = typeof onDrivingRoad === 'function' ? onDrivingRoad(car.x, car.z, 0.5) : true;

  if ((!hardBraking && !drifting) || car.airborne || !onRoad) {
    updateSkidMarks(dt);
    return;
  }
  initSkidMarkSystem();
  if (!skidMarkPool) return;

  car.skidMarkCd = (car.skidMarkCd || 0) - dt;
  if (car.skidMarkCd <= 0) {
    car.skidMarkCd = 0.055;
    const p = vehicleParameters();
    const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
    const rx = -fz, rz = fx;
    const track = 1.48;
    const velYaw = Math.hypot(car.vel?.x || 0, car.vel?.y || 0) > 1.5 ? Math.atan2(-car.vel.y, car.vel.x) : car.heading;
    const wetScale = (typeof G !== 'undefined' && G.weather === 'rain') ? 0.38 : 1;

    const axles = drifting ? [-1] : [1, -1];
    for (const axle of axles) {
      for (const side of [-1, 1]) {
        const x = car.x + fx * axle * (p.wheelbase / 2) + rx * side * (track / 2);
        const z = car.z + fz * axle * (p.wheelbase / 2) + rz * side * (track / 2);
        const mark = skidMarkPool[skidMarkCursor++ % SKID_MARK_COUNT];
        const rY = (typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(x, z) : roadHeightAt(x, z));
        mark.position.set(x, rY + 0.024, z);
        mark.rotation.set(0, velYaw, 0);
        mark.scale.set(1, 1, clamp(speed / 15, 0.75, 1.45));
        const intensity = (drifting ? 0.62 : clamp(0.18 + (-car.longAccel) * 0.035, 0.22, 0.56)) * wetScale;
        mark.material.opacity = intensity;
        mark.userData.age = 0;
        mark.visible = true;
      }
    }
  }
  updateSkidMarks(dt);
}

function updateSkidMarks(dt) {
  if (!skidMarkPool) return;
  for (const mark of skidMarkPool) {
    if (!mark.visible) continue;
    mark.userData.age += dt;
    if (mark.userData.age > 18) {
      mark.visible = false;
    } else {
      mark.material.opacity = Math.max(0.015, mark.material.opacity * (1 - dt * 0.07));
    }
  }
}
