import assert from 'node:assert/strict';
import {createGameHarness} from './harness.mjs';
const {context,elements,listeners,storage,source,real,vm}=createGameHarness();
const d=context.__game,{G,M,car,RIDE}=d;
const api=vm.runInContext('({updateDriverShift,updateMission,updateMarkers,renderDriverPhone,updateDriverPhone,applyVehicleDamage,carStats,CARS,CAR_PAINTS,garageHTML,openSettings,startRun,saveProgress,PLACES,curbsideRidePlace})',context);
vm.runInContext('initAudio=()=>{};G.carIdx=0;swapTaxi(0);',context);
for(const place of api.PLACES){const p=api.curbsideRidePlace(place),stop=d.riderRoadStop(p);assert.ok(Math.hypot(stop.x-p.x,stop.z-p.z)<7,'reachable stop: '+p.name);}
api.startRun('rides');assert.equal(G.mode,'rides');assert.equal(api.CARS[G.carIdx].id,'qashqai');assert.ok(G.owned.includes('qashqai'));assert.equal(M.phase,'none');assert.equal(RIDE.offer,null);
assert.ok(!api.CARS.some(c=>['sunny','azera','sentra','linea','bmw','tucson'].includes(c.id)),'legacy low-quality cars removed');
G.money=0;
api.updateDriverShift(4.9);assert.equal(RIDE.offer,null);api.updateDriverShift(.2);assert.ok(RIDE.offer);assert.equal(d.passenger.visible,false);assert.equal(d.pickupMarker.visible,false);
let o=RIDE.offer;assert.ok(o.fare>=45&&Number.isInteger(o.fare));assert.ok(elements.get('driverPhone').innerHTML.includes(o.pickup.name));assert.ok(elements.get('driverPhone').innerHTML.includes(o.dest.name));assert.ok(!elements.get('driverPhone').classList.contains('phoneHidden'));
// Rejection (including keyboard handling) must not pay, charge, or activate a mission.
for(const fn of listeners.keydown)fn({code:'Digit2',repeat:false,preventDefault(){}});
assert.equal(RIDE.offer,null);assert.equal(M.phase,'none');assert.equal(G.money,0);assert.ok(RIDE.nextIn>=8);
d.makeRideOffer();api.updateDriverShift(23);assert.equal(RIDE.offer,null);assert.equal(G.money,0);assert.equal(M.phase,'none');
d.makeRideOffer();const frozen=RIDE.offerLeft;d.runFixedSimulation(.2,false,step=>api.updateDriverShift(step));assert.equal(RIDE.offerLeft,frozen);
o=RIDE.offer;
for(const fn of listeners.keydown)fn({code:'Digit1',repeat:false,preventDefault(){}});
assert.equal(M.phase,'toPick');assert.equal(RIDE.offer,null);assert.equal(M.destName,o.dest.name);assert.equal(M.destX,o.dest.x);assert.equal(M.quotedFare,o.fare);assert.equal(G.money,0);assert.equal(d.pickupMarker.visible,true);assert.ok(RIDE.navigation.points.length>1);
api.updateMarkers(.016);assert.equal(d.arrow.visible,true,'guidance is available while driving to pickup');
assert.equal(d.makeRideOffer(),null);assert.equal(d.fleetTransaction('paint','blue').ok,false);assert.equal(d.fleetTransaction('repair').ok,false);assert.equal(d.boardRidePassenger(),false);
const stop=d.riderRoadStop(o.pickup);car.x=stop.x;car.z=stop.z;car.y=0;car.speed=0;car.vel.set(0,0);
assert.ok(Math.hypot(car.x-o.pickup.x,car.z-o.pickup.z)<7,'pickup has a reachable stopping point');
api.updateDriverShift(1.2);assert.equal(M.phase,'toDest');assert.equal(M.destName,o.dest.name);assert.equal(M.fare,o.fare);assert.equal(G.money,0);assert.equal(d.passenger.visible,false);assert.equal(d.destMarker.visible,true);
G.weather='rain';api.updateDriverShift(120);assert.equal(M.fare,o.fare,'elapsed time and changed weather cannot alter the accepted quote');assert.equal(d.completeRideTrip(),false,'cannot finish away from the destination');
const end=d.riderRoadStop(o.dest);car.x=end.x;car.z=end.z;car.y=0;car.speed=6;car.vel.set(6,0);assert.equal(d.completeRideTrip(),false,'must stop before completion');car.speed=0;car.vel.set(0,0);
const quoted=o.fare;assert.equal(d.completeRideTrip(),true);assert.equal(G.money,quoted);assert.equal(G.totalEarned,quoted);assert.equal(RIDE.sessionEarned,quoted);assert.equal(G.trips,1);assert.equal(M.phase,'none');assert.equal(d.completeRideTrip(),false);assert.equal(G.money,quoted,'exactly one payment per ride');assert.equal(d.makeRideOffer(),null,'receipt cannot overlap a new offer');
// Routes follow a directed real road edge and stay reachable on the main network.
const edge=d.ASSYUT.edges.find(e=>d.ASSYUT.navigableNodes.has(e.a)&&e.length>20),a=d.ASSYUT.nodes[edge.a],b=d.ASSYUT.nodes[edge.b];
const forward=d.roadRoute({x:a.x+(b.x-a.x)*.2,z:a.z+(b.z-a.z)*.2},{x:a.x+(b.x-a.x)*.8,z:a.z+(b.z-a.z)*.8});assert.ok(forward.reachable);assert.ok(Math.abs(forward.length-edge.length*.6)<.5);
// All maintenance actions are charged atomically and reject insufficient funds or duplicates.
RIDE.receipt=null;G.weather='clear';G.money=199;let before=G.money;
assert.equal(d.fleetTransaction('paint','blue').ok,false);assert.equal(G.money,before);
G.money=800;G.conditions.qashqai=80;const repair=d.repairPrice();assert.equal(repair,120);let result=d.fleetTransaction('repair');assert.equal(result.ok,true);assert.equal(result.amount,120);assert.equal(G.money,680);assert.equal(G.conditions.qashqai,100);
assert.equal(d.fleetTransaction('repair').ok,false);assert.equal(G.money,680);
result=d.fleetTransaction('paint','blue');assert.equal(result.ok,true);assert.equal(result.amount,250);assert.equal(G.money,430);assert.equal(G.paints.qashqai,0x2274d6);
assert.equal(d.fleetTransaction('paint','blue').ok,false);assert.equal(G.money,430);
assert.equal(d.fleetTransaction('paint','default').ok,true);assert.equal(G.money,180,'returning to original paint is also paid');
const buyIdx=api.CARS.findIndex(c=>c.id==='fiat1300');
vm.runInContext("importedModels.loaded.qashqai=importedModels.loaded.fiat1300={scene:new THREE.Group()};",context);
assert.equal(d.fleetTransaction('buy',buyIdx).ok,false);assert.equal(G.money,180);assert.equal(G.carIdx,0);
G.money=2600;result=d.fleetTransaction('buy',buyIdx);assert.equal(result.ok,true);assert.equal(G.money,800);assert.equal(G.carIdx,buyIdx);assert.ok(G.owned.includes('fiat1300'));assert.equal(G.conditions.fiat1300,100);
assert.equal(d.fleetTransaction('buy',buyIdx).ok,false);assert.equal(G.money,800);assert.equal(d.fleetTransaction('buy',1).ok,false);
G.conditions.fiat1300=75;assert.equal(d.fleetTransaction('select',0).ok,true);assert.equal(d.fleetTransaction('select',buyIdx).ok,true);assert.equal(G.conditions.fiat1300,75,'switching vehicles does not repair them');
assert.equal(d.fleetTransaction('repair').ok,true);assert.equal(G.money,660);assert.equal(G.conditions.fiat1300,100);
const intact=api.carStats().topSpeed;api.applyVehicleDamage(12);assert.ok(G.conditions.fiat1300<100);assert.ok(api.carStats().topSpeed<intact);assert.ok(d.repairPrice()>0);
assert.ok(JSON.parse(storage.get('alex_driver_conditions')).fiat1300<100);assert.equal(Number(storage.get('alex_taxi_money')),660);
api.openSettings();assert.ok(elements.get('modalPanel').innerHTML.includes('الصيانة والسيارات'));
// State-only reload verifies balances, ownership, paint and damage survive a refresh.
const stateCode=source.slice(0,source.indexOf('/* ------------------------- شبكة شوارع المدينة'));
const actualState=source.slice(source.indexOf('let MAXSPEED = 36;'),source.indexOf('/* =====================================================================\n   الصوت'));
const reload=vm.createContext({assyutRoadHeightAt:()=>0,ASSYUT:d.ASSYUT,THREE:real,Math,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))}});
vm.runInContext('var stateReady=false;\n'+stateCode+actualState+'\nglobalThis.result={G,CARS};',reload);
assert.equal(reload.result.G.money,660);assert.ok(reload.result.G.owned.includes('fiat1300'));assert.equal(reload.result.G.carIdx,buyIdx);assert.equal(reload.result.G.conditions.fiat1300,G.conditions.fiat1300);assert.equal(reload.result.G.totalEarned,quoted);
const report={requests:'delayed, previewed, rejected, expired and accepted',fixedQuote:quoted,payment:'once, after drop-off only',navigation:'pickup and drop-off, directed road route',maintenance:'insufficient funds, paid repair/paint/buy, duplicate prevention, per-car damage',persistence:'passed',browserVisualVerification:false};
console.log(JSON.stringify(report,null,2));
