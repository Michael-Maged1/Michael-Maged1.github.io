/* Physical signboards: authentic Egyptian royal-blue highway & Asyut street enamel faces, white lettering, steel backs and posts. */
function roadSignTexture(text,sub='أسيوط · اتجاه الطريق',arrow='⬆'){
 return canvasTex(1024,320,g=>{
  g.fillStyle='#074b8c';g.fillRect(0,0,1024,320);
  // إطار مزدوج أبيض مطابق ليافطات المرور المصرية
  g.strokeStyle='#f2f8fc';g.lineWidth=12;g.strokeRect(14,14,996,292);
  g.strokeStyle='rgba(255,255,255,0.45)';g.lineWidth=3;g.strokeRect(28,28,968,264);
  // سهم اتجاه أبيض واضح على اليسار
  g.fillStyle='#ffffff';g.font='bold 96px Tahoma, Arial';g.textAlign='center';g.textBaseline='middle';
  g.fillText(arrow,104,160);
  // اسم الشارع / المنطقة بخط عربي عريض
  g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#ffffff';g.font='bold 88px Tahoma, Cairo, Arial';
  g.fillText(text,560,126,760);
  // شريط فرعي باسم المحافظة أو التفرع
  g.fillStyle='#d8eeff';g.font='600 40px Tahoma, Cairo, Arial';
  g.fillText(sub,560,234,740);
 });
}
function highwaySignTexture(text,bg='#074b8c',subtext='',arrow='⬇'){
 return canvasTex(1024,420,g=>{
  g.fillStyle=bg;g.fillRect(0,0,1024,420);
  g.strokeStyle='#ffffff';g.lineWidth=14;g.strokeRect(16,16,992,388);
  g.strokeStyle='rgba(255,255,255,0.4)';g.lineWidth=3;g.strokeRect(32,32,960,356);
  g.fillStyle='#ffffff';g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
  g.font='bold 104px Tahoma, Cairo, Arial';
  g.fillText(text,512,subtext?132:168,900);
  if(subtext){
   g.fillStyle='#e2f2ff';g.font='600 50px Tahoma, Cairo, Arial';
   g.fillText(subtext,512,244,880);
  }
  g.fillStyle='#ffd24c';g.font='bold 84px Tahoma, Arial';
  g.fillText(arrow,512,338);
 });
}
function makeOverheadGantry(leftText,rightText,spanW=14,height=5.6,leftSub='نفق المنفذ · أسيوط'){
 const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x5a6872,metalness:.72,roughness:.35}),concrete=new THREE.MeshStandardMaterial({color:0x9da3a0,roughness:.9});
 const beam=new THREE.Mesh(new THREE.BoxGeometry(spanW+2,.45,.45),steel);beam.position.y=height;beam.castShadow=true;group.add(beam);
 const subBeam=new THREE.Mesh(new THREE.BoxGeometry(spanW+2,.12,.12),steel);subBeam.position.y=height-1.35;group.add(subBeam);
 for(const s of[-1,1]){const legX=s*(spanW/2+.8),col=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,height,12),steel);col.position.set(legX,height/2,0);col.castShadow=true;group.add(col);const base=new THREE.Mesh(new THREE.BoxGeometry(.85,.75,.85),concrete);base.position.set(legX,.375,0);base.receiveShadow=true;group.add(base);}
 const leftMat=new THREE.MeshStandardMaterial({map:highwaySignTexture(leftText,'#074b8c',leftSub,'⬇'),roughness:.38,emissive:0x0b3a66,emissiveIntensity:.22});
 const leftSign=new THREE.Mesh(new THREE.BoxGeometry(spanW*.44,1.85,.12),[steel,steel,steel,steel,leftMat,leftMat]);leftSign.position.set(-spanW*.24,height-.80,.08);leftSign.castShadow=true;group.add(leftSign);
 const rightMat=new THREE.MeshStandardMaterial({map:highwaySignTexture(rightText,'#074b8c','أسيوط · محور رئيسي','↗'),roughness:.38,emissive:0x0b3a66,emissiveIntensity:.22});
 const rightSign=new THREE.Mesh(new THREE.BoxGeometry(spanW*.44,1.85,.12),[steel,steel,steel,steel,rightMat,rightMat]);rightSign.position.set(spanW*.24,height-.80,.08);rightSign.castShadow=true;group.add(rightSign);
 return group;
}
function makeMountedRoadSign(text,w=5.0,h=1.28,y=4.2,sub='محافظة أسيوط',arrow='⬆'){
 const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x687780,metalness:.68,roughness:.4}),face=new THREE.MeshStandardMaterial({map:roadSignTexture(text,sub,arrow),roughness:.42,metalness:.16}),panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,.10),[steel,steel,steel,steel,face,face]);panel.position.y=y;panel.castShadow=true;group.add(panel);
 for(const x of[-w*.32,w*.32]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,y+h*.35,8),steel);post.position.set(x,(y+h*.35)/2,-.09);post.castShadow=true;group.add(post);}
 for(const yy of[y-h*.25,y+h*.25]){const back=new THREE.Mesh(new THREE.BoxGeometry(w*.90,.055,.10),steel);back.position.set(0,yy,-.12);group.add(back);}group.userData.mountedSign=true;return group;
}
function addMountedRoadSign(text,point,roadHint,sub='محافظة أسيوط'){
 const near=nearestAssyutRoad(point);if(!near)return null;let side=near.side||1,x=near.point.x+near.nx*side*(near.width/2+3.3),z=near.point.z+near.nz*side*(near.width/2+3.3);if(nearestAssyutRoad({x,z}).distance<near.width/2+1)return null;
 const arrow=near.road.oneway==='yes'?'⬆':(side>0?'↗':'↖');
 const sign=makeMountedRoadSign(text,5.0,1.28,4.2,sub,arrow);sign.position.set(x,assyutRoadHeightAt(x,z),z);sign.rotation.y=near.heading-Math.PI/2+(near.road.oneway==='-1'?Math.PI:0);const feet=[-1.536,1.536].map(localX=>new THREE.Vector3(localX,0,-.09).applyAxisAngle(new THREE.Vector3(0,1,0),sign.rotation.y).add(new THREE.Vector3(x,0,z)));if(feet.some(p=>onDrivingRoad(p.x,p.z,.15)))return null;(REAL_CITY.signs??=[]).push(sign);REAL_CITY.group.add(sign);for(const localX of[-1.536,1.536]){const v=new THREE.Vector3(localX,0,-.09).applyAxisAngle(new THREE.Vector3(0,1,0),sign.rotation.y);ROAD_FURNITURE.push({x:x+v.x,z:z+v.z,kind:'roadSign'});}return sign;
}
const REAL_SHOP_SIGNS=[
 ['كازيون ماركت','#c8102e','#ffd200','KAZYON · عروض يومية · أسيوط'],
 ['مطعم فول وطعمية الصعيدي','#b83214','#fff4d6','فول · طعمية · بطاطس · 24 ساعة'],
 ['ورشة ميكانيكا سيارات','#123d72','#ffd24c','ميكانيكا · عفشة · كهرباء · تغيير زيت'],
 ['كشري ومشويات أسيوط','#7a1c22','#ffe6a8','كشري · طواجن · حواوشي · مشويات'],
 ['صيدلية الشفاء','#086e49','#ffffff','د. أحمد · خدمة 24 ساعة · أسيوط'],
 ['مطعم أولاد البلد','#8c3a10','#fff2cc','فول وطعمية · سندوتشات مصرية'],
 ['مركز كاوتش وبنشر','#1e293b','#facc15','ترصيص · زوايا · تغيير زيوت · أسيوط']
].map(([name,bg,ink,sub])=>canvasTex(1024,256,g=>{g.fillStyle=bg;g.fillRect(0,0,1024,256);g.strokeStyle=ink;g.lineWidth=6;g.strokeRect(12,12,1000,232);g.fillStyle=ink;g.direction='rtl';g.textAlign='center';g.textBaseline='middle';g.font='bold 88px Tahoma, Cairo';g.fillText(name,512,104,940);g.fillStyle='#ffffff';g.font='600 36px Tahoma, Cairo';g.fillText(sub||'أسيوط',512,200,920);}));
