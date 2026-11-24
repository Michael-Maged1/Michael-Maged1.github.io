/* Ride lifecycle and wallet transactions. An offered destination and fare are immutable. */
const RIDE={online:true,offer:null,offerLeft:0,nextIn:5,receipt:null,receiptLeft:0,expanded:false,sessionEarned:0,sessionTrips:0,declined:0,sequence:0,navigation:null,navIndex:1,navTimer:0,notice:''};
const DRIVER_NAMES=['أحمد','مريم','محمد','سارة','يوسف','نور','مصطفى','دينا','عمر','فاطمة'];
const RIDE_PREFERENCES=[
 {id:'quiet',label:'عايز هدوء',icon:'🤫'},
 {id:'radio',label:'شغّل الراديو',icon:'📻'},
 {id:'smooth',label:'سواقة هادية',icon:'🫶'},
 {id:'fast',label:'مستعجل',icon:'⏱️'}
];
const PAINT_PRICE=250;
function rideBusy(){return M.phase==='toPick'||M.phase==='toDest'||(G.mode==='police'&&policeBusy());}
function currentCarCondition(){const id=(CARS[G.carIdx]||CARS[0]).id;return clamp(Number.isFinite(G.conditions[id])?G.conditions[id]:100,0,100);}
function repairPrice(){const missing=100-currentCarCondition();return missing<.05?0:Math.ceil(40+missing*4);}
function applyVehicleDamage(impact){
 if(impact<2)return;
 const id=(CARS[G.carIdx]||CARS[0]).id;
 G.conditions[id]=Math.max(0,currentCarCondition()-clamp((impact-1.4)*.65,.5,17));
 applyCarStats();saveProgress();
}
function clearDriverRequest(){RIDE.offer=null;RIDE.offerLeft=0;RIDE.navigation=null;RIDE.receipt=null;RIDE.receiptLeft=0;RIDE.expanded=false;}
function startDriverShift(){
 clearDriverRequest();RIDE.online=true;RIDE.nextIn=5;RIDE.sessionEarned=0;RIDE.sessionTrips=0;RIDE.notice='أنت متصل — تحرّك وانتظر طلبًا قريبًا';M.phase='none';M.respawn=0;
 passenger.visible=false;pickupMarker.visible=false;destMarker.visible=false;
 renderDriverPhone(true);setObjective('أنت متصل الآن · أول طلب سيظهر على هاتفك',4000);
}
function makeRideOffer(){
 if(RIDE.offer||RIDE.receipt||rideBusy()||!RIDE.online)return null;
 const pickup=nearbyNavigationStop({x:car.x,z:car.z,roadIndex:car.surfaceRoad},60,300);if(!pickup){RIDE.nextIn=3;return null;}
 const dest=nearbyNavigationStop(pickup,120,450);if(!dest){RIDE.nextIn=3;return null;}
 const route=roadRoute(pickup,dest);
 const approach=roadRoute({x:car.x,z:car.z,roadIndex:car.surfaceRoad},pickup);
 if(!Number.isFinite(route.length)||!Number.isFinite(approach.length)){RIDE.nextIn=3;return null;}
 const w=WEATHERS.find(w=>w.id===G.weather)||WEATHERS[0];
 const fare=Math.max(45,Math.round((24+route.length*.105)*w.fareBonus/5)*5);
 const preference=pick(RIDE_PREFERENCES);
 const offer={id:++RIDE.sequence,pickup:{...pickup},dest:{...dest},name:pick(DRIVER_NAMES),pType:pick(PASSENGER_TYPES),preference,fare:Math.round(fare*(preference.id==='fast'?1.08:1)),distance:Math.round(route.length),pickupDistance:Math.round(approach.length),minutes:Math.max(1,Math.ceil(route.length/12/60)),route};
 RIDE.offer=offer;RIDE.offerLeft=22;RIDE.expanded=true;RIDE.notice='طلب رحلة جديد';
 sfxPickup();renderDriverPhone(true);return offer;
}
function acceptRideOffer(){
 if(!RIDE.offer||RIDE.offerLeft<=0||rideBusy()||G.state!=='play')return false;
 const o=RIDE.offer;
 M.phase='toPick';M.pickupX=o.pickup.x;M.pickupZ=o.pickup.z;M.pickupName=o.pickup.name;M.pickupRoad=o.pickup.roadIndex;
 M.destX=o.dest.x;M.destZ=o.dest.z;M.destName=o.dest.name;M.destRoad=o.dest.roadIndex;
 M.pType=o.pType;M.preference=o.preference;M.riderName=o.name;M.baseFare=o.fare;M.fare=o.fare;M.quotedFare=o.fare;M.tripDistance=o.distance;M.offerId=o.id;
 M.hits=0;M.speedViolations=0;M.comfortPenalty=0;M.hold=0;M.tripTime=0;M.timer=0;M.boss=false;M.after=null;M.respawn=0;
 RIDE.offer=null;RIDE.offerLeft=0;RIDE.receipt=null;RIDE.navTimer=0;
 passenger.position.set(M.pickupX,assyutRoadHeightAt(M.pickupX,M.pickupZ)+.18,M.pickupZ);passenger.visible=true;
 pickupMarker.position.set(M.pickupX,navigationStopHeight({x:M.pickupX,z:M.pickupZ,roadIndex:M.pickupRoad})+.08,M.pickupZ);pickupMarker.visible=true;destMarker.visible=false;
 refreshRideNavigation();RIDE.notice='في الطريق إلى الراكب';
 renderDriverPhone(true);updateHUD();setObjective(`توجّه إلى <b>${M.pickupName}</b> لاستلام ${M.riderName}`,4000);return true;
}
function rejectRideOffer(expired=false){
 if(!RIDE.offer)return false;
 RIDE.offer=null;RIDE.offerLeft=0;RIDE.declined++;RIDE.nextIn=rand(8,16);RIDE.expanded=false;
 RIDE.notice=expired?'انتهت مهلة الطلب — نبحث عن رحلة أخرى':'تم رفض الطلب — نبحث عن رحلة أخرى';
 renderDriverPhone(true);return true;
}
function boardRidePassenger(){
 if(M.phase!=='toPick')return false;
 const d=Math.hypot(car.x-M.pickupX,car.z-M.pickupZ);
 if(d>=7||Math.abs(car.y-navigationStopHeight({x:M.pickupX,z:M.pickupZ,roadIndex:M.pickupRoad}))>=1||Math.hypot(car.vel.x,car.vel.y)>=1.4)return false;
 M.phase='toDest';M.hold=0;M.tripTime=0;M.fare=M.quotedFare;
 passenger.visible=false;pickupMarker.visible=false;destMarker.position.set(M.destX,navigationStopHeight({x:M.destX,z:M.destZ,roadIndex:M.destRoad})+.08,M.destZ);destMarker.visible=true;
 refreshRideNavigation();RIDE.navTimer=0;RIDE.notice='الراكب معك — الرحلة بدأت';
 sfxPickup();renderDriverPhone(true);setObjective(`${M.riderName} ركب · الوجهة <b>${M.destName}</b> · ${fmt(M.quotedFare)} ج.م`,5000);return true;
}
function completeRideTrip(){
 if(M.phase!=='toDest')return false;
 const d=Math.hypot(car.x-M.destX,car.z-M.destZ);
 if(d>=8.5||Math.abs(car.y-navigationStopHeight({x:M.destX,z:M.destZ,roadIndex:M.destRoad}))>=1||Math.hypot(car.vel.x,car.vel.y)>=1.4)return false;
 const speedPenalty=Math.min(1,(M.speedViolations||0)/18),hitPenalty=(M.hits||0)*.25,comfortPenalty=Math.min(1.2,(M.comfortPenalty||0)/14);
 const pay=Math.round(M.quotedFare*(1-Math.min(.25,comfortPenalty*.08))),rating=clamp(+(5-hitPenalty-speedPenalty-comfortPenalty).toFixed(1),1,5);
 const receipt={id:M.offerId,pay,rating,name:M.riderName,pickup:M.pickupName,dest:M.destName,time:M.tripTime,distance:M.tripDistance,preference:M.preference};
 // End the trip before crediting it, so repeated actions cannot pay twice.
 M.phase='none';M.hold=0;M.timer=0;
 G.money+=pay;G.xp+=35;G.trips++;G.totalEarned+=pay;G.ratingTotal+=rating;G.ratedTrips++;
 RIDE.sessionEarned+=pay;RIDE.sessionTrips++;RIDE.navigation=null;RIDE.receipt=receipt;RIDE.receiptLeft=8;RIDE.nextIn=rand(12,22);RIDE.expanded=true;RIDE.notice='اكتملت الرحلة';
 passenger.visible=false;pickupMarker.visible=false;destMarker.visible=false;arrow.visible=false;arrowGlow.visible=false;
 hidePrompt();saveProgress();sfxCash();floatText(`+${fmt(pay)} ج.م`,'#8be7b8');
 renderDriverPhone(true);updateHUD();setObjective(`اكتملت الرحلة · أُضيف ${fmt(pay)} ج.م إلى محفظتك`,4000);return true;
}
function updateDriverShift(dt){
 if(RIDE.offer){RIDE.offerLeft=Math.max(0,RIDE.offerLeft-dt);if(RIDE.offerLeft<=0)rejectRideOffer(true);return;}
 if(!rideBusy()){
  if(RIDE.receipt){RIDE.receiptLeft-=dt;if(RIDE.receiptLeft<=0){RIDE.receipt=null;RIDE.expanded=false;renderDriverPhone(true);}return;}
  if(RIDE.online){RIDE.nextIn-=dt;if(RIDE.nextIn<=0)makeRideOffer();}return;
 }
 if(M.phase==='toDest'){
  M.tripTime+=dt;
  if(Math.abs(car.longAccel||0)>5.5||Math.abs(car.lateralAccel||0)>4.8)M.comfortPenalty=(M.comfortPenalty||0)+dt;
  if(Math.abs(car.speed)>20)M.speedViolations=(M.speedViolations||0)+dt;
 }
 RIDE.navTimer-=dt;if(RIDE.navTimer<=0){RIDE.navTimer=2.5;refreshRideNavigation();}
 const target=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ}:{x:M.destX,z:M.destZ};
 const d=Math.hypot(target.x-car.x,target.z-car.z),stopped=Math.hypot(car.vel.x,car.vel.y)<1.4&&Math.abs(car.y-navigationStopHeight({...target,roadIndex:M.phase==='toPick'?M.pickupRoad:M.destRoad}))<1,near=d<(M.phase==='toPick'?7:8.5);
 if(near&&stopped){M.hold+=dt;showPrompt(M.phase==='toPick'?'انتظر لحظة… الراكب يركب':'انتظر لحظة… إنهاء الرحلة');if(M.hold>=1.1){if(M.phase==='toPick')boardRidePassenger();else completeRideTrip();}}
 else{M.hold=0;if(d<15)showPrompt(M.phase==='toPick'?'قف بجوار الراكب لبدء الرحلة':'قف بأمان لإنهاء الرحلة');else hidePrompt();}
}
function fleetTransaction(action,value){
 if(rideBusy())return {ok:false,message:'أكمل الرحلة أولًا قبل استخدام الصيانة'};
 const c=CARS[G.carIdx]||CARS[0];let amount=0;if(c.police&&action==='paint')return {ok:false,message:'طلاء الدورية الرسمي ثابت'};
 if(action==='repair'){
  amount=repairPrice();if(amount<=0)return {ok:false,message:'العربية بحالة ممتازة'};
  if(G.money<amount)return {ok:false,message:'رصيدك لا يكفي للإصلاح'};
  G.money-=amount;G.conditions[c.id]=100;
 }else if(action==='paint'){
  const paint=CAR_PAINTS.find(p=>p.id===value);if(!paint)return {ok:false,message:'لون غير متاح'};
  const hex=paint.hex??c.color1,current=G.paints[c.id]??c.color1;
  if(current===hex)return {ok:false,message:'هذا هو لون العربية الحالي'};
  amount=PAINT_PRICE;if(G.money<amount)return {ok:false,message:'رصيدك لا يكفي للطلاء'};
  G.money-=amount;if(paint.hex===null)delete G.paints[c.id];else G.paints[c.id]=paint.hex;
 }else if(action==='buy'||action==='select'){
  const i=Number(value),next=CARS[i];if(next?.uploaded&&MODEL_PACKED[next.asset]&&!importedModels.loaded[next.asset])return {ok:false,loading:true,message:'جاري تحميل السيارة'};if(next?.available===false)return {ok:false,message:'أضف ملف السيارة الأصلي GLB أولًا'};if(!Number.isInteger(i)||!next)return {ok:false,message:'عربية غير متاحة'};
  if(action==='buy'){
   if(G.owned.includes(next.id))return {ok:false,message:'العربية ملكك بالفعل'};
   amount=next.price;if(G.money<amount)return {ok:false,message:'رصيدك لا يكفي لشراء العربية'};
   G.money-=amount;G.owned.push(next.id);G.conditions[next.id]=100;
  }else if(!G.owned.includes(next.id))return {ok:false,message:'اشترِ العربية أولًا'};
  G.carIdx=i;if(next.police)store.set("assyut_police_vehicle",next.id);
 }else return {ok:false,message:'عملية غير متاحة'};
 car.speed=0;car.vel.set(0,0);car.steer=0;car.yawRate=0;car.wheelAngle=0;
 saveProgress();swapTaxi(G.carIdx);applyCarStats();updateHUD();return {ok:true,amount,message:action==='repair'?'تم إصلاح العربية بالكامل':action==='paint'?'تم تغيير لون العربية':action==='buy'?'مبروك العربية الجديدة':'تم اختيار العربية'};
}
