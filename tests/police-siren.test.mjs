import assert from 'node:assert/strict';
import { createGameHarness } from './harness.mjs';

const { context, vm } = createGameHarness();
const g = context.__game;
vm.runInContext('initAudio=()=>{};', context);

// 1. Police mode start
g.startRun('police');
assert.equal(g.G.mode, 'police');
assert.equal(g.POLICE.siren, false, 'Siren starts off on patrol');

// 2. Automated siren on dispatch call and crime scene crowd
assert.equal(g.issuePoliceCall(), true);
assert.equal(g.POLICE.phase, 'respond');
assert.equal(g.POLICE.siren, true, 'Siren activates automatically on dispatch');
assert.ok(g.POLICE.actors.length >= 10, 'Crime scene spawned with crowd and officers');
assert.ok(g.POLICE.actors.some(a => a.userData?.isPoliceSuspect), 'Suspects present at crime scene');
assert.ok(g.POLICE.actors.some(a => a.userData?.isPoliceOfficer), 'Police officers present guarding scene');
assert.ok(g.POLICE.actors.some(a => a.userData?.isCrowdBystander), 'Crowd of bystanders gathered around crime scene');
assert.ok(g.POLICE.actors.some(a => a.userData?.isStrobe), 'Flashing emergency strobe light on scene');
assert.equal(g.destMarker.visible, true, 'Destination marker is visible on crime scene');

// 3. Arrest sequence: siren turns off during clip, then turns back on for transport
g.playPoliceClip('arrest');
assert.equal(g.POLICE.phase, 'arrestVideo');
assert.equal(g.POLICE.siren, false, 'Siren muted during arrest cutscene');
g.finishPoliceClip();
assert.equal(g.POLICE.phase, 'transport');
assert.equal(g.POLICE.siren, true, 'Siren activates automatically for station transport');

// 4. Station handoff sequence: siren turns off on patrol
g.playPoliceClip('handoff');
assert.equal(g.POLICE.phase, 'handoffVideo');
g.finishPoliceClip();
assert.equal(g.POLICE.phase, 'patrol');
assert.equal(g.POLICE.siren, false, 'Siren turns off automatically after handoff back to patrol');

// 5. Traffic yielding test
const edge = g.ASSYUT.edges.find(e => e.length > 80 && g.ASSYUT.roads[e.road].width >= 10);
assert.ok(edge, 'Edge found');
const road = g.ASSYUT.roads[edge.road];
const a = g.ASSYUT.nodes[edge.a], b = g.ASSYUT.nodes[edge.b];
const fx = (b.x - a.x) / edge.length, fz = (b.z - a.z) / edge.length;

// Place a civilian vehicle ahead on the road
const civ = g.traffic[0];
Object.assign(civ, {
  edge,
  s: 40,
  offset: 1.5,
  laneTarget: 1.5,
  laneTimer: 0,
  speed: 10,
  baseSpeed: 10,
  personality: 1.0,
  policeSuspect: false,
  nextEdge: null,
  stopAt: null
});
civ.mesh.position.set(a.x + fx * 40 - fz * 1.5, 0, a.z + fz * 40 + fx * 1.5);
civ.mesh.rotation.y = Math.atan2(-fz, fx);

// Place player police car 25m behind civilian car, heading same direction
g.car.x = a.x + fx * 15 - fz * 1.5;
g.car.z = a.z + fz * 15 + fx * 1.5;
g.car.heading = civ.mesh.rotation.y;
g.car.speed = 20;

// Turn siren ON
g.POLICE.siren = true;

// Run traffic update
g.updateTraffic(1 / 60);

// Civilian car should pull over to the curb and decelerate
const expectedCurb = Math.max(0.65, road.width / 2 - civ.hw - 0.35);
assert.equal(civ.laneTarget, expectedCurb, 'Civilian car targets right curb when siren sounds behind it');
assert.ok(civ.yielding, 'Civilian car marks yielding state');
assert.ok(civ.speed < 10, 'Civilian car decelerates to let police pass');

// 6. Suspect vehicle does NOT yield
const suspect = g.traffic[1];
Object.assign(suspect, {
  edge,
  s: 45,
  offset: 1.5,
  laneTarget: 1.5,
  laneTimer: 0,
  speed: 12,
  baseSpeed: 12,
  personality: 1.0,
  policeSuspect: true,
  nextEdge: null,
  stopAt: null
});
suspect.mesh.position.set(a.x + fx * 45 - fz * 1.5, 0, a.z + fz * 45 + fx * 1.5);
suspect.mesh.rotation.y = Math.atan2(-fz, fx);

g.updateTraffic(1 / 60);
assert.equal(suspect.laneTarget, 1.5, 'Suspect does NOT pull over to curb');
assert.equal(suspect.yielding, false, 'Suspect does not yield to police');

// 7. Pedestrian gap check with siren
const pGroup = g.WALKING_GROUPS.find(gr => gr.edge.length > 20);
if (pGroup) {
  const pFrame = vm.runInContext('pedestrianFrame(WALKING_GROUPS.find(gr => gr.edge.length > 20).edge)', context);
  const pCenter = { x: (pFrame.a.x + pFrame.b.x) / 2, z: (pFrame.a.z + pFrame.b.z) / 2 };
  g.car.x = pCenter.x - pFrame.fx * 25;
  g.car.z = pCenter.z - pFrame.fz * 25;
  g.car.speed = 0; // stopped car, but with SIREN on
  g.POLICE.siren = true;
  assert.equal(vm.runInContext('crossingSafe(WALKING_GROUPS.find(gr => gr.edge.length > 20))', context), false, 'Pedestrians do not cross when police siren is active nearby');
}

console.log('All police siren automated trigger and traffic yielding tests passed successfully!');
