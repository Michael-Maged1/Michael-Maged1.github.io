import assert from 'node:assert/strict';
import fs from 'node:fs';
import vmMod from 'node:vm';
import { createGameHarness } from './harness.mjs';

const root = 'c:/Users/micha/Desktop/أوبر اسيوط/';
const uri = s => 'data:text/javascript;base64,' + Buffer.from(s).toString('base64');
const threeURI = uri(fs.readFileSync(root + 'vendor/three.module.js', 'utf8'));
const THREE = await import(threeURI);
const utilsURI = uri(fs.readFileSync(root + 'vendor/addons/BufferGeometryUtils.js', 'utf8').replaceAll("from 'three'", `from '${threeURI}'`));
const loaderURI = uri(fs.readFileSync(root + 'vendor/addons/GLTFLoader.js', 'utf8').replaceAll("from 'three'", `from '${threeURI}'`).replace('../utils/BufferGeometryUtils.js', utilsURI));
const decoderURI = uri(fs.readFileSync(root + 'vendor/addons/meshopt_decoder.module.js', 'utf8'));
const { GLTFLoader } = await import(loaderURI);
const { MeshoptDecoder } = await import(decoderURI);
globalThis.Image = class { constructor() { this.height = 1; } set src(v) { queueMicrotask(() => this.onload?.()); } };
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });

const { context, vm } = createGameHarness();
const g = context.__game;

// 1. Traffic diversity & wheel extraction on newly added traffic GLBs
const extraKeys = [
  ['traffic_peugeot405', 'assets/traffic-peugeot-405.glb'],
  ['traffic_peugeot205', 'assets/traffic-peugeot-205.glb'],
  ['traffic_corolla', 'assets/traffic-toyota-corolla.glb'],
  ['traffic_logan', 'assets/traffic-renault-logan.glb'],
  ['traffic_lada', 'assets/traffic-lada-2107.glb'],
  ['traffic_kombi', 'assets/traffic-vw-kombi.glb'],
  ['traffic_tucson', 'assets/traffic-hyundai-tucson.glb'],
  ['traffic_uno', 'assets/traffic-fiat-uno.glb']
];
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const mod = vm.runInContext('({importedModels, vehicleVisual, upgradeLoadedModels, EXTRA_TRAFFIC_SPECS, poseCycleRider, animateCycleRider, INFRA, ROAD_FURNITURE, REAL_CITY, ASSYUT, resolveInfrastructureRails, sampledDriveHeight, CARS, UPLOADED_MODELS, makeUploadedCarRig})', context);

for (const [key, rel] of extraKeys) {
  const buf = fs.readFileSync(root + rel);
  mod.importedModels.loaded[key] = await loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const visual = mod.vehicleVisual(key, 0x3d6bd9, false);
  assert.ok(visual, `${key} visual loads`);
  assert.equal(visual.userData.wheels?.length, 4, `${key} exposes 4 separate wheel pivots`);
  const frontCount = visual.userData.wheels.filter(w => w.front).length;
  assert.equal(frontCount, 2, `${key} has 2 front and 2 rear wheels`);
}

// Verify all traffic entries represent multiple vehicle models + tuktuk and rotate their 4 wheels smoothly
const spawnedModels = new Set(g.traffic.map(t => t.mesh.userData.modelKey || t.kind));
assert.ok(spawnedModels.size >= 10, `expected >= 10 distinct traffic models/kinds, got ${spawnedModels.size}`);
for (const [key] of extraKeys) mod.upgradeLoadedModels(key);

const wheeledCar = g.traffic.find(t => !t.mesh.userData.twoWheeler && t.mesh.userData.wheels?.length >= 3 && t.edge.length > 25);
assert.ok(wheeledCar, 'found a multi-wheel traffic vehicle on a straight street');
const initialWheelZ = wheeledCar.mesh.userData.wheels[0].spin.rotation.z;
g.G.state = 'play';
g.car.x = 1050; g.car.z = 880; g.car.speed = 0;
wheeledCar.speed = 8;
for (let i = 0; i < 60; i++) g.updateTraffic(1 / 60);
const deltaWheelZ = Math.abs(wheeledCar.mesh.userData.wheels[0].spin.rotation.z - initialWheelZ);
assert.ok(deltaWheelZ > 0.5, `4-wheel traffic car wheels must spin (${deltaWheelZ.toFixed(3)} rad)`);

// 2. Empty southern/interior map areas are now populated with Egyptian styles
const southBuildings = g.MAP.buildings.filter(b => b.z0 > 870 && b.z1 < 1390);
assert.ok(southBuildings.length >= 25, `southern band z=870..1390 populated (got ${southBuildings.length})`);
assert.ok((mod.REAL_CITY.styles.cairo || 0) >= 10, 'cairo Egyptian style buildings built');
assert.ok((mod.REAL_CITY.styles.mosque || 0) >= 3, 'Egyptian mosques built');

// 3. Cyclist sits on saddle and pedals actively
const bike = g.traffic.find(t => t.kind === 'bicycle');
assert.ok(bike, 'bicycle exists in traffic');
const rider = bike.mesh.userData.rider;
assert.ok(rider, 'cyclist rider attached');
const phaseBefore = bike.pedalPhase;
const legBefore = rider.userData.walk.legs[0].rotation.x;
bike.speed = 4.5;
for (let i = 0; i < 20; i++) g.updateTraffic(1 / 60);
assert.notEqual(bike.pedalPhase, phaseBefore, 'bicycle pedal phase advances');
assert.notEqual(rider.userData.walk.legs[0].rotation.x, legBefore, 'cyclist legs actively pedal');

// 4. Bridge ramp wall and support pillar collision prevent ground clipping
const rampWall = mod.INFRA.barriers.find(b => b.kind === 'bridge' && b.h > 0.5 && b.h < 2.0);
assert.ok(rampWall, 'bridge ramp barrier exists');
const startHp = g.car.hp ?? 100;
const nx = -Math.sin(rampWall.heading), nz = Math.cos(rampWall.heading);
Object.assign(g.car, {
  x: rampWall.x + nx * 0.4,
  z: rampWall.z + nz * 0.4,
  y: 0, vy: 0,
  heading: rampWall.heading + Math.PI / 2,
  speed: 14
});
g.car.vel.set(-nx * 14, -nz * 14);
const posBeforeRail = { x: g.car.x, z: g.car.z };
mod.resolveInfrastructureRails();
assert.ok(g.car.x !== posBeforeRail.x || g.car.z !== posBeforeRail.z, 'ground car is pushed out of bridge ramp wall instead of driving inside it');

// Ground car must never teleport up onto a high bridge deck in one frame
const midDeck = mod.INFRA.barriers.find(b => b.kind === 'bridge' && b.h > 3.0);
assert.ok(midDeck, 'elevated bridge barrier exists');
const hSample = mod.sampledDriveHeight(midDeck.x, midDeck.z, 0, null);
assert.ok(hSample < 1.0, `ground car at y=0 does not snap up to bridge deck y=3.8 (got ${hSample})`);

// 5. All 10 civilian Uber cars have dual L/R headlights + flush front/rear lamp alignments
const uberCars = mod.CARS.filter(c => c.uploaded && !c.police && c.asset);
assert.equal(uberCars.length, 10, '10 uploaded Uber cars tested for headlight alignment');
for (const c of uberCars) {
  const spec = mod.UPLOADED_MODELS[c.asset];
  const buf = fs.readFileSync(root + 'assets/' + spec.file);
  mod.importedModels.loaded[c.asset] = await loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const rig = mod.makeUploadedCarRig(c, null);
  rig.group.updateMatrixWorld(true);
  const bodyBox = new THREE.Box3().setFromObject(rig.body);
  assert.equal(rig.headlights?.spots?.length, 2, `${c.id} has dual L/R SpotLights`);
  assert.equal(rig.headlights?.glows?.length, 2, `${c.id} has dual L/R headlamp glow sprites`);
  assert.equal(rig.headlights?.bulbs?.length, 2, `${c.id} has dual L/R headlamp emitters`);
  const [spL, spR] = rig.headlights.spots;
  assert.ok(Math.abs(spL.position.z + spR.position.z) < 0.02, `${c.id} L/R spotlights are symmetric`);
  assert.ok(Math.abs(spL.position.z) > 0.45, `${c.id} spotlights sit on L/R lamps, not center grille`);
  assert.ok(spL.position.x <= bodyBox.max.x + 0.05 && spL.position.x >= bodyBox.max.x - 0.55, `${c.id} headlight X=${spL.position.x.toFixed(2)} sits on front lamp face`);
  for (const m of [...rig.signals.left, ...rig.signals.brakes, ...rig.signals.reverse]) {
    assert.ok(m.position.x >= bodyBox.min.x - 0.04 && m.position.x <= bodyBox.max.x + 0.04, `${c.id} signal X=${m.position.x.toFixed(2)} flush within body [${bodyBox.min.x.toFixed(2)}..${bodyBox.max.x.toFixed(2)}]`);
  }
}

// 6. Split index.html + app/*.js sequential chunk execution test (catches cross-bundle hoisting/order errors)
const splitHtml = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(splitHtml.length < 30 * 1024, `index.html is lightweight split shell (got ${(splitHtml.length / 1024).toFixed(1)} KB)`);
assert.ok(splitHtml.includes('app/hud.css') && splitHtml.includes('app/menu.css') && splitHtml.includes('app/boot.js'), 'index.html links split CSS and boot module');
const bootSrc = fs.readFileSync(root + 'app/boot.js', 'utf8');
const chunkNames = JSON.parse(bootSrc.match(/const chunks = (\[.*?\]);/s)[1]);
const { context: splitCtx } = createGameHarness();
// Re-run each built chunk separately in a clean fresh VM sharing only THREE/harness stubs
const elements2 = new Map(), listeners2 = {};
const canvasContext2 = splitCtx.document.createElement().getContext();
const elFactory = () => ({ style:{setProperty(){}}, classList:{add(){},remove(){},toggle(){},contains:()=>false}, dataset:{}, width:256, height:256, appendChild(){}, replaceWith(){}, remove(){}, addEventListener(){}, querySelectorAll:()=>[], getContext:()=>canvasContext2, setPointerCapture(){} });
const doc2 = { body: elFactory(), getElementById: id => elements2.get(id) || (elements2.set(id, elFactory()), elements2.get(id)), createElement: elFactory, querySelectorAll: () => [], addEventListener(e, f) { (listeners2[e] ||= []).push(f); } };
class FakeTexLoader { load() { return new splitCtx.THREE.Texture(); } }
class LocalGLTFLoader extends GLTFLoader {
  loadAsync(url) {
    if (!url.includes('qashqai')) return Promise.reject(new Error('skip non-qashqai in split smoke test'));
    const b = fs.readFileSync(root + url);
    return this.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  }
}
const seqCtx = vmMod.createContext({
  console, Math, Date, performance, Uint8Array, Float32Array, Uint8ClampedArray,
  THREE: { ...splitCtx.THREE, TextureLoader: FakeTexLoader }, GLTFLoader: LocalGLTFLoader, cloneSkeleton: o => o.clone(), MeshoptDecoder,
  document: doc2, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, navigator: { userAgent: 'test' },
  localStorage: { getItem: () => null, setItem() {} }, matchMedia: () => ({ matches: false }),
  requestAnimationFrame() {}, addEventListener() {}, setTimeout: () => 0, clearTimeout() {}, atob: s => Buffer.from(s, 'base64').toString('binary')
});
seqCtx.window = seqCtx; seqCtx.self = seqCtx;
for (const rel of chunkNames) {
  vmMod.runInContext(fs.readFileSync(root + rel, 'utf8'), seqCtx, { filename: rel, timeout: 30000 });
}
const seqRig = await vmMod.runInContext(`(async () => {
  await ensureVehicleModel('qashqai');
  upgradeLoadedModels();
  return taxiRig;
})()`, seqCtx);
assert.equal(seqRig?.headlights?.spots?.length, 2, 'split chunk sequential load initializes dual headlights on taxiRig');

console.log(JSON.stringify({
  modelsVerified: extraKeys.length,
  distinctTrafficModels: spawnedModels.size,
  southBuildings: southBuildings.length,
  styles: mod.REAL_CITY.styles,
  wheelSpinDeltaRad: +deltaWheelZ.toFixed(3),
  cyclistPedaled: true,
  bridgeWallAndDeckGuards: true,
  uberHeadlightsVerified: uberCars.length,
  splitChunksVerified: chunkNames.length
}));
