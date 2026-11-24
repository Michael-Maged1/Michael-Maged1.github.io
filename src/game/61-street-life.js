/* Traffic follows the directed OSM road graph, in metres and seconds. */
const STREET_LIFE={time:0,overtakes:0,stops:0,pedestrianYields:0,version:3,blockedMoves:0};
function lifeRoad(edge){return ASSYUT.roads[edge.road];}
function edgeFrame(edge){const a=ASSYUT.nodes[edge.a],b=ASSYUT.nodes[edge.b],length=Math.hypot(b.x-a.x,b.z-a.z);return {a,b,length,fx:(b.x-a.x)/length,fz:(b.z-a.z)/length};}
const TRAFFIC_MODELS_EXTRA=['traffic_peugeot405','traffic_corolla','traffic_logan','traffic_lada','traffic_tucson','traffic_hilux','traffic_sprinter','traffic_hiace'];
function chooseNextEdge(t){
 const choices=ASSYUT.adj[t.edge.b].map(a=>ASSYUT.edges[a.edge]).filter(e=>e&&ASSYUT.roads[e.road].width>=(t.kind==='bus'?10:6));
 const forward=choices.filter(e=>e.b!==t.edge.a),list=forward.length?forward:choices;
 if(!list.length)return null;
 const old=edgeFrame(t.edge);
 const scored=list.map(e=>{const f=edgeFrame(e),dot=old.fx*f.fx+old.fz*f.fz;return {e,dot,score:dot+Math.random()*.75};}).filter(x=>x.dot>-.55);
 const pool=scored.length?scored:list.map(e=>{const f=edgeFrame(e);return {e,dot:0,score:old.fx*f.fx+old.fz*f.fz+Math.random()*.75};});
 pool.sort((a,b)=>b.score-a.score);
 return Math.random()<.22?pick(pool).e:pool[0].e;
}
function makeStreetRider(bicycle=true){
 const rider=makePerson(pick(SHIRTS),pick(SKIN));
 rider.scale.setScalar(.92);rider.rotation.order='YXZ';rider.rotation.y=Math.PI/2;rider.rotation.x=bicycle?.24:.16;
 rider.position.set(bicycle?-.18:-.16,bicycle?.01:-.04,0);
 const rig=rider.userData.walk;
 if(rig)for(let i=0;i<2;i++){rig.arms[i].rotation.x=bicycle?-1.18:-1.05;rig.legs[i].rotation.x=-.95;rig.knees[i].rotation.x=1.25;}
 rider.userData.cycleBicycle=bicycle;
 return rider;
}
function animateStreetRider(rider,phase,bicycle){
 const rig=rider?.userData?.walk;if(!rig)return;
 const tilt=bicycle?.24:.16,hx=bicycle?-.18:-.16,hy=bicycle?.82:.76,cx=bicycle?.03:.08,cy=bicycle?.33:.28,cr=bicycle?.135:.025;
 const L1=.375,L2=.380;
 for(let i=0;i<2;i++){
  const ph=phase+(i===0?0:Math.PI),px=cx+Math.cos(ph)*cr,py=cy+Math.sin(ph)*cr;
  const dx=px-hx,dy=py-hy,d=clamp(Math.hypot(dx,dy),.20,L1+L2-.02);
  const gamma=Math.atan2(dx,-dy),delta=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1));
  const interior=Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1));
  rig.legs[i].rotation.x=-(gamma+delta)-tilt;
  rig.knees[i].rotation.x=Math.PI-interior;
 }
}
function makeTwoWheeler(kind,color){
 const g=new THREE.Group(),bicycle=kind==='bicycle',r=bicycle?.35:.30,wb=bicycle?1.12:1.30;
 const rubber=new THREE.MeshStandardMaterial({color:0x15191a,roughness:.9}),metal=new THREE.MeshStandardMaterial({color:0xaab1b4,metalness:.8,roughness:.32}),paint=new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.3});
 const wheels=[];for(const x of [-wb/2,wb/2]){const w=new THREE.Group();w.position.set(x,r,0);const tire=new THREE.Mesh(new THREE.TorusGeometry(r,bicycle?.025:.075,8,24),rubber);w.add(tire);const rim=new THREE.Mesh(new THREE.TorusGeometry(r-.045,.012,6,24),metal);w.add(rim);for(let j=0;j<12;j++){const spoke=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,r*1.8,4),metal);spoke.rotation.z=j*Math.PI/6;w.add(spoke);}g.add(w);wheels.push(w);}
 const bar=(a,b,rad=.020,mat=paint)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,v.length(),8),mat);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(m);return m;};
 const seatTop=bicycle?.81:.76,bb=bicycle?[0.03,0.33,0]:[0.05,0.33,0];
 for(const [a,b]of [[[-wb/2,r,0],[-.14,.78,0]],[[-.14,.78,0],bb],[bb,[-wb/2,r,0]],[[-.14,.78,0],[.38,.84,0]],[[.38,.84,0],bb],[[.38,.84,0],[wb/2,r,0]]])bar(a,b);
 bar([-.14,.76,0],[-.17,seatTop,0],.016,metal);
 bar([.38,.84,0],[.44,.99,0],.018,metal);bar([.44,.99,-.24],[.44,.99,.24],.016,metal);
 for(const side of [-1,1]){const grip=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.10,8),rubber);grip.rotation.x=Math.PI/2;grip.position.set(.44,.99,side*.21);g.add(grip);}
 const saddle=new THREE.Mesh(new THREE.BoxGeometry(.30,.07,.17),rubber);saddle.position.set(-.18,seatTop+.02,0);g.add(saddle);
 let crank=null,pedals=[];
 if(bicycle){
  crank=new THREE.Group();crank.position.set(...bb);
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.014,14),metal);ring.rotation.x=Math.PI/2;crank.add(ring);
  for(const [side,ang]of [[-1,0],[1,Math.PI]]){
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.135,.018,.014),metal);arm.position.set(Math.cos(ang)*.067,Math.sin(ang)*.067,side*.085);arm.rotation.z=ang;crank.add(arm);
   const pad=new THREE.Mesh(new THREE.BoxGeometry(.08,.018,.055),rubber);pad.position.set(Math.cos(ang)*.135,Math.sin(ang)*.135,side*.12);crank.add(pad);pedals.push(pad);
  }
  g.add(crank);
 }else{const engine=new THREE.Mesh(new THREE.BoxGeometry(.42,.33,.34),metal);engine.position.set(0,.47,0);g.add(engine);const tank=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),paint);tank.scale.set(.28,.16,.23);tank.position.set(.18,.80,0);g.add(tank);bar([-.65,.4,.23],[-.12,.35,.23],.055,metal);}
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(bicycle?.045:.09,12,8),new THREE.MeshStandardMaterial({color:0xfff1ce,emissive:0xffc96b,emissiveIntensity:.8}));lamp.position.set(.48,.92,0);g.add(lamp);
 const rider=makeStreetRider(bicycle);animateStreetRider(rider,0,bicycle);g.add(rider);g.userData={paint:color,wheels,rider,crank,pedals,twoWheeler:true};return g;
}
function initializeStreetTraffic(){
 for(const t of traffic)scene.remove(t.mesh);traffic.length=0;
 const eligible=ASSYUT.edges.filter(e=>lifeRoad(e).width>=5&&e.length>9),near=eligible.filter(e=>Math.hypot(ASSYUT.nodes[e.a].x-ASSYUT.start.x,ASSYUT.nodes[e.a].z-ASSYUT.start.z)<260);
 let carSequence=0,extraSequence=0;
 const civilianUploaded=UPLOADED_CAR_DEFINITIONS.filter(d=>!d.police);
 // كثافة أعلى حتى لا تبدو شبكة أسيوط مهجورة، مع الحفاظ على التوزيع العشوائي.
 for(let i=0;i<170;i++){
  const r=Math.random(),kind=i===0?'bicycle':i===1?'motorcycle':r<.10?'bicycle':r<.21?'motorcycle':r<.27?'tuktuk':r<.37?'micro':r<.42?'bus':r<.71?'modern':'car';
  const color=kind==='tuktuk'?0x16181e:pick(TRAFFIC_COLORS),mesh=['bicycle','motorcycle'].includes(kind)?makeTwoWheeler(kind,color):makeTrafficCar(kind,color);
  const pool=(i<90&&near.length?near:eligible).filter(e=>kind!=='bus'||lifeRoad(e).width>=10),edge=pick(pool.length?pool:eligible),frame=edgeFrame(edge),s=rand(0,frame.length),width=lifeRoad(edge).width,offset=kind==='bicycle'?Math.max(.4,width/2-.65):Math.min(width*.26,2.3);
  const y=infrastructureEdgeHeight(edge,s),p={x:frame.a.x+frame.fx*s-frame.fz*offset,z:frame.a.z+frame.fz*s+frame.fx*offset};
  const hl=kind==='bicycle'?.90:kind==='motorcycle'?1.02:TRAFFIC_DIMS[kind][0],hw=kind==='bicycle'?.36:kind==='motorcycle'?.41:TRAFFIC_DIMS[kind][1];
  if(!trafficFootprintClear(p.x,p.z,Math.atan2(-frame.fz,frame.fx),hl+.45,hw+.12,y))continue;
  if(traffic.some(t=>Math.hypot(t.mesh.position.x-p.x,t.mesh.position.z-p.z)<8.5&&Math.abs((t.mesh.position.y||0)-y)<2.5))continue;
  if(kind==='car'||kind==='modern'){
   if(carSequence<civilianUploaded.length)mesh.userData.modelKey=civilianUploaded[carSequence++].asset;
   else if(extraSequence++%5<3)mesh.userData.modelKey=TRAFFIC_MODELS_EXTRA[(extraSequence-1)%TRAFFIC_MODELS_EXTRA.length];
   else mesh.userData.modelKey=civilianUploaded[carSequence++%civilianUploaded.length].asset;
  }else if(kind==='micro'){
   mesh.userData.modelKey=Math.random()<.60?'traffic_hiace':'traffic_sprinter';
  }else if(kind==='tuktuk')mesh.userData.modelKey='traffic_tuktuk';
  else if(kind==='motorcycle')mesh.userData.modelKey='traffic_moped';
  else if(kind==='bicycle')mesh.userData.modelKey='traffic_bicycle';
  else if(kind==='bus')mesh.userData.modelKey='traffic_bus3d';
  mesh.rotation.order='YZX';
  mesh.position.set(p.x,y,p.z);mesh.rotation.y=Math.atan2(-frame.fz,frame.fx);scene.add(mesh);
  const roll=Math.random(),mKey=mesh.userData.modelKey||'';
  let style='normal';
  if(kind==='micro'||kind==='motorcycle'||/sport|roadster|sprinter|hilux/i.test(mKey)){style=roll<.55?'aggressive':(roll<.85?'normal':'cautious');}
  else if(kind==='tuktuk'){style=roll<.55?'nimble':(roll<.85?'normal':'cautious');}
  else if(kind==='bus'||/lada|fiat1300/i.test(mKey)){style=roll<.45?'cautious':'normal';}
  else{style=roll<.28?'aggressive':(roll<.58?'cautious':'normal');}

  let speed,personality,accel,laneRate;
  if(style==='aggressive'){
   speed=kind==='motorcycle'?rand(10.5,15.5):rand(10,14.5);personality=rand(1.15,1.35);accel=rand(3.2,4.4);laneRate=rand(3.0,4.4);
  }else if(style==='cautious'){
   speed=kind==='bicycle'?rand(2.2,3.8):kind==='bus'?rand(4.5,6.5):rand(5,7.2);personality=rand(.75,.90);accel=rand(1.2,1.8);laneRate=1.3;
  }else if(style==='nimble'){
   speed=rand(5.5,8.5);personality=rand(.95,1.2);accel=rand(2.2,3.2);laneRate=rand(3.4,4.8);
  }else{
   speed=kind==='bicycle'?rand(2.8,5.3):kind==='bus'?rand(5,8):kind==='tuktuk'?rand(4.5,7.8):kind==='motorcycle'?rand(7,12):rand(6.5,10.5);personality=rand(.92,1.12);accel=rand(1.9,2.6);laneRate=rand(1.6,2.2);
  }
  traffic.push({mesh,kind,edge,s,offset,laneTarget:offset,dir:1,hl,hw,speed,baseSpeed:speed,honkBoost:0,decision:rand(2,8),stopTime:0,stopAt:null,laneTimer:0,personality,yielding:false,pedalPhase:rand(0,6.28),style,accel,laneRate,flashTimer:0,stuckTimer:0,weavePhase:rand(0,6.28)});
 }
}
function streetAhead(t,point){const f=edgeFrame(t.edge),dx=point.x-t.mesh.position.x,dz=point.z-t.mesh.position.z;return {along:dx*f.fx+dz*f.fz,across:-dx*f.fz+dz*f.fx};}
function safePassingLane(t,target){
 const tx=t.mesh.position.x,tz=t.mesh.position.z,ty=t.mesh.position.y||0;
 return !traffic.some(o=>{
  if(o===t||Math.abs((o.mesh.position.y||0)-ty)>2.2)return false;
  const dx=o.mesh.position.x-tx,dz=o.mesh.position.z-tz;
  if(Math.abs(dx)>36||Math.abs(dz)>36)return false;
  const q=streetAhead(t,o.mesh.position);
  return q.along>-15&&q.along<32&&Math.abs((t.offset+q.across)-target)<t.hw+o.hw+.5;
 });
}
const _trafficDesired = new THREE.Vector3();
const _trafficCandidate = new THREE.Vector3();

function updateAssyutTraffic(dt){
 STREET_LIFE.time+=dt;
 for(const t of traffic){
  const before={edge:t.edge,s:t.s,offset:t.offset,heading:t.mesh.rotation.y};
  const f=edgeFrame(t.edge),road=lifeRoad(t.edge),remaining=f.length-t.s;
  const tx=t.mesh.position.x,tz=t.mesh.position.z,ty=t.mesh.position.y||0;
  const isFar=Math.abs(tx-car.x)>150||Math.abs(tz-car.z)>150;

  if(isFar){
   let farDist=0;
   if(t.stopAt!==null){
    const gap=t.stopAt-t.s;
    if(gap<.45&&t.speed<.4){
     t.stopTime-=dt;
     if(!t.stoppedCounted){STREET_LIFE.stops++;t.stoppedCounted=true;}
     if(t.stopTime<=0){t.stopAt=null;t.stoppedCounted=false;}
    }else{
     t.speed=Math.max(0,Math.min(t.speed,Math.sqrt(9*Math.max(0,gap))));
     farDist=t.speed*dt;t.s+=farDist;
    }
   }else{
    farDist=t.speed*dt;t.s+=farDist;
   }
   if(farDist>0){
    if(t.mesh.userData.twoWheeler){
     const rWheel=t.kind==='bicycle'?.35:.30;
     for(const w of t.mesh.userData.wheels||[])w.rotation.z-=farDist/rWheel;
     if(t.kind==='bicycle'){
      t.pedalPhase=(t.pedalPhase||0)+farDist/.24;
      if(t.mesh.userData.crank){t.mesh.userData.crank.rotation.z=-t.pedalPhase;for(const p of t.mesh.userData.pedals||[])p.rotation.z=t.pedalPhase;}
      if(typeof animateStreetRider==='function')animateStreetRider(t.mesh.userData.rider,t.pedalPhase,true);
      if(t.mesh.userData.riderDetail&&typeof animateCycleRider==='function')animateCycleRider(t.mesh.userData.riderDetail,t.pedalPhase);
     }
    }else{
     for(const list of [t.mesh.userData.wheels,t.mesh.userData.farWheels]){
      if(!list)continue;
      for(const w of list)if(w.spin)w.spin.rotation.z-=farDist/(w.radius||.32);
     }
    }
   }
   if(t.s>=f.length){
    const next=chooseNextEdge(t);
    if(next){t.s-=f.length;t.edge=next;}
    else t.s=0;
   }
   const isTest=(typeof navigator!=='undefined'&&navigator.userAgent==='test');
   if(!isTest&&typeof G!=='undefined'&&G.state==='play'&&!t.policeSuspect&&Math.hypot(tx-car.x,tz-car.z)>245){
    const minW=t.kind==='bus'?10:6;
    const pool=ASSYUT.edges.filter(e=>{if(ASSYUT.roads[e.road].width<minW||e.length<22)return false;const a=ASSYUT.nodes[e.a],d=Math.hypot(a.x-car.x,a.z-car.z);return d>65&&d<185;});
    if(pool.length){
     const ne=pick(pool),nf2=edgeFrame(ne),rw=ASSYUT.roads[ne.road].width,ns=rand(4,Math.max(5,nf2.length-4)),noff=Math.min(rw*.26,1.8),nx2=nf2.a.x+nf2.fx*ns-nf2.fz*noff,nz2=nf2.a.z+nf2.fz*ns+nf2.fx*noff,nh2=Math.atan2(-nf2.fz,nf2.fx),ny2=infrastructureEdgeHeight(ne,ns);
     if(trafficFootprintClear(nx2,nz2,nh2,t.hl,t.hw,ny2)){t.edge=ne;t.s=ns;t.offset=noff;t.laneTarget=noff;t.nextEdge=null;t.curve=null;t.stopAt=null;t.mesh.position.set(nx2,ny2,nz2);t.mesh.rotation.y=nh2;continue;}
    }
   }
   const nf=edgeFrame(t.edge);
   t.mesh.position.set(nf.a.x+nf.fx*t.s-nf.fz*t.offset,infrastructureEdgeHeight(t.edge,t.s),nf.a.z+nf.fz*t.s+nf.fx*t.offset);
   t.mesh.rotation.y=Math.atan2(-nf.fz,nf.fx);
   continue;
  }

  t.honkBoost=Math.max(0,t.honkBoost-dt);t.laneTimer=Math.max(0,t.laneTimer-dt);t.decision-=dt;
  if(t.decision<=0){t.decision=rand(7,18);if(t.stopAt===null&&remaining>25&&Math.random()<(t.kind==='micro'?.32:.055)){t.stopAt=Math.min(f.length-7,t.s+rand(10,24));t.stopTime=rand(2,5);}}
  let target=t.baseSpeed*t.personality,nearest=Infinity,leaderSpeed=target,leader=null;
  for(const o of traffic){
   if(o===t||Math.abs((o.mesh.position.y||0)-ty)>2.2)continue;
   const dx=o.mesh.position.x-tx,dz=o.mesh.position.z-tz;
   if(Math.abs(dx)>46||Math.abs(dz)>46)continue;
   const q=streetAhead(t,o.mesh.position);
   if(q.along>0&&q.along<45&&Math.abs(q.across)<t.hw+o.hw+.35&&q.along-t.hl-o.hl<nearest){
    nearest=q.along-t.hl-o.hl;leaderSpeed=o.speed;leader=o;
   }
  }
  const player=streetAhead(t,{x:car.x,z:car.z}),playerForward=Math.cos(car.heading)*f.fx-Math.sin(car.heading)*f.fz;
  if(Math.abs(car.y-ty)<=2.2&&player.along>0&&player.along<45&&Math.abs(player.across)<t.hw+vehicleParameters().halfWidth+.35&&player.along-t.hl-vehicleParameters().halfLength<nearest){nearest=player.along-t.hl-vehicleParameters().halfLength;leaderSpeed=Math.max(0,car.speed*playerForward);leader=car;}
  const wide=road.width>=11,inner=Math.min(road.width*.12,1.3),outer=Math.min(road.width*.32,3.3);
  const passDist=t.style==='aggressive'?34:27,passRatio=t.style==='aggressive'?.85:.65;
  const policeSiren=typeof G!=='undefined'&&G.mode==='police'&&typeof POLICE!=='undefined'&&POLICE.siren&&!t.policeSuspect;
  let policeYielding=false;
  if(policeSiren){
   const dxP=car.x-tx,dzP=car.z-tz,distP=Math.hypot(dxP,dzP);
   if(distP<72&&Math.abs(car.y-ty)<3.8){
    policeYielding=true;
    const curbOffset=Math.max(.65,road.width/2-t.hw-.35);
    t.laneTarget=curbOffset;
    t.laneTimer=2.5;
    t.laneRate=Math.max(t.laneRate||2.0,4.5);
    if(player.along<0&&player.along>-60){
     const yieldSpeed=Math.max(.5,t.baseSpeed*.24);
     target=Math.min(target,yieldSpeed);
     if(player.along>-16&&Math.abs(player.across)<4.2){target=Math.min(target,.2);}
    }else if(player.along>=0&&player.along<26){
     target=Math.min(target,t.baseSpeed*.38);
    }else if(playerForward<-.3&&player.along>0&&player.along<48){
     target=Math.min(target,t.baseSpeed*.48);
    }
    if(remaining<22&&distP<42){target=0;}
   }
  }
  if(!policeYielding){
   if(wide&&nearest<passDist&&leaderSpeed<t.baseSpeed*passRatio&&remaining>35&&t.laneTimer===0&&safePassingLane(t,inner)){t.laneTarget=inner;t.laneTimer=t.style==='aggressive'?rand(3.5,5.5):7;STREET_LIFE.overtakes++;}
   if(t.laneTimer===0&&t.laneTarget!==outer&&wide&&safePassingLane(t,outer))t.laneTarget=outer;
  }
  if(t.style==='nimble'||t.kind==='tuktuk'||t.kind==='motorcycle'){
   t.weavePhase=(t.weavePhase||0)+dt*rand(1.2,2.0);
   const weaveAmp=policeYielding?0:Math.min(.28,road.width*.04);
   const targetOffset=clamp(t.laneTarget+Math.sin(t.weavePhase)*weaveAmp,.4,road.width/2-t.hw-.2);
   t.offset+=(targetOffset-t.offset)*(1-Math.exp(-dt*(t.laneRate||3.6)));
  }else{
   t.offset+=(t.laneTarget-t.offset)*(1-Math.exp(-dt*(t.laneRate||1.6)));
  }
  if(Number.isFinite(nearest)){
   const gapBase=t.style==='aggressive'?1.4:t.style==='cautious'?3.2:2.2;
   const timeHeadway=t.style==='aggressive'?.78:t.style==='cautious'?1.45:1.1;
   const desired=gapBase+t.speed*timeHeadway+Math.max(0,t.speed*(t.speed-leaderSpeed)/(2*Math.sqrt(2*4.5)));
   target=Math.min(target,Math.max(0,leaderSpeed+(nearest-desired)*(t.style==='aggressive'?.85:.65)));
   if(nearest<1)target=0;
   if(t.honkCd)t.honkCd-=dt;
   if((!t.honkCd||t.honkCd<=0)&&nearest<6.5&&t.speed<.8&&Math.random()<0.006){
    t.honkCd=rand(14,32);
    if(typeof sfxTrafficHonk==='function')sfxTrafficHonk(t.kind||'modern',tx,tz);
   }
  }
  // Turning vehicles slow before the corner and yield to occupied intersections.
  if(remaining<22){
   if(!t.nextEdge)t.nextEdge=chooseNextEdge(t);
   if(t.nextEdge){const nf=edgeFrame(t.nextEdge),dot=f.fx*nf.fx+f.fz*nf.fz;target=Math.min(target,Math.sqrt(Math.max(2,2.3*(remaining+3)))*(dot<.8?.65:1));}
   else {
    // A dead-end (including a bridge approach whose far end is a barrier)
    // is a stopping point, never a valid place to drive into.
    const stopGap=Math.max(4.5,t.hl+2.8);
    target=Math.min(target,Math.sqrt(9*Math.max(0,remaining-stopGap)));
    if(remaining<=stopGap+.35)target=0;
   }
   if(ASSYUT.adj[t.edge.b].length>=3){
    const node=ASSYUT.nodes[t.edge.b],busy=traffic.some(o=>o!==t&&o!==leader&&Math.abs((o.mesh.position.y||0)-ty)<2.2&&Math.hypot(o.mesh.position.x-node.x,o.mesh.position.z-node.z)<6&&o.speed>.4);
    if(busy&&remaining>3)target=Math.min(target,Math.sqrt(5*Math.max(0,remaining-t.hl-4)));
   }
  }
  // Signal approach is shared with the player's real stop-line geometry.
  for(const light of TRAFFIC_LIGHTS)for(const a of light.approaches||[]){if(f.fx*a.fx+f.fz*a.fz<.8)continue;const q=streetAhead(t,a.stop);if(q.along<0||q.along>45||Math.abs(q.across)>road.width/2)continue;if(light[a.axis+'State']!=='green')target=Math.min(target,Math.sqrt(8*Math.max(0,q.along-t.hl-.5)));}
  t.yielding=policeYielding;
  for(const p of peds){if(p.life?.state!=='cross')continue;const q=streetAhead(t,p.mesh.position);if(q.along>0&&q.along<25&&Math.abs(q.across)<t.hw+1.1){target=Math.min(target,Math.sqrt(8*Math.max(0,q.along-t.hl-2)));t.yielding=true;}}
  if(t.stopAt!==null){const gap=t.stopAt-t.s;target=Math.min(target,Math.sqrt(9*Math.max(0,gap)));if(gap<.45&&t.speed<.4){t.stopTime-=dt;if(!t.stoppedCounted){STREET_LIFE.stops++;t.stoppedCounted=true;}if(t.stopTime<=0){t.stopAt=null;t.stoppedCounted=false;}}}
  const old=t.speed;
  const maxAccel=(t.accel||(t.kind==='bicycle'?.9:2.1))*dt;
  const maxBrake=(t.style==='aggressive'?-9.5:-7.5)*dt;
  t.speed+=clamp(target-t.speed,maxBrake,maxAccel);
  t.speed=Math.max(0,t.speed);
  t.braking=t.speed<old-.015||(t.yielding&&t.speed>.4);
  for(const m of t.mesh.userData.brakeMaterials||[]){m.emissive.setHex(0xff2010);m.emissiveIntensity=t.braking||t.stopAt!==null&&t.speed<.5?.85:.10;}
  t.mesh.rotation.x=0;
  const stepDist=t.speed*dt;t.s+=stepDist;
  if(!t.curve&&t.nextEdge){const next=edgeFrame(t.nextEdge),dot=f.fx*next.fx+f.fz*next.fz,den=f.fx*next.fz-f.fz*next.fx,r=Math.min(7,f.length*.35,next.length*.35);if(dot>-.15&&Math.abs(den)>.25&&r>.5&&t.s>f.length-r){const offset=Math.min(lifeRoad(t.nextEdge).width*.26,Math.max(.4,lifeRoad(t.nextEdge).width/2-t.hw-.2)),p0={x:f.b.x-f.fx*r-f.fz*t.offset,z:f.b.z-f.fz*r+f.fx*t.offset},p2={x:f.b.x+next.fx*r-next.fz*offset,z:f.b.z+next.fz*r+next.fx*offset},a=clamp(((p2.x-p0.x)*next.fz-(p2.z-p0.z)*next.fx)/den,.25*r,2.0*r),p1={x:p0.x+f.fx*a,z:p0.z+f.fz*a};t.curve={next:t.nextEdge,r,p0,p1,p2,offset};}}
  const curve=t.curve;
  if(t.s>=f.length+(curve?curve.r:0)){
   const next=curve?.next||t.nextEdge||chooseNextEdge(t);
   if(next){t.s-=f.length;t.edge=next;t.nextEdge=null;t.stopAt=null;t.curve=null;const nextWidth=ASSYUT.roads[next.road].width;t.laneTarget=Math.min(nextWidth*.26,2.3);t.offset=Math.min(t.offset,Math.max(.4,nextWidth/2-t.hw-.2));}
   else{t.speed=0;t.nextEdge=null;t.s=Math.max(0,f.length-Math.max(4.5,t.hl+2.8));}
  }
  const nf=edgeFrame(t.edge);_trafficDesired.set(nf.a.x+nf.fx*t.s-nf.fz*t.offset,infrastructureEdgeHeight(t.edge,t.s),nf.a.z+nf.fz*t.s+nf.fx*t.offset);let heading=Math.atan2(-nf.fz,nf.fx);
  if(t.curve){const q=t.curve,u=clamp((t.s-f.length+q.r)/(2*q.r),0,1),v=1-u;_trafficDesired.x=v*v*q.p0.x+2*v*u*q.p1.x+u*u*q.p2.x;_trafficDesired.z=v*v*q.p0.z+2*v*u*q.p1.z+u*u*q.p2.z;_trafficDesired.y=lerp(infrastructureEdgeHeight(t.edge,Math.min(t.s,f.length)),infrastructureEdgeHeight(q.next,q.r*u),u);heading=-Math.atan2(v*(q.p1.z-q.p0.z)+u*(q.p2.z-q.p1.z),v*(q.p1.x-q.p0.x)+u*(q.p2.x-q.p1.x));}
  const previousHeading=t.mesh.rotation.y,turn=Math.atan2(Math.sin(heading-previousHeading),Math.cos(heading-previousHeading)),posBlend=1-Math.exp(-dt*14),rotBlend=1-Math.exp(-dt*11);
  _trafficCandidate.copy(t.mesh.position).lerp(_trafficDesired,posBlend);
  _trafficCandidate.y=lerp(t.mesh.position.y,_trafficDesired.y,1-Math.exp(-dt*20));
  const rotation=previousHeading+turn*rotBlend;
  if(trafficFootprintClear(_trafficCandidate.x,_trafficCandidate.z,rotation,t.hl,t.hw,_trafficCandidate.y)){t.mesh.position.copy(_trafficCandidate);t.mesh.rotation.y=rotation;}
  else if(trafficFootprintClear(_trafficDesired.x,_trafficDesired.z,heading,t.hl,t.hw,_trafficDesired.y)&&!segmentHitsBuilding(t.mesh.position,_trafficDesired,t.hw+.18)){t.mesh.position.copy(_trafficDesired);t.mesh.rotation.y=heading;}
  else{t.edge=before.edge;t.s=before.s;t.offset=clamp(before.offset-Math.sign(before.offset-Math.min(1.3,road.width*.15))*0.15,0.4,road.width/2-t.hw-.2);t.speed=0;t.curve=null;t.nextEdge=null;t.laneTarget=Math.min(1.3,road.width*.15);t.laneTimer=2;STREET_LIFE.blockedMoves++;}
  const s0=Math.max(0,t.s-1),s1=Math.min(nf.length,t.s+1),ds=Math.max(1.2,s1-s0);
  t.mesh.rotation.order='YZX';
  const targetPitch=clamp(Math.atan2(infrastructureEdgeHeight(t.edge,s1)-infrastructureEdgeHeight(t.edge,s0),ds),-0.12,0.12);
  t.mesh.rotation.z=clamp(lerp(t.mesh.rotation.z||0,targetPitch,1-Math.exp(-dt*9)),-0.12,0.12);
  const turnRate = turn / Math.max(0.001, dt);
  const latAccel = t.speed * turnRate;
  const longAccel = (t.speed - old) / Math.max(0.001, dt);
  if(t.mesh.userData.twoWheeler){
   const targetLean = clamp(-Math.atan2(latAccel, 9.81) * 0.92, -0.52, 0.52);
   t.lean = (t.lean || 0) + (targetLean - (t.lean || 0)) * (1 - Math.exp(-dt * 15));
   t.mesh.rotation.x = t.lean;
   const forkDive = clamp(longAccel * 0.008, -0.09, 0.04);
   t.mesh.rotation.z = clamp(lerp(t.mesh.rotation.z || 0, targetPitch + forkDive, 1 - Math.exp(-dt * 12)), -0.18, 0.18);
   const rWheel=t.kind==='bicycle'?.35:.30;
   for(const w of t.mesh.userData.wheels)w.rotation.z-=stepDist/rWheel;
   if(t.kind==='bicycle'){
    t.pedalPhase=(t.pedalPhase||0)+stepDist/.24;
    if(t.mesh.userData.crank){t.mesh.userData.crank.rotation.z=-t.pedalPhase;for(const p of t.mesh.userData.pedals||[])p.rotation.z=t.pedalPhase;}
    animateStreetRider(t.mesh.userData.rider,t.pedalPhase,true);
    if(t.mesh.userData.riderDetail)animateCycleRider(t.mesh.userData.riderDetail,t.pedalPhase);
   }
  }else{
   const rollCoeff = (t.kind === 'bus') ? 0.024 : (t.kind === 'tuktuk') ? 0.032 : (t.kind === 'micro') ? 0.024 : 0.018;
   const targetRoll = clamp(latAccel * rollCoeff, -0.14, 0.14);
   t.roll = (t.roll || 0) + (targetRoll - (t.roll || 0)) * (1 - Math.exp(-dt * 12));
   t.mesh.rotation.x = t.roll;
   const brakeDive = clamp(longAccel * 0.007, -0.07, 0.03);
   t.pitch = (t.pitch || 0) + (brakeDive - (t.pitch || 0)) * (1 - Math.exp(-dt * 12));
   t.mesh.rotation.z = clamp(lerp(t.mesh.rotation.z || 0, targetPitch + t.pitch, 1 - Math.exp(-dt * 10)), -0.18, 0.18);
   const steerAngle=clamp(turn*2.2,-.42,.42);
   for(const list of [t.mesh.userData.wheels,t.mesh.userData.farWheels]){
    if(!list)continue;
    for(const w of list){if(w.steer&&w.front)w.steer.rotation.y+=(steerAngle-w.steer.rotation.y)*Math.min(1,dt*10);if(w.spin)w.spin.rotation.z-=stepDist/(w.radius||.32);}
   }
  }
  const dx=t.mesh.position.x-car.x,dz=t.mesh.position.z-car.z;
  if(Math.abs((t.mesh.position.y||0)-car.y)<1.9&&dx*dx+dz*dz<64){
   const hit=obbContact(playerBounds(),{x:t.mesh.position.x,z:t.mesh.position.z,heading:t.mesh.rotation.y,hl:t.hl,hw:t.hw});
   if(hit){
    const closingX=car.vel.x-nf.fx*t.speed,closingZ=car.vel.y-nf.fz*t.speed;
    const closing=closingX*hit.nx+closingZ*hit.nz;
    car.x+=hit.nx*(hit.depth+.003);car.z+=hit.nz*(hit.depth+.003);
    if(closing<0){
     const mass=vehicleParameters().mass,otherMass=t.kind==='bus'?6200:t.kind==='micro'?2200:1350;
     const restitution=0.35;
     const impulse=-(1+restitution)*closing/(1/mass+1/otherMass);
     car.vel.x+=hit.nx*(impulse/mass);car.vel.y+=hit.nz*(impulse/mass);

     const contactX=(car.x+t.mesh.position.x)/2,contactZ=(car.z+t.mesh.position.z)/2;
     const pArmX=contactX-car.x,pArmZ=contactZ-car.z;
     const pTorque=(pArmX*hit.nz-pArmZ*hit.nx)*(impulse/mass);
     car.yawRate=clamp((car.yawRate||0)+pTorque*0.24,-6.5,6.5);
     car.roll=clamp((car.roll||0)-(hit.nx*pArmZ-hit.nz*pArmX)*0.045,-0.38,0.38);

     syncCarSpeed();
     recordImpact(-closing,'خبطة! حافظ على مسافة الأمان');
     car.shake=Math.max(car.shake||0,clamp(-closing*0.14,0.35,1.35));
     car.suspensionJoltVel=clamp((car.suspensionJoltVel||0)+clamp(-closing*0.16,0.25,1.4),-1.8,1.8);
     if(-closing>3.5&&typeof flashScreen==='function')flashScreen();
     if(typeof spawnVehicleSparks==='function')spawnVehicleSparks(contactX,(car.y+t.mesh.position.y)/2+0.35,contactZ,closingX,closingZ,14);
     if(typeof sfxCrash==='function')sfxCrash();
    }
    t.speed=Math.max(0,Math.min(t.speed,car.speed*0.5));
   }
  }
 }
}
initializeStreetTraffic();
