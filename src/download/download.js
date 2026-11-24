/* One stable URL; every hosted build supplies a fresh, complete ZIP manifest. */
const statusEl=document.getElementById('status'),progressEl=document.getElementById('progress'),save=document.getElementById('save'),retry=document.getElementById('retry'),metadata=document.getElementById('metadata');
let downloadURL=null,downloadName='assyut-drive-complete.zip',busy=false;
function saveFile(){if(!downloadURL)return;const link=document.createElement('a');link.href=downloadURL;link.download=downloadName;document.body.appendChild(link);link.click();link.remove();}
async function checksum(bytes){if(!globalThis.crypto?.subtle)return null;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function startDownload(){
 if(busy)return;busy=true;retry.hidden=true;save.hidden=true;progressEl.value=0;
 try{
  if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}
  statusEl.textContent='جارٍ البحث عن أحدث نسخة…';
  const response=await fetch('download-manifest.json',{cache:'no-store'});if(!response.ok)throw Error('manifest');
  const manifest=await response.json();if(!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.some(p=>!/^download-data\/[a-zA-Z0-9-]+\.bin$/.test(p.url)||!Number.isSafeInteger(p.bytes)||p.bytes<=0))throw Error('invalid manifest');
  let received=0;const buffers=[];downloadName=manifest.filename;
  metadata.textContent=`${(manifest.bytes/1048576).toFixed(1)} ميجابايت · ${manifest.files} ملف · تحديث ${new Date(manifest.builtAt).toLocaleDateString('ar-EG')}`;
  for(const part of manifest.parts){
   const r=await fetch(part.url,{cache:'no-store'});if(!r.ok)throw Error('part');
   let data;if(r.body?.getReader){const reader=r.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;received+=value.length;progressEl.value=Math.min(99,received/manifest.bytes*100);statusEl.textContent=`جارٍ تنزيل اللعبة كاملة… ${Math.floor(progressEl.value)}٪`;}data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}}
   else{data=new Uint8Array(await r.arrayBuffer());received+=data.length;progressEl.value=Math.min(99,received/manifest.bytes*100);}
   if(data.length!==part.bytes)throw Error('size');const digest=await checksum(data);if(digest&&digest!==part.sha256)throw Error('checksum');buffers.push(data);
  }
  if(received!==manifest.bytes)throw Error('total size');
  downloadURL=URL.createObjectURL(new Blob(buffers,{type:'application/zip'}));progressEl.value=100;save.hidden=false;statusEl.textContent='الملف الكامل جاهز. بدأ الحفظ؛ إن لم يبدأ تلقائيًا اضغط الزر أدناه.';saveFile();
 }catch{statusEl.textContent='لم يكتمل التنزيل. تحقق من الاتصال وأعد المحاولة للحصول على أحدث نسخة.';retry.hidden=false;}
 finally{busy=false;}
}
save.addEventListener('click',saveFile);retry.addEventListener('click',startDownload);addEventListener('pagehide',()=>{if(downloadURL)URL.revokeObjectURL(downloadURL);});startDownload();
