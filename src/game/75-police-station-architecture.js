/* Egyptian station-inspired architecture; gameplay entrances are placed on clear local streets. */
function stationEntranceCandidate(index,previous){
 const target={x:ASSYUT.start.x+(index?170:-150),z:ASSYUT.start.z+(index?105:-105)};
 const options=ASSYUT.segments.filter(s=>s.width>=6&&s.length>20&&!INFRA.profiles.has(s.road)&&ASSYUT.navigableNodes.has(s.aNode)&&ASSYUT.navigableNodes.has(s.bNode)).map(s=>({s,x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2})).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));
 for(const routeLimit of[500,900])for(const p of options){if(Math.hypot(p.x-ASSYUT.start.x,p.z-ASSYUT.start.z)>600||previous&&Math.hypot(p.x-previous.stop.x,p.z-previous.stop.z)<115)continue;if(driveSurfaceCandidates(p.x,p.z).some(q=>INFRA.profiles.has(q.road)))continue;const s=p.s,tx=(s.b.x-s.a.x)/s.length,tz=(s.b.z-s.a.z)/s.length;
  for(const side of[1,-1]){const nx=-tz*side,nz=tx*side,cx=p.x+nx*(s.width/2+12.3),cz=p.z+nz*(s.width/2+12.3),yaw=Math.atan2(nx,nz);let free=true;
   for(const [lx,lz]of[[0,0],[-8,-5.5],[8,-5.5],[-8,5.5],[8,5.5]]){const x=cx+Math.cos(yaw)*lx+Math.sin(yaw)*lz,z=cz-Math.sin(yaw)*lx+Math.cos(yaw)*lz,n=nearestAssyutRoad({x,z});if(n.distance<n.width/2+2.2||driveSurfaceCandidates(x,z).some(q=>q.distance<q.s.width/2+2.2)){free=false;break;}}
   if(!free||roadCutsOrientedBuilding(cx,cz,yaw,8,5.5,1.4)||bridgeCutsBox(cx,cz,24,20,3.5))continue;const stop={x:p.x+nx*(s.width/2+1.3),z:p.z+nz*(s.width/2+1.3),roadIndex:s.road,height:.18},route=roadRoute(ASSYUT.start,stop);if(!route.reachable||route.length>routeLimit)continue;return{cx,cz,yaw,stop,tx,tz,nx,nz};
  }
 }
 return null;
}
function makePoliceStationBuilding(name){
 const group=new THREE.Group();
 const stoneTex=canvasTex(128,128,g=>{g.fillStyle=name.includes('ثاني')?'#b7beb9':'#c7bc9f';g.fillRect(0,0,128,128);g.strokeStyle='rgba(70,66,58,.24)';g.lineWidth=2;for(let y=0;y<128;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();for(let x=(y/24)%2?16:0;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+24);g.stroke();}}});stoneTex.wrapS=stoneTex.wrapT=THREE.RepeatWrapping;stoneTex.repeat.set(3,2);
 const sand=new THREE.MeshStandardMaterial({map:stoneTex,color:0xffffff,roughness:.88}),baseStone=new THREE.MeshStandardMaterial({color:0x666e72,roughness:.92}),trim=new THREE.MeshStandardMaterial({color:0xebe4d4,roughness:.75}),blue=new THREE.MeshStandardMaterial({color:0x133c6e,roughness:.45}),gold=new THREE.MeshStandardMaterial({color:0xc9a33d,metalness:.65,roughness:.32}),glass=new THREE.MeshStandardMaterial({color:0x162b36,roughness:.22,metalness:.35}),iron=new THREE.MeshStandardMaterial({color:0x3f494f,metalness:.65,roughness:.45});
 const box=(w,h,d,x,y,z,m)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;group.add(a);return a;};
 box(16,10.2,11,0,5.1,0,sand);box(16.25,2.9,11.2,0,1.45,0,baseStone);box(17.1,.38,11.6,0,10.28,0,trim);box(16.4,.35,11.1,0,10.72,0,blue);
 for(const y of[3.0,6.65])box(16.35,.22,11.2,0,y,0,trim);
 for(const x of[-7.8,-4.5,4.5,7.8])box(.42,10.1,.35,x,5.05,-5.52,trim);
 for(const y of[1.8,5.5,8.4])for(const x of[-6.1,-3,3,6.1]){box(1.65,1.8,.16,x,y,-5.58,trim);box(1.32,1.48,.06,x,y,-5.68,glass);for(const dx of[-.4,0,.4])box(.04,1.48,.05,x+dx,y,-5.73,iron);}
 // مدخل القسم المميز بأعمدة ومظلة وفوانيس زرقاء وشعار الشرطة
 box(3.0,3.2,.14,0,1.76,-5.62,blue);box(.16,3.15,.08,-.04,1.76,-5.7,glass);box(.16,3.15,.08,.04,1.76,-5.7,glass);
 for(const x of[-1.9,1.9]){const col=new THREE.Mesh(new THREE.CylinderGeometry(.20,.23,3.5,10),trim);col.position.set(x,1.9,-6.25);col.castShadow=true;group.add(col);}
 box(4.5,.34,2.1,0,3.62,-6.15,trim);box(4.65,.18,2.22,0,3.82,-6.18,blue);
 for(const x of[-1.65,1.65]){const beacon=new THREE.Mesh(new THREE.SphereGeometry(.17,10,10),new THREE.MeshBasicMaterial({color:0x389bff}));beacon.position.set(x,3.98,-7.1);group.add(beacon);}
 for(let st=0;st<3;st++)box(4.6-st*.3,.11,1.9-st*.28,0,.22+st*.09,-6.1,baseStone);
 const crest=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,12),gold);crest.rotation.x=Math.PI/2;crest.position.set(0,6.65,-5.64);group.add(crest);
 const face=new THREE.MeshStandardMaterial({map:roadSignTexture('قسم '+(name.includes('أول')?'أول':'ثاني')+' · أسيوط'),roughness:.4});
 const fascia=box(9.0,1.24,.12,0,4.55,-5.66,[iron,iron,iron,iron,iron,face]);fascia.name='StationWallSign';
 // هوائي اتصالات أعلى القسم وسارية العلم
 const tower=new THREE.Mesh(new THREE.CylinderGeometry(.04,.11,3.2,6),iron);tower.position.set(4.5,11.9,1.5);group.add(tower);
 for(const x of[-7,7]){box(.40,2.8,.40,x,1.4,-9.5,trim);for(let j=0;j<6;j++)box(.05,1.15,.06,x+(x<0?j*.38:-j*.38),1.0,-9.5,iron);}
 // كشك حراسة وبوابة حواجز بألوان الشرطة والمرور
 box(1.75,2.45,1.75,5.3,1.35,-8.1,trim);box(1.9,.18,1.9,5.3,2.65,-8.1,blue);box(1.3,1.05,1.8,5.3,1.65,-8.1,glass);
 box(2.4,.68,.46,-3.8,.45,-9.5,new THREE.MeshStandardMaterial({color:0xd8d8d0,roughness:.9}));box(.7,.70,.48,-3.8,.46,-9.5,blue);
 box(2.4,.68,.46,3.1,.45,-9.5,new THREE.MeshStandardMaterial({color:0xc93b36,roughness:.85}));
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,7.4,8),iron);mast.position.set(-6.5,3.7,-7);group.add(mast);
 for(let i=0;i<3;i++){const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.28),new THREE.MeshStandardMaterial({color:[0xc82530,0xf6f3ea,0x151d26][i],side:THREE.DoubleSide,roughness:.8}));flag.position.set(-5.82,7.1-i*.28,-7);group.add(flag);}
 const paving=box(23,.16,19,0,.10,-2.7,new THREE.MeshStandardMaterial({color:0x9ea299,roughness:.93}));paving.receiveShadow=true;
 return group;
}
function createStationArrivalBay(station){
 const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:0x236e69,roughness:.9}),white=new THREE.MeshBasicMaterial({color:0xebf4df});
 const floor=new THREE.Mesh(new THREE.BoxGeometry(8,.035,3.4),paint);floor.position.y=.19;group.add(floor);
 for(const z of[-1.65,1.65]){const line=new THREE.Mesh(new THREE.BoxGeometry(8,.012,.10),white);line.position.set(0,.215,z);group.add(line);}for(const x of[-3.95,3.95]){const line=new THREE.Mesh(new THREE.BoxGeometry(.10,.012,3.4),white);line.position.set(x,.215,0);group.add(line);}
 const word=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.85),new THREE.MeshStandardMaterial({map:roadSignTexture('منطقة التسليم'),roughness:.8}));word.rotation.x=-Math.PI/2;word.position.y=.223;group.add(word);group.position.set(station.stop.x,0,station.stop.z);group.rotation.y=-Math.atan2(station.tz,station.tx);REAL_CITY.group.add(group);station.bay=group;
}
function policeStationArrival(station){const dx=car.x-station.stop.x,dz=car.z-station.stop.z;return Math.abs(dx*station.tx+dz*station.tz)<6&&Math.abs(dx*station.nx+dz*station.nz)<3.5&&Math.abs(car.y-.18)<.9;}
