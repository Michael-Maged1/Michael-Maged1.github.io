function drawBuildingFootprint(ctx,b,tx,tz,scale){
 if(!b.oriented){ctx.fillRect(tx(b.x0),tz(b.z0),(b.x1-b.x0)*scale,(b.z1-b.z0)*scale);return;}
 const o=b.oriented,c=Math.cos(o.heading),s=Math.sin(o.heading);ctx.beginPath();[[-o.hl,-o.hw],[o.hl,-o.hw],[o.hl,o.hw],[-o.hl,o.hw]].forEach(([x,z],i)=>{const px=tx(o.x+c*x+s*z),pz=tz(o.z-s*x+c*z);if(i)ctx.lineTo(px,pz);else ctx.moveTo(px,pz);});ctx.closePath();ctx.fill();
}
/* Driver phone: UI changes never pause driving or silently accept a request. */
let driverPhoneSignature='';
function driverRating(){return G.ratedTrips>0?(G.ratingTotal/G.ratedTrips).toFixed(2):'5.00';}
function driverStateTitle(){return RIDE.offer?'طلب رحلة جديد':M.phase==='toPick'?'التوجّه إلى الراكب':M.phase==='toDest'?'رحلة جارية':RIDE.receipt?'تم الوصول':'أنت متصل';}
function renderDriverPhone(force=false){
 const phone=$('driverPhone'),chip=$('driverPhoneChip'),playing=G.mode==='rides'&&G.state==='play';
 phone.classList.toggle('phoneHidden',!playing||!RIDE.expanded);chip.classList.toggle('hidden',!playing||RIDE.expanded);
 const chipText=rideBusy()?(M.phase==='toPick'?'في الطريق للراكب':'رحلة جارية'):RIDE.offer?'طلب جديد':RIDE.notice||'متصل · في انتظار الرحلات';
 $('driverChipText').textContent=chipText;
 const signature=[RIDE.offer?.id||0,M.phase,RIDE.receipt?.id||0,RIDE.online,RIDE.expanded,G.carIdx].join(':');
 if(!force&&signature===driverPhoneSignature)return;driverPhoneSignature=signature;
 const header=`<div class="phoneNotch"></div><div class="phoneStatus"><span>${String(Math.floor(G.clock/60)%24).padStart(2,'0')}:${String(Math.floor(G.clock%60)).padStart(2,'0')}</span><span>● ▰</span></div><div class="phoneAppHead"><div><b>Uber <span>Driver</span></b><small>أسيوط · ${driverStateTitle()}</small></div><button data-driver-act="collapse" aria-label="تصغير الهاتف">−</button></div>`;
 let content='',actions='';
 if(RIDE.offer){const o=RIDE.offer;content=`
  <div class="requestLabel"><span class="onlineDot"></span> طلب جديد <span class="rideProduct">UberX</span></div>
  <div class="quoteAmount">${fmt(o.fare)} <small>ج.م</small></div><div class="quoteNote">صافي أجرة الرحلة · تُضاف بعد التوصيل</div>
  <canvas id="ridePhoneMap" width="560" height="270" aria-label="خريطة تعرض نقطة الركوب ونقطة الوصول"></canvas>
  <div class="rideStops"><div><i class="pickupDot"></i><span><small>نقطة الركوب · ${o.name}</small><b>${o.pickup.name}</b></span></div><div><i class="dropDot"></i><span><small>الوجهة</small><b>${o.dest.name}</b></span></div></div>
  <div class="rideSafety">${o.preference?.icon||'💬'} ${o.preference?.label||'طلب عادي'} · ${o.pType?.name||'راكب'}</div>
  <div class="requestMeta"><span>${formatDist(o.distance)} · نحو ${o.minutes} د</span><span>يبعد ${formatDist(o.pickupDistance)}</span></div>
  <div class="offerTimer"><i id="offerTimeBar"></i></div><div class="offerTimeText">ينتهي الطلب خلال <b id="offerSeconds">22</b> ث</div>
  `;
  actions='<div class="requestActions"><button class="acceptRide" data-driver-act="accept">قبول الرحلة <kbd>1</kbd></button><button class="declineRide" data-driver-act="reject">رفض <kbd>2</kbd></button></div>';
 }else if(rideBusy()){
  const pickup=M.phase==='toPick',target=pickup?M.pickupName:M.destName;
  content=`<div class="activeRideTag">${pickup?'توجّه لنقطة الركوب':'الراكب معك'}</div><div class="activeRider"><span>${M.pType?.icon||'◉'}</span><div><b>${M.riderName}</b><small>${pickup?'ينتظرك في '+M.pickupName:'إلى '+M.destName}</small></div><strong>${fmt(M.quotedFare)}<small>ج.م</small></strong></div><div class="rideSafety">${M.preference?.icon||'💬'} ${M.preference?.label||'طلب عادي'}</div>
  <canvas id="ridePhoneMap" width="560" height="310" aria-label="مسار الوصول عبر الشوارع"></canvas>
  <div class="navInstruction"><span>↱</span><div><small>${pickup?'استلام الراكب':'الوجهة النهائية'}</small><b>${target}</b></div><strong id="phoneNavDistance">—</strong></div>
  <div class="rideStops compact"><div><i class="pickupDot"></i><span>${M.pickupName}</span></div><div><i class="dropDot"></i><span>${M.destName}</span></div></div>
  <div class="rideSafety">${pickup?'قف قريبًا من الراكب ليركب تلقائيًا.':'قف بأمان عند الوجهة لإنهاء الرحلة.'}</div><button class="phoneSecondary" data-driver-act="collapse">العودة للقيادة</button>`;
 }else if(RIDE.receipt){const r=RIDE.receipt;content=`<div class="rideReceiptCheck">✓</div><h3 class="rideReceiptTitle">رحلة مكتملة</h3><div class="quoteAmount">+${fmt(r.pay)} <small>ج.م</small></div><p class="receiptNote">أُضيفت الأجرة إلى محفظتك</p><div class="receiptRoute">${r.pickup} ← ${r.dest}</div><div class="receiptStats"><div><small>تقييم الراكب</small><b>★ ${r.rating.toFixed(1)}</b></div><div><small>أرباح الوردية</small><b>${fmt(RIDE.sessionEarned)} ج.م</b></div></div><div class="rideSafety">نبحث عن رحلتك التالية…</div><button class="acceptRide" data-driver-act="dismiss">متابعة القيادة</button>`;
 }else content=`<div class="onlineRadar"><i></i><span>↗</span></div><h3 class="rideReceiptTitle">جاهز للمشوار القادم</h3><p class="receiptNote">تحرّك في المدينة. ستظهر الطلبات هنا أثناء القيادة.</p><canvas id="ridePhoneMap" width="560" height="245" aria-label="موقعك الحالي في المدينة"></canvas><div class="receiptStats"><div><small>أرباح الوردية</small><b>${fmt(RIDE.sessionEarned)} ج.م</b></div><div><small>رحلات الوردية</small><b>${RIDE.sessionTrips}</b></div></div><div class="rideSafety">${RIDE.notice||'أنت متصل — نبحث عن ركاب قريبين'}</div>`;
 phone.innerHTML=header+`<div class="phoneBody">${content}</div>${actions}<div class="phoneHomeBar"></div>`;
 drawDriverPhoneMap();
}
function updateDriverPhone(){
 renderDriverPhone();
 if(RIDE.offer){const seconds=$('offerSeconds'),bar=$('offerTimeBar');if(seconds)seconds.textContent=Math.ceil(RIDE.offerLeft);if(bar)bar.style.width=(RIDE.offerLeft/22*100)+'%';}
 if(rideBusy()){
  const target=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ}:{x:M.destX,z:M.destZ};
  const d=$('phoneNavDistance');if(d)d.textContent=formatDist(RIDE.navigation?.remaining??RIDE.navigation?.length??Math.hypot(target.x-car.x,target.z-car.z));
 }
 const menuCar=$('menuDriverCar');if(menuCar)menuCar.textContent=(CARS[G.carIdx]||CARS[0]).name;
 const cond=$('carCondition'),earn=$('shiftEarned'),rating=$('driverRating'),menuMoney=$('menuDriverMoney');
 if(cond)cond.textContent=Math.round(currentCarCondition())+'%';if(earn)earn.textContent=fmt(RIDE.sessionEarned);if(rating)rating.textContent=driverRating();if(menuMoney)menuMoney.textContent=fmt(G.money);
 if(RIDE.expanded&&G.state==='play')drawDriverPhoneMap();
}
function drawDriverPhoneMap(){
 const canvas=$('ridePhoneMap');if(!canvas||!RIDE.expanded)return;
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 let route,from,to;
 if(RIDE.offer){route=RIDE.offer.route.points;from=RIDE.offer.pickup;to=RIDE.offer.dest;}
 else if(rideBusy()){route=remainingNavigationPoints();from={x:car.x,z:car.z};to=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ}:{x:M.destX,z:M.destZ};}
 else{from={x:car.x-150,z:car.z-85};to={x:car.x+150,z:car.z+85};route=[];}
 const all=[from,to,...route];let x0=Math.min(...all.map(p=>p.x)),x1=Math.max(...all.map(p=>p.x)),z0=Math.min(...all.map(p=>p.z)),z1=Math.max(...all.map(p=>p.z));
 const scale=Math.min((W-72)/Math.max(140,x1-x0),(H-60)/Math.max(95,z1-z0)),cx=(x0+x1)/2,cz=(z0+z1)/2;
 const tx=x=>(x-cx)*scale+W/2,ty=z=>(z-cz)*scale+H/2;
 ctx.fillStyle='#e8ece7';ctx.fillRect(0,0,W,H);

 ctx.fillStyle='#d5dcd3';for(const b of MAP.buildings){const x=tx(b.x0),y=ty(b.z0),w=(b.x1-b.x0)*scale,h=(b.z1-b.z0)*scale;if(x+w<0||x>W||y+h<0||y>H)continue;drawBuildingFootprint(ctx,b,tx,ty,scale);}
 ctx.lineCap='round';
 for(const road of ASSYUT.roads){ctx.strokeStyle='#fafbf8';ctx.lineWidth=Math.max(2,road.width*scale);ctx.beginPath();road.points.forEach((p,i)=>i?ctx.lineTo(tx(p.x),ty(p.z)):ctx.moveTo(tx(p.x),ty(p.z)));ctx.stroke();}
 if(route.length){for(const [color,width]of[['#ffffff',9],['#173e32',5]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();route.forEach((p,i)=>i?ctx.lineTo(tx(p.x),ty(p.z)):ctx.moveTo(tx(p.x),ty(p.z)));ctx.stroke();}}
 const dot=(p,color,r=7)=>{ctx.beginPath();ctx.arc(tx(p.x),ty(p.z),r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();};
 if(RIDE.offer){dot(from,'#19734c');ctx.fillStyle='#141d1a';ctx.fillRect(tx(to.x)-6,ty(to.z)-6,12,12);}
 else if(rideBusy())dot(to,M.phase==='toPick'?'#19734c':'#151d1a');
 const carX=tx(car.x),carZ=ty(car.z);if(carX>-10&&carX<W+10&&carZ>-10&&carZ<H+10)dot(car,'#4278c8',6);
 ctx.fillStyle='#64716a';ctx.font='15px Tahoma';ctx.textAlign='left';ctx.fillText('N ↑',14,24);
}
$('driverPhone').addEventListener('click',e=>{
 const button=e.target.closest('[data-driver-act]');if(!button)return;
 const action=button.dataset.driverAct;
 if(action==='accept')acceptRideOffer();else if(action==='reject')rejectRideOffer();
 else if(action==='collapse'){RIDE.expanded=false;renderDriverPhone(true);}
 else if(action==='dismiss'){RIDE.receipt=null;RIDE.receiptLeft=0;RIDE.expanded=false;renderDriverPhone(true);}
});
$('driverPhoneChip').addEventListener('click',()=>{RIDE.expanded=true;renderDriverPhone(true);});
addEventListener('keydown',e=>{
 if(G.state!=='play'||G.mode!=='rides'||e.repeat)return;
 if(e.code==='Digit1'&&RIDE.offer){e.preventDefault();acceptRideOffer();}
 if(e.code==='Digit2'&&RIDE.offer){e.preventDefault();rejectRideOffer();}
 if(e.code==='KeyF'){RIDE.expanded=!RIDE.expanded;renderDriverPhone(true);}
});
