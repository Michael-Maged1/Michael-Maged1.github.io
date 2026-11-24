const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path=require('path');
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const context=vm.createContext({Math,console,clamp});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/game/84-dynamics.js'),'utf8')+'\nglobalThis.api={advanceVehicle,obbContact,runFixedSimulation,resetSimulationClock};',context);
const {advanceVehicle,obbContact,runFixedSimulation,resetSimulationClock}=context.api;
const p={topSpeed:36,accel:14,brake:26,grip:8.5,steer:2,wheelbase:2.65,rain:false};
const state=(speed=0)=>({x:0,z:0,heading:0,speed,steer:0,vel:{x:speed,y:0},yawRate:0});
const dt=1/120;
let s=state();for(let i=0;i<1200;i++)advanceVehicle(s,{gas:true},p,dt);assert.ok(s.speed>25&&s.speed<36);assert.ok(Math.abs(s.z)<1e-9);
const accel={speedAfter10s:s.speed,distance:s.x};
for(let i=0;i<6000;i++)advanceVehicle(s,{gas:true},p,dt);assert.ok(s.speed>35&&s.speed<=36,'top speed converges to car specification');
s=state(15);for(let i=0;i<600;i++)advanceVehicle(s,{gas:true,brake:true},p,dt);assert.equal(s.speed,0,'brake takes priority and does not reverse with both pedals held');
function stopping(rain){const s=state(20);let t=0;while(s.speed>.12&&t<12){advanceVehicle(s,{brake:true},{...p,rain},dt);t+=dt;}return {distance:s.x,time:t,speed:s.speed};}
const dry=stopping(false),wet=stopping(true);assert.ok(dry.distance>18&&dry.distance<30);assert.ok(wet.distance>dry.distance*1.15);
s=state(2);for(let i=0;i<90;i++)advanceVehicle(s,{brake:true},p,dt);assert.ok(s.speed<0&&s.speed>-3);
s=state();for(let i=0;i<300;i++)advanceVehicle(s,{left:true},p,dt);assert.equal(s.heading,0);
s=state(20);let peakLat=0;for(let i=0;i<1200;i++){advanceVehicle(s,{left:true,gas:true},p,dt);peakLat=Math.max(peakLat,Math.abs(s.lateralAccel));assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.z));}assert.ok(peakLat<10.5);
function playback(fps){resetSimulationClock();const s=state();let steps=0;for(let frame=0;frame<fps*12;frame++)runFixedSimulation(1/fps,true,step=>{advanceVehicle(s,{gas:steps<840,brake:steps>=840,left:steps>240&&steps<520},p,step);steps++;});return {x:s.x,z:s.z,heading:s.heading,speed:s.speed,steps};}
const runs=[15,30,60,144].map(fps=>({fps,...playback(fps)}));for(const r of runs){assert.equal(r.steps,1440);assert.ok(Math.abs(r.x-runs[0].x)<1e-8);assert.ok(Math.abs(r.z-runs[0].z)<1e-8);}
let count=0;resetSimulationClock();runFixedSimulation(.1,false,()=>count++);assert.equal(count,0);
// Geometry: separated, side contact, rotated nose, exact touch, symmetry.
const a={x:0,z:0,heading:Math.PI/4,hl:2.1,hw:.91},b={x:2.3,z:0,heading:0,hl:1,hw:1};
const hit=obbContact(a,b),reverse=obbContact(b,a);assert.ok(hit&&hit.depth>0);assert.ok(Math.abs(hit.nx+reverse.nx)<1e-9);assert.equal(obbContact(a,{...b,x:8}),null);
assert.equal(obbContact({x:0,z:0,hl:2,hw:1},{x:4,z:0,hl:2,hw:1}),null);
const report={accel,dryStop:dry,wetStop:wet,maxLateralAcceleration:peakLat,frameRateReplay:runs,collisionGeometry:'passed',pause:'passed'};
console.log(JSON.stringify(report,null,2));
