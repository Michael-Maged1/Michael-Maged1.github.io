const POLICE={phase:'off',uberCarIdx:G.carIdx,nextIn:8,patrolTime:0,navTimer:0,hold:0,call:null,station:null,siren:false,completed:+store.get('assyut_police_completed','0')||0,nextStation:+store.get('assyut_police_next_station',String((+store.get('assyut_police_completed','0')||0)%2))%2,earned:0,clipToken:0,clipDone:false,actors:[],stations:[]};
function policeBusy(){return G.mode==='police'&&!['off','patrol'].includes(POLICE.phase);}
function policeTarget(){return POLICE.phase==='pursuit'&&POLICE.suspect?.mesh?{x:POLICE.suspect.mesh.position.x,z:POLICE.suspect.mesh.position.z,roadIndex:POLICE.suspect.edge?.road}:POLICE.phase==='respond'?POLICE.call?.stop:POLICE.phase==='transport'?POLICE.station?.stop:null;}
function navigablePoliceStop(point){let best=null;for(const seg of ASSYUT.segments){if(INFRA.profiles.has(seg.road)||!ASSYUT.navigableNodes.has(seg.aNode)||!ASSYUT.navigableNodes.has(seg.bNode))continue;const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,t=clamp(((point.x-seg.a.x)*dx+(point.z-seg.a.z)*dz)/(seg.length*seg.length),0,1),p={x:seg.a.x+dx*t,z:seg.a.z+dz*t},dist=Math.hypot(p.x-point.x,p.z-point.z);if(!best||dist<best.dist)best={dist,p,seg};}if(!best)return assyutRoadStop(point);const s=best.seg,dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length,offset=Math.max(.5,s.width/2-2),side=ASSYUT.roads[s.road].oneway==='-1'?-1:1;return{x:best.p.x-dz*offset*side,z:best.p.z+dx*offset*side,roadIndex:s.road};}
function createPoliceStations(){
 const definitions=[{name:'قسم أول',lat:27.1719625,lon:31.180828125},{name:'قسم ثاني',lat:27.1822362,lon:31.1969446}];
 for(let i=0;i<definitions.length;i++){
  const d=definitions[i],entrance=stationEntranceCandidate(i,POLICE.stations[0]);if(!entrance)throw Error('No clear station entrance');const {cx,cz,yaw}=entrance;
  for(let j=REAL_CITY.buildings.length-1;j>=0;j--){const b=REAL_CITY.buildings[j];if(Math.abs(b.x-cx)<b.w/2+20&&Math.abs(b.z-cz)<b.d/2+20){REAL_CITY.group.remove(b.mesh);REAL_CITY.buildings.splice(j,1);for(let k=MAP.buildings.length-1;k>=0;k--){const m=MAP.buildings[k];if(Math.abs((m.x0+m.x1)/2-b.x)<.1&&Math.abs((m.z0+m.z1)/2-b.z)<.1)MAP.buildings.splice(k,1);}}}
  for(const mesh of REAL_CITY.group.children.slice())if(mesh.isMesh&&['BoxGeometry','CylinderGeometry'].includes(mesh.geometry.type)&&Math.hypot(mesh.position.x-cx,mesh.position.z-cz)<22)REAL_CITY.group.remove(mesh);
  for(let j=ROAD_FURNITURE.length-1;j>=0;j--)if(Math.hypot(ROAD_FURNITURE[j].x-cx,ROAD_FURNITURE[j].z-cz)<22)ROAD_FURNITURE.splice(j,1);
  const group=makePoliceStationBuilding(d.name);group.position.set(cx,0,cz);group.rotation.y=yaw;REAL_CITY.group.add(group);
  const ex=Math.abs(Math.cos(yaw))*8+Math.abs(Math.sin(yaw))*5.5,ez=Math.abs(Math.sin(yaw))*8+Math.abs(Math.cos(yaw))*5.5;MAP.buildings.push({x0:cx-ex,x1:cx+ex,z0:cz-ez,z1:cz+ez,h:10.3,oriented:{x:cx,z:cz,heading:yaw,hl:8,hw:5.5}});
  STATION_SURFACES.push({x:cx,z:cz,yaw});
  const station={...d,...entrance,x:cx,z:cz,building:group};POLICE.stations.push(station);createStationArrivalBay(station);addMountedRoadSign(d.name+' ←',{x:station.stop.x-station.tx*22,z:station.stop.z-station.tz*22});
 }
}

function preparePoliceMode(mode){
 if(mode==='police'){if(G.mode!=='police')POLICE.uberCarIdx=G.carIdx;G.carIdx=CARS.indexOf(selectedPoliceVehicle());if(!G.owned.includes(CARS[G.carIdx].id))G.owned.push(CARS[G.carIdx].id);swapTaxi(G.carIdx);}
 else if(G.mode==='police'){G.carIdx=POLICE.uberCarIdx;swapTaxi(G.carIdx);stopPoliceShift();}
}
function clearPoliceSuspect(){if(!POLICE.suspect)return;const i=traffic.indexOf(POLICE.suspect);if(i>=0)traffic.splice(i,1);if(POLICE.suspect.mesh)scene.remove(POLICE.suspect.mesh);POLICE.suspect=null;}
function stopPoliceShift(){
 stopPoliceLiveClip();
 if(typeof clearPoliceActors==='function')clearPoliceActors();
 clearPoliceSuspect();
 POLICE.phase='off';
 POLICE.siren=false;
 POLICE.clipToken++;
 if(typeof destMarker!=='undefined')destMarker.visible=false;
 const panel=$('policeMovie');
 if(panel){panel.classList.add('hidden');panel.innerHTML='';}
 const dispatch=$('policeDispatch');
 if(dispatch)dispatch.classList.add('hidden');
 updateHUD();
}
function startPoliceShift(){clearDriverRequest();POLICE.phase='patrol';POLICE.nextIn=8;POLICE.patrolTime=0;POLICE.call=null;POLICE.station=null;POLICE.hold=0;POLICE.siren=false;POLICE.earned=0;M.phase='none';RIDE.navigation=null;setObjective('دورية شرطة أسيوط · تحرّك وانتظر البلاغ · J للتحكم بالسرينة',5000);renderPoliceDispatch();updateHUD();}
function issuePoliceCall(){
 if(POLICE.phase!=='patrol'||G.mode!=='police')return false;
 const stop=nearbyNavigationStop({x:car.x,z:car.z,roadIndex:car.surfaceRoad},60,350);if(!stop)return false;
 const station=POLICE.stations[POLICE.nextStation];if(!station)return false;
 const incidents=[
  {id:'brawl',label:'مشاجرة واعتداء في الطريق العام',speed:0},
  {id:'stolen',label:'ضبط سيارة مسروقة ومحاصرة الجناة',speed:0},
  {id:'checkpoint',label:'اشتباه واستيقاف أمني بالشارع',speed:0}
 ];
 const incident=pick(incidents);
 POLICE.call={...stop,stop,count:2,type:incident.id,label:incident.label};
 POLICE.station=station;
 POLICE.phase='respond';
 POLICE.siren=true;
 POLICE.hold=0;
 M.phase='policeScene';
 pickupMarker.visible=false;
 destMarker.position.set(stop.x,navigationStopHeight(stop)+.08,stop.z);
 destMarker.visible=true;

 if(typeof spawnPoliceCrimeScene==='function')spawnPoliceCrimeScene(stop,incident);

 refreshPoliceNavigation();
 setObjective(`🚨 ${incident.label} · توجّه للموقع فوراً لتأمين المكان والقبض على المشتبه بهم`,5000);
 sfxPickup();
 renderPoliceDispatch();
 updateHUD();
 return true;
}
function refreshPoliceNavigation(){const target=policeTarget();if(!target){RIDE.navigation=null;return;}setNavigationTarget(target);POLICE.navTimer=2.5;}
function playPoliceClip(type){
 if(!['pursuit','respond','transport'].includes(POLICE.phase))return false;
 POLICE.phase=type==='arrest'?'arrestVideo':'handoffVideo';
 POLICE.siren=false;
 POLICE.clipDone=false;
 const token=++POLICE.clipToken;
 car.speed=0;car.vel.set(0,0);
 G.state='cinematic';
 pickupMarker.visible=false;destMarker.visible=false;
 for(const a of POLICE.actors)if(a)a.visible=false;
 updateHUD();

 const film=policeFilmFor(CARS[G.carIdx].id,type,POLICE.station);
 const panel=$('policeMovie');
 if(!panel)return false;
 const title=type==='arrest'?'تأمين الموقع والقبض على المشتبه بهم':`تسليم المشتبه بهم إلى ${POLICE.station?.name||'قسم الشرطة'}`;

 panel.innerHTML=`
  <video id="policeMovieVideo" playsinline preload="auto"></video>
  <div class="policeMovieInner">
   <div class="policeMovieHeader">
    <span class="policeMovieBadge">🚨 ${film?'مشهد تمثيلي':'مشهد ثلاثي الأبعاد'}</span>
    <h2 class="policeMovieTitle">${title}</h2>
   </div>
   <div class="policeMovieFooter">
    <button id="policeMovieMute" class="policeMovieBtn policeMovieMuteBtn">🔊 تشغيل الصوت</button>
    <button id="policeMovieSkip" class="policeMovieBtn">متابعة الدورية ⏭</button>
   </div>
  </div>`;
 panel.classList.remove('hidden');

 let clipTimer=null;
 const cleanupAndFinish=()=>{
  if(clipTimer){clearTimeout(clipTimer);clipTimer=null;}
  finishPoliceClip(token);
 };
 const skipBtn=$('policeMovieSkip');
 if(skipBtn)skipBtn.onclick=cleanupAndFinish;

 if(!film){
  playPoliceLiveClip(type,token);
  renderPoliceDispatch();
  return true;
 }

 const video=$('policeMovieVideo');
 const muteBtn=$('policeMovieMute');
 if(!video){
  playPoliceLiveClip(type,token);
  renderPoliceDispatch();
  return true;
 }

 video.src=film.src;
 video.muted=!G.sound;
 if(muteBtn){
  muteBtn.textContent=video.muted?'🔇 الصوت مكتوم':'🔊 كتم الصوت';
  muteBtn.onclick=()=>{
   video.muted=!video.muted;
   muteBtn.textContent=video.muted?'🔇 الصوت مكتوم':'🔊 كتم الصوت';
  };
 }

 video.onended=cleanupAndFinish;
 video.onerror=e=>{
  console.warn('Police video error, falling back to 3D clip',e);
  if(!POLICE.clipDone&&token===POLICE.clipToken){
   playPoliceLiveClip(type,token);
  }
 };

 if(typeof video.play==='function'){
  const p=video.play();
  if(p&&typeof p.catch==='function'){
   p.catch(err=>{
    console.warn('Police video autoplay with sound blocked, trying muted',err);
    video.muted=true;
    if(muteBtn)muteBtn.textContent='🔇 اضغط لتشغيل الصوت';
    if(typeof video.play==='function'){
     video.play().catch(err2=>{
      console.warn('Muted autoplay failed, switching to 3D clip',err2);
      playPoliceLiveClip(type,token);
     });
    }
   });
  }
 }

 clipTimer=setTimeout(()=>{
  if(!POLICE.clipDone&&token===POLICE.clipToken&&(!video.currentTime||video.currentTime<0.1)){
   console.warn('Police video timed out, switching to 3D live clip');
   playPoliceLiveClip(type,token);
  }
 },4000);

 renderPoliceDispatch();
 return true;
}
function finishPoliceClip(token=POLICE.clipToken){
 if(token!==POLICE.clipToken||POLICE.clipDone||!['arrestVideo','handoffVideo'].includes(POLICE.phase))return false;
 stopPoliceLiveClip();
 POLICE.clipDone=true;
 const panel=$('policeMovie');
 if(panel){
  panel.classList.add('hidden');
  panel.innerHTML='';
 }
 G.state='play';
 POLICE.hold=0;

 if(POLICE.phase==='arrestVideo'){
  if(typeof clearPoliceActors==='function')clearPoliceActors();
  clearPoliceSuspect();
  POLICE.phase='transport';
  POLICE.siren=true;
  M.phase='policeReturn';
  RIDE.navigation=null;
  const p=POLICE.station.stop;
  destMarker.position.set(p.x,navigationStopHeight(p)+.08,p.z);
  destMarker.visible=true;
  refreshPoliceNavigation();
  if(typeof spawnPoliceStationOfficers==='function')spawnPoliceStationOfficers(POLICE.station);
  setObjective(`تم تأمين الموقع · انقل المشتبه بهم فوراً إلى ${POLICE.station.name}`,5000);
 }else{
  if(typeof clearPoliceActors==='function')clearPoliceActors();
  POLICE.phase='patrol';
  POLICE.siren=false;
  M.phase='none';
  POLICE.completed++;
  POLICE.nextStation=1-POLICE.stations.indexOf(POLICE.station);
  store.set('assyut_police_next_station',POLICE.nextStation);
  POLICE.earned+=180;
  G.money+=180;
  G.xp+=65;
  store.set('assyut_police_completed',POLICE.completed);
  saveProgress();
  RIDE.navigation=null;
  destMarker.visible=false;
  POLICE.nextIn=rand(12,20);
  sfxCash();
  setObjective('تم التسليم بنجاح · مكافأة المهمة 180 ج.م · استأنف الدورية',5000);
 }
 renderPoliceDispatch();
 updateHUD();
 return true;
}
function updatePoliceMission(dt){
 if(G.mode!=='police')return;
 POLICE.navTimer-=dt;
 if(POLICE.phase==='patrol'){
  POLICE.patrolTime+=dt;POLICE.nextIn-=dt;
  if(POLICE.nextIn<=0&&(Math.abs(car.speed)>.5||POLICE.patrolTime>18))issuePoliceCall();
  return;
 }
 if(typeof updatePoliceActors==='function')updatePoliceActors(dt);

 const target=policeTarget();
 if(!target)return;
 if(POLICE.navTimer<=0)refreshPoliceNavigation();
 const distance=Math.hypot(target.x-car.x,target.z-car.z),stopped=Math.hypot(car.vel.x,car.vel.y)<1.2;

 if(POLICE.phase==='respond'){
  if(distance<10&&Math.abs(car.y-navigationStopHeight(target))<2.2&&stopped){
   POLICE.hold+=dt;
   showPrompt(`🚨 جاري تأمين الموقع ونقل المتهمين إلى الدورية (${Math.min(100,Math.round((POLICE.hold/1.0)*100))}%)`);
   if(POLICE.hold>=1.0)playPoliceClip('arrest');
  }else{
   POLICE.hold=0;
   if(distance<30)showPrompt('اقترب من القوة الأمنية وتوقّف لتأمين الموقع واستلام المقبوض عليهم');
   else hidePrompt();
  }
 }else if(POLICE.phase==='transport'){
  if(policeStationArrival(POLICE.station)&&stopped){
   POLICE.hold+=dt;
   showPrompt(`🚨 جاري تسليم المقبوض عليهم أمام ${POLICE.station.name} (${Math.min(100,Math.round((POLICE.hold/1.0)*100))}%)`);
   if(POLICE.hold>=1.0)playPoliceClip('handoff');
  }else{
   POLICE.hold=0;
   if(distance<28)showPrompt('قف داخل منطقة التسليم المحددة أمام '+POLICE.station.name);
   else hidePrompt();
  }
 }
}
function renderPoliceDispatch(){const panel=$('policeDispatch');if(!panel)return;const active=G.mode==='police'&&G.state!=='menu';panel.classList.toggle('hidden',!active);if(!active)return;const target=policeTarget(),distance=target?Math.round(RIDE.navigation?.remaining??Math.hypot(target.x-car.x,target.z-car.z)):0;const title=POLICE.phase==='patrol'?'دورية جارية · انتظار بلاغ':POLICE.phase==='pursuit'?'🚨 مطاردة جارية':POLICE.phase==='respond'?'🚨 بلاغ جديد':'التسليم: '+POLICE.station.name;panel.innerHTML=`<small>شرطة أسيوط · غرفة العمليات</small><b>${title}</b><span>${POLICE.phase==='pursuit'?(POLICE.call?.label||'مشتبه به هارب'):POLICE.phase==='respond'?POLICE.call.name:POLICE.phase==='patrol'?'تحرّك داخل المدينة':POLICE.station.name}${target?' · '+distance+' م':''}</span><small>مهمات مكتملة ${POLICE.completed} · J للسرينة · K لتغيير النغمة</small>`;}
createPoliceStations();ROUTE_OBSTACLES.version=-1;
addEventListener('keydown',e=>{
  if(G.mode==='police'&&G.state==='play'){
    if(e.code==='KeyJ'&&!e.repeat){POLICE.siren=!POLICE.siren;updateHUD();}
    if(e.code==='KeyK'&&!e.repeat&&POLICE.siren){
      const tones=['auto','wail','yelp','hilo'];
      const nextIdx=(tones.indexOf(POLICE.sirenTone||'auto')+1)%tones.length;
      POLICE.sirenTone=tones[nextIdx];
      const names={auto:'تلقائي ذكي (حسب السرعة والدورية)',wail:'عويل كلاسيكي (Wail)',yelp:'يلب سريع (Yelp)',hilo:'ثنائية النغمة (Hi-Lo)'};
      if(typeof showPrompt==='function'){
        showPrompt(`🚨 نغمة السرينة: ${names[POLICE.sirenTone]}`);
        setTimeout(()=>{if(typeof hidePrompt==='function')hidePrompt();},2200);
      }
      updateHUD();
    }
  }
});

function stopPoliceLiveClip(){if(POLICE.liveFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(POLICE.liveFrame);POLICE.liveFrame=0;if(POLICE.movieRenderer){POLICE.movieRenderer.domElement.remove();POLICE.movieRenderer.dispose();POLICE.movieRenderer.forceContextLoss();POLICE.movieRenderer=null;}}
function playPoliceLiveClip(kind,token){
 stopPoliceLiveClip();
 const panel=$('policeMovie');
 if(!panel)return;
 const badge=panel.querySelector?.('.policeMovieBadge')||panel.querySelector?.('small');
 if(badge)badge.textContent='🚨 مشهد ثلاثي الأبعاد';

 const movie=createPoliceMovie(kind,POLICE.station?.name||'قسم أول'),renderer=new THREE.WebGLRenderer({antialias:true}),scale=Math.min(1,1280/innerWidth,720/innerHeight);
 renderer.setSize(Math.round(innerWidth*scale),Math.round(innerHeight*scale));
 movie.camera.aspect=innerWidth/innerHeight;
 movie.camera.updateProjectionMatrix();
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.domElement.style='position:absolute;inset:0;display:block;width:100vw;height:100dvh;object-fit:cover;z-index:1;';
 POLICE.movieRenderer=renderer;
 const video=$('policeMovieVideo');
 if(video)video.replaceWith(renderer.domElement);
 else panel.prepend(renderer.domElement);
 const skipBtn=$('policeMovieSkip');
 if(skipBtn)skipBtn.onclick=()=>finishPoliceClip(token);
 const start=performance.now();
 const frame=()=>{if(token!==POLICE.clipToken||POLICE.clipDone||!POLICE.movieRenderer)return;const t=Math.min(6,(performance.now()-start)/1000);movie.update(t);renderer.render(movie.scene,movie.camera);if(t>=6){finishPoliceClip(token);return;}POLICE.liveFrame=requestAnimationFrame(frame);};
 POLICE.liveFrame=requestAnimationFrame(frame);
}
