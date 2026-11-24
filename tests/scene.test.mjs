import assert from 'node:assert/strict';import{createGameHarness}from './harness.mjs';const{context,vm}=createGameHarness();const g=context.__game,f=context.fixture;
assert.ok(g.REAL_CITY.buildings.length>300);assert.ok(Object.keys(g.REAL_CITY.styles).length>=5);assert.ok(Math.max(...g.REAL_CITY.buildings.map(b=>b.h))-Math.min(...g.REAL_CITY.buildings.map(b=>b.h))>35);
// The same rendered footprint stops the player's bumper; glancing impacts preserve tangent velocity.
f.MAP.buildings.length=0;f.TREES.length=0;f.traffic.length=0;f.SOLID.built=false;g.G.state='play';
const reset=(x,z,heading,speed)=>{Object.assign(g.car,{x,z,heading,speed,steer:0,yawRate:0,wheelAngle:0,reverseHold:0,y:0,vy:0,pitch:0,roll:0,hitCd:0,bumpCd:0,curbCd:0});g.car.vel.set(speed*Math.cos(heading),-speed*Math.sin(heading));};
f.MAP.buildings.push({x0:10,x1:20,z0:30,z1:40,h:12});reset(0,35,0,15);for(let i=0;i<300;i++)g.physics(1/120);assert.ok(g.car.x<8&&Math.abs(g.car.speed)<1);
f.MAP.buildings.length=0;f.SOLID.built=false;reset(100,100,0,0);g.car.longAccel=4;g.car.lateralAccel=5;for(let i=0;i<120;i++)g.updateSuspension(1/120);assert.ok(g.car.pitch>0&&g.car.roll>0);g.car.longAccel=-8;for(let i=0;i<120;i++)g.updateSuspension(1/120);assert.ok(g.car.pitch<0);
console.log(JSON.stringify({buildings:g.REAL_CITY.buildings.length,styles:g.REAL_CITY.styles,roadSegments:g.ASSYUT.segments.length,wallCollision:'passed',suspension:'passed'}));
