/* CC0 photographic PBR surfaces from Poly Haven, embedded by build.js. */
const SURFACE_PACKED=/*__SURFACE_DATA__*/ {};
const surfaceAssets={loaded:0,total:Object.keys(SURFACE_PACKED).length,errors:[]};
const surfaceTextures={},surfaceTextureCopies={};
for(const [key,bytes] of Object.entries(SURFACE_PACKED)){
 const texUrl=/^(?:assets\/|\.\/|\.\.\/|data:|https?:)/.test(bytes)?bytes:'data:image/webp;base64,'+bytes;
 const texture=new THREE.TextureLoader().load(texUrl,()=>{
  surfaceAssets.loaded++;for(const clone of surfaceTextureCopies[key]||[])clone.needsUpdate=true;
 },undefined,error=>{surfaceAssets.errors.push(key);console.warn('Surface failed:',key,error);});
 texture.colorSpace=key.endsWith('-color')?THREE.SRGBColorSpace:THREE.NoColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());surfaceTextures[key]=texture;
}
function surfaceTexture(type,channel,w,d,tile=4){
 const key=type+'-'+channel,source=surfaceTextures[key];
 if(!source)return null;
 const texture=source.clone();texture.repeat.set(w/tile,d/tile);texture.needsUpdate=true;
 (surfaceTextureCopies[key]||=([])).push(texture);return texture;
}
const roadSurfaces=[];
function surfaceMaterial(type,w,d,color=0xffffff,tile=4){
 const map=surfaceTexture(type,'color',w,d,tile),normalMap=surfaceTexture(type,'normal',w,d,tile),arm=surfaceTexture(type,'arm',w,d,tile);
 const isAsph=type==='asphalt';
 const mat=new THREE.MeshStandardMaterial({color,map,normalMap,roughnessMap:arm,aoMap:arm,roughness:isAsph?.82:.95,metalness:0,normalScale:new THREE.Vector2(isAsph?.95:.65,isAsph?.95:.65),envMapIntensity:isAsph?.38:.15,aoMapIntensity:.55});
 if(type==='asphalt')roadSurfaces.push(mat);return mat;
}
function buildingSurfaces(w,h,d,tint){
 const front=surfaceMaterial('plaster',w,h,tint,4),side=surfaceMaterial('plaster',d,h,tint,4),roof=surfaceMaterial('stone',w,d,0xaaa69f,4);
 return [side,side,roof,roof,front,front];
}
const facadeDetails=new Map();
const nearArchitecture=[];
function detailInstance(type,x,y,z,sx,sy,sz,angle=0,color=0xffffff){
 const zone=Math.floor((x+HALF)/240),key=zone+':'+type;
 if(!facadeDetails.has(key))facadeDetails.set(key,{type,items:[]});
 facadeDetails.get(key).items.push({x,y,z,sx,sy,sz,angle,color});
}
function architecturalFacade(cx,cz,w,h,angle=0,groundShops=false){
 const ux=Math.cos(angle),uz=-Math.sin(angle),nx=Math.sin(angle),nz=Math.cos(angle);
 const at=(type,u,y,out,sx,sy,sz,col)=>detailInstance(type,cx+ux*u+nx*out,y,cz+uz*u+nz*out,sx,sy,sz,angle,col);
 const trim=pick([0xc6beb0,0xd2c6b2,0xb8afa1]),frames=pick([0x8b8276,0xc3bfb5,0x5a605e]);
 const cols=Math.max(2,Math.floor((w-1.4)/3.25)),spacing=(w-1.2)/cols;
 const floors=Math.max(1,Math.floor((h-5.1)/3.5));
 for(let fl=0;fl<floors;fl++){
  const y=6.2+fl*3.5;if(y+1.08>h-.5)continue;
  for(let c=0;c<cols;c++){
   const u=-w/2+.6+(c+.5)*spacing;
   at('frame',u,y,.10,1,1,1,frames);
   at(Math.random()<.24?'litGlass':'glass',u,y,.035,1,1,1,0xffffff);
   at('trim',u,y,.21,.045,1.97,.065,frames);
   at('trim',u,y+.22,.21,1.34,.04,.065,frames);
   at('trim',u,y-1.10,.21,1.7,.10,.43,trim);
   if(Math.random()<.23)at('shutter',u,y,.16,1.30,1.92,.09,pick([0x37483a,0x635d4b,0x424847]));
   if(Math.random()<.16){
    at('ac',u+1.1,y-.62,.23,.68,.43,.38,0xbab8ac);
    at('fan',u+1.1,y-.62,.43,.28,.28,1,0x4d5352);
   }
  }
  at('trim',0,y-1.45,.10,w,.10,.20,trim);
 }
 at('trim',0,h-.16,.13,w+.35,.3,.46,trim);
 at('pipe',-w/2+.28,h/2,.13,.075,h-.4,.075,0x68665b);
 at('trim',0,.55,.05,w,.95,.16,0x969083);
 if(groundShops){
  const shops=Math.max(2,Math.floor(w/4));
  for(let c=0;c<shops;c++){
   const u=-w/2+(c+.5)*w/shops,sw=w/shops-.38;
   at('glass',u,1.85,.07,sw/1.34,2.7/1.96,1,0xb9c8c6);
   at('trim',u-sw*.5,1.9,.16,.10,2.9,.12,0x6b7070);
   at('trim',u+sw*.5,1.9,.16,.10,2.9,.12,0x6b7070);
   at('trim',u+sw*.18,1.75,.18,.065,2.65,.10,0xa4a8a2);
   at('trim',u,3.5,.20,sw+.12,.35,.18,0x5f5f55);
   if(Math.random()<.28)at('shutter',u,1.82,.19,sw,2.68,.08,0x777971);
  }
 }
}
function finalizeFacadeDetails(){
 const outline=new THREE.Shape();outline.moveTo(-.75,-1.06);outline.lineTo(.75,-1.06);outline.lineTo(.75,1.06);outline.lineTo(-.75,1.06);outline.closePath();
 const opening=new THREE.Path();opening.moveTo(-.67,-.98);opening.lineTo(-.67,.98);opening.lineTo(.67,.98);opening.lineTo(.67,-.98);opening.closePath();outline.holes.push(opening);
 const frameGeo=new THREE.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:true,bevelSize:.018,bevelThickness:.015,bevelSegments:1,steps:1});
 const shutterTex=canvasTex(64,128,g=>{g.fillStyle='#d0d0c8';g.fillRect(0,0,64,128);for(let y=0;y<128;y+=8){g.fillStyle='#666c65';g.fillRect(0,y,64,2);g.fillStyle='#eeeeea';g.fillRect(0,y+2,64,1);}});shutterTex.wrapS=shutterTex.wrapT=THREE.RepeatWrapping;
 const mats={
  frame:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.84}),
  glass:new THREE.MeshPhysicalMaterial({color:0x445960,roughness:.18,metalness:.24,clearcoat:.8,envMapIntensity:.75}),
  litGlass:new THREE.MeshStandardMaterial({color:0x60635b,roughness:.25,metalness:.18,emissive:0xffcf8c,emissiveIntensity:0}),
  trim:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85}),
  pipe:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.7,metalness:.15}),
  ac:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.68}),
  fan:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.65}),
  shutter:new THREE.MeshStandardMaterial({map:shutterTex,color:0xffffff,roughness:.9})
 };
 nightWindows.push(mats.litGlass);
 const geos={frame:frameGeo,glass:new THREE.PlaneGeometry(1.34,1.96),litGlass:new THREE.PlaneGeometry(1.34,1.96),fan:new THREE.CircleGeometry(.5,12)};
 const box=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D(),col=new THREE.Color();
 for(const {type,items} of facadeDetails.values()){
  const inst=new THREE.InstancedMesh(geos[type]||box,mats[type],items.length);
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);inst.setColorAt(i,col.setHex(p.color));});
  inst.receiveShadow=type!=='glass'&&type!=='litGlass';inst.computeBoundingSphere();
  if(type!=='glass'&&type!=='litGlass'){const bounds=new THREE.Box3().setFromObject(inst);nearArchitecture.push({mesh:inst,bounds});}
  scene.add(inst);
 }
}

let _archTimer = 0, _archLastX = -9999, _archLastZ = -9999;
function updateArchitectureDetails(force = false){
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  if (!force && now - _archTimer < 100 && Math.hypot(car.x - _archLastX, car.z - _archLastZ) < 3) return;
  _archTimer = now; _archLastX = car.x; _archLastZ = car.z;
  const maxDist2 = (typeof G !== 'undefined' && G.graphicsQuality === 'perf') ? 140 * 140 : 180 * 180;
  for(const {mesh,bounds} of nearArchitecture){
   const dx=Math.max(bounds.min.x-car.x,0,car.x-bounds.max.x),dz=Math.max(bounds.min.z-car.z,0,car.z-bounds.max.z);
   mesh.visible=dx*dx+dz*dz<maxDist2;
  }
}
