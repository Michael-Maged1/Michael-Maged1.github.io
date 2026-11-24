/* Real user-supplied car assets, with separately animated wheel assemblies. */
function extractSteeringWheelFromNeishi(o, spec) {
  const geo = o.geometry;
  const pos = geo?.attributes?.position;
  const normal = geo?.attributes?.normal;
  const uv = geo?.attributes?.uv;
  const idx = geo?.index;
  if (!pos || !idx) return null;
  const triCount = idx.count / 3;

  const v2t = new Map();
  for (let t = 0; t < triCount; t++) {
    for (let j = 0; j < 3; j++) {
      const vi = idx.getX(t * 3 + j);
      if (!v2t.has(vi)) v2t.set(vi, []);
      v2t.get(vi).push(t);
    }
  }

  const visitedTri = new Uint8Array(triCount);
  const isWheelTri = new Uint8Array(triCount);
  const wheelCenter = new THREE.Vector3(0.38, 0.985, -0.371);

  for (let t = 0; t < triCount; t++) {
    if (visitedTri[t]) continue;
    const compTris = [];
    const queue = [t];
    visitedTri[t] = 1;

    while (queue.length > 0) {
      const curT = queue.pop();
      compTris.push(curT);

      for (let j = 0; j < 3; j++) {
        const vi = idx.getX(curT * 3 + j);
        const adj = v2t.get(vi) || [];
        for (const nxt of adj) {
          if (!visitedTri[nxt]) {
            visitedTri[nxt] = 1;
            queue.push(nxt);
          }
        }
      }
    }

    const box = new THREE.Box3();
    for (const curT of compTris) {
      for (let j = 0; j < 3; j++) {
        const vi = idx.getX(curT * 3 + j);
        const v = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi)).applyMatrix4(o.matrixWorld);
        box.expandByPoint(v);
      }
    }
    const center = new THREE.Vector3();
    box.getCenter(center);

    if (center.distanceTo(wheelCenter) < 0.22 && box.max.x < 0.52 && Math.abs(center.z - (-0.371)) < 0.18) {
      for (const curT of compTris) isWheelTri[curT] = 1;
    }
  }

  let wheelTriCount = 0, dashTriCount = 0;
  for (let t = 0; t < triCount; t++) {
    if (isWheelTri[t]) wheelTriCount++;
    else dashTriCount++;
  }
  if (wheelTriCount === 0) return null;

  const newDashIndices = new Uint16Array(dashTriCount * 3);
  let dPtr = 0;
  for (let t = 0; t < triCount; t++) {
    if (!isWheelTri[t]) {
      newDashIndices[dPtr++] = idx.getX(t * 3);
      newDashIndices[dPtr++] = idx.getX(t * 3 + 1);
      newDashIndices[dPtr++] = idx.getX(t * 3 + 2);
    }
  }
  geo.setIndex(new THREE.BufferAttribute(newDashIndices, 1));

  const wheelPositions = [];
  const wheelNormals = [];
  const wheelUVs = [];
  const wheelIndices = [];
  const oldVToNewV = new Map();

  for (let t = 0; t < triCount; t++) {
    if (isWheelTri[t]) {
      for (let j = 0; j < 3; j++) {
        const oldVIdx = idx.getX(t * 3 + j);
        if (!oldVToNewV.has(oldVIdx)) {
          const newVIdx = oldVToNewV.size;
          oldVToNewV.set(oldVIdx, newVIdx);

          const v = new THREE.Vector3(pos.getX(oldVIdx), pos.getY(oldVIdx), pos.getZ(oldVIdx)).applyMatrix4(o.matrixWorld);
          const n = new THREE.Vector3(normal.getX(oldVIdx), normal.getY(oldVIdx), normal.getZ(oldVIdx)).transformDirection(o.matrixWorld);

          wheelPositions.push(v.x, v.y, v.z);
          wheelNormals.push(n.x, n.y, n.z);
          if (uv) wheelUVs.push(uv.getX(oldVIdx), uv.getY(oldVIdx));
        }
        wheelIndices.push(oldVToNewV.get(oldVIdx));
      }
    }
  }

  const wheelGeo = new THREE.BufferGeometry();
  wheelGeo.setAttribute('position', new THREE.Float32BufferAttribute(wheelPositions, 3));
  wheelGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wheelNormals, 3));
  if (uv) wheelGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wheelUVs, 2));
  wheelGeo.setIndex(wheelIndices);

  wheelGeo.computeBoundingBox();
  const wc = new THREE.Vector3();
  wheelGeo.boundingBox.getCenter(wc);
  wheelGeo.center();
  wheelGeo.rotateZ(0.506);

  return { wheelGeo, center: wc };
}

function uploadedCarVisual(key,color){
 const base=key.replace(/_traffic$/,''),spec=UPLOADED_MODELS[base],asset=importedModels.loaded[base]||importedModels.loaded[key];if(!spec||!asset)return null;
 const holder=new THREE.Group(),model=(typeof cloneSkeleton==='function'?cloneSkeleton(asset.scene):asset.scene.clone(true));holder.add(model);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);model.position.y-=bounds.min.y;const materials=new Map();
 const eye = spec.eye || [-0.1, 1.28, -0.37];
 let extractedWheel = null, neishiMat = null;
 model.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;
  if(key.endsWith('_traffic')&&o.geometry&&!o.geometry.attributes.normal)o.geometry.computeVertexNormals();
  if(!key.endsWith('_traffic')&&o.geometry?.attributes?.position&&(o.material?.name==='neishi_mat'||(Array.isArray(o.material)&&o.material.some(m=>m?.name==='neishi_mat')))){
   extractedWheel = extractSteeringWheelFromNeishi(o, spec);
   neishiMat = Array.isArray(o.material) ? o.material.find(m => m?.name === 'neishi_mat') : o.material;
  }
  const convert=original=>{if(materials.has(original.uuid))return materials.get(original.uuid);const isPaint=spec.paint&&spec.paint.some(name=>original.name===name),isGlass=/glass|vitre|steclo|windshield|fara|lens|lamp|light|blinker|window/i.test(original.name||''),isChrome=/chrome|alloy|metal|silver|mirror|exhaust|nickel|rim|wheel|logo|emblem/i.test(original.name||'');let mat;if(isPaint){mat=new THREE.MeshPhysicalMaterial({color:(color!==undefined&&color!==null)?new THREE.Color(color):(original.color?original.color.clone():new THREE.Color(0xffffff)),map:original.map||null,normalMap:original.normalMap||null,metalness:.35,roughness:.18,clearcoat:1,clearcoatRoughness:.08,reflectivity:.95,envMapIntensity:1.35});}else if(isGlass){mat=new THREE.MeshPhysicalMaterial({color:original.color?original.color.clone():new THREE.Color(0x283842),map:original.map||null,metalness:.15,roughness:.05,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:Math.max(0.38,Math.min(0.68,original.opacity||0.52)),reflectivity:.98,envMapIntensity:1.6,depthWrite:true,depthTest:true});}else{mat=original.clone();if(isChrome){mat.metalness=Math.max(.88,mat.metalness||0);mat.roughness=Math.min(.18,mat.roughness??.3);mat.envMapIntensity=1.45;}else{mat.envMapIntensity=.95;}}mat.transmission=0;if(mat.thickness!==undefined)mat.thickness=0;mat.name=original.name;if(!isGlass){mat.transparent=false;mat.opacity=1.0;mat.depthWrite=true;mat.depthTest=true;mat.alphaTest=0;if(original.side!==THREE.DoubleSide)mat.side=THREE.FrontSide;}materials.set(original.uuid,mat);return mat;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});
 surfaceSetup(model);holder.userData.asset=base;
 holder.userData.extractedWheel = extractedWheel;
 holder.userData.neishiMat = neishiMat;
 if(typeof populateVehicleOccupants==='function')populateVehicleOccupants(holder, base);
 return holder;
}
function createInteractiveCockpit(c, parentBody, visual){
 if (typeof THREE === 'undefined') return null;
 const eye = c?.eye || [-0.1, 1.28, -0.37];
 const root = new THREE.Group();
 root.name = 'CockpitGroup';

 const ext = visual?.userData?.extractedWheel;
 const wheelCenter = ext?.center || new THREE.Vector3(eye[0] + 0.40, eye[1] - 0.284, eye[2]);
 const steerRoot = new THREE.Group();
 steerRoot.position.copy(wheelCenter);
 steerRoot.rotation.z = -0.506;
 root.add(steerRoot);

 const wheelPivot = new THREE.Group();
 steerRoot.add(wheelPivot);

 if (ext?.wheelGeo && visual?.userData?.neishiMat) {
  const wheelMesh = new THREE.Mesh(ext.wheelGeo, visual.userData.neishiMat);
  wheelMesh.castShadow = true;
  wheelMesh.receiveShadow = true;
  wheelPivot.add(wheelMesh);
 } else {
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x181b1f, roughness: 0.65, metalness: 0.12 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.6, metalness: 0.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdde4ec, roughness: 0.15, metalness: 0.95 });
  const rimGeo = new THREE.TorusGeometry(0.172, 0.016, 16, 44);
  rimGeo.rotateY(Math.PI / 2);
  wheelPivot.add(new THREE.Mesh(rimGeo, leatherMat));
  const hubGeo = new THREE.CylinderGeometry(0.048, 0.044, 0.026, 24);
  hubGeo.rotateZ(Math.PI / 2);
  wheelPivot.add(new THREE.Mesh(hubGeo, spokeMat));
  const ringGeo = new THREE.TorusGeometry(0.046, 0.003, 8, 24);
  ringGeo.rotateY(Math.PI / 2);
  ringGeo.translate(-0.013, 0, 0);
  wheelPivot.add(new THREE.Mesh(ringGeo, chromeMat));
 }

 const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a584, roughness: 0.70, metalness: 0.05 });
 const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1d2530, roughness: 0.85 });

 // 1. Left Hand & Arm
 const handL = new THREE.Group();
 handL.position.set(0.008, 0.015, -0.172);
 const palmL = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.050), skinMat);
 palmL.position.set(-0.004, 0, 0);
 handL.add(palmL);
 for (let i = 0; i < 4; i++) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0048, 0.034, 8), skinMat);
  f.position.set(0.016, (i - 1.5) * 0.009, 0.010);
  f.rotation.z = Math.PI / 2.3;
  handL.add(f);
 }
 const thumbL = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0058, 0.030, 8), skinMat);
 thumbL.position.set(-0.012, 0.014, 0.004);
 thumbL.rotation.x = Math.PI / 4;
 handL.add(thumbL);
 const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.010, 16), new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.3, metalness: 0.85 }));
 watch.position.set(-0.038, 0, 0);
 watch.rotation.z = Math.PI / 2;
 handL.add(watch);
 const sleeveGeoL = new THREE.CylinderGeometry(0.036, 0.048, 0.38, 16);
 sleeveGeoL.translate(0, -0.19, 0);
 const sleeveL = new THREE.Mesh(sleeveGeoL, sleeveMat);
 sleeveL.position.set(-0.035, 0, 0);
 const dirL = new THREE.Vector3(-0.65, -0.72, -0.22).normalize();
 sleeveL.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirL);
 handL.add(sleeveL);
 wheelPivot.add(handL);

 // 2. Right Hand & Arm
 const handR = new THREE.Group();
 handR.position.set(0.008, 0.015, 0.172);
 const palmR = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.050), skinMat);
 palmR.position.set(-0.004, 0, 0);
 handR.add(palmR);
 for (let i = 0; i < 4; i++) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0048, 0.034, 8), skinMat);
  f.position.set(0.016, (i - 1.5) * 0.009, -0.010);
  f.rotation.z = Math.PI / 2.3;
  handR.add(f);
 }
 const thumbR = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0058, 0.030, 8), skinMat);
 thumbR.position.set(-0.012, 0.014, -0.004);
 thumbR.rotation.x = -Math.PI / 4;
 handR.add(thumbR);
 const sleeveGeoR = new THREE.CylinderGeometry(0.036, 0.048, 0.38, 16);
 sleeveGeoR.translate(0, -0.19, 0);
 const sleeveR = new THREE.Mesh(sleeveGeoR, sleeveMat);
 sleeveR.position.set(-0.035, 0, 0);
 const dirR = new THREE.Vector3(-0.65, -0.72, 0.22).normalize();
 sleeveR.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirR);
 handR.add(sleeveR);
 wheelPivot.add(handR);

 // 3. Working Infotainment Screen
 const screenRoot = new THREE.Group();
 screenRoot.position.set(0.575, 1.085, 0.000);
 screenRoot.rotation.order = 'YXZ';
 screenRoot.rotation.y = -Math.PI / 2 - 0.12;
 screenRoot.rotation.x = -0.25;

 const frame = new THREE.Mesh(
  new THREE.BoxGeometry(0.334, 0.144, 0.005),
  new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.35, metalness: 0.7 })
 );
 frame.position.z = -0.0026;
 screenRoot.add(frame);

 let screenCanvas = null, screenCtx = null, screenTex = null;
 if (typeof document !== 'undefined' && document.createElement) {
  screenCanvas = document.createElement('canvas');
  if (screenCanvas && typeof screenCanvas.getContext === 'function') {
   screenCanvas.width = 512;
   screenCanvas.height = 256;
   screenCtx = screenCanvas.getContext('2d');
   screenTex = new THREE.CanvasTexture(screenCanvas);
   screenTex.wrapS = screenTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const dispGeo = new THREE.PlaneGeometry(0.330, 0.140);
  dispGeo.translate(0, 0, 0.001);
  const dispMat = new THREE.MeshStandardMaterial({
   map: screenTex,
   emissiveMap: screenTex,
   emissive: 0xffffff,
   // Keep the infotainment readable at night without washing out the
   // windshield view from the dashboard camera.
   emissiveIntensity: 0.16,
   roughness: 0.10,
   metalness: 0.05
  });
  const display = new THREE.Mesh(dispGeo, dispMat);
  screenRoot.add(display);
 }
 root.add(screenRoot);

 // مقصورة BMW تحتاج كتلة تابلوه واضحة حتى لا تبدو عجلة القيادة والأنوار
 // عائمة عند الدخول قبل اكتمال تفاصيل المقصورة الأصلية في ملف GLB.
 if(c?.id==='policeBMW'){
  const dashMat=new THREE.MeshStandardMaterial({color:0x171b20,roughness:.62,metalness:.18});
  const trimMat=new THREE.MeshStandardMaterial({color:0x343b42,roughness:.42,metalness:.58});
  const dash=new THREE.Mesh(new THREE.BoxGeometry(.42,.28,1.34),dashMat);
  dash.position.set(.48,.74,0);dash.castShadow=true;dash.receiveShadow=true;root.add(dash);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(.26,.09,.76),trimMat);
  hood.position.set(.38,1.01,-.37);hood.rotation.z=-.08;root.add(hood);
  const center=new THREE.Mesh(new THREE.BoxGeometry(.12,.18,.42),trimMat);
  center.position.set(.56,.88,0);root.add(center);
 }

 if (parentBody) parentBody.add(root);

 return {
  root,
  steerRoot,
  wheelPivot,
  handL,
  handR,
  screenRoot,
  screenCanvas,
  screenCtx,
  screenTex,
  baseWheelY: steerRoot.position.y,
  baseWheelZ: steerRoot.position.z,
  currentSteer: 0,
  screenTimer: 0
 };
}
function makeUploadedCarRig(c,paint){
 const group=new THREE.Group(),body=new THREE.Group();group.add(body);const visual=uploadedCarVisual(c.asset,paint),modelPending=!!c.uploaded&&!visual;const wheels=[];
 if(visual){body.add(visual);if(c.police){configureOriginalPoliceModel(body);tintPoliceRearWindows(body,c);}group.updateMatrixWorld(true);group.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});for(const name of ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']){const node=visual.getObjectByName(name);if(!node)continue;const pivot=new THREE.Group();pivot.position.copy(node.getWorldPosition(new THREE.Vector3()));group.add(pivot);pivot.attach(node);pivot.userData.restY=pivot.position.y;wheels.push(pivot);}}
 const cockpit = createInteractiveCockpit(c, body, visual);
 const signals=typeof createVehicleSignals==='function'?createVehicleSignals(c,visual):null,[hx,hy,hz]=signals?.anchors?.head||[(c.length||4.4)/2-.28,.78,(c.halfWidth||.9)*.66];
 const spot=new THREE.SpotLight(0xffeed8,18,85,.52,.65);spot.position.set(hx+.03,hy,-hz);spot.target.position.set(24,.12,-.75);
 const spotR=new THREE.SpotLight(0xffeed8,18,85,.52,.65);spotR.position.set(hx+.03,hy,hz);spotR.target.position.set(24,.12,.75);
 group.add(spot,spot.target,spotR,spotR.target);
 const bulbs=[],glows=[];
 for(const side of [-1,1]){
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.048,8,6),new THREE.MeshBasicMaterial({color:0xfff4d6,toneMapped:false,transparent:true,opacity:.62}));
  bulb.scale.set(.35,.75,1.3);bulb.position.set(hx-.015,hy,side*hz);body.add(bulb);bulbs.push(bulb);
  if(typeof GLOW_TEX!=='undefined'){
   const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:0xffe8b0,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false}));
   glow.scale.set(.74,.48,1);glow.position.set(hx+.03,hy,side*hz);body.add(glow);glows.push(glow);
  }
 }
 if(typeof createEgyptianLicensePlateTexture==='function'&&typeof createLicensePlateMesh==='function'){
  const pTex=createEgyptianLicensePlateTexture();
  const pMat=new THREE.MeshStandardMaterial({map:pTex,roughness:.35,metalness:.1});
  const fp=createLicensePlateMesh(pMat,.48,.24), rp=createLicensePlateMesh(pMat,.48,.24);
  const a=signals?.anchors||(typeof getVehicleLampAnchors==='function'?getVehicleLampAnchors(c,visual):null);
  const halfL=(c.length||4.4)/2;
  const fx=halfL+.006;
  const fy=a?.head?Math.max(.34,a.head[1]*.46):.40;
  const rx=-halfL-.006;
  const ry=a?.brake?Math.max(.44,a.brake[1]*.52):.50;
  fp.position.set(fx,fy,0);fp.rotation.y=Math.PI/2;body.add(fp);
  rp.position.set(rx,ry,0);rp.rotation.y=-Math.PI/2;body.add(rp);
 }
 const lamp=new THREE.PointLight(0xffe9cd,0,5);lamp.position.set(0,(c.eye?.[1]||1.2)+.12,0);lamp.userData.nightIntensity=1.5;group.add(lamp);
 return {group,body,wheels,spot,lamp,modelPending,headlights:{spots:[spot,spotR],bulbs,glows,anchors:signals?.anchors||{head:[hx,hy,hz]}},wheelR:c.id==='micra'?.29:c.id==='xtrail'?.37:.33,passengerSeat:null,cabinEye:c.eye,signals,cockpit,driverOccupant:visual?.userData?.driverOccupant,passengerOccupant:visual?.userData?.passengerOccupant};
}
