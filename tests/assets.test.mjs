import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const three=uri(fs.readFileSync(root+'vendor/three.module.js','utf8'));
const THREE=await import(three);globalThis.THREE=THREE;globalThis.UPLOADED_MODELS={};globalThis.CARS=[{asset:'lada'}];
const utilsURI=uri(fs.readFileSync(root+'vendor/addons/BufferGeometryUtils.js','utf8').replaceAll("from 'three'",`from '${three}'`));
const loaderURI=uri(fs.readFileSync(root+'vendor/addons/GLTFLoader.js','utf8').replaceAll("from 'three'",`from '${three}'`).replace('../utils/BufferGeometryUtils.js',utilsURI));
const skeletonURI=uri(fs.readFileSync(root+'vendor/addons/SkeletonUtils.js','utf8').replaceAll("from 'three'",`from '${three}'`));
const decoderURI=uri(fs.readFileSync(root+'vendor/addons/meshopt_decoder.module.js','utf8'));
globalThis.Image=class{constructor(){this.height=1;}set src(value){queueMicrotask(()=>this.onload?.());}};
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{constructor(t,p){Object.assign(this,p)}};
globalThis.document={createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}};
globalThis.renderer={capabilities:{getMaxAnisotropy:()=>8}};globalThis.canvasTex=()=>new THREE.Texture();globalThis.createVehicleSignals=()=>null;globalThis.configureOriginalPoliceModel=()=>{};globalThis.tintPoliceRearWindows=()=>{};
let code=fs.readFileSync(root+'src/game/22-models.js','utf8').replace('asset:GLTFLoader',loaderURI).replace('asset:SkeletonUtils',skeletonURI).replace('asset:MeshoptDecoder',decoderURI);
code+='\n'+fs.readFileSync(root+'src/game/52-uploaded-car-rig.js','utf8');
code+='\nexport {uploadedCarVisual, makeUploadedCarRig, importedModels, modelLoader, vehicleVisual, applyImportedTaxi, personVisual, animateImportedPerson, attachImportedPerson, upgradeLoadedModels, initImportedModels};';
const mod=await import(uri(code));
const files={micro:'fiat-ducato',man:'pedestrian-aj',woman:'pedestrian-woman'};
for(const [key,file] of Object.entries(files)){
 const b=fs.readFileSync(root+'assets/'+file+'.glb');mod.importedModels.loaded[key]=await mod.modelLoader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
const report={vehicles:[],people:[],textureGPUVerification:false};
for(const [key,body] of [['micro','micro']]) {
 const group=new THREE.Group(),rigBody=new THREE.Group();group.add(rigBody);
 const rig={group,body:rigBody,wheels:[],passengerSeat:null};
 mod.applyImportedTaxi(rig,{body,asset:key,color1:0xf3c318},null);
 group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-4.8)<.05,key+' length');
 assert.ok(size.z<2,key+' width');assert.ok(Math.abs(bounds.min.y)<.03,key+' ground');
 report.vehicles.push({key,size:size.toArray().map(x=>+x.toFixed(3)),wheelPivots:rig.wheels.length});
}
for(const key of ['man','woman']){
 const person=new THREE.LOD();person.addLevel(new THREE.Group(),0);person.addLevel(new THREE.Group(),50);
 mod.attachImportedPerson(person,key);assert.ok(person.userData.imported);assert.equal(person.levels.length,3);
 let maxWidth=0,minHeight=Infinity;
 for(let i=0;i<24;i++){
  mod.animateImportedPerson(person,i/24*Math.PI*2);
  person.updateMatrixWorld(true);person.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox()}});
  const b=new THREE.Box3().setFromObject(person),sz=b.getSize(new THREE.Vector3());
  assert.ok(sz.y>1.4&&sz.y<2,key+' animated height');assert.ok(sz.x<1.3,key+' relaxed arms');assert.ok(b.min.y>-.2,key+' feet');maxWidth=Math.max(maxWidth,sz.x);minHeight=Math.min(minHeight,sz.y);
 }
 report.people.push({key,joints:person.userData.imported.userData.joints.length,minHeight,maxWidth});
}
// Test asynchronous upgrades against the real traffic entry structure.
globalThis.G={carIdx:0};let swaps=0;globalThis.swapTaxi=()=>swaps++;
globalThis.traffic=['micro','bus'].map(kind=>{const mesh=new THREE.Group();mesh.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));return {kind,mesh};});
globalThis.peds=[];globalThis.passenger=new THREE.Group();
for(const key of Object.keys(files))mod.upgradeLoadedModels(key);
assert.equal(traffic.filter(t=>t.mesh.userData.imported).length,1);assert.equal(traffic[1].mesh.children.length,1);
report.upgradedTraffic=traffic.filter(t=>t.mesh.userData.imported).length;
console.log(JSON.stringify(report,null,2));

// Inspect every supplied high/traffic model with the exact runtime decoder.
const specs=JSON.parse(fs.readFileSync(root+'assets/uploaded-models.json','utf8'));globalThis.UPLOADED_MODELS=specs;
const fleetCode=fs.readFileSync(root+'src/game/01-uploaded-fleet.js','utf8'),prefix='const UPLOADED_CAR_DEFINITIONS=',start=fleetCode.indexOf(prefix)+prefix.length,defs=JSON.parse(fleetCode.slice(start,fleetCode.indexOf(';\nfor(const car',start)));for(const file of ['03-police-car.js','04-police-bmw.js','05-police-duster.js']){const policeCode=fs.readFileSync(root+'src/game/'+file,'utf8');defs.push(JSON.parse(policeCode.slice(policeCode.indexOf('CARS.push(')+10,policeCode.lastIndexOf(');'))));}globalThis.CARS=defs;
const supplied=[];
for(const [key,spec]of Object.entries(specs)){
 let playerTriangles=0,trafficTriangles=0;
 for(const [suffix,file]of [['',spec.file],['_traffic',spec.trafficFile]]){const bytes=fs.readFileSync(root+'assets/'+file),gltf=await mod.modelLoader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');mod.importedModels.loaded[key+suffix]=gltf;let triangles=0;gltf.scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});if(suffix)trafficTriangles=triangles;else playerTriangles=triangles;assert.ok(gltf.parser.json.asset.extras.license.includes('CC-BY'),'license retained');}
 const rig=mod.makeUploadedCarRig(defs.find(c=>c.id===key));rig.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(rig.group),sz=bounds.getSize(new THREE.Vector3());assert.ok(Math.abs(sz.x-spec.length)<.03,key+' real scale');assert.ok(Math.abs(bounds.min.y)<.03,key+' tyres touch ground');assert.equal(rig.wheels.length,4,key+' four wheel assemblies');for(let i=0;i<4;i++){assert.ok(i<2?rig.wheels[i].position.x>0:rig.wheels[i].position.x<0,key+' axle order');}
 const visual=mod.uploadedCarVisual(key,0x15a6f4);let paintCount=0;visual.traverse(o=>{if(o.isMesh&&spec.paint.includes(o.material.name)){assert.equal(o.material.color.getHex(),0x15a6f4);paintCount++;}});if(spec.paint.length)assert.ok(paintCount>0,key+' paint material is addressable');assert.ok(trafficTriangles<playerTriangles*.8,key+' traffic is lighter');assert.ok(trafficTriangles<21000,key+' traffic triangle budget');supplied.push({key,length:+sz.x.toFixed(3),wheels:rig.wheels.length,playerTriangles,trafficTriangles});
}
console.log(JSON.stringify({suppliedModels:supplied},null,2));
