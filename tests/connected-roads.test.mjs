import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGameHarness} from './harness.mjs';
const {context,vm}=createGameHarness(),g=context.__game;
const api=vm.runInContext('({segmentHitsBuilding,trafficFootprintClear,rideNavigationAim,setNavigationTarget,remainingNavigationPoints})',context);
const neighbors=new Map();for(const e of g.ASSYUT.edges){if(!neighbors.has(e.a))neighbors.set(e.a,new Set());neighbors.get(e.a).add(e.b);}
for(const n of neighbors.values())assert.ok(n.size>=2,'no dead-end driving nodes');
const seen=new Set(),stack=[neighbors.keys().next().value];while(stack.length){const n=stack.pop();if(seen.has(n))continue;seen.add(n);for(const v of neighbors.get(n)||[])stack.push(v);}assert.equal(seen.size,neighbors.size,'all streets connected');
for(const s of g.ASSYUT.segments)assert.equal(api.segmentHitsBuilding(s.a,s.b,.8),false,'road centre stays outside buildings');
g.G.state='play';g.car.x=1100;g.car.z=850;for(let i=0;i<180;i++)g.updateTraffic(1/30);
for(const t of g.traffic)assert.ok(api.trafficFootprintClear(t.mesh.position.x,t.mesh.position.z,t.mesh.rotation.y,t.hl,t.hw),'traffic stays outside buildings');
// A nearby destination around a sharp corner must not bypass the turn.
vm.runInContext('car.x=0;car.z=0;car.speed=0;RIDE.navigation={reachable:true,cursor:0,target:{x:8,z:8},points:[{x:0,z:0},{x:8,z:0},{x:8,z:8}]};',context);
assert.deepEqual(JSON.parse(JSON.stringify(api.rideNavigationAim())),{x:5,z:0});
vm.runInContext('car.speed=20;',context);assert.equal(api.rideNavigationAim().z,0,'lookahead stops at corner');
const films=JSON.parse(fs.readFileSync(new URL('../assets/media/police-films.json',import.meta.url)));for(const slots of Object.values(films)){assert.ok(slots.arrest);assert.ok(slots.handoffSecond);assert.equal(slots.handoffFirst.optional,true);assert.equal(slots.handoffFirst.src,'assets/media/police-scenes/station-first.mp4');}
console.log('Connected streets, zero dead ends, clear road corridors, safe traffic, corner guidance, separate second-station film passed');
