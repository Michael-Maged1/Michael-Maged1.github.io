/* Downloaded, licensed glTF assets. Embedded at build time so the game also works from file://. */
import { GLTFLoader } from 'asset:GLTFLoader';
import { clone as cloneSkeleton } from 'asset:SkeletonUtils';
import { MeshoptDecoder } from 'asset:MeshoptDecoder';
const MODEL_PACKED = /*__MODEL_DATA__*/ {};
const importedModels = { loaded: {}, errors: [], ready: false, completed: 0, total: Object.keys(MODEL_PACKED).length };
const modelLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const assetBadge = document.createElement('div');
assetBadge.style.cssText='position:fixed;top:14px;left:14px;z-index:60;background:#101b25e8;color:#e6edf2;padding:8px 14px;border:1px solid #ffffff28;border-radius:10px;font:12px Tahoma;direction:rtl;pointer-events:none';
assetBadge.textContent='تجهيز السيارات والشخصيات…';
const loadingUI=(()=>{
 const get=id=>document?.getElementById?.(id)||null;
 const screen=get('loadingScreen'),fill=get('loadBarFill'),pct=get('loadPct'),status=get('loadStatus'),tip=get('loadTip'),skip=get('loadSkip'),slides=document?.querySelectorAll?.('.loadSlide')||[];
 const tips=['اتبع الخط الأخضر على الأرض والسهم المضيء للوصول لأقرب راكب أو بلاغ.','استكشف شوارع أسيوط ومبانيها المصرية الأصيلة وكباري النيل والحدائق الخضراء.','يمكنك تبديل دورك بين سائق أوبر ودورية الشرطة وتطوير سيارتك من الجراج.','احرص على نظافة القيادة والتوقف في منطقة التسليم أو الركوب المضيئة.'];
 let slideIdx=0,timer=null,closed=false;
 if(slides.length>1&&typeof setInterval==='function')timer=setInterval(()=>{if(closed)return;slides[slideIdx]?.classList?.remove?.('active');slideIdx=(slideIdx+1)%slides.length;slides[slideIdx]?.classList?.add?.('active');if(tip)tip.textContent=tips[slideIdx%tips.length];},4200);
 function setProgress(ratio,label){const p=Math.max(5,Math.min(100,Math.round(ratio*100)));if(fill?.style)fill.style.width=p+'%';if(pct)pct.textContent=p+'%';if(status&&label)status.textContent=label;assetBadge.textContent=label||`تجهيز المدينة ${p}%`;}
 function finish(){if(closed)return;closed=true;if(timer)clearInterval(timer);if(screen){screen.classList?.add?.('fadeOut');if(typeof setTimeout==='function')setTimeout(()=>screen.remove?.(),750);}if(!importedModels.ready&&!assetBadge.parentNode&&document.body?.appendChild)document.body.appendChild(assetBadge);}
 if(skip)skip.onclick=finish;
 return{setProgress,finish,allowSkip(){skip?.classList?.remove?.('hidden');}};
})();
function modelBuffer(base64) {
 const raw=atob(base64),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes.buffer;
}
function updateSkinBounds(root) {
 root.updateMatrixWorld(true);
 root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
}
function surfaceSetup(root) {
 root.traverse(o=>{
  if(!o.isMesh)return;
  o.frustumCulled=false;
  o.castShadow=true;o.receiveShadow=true;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats) {
   if(m.map&&typeof renderer!=='undefined'&&renderer?.capabilities?.getMaxAnisotropy)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   if(m.metalness!==undefined)m.envMapIntensity=.65;
   const isGlass=/glass|vitre|steclo|windshield|fara|lens|lamp|light|blinker|window/i.test(m.name||'') || /glass|vitre|windshield/i.test(o.name||'');
   m.transmission=0;
   if(m.thickness!==undefined)m.thickness=0;
   if(!isGlass){
    m.transparent=false;
    m.opacity=1.0;
    m.depthWrite=true;
    m.depthTest=true;
    m.alphaTest=0;
    if(m.side!==THREE.DoubleSide)m.side=THREE.FrontSide;
   }else{
    m.transparent=true;
    m.opacity=Math.max(0.35, Math.min(0.7, m.opacity || 0.5));
    m.depthWrite=true;
    m.depthTest=true;
   }
   if(m.name==='Autorickshaw'||/tuk[-_]?tuk/i.test(m.name||'')||/tuk[-_]?tuk/i.test(o.name||'')||/tuktuk/i.test(root.userData?.asset||'')){
    if(!/glass|window/i.test(m.name||'')){
     m.side=THREE.DoubleSide;
     m.transparent=false;
     m.opacity=1.0;
     m.depthWrite=true;
     m.depthTest=true;
     m.alphaTest=0;
    }
   }
  }
 });
}
const EXTRA_TRAFFIC_SPECS={
 traffic_peugeot405:{rotY:Math.PI/2,len:4.41,hw:.88,paint:['1994_405_Body'],wheelR:.30,wheels:['Object_28','Object_31','Object_34','Object_37']},
 traffic_peugeot205:{rotY:Math.PI/2,len:3.71,hw:.80,paint:[],wheelR:.28,wheels:['FLW','FRW','RLW','RRW']},
 traffic_corolla:{rotY:Math.PI/2,len:4.54,hw:.88,paint:['body'],wheelR:.30,wheels:['corolla-wheelFtL_1','corolla-wheelFtR_2','corolla-wheelBkL_3','corolla-wheelBkR_4']},
 traffic_logan:{rotY:-Math.PI/2,len:4.35,hw:.89,paint:['kuzov'],wheelR:.31,wheels:['Object_65','Object_70','Object_75','Object_80']},
 traffic_lada:{rotY:-Math.PI/2,len:4.14,hw:.83,paint:['BaseColorCuzov'],wheelR:.30,wheels:['Object_4','Object_78','Object_84','Object_90']},
 traffic_kombi:{rotY:Math.PI/2,len:4.28,hw:.90,paint:['kombi02blinn2SG1'],wheelR:.33,wheels:['polySurface5','polySurface6','polySurface16','polySurface17']},
 traffic_tucson:{rotY:Math.PI/2,len:4.48,hw:.94,paint:['varnish'],wheelR:.35,wheels:['tucson-15_FL_wheel','tucson-15_FR_wheel','tucson-15_BL_wheel','tucson-15_BR_wheel']},
 traffic_uno:{rotY:Math.PI/2,len:3.69,hw:.79,paint:['Scene_-_Root'],paintMesh:/^(capo|teto|porta|lateral|paralama|para)/i,wheelR:.28,wheels:[['pneus_dianteiros','aros_dianteiro','parafusos_dianteiro'],['pneus_dianteiros001','aros_dianteiro001','parafusos_dianteiro001'],['pneus_traseiros','aro_traseiros','parafusos_traseiros'],['pneus_traseiros001','aro_traseiros001','parafusos_traseiros001']]},
 traffic_hiace:{rotY:0,len:4.69,hw:.95,paint:['paint'],wheelR:.33,wheels:['hiace_wheelsmd','hiace_wheelsmd001','hiace_wheelsmd002','hiace_wheelsmd003']},
 traffic_sprinter:{rotY:Math.PI/2,len:5.6,hw:1.05,paint:['Carrosserie','Carrosserie 5'],wheelR:.36,wheels:[]},
 traffic_hilux:{rotY:Math.PI/2,len:4.85,hw:.95,paint:['hilux 1983'],wheelR:.34,wheels:[]}
};
function extractTrafficWheels(holder,groups,wheelR){
 holder.updateMatrixWorld(true);
 const invHolder=new THREE.Matrix4().copy(holder.matrixWorld).invert();
 const wheels=[];
 for(const entry of groups){
  const names=Array.isArray(entry)?entry:[entry];
  const nodes=names.map(n=>holder.getObjectByName(n)||holder.getObjectByName(n.replace(/\./g,''))).filter(Boolean);
  if(!nodes.length)continue;
  const wb=new THREE.Box3();
  for(const n of nodes)n.traverse(o=>{if(o.isMesh&&!/caliper|cliper|brake/i.test(o.name+' '+(o.material?.name||'')))wb.expandByObject(o);});
  if(wb.isEmpty())for(const n of nodes)wb.expandByObject(n);
  const center=wb.getCenter(new THREE.Vector3()).applyMatrix4(invHolder);
  const steer=new THREE.Group(),spin=new THREE.Group();
  steer.position.copy(center);steer.add(spin);holder.add(steer);
  for(const n of nodes)spin.attach(n);
  wheels.push({steer,spin,radius:wheelR,front:center.x>0});
 }
 holder.userData.wheels=wheels;
 return wheels;
}

const OCCUPANT_SHIRTS = [0xf4f3f0, 0x3d6bd9, 0x2c4159, 0xd94f3d, 0x3f8f6b, 0xb8a88c, 0x5c5549, 0x2f9fb3, 0x1c1e24, 0xe07b39];
const OCCUPANT_SKINS = [0xc58a5e, 0xa86f4a, 0x8a5738, 0xd9a477, 0x6f442c, 0xb87b50];
let _seatedGeos = null;
function getSeatedGeos() {
  if (!_seatedGeos) {
    _seatedGeos = {
      torso: new THREE.CapsuleGeometry(0.18, 0.30, 4, 8),
      head: new THREE.SphereGeometry(0.115, 10, 8),
      hair: new THREE.SphereGeometry(0.118, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      armUpper: new THREE.CylinderGeometry(0.042, 0.036, 0.24, 6),
      armFore: new THREE.CylinderGeometry(0.034, 0.028, 0.22, 6),
      thigh: new THREE.CylinderGeometry(0.060, 0.050, 0.30, 6),
      calf: new THREE.CylinderGeometry(0.048, 0.038, 0.26, 6)
    };
  }
  return _seatedGeos;
}

function makeSeatedOccupant({ isDriver = true, isTuktuk = false, shirt = null, skin = null } = {}) {
  const g = new THREE.Group();
  const geos = getSeatedGeos();
  const shirtColor = shirt || OCCUPANT_SHIRTS[Math.floor(Math.random() * OCCUPANT_SHIRTS.length)];
  const skinColor = skin || OCCUPANT_SKINS[Math.floor(Math.random() * OCCUPANT_SKINS.length)];
  const pantsColor = [0x222a36, 0x3a3a34, 0x182432, 0x4e463a, 0x1f1f22][Math.floor(Math.random() * 5)];
  const hairColor = [0x191410, 0x2c221a, 0x121214, 0x3d3228][Math.floor(Math.random() * 4)];

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.92 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.78 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.94 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 1.0 });

  const torso = new THREE.Mesh(geos.torso, shirtMat);
  torso.position.set(0, 0.44, 0);
  torso.rotation.z = isDriver ? 0.08 : 0.02;
  g.add(torso);

  const headGroup = new THREE.Group();
  headGroup.position.set(isDriver ? 0.02 : 0, 0.74, 0);
  const head = new THREE.Mesh(geos.head, skinMat);
  headGroup.add(head);
  const hair = new THREE.Mesh(geos.hair, hairMat);
  hair.position.y = 0.012;
  headGroup.add(hair);
  g.add(headGroup);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0, 0.54, side * 0.19);
    if (isDriver) {
      arm.rotation.order = 'ZYX';
      arm.rotation.z = isTuktuk ? -0.52 : -0.65;
      arm.rotation.y = side * (isTuktuk ? 0.18 : 0.28);
      const upper = new THREE.Mesh(geos.armUpper, shirtMat);
      upper.position.y = -0.12;
      arm.add(upper);
      const fore = new THREE.Mesh(geos.armFore, skinMat);
      fore.position.set(0.06, -0.28, 0);
      fore.rotation.z = isTuktuk ? -0.28 : -0.40;
      arm.add(fore);
    } else {
      arm.rotation.z = -0.25;
      const upper = new THREE.Mesh(geos.armUpper, shirtMat);
      upper.position.y = -0.12;
      arm.add(upper);
      const fore = new THREE.Mesh(geos.armFore, skinMat);
      fore.position.set(0.02, -0.26, 0);
      arm.add(fore);
    }
    g.add(arm);
  }

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(geos.thigh, pantsMat);
    thigh.rotation.z = Math.PI / 2;
    thigh.position.set(0.15, 0.20, side * 0.095);
    g.add(thigh);
    const calf = new THREE.Mesh(geos.calf, pantsMat);
    calf.position.set(0.30, 0.07, side * 0.095);
    g.add(calf);
  }

  g.userData.isOccupant = true;
  return g;
}

function populateVehicleOccupants(holder, key) {
  if (!holder || holder.userData.hasOccupants) return;
  holder.userData.hasOccupants = true;

  const occupantsGroup = new THREE.Group();
  occupantsGroup.name = 'OccupantsGroup';

  const isMicro = (key === 'micro' || key === 'traffic_hiace' || key === 'traffic_sprinter');
  const isTuktuk = (key === 'traffic_tuktuk' || key === 'tuktuk');
  const isBus = (key === 'traffic_bus3d' || key === 'bus');
  const isPickup = (key === 'traffic_hilux' || /pickup|truck/i.test(key));

  if (isTuktuk) {
    const driver = makeSeatedOccupant({ isDriver: true, isTuktuk: true });
    driver.position.set(0.12, 0.38, 0);
    driver.scale.setScalar(0.92);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    if (Math.random() < 0.78) {
      const p1 = makeSeatedOccupant({ isDriver: false });
      p1.position.set(-0.46, 0.44, 0.22);
      p1.scale.setScalar(0.88);
      occupantsGroup.add(p1);

      if (Math.random() < 0.60) {
        const p2 = makeSeatedOccupant({ isDriver: false });
        p2.position.set(-0.46, 0.44, -0.22);
        p2.scale.setScalar(0.86);
        occupantsGroup.add(p2);
      }
    }
  } else if (isMicro) {
    const driver = makeSeatedOccupant({ isDriver: true });
    driver.position.set(0.78, 0.52, -0.48);
    driver.scale.setScalar(0.94);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    if (Math.random() < 0.72) {
      const frontP = makeSeatedOccupant({ isDriver: false });
      frontP.position.set(0.78, 0.52, 0.48);
      frontP.scale.setScalar(0.92);
      occupantsGroup.add(frontP);
    }

    const rows = [
      { x: 0.12, y: 0.52, zList: [-0.42, 0.42] },
      { x: -0.62, y: 0.52, zList: [-0.42, 0.42] }
    ];
    for (const row of rows) {
      for (const z of row.zList) {
        if (Math.random() < 0.65) {
          const pass = makeSeatedOccupant({ isDriver: false });
          pass.position.set(row.x, row.y, z);
          pass.scale.setScalar(0.90);
          occupantsGroup.add(pass);
        }
      }
    }
  } else if (isBus) {
    const driver = makeSeatedOccupant({ isDriver: true });
    driver.position.set(2.82, 0.96, -0.62);
    driver.scale.setScalar(0.96);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    for (const x of [1.6, 0.6, -0.4, -1.4, -2.4]) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.45) {
          const bp = makeSeatedOccupant({ isDriver: false });
          bp.position.set(x, 0.98, side * 0.72);
          bp.scale.setScalar(0.90);
          occupantsGroup.add(bp);
        }
      }
    }
  } else {
    // Sedans, Hatchbacks, SUVs, Pickups
    const driver = makeSeatedOccupant({ isDriver: true });
    driver.position.set(0.02, 0.34, -0.37);
    driver.scale.setScalar(0.94);
    occupantsGroup.add(driver);
    holder.userData.driverOccupant = driver;

    const frontP = makeSeatedOccupant({ isDriver: false });
    frontP.position.set(0.02, 0.34, 0.37);
    frontP.scale.setScalar(0.92);
    frontP.visible = (Math.random() < 0.45);
    occupantsGroup.add(frontP);
    holder.userData.passengerOccupant = frontP;

    if (!isPickup && Math.random() < 0.28) {
      const rearSide = Math.random() < 0.5 ? 1 : -1;
      const rearP = makeSeatedOccupant({ isDriver: false });
      rearP.position.set(-0.76, 0.36, rearSide * 0.35);
      rearP.scale.setScalar(0.90);
      occupantsGroup.add(rearP);
    }
  }

  holder.add(occupantsGroup);
  holder.userData.occupants = occupantsGroup;
}
function vehicleVisual(key, color, taxiPaint=false) {
 if(UPLOADED_MODELS[key.replace(/_traffic$/,'')]){const h=uploadedCarVisual(key,color);if(h){const c=CARS.find(x=>x.asset===key.replace(/_traffic$/,''));extractTrafficWheels(h,['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR'],c?.id==='micra'?.29:c?.id==='xtrail'?.37:.33);}return h;}
 const asset=importedModels.loaded[key];if(!asset)return null;
 const spec=EXTRA_TRAFFIC_SPECS[key];
 const model=(typeof cloneSkeleton==='function'?cloneSkeleton(asset.scene):asset.scene.clone(true)), holder=new THREE.Group();holder.add(model);
 model.traverse(o=>{if(o.isMesh&&/collision|shadowcaster|_shadow/i.test(o.name))o.visible=false;});
 model.rotation.y=spec?spec.rotY:(key==='qashqai'?(CARS.find(c=>c.id==='qashqai')?.orientation??Math.PI/2):key==='sunny'?0:key==='sentra'?Math.PI:key==='lada'||key==='logan'||key==='bmw'?-Math.PI/2:Math.PI/2);
 model.updateMatrixWorld(true);
 const box=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const size=box.getSize(new THREE.Vector3());
 const targetLen=spec?spec.len:(key==='sunny'?4.425:key==='qashqai'?4.44:key==='micro'?4.8:key==='tucson'?4.475:4.2);
 const scale=targetLen/Math.max(.1,size.x);model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
 box.makeEmpty();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const center=box.getCenter(new THREE.Vector3());
 model.position.set(-center.x,-box.min.y,-center.z);
 if(key==='micro')holder.scale.z=1.94/(box.max.z-box.min.z);
 const materialCache=new Map();
 model.traverse(o=>{
  if(!o.isMesh)return;
  o.frustumCulled=false;
  if(!o.visible||/collision|shadowcaster|_shadow/i.test(o.name)){o.visible=false;return;}
  o.castShadow=true;o.receiveShadow=true;
  const original=o.material;
  const name=original.name||'';
  const paint=spec?(spec.paint.includes(name)&&(!spec.paintMesh||spec.paintMesh.test((o.parent?.name||'')+' '+o.name))):(key==='qashqai'?/body|carpaint|exterior.*paint/i.test(name):key==='tucson'?name==='varnish':key==='bmw'?name==='material_0':key==='linea'?name==='Color_002':key==='sunny'?name==='N17_Pearl_Silver':key==='corolla'?name==='body':key==='logan'?name==='kuzov':key==='peugeot'?name==='1994_405_Body':key==='lada'?name==='BaseColorCuzov':key==='sentra'?name==='wire_143224087_2':key==='micro'?name==='varnish':key==='sport'?name==='RRViper_turbo_painted2'||name==='pickup':/^(hood|roof|tail|trunk|front_doo|rear_doo|right_doo|front_bum|rear_bump)/.test(name));
  // Keep Lada's black doors and roof; paint the bonnet and boot yellow.
  const blackPanel=taxiPaint&&key==='lada'&&!/kapot|bag|bagazh|boot|trunk/i.test(o.name);
  const cacheKey=original.uuid+':'+(paint?blackPanel?'black':'paint':'base');
  if(!materialCache.has(cacheKey)) {
   const mat=original.clone();
   if(key==='sunny'&&name==='N17_Pearl_Silver')mat.side=THREE.DoubleSide;
   if(key==='sunny'&&/Headlight/.test(name)){mat.side=THREE.DoubleSide;mat.emissive=new THREE.Color(0x99a8ae);mat.emissiveIntensity=.13;}
   if(paint){if(color!==undefined&&color!==null)mat.color.setHex(blackPanel?0x11151a:color);mat.metalness=Math.max(.32,mat.metalness||0);mat.roughness=.20;mat.envMapIntensity=1.35;}
   if(/steclo|glass|wind|seal/.test(name)){mat.opacity=Math.max(.46,mat.opacity);mat.roughness=.05;mat.metalness=.15;mat.envMapIntensity=1.5;mat.depthWrite=true;}
   if(/hrom|alloy|metal|silver|rim/.test(name)){mat.metalness=.92;mat.roughness=.18;mat.envMapIntensity=1.45;}
   materialCache.set(cacheKey,mat);
  }
  o.material=materialCache.get(cacheKey);
 });
 surfaceSetup(model);holder.userData.asset=key;
 if(spec)extractTrafficWheels(holder,spec.wheels,spec.wheelR);
 else if(key==='micro')extractTrafficWheels(holder,['ducato-14_FL_wheel','ducato-14_FR_wheel','ducato-14_BL_wheel','ducato-14_BR_wheel'],.35);
 populateVehicleOccupants(holder, key);
 return holder;
}
function streetLifeVisual(key){
 const asset=importedModels.loaded[key];if(!asset)return null;
 const target={traffic_tuktuk:2.65,traffic_moped:2.05,traffic_bicycle:1.95,traffic_bus3d:8.8}[key]||3.5;
 const holder=new THREE.Group(),model=(typeof cloneSkeleton==='function'?cloneSkeleton(asset.scene):asset.scene.clone(true));holder.add(model);
 const toRemove=[];model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;if(/collision|shadowcaster|_shadow/i.test(o.name))toRemove.push(o);}});
 toRemove.forEach(o=>o.parent?.remove(o));
 model.updateMatrixWorld(true);
 let box=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const rotY=(key==='traffic_bus3d'||key==='traffic_tuktuk')?-Math.PI/2:Math.PI/2;
 model.rotation.y=rotY;model.updateMatrixWorld(true);
 box.makeEmpty();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});if(box.isEmpty())box.setFromObject(model);
 const size=box.getSize(new THREE.Vector3()),horizontal=Math.max(size.x,size.z);
 if(horizontal<.01)return null;
 model.scale.multiplyScalar(target/horizontal);model.updateMatrixWorld(true);
 box.makeEmpty();model.traverse(o=>{if(o.isMesh&&o.visible)box.expandByObject(o);});
 model.position.set(-box.getCenter(new THREE.Vector3()).x,-box.min.y,-box.getCenter(new THREE.Vector3()).z);
 surfaceSetup(model);holder.userData.asset=key;
 if(key==='traffic_tuktuk'||key==='traffic_bus3d')populateVehicleOccupants(holder, key);
 return holder;
}
function applyImportedTaxi(rig,c,paintHex) {
 const key=c.asset||({sedan:'lada',modern:'hyundai',micro:'micro',sport:'sport'})[c.body];
 if(!key)return rig;
 const visual=vehicleVisual(key,paintHex??c.color1,c.body==='sedan');if(!visual)return rig;
 rig.body.clear();rig.body.add(visual);
 for(const w of rig.wheels)rig.group.remove(w);
 rig.wheels=[];rig.passengerSeat=null;
 visual.updateMatrixWorld(true);
 // Reparent the Lada wheel assemblies to pivots aligned with the game's axle convention.
 if(key==='lada') {
  rig.group.updateMatrixWorld(true);
  const nodes=[];visual.traverse(o=>{if(/^Wheel_[LP]_[PZ]$/.test(o.name))nodes.push(o);});
  nodes.sort((a,b)=>new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3()).x-new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3()).x);
  for(const node of nodes){const pivot=new THREE.Group();pivot.position.copy(new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()));rig.group.add(pivot);pivot.attach(node);rig.wheels.push(pivot);}
 }

 rig.group.userData.asset=key;return rig;
}
const axisX=new THREE.Vector3(1,0,0),axisZ=new THREE.Vector3(0,0,1);
function rotateBoneWorld(bone,axis,angle) {
 if(!bone)return;
 const local=axis.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert());
 bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(local,angle));bone.updateWorldMatrix(false,true);
}
function personVisual(key) {
 const source=importedModels.loaded[key];if(!source)return null;
 const model=cloneSkeleton(source.scene);surfaceSetup(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 model.updateMatrixWorld(true);
 // Rest pose comes from a full Mixamo skeleton. Relax the T-pose before caching a walk cycle.
 rotateBoneWorld(model.getObjectByName('mixamorigLeftArm'),axisZ,-1.38);
 rotateBoneWorld(model.getObjectByName('mixamorigRightArm'),axisZ,1.38);
 updateSkinBounds(model);
 const b=new THREE.Box3().setFromObject(model),h=b.max.y-b.min.y;
 const wrapper=new THREE.Group();wrapper.add(model);wrapper.scale.setScalar((key==='man'?1.78:1.67)/h);
 model.position.y-=b.min.y;
 model.updateMatrixWorld(true);
 const joints=[];
 for(const [name,amplitude,phase,knee] of [
  ['LeftUpLeg',.42,0,false],['RightUpLeg',.42,Math.PI,false],
  ['LeftLeg',.68,0,true],['RightLeg',.68,Math.PI,true],
  ['LeftArm',-.32,0,false],['RightArm',-.32,Math.PI,false],
  ['LeftForeArm',-.15,0,false],['RightForeArm',-.15,Math.PI,false]
 ]) {
  const bone=model.getObjectByName('mixamorig'+name);if(!bone)continue;
  joints.push({bone,rest:bone.quaternion.clone(),axis:axisX.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()),amplitude,phase,knee});
 }
 wrapper.userData={asset:key,joints,model};return wrapper;
}
function attachImportedPerson(person,key) {
 if(person.userData.imported||!importedModels.loaded[key])return;
 const detailed=personVisual(key);if(!detailed)return;
 if(person.isLOD){for(const l of person.levels)l.distance=l.distance===0?65:160;person.addLevel(detailed,0);}
 else {for(const child of person.children)child.visible=false;person.add(detailed);}
 person.userData.imported=detailed;
}
const _pedAnimQ = new THREE.Quaternion();
function animateImportedPerson(person,phase,strength=1) {
 const detail=person.userData.imported;if(!detail)return false;
 for(const j of detail.userData.joints){const wave=Math.sin(phase+j.phase);const a=(j.knee?Math.max(0,-wave):wave)*j.amplitude*strength;j.bone.quaternion.copy(j.rest).multiply(_pedAnimQ.setFromAxisAngle(j.axis,a));}
 return true;
}
function localAxisForBone(bone,worldAxis){
 return worldAxis.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
}
function poseCycleRider(rider,bicycle){
 const model=rider.userData.model;rider.updateMatrixWorld(true);
 const bindBone=name=>{const bone=model.getObjectByName('mixamorig'+name);return bone?{bone,rest:bone.quaternion.clone(),ax:localAxisForBone(bone,axisX),az:localAxisForBone(bone,axisZ)}:null;};
 const spine=bindBone('Spine'),spine1=bindBone('Spine1'),head=bindBone('Head');
 const lArm=bindBone('LeftArm'),lFore=bindBone('LeftForeArm'),rArm=bindBone('RightArm'),rFore=bindBone('RightForeArm');
 const lUp=bindBone('LeftUpLeg'),lLeg=bindBone('LeftLeg'),lFoot=bindBone('LeftFoot');
 const rUp=bindBone('RightUpLeg'),rLeg=bindBone('RightLeg'),rFoot=bindBone('RightFoot');
 const rot=(b,axis,a)=>{if(b)b.bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,a));};
 // Pose torso and arms in rider's own neutral (+Z forward) space before attaching to vehicle.
 rot(spine,spine?.ax,bicycle?.20:.14);
 rot(spine1,spine1?.ax,bicycle?.26:.18);
 rot(head,head?.ax,bicycle?-.22:-.16);
 rot(lArm,lArm?.ax,bicycle?-1.18:-1.05);rot(lArm,lArm?.az,-.10);rot(lFore,lFore?.ax,-.28);
 rot(rArm,rArm?.ax,bicycle?-1.18:-1.05);rot(rArm,rArm?.az,.10);rot(rFore,rFore?.ax,-.28);
 rider.scale.multiplyScalar(.92);
 rider.rotation.y=Math.PI/2;
 rider.position.set(bicycle?-.18:-.16,bicycle?.09:.04,0);
 const legs=[
  {up:lUp,leg:lLeg,foot:lFoot,phase:0},
  {up:rUp,leg:rLeg,foot:rFoot,phase:Math.PI}
 ];
 rider.userData.cycleRig={bicycle,L1:.295,L2:.295,hx:rider.position.x,hy:(bicycle?.754*.92+.09:.754*.92+.04),legs};
 updateSkinBounds(model);
 animateCycleRider(rider,0);
}
function animateCycleRider(rider,pedalPhase){
 const rig=rider?.userData?.cycleRig;if(!rig)return;
 const {bicycle,L1,L2,hx,hy,legs}=rig,cx=bicycle?.03:.08,cy=bicycle?.33:.28,cr=bicycle?.135:.025;
 const q=new THREE.Quaternion();
 for(const side of legs){
  const ph=pedalPhase+side.phase,px=cx+Math.cos(ph)*cr,py=cy+Math.sin(ph)*cr;
  const dx=px-hx,dy=py-hy,d=clamp(Math.hypot(dx,dy),.16,L1+L2-.02);
  const gamma=Math.atan2(dx,-dy),delta=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1));
  const interior=Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1));
  const thighA=-(gamma+delta),kneeA=Math.PI-interior,footA=-(thighA+kneeA)*.7;
  if(side.up)side.up.bone.quaternion.copy(side.up.rest).multiply(q.setFromAxisAngle(side.up.ax,thighA));
  if(side.leg)side.leg.bone.quaternion.copy(side.leg.rest).multiply(q.setFromAxisAngle(side.leg.ax,kneeA));
  if(side.foot)side.foot.bone.quaternion.copy(side.foot.rest).multiply(q.setFromAxisAngle(side.foot.ax,footA));
 }
}
function _upgradeTrafficItem(t,key){
 if(!['car','modern','micro','tuktuk','bus','motorcycle','bicycle'].includes(t.kind))return;
 const currentImport=t.mesh.userData.imported;
 if(currentImport&&!currentImport.endsWith('_traffic'))return;
 let choice=t.mesh.userData.modelKey||(t.kind==='modern'?'qashqai':t.kind==='micro'?'micro':'micra');
 const baseKey=choice.replace(/_traffic$/,'');
 if(UPLOADED_MODELS[baseKey]){
  if(importedModels.loaded[baseKey])choice=baseKey;
  else if(importedModels.loaded[baseKey+'_traffic']&&!currentImport)choice=baseKey+'_traffic';
  else return;
 }else if(!importedModels.loaded[choice]||currentImport)return;
 const detailed=/^traffic_(?:tuktuk|moped|bicycle|bus3d)$/.test(choice)?streetLifeVisual(choice):vehicleVisual(choice,t.mesh.userData.paint||0x899da7,false);
 if(!detailed)return;
 if((t.kind==='bicycle'||t.kind==='motorcycle')&&t.mesh.userData.rider&&typeof cloneSkeleton==='function'){
  const rider=cloneSkeleton(t.mesh.userData.rider);rider.visible=true;detailed.add(rider);
 }
 t.mesh.clear();
 t.mesh.add(detailed);
 t.mesh.userData.imported=choice;
 if(detailed.userData.wheels?.length)t.mesh.userData.wheels=detailed.userData.wheels;
 const def=CARS.find(c=>c.asset===choice.replace(/_traffic$/,'')),spec=EXTRA_TRAFFIC_SPECS[choice];
 if(def?.uploaded){t.hl=def.length/2;t.hw=def.halfWidth;}
 else if(spec){t.hl=spec.len/2;t.hw=spec.hw;}
 else if(choice==='micro'){t.hl=2.4;t.hw=.97;}
 t.mesh.userData.brakeMaterials=[];detailed.traverse(o=>{if(o.isMesh&&/brakelight|stoplamp|rearlight|red_lens|stopari/i.test(o.material?.name||''))t.mesh.userData.brakeMaterials.push(o.material);});
}
const _upgradeTasks=[];let _upgradeScheduled=false;
function _flushUpgradeQueue(){
 _upgradeScheduled=false;
 const batch=_upgradeTasks.splice(0,3);
 for(const fn of batch)try{fn();}catch(_){}
 if(_upgradeTasks.length&&typeof requestAnimationFrame==='function'){
  _upgradeScheduled=true;
  requestAnimationFrame(_flushUpgradeQueue);
 }
}
function _enqueueUpgrade(fn){
 _upgradeTasks.push(fn);
 if(!_upgradeScheduled&&typeof requestAnimationFrame==='function'){
  _upgradeScheduled=true;
  requestAnimationFrame(_flushUpgradeQueue);
 }
}
function upgradeLoadedModels(key) {
 const isTest=(typeof navigator!=='undefined'&&navigator.userAgent==='test')||typeof requestAnimationFrame!=='function';
 if(!['man','woman'].includes(key)) {
  if(CARS[G.carIdx]?.asset===key)swapTaxi(G.carIdx);
  for(const t of traffic) {
   if(isTest)_upgradeTrafficItem(t,key);
   else _enqueueUpgrade(()=>_upgradeTrafficItem(t,key));
  }
 }
 if(key==='man'||key==='woman') {
  if(isTest){
   peds.forEach((p,i)=>attachImportedPerson(p.mesh,i%3===0?'woman':'man'));
   attachImportedPerson(passenger,'man');
   if(key==='man')for(const t of traffic){if(!t.mesh.userData.twoWheeler||t.mesh.userData.riderDetail)continue;const rider=personVisual('man');if(!rider)continue;t.mesh.userData.rider.visible=false;poseCycleRider(rider,t.kind==='bicycle');t.mesh.add(rider);t.mesh.userData.riderDetail=rider;}
  }else{
   _enqueueUpgrade(()=>attachImportedPerson(passenger,'man'));
   peds.forEach((p,i)=>_enqueueUpgrade(()=>attachImportedPerson(p.mesh,i%3===0?'woman':'man')));
   if(key==='man')for(const t of traffic){if(!t.mesh.userData.twoWheeler||t.mesh.userData.riderDetail)continue;_enqueueUpgrade(()=>{if(t.mesh.userData.riderDetail)return;const rider=personVisual('man');if(!rider)return;t.mesh.userData.rider.visible=false;poseCycleRider(rider,t.kind==='bicycle');t.mesh.add(rider);t.mesh.userData.riderDetail=rider;});}
  }
 }
}

const MODEL_ARABIC_NAMES = {
  qashqai: 'نيسان قشقاي الأساسية',
  qashqai_traffic: 'أسطول نيسان قشقاي',
  policeSuburban: 'دورية سوبربان شريف',
  policeSuburban_traffic: 'دورية سوبربان المرور',
  policeDuster: 'دورية رينو داستر',
  policeDuster_traffic: 'دورية رينو داستر المرور',
  policeBMW: 'دورية بي إم دبليو 320i',
  policeBMW_traffic: 'دورية بي إم دبليو المرور',
  traffic_bus3d: 'أتوبيس النقل العام',
  traffic_hiace: 'ميكروباص تويوتا هايس',
  traffic_sprinter: 'ميكروباص مرسيدس سبرينتر',
  traffic_hilux: 'سيارة نصف نقل الدبابة',
  traffic_tuktuk: 'التوك توك باجاج',
  traffic_moped: 'دراجة نارية',
  traffic_bicycle: 'دراجة هوائية',
  traffic_peugeot405: 'بيجو 405 صالون',
  traffic_corolla: 'تويوتا كورولا',
  traffic_logan: 'رينو لوجان',
  traffic_lada: 'لادا 2107',
  traffic_tucson: 'هيونداي توسان',
  man: 'أهالي ومشاة أسيوط (رجال)',
  woman: 'أهالي ومشاة أسيوط (سيدات)',
  landmarkMosque: 'معالم ومساجد أسيوط',
  sentra18: 'نيسان سنترا',
  sentra18_traffic: 'أسطول نيسان سنترا',
  altima: 'نيسان ألتيما',
  altima_traffic: 'أسطول نيسان ألتيما',
  xtrail: 'نيسان إكس-تريل',
  xtrail_traffic: 'أسطول نيسان إكس-تريل',
  epower: 'نيسان سنترا إي-باور',
  epower_traffic: 'أسطول سنترا إي-باور',
  versa: 'نيسان فيرسا',
  versa_traffic: 'أسطول نيسان فيرسا',
  fiat1300: 'فيات 1300 الكلاسيكية',
  fiat1300_traffic: 'أسطول فيات 1300',
  micra: 'نيسان ميكرا',
  micra_traffic: 'أسطول نيسان ميكرا',
  roadster: 'نيسان 370Z رودستر',
  roadster_traffic: 'أسطول نيسان رودستر',
  sport370: 'نيسان 370Z سبورت',
  sport370_traffic: 'أسطول نيسان سبورت'
};

const modelJobs=new Map();
async function ensureVehicleModel(key){
 if(importedModels.loaded[key])return importedModels.loaded[key];if(modelJobs.has(key))return modelJobs.get(key);
 const data=MODEL_PACKED[key];if(!data)throw Error('ملف السيارة غير موجود: '+key);
 const job=(async()=>{try{const gltf=await(data.startsWith('assets/')?modelLoader.loadAsync(data):modelLoader.parseAsync(modelBuffer(data),''));importedModels.loaded[key]=gltf;upgradeLoadedModels(key);if(key==='landmarkMosque'&&typeof addExternalAssyutLandmark==='function')addExternalAssyutLandmark();return gltf;}catch(e){importedModels.errors.push(key+': '+e.message);throw e;}finally{importedModels.completed++;}})();modelJobs.set(key,job);return job;
}
async function initImportedModels(){
 const selected=CARS[G.carIdx]?.asset||'qashqai';
 const roleTiles=[...document.querySelectorAll('.roleTile, [data-mode]')];
 for(const tile of roleTiles){tile.classList.add('loading');}
 const started=Date.now();
 loadingUI.setProgress(.04,'جاري فحص وتجهيز ملفات اللعبة…');

 const allKeys=Object.keys(MODEL_PACKED);
 const queue=[];
 const priority=[
  selected,
  'traffic_bus3d', 'traffic_hiace', 'traffic_sprinter', 'traffic_hilux', 'traffic_tuktuk',
  'traffic_kombi', 'traffic_uno', 'traffic_peugeot405', 'traffic_peugeot205', 'traffic_corolla', 'traffic_logan', 'traffic_lada', 'traffic_tucson',
  'traffic_moped', 'traffic_bicycle',
  'man', 'woman', 'micro'
 ];
 for(const k of priority){if(MODEL_PACKED[k]&&!importedModels.loaded[k]&&!queue.includes(k))queue.push(k);}
 for(const k of allKeys){if(k.endsWith('_traffic')&&!k.startsWith('police')&&!importedModels.loaded[k]&&!queue.includes(k))queue.push(k);}

 const total=queue.length;
 let completed=0;
 const updateLoadBar=async(key)=>{
  completed++;
  const ratio=Math.min(0.92,(completed/Math.max(1,total))*0.92);
  const name=MODEL_ARABIC_NAMES[key]||key;
  loadingUI.setProgress(ratio,`جاري تحميل ${name} (${completed} من ${total})…`);
  if(typeof requestAnimationFrame==='function')await new Promise(r=>requestAnimationFrame(r));
  else if(typeof setTimeout==='function')await new Promise(r=>setTimeout(r,0));
 };

 let next=0;
 const worker=async()=>{
  while(next<queue.length){
   const key=queue[next++];
   try{await ensureVehicleModel(key);}
   catch(e){console.warn('Model preloading warning:',key,e.message);}
   finally{
    await updateLoadBar(key);
    if(typeof G!=='undefined'&&G.state==='play'){
     await new Promise(r=>setTimeout(r,260));
    }else{
     await new Promise(r=>setTimeout(r,24));
    }
   }
  }
 };
 await worker();

 loadingUI.setProgress(0.96,'تهيئة معالج الرسوميات وتثبيت الإطارات…');
 if(typeof requestAnimationFrame==='function')await new Promise(r=>requestAnimationFrame(r));

 importedModels.ready=true;
 loadingUI.setProgress(1.0,'اكتمل تحميل كافة ملفات اللعبة بنجاح! جاهز للعب السلس 100%');
 for(const tile of roleTiles){tile.classList.remove('loading');}

 const skipBtn=document.getElementById('loadSkip');
 if(skipBtn){
  skipBtn.textContent='انطلق للعب السلس ◀';
  skipBtn.classList.remove('hidden');
  skipBtn.classList.add('readyCTA');
  skipBtn.onclick=()=>loadingUI.finish();
 }
 const elapsed=Date.now()-started,wait=Math.max(0,1200-elapsed);
 if(typeof setTimeout==='function'){
  setTimeout(()=>{loadingUI.finish();setTimeout(()=>assetBadge?.remove?.(),3000);},wait);
 }else{loadingUI.finish();}
}
