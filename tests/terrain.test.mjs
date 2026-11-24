import assert from 'node:assert/strict';import{createGameHarness}from './harness.mjs';const{context}=createGameHarness();const g=context.__game;
const misplaced=g.ROAD_FURNITURE.filter(p=>g.onDrivingRoad(p.x,p.z,.05));assert.equal(misplaced.length,0,'ground poles stay outside real road carriageways');
assert.ok(g.ASSYUT.roads.length>500);assert.ok(g.ASSYUT.segments.some(s=>Math.abs(s.a.x-s.b.x)>3&&Math.abs(s.a.z-s.b.z)>3),'OSM roads retain diagonal directions');
const s=g.ASSYUT.segments.find(s=>s.length>40&&s.width>=10),tx=(s.b.x-s.a.x)/s.length,tz=(s.b.z-s.a.z)/s.length,mid={x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2};
assert.ok(g.roadHeightAt(mid.x,mid.z)<.03);const x=mid.x-tz*(s.width/2+1),z=mid.z+tx*(s.width/2+1);assert.ok(g.roadHeightAt(x,z)>.16);
Object.assign(g.car,{x,z,heading:s.heading,y:0,vy:0,pitch:0,roll:0,speed:0,longAccel:0,lateralAccel:0});for(let i=0;i<240;i++)g.updateSuspension(1/120);assert.ok(g.car.y>.10&&g.car.y<.23);
console.log('OSM directions, pavement height, suspension and road-furniture clearance passed');
