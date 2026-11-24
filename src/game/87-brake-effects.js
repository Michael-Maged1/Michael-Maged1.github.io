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
    for (const x of [12, 38]) {
      const grad = g.createLinearGradient(x, 0, x + 14, 0);
      grad.addColorStop(0, 'rgba(16,16,18,0)');
      grad.addColorStop(0.25, 'rgba(16,16,18,0.85)');
      grad.addColorStop(0.75, 'rgba(16,16,18,0.85)');
      grad.addColorStop(1, 'rgba(16,16,18,0)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 14, 128);
    }
  });
  const geo = new THREE.PlaneGeometry(0.32, 1.25);
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
  const hardBraking = braking && (car.longAccel < -1.8) && speed > 3.2;
  const drifting = (handbrake && speed > 2.8) || (lateralSlip > 4.5 && speed > 4.5);

  if (!hardBraking && !drifting) {
    updateSkidMarks(dt);
    return;
  }
  initSkidMarkSystem();
  if (!skidMarkPool) return;

  car.skidMarkCd = (car.skidMarkCd || 0) - dt;
  if (car.skidMarkCd <= 0) {
    car.skidMarkCd = 0.065;
    const p = vehicleParameters();
    const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
    const rx = -fz, rz = fx;
    const track = 1.48;

    const axles = drifting ? [-1] : [1, -1];
    for (const axle of axles) {
      for (const side of [-1, 1]) {
        const x = car.x + fx * axle * (p.wheelbase / 2) + rx * side * (track / 2);
        const z = car.z + fz * axle * (p.wheelbase / 2) + rz * side * (track / 2);
        const mark = skidMarkPool[skidMarkCursor++ % SKID_MARK_COUNT];
        const rY = (typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(x, z) : roadHeightAt(x, z));
        mark.position.set(x, rY + 0.024, z);
        mark.rotation.set(0, car.heading, 0);
        mark.scale.set(1, 1, clamp(speed / 16, 0.7, 1.4));
        const intensity = drifting ? 0.65 : clamp(0.20 + (-car.longAccel) * 0.035, 0.25, 0.60);
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
