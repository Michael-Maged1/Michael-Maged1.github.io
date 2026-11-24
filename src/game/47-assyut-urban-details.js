/* Egyptian urban detail pass: lightweight visual props, never solid collision. */
const ASSYUT_DETAIL_MATS={
  tank:new THREE.MeshStandardMaterial({color:0x263b48,roughness:.72,metalness:.12}),
  tankBand:new THREE.MeshStandardMaterial({color:0xb3b7ad,roughness:.68,metalness:.28}),
  dish:new THREE.MeshStandardMaterial({color:0xb8b8ad,roughness:.62,metalness:.25}),
  pole:new THREE.MeshStandardMaterial({color:0x30383b,roughness:.8,metalness:.45}),
  wire:new THREE.LineBasicMaterial({color:0x141719,transparent:true,opacity:.72}),
  awningRed:new THREE.MeshStandardMaterial({color:0x9d3425,roughness:.82}),
  awningBlue:new THREE.MeshStandardMaterial({color:0x1e5872,roughness:.82}),
  awningGreen:new THREE.MeshStandardMaterial({color:0x3e6d4b,roughness:.82}),
  crate:new THREE.MeshStandardMaterial({color:0x806044,roughness:.9}),
  curb:new THREE.MeshStandardMaterial({color:0xc7b58e,roughness:.92})
};

function addRooftopEgyptianDetails(){
  const tankGeo=new THREE.CylinderGeometry(.55,.55,1.05,12),bandGeo=new THREE.CylinderGeometry(.59,.59,.08,12);
  const dishGeo=new THREE.SphereGeometry(.46,12,6,0,Math.PI*2,0,Math.PI*.42);
  let idx=0;
  for(const b of REAL_CITY.buildings){
    if(!b||b.h<8||idx++%4!==0)continue;
    const g=new THREE.Group();g.position.set(b.x,b.h+.05,b.z);g.rotation.y=(idx%8)*.37;
    const tank=new THREE.Mesh(tankGeo,ASSYUT_DETAIL_MATS.tank);tank.position.set((idx%3-1)*.65,.55,(idx%2-.5)*.55);tank.castShadow=true;g.add(tank);
    const band=new THREE.Mesh(bandGeo,ASSYUT_DETAIL_MATS.tankBand);band.position.copy(tank.position);band.position.y+=.17;g.add(band);
    if(idx%2===0){const dish=new THREE.Mesh(dishGeo,ASSYUT_DETAIL_MATS.dish);dish.position.set(.9,.8,.15);dish.rotation.x=-Math.PI/2.7;dish.scale.set(1,.28,1);dish.castShadow=true;g.add(dish);}
    REAL_CITY.group.add(g);
  }
}

function addUtilityPolesAndWires(){
  const all=[];
  for(let ri=0;ri<ASSYUT.roads.length;ri++){
    const road=ASSYUT.roads[ri];if(road.width<9||INFRA.profiles.has(ri))continue;
    let side=ri%2?1:-1;
    for(const si of road.segments){
      const s=ASSYUT.segments[si];if(s.length<28)continue;
      const nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length;
      const points=[];
      for(let d=18;d<s.length-10;d+=72){
        const x=lerp(s.a.x,s.b.x,d/s.length)+nx*side*(road.width/2+2.7),z=lerp(s.a.z,s.b.z,d/s.length)+nz*side*(road.width/2+2.7);
        const near=nearestAssyutRoad({x,z});if(!near||near.distance<near.width/2+1.1)continue;
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.10,5.4,7),ASSYUT_DETAIL_MATS.pole);pole.position.set(x,2.7,z);pole.castShadow=true;REAL_CITY.group.add(pole);
        const arm=new THREE.Mesh(new THREE.BoxGeometry(1.15,.08,.08),ASSYUT_DETAIL_MATS.pole);arm.position.set(x,5.12,z);arm.rotation.y=near.heading;REAL_CITY.group.add(arm);
        points.push(new THREE.Vector3(x,5.12,z));
      }
      if(points.length>1){const geo=new THREE.BufferGeometry().setFromPoints(points);const line=new THREE.Line(geo,ASSYUT_DETAIL_MATS.wire);line.frustumCulled=false;REAL_CITY.group.add(line);all.push(line);}
      side*=-1;
    }
  }

  // كابلات كهرباء وتليفونات معلقة متقاطعة بين عمارات جانبي الشارع (طابع مصري أصيل)
  for(let ri=0;ri<ASSYUT.roads.length;ri++){
    const road=ASSYUT.roads[ri];if(road.width<8.5||INFRA.profiles.has(ri))continue;
    for(let si=0;si<road.segments.length;si+=2){
      const s=ASSYUT.segments[road.segments[si]];if(!s||s.length<20)continue;
      const nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length;
      for(let d=10;d<s.length-6;d+=28){
        const mx=lerp(s.a.x,s.b.x,d/s.length),mz=lerp(s.a.z,s.b.z,d/s.length);
        const baseY=assyutRoadHeightAt(mx,mz);
        const halfW=road.width/2+2.2;
        const strands=road.width>=10?2:1;
        for(let st=0;st<strands;st++){
          const y1=baseY+7.4+st*0.48+cityRand(0,1.8),y2=baseY+7.2+st*0.42+cityRand(0,1.8);
          const midY=Math.min(y1,y2)-(1.45+st*0.35);
          const pL=new THREE.Vector3(mx-nx*halfW,y1,mz-nz*halfW);
          const pM=new THREE.Vector3(mx+cityRand(-.8,.8),midY,mz+cityRand(-.8,.8));
          const pR=new THREE.Vector3(mx+nx*halfW,y2,mz+nz*halfW);
          const curve=new THREE.QuadraticBezierCurve3(pL,pM,pR);
          const pts=curve.getPoints(8);
          const geo=new THREE.BufferGeometry().setFromPoints(pts);
          const line=new THREE.Line(geo,ASSYUT_DETAIL_MATS.wire);
          line.frustumCulled=false;REAL_CITY.group.add(line);all.push(line);
        }
      }
    }
  }

  REAL_CITY.utilityWires=all.length;
}

function addEgyptianShopfrontDetails(){
  const awnings=[ASSYUT_DETAIL_MATS.awningRed,ASSYUT_DETAIL_MATS.awningBlue,ASSYUT_DETAIL_MATS.awningGreen];
  let count=0;
  for(let i=0;i<ASSYUT.places.length&&count<80;i+=2){
    const p=ASSYUT.places[i],n=nearestAssyutRoad(p);if(!p||!n)continue;
    const x=n.point.x+n.nx*(n.width/2+1.45),z=n.point.z+n.nz*(n.width/2+1.45);
    if(n.distance<n.width/2+.8)continue;
    const awning=new THREE.Mesh(new THREE.BoxGeometry(2.8,.08,1.15),awnings[count%awnings.length]);
    awning.position.set(x,2.35,z);awning.rotation.y=n.heading+Math.PI/2;awning.castShadow=true;REAL_CITY.group.add(awning);
    for(const side of[-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,1.15,6),ASSYUT_DETAIL_MATS.pole);const dx=Math.cos(n.heading)*side*.95,dz=-Math.sin(n.heading)*side*.95;leg.position.set(x+dx,1.78,z+dz);REAL_CITY.group.add(leg);}
    if(count%3===0){const crate=new THREE.Mesh(new THREE.BoxGeometry(.55,.42,.55),ASSYUT_DETAIL_MATS.crate);crate.position.set(x+n.nx*.8,.22,z+n.nz*.8);crate.rotation.y=n.heading;REAL_CITY.group.add(crate);}
    count++;
  }
  REAL_CITY.shopDetails=count;
}

function addAssyutUrbanDetailPass(){
  if(typeof REAL_CITY==='undefined'||!REAL_CITY.group)return;
  addRooftopEgyptianDetails();
  addUtilityPolesAndWires();
  addEgyptianShopfrontDetails();
}

function addRoadWearAndRepairs(){
  const roadCfg=(typeof VISUAL_CONFIG!=='undefined'&&VISUAL_CONFIG.road)?VISUAL_CONFIG.road:{};
  const patchMats=[
    new THREE.MeshStandardMaterial({color:0x27292a,roughness:.92,metalness:.05,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}),
    new THREE.MeshStandardMaterial({color:0x343739,roughness:.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}),
    new THREE.MeshStandardMaterial({color:0x414446,roughness:.96,metalness:0,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5})
  ];
  const crackMat=new THREE.LineBasicMaterial({color:0x222526,transparent:true,opacity:.52});

  const manholeTex=canvasTex(64,64,g=>{
    g.fillStyle='#2b2d2f';g.fillRect(0,0,64,64);
    g.strokeStyle='#4a4d52';g.lineWidth=3;
    g.beginPath();g.arc(32,32,28,0,Math.PI*2);g.stroke();
    g.beginPath();g.arc(32,32,19,0,Math.PI*2);g.stroke();
    g.beginPath();g.arc(32,32,10,0,Math.PI*2);g.stroke();
    for(let a=0;a<Math.PI*2;a+=Math.PI/4){
      g.beginPath();g.moveTo(32+Math.cos(a)*10,32+Math.sin(a)*10);
      g.lineTo(32+Math.cos(a)*28,32+Math.sin(a)*28);g.stroke();
    }
  });
  const manholeMat=new THREE.MeshStandardMaterial({map:manholeTex,roughness:.65,metalness:.45,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  const manholeGeo=new THREE.CircleGeometry(.46,16);
  manholeGeo.rotateX(-Math.PI/2);

  // بقع زيت محركات قديمة متسربة في منتصف الحارات (طابع الشوارع المصرية الواقعية)
  const oilTex=canvasTex(64,64,g=>{
    const rad=g.createRadialGradient(32,32,3,32,32,28);
    rad.addColorStop(0,'rgba(20,16,14,0.72)');
    rad.addColorStop(0.35,'rgba(25,20,16,0.48)');
    rad.addColorStop(0.75,'rgba(35,28,24,0.18)');
    rad.addColorStop(1,'rgba(35,28,24,0)');
    g.fillStyle=rad;
    g.beginPath();g.ellipse(32,32,28,22,0.25,0,Math.PI*2);g.fill();
    const rad2=g.createRadialGradient(42,24,1,42,24,8);
    rad2.addColorStop(0,'rgba(16,12,10,0.60)');rad2.addColorStop(1,'rgba(16,12,10,0)');
    g.fillStyle=rad2;g.beginPath();g.arc(42,24,8,0,Math.PI*2);g.fill();
  });
  const oilMat=new THREE.MeshBasicMaterial({map:oilTex,transparent:true,opacity:0.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const oilGeo=new THREE.PlaneGeometry(1.4,2.2);
  oilGeo.rotateX(-Math.PI/2);

  // شرائط تراكم أتربة وغبار رملي بجوار حواف الأرصفة
  const curbDustTex=canvasTex(128,32,g=>{
    const grad=g.createLinearGradient(0,0,0,32);
    grad.addColorStop(0,'rgba(175,155,124,0.68)');
    grad.addColorStop(0.4,'rgba(160,140,112,0.32)');
    grad.addColorStop(1,'rgba(140,122,98,0)');
    g.fillStyle=grad;g.fillRect(0,0,128,32);
    for(let i=0;i<30;i++){
      g.fillStyle=(i%2===0)?'rgba(195,178,145,0.45)':'rgba(120,105,82,0.35)';
      g.fillRect(Math.random()*128,Math.random()*10,1.5,1.5);
    }
  });
  const curbDustMat=new THREE.MeshBasicMaterial({map:curbDustTex,transparent:true,opacity:0.82,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const curbDustGeo=new THREE.PlaneGeometry(8.0,0.6);
  curbDustGeo.rotateX(-Math.PI/2);

  let patches=0,cracks=0,manholes=0,oilStains=0,curbDust=0;
  for(const s of ASSYUT.segments){
    if(s.width<7.5||s.length<16||patches>420)continue;
    const roll=cityRandom();if(roll>.55)continue;
    const t=.18+cityRandom()*.64,x=lerp(s.a.x,s.b.x,t),z=lerp(s.a.z,s.b.z,t),heading=s.heading;
    const rH=assyutRoadHeightAt(x,z);

    if(roadCfg.tarPatches!==false){
      const pMat=patchMats[Math.floor(cityRandom()*patchMats.length)];
      const patch=new THREE.Mesh(new THREE.BoxGeometry(1.5+cityRandom()*2.6,.012,.45+cityRandom()*.42),pMat);
      patch.position.set(x,rH+.012,z);patch.rotation.y=heading+cityRand(-.12,.12);patch.scale.x=Math.min(1.8,s.length/24);patch.receiveShadow=true;REAL_CITY.group.add(patch);patches++;
    }

    // بالوعات صرف صحي من الحديد الزهر في منتصف الحارات
    if(roadCfg.manholes!==false&&cityRandom()<.38&&manholes<140&&s.width>=9){
      const laneOff=(cityRandom()<.5?1:-1)*(s.width*.24);
      const nx=-Math.sin(heading),nz=-Math.cos(heading);
      const mh=new THREE.Mesh(manholeGeo,manholeMat);
      mh.position.set(x+nx*laneOff,rH+.015,z+nz*laneOff);
      mh.receiveShadow=true;REAL_CITY.group.add(mh);manholes++;
    }

    if(roadCfg.cracks!==false&&cityRandom()<.65&&cracks<220){
      const fx=Math.cos(heading),fz=-Math.sin(heading),rx=-fz,rz=fx,len=.9+cityRandom()*2.1;
      const pts=[new THREE.Vector3(x-rx*.28,rH+.016,z-rz*.28),new THREE.Vector3(x+fx*len*.35+rx*.14,rH+.016,z+fz*len*.35+rz*.14),new THREE.Vector3(x+fx*len+rx*.32,rH+.016,z+fz*len+rz*.32)];
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),crackMat);REAL_CITY.group.add(line);cracks++;
    }

    // بقع زيت محركات في منتصف مسار مرور السيارات
    if(roadCfg.oilStains!==false&&cityRandom()<.42&&oilStains<180){
      const laneOff=(cityRandom()<.5?1:-1)*(s.width*.22);
      const nx=-Math.sin(heading),nz=-Math.cos(heading);
      const oil=new THREE.Mesh(oilGeo,oilMat);
      oil.position.set(x+nx*laneOff,rH+.014,z+nz*laneOff);
      oil.rotation.y=heading+cityRand(-.2,.2);
      oil.scale.set(cityRand(.8,1.3),1,cityRand(.9,1.5));
      REAL_CITY.group.add(oil);oilStains++;
    }

    // تراكم أتربة ورمال بجانب البلدورات (طابع شوارع أسيوط)
    if(roadCfg.dustAlongCurbs!==false&&cityRandom()<.58&&curbDust<420){
      const side=cityRandom()<.5?1:-1;
      const curbOff=side*(s.width*.46);
      const nx=-Math.sin(heading),nz=-Math.cos(heading);
      const dust=new THREE.Mesh(curbDustGeo,curbDustMat);
      dust.position.set(x+nx*curbOff,rH+.013,z+nz*curbOff);
      dust.rotation.y=heading+(side>0?0:Math.PI);
      dust.scale.set(cityRand(.9,1.35),1,cityRand(1.1,1.6));
      REAL_CITY.group.add(dust);curbDust++;
    }
  }
  REAL_CITY.roadWear={patches,cracks,manholes,oilStains,curbDust};
}
addRoadWearAndRepairs();
addAssyutUrbanDetailPass();
