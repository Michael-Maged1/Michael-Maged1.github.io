const CAR_THUMBS=/*__CAR_THUMBS__*/ {};
/* The requested Sketchfab file requires its owner's authorized download session.
 * Accept that GLB locally; never replace it with a different car under its name. */
const QASHQAI_SOURCE={url:'https://sketchfab.com/3d-models/2024-nissan-qashqai-glory-3d26c0e62eaa46f1bbead9f3073540b3',author:'Ddiaz Design',license:'CC BY-NC-SA 4.0',status:'bundled'};
async function qashqaiDatabase(){if(!window.indexedDB)return null;return new Promise((resolve,reject)=>{const request=indexedDB.open('assyut-driver-models',1);request.onupgradeneeded=()=>request.result.createObjectStore('models');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function storeQashqai(bytes){const db=await qashqaiDatabase();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('models','readwrite');tx.objectStore('models').put(bytes,'qashqai');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
async function installQashqai(bytes,persist=true){
 if(rideBusy())throw Error('أكمل المشوار قبل تغيير العربية');
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<20||bytes.byteLength>100*1024*1024||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw Error('اختر ملف GLB صحيحًا بحجم أقل من 100 ميجابايت');
 const gltf=await modelLoader.parseAsync(bytes,'');gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),sz=box.getSize(new THREE.Vector3());if(Math.max(sz.x,sz.z)<=0||sz.y<=0)throw Error('الملف لا يحتوي على مجسم صالح');
 importedModels.loaded.qashqai=gltf;QASHQAI_SOURCE.status='ready';const c=CARS.find(c=>c.id==='qashqai');c.available=true;c.source=QASHQAI_SOURCE.url;c.orientation=Number(store.get('assyut_qashqai_orientation',String(sz.x>sz.z?0:Math.PI/2)));
 const index=CARS.indexOf(c);if(!G.owned.includes(c.id))G.owned.push(c.id);G.conditions[c.id]=G.conditions[c.id]??100;G.carIdx=index;car.speed=0;car.vel.set(0,0);swapTaxi(index);saveProgress();
 if(persist)await storeQashqai(bytes);updateHUD();return true;
}
async function restoreQashqai(){
 if(importedModels.loaded.qashqai)return;
 try{const db=await qashqaiDatabase();if(!db)return;const bytes=await new Promise((resolve,reject)=>{const tx=db.transaction('models','readonly'),r=tx.objectStore('models').get('qashqai');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();if(bytes){const previous=G.carIdx,prefer=CARS[+store.get('alex_taxi_car','0')]?.id==='qashqai';await installQashqai(bytes,false);if(!prefer){G.carIdx=previous;swapTaxi(previous);saveProgress();}}}catch(e){console.warn('Local car restore:',e.message);}
}
function chooseQashqaiFile(){
 if(rideBusy()){setObjective('أكمل المشوار أولًا',2500);return;}
 const input=document.createElement('input');input.type='file';input.accept='.glb,model/gltf-binary';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{QASHQAI_SOURCE.status='loading';await installQashqai(await file.arrayBuffer());setObjective('تم اعتماد القشقاي كسيارتك الرئيسية وحفظ مجسمها على هذا الجهاز',4500);openGarage();}catch(e){QASHQAI_SOURCE.status='missing';setObjective(e.message,4500);}};input.click();
}
