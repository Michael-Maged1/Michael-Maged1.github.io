/* Fictional adult game actors in Egyptian-style summer police uniforms. */
function makeEgyptianOfficer(){
 const p=makePerson(0xf0efe8,0xaa774f),navy=new THREE.MeshStandardMaterial({color:0x132234,roughness:.75}),whiteCap=new THREE.MeshStandardMaterial({color:0xf4f3ed,roughness:.6}),gold=new THREE.MeshStandardMaterial({color:0xc9a84c,metalness:.6,roughness:.32}),leather=new THREE.MeshStandardMaterial({color:0x1a1817,roughness:.55});
 const capCrown=new THREE.Mesh(new THREE.CylinderGeometry(.125,.11,.055,14),whiteCap);capCrown.position.y=1.79;p.add(capCrown);
 const capBand=new THREE.Mesh(new THREE.CylinderGeometry(.112,.116,.038,14),navy);capBand.position.y=1.745;p.add(capBand);
 const brim=new THREE.Mesh(new THREE.BoxGeometry(.18,.02,.12),leather);brim.position.set(0,1.735,.10);p.add(brim);
 const eagle=new THREE.Mesh(new THREE.BoxGeometry(.032,.032,.015),gold);eagle.position.set(0,1.78,.115);p.add(eagle);
 const badge=new THREE.Mesh(new THREE.BoxGeometry(.05,.058,.018),gold);badge.position.set(-.09,1.32,.132);p.add(badge);
 for(const sx of[-.19,.19]){const ep=new THREE.Mesh(new THREE.BoxGeometry(.10,.022,.055),navy);ep.position.set(sx,1.48,0);p.add(ep);const star=new THREE.Mesh(new THREE.BoxGeometry(.022,.01,.022),gold);star.position.set(sx,1.495,0);p.add(star);}
 const belt=new THREE.Mesh(new THREE.BoxGeometry(.41,.055,.265),leather);belt.position.set(0,.98,0);p.add(belt);
 const buckle=new THREE.Mesh(new THREE.BoxGeometry(.055,.045,.02),gold);buckle.position.set(0,.98,.138);p.add(buckle);
 const radio=new THREE.Mesh(new THREE.BoxGeometry(.04,.095,.035),leather);radio.position.set(.215,1.02,.04);p.add(radio);
 for(const leg of p.userData.walk.legs)leg.traverse(o=>{if(o.isMesh)o.material.color.setHex(0x132234);});
 for(let i=0;i<3;i++){const flag=new THREE.Mesh(new THREE.BoxGeometry(.016,.018,.078),new THREE.MeshBasicMaterial({color:[0xce2936,0xf4f2e8,0x121821][i]}));flag.position.set(.25,1.36-i*.018,0);p.add(flag);}
 return p;
}
function makePoliceSuspect(){return makePerson(pick([0x6e7973,0x8b705d,0x616a7a]),pick(SKIN));}

function clearPoliceActors(){
 if(typeof POLICE==='undefined'||!POLICE.actors)return;
 for(const a of POLICE.actors){
  if(!a)continue;
  if(typeof scene!=='undefined'&&scene.remove)scene.remove(a);
  if(a.traverse){
   a.traverse(o=>{
    if(o.geometry)o.geometry.dispose?.();
    if(o.material){
     if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
     else o.material.dispose?.();
    }
   });
  }
 }
 POLICE.actors=[];
}

function spawnPoliceCrimeScene(stop,incident){
 clearPoliceActors();
 if(!stop||typeof scene==='undefined')return;
 const cx=stop.x,cz=stop.z;
 const cy=typeof navigationStopHeight==='function'?navigationStopHeight(stop):(typeof car!=='undefined'?car.y||0:0);

 let fx=1,fz=0;
 if(stop.roadIndex!==undefined&&typeof ASSYUT!=='undefined'&&ASSYUT.roads?.[stop.roadIndex]){
  for(const seg of ASSYUT.segments||[]){
   if(seg.road===stop.roadIndex&&seg.length>4){
    const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z;
    const d=Math.hypot(cx-(seg.a.x+seg.b.x)*0.5,cz-(seg.a.z+seg.b.z)*0.5);
    if(d<50){fx=dx/seg.length;fz=dz/seg.length;break;}
   }
  }
 }
 const nx=-fz,nz=fx;

 // 1. Two suspects handcuffed in center of crime scene
 for(let i=0;i<2;i++){
  const s=makePoliceSuspect();
  const side=i===0?-0.55:0.55;
  s.position.set(cx+nx*side,cy,cz+nz*side);
  s.rotation.y=Math.atan2(-fz,fx)+(i===0?0.35:-0.35);
  const walk=s.userData?.walk;
  if(walk&&walk.arms&&walk.arms.length>=2){
   walk.arms[0].rotation.set(0.65,-0.3,-0.38);
   walk.arms[1].rotation.set(0.65,0.3,0.38);
  }
  s.userData.isPoliceSuspect=true;
  scene.add(s);
  POLICE.actors.push(s);
 }

 // 2. Two Egyptian police officers securing the perimeter
 for(let i=0;i<2;i++){
  const off=makeEgyptianOfficer();
  const dir=i===0?-1.5:1.5;
  off.position.set(cx+fx*dir,cy,cz+fz*dir);
  off.lookAt(cx,cy,cz);
  off.userData.isPoliceOfficer=true;
  scene.add(off);
  POLICE.actors.push(off);
 }

 // 3. Crowd of 6 Egyptian citizen spectators gathered around
 const crowdTotal=6;
 for(let i=0;i<crowdTotal;i++){
  const bystander=makePerson(pick(SHIRTS),pick(SKIN));
  const angle=(i/crowdTotal)*Math.PI*2+rand(-0.2,0.2);
  const radius=rand(2.8,4.6);
  const px=cx+Math.cos(angle)*radius*nx+Math.sin(angle)*radius*fx;
  const pz=cz+Math.cos(angle)*radius*nz+Math.sin(angle)*radius*fz;
  bystander.position.set(px,cy,pz);
  bystander.lookAt(cx+rand(-0.4,0.4),cy+1.2,cz+rand(-0.4,0.4));

  const walk=bystander.userData?.walk;
  if(walk&&walk.arms&&walk.arms.length>=2){
   if(i%3===0)walk.arms[0].rotation.set(-1.1,-0.2,-0.25);
   else if(i%3===1)walk.arms[1].rotation.set(-0.75,0.4,0.35);
  }
  bystander.userData.isCrowdBystander=true;
  bystander.userData.baseY=cy;
  bystander.userData.phase=rand(0,Math.PI*2);
  bystander.traverse?.(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  scene.add(bystander);
  POLICE.actors.push(bystander);
 }

 // 4. Parked incident squad car
 if(typeof makeTrafficCar==='function'){
  const carMesh=makeTrafficCar('modern',0x223042);
  carMesh.position.set(cx+fx*4.2+nx*1.5,cy,cz+fz*4.2+nz*1.5);
  carMesh.rotation.y=Math.atan2(-fz,fx)+0.22;
  carMesh.traverse?.(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  scene.add(carMesh);
  POLICE.actors.push(carMesh);
 }

 // 5. Emergency flashing strobe light
 const strobe=new THREE.PointLight(0x0055ff,3,30);
 strobe.castShadow=false;
 strobe.position.set(cx+fx*4.2+nx*1.5,cy+1.75,cz+fz*4.2+nz*1.5);
 strobe.userData.isStrobe=true;
 scene.add(strobe);
 POLICE.actors.push(strobe);

 // 6. Traffic safety cones
 for(let k=0;k<4;k++){
  const cone=new THREE.Group();
  const coneBody=new THREE.Mesh(
   new THREE.CylinderGeometry(0.04,0.18,0.55,10),
   new THREE.MeshStandardMaterial({color:0xff4d00,roughness:0.5})
  );
  coneBody.position.y=0.275;
  const stripe=new THREE.Mesh(
   new THREE.CylinderGeometry(0.09,0.13,0.16,10),
   new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.2})
  );
  stripe.position.y=0.28;
  cone.add(coneBody,stripe);
  cone.traverse?.(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  const offsetDist=(k-1.5)*2.2;
  cone.position.set(cx+fx*offsetDist-nx*2.5,cy,cz+fz*offsetDist-nz*2.5);
  scene.add(cone);
  POLICE.actors.push(cone);
 }
}

function spawnPoliceStationOfficers(station){
 clearPoliceActors();
 if(!station?.stop||typeof scene==='undefined')return;
 const sx=station.stop.x,sz=station.stop.z;
 const sy=typeof navigationStopHeight==='function'?navigationStopHeight(station.stop):0;
 for(let i=0;i<2;i++){
  const off=makeEgyptianOfficer();
  off.position.set(sx+(i===0?-1.8:1.8),sy,sz+2.2);
  off.rotation.y=Math.PI;
  off.userData.isPoliceOfficer=true;
  scene.add(off);
  POLICE.actors.push(off);
 }
}

function updatePoliceActors(dt){
 if(typeof POLICE==='undefined'||!POLICE.actors||POLICE.actors.length===0)return;
 const now=Date.now();
 const strobe=POLICE.actors.find(a=>a.userData?.isStrobe);
 if(strobe&&strobe.color){
  strobe.color.setHex((Math.floor(now/130)%2===0)?0xff1525:0x0066ff);
 }
 for(const a of POLICE.actors){
  if(a.userData?.isCrowdBystander&&a.userData.baseY!==undefined){
   a.position.y=a.userData.baseY+Math.sin(now*0.003+a.userData.phase)*0.012;
  }
 }
}
