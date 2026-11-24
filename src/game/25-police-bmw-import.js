const POLICE_BMW={ready:false,loading:false,error:''};
async function policeModelBytes(write){
 const db=await qashqaiDatabase();if(!db){if(write)throw Error('المتصفح لا يتيح حفظ المجسم محليًا');return null;}
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('models',write?'readwrite':'readonly'),r=write?tx.objectStore('models').put(write,'policeBMW'):tx.objectStore('models').get('policeBMW');let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('تعذّر حفظ المجسم'));});}finally{db.close();}
}
async function installPoliceBMW(bytes,{persist=true,select=true}={}){
 if(select&&rideBusy())throw Error('أكمل البلاغ الحالي أولًا');
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<20||bytes.byteLength>256*1024*1024||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw Error('اختر ملف BMW الأصلي بصيغة GLB، بحد أقصى 256 ميجابايت');
 const gltf=await modelLoader.parseAsync(bytes,''),model=gltf.scene,container=new THREE.Group();container.add(model);model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());if(!Number.isFinite(size.length())||Math.max(size.x,size.z)<=0||size.y<=0)throw Error('مجسم غير صالح');
 const heading=Number(store.get('assyut_police_bmw_heading',String(size.z>size.x?Math.PI/2:0)));container.rotation.y=heading;container.updateMatrixWorld(true);box.setFromObject(container);size=box.getSize(new THREE.Vector3());container.scale.setScalar(4.71/size.x);container.updateMatrixWorld(true);box.setFromObject(container);const center=box.getCenter(new THREE.Vector3());container.position.set(-center.x,-box.min.y,-center.z);container.updateMatrixWorld(true);
 // Uniform scale and rigid orientation only: original mesh proportions, maps and colors survive.
 const normalized={...gltf,scene:container};
 if(persist)await policeModelBytes(bytes);
 UPLOADED_MODELS.policeBMW={length:4.71,paint:[],normalized:true,preserveAppearance:true};importedModels.loaded.policeBMW=normalized;const c=CARS.find(c=>c.id==='policeBMW');c.available=true;POLICE_BMW.ready=true;POLICE_BMW.error='';if(!G.owned.includes(c.id))G.owned.push(c.id);G.conditions[c.id]??=100;
 if(select){store.set('assyut_police_vehicle',c.id);if(G.mode==='police'){G.carIdx=CARS.indexOf(c);car.speed=0;car.vel.set(0,0);swapTaxi(G.carIdx);applyCarStats();}saveProgress();updateHUD();}
 updatePoliceVehicleUI();return normalized;
}
async function restorePoliceBMW(){try{const bytes=await policeModelBytes();if(bytes)return await installPoliceBMW(bytes,{persist:false,select:false});}catch(e){POLICE_BMW.error=e.message;console.warn('Police BMW restore:',e.message);}return null;}
function selectedPoliceVehicle(){const preferred=store.get('assyut_police_vehicle','policeSuburban');return CARS.find(c=>c.police&&!c.localImport&&c.id===preferred&&c.available!==false)||CARS.find(c=>c.id==='policeSuburban');}
function updatePoliceVehicleUI(){if(typeof renderPatrolVehicles==='function')renderPatrolVehicles();}

function choosePoliceBMWFile(){
 if(rideBusy()){setObjective('أكمل البلاغ الحالي أولًا',3000);return;}
 const input=document.createElement('input');input.type='file';input.accept='.glb,model/gltf-binary';input.id='policeBMWFile';input.style.display='none';document.body.appendChild(input);
 input.oncancel=()=>{input.remove();updatePoliceVehicleUI();};input.onchange=async()=>{const file=input.files?.[0];if(!file){input.remove();return;}POLICE_BMW.loading=true;POLICE_BMW.error='';updatePoliceVehicleUI();try{await installPoliceBMW(await file.arrayBuffer());setObjective('تم تحميل نموذج BMW الأصلي وحفظه على جهازك',4500);}catch(e){POLICE_BMW.error=e.message;setObjective(e.message,4500);}finally{POLICE_BMW.loading=false;input.remove();updatePoliceVehicleUI();if(G.mode==='police'&&$('modalPanel')?.innerHTML.includes('garageGrid'))openGarage();}};input.click();
}
function selectPoliceVehicle(id){const c=CARS.find(c=>c.police&&c.id===id);if(!c||c.localImport||c.available===false)return false;store.set('assyut_police_vehicle',c.id);updatePoliceVehicleUI();return true;}
