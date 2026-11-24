import assert from 'node:assert/strict';import{createGameHarness}from './harness.mjs';
const{context,vm}=createGameHarness();const g=context.__game;vm.runInContext('initAudio=()=>{};',context);const api=vm.runInContext('({navigationProgress,setNavigationTarget,rideNavigationAim,infrastructureRoadPoint,infrastructureHeight,INFRA,updateSuspension,selectDrivingSurface})',context);
g.startRun('rides');assert.equal(api.INFRA.profiles.has(g.ASSYUT.start.road),false,'start on a clear ground lane');let offer;for(let i=0;i<6&&!offer;i++)offer=g.makeRideOffer();assert.ok(offer,'a nearby reachable offer exists');assert.ok(offer.pickupDistance<=300);assert.ok(offer.distance<=450);assert.equal(g.acceptRideOffer(),true);
const nav=g.RIDE.navigation,target={...nav.target},points=nav.points.map(p=>({...p}));let cursor=0,last=Infinity;
for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<len;d+=2){const t=d/len;g.car.x=a.x+(b.x-a.x)*t;g.car.z=a.z+(b.z-a.z)*t;api.setNavigationTarget(target);api.rideNavigationAim();assert.equal(g.RIDE.navigation,nav,'retain route while following it');assert.ok(nav.cursor>=cursor);assert.ok(nav.remaining<=last+2);cursor=nav.cursor;last=nav.remaining;}}
g.car.y=0;g.car.x=target.x;g.car.z=target.z;g.car.vel.set(0,0);assert.equal(g.boardRidePassenger(),true,'following the route reaches the actual boarding point');
let checked=0;
for(const profile of api.INFRA.profiles.values()){
 let first=api.infrastructureRoadPoint(profile.road,0);Object.assign(g.car,{x:first.x,z:first.z,y:0,vy:0,pitch:0,roll:0,surfaceRoad:undefined,heading:-Math.atan2(first.fz,first.fx),speed:8});
 for(let d=0;d<=profile.length;d+=1){const p=api.infrastructureRoadPoint(profile.road,d);Object.assign(g.car,{x:p.x,z:p.z,heading:-Math.atan2(p.fz,p.fx)});for(let k=0;k<15;k++)api.updateSuspension(1/120);assert.ok(g.car.y>=g.car.wheelGround.reduce((a,b)=>a+b,0)/4-.036,'body cannot sink through deck');if(d>10&&d<profile.length-10){assert.ok(Math.abs(g.car.y-api.infrastructureHeight(profile.road,d))<.45,profile.name+' stays on its deck');assert.equal(g.car.surfaceRoad,profile.road,profile.name+' layer stays locked');}}
 checked++;
}
console.log('Nearby offers, monotonic route progress, actual arrival, and continuous four-wheel bridge/tunnel contact passed:',checked,'structures');
