/* Playable OSM bridge/tunnel alignments; no claim of surveyed engineering heights. */
function infrastructureRoadPoint(road,d){const r=ASSYUT.roads[road];for(const si of r.segments){const s=ASSYUT.segments[si];if(d<=s.s0+s.length||si===r.segments[r.segments.length-1]){const t=clamp((d-s.s0)/s.length,0,1);return{x:lerp(s.a.x,s.b.x,t),z:lerp(s.a.z,s.b.z,t),h:infrastructureHeight(road,d),fx:(s.b.x-s.a.x)/s.length,fz:(s.b.z-s.a.z)/s.length};}}}
{
 const bridgeConcreteTex=canvasTex(128,128,g=>{g.fillStyle='#8f9693';g.fillRect(0,0,128,128);for(let i=0;i<900;i++){const v=(Math.random()*24)|0;g.fillStyle=`rgba(${v+130},${v+135},${v+132},0.15)`;g.fillRect(Math.random()*128,Math.random()*128,2,2);}g.strokeStyle='rgba(70,76,73,0.22)';g.lineWidth=1;g.strokeRect(0,0,128,128);});bridgeConcreteTex.wrapS=bridgeConcreteTex.wrapT=THREE.RepeatWrapping;bridgeConcreteTex.repeat.set(2,2);
 const barrierTex=canvasTex(256,64,g=>{g.fillStyle='#8e9693';g.fillRect(0,0,256,64);g.fillStyle='#757c79';g.fillRect(0,48,256,16);g.fillStyle='#5c6360';g.fillRect(0,16,256,24);g.fillStyle='#b8bfbc';g.fillRect(0,18,256,8);g.fillStyle='#4c524f';g.fillRect(0,38,256,2);for(let x=16;x<256;x+=64){g.fillStyle='#3c423f';g.fillRect(x,16,4,24);g.fillStyle='#e0e6e3';g.fillRect(x+1,24,2,8);}});barrierTex.wrapS=barrierTex.wrapT=THREE.RepeatWrapping;barrierTex.repeat.set(4,1);
 const barrierMat=new THREE.MeshStandardMaterial({map:barrierTex,roughness:.72,metalness:.25});
 const mat=(typeof REAL_CITY!=='undefined'&&REAL_CITY.roadMat)?REAL_CITY.roadMat:surfaceMaterial('asphalt',4,4,0x777b7c,4),concrete=new THREE.MeshStandardMaterial({map:bridgeConcreteTex,color:0x9fa6a2,roughness:.88}),pierMat=new THREE.MeshStandardMaterial({color:0x868e88,roughness:.92}),inside=new THREE.MeshStandardMaterial({color:0x536064,roughness:.9,side:THREE.DoubleSide}),vergeTex=(typeof loadEgyptianTexture==='function')?loadEgyptianTexture('assets/textures/egypt/egypt-asphalt-color.jpg',0.35,0.35,true):null,vergeMat=vergeTex?new THREE.MeshStandardMaterial({map:vergeTex,color:0xc9ba9e,roughness:.96,envMapIntensity:.08}):(REAL_CITY.grassMat||new THREE.MeshStandardMaterial({color:0xa29278,roughness:.96})),group=new THREE.Group();REAL_CITY.group.add(group);
 const makeQuad=(pts,idx,material,cast=true)=>{const v=[];for(const i of idx)v.push(...pts[i]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));const uv=[];for(let i=0;i<v.length;i+=3)uv.push(v[i]/4,v[i+2]/4);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=cast;group.add(mesh);};
 const quad=(a,b,w,yadd,material,offset=0,na={x:-a.fz,z:a.fx},nb={x:-b.fz,z:b.fx},idx=[0,2,1,0,3,2])=>{const p=[[a.x+na.x*(offset-w/2),a.h+yadd,a.z+na.z*(offset-w/2)],[b.x+nb.x*(offset-w/2),b.h+yadd,b.z+nb.z*(offset-w/2)],[b.x+nb.x*(offset+w/2),b.h+yadd,b.z+nb.z*(offset+w/2)],[a.x+na.x*(offset+w/2),a.h+yadd,a.z+na.z*(offset+w/2)]];makeQuad(p,idx,material,yadd!==.03);};
 const bridgeStops=(ri,p)=>{const road=ASSYUT.roads[ri],raw=[0,p.length];for(let d=5;d<p.length;d+=5)raw.push(d);for(const si of road.segments)raw.push(ASSYUT.segments[si].s0);raw.sort((u,v)=>u-v);const out=[];for(const d of raw)if(!out.length||d-out[out.length-1]>.2)out.push(clamp(d,0,p.length));if(out[out.length-1]<p.length-.05)out.push(p.length);return out;};
 const groundClear=(px,pz,ri)=>{if(typeof onDrivingRoad==='function'&&onDrivingRoad(px,pz,1.6))return false;const cx=Math.floor(px/ASSYUT.cell),cz=Math.floor(pz/ASSYUT.cell),seen=new Set();for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(const idx of ASSYUT.spatial.get(a+','+b)||[]){if(seen.has(idx))continue;seen.add(idx);const s=ASSYUT.segments[idx];const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((px-s.a.x)*dx+(pz-s.a.z)*dz)/(s.length*s.length),0,1),dist=Math.hypot(px-s.a.x-dx*t,pz-s.a.z-dz*t),h=infrastructureHeight(s.road,s.s0+t*s.length);if(h<1.2&&dist<s.width/2+1.4)return false;}return typeof segmentHitsBuilding!=='function'||!segmentHitsBuilding({x:px-.75,z:pz-.75},{x:px+.75,z:pz+.75},.55);};
 const addPierColumn=(px,pz,colH)=>{if(colH<.8)return;const post=new THREE.Mesh(new THREE.BoxGeometry(.75,colH,.75),pierMat);post.position.set(px,colH/2,pz);post.castShadow=true;post.receiveShadow=true;group.add(post);const foot=new THREE.Mesh(new THREE.BoxGeometry(1.15,.36,1.15),concrete);foot.position.set(px,.18,pz);foot.receiveShadow=true;group.add(foot);
  // Store the top of the physical support as well as its footprint.  A
  // support below an elevated deck must not collide with a car on that deck.
  INFRA.supports.push({x:px,z:pz,top:colH,kind:'bridge-support'});
 };
 for(const [ri,p]of INFRA.profiles){const road=ASSYUT.roads[ri],w=road.width;INFRA.structures.push(p);
  const stops=bridgeStops(ri,p),pts=stops.map(d=>infrastructureRoadPoint(ri,d));
  const norms=pts.map((pt,i)=>{const prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz)||1;return{x:-dz/l,z:dx/l};});
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],na=norms[i],nb=norms[i+1],len=Math.hypot(b.x-a.x,b.z-a.z),heading=-Math.atan2(b.z-a.z,b.x-a.x),slope=Math.atan2(b.h-a.h,len);quad(a,b,w,.03,mat,0,na,nb);
   const segNx=-(b.z-a.z)/(len||1),segNz=(b.x-a.x)/(len||1);
   for(const side of[-1,1]){const cx=(a.x+b.x)/2+segNx*side*(w/2+.28),cz=(a.z+b.z)/2+segNz*side*(w/2+.28),height=p.kind==='tunnel'?3.3:.70;
    const wall=new THREE.Mesh(new THREE.BoxGeometry(len+.16,height,.30),p.kind==='tunnel'?inside:barrierMat);wall.position.set(cx,(a.h+b.h)/2+height/2,cz);wall.rotation.y=heading;wall.rotation.z=slope;wall.castShadow=true;wall.receiveShadow=true;group.add(wall);INFRA.barriers.push({x:cx,z:cz,heading,hl:Math.max(.4,len/2-.15),hw:.18,h:(a.h+b.h)/2,height,kind:p.kind,road:ri});
   }
   if(p.kind==='tunnel'&&a.h<-1.4&&b.h<-1.4){quad(a,b,w+1,3.3,inside,0,na,nb);if(i%3===0){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.8,.04,.3),new THREE.MeshBasicMaterial({color:0xffe7b3,toneMapped:false}));lamp.position.set((a.x+b.x)/2,(a.h+b.h)/2+3.22,(a.z+b.z)/2);group.add(lamp);}}
   if(p.kind==='bridge'){const bw=w+.56,yT=-.02,yB=-.48;
    quad(a,b,bw,yB,concrete,0,na,nb,[0,1,2,0,2,3]);
    makeQuad([[a.x-na.x*bw/2,a.h+yT,a.z-na.z*bw/2],[b.x-nb.x*bw/2,b.h+yT,b.z-nb.z*bw/2],[b.x-nb.x*bw/2,b.h+yB,b.z-nb.z*bw/2],[a.x-na.x*bw/2,a.h+yB,a.z-na.z*bw/2]],[0,1,2,0,2,3],concrete,true);
    makeQuad([[a.x+na.x*bw/2,a.h+yT,a.z+na.z*bw/2],[b.x+nb.x*bw/2,b.h+yT,b.z+nb.z*bw/2],[b.x+nb.x*bw/2,b.h+yB,b.z+nb.z*bw/2],[a.x+na.x*bw/2,a.h+yB,a.z+nb.z*bw/2]],[0,2,1,0,3,2],concrete,true);
   }
  }
  if(p.kind==='bridge')for(let pd=18;pd<p.length-12;pd+=20){let placed=false;
   for(const shift of[0,-3,3,-6,6]){if(placed)break;const d=clamp(pd+shift,14,p.length-10),pt=infrastructureRoadPoint(ri,d);if(pt.h<1.25)continue;
    const nx=-pt.fz,nz=pt.fx,heading=-Math.atan2(pt.fz,pt.fx),colH=pt.h-.45;
    for(const mode of[w/2-.85,w/2+.95,0]){const offs=mode===0?[0]:[-mode,mode];
     if(offs.every(o=>groundClear(pt.x+nx*o,pt.z+nz*o,ri))){for(const o of offs)addPierColumn(pt.x+nx*o,pt.z+nz*o,colH);
      const capW=mode===0?Math.max(4,w-.6):mode*2+1.25,cap=new THREE.Mesh(new THREE.BoxGeometry(.95,.46,capW),concrete);cap.position.set(pt.x,pt.h-.58,pt.z);cap.rotation.y=heading;cap.castShadow=true;cap.receiveShadow=true;group.add(cap);placed=true;break;
     }
    }
   }
  }
  // Mounted on the verge, outside the bridge deck and its crash barrier.
  const start=infrastructureRoadPoint(ri,Math.min(15,p.length*.15)),sign=makeMountedRoadSign(p.name,5.2,1.05,4.1+Math.max(0,start.h));
  const sx1=start.x-start.fz*(w/2+3.5),sz1=start.z+start.fx*(w/2+3.5),sx2=start.x+start.fz*(w/2+3.5),sz2=start.z-start.fx*(w/2+3.5);
  const useFirst=groundClear(sx1,sz1,ri)||!groundClear(sx2,sz2,ri);
  sign.position.set(useFirst?sx1:sx2,0,useFirst?sz1:sz2);sign.rotation.y=-Math.atan2(start.fz,start.fx)+(useFirst?-Math.PI/2:Math.PI/2);(REAL_CITY.signs??=[]).push(sign);group.add(sign);
  if(p.kind==='tunnel'&&typeof makeOverheadGantry==='function'){
    const isManfaz=/منفذ/.test(p.name||'');
    const leftTitle=isManfaz?'نفق المنفذ':'نفق الأزهر';
    const rightTitle=isManfaz?'محطة أسيوط · شارع الجمهورية':'شارع الجيش · جامعة أسيوط';
    const gantry=makeOverheadGantry(leftTitle,rightTitle,w+3.6,5.4,isManfaz?'المنفذ · حي غرب':'الأزهر · شرق أسيوط');
    gantry.position.set(start.x,0,start.z);gantry.rotation.y=-Math.atan2(start.fz,start.fx);REAL_CITY.group.add(gantry);
    // يافطة زرقاء ثانية على مدخل النفق من الجهة المقابلة
    const endPt=infrastructureRoadPoint(ri,Math.max(p.length*.85,p.length-14));
    const gantryEnd=makeOverheadGantry(leftTitle,isManfaz?'شارع الجلاء · ميدان المحطة':'وسط أسيوط',w+3.6,5.4,isManfaz?'المنفذ · اتجاه المحطة':'نفق الأزهر');
    gantryEnd.position.set(endPt.x,0,endPt.z);gantryEnd.rotation.y=-Math.atan2(endPt.fz,endPt.fx)+Math.PI;REAL_CITY.group.add(gantryEnd);
  }
 }
 // Batch static engineering meshes to avoid hundreds of draw calls.
 const batches=new Map();group.updateMatrixWorld(true);
 for(const mesh of group.children.slice()){if(!mesh.isMesh)continue;const m=mesh.material,key=[m.type,m.color.getHex(),m.map?.uuid||'',m.side].join(':');if(!batches.has(key))batches.set(key,{mat:m,p:[],n:[],uv:[]});const b=batches.get(key),geo=mesh.geometry.clone().applyMatrix4(mesh.matrix),plain=geo.index?geo.toNonIndexed():geo,pos=plain.attributes.position,norm=plain.attributes.normal,uv=plain.attributes.uv;for(let i=0;i<pos.count;i++){b.p.push(pos.getX(i),pos.getY(i),pos.getZ(i));b.n.push(norm.getX(i),norm.getY(i),norm.getZ(i));b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}group.remove(mesh);mesh.geometry.dispose();geo.dispose();if(plain!==geo)plain.dispose();}
 for(const b of batches.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));const mesh=new THREE.Mesh(geo,b.mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 // Cut depressed tunnel corridors cleanly out of the flat city ground so terrain never slices into tunnels.
 const tunnelSegs=ASSYUT.segments.filter(s=>INFRA.profiles.get(s.road)?.kind==='tunnel');
 const overDepressedTunnel=(px,pz,pad=0.6)=>{for(const s of tunnelSegs){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((px-s.a.x)*dx+(pz-s.a.z)*dz)/(s.length*s.length),0,1),dist=Math.hypot(px-s.a.x-dx*t,pz-s.a.z-dz*t);if(dist<s.width/2+pad&&infrastructureHeight(s.road,s.s0+t*s.length)<-0.02)return true;}return false;};
 const tileOverTunnel=(tx,tz,sz)=>overDepressedTunnel(tx,tz,.8)||overDepressedTunnel(tx+sz,tz,.8)||overDepressedTunnel(tx,tz+sz,.8)||overDepressedTunnel(tx+sz,tz+sz,.8)||overDepressedTunnel(tx+sz/2,tz+sz/2,.8);
 const old=REAL_CITY.group.children.find(o=>o.userData.cityGround);if(old){REAL_CITY.group.remove(old);old.geometry.dispose();const vertices=[],uv=[];const pushTile=(tx,tz,sz)=>{const pts=[[tx,-.025,tz],[tx+sz,-.025,tz+sz],[tx+sz,-.025,tz],[tx,-.025,tz],[tx,-.025,tz+sz],[tx+sz,-.025,tz+sz]];for(const q of pts){vertices.push(q[0],q[1],q[2]);uv.push(q[0]/12,q[2]/12);}};for(let z=-1050;z<1550;z+=24)for(let x=-1250;x<1250;x+=24){if(overDepressedTunnel(x+12,z+12,24)){for(let sz=0;sz<24;sz+=4)for(let sx=0;sx<24;sx+=4)if(!tileOverTunnel(x+sx,z+sz,4))pushTile(x+sx,z+sz,4);}else{pushTile(x,z,24);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const terrainTex=(typeof loadEgyptianTexture==='function')?loadEgyptianTexture('assets/textures/egypt/egypt-asphalt-color.jpg',1,1,true):null;const terrainNorm=(typeof loadEgyptianTexture==='function')?loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_NormalGL.jpg',1.5,1.5,false):null;const terrainMat=terrainTex?new THREE.MeshStandardMaterial({map:terrainTex,normalMap:terrainNorm,color:0xc9ba9e,roughness:.96,metalness:0,normalScale:new THREE.Vector2(.8,.8),envMapIntensity:.08}):(REAL_CITY.groundMat||new THREE.MeshStandardMaterial({color:0xa69d88,roughness:1}));const terrain=new THREE.Mesh(geo,terrainMat);terrain.receiveShadow=true;REAL_CITY.group.add(terrain);}
}
function driveSurfaceCandidates(x,z){
 const cx=Math.floor(x/ASSYUT.cell),cz=Math.floor(z/ASSYUT.cell),seen=new Set(),result=[];
 for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(const index of ASSYUT.spatial.get(a+','+b)||[]){if(seen.has(index))continue;seen.add(index);const s=ASSYUT.segments[index],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,raw=((x-s.a.x)*dx+(z-s.a.z)*dz)/(s.length*s.length),t=clamp(raw,0,1),distance=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(distance>s.width/2+2.3)continue;result.push({road:s.road,s,t,raw,distance,height:infrastructureHeight(s.road,s.s0+t*s.length)+(distance>s.width/2?.18:0),alignment:Math.abs((dx*Math.cos(car.heading)-dz*Math.sin(car.heading))/s.length)});}
 return result;
}
function selectDrivingSurface(){
 const candidates=driveSurfaceCandidates(car.x,car.z);
 const curKind=INFRA.profiles.get(car.surfaceRoad)?.kind;
 const locked=candidates.filter(p=>p.road===car.surfaceRoad&&INFRA.profiles.has(p.road)&&p.distance<p.s.width/2+(curKind==='tunnel'&&car.y<-0.2?2.2:.65)&&p.raw>=-.08&&p.raw<=1.08).sort((a,b)=>a.distance-b.distance)[0];
 if(locked&&Math.abs(locked.height-car.y)<1.4)return;
 let best=null;for(const p of candidates){if(Math.abs(p.height-car.y)>1.15)continue;if(car.y<-0.35&&p.height>-0.15)continue;const ramp=INFRA.profiles.has(p.road)&&Math.abs(p.height)<.65&&p.alignment>.85&&p.raw>=0&&p.raw<=1;const score=p.distance*.45+Math.abs(p.height-car.y)*2+(1-p.alignment)*1.8-(ramp?2.5:0);if(!best||score<best.score)best={...p,score};}if(best)car.surfaceRoad=best.road;else if(car.y>=-0.2)car.surfaceRoad=undefined;
}
function sampledDriveHeight(x,z,currentY,preferredRoad){
 for(const p of STATION_SURFACES){const dx=x-p.x,dz=z-p.z,lx=dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw),lz=dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw)+2.7;if(Math.abs(lx)<11.5&&Math.abs(lz)<9.5)return .18;}
 const candidates=driveSurfaceCandidates(x,z);
 if(Number.isInteger(preferredRoad)&&INFRA.profiles.has(preferredRoad)){const same=candidates.filter(p=>p.road===preferredRoad).sort((a,b)=>a.distance-b.distance)[0];if(same&&Math.abs(same.height-currentY)<=1.25)return same.height;}
 let best=null;for(const p of candidates){if(Math.abs(p.height-currentY)>1.25)continue;const score=p.distance*.45+Math.abs(p.height-currentY)*2;if(!best||score<best.score)best={...p,score};}
 if(best)return best.height;
 if(currentY<-0.3||currentY>0.6)return currentY;
 return assyutRoadHeightAt(x,z);
}
function resolveInfrastructureRails(){
 for(const b of INFRA.barriers){
  if(Math.abs(car.x-b.x)>b.hl+4||Math.abs(car.z-b.z)>b.hl+4)continue;
  const bh=b.height??.70;
  // حاجز الكوبري لا ينتمي إلا لسطح الطريق الذي بُني عليه؛ هذا يمنع
  // اصطدام السيارة بحاجز قريب وهي تسير فوق كوبري آخر.
  const sameDeck=car.surfaceRoad===b.road||driveSurfaceCandidates(car.x,car.z).some(p=>p.road===b.road&&p.distance<p.s.width/2+1.25);
  const bridgeHeightOverlap = b.kind === 'bridge' && (car.y + 1.80 > b.h - 0.45) && (car.y < b.h + bh + 0.2);
  const solid=b.kind==='tunnel'?(car.y<-0.25&&sameDeck&&car.y+1.5>=b.h&&car.y<=b.h+bh+.3):((sameDeck&&Math.abs(car.y-b.h)<1.35)||bridgeHeightOverlap);
  if(!solid)continue;
  const hit=obbContact(playerBounds(),b);if(hit)recordImpact(staticContact(hit),'حاجز الطريق · خفّف السرعة');
 }
 // Supports are vertical objects.  Check their height, not just their X/Z
 // footprint; otherwise a car driving on the deck hits a pier underneath it.
 for(const f of [...(INFRA.supports||[]),...(ROAD_FURNITURE||[])]){
  if(f.kind!=='bridge-support'||Math.abs(car.x-f.x)>5||Math.abs(car.z-f.z)>5)continue;
  const top=Number.isFinite(f.top)?f.top:2.25;
  if(car.y>top+.18||car.y<-0.4)continue;
  const hit=obbContact(playerBounds(),{x:f.x,z:f.z,heading:0,hl:.38,hw:.38});
  if(hit)recordImpact(staticContact(hit),'دعامة الكوبري · خفّف السرعة');
 }
}
