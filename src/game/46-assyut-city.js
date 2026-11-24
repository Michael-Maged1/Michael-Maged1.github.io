/* Rebuild the playable city on surveyed OSM lines. Building appearance is authored. */
let citySeed=603711;
function cityRandom(){citySeed=(Math.imul(citySeed,1664525)+1013904223)>>>0;return citySeed/4294967296;}
function cityRand(a,b){return a+cityRandom()*(b-a);}
function cityPick(items){return items[Math.floor(cityRandom()*items.length)];}
const REAL_CITY={group:new THREE.Group(),buildings:[],styles:{},roadMeshes:0,groundMat:null,externalLandmarks:[]};
function isVillageSeg(seg){
 if(!seg)return false;
 if(typeof INFRA!=='undefined'&&INFRA.profiles?.has(seg.road))return false;
 if(seg.width>9.5)return false;
 const road=ASSYUT.roads[seg.road];
 const name=road?.name||'';
 if(/زراع|قرية|درب|حارة|نزلة|درنكة|سوق|الحمراء|ريفي|ريف|شعب|صواف|عفان|بهيج|بني حسين|المطيعة|منقباد/i.test(name))return true;
 const midX=(seg.a.x+seg.b.x)/2,midZ=(seg.a.z+seg.b.z)/2;
 return (midX>450||midZ>450||midZ<-450||(midX<-450&&midZ<-300));
}
REAL_CITY.isVillageSeg=isVillageSeg;
{
 const keep=new Set([sky,clouds,sea]);
 for(const child of scene.children.slice())if(!child.isLight&&!keep.has(child)){scene.remove(child);child.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)o.geometry?.dispose();});}
 sea.visible=false; // This central district does not contain the old fictional seafront.
 for(const a of [MAP.buildings,buildingData,WALK_SURFACES,ROAD_FURNITURE,MEDIAN_SEGMENTS,CURB_SEGMENTS,TREES,TRAFFIC_LIGHTS])a.length=0;
 MAP.streets.length=0;MAP.alleys.length=0;MAP.places=ASSYUT.places;
 for(const {mesh}of nearArchitecture)mesh.visible=false;nearArchitecture.length=0;
 scene.add(REAL_CITY.group);
 const rep=(tx,rx,ry)=>{tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(rx,ry);return tx;};
 const earthTex=rep(canvasTex(256,256,g=>{g.fillStyle='#9e8f77';g.fillRect(0,0,256,256);for(let i=0;i<1100;i++){g.fillStyle=i%4===0?'rgba(135,122,98,.28)':i%3===0?'rgba(180,166,140,.22)':'rgba(110,98,76,.25)';g.fillRect(cityRandom()*252,cityRandom()*252,2+cityRandom()*10,2+cityRandom()*8);}}),160,160);
 const groundMat=REAL_CITY.groundMat=new THREE.MeshStandardMaterial({map:earthTex,color:(typeof VISUAL_CONFIG!=='undefined'&&VISUAL_CONFIG.road?.groundColor)?VISUAL_CONFIG.road.groundColor:0xa29278,roughness:.96,envMapIntensity:.08});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(6500,6500),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.03;ground.receiveShadow=true;ground.userData.cityGround=true;REAL_CITY.group.add(ground);
 const paverTex=rep(canvasTex(128,128,g=>{g.fillStyle='#c2b8a2';g.fillRect(0,0,128,128);g.strokeStyle='#887f6d';g.lineWidth=2;for(let y=0;y<128;y+=16){const off=(y/16)%2?16:0;g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();for(let x=off;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.stroke();}}for(let i=0;i<110;i++){g.fillStyle=i%2?'rgba(255,250,235,.09)':'rgba(55,48,38,.08)';g.fillRect(cityRandom()*124,cityRandom()*124,4,4);}}),1,1);
 const curbTex=rep(canvasTex(512,128,g=>{
  // بلدورة مصرية أبيض وأسود معتقة ومكسرة ومغبرة بالتراب زي شوارع أسيوط
  g.fillStyle='#d8d0c0';g.fillRect(0,0,256,128);
  g.fillStyle='#2a2927';g.fillRect(256,0,256,128);
  // فواصل الحجر وتكسير الطلاء عند الحواف
  g.fillStyle='rgba(75,68,58,0.55)';g.fillRect(252,0,8,128);g.fillRect(0,0,4,128);
  for(let i=0;i<320;i++){
   const bx=cityRandom()*508,by=cityRandom()*118;
   g.fillStyle=cityRandom()<.45?'rgba(168,152,126,0.42)':cityRandom()<.7?'rgba(42,38,34,0.34)':'rgba(225,216,198,0.32)';
   g.fillRect(bx,by,2+cityRandom()*9,2+cityRandom()*6);
  }
  // تقشير دهان خفيف على الجزء الأسود والأبيض
  for(let i=0;i<24;i++){
   g.fillStyle='rgba(150,138,118,0.48)';
   g.fillRect(cityRandom()*490,cityRandom()*30,6+cityRandom()*16,3+cityRandom()*8);
  }
  const dirtGrad=g.createLinearGradient(0,68,0,128);
  dirtGrad.addColorStop(0,'rgba(168,150,122,0)');
  dirtGrad.addColorStop(0.55,'rgba(162,144,116,0.48)');
  dirtGrad.addColorStop(1,'rgba(155,138,110,0.88)');
  g.fillStyle=dirtGrad;g.fillRect(0,68,512,60);
 }),1,1);
 const dirtVergeTex=rep(canvasTex(128,128,g=>{
  g.fillStyle='#9c8c72';g.fillRect(0,0,128,128);
  for(let i=0;i<700;i++){
   const c=cityRandom();
   g.fillStyle=c<.4?'#8a7a60':c<.7?'#b2a084':'#6e5e48';
   g.fillRect(cityRandom()*125,cityRandom()*125,1.5+cityRandom()*3,1.5+cityRandom()*3);
  }
  for(let i=0;i<80;i++){
   g.fillStyle='rgba(110,105,75,0.45)';
   g.fillRect(cityRandom()*126,cityRandom()*126,2,3);
  }
 }),2,2);
 REAL_CITY.grassMat=new THREE.MeshStandardMaterial({map:dirtVergeTex,color:0x9c8c72,roughness:.96,envMapIntensity:.08});
 const terracottaTex=rep(canvasTex(128,128,g=>{g.fillStyle='#a84632';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=16){const off=(y/16)%2?16:0;for(let x=off;x<128;x+=32){g.fillStyle=cityRandom()<.35?'#983c2a':cityRandom()<.5?'#b64f3a':'#a84632';g.fillRect(x+1,y+1,30,14);}}g.strokeStyle='rgba(50,20,14,0.45)';g.lineWidth=1.5;for(let y=0;y<=128;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();}for(let y=0;y<128;y+=16){const off=(y/16)%2?16:0;for(let x=off;x<=128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.stroke();}}}),1,1);
 // نسيج الأسفلت الريفي المعتق والترابي لشوارع وقرى أسيوط (بدون خطوط بيضاء، وترقيعات قار قديمة، وحواف ترابية)
 const villageAsphaltTex=rep(canvasTex(256,256,g=>{
  g.fillStyle='#46423d';g.fillRect(0,0,256,256);
  g.fillStyle='#2c2a27';
  g.fillRect(24,32,54,36);g.fillRect(138,105,72,50);g.fillRect(65,185,58,32);
  g.strokeStyle='#1b1a18';g.lineWidth=1.4;g.beginPath();
  g.moveTo(12,42);g.lineTo(38,50);g.lineTo(60,46);g.lineTo(76,64);
  g.moveTo(132,118);g.lineTo(168,124);g.lineTo(192,146);g.lineTo(210,152);
  g.moveTo(68,198);g.lineTo(92,202);g.lineTo(120,216);g.stroke();
  for(let i=0;i<850;i++){
   const c=cityRandom();
   g.fillStyle=c<.4?'rgba(165,152,126,0.22)':c<.7?'rgba(48,45,40,0.28)':'rgba(205,190,160,0.18)';
   g.fillRect(cityRandom()*254,cityRandom()*254,1.5+cityRandom()*3,1.5+cityRandom()*2.5);
  }
  const gradL=g.createLinearGradient(0,0,28,0);gradL.addColorStop(0,'rgba(175,158,130,0.52)');gradL.addColorStop(1,'rgba(175,158,130,0)');g.fillStyle=gradL;g.fillRect(0,0,28,256);
  const gradR=g.createLinearGradient(228,0,256,0);gradR.addColorStop(0,'rgba(175,158,130,0)');gradR.addColorStop(1,'rgba(175,158,130,0.52)');g.fillStyle=gradR;g.fillRect(228,0,28,256);
 }),1,1);
 const villageWalkTex=rep(canvasTex(128,128,g=>{
  g.fillStyle='#b4a58d';g.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=24){
   const off=(y/24)%2?12:0;g.strokeStyle='#887963';g.lineWidth=1.5;g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();
   for(let x=off;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+24);g.stroke();}
  }
  for(let i=0;i<350;i++){g.fillStyle=cityRandom()<.5?'rgba(140,126,102,0.22)':'rgba(80,72,58,0.18)';g.fillRect(cityRandom()*126,cityRandom()*126,2+cityRandom()*4,2+cityRandom()*4);}
 }),1,1);
 const villageRoadMat=new THREE.MeshStandardMaterial({map:villageAsphaltTex,roughness:.94,metalness:.04,envMapIntensity:.16});
 const villageWalkMat=new THREE.MeshStandardMaterial({map:villageWalkTex,color:0xc2b5a2,roughness:.95,envMapIntensity:.10,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 // نسيج المباني المصرية الاحترافي (طوب أحمر وأعمدة خرسانة / حجر هاشمي وشبابيك تراثية / واجهات أبراج حديثة)
 REAL_CITY.brickTex=rep(canvasTex(256,256,g=>{g.fillStyle='#964633';g.fillRect(0,0,256,256);for(let y=0;y<256;y+=9){g.fillStyle='#6b564b';g.fillRect(0,y,256,1.5);const off=(y/9)%2?10:0;for(let x=off;x<256;x+=20){g.fillStyle=cityRandom()<.35?'#813a2a':cityRandom()<.5?'#aa5640':'#944734';g.fillRect(x,y+1.5,18.6,7.5);}}g.fillStyle='rgba(0,0,0,.14)';for(const y of[0,124])g.fillRect(0,y+11,256,5);g.fillStyle='#8d8b84';for(const x of[0,118,240])g.fillRect(x,0,16,256);for(const y of[0,124])g.fillRect(0,y,256,12);g.fillStyle='#a09d95';for(const x of[2,120])g.fillRect(x,0,3,256);}),1,1);
 REAL_CITY.oldTex=rep(canvasTex(256,256,g=>{g.fillStyle='#cbb28b';g.fillRect(0,0,256,256);for(let i=0;i<360;i++){g.fillStyle=i%2?'rgba(95,72,48,.08)':'rgba(255,244,220,.09)';g.fillRect(cityRandom()*248,cityRandom()*248,5+cityRandom()*15,4+cityRandom()*11);}g.fillStyle='#9e825a';for(let y=0;y<256;y+=64){g.fillRect(0,y,256,5);g.fillStyle='rgba(0,0,0,.09)';g.fillRect(0,y+5,256,4);g.fillStyle='#9e825a';}g.strokeStyle='rgba(115,92,62,.22)';g.lineWidth=1.5;for(let y=0;y<256;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}}),1,1);
 REAL_CITY.modernTex=rep(canvasTex(256,256,g=>{g.fillStyle='#d2d7d6';g.fillRect(0,0,256,256);g.strokeStyle='rgba(65,78,86,.26)';g.lineWidth=2;for(let y=0;y<256;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}for(let x=0;x<256;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x,256);g.stroke();}g.fillStyle='rgba(255,255,255,.10)';for(let y=0;y<256;y+=64)g.fillRect(0,y,256,3);}),1,1);
 REAL_CITY.litGlass=new THREE.MeshStandardMaterial({color:0x4a5e66,roughness:.18,metalness:.3,emissive:0xffcd82,emissiveIntensity:0,envMapIntensity:.75});
 if(typeof nightWindows!=='undefined')nightWindows.push(REAL_CITY.litGlass);
 REAL_CITY.palmBarkTex=rep(canvasTex(64,128,g=>{g.fillStyle='#6e5038';g.fillRect(0,0,64,128);for(let y=0;y<128;y+=8){g.fillStyle=y%16===0?'#513825':'#7d5c40';g.fillRect(0,y,64,4);g.strokeStyle='#3d291a';g.lineWidth=1.5;g.beginPath();g.moveTo(0,y);g.lineTo(64,y+6);g.stroke();}}),1,4);
 REAL_CITY.treeBarkTex=rep(canvasTex(64,128,g=>{g.fillStyle='#594330';g.fillRect(0,0,64,128);for(let i=0;i<60;i++){g.fillStyle=i%2?'#423020':'#6e543d';g.fillRect(cityRandom()*58,cityRandom()*110,3,14+cityRandom()*18);}}),1,2);
 REAL_CITY.palmFrondTex=canvasTex(128,256,g=>{g.clearRect(0,0,128,256);g.strokeStyle='#5a7f31';g.lineWidth=4;g.beginPath();g.moveTo(64,250);g.lineTo(64,10);g.stroke();for(let y=22;y<240;y+=9){const spread=Math.sin((y/245)*Math.PI)*56+6;for(const s of[-1,1]){g.fillStyle=y%18<9?'#3d7830':'#4f8f3a';g.beginPath();g.moveTo(64,y);g.quadraticCurveTo(64+s*spread*.55,y-9,64+s*spread,y+7);g.quadraticCurveTo(64+s*spread*.45,y+4,64,y+5);g.fill();}}});
 REAL_CITY.leafCanopyTex=canvasTex(128,128,g=>{g.clearRect(0,0,128,128);const cols=['#2c5d23','#3c7b30','#4c8f3b','#65aa4a'];for(let i=0;i<150;i++){const a=cityRandom()*6.28,r=Math.sqrt(cityRandom())*52,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;g.save();g.translate(x,y);g.rotate(cityRandom()*6.28);g.fillStyle=cols[i%cols.length];g.beginPath();g.ellipse(0,0,6+cityRandom()*6,3.5+cityRandom()*3.5,0,0,7);g.fill();g.restore();}});

 const segHitsAnyRoad=(px,pz,margin)=>{
  const cx=Math.floor(px/ASSYUT.cell),cz=Math.floor(pz/ASSYUT.cell),seen=new Set();
  for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(const idx of ASSYUT.spatial.get(a+','+b)||[]){
   if(seen.has(idx))continue;seen.add(idx);const s=ASSYUT.segments[idx],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((px-s.a.x)*dx+(pz-s.a.z)*dz)/(s.length*s.length),0,1);
   if(Math.hypot(px-s.a.x-dx*t,pz-s.a.z-dz*t)<s.width/2+margin)return true;
  }return false;
 };
 const nodeDeg=new Int16Array(ASSYUT.nodes.length),nodeMaxW=new Float32Array(ASSYUT.nodes.length);
 for(const seg of ASSYUT.segments){if(INFRA.profiles.has(seg.road))continue;nodeDeg[seg.aNode]++;nodeDeg[seg.bNode]++;nodeMaxW[seg.aNode]=Math.max(nodeMaxW[seg.aNode],seg.width);nodeMaxW[seg.bNode]=Math.max(nodeMaxW[seg.bNode],seg.width);}

 const roadV=[],roadUV=[],walkV=[],walkUV=[],curbV=[],curbUV=[],lines=[],yellowLines=[],medianV=[],medianUV=[],vergeV=[],vergeUV=[];
 const villageRoadV=[],villageRoadUV=[],villageWalkV=[],villageWalkUV=[];
 const quad=(verts,uv,a,b,width,y,shift=0)=>{const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)return;const nx=-dz/len,nz=dx/len;const pts=[[a.x+nx*(shift-width/2),y,a.z+nz*(shift-width/2)],[b.x+nx*(shift-width/2),y,b.z+nz*(shift-width/2)],[b.x+nx*(shift+width/2),y,b.z+nz*(shift+width/2)],[a.x+nx*(shift+width/2),y,a.z+nz*(shift+width/2)]];for(const i of [0,2,1,0,3,2])verts.push(...pts[i]);if(uv)uv.push(0,0,width/4,len/4,0,len/4,0,0,width/4,0,width/4,len/4);};
 const vwall=(verts,uv,a,b,nx,nz,offset,y0,y1)=>{const p0=[a.x+nx*offset,y0,a.z+nz*offset],p1=[b.x+nx*offset,y0,b.z+nz*offset],p2=[b.x+nx*offset,y1,b.z+nz*offset],p3=[a.x+nx*offset,y1,a.z+nz*offset],len=Math.hypot(b.x-a.x,b.z-a.z);for(const i of[0,1,2,0,2,3])verts.push(...[p0,p1,p2,p3][i]);uv.push(0,0,len/1.2,0,len/1.2,1,0,0,len/1.2,1,0,1);};

 for(let ni=0;ni<ASSYUT.nodes.length;ni++){
  if(nodeDeg[ni]<2)continue;const nd=ASSYUT.nodes[ni],r=nodeMaxW[ni]*.52,y=.029,segs=10;
  const isVillNode=ASSYUT.segments.some(s=>(s.aNode===ni||s.bNode===ni)&&isVillageSeg(s));
  const tV=isVillNode?villageRoadV:roadV,tUV=isVillNode?villageRoadUV:roadUV;
  for(let k=0;k<segs;k++){const a0=k/segs*Math.PI*2,a1=(k+1)/segs*Math.PI*2,x0=nd.x+Math.cos(a0)*r,z0=nd.z+Math.sin(a0)*r,x1=nd.x+Math.cos(a1)*r,z1=nd.z+Math.sin(a1)*r;tV.push(nd.x,y,nd.z,x1,y,z1,x0,y,z0);tUV.push(nd.x/4,nd.z/4,x1/4,z1/4,x0/4,z0/4);}
 }
 for(const seg of ASSYUT.segments){
  if(INFRA.profiles.has(seg.road))continue;
  const isVill=isVillageSeg(seg);
  if(isVill)quad(villageRoadV,villageRoadUV,seg.a,seg.b,seg.width,.028);
  else quad(roadV,roadUV,seg.a,seg.b,seg.width,.028);
  const nx=-(seg.b.z-seg.a.z)/seg.length,nz=(seg.b.x-seg.a.x)/seg.length;
  for(let d=0;d<seg.length;d+=4){
   const end=Math.min(seg.length,d+4),a={x:lerp(seg.a.x,seg.b.x,d/seg.length),z:lerp(seg.a.z,seg.b.z,d/seg.length)},b={x:lerp(seg.a.x,seg.b.x,end/seg.length),z:lerp(seg.a.z,seg.b.z,end/seg.length)};
   for(const side of [-1,1]){
    const shift=side*(seg.width/2+1.05);
    let blocked=false;
    for(const t of [.15,.5,.85]){const px=lerp(a.x,b.x,t)+nx*shift,pz=lerp(a.z,b.z,t)+nz*shift;if(segHitsAnyRoad(px,pz,.22)){blocked=true;break;}}
    if(blocked)continue;
    if(isVill)quad(villageWalkV,villageWalkUV,a,b,2.1,.18,shift);
    else quad(walkV,walkUV,a,b,2.1,.18,shift);
    const curbOff=side*(seg.width/2+.02);
    if(side===1)vwall(curbV,curbUV,a,b,nx,nz,curbOff,0,.18);else vwall(curbV,curbUV,b,a,nx,nz,curbOff,0,.18);
    if(!isVill&&seg.width>=10.5&&cityRandom()<.48&&!segHitsAnyRoad((a.x+b.x)/2+nx*side*(seg.width/2+1.5),(a.z+b.z)/2+nz*side*(seg.width/2+1.5),.5))quad(vergeV,vergeUV,a,b,.75,.192,side*(seg.width/2+1.65));
   }
  }
  if(isVill)continue;
  const hasMedian=seg.width>=13.0&&seg.length>18;
  if(hasMedian){
   const mw=1.35,mh=.18;
   quad(medianV,medianUV,seg.a,seg.b,mw,mh);
   vwall(curbV,curbUV,seg.a,seg.b,nx,nz,mw/2,0,mh);
   vwall(curbV,curbUV,seg.b,seg.a,nx,nz,-mw/2,0,mh);
   for(const s of[-1,1])quad(yellowLines,null,seg.a,seg.b,.12,.038,s*(mw/2+.16));
   const laneShift=mw/2+(seg.width-mw)*.25;
   for(let d=3;d<seg.length-3;d+=9){
    const la={x:lerp(seg.a.x,seg.b.x,d/seg.length),z:lerp(seg.a.z,seg.b.z,d/seg.length)};
    const lb={x:lerp(seg.a.x,seg.b.x,Math.min(d+3.2,seg.length)/seg.length),z:lerp(seg.a.z,seg.b.z,Math.min(d+3.2,seg.length)/seg.length)};
    for(const s of[-1,1])quad(lines,null,la,lb,.12,.036,s*laneShift);
   }
  }else if(seg.width>=9.0&&seg.length>8){for(const yo of[-.14,.14])quad(yellowLines,null,seg.a,seg.b,.12,.038,yo);}
  else if(seg.width>=5.5&&seg.length>6){const isOneWay=!!ASSYUT.roads[seg.road]?.oneway;if(!isOneWay){for(let d=1.5;d<seg.length-1.5;d+=6.5){const a={x:lerp(seg.a.x,seg.b.x,d/seg.length),z:lerp(seg.a.z,seg.b.z,d/seg.length)},b={x:lerp(seg.a.x,seg.b.x,Math.min(d+3.0,seg.length)/seg.length),z:lerp(seg.a.z,seg.b.z,Math.min(d+3.0,seg.length)/seg.length)};quad(yellowLines,null,a,b,.13,.038);}}}
  if(seg.width>=11&&seg.length>12)for(const sside of[-1,1])quad(lines,null,seg.a,seg.b,.11,.035,sside*(seg.width/2-.32));
  if(seg.width>=8&&seg.length>12){for(const endPos of[seg.aNode,seg.bNode])if(nodeDeg[endPos]>=3){const base=endPos===seg.aNode?4.2:seg.length-4.2,ca={x:lerp(seg.a.x,seg.b.x,base/seg.length),z:lerp(seg.a.z,seg.b.z,base/seg.length)},cb={x:lerp(seg.a.x,seg.b.x,(base+1.9)/seg.length),z:lerp(seg.a.z,seg.b.z,(base+1.9)/seg.length)};for(let off=-seg.width*.38;off<=seg.width*.38;off+=1.15)quad(lines,null,ca,cb,.42,.038,off);}}
 }
 const batch=(v,uv,mat)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));if(uv?.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;REAL_CITY.group.add(m);return m;};
 const asphColor = loadEgyptianTexture('assets/textures/egypt/egypt-asphalt-color.jpg', 0.38, 0.38, true);
 const asphNorm = loadEgyptianTexture('assets/textures/asphalt/Asphalt015_1K-JPG_NormalGL.jpg', 1.15, 1.15, false);
 const asphRough = loadEgyptianTexture('assets/textures/asphalt/Asphalt015_1K-JPG_Roughness.jpg', 1.15, 1.15, false);
 const rm = (asphColor && asphNorm) ? new THREE.MeshStandardMaterial({
  map: asphColor,
  normalMap: asphNorm,
  roughnessMap: asphRough,
  color: 0xd6cdc0,
  roughness: (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.road?.asphaltRoughness) ? VISUAL_CONFIG.road.asphaltRoughness : 0.94,
  metalness: 0.02,
  normalScale: new THREE.Vector2(1.45, 1.45),
  envMapIntensity: 0.14
 }) : surfaceMaterial('asphalt',4,4,0x5c5952,4);
 if(typeof roadSurfaces!=='undefined'&&Array.isArray(roadSurfaces))roadSurfaces.push(rm);
 REAL_CITY.roadMat=rm;
 batch(roadV,roadUV,rm);
 if(villageRoadV.length)batch(villageRoadV,villageRoadUV,rm);
 const pavingColor = loadEgyptianTexture('assets/textures/paving/PavingStones128_1K-JPG_Color.jpg', 2, 2, true);
 const pavingNorm = loadEgyptianTexture('assets/textures/paving/PavingStones128_1K-JPG_NormalGL.jpg', 2, 2, false);
 const pavingRough = loadEgyptianTexture('assets/textures/paving/PavingStones128_1K-JPG_Roughness.jpg', 2, 2, false);
 const walkMat = (pavingColor && pavingNorm) ? new THREE.MeshStandardMaterial({
  map: pavingColor,
  normalMap: pavingNorm,
  roughnessMap: pavingRough,
  color: (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.road?.sidewalkColor) ? VISUAL_CONFIG.road.sidewalkColor : 0xc4baa8,
  roughness: (typeof VISUAL_CONFIG !== 'undefined' && VISUAL_CONFIG.road?.sidewalkRoughness) ? VISUAL_CONFIG.road.sidewalkRoughness : 0.94,
  metalness: 0.02,
  normalScale: new THREE.Vector2(1.0, 1.0),
  envMapIntensity: 0.12,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1
 }) : new THREE.MeshStandardMaterial({map:paverTex,color:0xd8d2c4,roughness:.92,envMapIntensity:.12,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 batch(walkV,walkUV,walkMat);
 if(villageWalkV.length)batch(villageWalkV,villageWalkUV,villageWalkMat);
 if(medianV.length)batch(medianV,medianUV,new THREE.MeshStandardMaterial({map:terracottaTex,color:0xb4523e,roughness:.88,envMapIntensity:.16}));

 const wornMarkingTex = rep(canvasTex(64, 128, g => {
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(235, 230, 218, 0.90)';
  g.fillRect(8, 0, 48, 128);
  for (let i = 0; i < 35; i++) {
   g.clearRect(cityRandom() * 54 + 5, cityRandom() * 122, 2 + cityRandom() * 6, 2 + cityRandom() * 8);
  }
  for (let i = 0; i < 65; i++) {
   g.fillStyle = 'rgba(65, 60, 50, 0.38)';
   g.fillRect(cityRandom() * 46 + 9, cityRandom() * 124, 2 + cityRandom() * 4, 2 + cityRandom() * 4);
  }
 }), 1, 4);
 const lineMat = new THREE.MeshStandardMaterial({
  map: wornMarkingTex,
  color: 0xd0c6b4,
  roughness: 0.92,
  transparent: true,
  opacity: 0.38,
  envMapIntensity: 0.08,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
 });
 batch(lines, null, lineMat);

 const wornYellowTex = rep(canvasTex(64, 128, g => {
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(228, 168, 52, 0.88)';
  g.fillRect(8, 0, 48, 128);
  for (let i = 0; i < 35; i++) {
   g.clearRect(cityRandom() * 54 + 5, cityRandom() * 122, 2 + cityRandom() * 6, 2 + cityRandom() * 8);
  }
  for (let i = 0; i < 65; i++) {
   g.fillStyle = 'rgba(65, 55, 42, 0.35)';
   g.fillRect(cityRandom() * 46 + 9, cityRandom() * 124, 2 + cityRandom() * 4, 2 + cityRandom() * 4);
  }
 }), 1, 4);
 const yellowLineMat = new THREE.MeshStandardMaterial({
  map: wornYellowTex,
  color: 0xd49c3a,
  roughness: 0.88,
  metalness: 0.02,
  transparent: true,
  opacity: 0.42,
  envMapIntensity: 0.10,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
 });
 if(yellowLines.length)batch(yellowLines,null,yellowLineMat);
 if(curbV.length)batch(curbV,curbUV,new THREE.MeshStandardMaterial({map:curbTex,roughness:.88,envMapIntensity:.1,side:THREE.DoubleSide}));
 if(vergeV.length)batch(vergeV,vergeUV,REAL_CITY.grassMat);
 REAL_CITY.roadMeshes=3;
}

// طبقة تحسين مرئية للشوارع: معابر مشاة عند التقاطعات الكبيرة، بدون تسجيلها
// كأجسام صلبة حتى تظل مسارات المرور والملاحة خالية من العوائق الوهمية.
function addAssyutCrosswalkPass(){
 const mat=new THREE.MeshStandardMaterial({color:0xf1eee1,roughness:.82,metalness:0,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
 const used=[];REAL_CITY.crosswalks=REAL_CITY.crosswalks||[];
 for(let ni=0;ni<ASSYUT.nodes.length&&used.length<34;ni++){
  const node=ASSYUT.nodes[ni],links=ASSYUT.segments.filter(s=>s.aNode===ni||s.bNode===ni);
  if(!node||links.length<3)continue;
  const seg=links.find(s=>!INFRA.profiles.has(s.road)&&s.width>=8.5&&s.length>16);if(!seg)continue;
  const fromA=seg.aNode===ni,dx=fromA?(seg.b.x-seg.a.x):(seg.a.x-seg.b.x),dz=fromA?(seg.b.z-seg.a.z):(seg.a.z-seg.b.z),len=Math.hypot(dx,dz);if(len<1)continue;
  const fx=dx/len,fz=dz/len,center={x:node.x+fx*4.8,z:node.z+fz*4.8};
  if(used.some(p=>Math.hypot(p.x-center.x,p.z-center.z)<26))continue;
  used.push(center);
  const heading=Math.atan2(dx,dz),stripeW=Math.min(seg.width*.72,7.6),stripeCount=5;
  for(let k=0;k<stripeCount;k++){
   const along=(k-(stripeCount-1)/2)*.62,px=center.x+fx*along,pz=center.z+fz*along;
   const stripe=new THREE.Mesh(new THREE.BoxGeometry(stripeW,.018,.34),mat);
   stripe.position.set(px,.058,pz);stripe.rotation.y=heading;stripe.receiveShadow=true;REAL_CITY.group.add(stripe);
  }
  REAL_CITY.crosswalks.push({x:center.x,z:center.z,heading,width:stripeW});
 }
}
addAssyutCrosswalkPass();

// نموذج خارجي مرخّص CC0 يضيف نقطة بصرية واضحة من الطابع المصري، خارج حرم الطريق.
function addExternalAssyutLandmark(){
 const src=importedModels?.loaded?.landmarkMosque?.scene;
 if(!src||REAL_CITY.externalLandmarks.length)return;
 const candidates=(ASSYUT.places||[]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z));
 const place=candidates.find(p=>/مسجد|جامع|mosque/i.test(String(p.name||'')))||candidates[Math.floor(candidates.length*.18)];
 if(!place)return;
 const road=nearestAssyutRoad(place);if(!road)return;
 let x=road.point.x+road.nx*(road.width/2+24),z=road.point.z+road.nz*(road.width/2+24);
 if(nearestAssyutRoad({x,z}).distance<road.width/2+8){x=road.point.x-road.nx*(road.width/2+24);z=road.point.z-road.nz*(road.width/2+24);}
 const g=src.clone(true);g.name='AssyutLicensedMosque';g.scale.setScalar(.42);g.rotation.y=road.heading+Math.PI/2;g.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3());
 g.position.set(x,-box.min.y,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});REAL_CITY.group.add(g);
 const w=Math.max(14,size.x),d=Math.max(16,size.z),h=Math.max(20,size.y);
 const obstacle={x0:x-w/2-1,x1:x+w/2+1,z0:z-d/2-1,z1:z+d/2+1,h};MAP.buildings.push(obstacle);buildingData.push({x,z,w:w+2,d:d+2,h});
 REAL_CITY.externalLandmarks.push({mesh:g,x,z,w:w+2,d:d+2,h,source:'Innerscene CC0'});
 REAL_CITY.styles.external_mosque=(REAL_CITY.styles.external_mosque||0)+1;
}
function loadEgyptianTexture(path, rx = 1, ry = 1, isColor = null) {
 if (typeof THREE === 'undefined' || !THREE.TextureLoader) return null;
 if (typeof navigator !== 'undefined' && navigator.userAgent === 'test') return new THREE.Texture();
 try {
  const tex = new THREE.TextureLoader().load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  const treatAsColor = isColor !== null ? isColor : !/Normal|Roughness|Arm/i.test(path);
  if (treatAsColor && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if (!treatAsColor && THREE.NoColorSpace) tex.colorSpace = THREE.NoColorSpace;
  if (typeof renderer !== 'undefined' && renderer?.capabilities?.getMaxAnisotropy) {
   tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  return tex;
 } catch (e) {
  return new THREE.Texture();
 }
}

const egyptDummy = (typeof THREE !== 'undefined' && THREE.Object3D) ? new THREE.Object3D() : null;
function pushEgyptMatrix(list, x, y, z, rotX = 0, rotY = 0, rotZ = 0, sx = 1, sy = 1, sz = 1) {
 if (!egyptDummy) return;
 egyptDummy.position.set(x, y, z);
 egyptDummy.rotation.set(rotX, rotY, rotZ);
 egyptDummy.scale.set(sx, sy, sz);
 egyptDummy.updateMatrix();
 list.push(egyptDummy.matrix.clone());
}

function addEgyptInstances(parent, geo, mat, matrices, castShadow = true, receiveShadow = true) {
 if (!matrices || !matrices.length || typeof THREE === 'undefined') return null;
 const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
 for (let i = 0; i < matrices.length; i++) {
  mesh.setMatrixAt(i, matrices[i]);
 }
 mesh.instanceMatrix.needsUpdate = true;
 mesh.castShadow = castShadow !== false;
 mesh.receiveShadow = receiveShadow !== false;
 parent.add(mesh);
 return mesh;
}

function makeTiledBoxGeo(w, h, d, rx, ry, rz) {
 const geo = new THREE.BoxGeometry(w, h, d);
 const uv = geo.attributes.uv;
 for (let i = 0; i < uv.count; i++) {
  const face = Math.floor(i / 4);
  const su = (face === 0 || face === 1) ? rz : rx;
  const sv = (face === 2 || face === 3) ? rz : ry;
  uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
 }
 uv.needsUpdate = true;
 return geo;
}

const EGYPT_ASSETS = {
 concrete: null,
 brick: null,
 plasterBeige: null,
 plasterYellow: null,
 plasterWhite: null,
 plasterGreen: null,
 plasterCream: null,
 ironRailTex: null,
 woodShutterGreenTex: null,
 woodShutterBrownTex: null,
 acTex: null,
 waterTankTex: null,
 shutterTex: null,
 awningTex: null,
 shopSigns: null
};

function getEgyptAwningTex() {
 if (!EGYPT_ASSETS.awningTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.awningTex = canvasTex(512, 512, (g, w, h) => {
   // تندة قماش مصرية بهتانة من الشمس ومغبرة (مخططة أحمر طوبي وكريمي وبيج)
   const stripeW = 32;
   const colors = ['#8c3428', '#dfd4c0', '#6d4c3b', '#e3d9c6'];
   for (let x = 0; x < w; x += stripeW) {
    g.fillStyle = colors[(x / stripeW) % colors.length];
    g.fillRect(x, 0, stripeW, h);
    // ظل خفيف بين خطوط القماش
    g.fillStyle = 'rgba(28,20,14,0.16)';
    g.fillRect(x, 0, 2, h);
   }
   // نسيج قماش الكانفاس + بهتان شمس وتراب
   for (let i = 0; i < 2400; i++) {
    g.fillStyle = i % 3 === 0 ? 'rgba(218,202,175,0.12)' : 'rgba(55,40,30,0.08)';
    g.fillRect((i * 73) % w, (i * 137) % h, 2, 5);
   }
   const sunFade = g.createLinearGradient(0, 0, 0, h);
   sunFade.addColorStop(0, 'rgba(210,194,166,0.28)');
   sunFade.addColorStop(0.7, 'rgba(180,160,130,0.10)');
   sunFade.addColorStop(1, 'rgba(42,32,24,0.28)');
   g.fillStyle = sunFade;
   g.fillRect(0, 0, w, h);
   // كورنيش مقوس أسفل التندة
   g.fillStyle = '#742c22';
   g.fillRect(0, h - 42, w, 42);
   for (let x = 0; x < w; x += stripeW) {
    g.beginPath();
    g.arc(x + stripeW / 2, h - 42, stripeW / 2, 0, Math.PI);
    g.fillStyle = '#ddd2be';
    g.fill();
   }
  });
  if (EGYPT_ASSETS.awningTex) EGYPT_ASSETS.awningTex.wrapS = EGYPT_ASSETS.awningTex.wrapT = THREE.RepeatWrapping;
 }
 return EGYPT_ASSETS.awningTex;
}

function getEgyptConcreteMat() {
 if (!EGYPT_ASSETS.concrete) {
  const tex = loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_Color.jpg', 4, 4, true);
  const norm = loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_NormalGL.jpg', 4, 4, false);
  const rough = loadEgyptianTexture('assets/textures/concrete/Concrete046_1K-JPG_Roughness.jpg', 4, 4, false);
  EGYPT_ASSETS.concrete = new THREE.MeshStandardMaterial({
   map: tex, normalMap: norm, roughnessMap: rough,
   color: 0xb6aea0, roughness: 0.92, envMapIntensity: 0.14
  });
 }
 return EGYPT_ASSETS.concrete;
}

function getEgyptBrickMat() {
 if (!EGYPT_ASSETS.brick) {
  const tex = loadEgyptianTexture('assets/textures/egypt/egypt-brick-color.jpg', 1.65, 1.65, true);
  const norm = loadEgyptianTexture('assets/textures/bricks/Bricks059_1K-JPG_NormalGL.jpg', 2.4, 2.4, false);
  const rough = loadEgyptianTexture('assets/textures/bricks/Bricks059_1K-JPG_Roughness.jpg', 2.4, 2.4, false);
  EGYPT_ASSETS.brick = new THREE.MeshStandardMaterial({
   map: tex, normalMap: norm, roughnessMap: rough,
   color: 0xe8d9cb, roughness: 0.90, normalScale: new THREE.Vector2(1.35, 1.35), envMapIntensity: 0.14
  });
 }
 return EGYPT_ASSETS.brick;
}

function getEgyptPlasterMat(colorKey, hexColor) {
 if (!EGYPT_ASSETS[colorKey]) {
  const tex = loadEgyptianTexture('assets/textures/plaster/Plaster001_1K-JPG_Color.jpg', 4, 4, true);
  const norm = loadEgyptianTexture('assets/textures/plaster/Plaster001_1K-JPG_NormalGL.jpg', 4, 4, false);
  const rough = loadEgyptianTexture('assets/textures/plaster/Plaster001_1K-JPG_Roughness.jpg', 4, 4, false);
  EGYPT_ASSETS[colorKey] = new THREE.MeshStandardMaterial({
   map: tex, normalMap: norm, roughnessMap: rough,
   color: hexColor, roughness: 0.92, envMapIntensity: 0.14
  });
 }
 return EGYPT_ASSETS[colorKey];
}

function getEgyptShutterTex() {
 if (!EGYPT_ASSETS.shutterTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.shutterTex = canvasTex(256, 512, (g, w, h) => {
   g.fillStyle = '#7c7870';
   g.fillRect(0, 0, w, h);
   for (let y = 0; y < h; y += 16) {
    const slatGrad = g.createLinearGradient(0, y, 0, y + 16);
    slatGrad.addColorStop(0, '#969086');
    slatGrad.addColorStop(0.35, '#807b72');
    slatGrad.addColorStop(0.82, '#5a5650');
    slatGrad.addColorStop(1, '#34322e');
    g.fillStyle = slatGrad;
    g.fillRect(0, y, w, 16);
   }
   // بقع صدأ وغبار شارع على الصاج
   for (let i = 0; i < 65; i++) {
    const rx = (i * 53) % w, ry = (i * 97) % h;
    g.fillStyle = i % 3 === 0 ? 'rgba(118,64,34,0.22)' : 'rgba(175,158,132,0.18)';
    g.fillRect(rx, ry, 8 + (i % 18), 4 + (i % 14));
   }
   const bottomDust = g.createLinearGradient(0, h * 0.65, 0, h);
   bottomDust.addColorStop(0, 'rgba(168,150,122,0)');
   bottomDust.addColorStop(1, 'rgba(168,150,122,0.52)');
   g.fillStyle = bottomDust;
   g.fillRect(0, h * 0.65, w, h * 0.35);
   g.strokeStyle = 'rgba(40,36,32,0.45)';
   g.lineWidth = 4;
   g.strokeRect(4, 2, w - 8, h - 4);
  });
  EGYPT_ASSETS.shutterTex.wrapS = EGYPT_ASSETS.shutterTex.wrapT = THREE.RepeatWrapping;
  EGYPT_ASSETS.shutterTex.repeat.set(1, 1);
 }
 return EGYPT_ASSETS.shutterTex;
}

function getEgyptWoodShutterTex(theme = 'green') {
 const isGreen = (theme === 'green');
 const key = isGreen ? 'woodShutterGreenTex' : 'woodShutterBrownTex';
 if (!EGYPT_ASSETS[key] && typeof canvasTex === 'function') {
  EGYPT_ASSETS[key] = canvasTex(128, 256, (g, w, h) => {
   g.fillStyle = isGreen ? '#2e4a36' : '#573d27';
   g.fillRect(0, 0, w, h);
   g.strokeStyle = isGreen ? '#1e3324' : '#382517';
   g.lineWidth = 8;
   g.strokeRect(4, 4, w - 8, h - 8);
   g.fillRect(0, h / 2 - 4, w, 8);
   for (let y = 14; y < h - 14; y += 8) {
    if (Math.abs(y - h / 2) < 8) continue;
    g.fillStyle = isGreen ? '#3c6147' : '#6f4e32';
    g.fillRect(8, y, w - 16, 4);
    g.fillStyle = isGreen ? '#1b2c20' : '#2b1b11';
    g.fillRect(8, y + 4, w - 16, 4);
   }
  });
 }
 return EGYPT_ASSETS[key];
}

function getEgyptAcTex() {
 if (!EGYPT_ASSETS.acTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.acTex = canvasTex(256, 128, (g, w, h) => {
   g.fillStyle = '#e2dfd7';
   g.fillRect(0, 0, w, h);
   g.strokeStyle = '#9e9b93';
   g.lineWidth = 4;
   g.strokeRect(2, 2, w - 4, h - 4);
   const cx = w * 0.32, cy = h * 0.5, cr = h * 0.38;
   g.fillStyle = '#2f3133';
   g.beginPath();
   g.arc(cx, cy, cr, 0, Math.PI * 2);
   g.fill();
   g.strokeStyle = '#5a5e61';
   g.lineWidth = 3;
   for (let r = 8; r < cr; r += 10) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
   }
   for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
    g.stroke();
   }
   for (let y = 20; y < h - 20; y += 10) {
    g.fillStyle = '#424547';
    g.fillRect(w * 0.62, y, w * 0.30, 4);
   }
   g.fillStyle = '#b32219';
   g.fillRect(w * 0.64, 12, 18, 5);
  });
 }
 return EGYPT_ASSETS.acTex;
}

function getEgyptIronRailTex() {
 if (!EGYPT_ASSETS.ironRailTex && typeof canvasTex === 'function') {
  EGYPT_ASSETS.ironRailTex = canvasTex(128, 128, (g, w, h) => {
   g.clearRect(0, 0, w, h);
   g.fillStyle = '#1c1f21';
   g.fillRect(0, 0, w, 8);
   g.fillRect(0, 24, w, 5);
   g.fillRect(0, h - 8, w, 8);
   for (let x = 12; x < w; x += 24) {
    g.fillRect(x - 2.5, 0, 5, h);
    g.beginPath();
    g.arc(x, h / 2, 7, 0, Math.PI * 2);
    g.stroke();
   }
   g.beginPath();
   g.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
   g.fill();
  });
  EGYPT_ASSETS.ironRailTex.wrapS = EGYPT_ASSETS.ironRailTex.wrapT = THREE.RepeatWrapping;
  EGYPT_ASSETS.ironRailTex.repeat.set(4, 1);
 }
 return EGYPT_ASSETS.ironRailTex;
}

function getEgyptShopSigns() {
 if (!EGYPT_ASSETS.shopSigns && typeof canvasTex === 'function') {
  const specs = [
   { name: 'كازيون ماركت', sub: 'KAZYON · عروض يومية · أقرب سوبر ماركت', bg: '#c8102e', fg: '#ffd200', border: '#ffffff' },
   { name: 'مطعم فول وطعمية الصعيدي', sub: 'فول بالزيت الحار · طعمية سخنة · بطاطس', bg: '#b83214', fg: '#fff6dc', border: '#f5b841' },
   { name: 'ورشة ميكانيكا وكهرباء سيارات', sub: 'صيانة جميع السيارات · عفشة · تغيير زيت', bg: '#123e72', fg: '#ffd54a', border: '#8ec5fc' },
   { name: 'كشري ومشويات أسيوط', sub: 'كشري · طواجن · حواوشي · مشويات على الفحم', bg: '#7b1d22', fg: '#fff5dc', border: '#f8b449' },
   { name: 'صيدلية الشفاء', sub: 'د. أحمد علي · خدمة 24 ساعة · أسيوط', bg: '#086e49', fg: '#ffffff', border: '#78d6a8' },
   { name: 'مطعم أولاد البلد للفول والطعمية', sub: 'فطار وعشاء مصري أصيل · خدمة 24 ساعة', bg: '#8a3a12', fg: '#fff3d6', border: '#eab308' }
  ];
  EGYPT_ASSETS.shopSigns = specs.map(item => canvasTex(1024, 256, (g, w, h) => {
   g.fillStyle = item.bg;
   g.fillRect(0, 0, w, h);
   g.strokeStyle = item.border;
   g.lineWidth = 10;
   g.strokeRect(10, 10, w - 20, h - 20);
   g.strokeStyle = 'rgba(255,255,255,0.35)';
   g.lineWidth = 3;
   g.strokeRect(18, 18, w - 36, h - 36);

   g.direction = 'rtl';
   g.textAlign = 'center';
   g.textBaseline = 'middle';
   g.fillStyle = item.fg;
   g.font = 'bold 94px Tahoma, "Segoe UI", Arial, sans-serif';
   g.fillText(item.name, w / 2, 95);

   g.fillStyle = 'rgba(255,255,255,0.92)';
   g.font = 'bold 34px Tahoma, "Segoe UI", Arial, sans-serif';
   g.fillText(item.sub, w / 2, 185);
  }));
 }
 return EGYPT_ASSETS.shopSigns || [];
}

const EGYPT_BATCHER = {
 walls: {
  brick: [],
  plasterBeige: [],
  plasterYellow: [],
  plasterWhite: [],
  plasterGreen: [],
  plasterCream: []
 },
 slabs: [],
 parapets: [],
 colMatrices: [],
 balcSlabMatrices: [],
 balcFrontRailMatrices: [],
 balcSideRailMatrices: [],
 balcDoorMatrices: [],
 winFrameMatrices: [],
 winGlassMatrices: [],
 winSillMatrices: [],
 woodShutterGreenMatrices: [],
 woodShutterBrownMatrices: [],
 acMatrices: [],
 shopShutterMatrices: [],
 awningMatrices: [],
 shopSignMatrices: [[], [], [], [], [], []],
 upColMatrices: [],
 rebarMatrices: [],
 partialWallMatrices: [],
 waterTankMatrices: [],
 tankBaseMatrices: [],
 laundryMatrices: [[], [], [], []],
 dishMatrices: [],
 stallCrateMatrices: []
};

function buildEgyptianResidential(x, z, w, d, options = {}, near = null) {
 const floors = options.floors || (4 + Math.floor(cityRandom() * 4));
 const isRedBrick = options.isRedBrick !== undefined ? options.isRedBrick : (cityRandom() < 0.88);
 const hasUnfinishedRoof = options.hasUnfinishedRoof !== undefined ? options.hasUnfinishedRoof : (isRedBrick ? (cityRandom() < 0.74) : (cityRandom() < 0.25));
 
 const plasterThemes = [
  { key: 'plasterBeige', hex: 0xdec9a4 },
  { key: 'plasterYellow', hex: 0xe5dba7 },
  { key: 'plasterWhite', hex: 0xd6d2c4 },
  { key: 'plasterGreen', hex: 0xbac8b8 },
  { key: 'plasterCream', hex: 0xdbbe9b }
 ];
 const chosenTheme = options.plasterTheme || cityPick(plasterThemes);
 const wallKey = isRedBrick ? 'brick' : chosenTheme.key;
 const shutterTheme = isRedBrick ? 'green' : (options.shutterTheme || cityPick(['green', 'brown']));

 const floorH = 3.0;
 const groundH = 3.2;
 const enclosedFloors = hasUnfinishedRoof ? (floors - 1) : floors;
 const bodyH = groundH + (enclosedFloors - 1) * floorH;
 const totalBuildingH = hasUnfinishedRoof ? (bodyH + 2.8 + 1.1) : (bodyH + 1.2);

 // 1. جدران المبنى (تجميع للـ mergeGeometries)
 const rx = Math.max(1, Math.round(w / 4));
 const ry = Math.max(1, Math.round(bodyH / 4));
 const rz = Math.max(1, Math.round(d / 4));
 const coreGeo = makeTiledBoxGeo(w, bodyH, d, rx, ry, rz);
 coreGeo.translate(x, bodyH / 2, z);
 EGYPT_BATCHER.walls[wallKey].push(coreGeo);

 const numColsX = Math.max(2, Math.round(w / 3.8));
 const stepX = w / numColsX;
 const numColsZ = Math.max(2, Math.round(d / 3.8));
 const stepZ = d / numColsZ;

 // 2. بلاطات الأسقف الخرسانية البارزة بين الأدوار (تجميع للـ mergeGeometries)
 for (let fl = 0; fl < enclosedFloors; fl++) {
  const slabY = (fl === 0) ? groundH : (groundH + fl * floorH);
  const slabGeo = new THREE.BoxGeometry(w + 0.28, 0.26, d + 0.28);
  slabGeo.translate(x, slabY, z);
  EGYPT_BATCHER.slabs.push(slabGeo);
 }

 // 3. الأعمدة الخرسانية البارزة (InstancedMesh)
 const colCoords = [];
 for (let i = 0; i <= numColsX; i++) {
  const cx = -w / 2 + i * stepX;
  colCoords.push({ x: cx, z: -d / 2 - 0.04 });
  colCoords.push({ x: cx, z: d / 2 + 0.04 });
 }
 for (let j = 1; j < numColsZ; j++) {
  const cz = -d / 2 + j * stepZ;
  colCoords.push({ x: -w / 2 - 0.04, z: cz });
  colCoords.push({ x: w / 2 + 0.04, z: cz });
 }
 for (const cp of colCoords) {
  pushEgyptMatrix(EGYPT_BATCHER.colMatrices, x + cp.x, bodyH / 2, z + cp.z, 0, 0, 0, 0.44, bodyH, 0.44);
 }

 // 4. الأدوار السكنية والمحلات: واجهات متعددة الاتجاهات تطل على الشوارع مباشرة
 function renderBuildingFacade(face, hasShops) {
  let faceW, numCols, step;
  let cx, cz, rotY;
  if (face === '-z') {
   faceW = w; numCols = numColsX; step = stepX;
   cx = x; cz = z - d / 2; rotY = 0;
  } else if (face === '+z') {
   faceW = w; numCols = numColsX; step = stepX;
   cx = x; cz = z + d / 2; rotY = Math.PI;
  } else if (face === '-x') {
   faceW = d; numCols = numColsZ; step = stepZ;
   cx = x - w / 2; cz = z; rotY = Math.PI / 2;
  } else { // '+x'
   faceW = d; numCols = numColsZ; step = stepZ;
   cx = x + w / 2; cz = z; rotY = -Math.PI / 2;
  }

  const placeOnFacade = (list, u, yPos, out, rx, extraRy, rz, sx, sy, sz) => {
   let px, pz;
   if (face === '-z') {
    px = cx + u; pz = cz - out;
   } else if (face === '+z') {
    px = cx - u; pz = cz + out;
   } else if (face === '-x') {
    px = cx - out; pz = cz + u;
   } else { // '+x'
    px = cx + out; pz = cz - u;
   }
   pushEgyptMatrix(list, px, yPos, pz, rx, rotY + extraRy, rz, sx, sy, sz);
  };

  // أ. الأدوار السكنية: بلكونات حديد وشبابيك بشيش خشبي ووحدات تكييف
  for (let fl = 1; fl < enclosedFloors; fl++) {
   const wy = groundH + (fl - 0.5) * floorH;
   for (let b = 0; b < numCols; b++) {
    const bayU = -faceW / 2 + (b + 0.5) * step;
    const bayW = step;

    if (b % 2 === 0) {
     // بلكونة مصرية
     placeOnFacade(EGYPT_BATCHER.balcSlabMatrices, bayU, wy - floorH / 2 + 0.09, 0.58, 0, 0, 0, bayW - 0.35, 0.18, 1.15);
     placeOnFacade(EGYPT_BATCHER.balcFrontRailMatrices, bayU, wy - floorH / 2 + 0.52, 1.12, 0, 0, 0, bayW - 0.35, 0.86, 0.04);
     for (const sideU of [-1, 1]) {
      placeOnFacade(EGYPT_BATCHER.balcSideRailMatrices, bayU + sideU * ((bayW - 0.35) / 2 - 0.02), wy - floorH / 2 + 0.52, 0.58, 0, 0, 0, 0.04, 0.86, 1.10);
     }
     placeOnFacade(EGYPT_BATCHER.balcDoorMatrices, bayU, wy - 0.15, 0.01, 0, 0, 0, 1.10, 2.15, 1);

     // غسيل ملون منشور على حبال البلكونة (طابع مصري أصيل)
     if (cityRandom() < 0.78) {
      const laundryColor = Math.floor(cityRandom() * 4);
      const clothCount = 2 + Math.floor(cityRandom() * 2);
      for (let ci = 0; ci < clothCount; ci++) {
       const uOffset = (ci - (clothCount - 1) / 2) * (bayW * 0.26);
       const clothCol = (laundryColor + ci) % 4;
       placeOnFacade(EGYPT_BATCHER.laundryMatrices[clothCol], bayU + uOffset, wy - floorH / 2 + 0.44, 1.15, 0.08, 0, 0, bayW * 0.22, 0.58, 1);
      }
     }

     // أطباق دش مثبتة على حديد البلكونة
     if (cityRandom() < 0.58) {
      const dishSide = cityRandom() < 0.5 ? -1 : 1;
      const dishU = bayU + dishSide * ((bayW - 0.35) / 2 - 0.15);
      placeOnFacade(EGYPT_BATCHER.dishMatrices, dishU, wy - floorH / 2 + 0.65, 1.25, -Math.PI / 3.2, dishSide * 0.28, 0, 0.72, 0.72, 0.72);
     }
    } else {
     // شباك مصري
     placeOnFacade(EGYPT_BATCHER.winSillMatrices, bayU, wy - 0.82, 0.08, 0, 0, 0, 1.55, 0.14, 0.32);
     placeOnFacade(EGYPT_BATCHER.winFrameMatrices, bayU, wy, 0.01, 0, 0, 0, 1.35, 1.55, 0.08);
     placeOnFacade(EGYPT_BATCHER.winGlassMatrices, bayU, wy, 0.02, 0, 0, 0, 1.12, 1.36, 1);

     // شيش خشبي أخضر أو بني
     const shutterList = (shutterTheme === 'green') ? EGYPT_BATCHER.woodShutterGreenMatrices : EGYPT_BATCHER.woodShutterBrownMatrices;
     placeOnFacade(shutterList, bayU - 0.80, wy, 0.04, 0, 0.22, 0, 0.38, 1.48, 0.04);
     placeOnFacade(shutterList, bayU + 0.80, wy, 0.04, 0, -0.22, 0, 0.38, 1.48, 0.04);

     // وحدة تكييف خارجية
     if (cityRandom() < 0.55) {
      placeOnFacade(EGYPT_BATCHER.acMatrices, bayU + 0.35, wy - 1.15, 0.26, 0, 0, 0, 0.74, 0.48, 0.40);
     }
    }
   }
  }

  // ب. الدور الأرضي: محلات بستائر صاج ولافتات عربي وتندات قماش مقلمة
  if (hasShops) {
   const signOffset = (options.testId === 2) ? 2 : (options.testId === 3) ? 4 : Math.floor(cityRandom() * 6);
   for (let b = 0; b < numCols; b++) {
    const bayU = -faceW / 2 + (b + 0.5) * step;
    const signW = step - 0.38;
    const signH = 0.68;

    // شتر معدني
    placeOnFacade(EGYPT_BATCHER.shopShutterMatrices, bayU, 1.35, 0.02, 0, 0, 0, step - 0.45, 2.50, 0.06);

    // لافتة عربي
    const signIdx = (signOffset + b) % 6;
    placeOnFacade(EGYPT_BATCHER.shopSignMatrices[signIdx], bayU, 2.92, 0.08, 0, 0, 0, signW, signH, 0.08);

    // تندة قماش مقلمة بارزة للمحل
    if (EGYPT_BATCHER.awningMatrices && cityRandom() < 0.88) {
     placeOnFacade(EGYPT_BATCHER.awningMatrices, bayU, 2.70, 0.65, 0.28, 0, 0, step - 0.28, 0.05, 1.35);
    }

    // فرشة بقالة واستاندات كراتين وشيبسي على الرصيف أمام المحل
    if (b === 0 && cityRandom() < 0.82) {
     placeOnFacade(EGYPT_BATCHER.stallCrateMatrices, bayU + 0.42, 0.48, 1.45, 0, 0.15, 0, 0.65, 0.95, 0.45);
     placeOnFacade(EGYPT_BATCHER.stallCrateMatrices, bayU - 0.42, 0.35, 1.35, 0, -0.12, 0, 0.75, 0.70, 0.55);
    }
   }
  }
 }

 let primaryFace = '-z';
 let secondaryFace = '+z';
 if (near && near.point) {
  const toStX = near.point.x - x;
  const toStZ = near.point.z - z;
  if (Math.abs(toStZ) >= Math.abs(toStX)) {
   primaryFace = toStZ < 0 ? '-z' : '+z';
   secondaryFace = toStX < 0 ? '-x' : '+x';
  } else {
   primaryFace = toStX < 0 ? '-x' : '+x';
   secondaryFace = toStZ < 0 ? '-z' : '+z';
  }
 }
 renderBuildingFacade(primaryFace, true);
 renderBuildingFacade(secondaryFace, false);

 // 6. السطح: إما دور أخير غير مكتمل بأعمدة وأشاير حديد، أو سطح مكتمل بسور وخزانات مياه
 if (hasUnfinishedRoof) {
  const colExtH = 2.85;
  const rebarH = 1.35;
  for (const cp of colCoords) {
   pushEgyptMatrix(EGYPT_BATCHER.upColMatrices, x + cp.x, bodyH + colExtH / 2, z + cp.z, 0, 0, 0, 0.44, colExtH, 0.44);
   for (const [rx, rz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
    pushEgyptMatrix(EGYPT_BATCHER.rebarMatrices, x + cp.x + rx, bodyH + colExtH + rebarH / 2, z + cp.z + rz, 0, 0, cityRand(-0.06, 0.06), 1, 1, 1);
   }
  }
  for (let b = 0; b < numColsX; b++) {
   if (cityRandom() < 0.65) {
    const bayX = -w / 2 + (b + 0.5) * stepX;
    pushEgyptMatrix(EGYPT_BATCHER.partialWallMatrices, x + bayX, bodyH + 0.58, z - d / 2, 0, 0, 0, stepX - 0.42, 1.15, 0.28);
   }
  }
  if (cityRandom() < 0.75) {
   pushEgyptMatrix(EGYPT_BATCHER.dishMatrices, x + cityRand(-w*0.3, w*0.3), bodyH + 0.55, z + cityRand(-d*0.3, d*0.3), -Math.PI / 3, cityRand(0, 6.28), 0, 0.82, 0.82, 0.82);
  }
 } else {
  // سور السطح الخرساني
  const paraGeo = new THREE.BoxGeometry(w + 0.24, 0.95, d + 0.24);
  paraGeo.translate(x, bodyH + 0.48, z);
  EGYPT_BATCHER.parapets.push(paraGeo);

  // خزانات مياه أسطوانية سوداء
  const tankCount = Math.min(3, Math.max(2, Math.floor(w / 6)));
  for (let t = 0; t < tankCount; t++) {
   const tx = -w * 0.30 + t * (w * 0.60 / (tankCount - 1 || 1));
   const tz = (t % 2 === 0) ? -d * 0.18 : d * 0.18;
   pushEgyptMatrix(EGYPT_BATCHER.tankBaseMatrices, x + tx, bodyH + 0.22, z + tz, 0, 0, 0, 0.85, 0.44, 0.85);
   pushEgyptMatrix(EGYPT_BATCHER.waterTankMatrices, x + tx, bodyH + 0.44 + 0.72, z + tz, 0, 0, 0, 1, 1, 1);
  }
 }

 const box = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2 - 0.8, z1: z + d / 2, h: totalBuildingH };
 MAP.buildings.push(box);
 buildingData.push({ x, z, w, d, h: totalBuildingH });
 const dummyMesh = new THREE.Object3D();
 dummyMesh.position.set(x, 0, z);
 const bStyle = isRedBrick ? 'brick' : (chosenTheme.key === 'plasterBeige' ? 'old' : chosenTheme.key === 'plasterCream' ? 'cairo' : 'modern');
 REAL_CITY.buildings.push({ mesh: dummyMesh, x, z, w, d, h: totalBuildingH, style: bStyle });
 REAL_CITY.styles[bStyle] = (REAL_CITY.styles[bStyle] || 0) + 1;
 if (numColsX > 0) REAL_CITY.styles['shop'] = (REAL_CITY.styles['shop'] || 0) + 1;
}

function flushEgyptBatcher() {
 const mergeFn = (typeof THREE !== 'undefined' && THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeGeometries) || (typeof mergeGeometries !== 'undefined' ? mergeGeometries : null);

 function mergeAndAdd(geos, mat) {
  if (!geos || !geos.length) return null;
  let mesh;
  if (mergeFn) {
   const merged = mergeFn(geos, false);
   mesh = new THREE.Mesh(merged, mat);
   for (const g of geos) g.dispose();
  } else {
   mesh = new THREE.Group();
   for (const g of geos) mesh.add(new THREE.Mesh(g, mat));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  REAL_CITY.group.add(mesh);
  return mesh;
 }

 const concreteMat = getEgyptConcreteMat();
 const brickMat = getEgyptBrickMat();
 const plasterThemes = {
  plasterBeige: { hex: 0xdec9a4 },
  plasterYellow: { hex: 0xe5dba7 },
  plasterWhite: { hex: 0xd6d2c4 },
  plasterGreen: { hex: 0xbac8b8 },
  plasterCream: { hex: 0xdbbe9b }
 };

 // دمج حوائط المباني حسب الخامة واللون
 mergeAndAdd(EGYPT_BATCHER.walls.brick, brickMat);
 for (const [key, spec] of Object.entries(plasterThemes)) {
  mergeAndAdd(EGYPT_BATCHER.walls[key], getEgyptPlasterMat(key, spec.hex));
 }

 // دمج بلاطات الأسقف والأسوار الخرسانية
 const allConcreteGeos = EGYPT_BATCHER.slabs.concat(EGYPT_BATCHER.parapets);
 mergeAndAdd(allConcreteGeos, concreteMat);

 // إنشاء وحدات InstancedMesh للعناصر المعمارية المتكررة
 const frameColor = 0x3c4a44;
 const winFrameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.75, envMapIntensity: 0.2 });
 const winGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x25353c, metalness: 0.36, roughness: 0.16, clearcoat: 0.7, envMapIntensity: 0.78 });
 const rebarMat = new THREE.MeshStandardMaterial({ color: 0x3d3835, roughness: 0.72, metalness: 0.65 });
 const ironRailMat = new THREE.MeshStandardMaterial({
  color: 0x222629,
  map: getEgyptIronRailTex(),
  transparent: true,
  alphaTest: 0.35,
  roughness: 0.45,
  metalness: 0.8
 });
 const ironRailSideMat = new THREE.MeshStandardMaterial({ color: 0x1f2324, roughness: 0.5, metalness: 0.8 });
 const woodShutterGreenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptWoodShutterTex('green'), roughness: 0.82 });
 const woodShutterBrownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptWoodShutterTex('brown'), roughness: 0.82 });
 const acMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptAcTex(), roughness: 0.75 });
 const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x181a1b, roughness: 0.84 });
 const shutterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptShutterTex(), roughness: 0.75, metalness: 0.4 });
 const awningMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getEgyptAwningTex(), roughness: 0.85, side: THREE.DoubleSide });

 const unitBox = new THREE.BoxGeometry(1, 1, 1);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.colMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.balcSlabMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, ironRailMat, EGYPT_BATCHER.balcFrontRailMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, ironRailSideMat, EGYPT_BATCHER.balcSideRailMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.PlaneGeometry(1.10, 2.15), winGlassMat, EGYPT_BATCHER.balcDoorMatrices, false, false);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.winSillMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, winFrameMat, EGYPT_BATCHER.winFrameMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.PlaneGeometry(1, 1), winGlassMat, EGYPT_BATCHER.winGlassMatrices, false, false);
 addEgyptInstances(REAL_CITY.group, unitBox, woodShutterGreenMat, EGYPT_BATCHER.woodShutterGreenMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, woodShutterBrownMat, EGYPT_BATCHER.woodShutterBrownMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, acMat, EGYPT_BATCHER.acMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, shutterMat, EGYPT_BATCHER.shopShutterMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, awningMat, EGYPT_BATCHER.awningMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.tankBaseMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.CylinderGeometry(0.70, 0.70, 1.45, 12), waterTankMat, EGYPT_BATCHER.waterTankMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, concreteMat, EGYPT_BATCHER.upColMatrices);
 addEgyptInstances(REAL_CITY.group, new THREE.CylinderGeometry(0.016, 0.016, 1.35, 5), rebarMat, EGYPT_BATCHER.rebarMatrices);
 addEgyptInstances(REAL_CITY.group, unitBox, brickMat, EGYPT_BATCHER.partialWallMatrices);

 // غسيل ملون بطيات قماش وظلال واقعية وأطباق دش وفرشات محلات
 const makeClothTex = (baseHex, stripeHex) => canvasTex(64, 96, (g, w, h) => {
  g.fillStyle = baseHex;
  g.fillRect(0, 0, w, h);
  if (stripeHex) {
   g.fillStyle = stripeHex;
   g.fillRect(0, h * 0.72, w, h * 0.14);
  }
  for (let x = 0; x < w; x += 8) {
   g.fillStyle = (x / 8) % 2 === 0 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.10)';
   g.fillRect(x, 0, 4, h);
  }
  const shade = g.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0.18)');
  shade.addColorStop(0.25, 'rgba(255,255,255,0.08)');
  shade.addColorStop(1, 'rgba(0,0,0,0.24)');
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);
 });
 const laundryMats = [
  new THREE.MeshStandardMaterial({ map: makeClothTex('#e5ddd0', '#c4b8a6'), roughness: 0.92, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ map: makeClothTex('#58768f', '#89a1b5'), roughness: 0.90, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ map: makeClothTex('#b87478', '#d49fa2'), roughness: 0.90, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ map: makeClothTex('#3b3d42', null), roughness: 0.92, side: THREE.DoubleSide })
 ];
 const clothPlane = new THREE.PlaneGeometry(1, 1);
 for (let c = 0; c < 4; c++) {
  addEgyptInstances(REAL_CITY.group, clothPlane, laundryMats[c], EGYPT_BATCHER.laundryMatrices[c], false, true);
 }
 const dishGeo = new THREE.SphereGeometry(0.38, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45);
 const dishMat = new THREE.MeshStandardMaterial({ color: 0xdeded8, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
 addEgyptInstances(REAL_CITY.group, dishGeo, dishMat, EGYPT_BATCHER.dishMatrices, true, true);

 const crateTex = canvasTex(128, 128, g => {
  g.fillStyle = '#b87e45'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#5c3a1a'; g.lineWidth = 3; g.strokeRect(4, 4, 120, 120);
  g.beginPath(); g.moveTo(4, 4); g.lineTo(124, 124); g.moveTo(124, 4); g.lineTo(4, 124); g.stroke();
  const chipCols = ['#c82424', '#2468c8', '#e8b824', '#24a854'];
  for (let y = 16; y < 112; y += 24) {
   g.fillStyle = chipCols[(y / 24) % 4]; g.fillRect(16, y, 96, 16);
  }
 });
 const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85 });
 addEgyptInstances(REAL_CITY.group, unitBox, crateMat, EGYPT_BATCHER.stallCrateMatrices, true, true);

 // لافتات المحلات العربية (InstancedMesh لكل لافتة)
 const shopSigns = getEgyptShopSigns();
 for (let s = 0; s < 6; s++) {
  if (EGYPT_BATCHER.shopSignMatrices[s].length) {
   const signMat = new THREE.MeshStandardMaterial({ map: shopSigns[s], roughness: 0.6 });
   addEgyptInstances(REAL_CITY.group, unitBox, signMat, EGYPT_BATCHER.shopSignMatrices[s]);
  }
 }
}

function realBuilding(x,z,w,d,h,style,footprint=null,near=null){
 const g=new THREE.Group();g.position.set(x,0,z);
 const palettes={old:[0xcbb38e,0xb89f78,0xd7c3a2],brick:[0xc68670,0xb2705b,0xd3957f],modern:[0xcfd8db,0xe3e2da,0xbcc8cc],tower:[0xd6d4ca,0xc2c8cb],shop:[0xd5c6ad,0xc7beb0],cairo:[0xdec9a4,0xd6ab84,0xc9b496,0xce9d7b],mosque:[0xeee4ce,0xe4d7bc,0xd8cab0]};
 const color=cityPick(palettes[style]||palettes.old);
 const wall=style==='brick'?new THREE.MeshStandardMaterial({map:REAL_CITY.brickTex,color,roughness:.9,envMapIntensity:.15}):style==='old'||style==='cairo'?new THREE.MeshStandardMaterial({map:REAL_CITY.oldTex,color,roughness:.92,envMapIntensity:.15}):style==='modern'||style==='tower'?new THREE.MeshStandardMaterial({map:REAL_CITY.modernTex,color,roughness:.58,metalness:.08,envMapIntensity:.38}):surfaceMaterial('plaster',w,h,color,4);
 if(wall.aoMap){wall.aoMap=null;wall.aoMapIntensity=0;}wall.envMapIntensity=wall.envMapIntensity??.18;
 const bodyH=style==='mosque'?Math.min(h,9.5):h;
 const bGeo=new THREE.BoxGeometry(w,bodyH,d);
 if(style==='brick'||style==='old'||style==='modern'||style==='cairo'){const uv=bGeo.attributes.uv,rx=Math.max(1,Math.round(w/5.5)),rz=Math.max(1,Math.round(d/5.5)),ry=Math.max(1,Math.round(bodyH/6.2));for(let i=0;i<uv.count;i++){const face=Math.floor(i/4),su=(face===0||face===1)?rz:rx,sv=(face===2||face===3)?rz:ry;uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);}uv.needsUpdate=true;}
 const b=new THREE.Mesh(bGeo,wall);b.position.y=bodyH/2;b.castShadow=true;b.receiveShadow=true;g.add(b);
 if(bodyH>6){const plinth=new THREE.Mesh(new THREE.BoxGeometry(w+.14,2.8,d+.14),new THREE.MeshStandardMaterial({color:style==='modern'||style==='tower'?0x687278:style==='mosque'?0xc7baa2:0x9c927f,roughness:.92,envMapIntensity:.12}));plinth.position.y=1.4;plinth.castShadow=true;plinth.receiveShadow=true;g.add(plinth);}
 const frameColor=style==='old'||style==='cairo'?cityPick([0x3b5842,0x524033,0x6e4a2b]):style==='brick'?0x6f6c66:style==='mosque'?0x2d684f:0x4b5860;
 const frame=new THREE.MeshStandardMaterial({color:frameColor,roughness:.76,envMapIntensity:.2}),winMat=new THREE.MeshPhysicalMaterial({color:style==='modern'||style==='tower'?0x21485b:0x25353c,metalness:.36,roughness:.16,clearcoat:.7,envMapIntensity:.78});
 const levels=Math.floor((bodyH-3)/3.2),cols=Math.max(1,Math.floor(w/3.2));
 if(levels>0&&style!=='mosque'){
  const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(1.18,1.58,.08),winMat,levels*cols*2),sills=new THREE.InstancedMesh(new THREE.BoxGeometry(1.46,.13,.28),frame,levels*cols*2),headers=new THREE.InstancedMesh(new THREE.BoxGeometry(1.46,.14,.22),frame,levels*cols*2);let n=0;const ob=new THREE.Object3D();
  windows.receiveShadow=true;sills.receiveShadow=true;headers.receiveShadow=true;
  for(let fl=0;fl<levels;fl++)for(let c=0;c<cols;c++)for(const side of [-1,1]){const wx=-w/2+(c+.5)*w/cols,wy=4.4+fl*3.2;ob.position.set(wx,wy,side*(d/2+.045));ob.rotation.set(0,0,0);ob.updateMatrix();windows.setMatrixAt(n,ob.matrix);ob.position.y-=.86;ob.position.z=side*(d/2+.12);ob.updateMatrix();sills.setMatrixAt(n,ob.matrix);ob.position.y+=1.70;ob.position.z=side*(d/2+.10);ob.updateMatrix();headers.setMatrixAt(n++,ob.matrix);}
  g.add(windows,sills,headers);
  const litSlots=Math.max(1,Math.floor(levels*cols*.28)),litWin=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.06,1.44),REAL_CITY.litGlass,litSlots);
  for(let li=0;li<litSlots;li++){const fl=Math.floor(cityRandom()*levels),c=Math.floor(cityRandom()*cols),side=cityRandom()<.5?-1:1;ob.position.set(-w/2+(c+.5)*w/cols,4.4+fl*3.2,side*(d/2+.092));ob.rotation.set(0,side>0?0:Math.PI,0);ob.updateMatrix();litWin.setMatrixAt(li,ob.matrix);}g.add(litWin);
  if(style==='old'||style==='cairo'){
   const shutters=new THREE.InstancedMesh(new THREE.BoxGeometry(.34,1.56,.08),frame,levels*cols*4);let sh=0;
   for(let fl=0;fl<levels;fl++)for(let c=0;c<cols;c++)for(const side of[-1,1])for(const sx of[-.76,.76]){ob.position.set(-w/2+(c+.5)*w/cols+sx,4.4+fl*3.2,side*(d/2+.07));ob.rotation.set(0,0,0);ob.updateMatrix();shutters.setMatrixAt(sh++,ob.matrix);}
   g.add(shutters);
  }
  const sideCols=Math.max(1,Math.floor(d/3.3)),sideWindows=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,1.5,.08),winMat,levels*sideCols*2);let sn=0;
  for(let fl=0;fl<levels;fl++)for(let c=0;c<sideCols;c++)for(const side of [-1,1]){ob.position.set(side*(w/2+.05),4.4+fl*3.2,-d/2+(c+.5)*d/sideCols);ob.rotation.set(0,Math.PI/2,0);ob.updateMatrix();sideWindows.setMatrixAt(sn++,ob.matrix);}g.add(sideWindows);
 }
 if(style==='mosque'){
  const domeMat=new THREE.MeshStandardMaterial({color:cityPick([0x2d6d53,0x35697a,0xd8c8a8]),roughness:.55,metalness:.18,envMapIntensity:.35});
  const trimMat=new THREE.MeshStandardMaterial({color:0xc9b486,roughness:.7,metalness:.25});
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w,d)*.28,Math.min(w,d)*.30,1.6,12),trimMat);drum.position.y=bodyH+.8;g.add(drum);
  const domeR=Math.min(w,d)*.27;const dome=new THREE.Mesh(new THREE.SphereGeometry(domeR,16,12,0,Math.PI*2,0,Math.PI*.55),domeMat);dome.position.y=bodyH+1.55;dome.castShadow=true;g.add(dome);
  const spire=new THREE.Mesh(new THREE.CylinderGeometry(.04,.09,1.3,6),new THREE.MeshStandardMaterial({color:0xd8b24c,metalness:.8,roughness:.3}));spire.position.y=bodyH+1.55+domeR+.5;g.add(spire);
  const minH=bodyH+11.5,mx=w*.34,mz=-d*.32;
  const minaret=new THREE.Mesh(new THREE.CylinderGeometry(.68,.95,minH,8),wall);minaret.position.set(mx,minH/2,mz);minaret.castShadow=true;g.add(minaret);
  const balcony=new THREE.Mesh(new THREE.CylinderGeometry(1.08,.96,.42,8),trimMat);balcony.position.set(mx,bodyH+5.2,mz);g.add(balcony);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.82,2.4,8),domeMat);cap.position.set(mx,minH+1.2,mz);g.add(cap);
  for(const cx of [-w*.24,0,w*.24]){const arch=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.6,.12),winMat);arch.position.set(cx,2.1,-d/2-.06);g.add(arch);}
 }
 if(style==='shop'){for(let j=0;j<Math.min(4,Math.floor(w/3.5));j++){const awning=new THREE.Mesh(new THREE.BoxGeometry(2.5,.13,.78),new THREE.MeshStandardMaterial({color:cityPick([0x2d5e49,0x8f3f2c,0x335d7a,0x9b7137]),roughness:.85,envMapIntensity:.15}));awning.position.set(-w/2+2+j*3.2,2.52,-d/2-.34);awning.castShadow=true;g.add(awning);const shutter=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.35),new THREE.MeshStandardMaterial({color:0x767870,map:ironGrilleTex,roughness:.82,envMapIntensity:.2}));shutter.position.set(-w/2+2+j*3.2,1.25,-d/2-.08);shutter.rotation.y=Math.PI;g.add(shutter);}}
 if(bodyH>10){const ac=new THREE.Mesh(new THREE.BoxGeometry(.68,.46,.42),new THREE.MeshStandardMaterial({color:0xbec0b5,roughness:.85,envMapIntensity:.2}));ac.position.set(w*.3,6.5,-d/2-.22);ac.castShadow=true;g.add(ac);}
 const slabMat=new THREE.MeshStandardMaterial({color:style==='brick'?0x8a877f:0xdedad0,roughness:.84,envMapIntensity:.16});
 if(style==='old'||style==='brick'||style==='cairo'){
  const concreteCol=new THREE.MeshStandardMaterial({color:0x8e8b84,roughness:.9,envMapIntensity:.14});
  if(style==='brick'){for(const sx of [-w/2,w/2])for(const sz of [-d/2,d/2]){const col=new THREE.Mesh(new THREE.BoxGeometry(.36,bodyH,.36),concreteCol);col.position.set(sx,bodyH/2,sz);g.add(col);}for(let sy=3.2;sy<bodyH;sy+=3.2){const slab=new THREE.Mesh(new THREE.BoxGeometry(w+.14,.18,d+.14),concreteCol);slab.position.y=sy;g.add(slab);}}
  for(let i=0;i<Math.min(3,levels);i++){const balcony=new THREE.Mesh(new THREE.BoxGeometry(w*.74,.16,.84),slabMat);balcony.position.set(0,5+i*3.2,-d/2-.38);balcony.castShadow=true;balcony.receiveShadow=true;g.add(balcony);const rail=new THREE.Mesh(new THREE.BoxGeometry(w*.74,.78,.06),frame);rail.position.set(0,5.42+i*3.2,-d/2-.78);rail.castShadow=true;g.add(rail);}
  if(style==='brick'&&bodyH>9){const parapet=new THREE.Mesh(new THREE.BoxGeometry(w+.12,.60,d+.12),concreteCol);parapet.position.y=bodyH+.28;parapet.castShadow=true;g.add(parapet);for(const [rx,rz]of[[-w*.35,-d*.35],[w*.35,-d*.35],[-w*.35,d*.35],[w*.35,d*.35]]){const rebar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.85,5),concreteCol);rebar.position.set(rx,bodyH+.7,rz);g.add(rebar);}}
  if(style==='cairo'){const cornice=new THREE.Mesh(new THREE.BoxGeometry(w+.34,.48,d+.34),slabMat);cornice.position.y=bodyH+.2;g.add(cornice);}
 }else if(style==='modern'||style==='tower'){
  for(let y=3;y<bodyH;y+=3.2){const band=new THREE.Mesh(new THREE.BoxGeometry(w+.16,.16,d+.16),slabMat);band.position.y=y;band.receiveShadow=true;g.add(band);}
  if(bodyH>24){const penthouse=new THREE.Mesh(new THREE.BoxGeometry(w*.45,2.6,d*.45),slabMat);penthouse.position.y=bodyH+1.3;penthouse.castShadow=true;g.add(penthouse);}
 }
 if(style==='shop'||(style!=='mosque'&&cityRandom()<.45)){const width=Math.min(w*.8,8),metal=new THREE.MeshStandardMaterial({color:0x59646a,roughness:.6,metalness:.4,envMapIntensity:.3}),face=new THREE.MeshStandardMaterial({map:cityPick(REAL_SHOP_SIGNS),roughness:.65,envMapIntensity:.2}),sign=new THREE.Mesh(new THREE.BoxGeometry(width,.72,.07),[metal,metal,metal,metal,metal,face]);sign.position.set(0,2.95,-d/2-.12);sign.name='WallMountedShopSign';g.add(sign);for(const x of[-width*.42,width*.42]){const fixing=new THREE.Mesh(new THREE.BoxGeometry(.08,.65,.10),metal);fixing.position.set(x,2.95,-d/2-.04);g.add(fixing);}}
 if(style==='old'||style==='brick'||style==='cairo'){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,1.15,10),new THREE.MeshStandardMaterial({color:0x1f2826,roughness:.85,envMapIntensity:.2}));tank.position.set(w*.24,bodyH+.8,0);g.add(tank);const dish=new THREE.Mesh(new THREE.ConeGeometry(.45,.2,10),new THREE.MeshStandardMaterial({color:0xdce0e2,roughness:.5,envMapIntensity:.4}));dish.position.set(-w*.24,bodyH+.75,-d*.2);dish.rotation.x=-.9;g.add(dish);}
 const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.20,.22,d+.20),new THREE.MeshStandardMaterial({color:0x888376,roughness:.95,envMapIntensity:.12}));roof.position.y=bodyH;roof.receiveShadow=true;g.add(roof);
 REAL_CITY.group.add(g);const frontPad=(style==='old'||style==='brick'||style==='shop'||style==='cairo')?.86:0;
 const box={x0:x-w/2,x1:x+w/2,z0:z-d/2-frontPad,z1:z+d/2,h:bodyH};MAP.buildings.push(box);buildingData.push({x,z,w,d:d+frontPad,h:bodyH});REAL_CITY.buildings.push({mesh:g,x,z,w,d,h:bodyH,style,footprint});REAL_CITY.styles[style]=(REAL_CITY.styles[style]||0)+1;
}
{
 const occupied=[],parkSpots=[],occGrid=new Map(),OCC_CELL=30;
 function addOcc(x,z,w,d){
  const item={x,z,w,d};occupied.push(item);
  const gx0=Math.floor((x-w/2-2)/OCC_CELL),gx1=Math.floor((x+w/2+2)/OCC_CELL);
  const gz0=Math.floor((z-d/2-2)/OCC_CELL),gz1=Math.floor((z+d/2+2)/OCC_CELL);
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){const k=gx+','+gz;if(!occGrid.has(k))occGrid.set(k,[]);occGrid.get(k).push(item);}
 }
 function hasOcc(x,z,hw,hd){
  const gx0=Math.floor((x-hw)/OCC_CELL),gx1=Math.floor((x+hw)/OCC_CELL);
  const gz0=Math.floor((z-hd)/OCC_CELL),gz1=Math.floor((z+hd)/OCC_CELL);
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){
   for(const b of occGrid.get(gx+','+gz)||[])if(Math.abs(b.x-x)<b.w/2+hw&&Math.abs(b.z-z)<b.d/2+hd)return true;
  }
  return false;
 }
 function free(x,z,w,d){
  if(Math.hypot(x-ASSYUT.start.x,z-ASSYUT.start.z)<Math.max(w,d)/2+16)return false;
  if(hasOcc(x,z,w/2+1,d/2+1.4))return false;
  if(roadCutsBuilding(x,z-.45,w,d+1.0,2.2))return false;
  if(bridgeCutsBox(x,z-.45,w,d+1.0,3.2))return false;
  const pad=1.6;
  for(const [px,pz]of [[x,z],[x-w/2,z-d/2-.9],[x+w/2,z-d/2-.9],[x-w/2,z+d/2],[x+w/2,z+d/2]]){const p=nearestAssyutRoad({x:px,z:pz});if(p&&p.distance<p.width/2+2.3+pad)return false;}
  return true;
 }
 function addPark(x,z,w,d){
  const pg=new THREE.Group();pg.position.set(x,0,z);
  const curb=new THREE.Mesh(new THREE.BoxGeometry(w,.16,d),new THREE.MeshStandardMaterial({color:0xb8b09c,roughness:.9,envMapIntensity:.1}));curb.position.y=.08;curb.receiveShadow=true;pg.add(curb);
  const lawn=new THREE.Mesh(new THREE.BoxGeometry(w-.6,.05,d-.6),REAL_CITY.grassMat);lawn.position.y=.17;lawn.receiveShadow=true;pg.add(lawn);
  const pathMat=new THREE.MeshStandardMaterial({color:0xd2c7ae,roughness:.9,envMapIntensity:.1});
  const p1=new THREE.Mesh(new THREE.BoxGeometry(w-.5,.02,1.6),pathMat);p1.position.y=.20;p1.receiveShadow=true;pg.add(p1);
  const p2=new THREE.Mesh(new THREE.BoxGeometry(1.6,.02,d-.5),pathMat);p2.position.y=.20;p2.receiveShadow=true;pg.add(p2);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(1.7,.45,.55),new THREE.MeshStandardMaterial({color:0x764c29,roughness:.85,envMapIntensity:.15}));bench.position.set(w*.22,.42,d*.22);bench.castShadow=true;pg.add(bench);
  REAL_CITY.group.add(pg);addOcc(x,z,w,d);parkSpots.push({x,z,w,d});
 }
   const styles=['old','brick','cairo','modern','shop','tower'];
  for(const f of ASSYUT.footprints){
   const xs=f.points.map(p=>p.x),zs=f.points.map(p=>p.z);
   const w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs);
   const x=(Math.max(...xs)+Math.min(...xs))/2,z=(Math.max(...zs)+Math.min(...zs))/2;
   if(w<5||d<5||w>80||d>80||!free(x,z,w,d))continue;

   const nearF=nearestAssyutRoad({x,z});
   const isVillFootprint=nearF?.segment&&isVillageSeg(nearF.segment);
   if(isVillFootprint){
    const floors=f.levels?Math.max(2,Math.min(4,Math.round(+f.levels))):(2+Math.floor(cityRandom()*3));
    buildEgyptianResidential(x,z,Math.max(w,10),Math.max(d,10),{floors,isRedBrick:true,hasUnfinishedRoof:cityRandom()<0.65,shutterTheme:cityRandom()<0.6?'green':'brown'},nearF);
   } else if(w>=13&&d>=13&&cityRandom()<0.04){
    realBuilding(x,z,w,d,Math.min(w,9.5),'mosque',f.id,nearF);
   } else if(cityRandom()<0.025){
    realBuilding(x,z,w,d,cityRand(32,50),'tower',f.id,nearF);
   } else {
    const floors=f.levels?Math.max(3,Math.min(8,Math.round(+f.levels))):(3+Math.floor(cityRandom()*6));
    buildEgyptianResidential(x,z,Math.max(w,10),Math.max(d,10),{floors},nearF);
   }
   addOcc(x,z,w,d);
  }

  // 1.5 مباني واجهات الشوارع الرئيسية (Street Corridor Canyons)
  for(let ri=0;ri<ASSYUT.roads.length;ri++){
   const r=ASSYUT.roads[ri];
   if(r.width<8||INFRA.profiles.has(ri))continue;
   for(const si of r.segments){
    const s=ASSYUT.segments[si];
    if(s.length<22)continue;
    const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length;
    const nx=-dz,nz=dx;
    const bldgW=13,bldgD=13;
    const offsetDist=r.width/2+bldgD/2+0.85;
    for(let dist=bldgW/2+1;dist<=s.length-bldgW/2-1;dist+=bldgW+1.5){
     const cx=s.a.x+dx*dist,cz=s.a.z+dz*dist;
     for(const side of[-1,1]){
      const bx=cx+nx*side*offsetDist,bz=cz+nz*side*offsetDist;
      if(free(bx,bz,bldgW,bldgD)){
       const floors=4+Math.floor(cityRandom()*4);
       buildEgyptianResidential(bx,bz,bldgW,bldgD,{
        floors,
        isRedBrick:cityRandom()<0.92,
        hasUnfinishedRoof:cityRandom()<0.78,
        shutterTheme:cityRandom()<0.6?'green':'brown'
       },{segment:s,road:ri,distance:offsetDist,width:r.width,point:{x:cx,z:cz}});
       addOcc(bx,bz,bldgW,bldgD);
      }
     }
    }
   }
  }

  const z0=ASSYUT.bounds.z0+24,z1=ASSYUT.bounds.z1-24,x0=ASSYUT.bounds.x0+24,x1=ASSYUT.bounds.x1-24;
  for(let z=z0;z<=z1;z+=25)for(let x=x0;x<=x1;x+=25){
   const near=nearestAssyutRoad({x,z});if(!near||near.distance>180||near.distance<8)continue;
   let w=cityRand(11,21),d=cityRand(11,20);
   if(!free(x,z,w,d)){w=10;d=10;if(!free(x,z,w,d))continue;}
   if(w>13&&d>13&&cityRandom()<.13){addPark(x,z,w,d);continue;}

   if(x===-151&&z===149){
    buildEgyptianResidential(x,z,Math.max(w,14),Math.max(d,14),{testId:1,floors:5,isRedBrick:false,hasUnfinishedRoof:false,plasterTheme:{key:'plasterBeige',hex:0xdec9a4},shutterTheme:'green'},near);
    addOcc(x,z,Math.max(w,14),Math.max(d,14));continue;
   }
   if(x===-176&&z===149){
    buildEgyptianResidential(x,z,Math.max(w,14),Math.max(d,14),{testId:2,floors:6,isRedBrick:false,hasUnfinishedRoof:true,plasterTheme:{key:'plasterYellow',hex:0xe5dba7},shutterTheme:'brown'},near);
    addOcc(x,z,Math.max(w,14),Math.max(d,14));continue;
   }
   if(x===-151&&z===74){
    buildEgyptianResidential(x,z,Math.max(w,15),Math.max(d,15),{testId:3,floors:5,isRedBrick:true,hasUnfinishedRoof:false,shutterTheme:'green'},near);
    addOcc(x,z,Math.max(w,15),Math.max(d,15));continue;
   }

   const isVillNear = near.segment && isVillageSeg(near.segment);
   if(isVillNear){
    const floors=2+Math.floor(cityRandom()*3);
    buildEgyptianResidential(x,z,w,d,{floors,isRedBrick:true,hasUnfinishedRoof:cityRandom()<0.65,shutterTheme:cityRandom()<0.6?'green':'brown'},near);
   } else if(w>=13&&d>=13&&cityRandom()<0.04){
    realBuilding(x,z,w,d,Math.min(w,9.5),'mosque',null,near);
   } else if(cityRandom()<0.025){
    realBuilding(x,z,w,d,cityRand(31,52),'tower',null,near);
   } else {
    const floors=3+Math.floor(cityRandom()*6);
    buildEgyptianResidential(x,z,w,d,{floors},near);
   }
   addOcc(x,z,w,d);
  }

  // تفريغ وتوليد كافة المباني المجمعة بـ InstancedMesh و mergeGeometries
  flushEgyptBatcher();
  // المساحات الخضراء والنخيل والأشجار الواقعية متعدّدة الأوراق على حواف الطرق وفي الحدائق
 const palmBarkMat=new THREE.MeshStandardMaterial({map:REAL_CITY.palmBarkTex,color:0xffffff,roughness:.94,envMapIntensity:.1});
 const treeBarkMat=new THREE.MeshStandardMaterial({map:REAL_CITY.treeBarkTex,color:0xffffff,roughness:.95,envMapIntensity:.1});
 const frondMat=new THREE.MeshStandardMaterial({map:REAL_CITY.palmFrondTex,alphaTest:.35,side:THREE.DoubleSide,roughness:.75,envMapIntensity:.2});
 const canopyMat=new THREE.MeshStandardMaterial({map:REAL_CITY.leafCanopyTex,alphaTest:.35,side:THREE.DoubleSide,roughness:.82,envMapIntensity:.18});
 const planterMat=new THREE.MeshStandardMaterial({color:0xaba28d,roughness:.9,envMapIntensity:.1});
 const treeSpots=[];
 for(const p of parkSpots){for(const [ox,oz]of[[-p.w*.28,-p.d*.28],[p.w*.28,-p.d*.28],[-p.w*.28,p.d*.28],[p.w*.28,p.d*.28]])treeSpots.push({x:p.x+ox,z:p.z+oz,palm:cityRandom()<.5,inPark:true});}
 for(let i=0;i<ASSYUT.roads.length;i++){const r=ASSYUT.roads[i];if(r.width<9||INFRA.profiles.has(i))continue;let next=10;for(const si of r.segments){const s=ASSYUT.segments[si];for(let d=next;d<s.length;d+=28){const side=d%56<28?1:-1,nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,x=lerp(s.a.x,s.b.x,d/s.length)+nx*side*(r.width/2+1.65),z=lerp(s.a.z,s.b.z,d/s.length)+nz*side*(r.width/2+1.65),p=nearestAssyutRoad({x,z});if(!p||p.distance<p.width/2+1.25||hasOcc(x,z,1.2,1.2))continue;treeSpots.push({x,z,palm:cityRandom()<.55,inPark:false});}next=(next-s.length)%28;if(next<0)next+=28;}}
 const palms=treeSpots.filter(t=>t.palm),trees=treeSpots.filter(t=>!t.palm);
 if(palms.length){
  // سعف نخل منحنٍ واقعي (8 سعفات مقوّسة لكل نخلة)
  const fv=[],fuv=[];const segs=4,fw=.82,fl=3.4;
  for(let k=0;k<segs;k++){const t0=k/segs,t1=(k+1)/segs,z0=t0*fl,z1=t1*fl,y0=Math.sin(t0*2.1)*.58-t0*t0*.95,y1=Math.sin(t1*2.1)*.58-t1*t1*.95,w0=fw*(1-t0*.3),w1=fw*(1-t1*.3);
   fv.push(-w0,y0,z0,w0,y0,z0,w1,y1,z1,-w0,y0,z0,w1,y1,z1,-w1,y1,z1);fuv.push(0,1-t0,1,1-t0,1,1-t1,0,1-t0,1,1-t1,0,1-t1);}
  const frondGeo=new THREE.BufferGeometry();frondGeo.setAttribute('position',new THREE.Float32BufferAttribute(fv,3));frondGeo.setAttribute('uv',new THREE.Float32BufferAttribute(fuv,2));frondGeo.computeVertexNormals();
  const pTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.28,5.8,8),palmBarkMat,palms.length);
  const pFronds=new THREE.InstancedMesh(frondGeo,frondMat,palms.length*8);
  const ob=new THREE.Object3D();let fi=0;
  palms.forEach((pt,idx)=>{const sc=cityRand(.85,1.22),leanX=cityRand(-.04,.04),leanZ=cityRand(-.04,.04);ob.position.set(pt.x,2.9*sc,pt.z);ob.rotation.set(leanX,cityRand(0,6.28),leanZ);ob.scale.setScalar(sc);ob.updateMatrix();pTrunks.setMatrixAt(idx,ob.matrix);
   for(let f=0;f<8;f++){ob.position.set(pt.x+leanZ*1.8*sc,5.65*sc,pt.z-leanX*1.8*sc);ob.rotation.set(f%2?-.22:.08,f/8*Math.PI*2+cityRand(-.15,.15),0);ob.scale.setScalar(sc);ob.updateMatrix();pFronds.setMatrixAt(fi++,ob.matrix);}
   TREES.push({x:pt.x,z:pt.z,r:.42});});
  pTrunks.castShadow=true;pTrunks.receiveShadow=true;pFronds.castShadow=true;pFronds.receiveShadow=true;REAL_CITY.group.add(pTrunks,pFronds);
 }
 if(trees.length){
  // أوراق شجر كثيفة متقاطعة (3 لوحات متعامدة بأوراق شفافّة تعطي حجماً طبيعياً وظلاً متفرّقاً)
  const cv=[],cuv=[];const sz=2.6;
  for(const rot of[0,Math.PI/3,Math.PI*2/3]){const cx=Math.cos(rot)*sz*.5,cz=Math.sin(rot)*sz*.5;cv.push(-cx,-sz*.45,-cz,cx,-sz*.45,cz,cx,sz*.55,cz,-cx,-sz*.45,-cz,cx,sz*.55,cz,-cx,sz*.55,-cz);cuv.push(0,0,1,0,1,1,0,0,1,1,0,1);}
  const capPlane=new THREE.PlaneGeometry(sz,sz);capPlane.rotateX(-Math.PI/2);const cp=capPlane.attributes.position,cu=capPlane.attributes.uv;
  for(const i of capPlane.index.array){cv.push(cp.getX(i),cp.getY(i)+.12,cp.getZ(i));cuv.push(cu.getX(i),cu.getY(i));}
  const canopyGeo=new THREE.BufferGeometry();canopyGeo.setAttribute('position',new THREE.Float32BufferAttribute(cv,3));canopyGeo.setAttribute('uv',new THREE.Float32BufferAttribute(cuv,2));canopyGeo.computeVertexNormals();
  const tTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.28,3.2,7),treeBarkMat,trees.length);
  const tCrowns=new THREE.InstancedMesh(canopyGeo,canopyMat,trees.length*2);
  const tBases=new THREE.InstancedMesh(new THREE.BoxGeometry(1.3,.22,1.3),planterMat,trees.length);
  const ob=new THREE.Object3D();let ci=0;
  trees.forEach((tr,idx)=>{const sc=cityRand(.88,1.28);ob.position.set(tr.x,1.6*sc,tr.z);ob.rotation.set(0,cityRand(0,6.28),0);ob.scale.setScalar(sc);ob.updateMatrix();tTrunks.setMatrixAt(idx,ob.matrix);
   for(let l=0;l<2;l++){ob.position.set(tr.x+(l?.35:-.25)*sc,(3.2+l*.9)*sc,tr.z+(l?-.25:.25)*sc);ob.rotation.set(cityRand(-.15,.15),cityRand(0,6.28),cityRand(-.15,.15));ob.scale.setScalar(sc*(l?.88:1.12));ob.updateMatrix();tCrowns.setMatrixAt(ci++,ob.matrix);}
   ob.position.set(tr.x,.11,tr.z);ob.rotation.set(0,0,0);ob.scale.setScalar(tr.inPark?.01:1);ob.updateMatrix();tBases.setMatrixAt(idx,ob.matrix);TREES.push({x:tr.x,z:tr.z,r:.42});});
  tTrunks.castShadow=true;tTrunks.receiveShadow=true;tCrowns.castShadow=true;tCrowns.receiveShadow=true;REAL_CITY.group.add(tTrunks,tCrowns,tBases);
 }
 // Lighting and street signs are attached to actual road edges.
 // أعمدة إنارة تضيء تلقائياً عند الغروب والليل مع بقع ضوئية على الأسفلت وهالات توهج
 const assyutLampPts=[];
 const lampPoleMat=new THREE.MeshStandardMaterial({color:0x33433c,roughness:.6,metalness:.35});
 const lampBulbMat=new THREE.MeshStandardMaterial({color:0xffedd0,emissive:0xffcc70,emissiveIntensity:.08});
 lampBulbMat.userData={base:1.15};
 if(typeof nightMats!=='undefined')nightMats.push(lampBulbMat);
 for(let i=0;i<ASSYUT.roads.length;i++){const r=ASSYUT.roads[i];if(r.width<9)continue;let next=0;for(const si of r.segments){const s=ASSYUT.segments[si];for(let d=next;d<s.length;d+=48){const side=i%2?1:-1,nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,x=lerp(s.a.x,s.b.x,d/s.length)+nx*side*(r.width/2+1.4),z=lerp(s.a.z,s.b.z,d/s.length)+nz*side*(r.width/2+1.4),p=nearestAssyutRoad({x,z});if(p.distance<p.width/2+.3)continue;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.10,6,6),lampPoleMat);pole.position.set(x,3,z);REAL_CITY.group.add(pole);const lamp=new THREE.Mesh(new THREE.BoxGeometry(.52,.15,.30),lampBulbMat);lamp.position.set(x,6,z);REAL_CITY.group.add(lamp);ROAD_FURNITURE.push({x,z,kind:'streetlight'});assyutLampPts.push({x,z,nx:nx*-side,nz:nz*-side});}next=(next-s.length)%48;if(next<0)next+=48;}}
 if(assyutLampPts.length){
  const poolMat=new THREE.MeshBasicMaterial({color:0xffb866,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  const pools=new THREE.InstancedMesh(new THREE.CircleGeometry(1,14),poolMat,assyutLampPts.length);
  const glowCoords=[];const dm=new THREE.Object3D();
  assyutLampPts.forEach((lp,idx)=>{
   dm.position.set(lp.x+lp.nx*2.1,.05,lp.z+lp.nz*2.1);dm.rotation.set(-Math.PI/2,0,0);dm.scale.set(5.2,5.2,1);dm.updateMatrix();pools.setMatrixAt(idx,dm.matrix);
   glowCoords.push(lp.x,5.95,lp.z);
  });
  pools.instanceMatrix.needsUpdate=true;pools.frustumCulled=false;REAL_CITY.group.add(pools);
  const gGeo=new THREE.BufferGeometry();gGeo.setAttribute('position',new THREE.Float32BufferAttribute(glowCoords,3));
  const gMat=new THREE.PointsMaterial({map:GLOW_TEX,color:0xffcf88,size:10,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const gPts=new THREE.Points(gGeo,gMat);gPts.frustumCulled=false;REAL_CITY.group.add(gPts);
  if(typeof nightGlows!=='undefined'){nightGlows.push({mat:poolMat,day:0,night:.34});nightGlows.push({mat:gMat,day:0,night:.92});}
 }
 for(const p of ASSYUT.places.filter((_,i)=>i%2===0))addMountedRoadSign(p.name,p,null,'محافظة أسيوط · '+p.name);
 // لوحات إعلانات كبيرة وصغيرة مضاءة ليلاً لبراندات وبنوك مصرية حقيقية
 const steelMat=new THREE.MeshStandardMaterial({color:0x5b666d,roughness:.55,metalness:.5});
 for(let i=0;i<ASSYUT.places.length;i+=3){
  const p=ASSYUT.places[i],n=nearestAssyutRoad(p),isSmall=i%2===1;
  const x=n.point.x+n.nx*(n.width/2+(isSmall?1.6:4.2)),z=n.point.z+n.nz*(n.width/2+(isSmall?1.6:4.2));
  if(nearestAssyutRoad({x,z}).distance<n.width/2)continue;
  const tex=cityPick(BILLBOARD_TEXES);
  const adMat=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.2,roughness:.65});
  adMat.userData={base:.45};if(typeof nightMats!=='undefined')nightMats.push(adMat);
  const ad=new THREE.Mesh(new THREE.BoxGeometry(isSmall?2.2:8.2,isSmall?2.7:3.8,.16),adMat);
  ad.position.set(x,isSmall?1.9:5.2,z);ad.rotation.y=n.heading+Math.PI/2;REAL_CITY.group.add(ad);
  const height=ad.position.y;
  for(const offset of isSmall?[0]:[-2.6,2.6]){const v=new THREE.Vector3(offset,0,-.08).applyAxisAngle(new THREE.Vector3(0,1,0),ad.rotation.y),support=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,height,8),steelMat);support.position.set(x+v.x,height/2,z+v.z);REAL_CITY.group.add(support);ROAD_FURNITURE.push({x:x+v.x,z:z+v.z,kind:'advert'});}
 }
}
