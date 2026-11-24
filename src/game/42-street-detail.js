/* Small, correctly scaled road details. Flat repairs do not create invisible physical obstacles. */
{
 const data=[];
 for(let x=-HALF+30;x<HALF-25;x+=43){
  if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+5))continue;
  data.push({x,z:(Math.floor(x/43)%2?1:-1)*12.9});
 }
 const darkIron=new THREE.MeshStandardMaterial({color:0x494c47,roughness:.86,metalness:.18});
 const lids=new THREE.InstancedMesh(new THREE.CylinderGeometry(.43,.43,.024,24),darkIron,data.length);
 const rims=new THREE.InstancedMesh(new THREE.TorusGeometry(.40,.018,4,24),darkIron,data.length);
 const o=new THREE.Object3D();
 data.forEach((p,i)=>{o.position.set(p.x,.018,p.z);o.rotation.set(0,0,0);o.updateMatrix();lids.setMatrixAt(i,o.matrix);o.rotation.x=-Math.PI/2;o.position.y=.033;o.updateMatrix();rims.setMatrixAt(i,o.matrix);});
 lids.receiveShadow=true;rims.receiveShadow=true;scene.add(lids,rims);
 const drains=[],slots=[];
 for(let x=-HALF+20;x<HALF;x+=36){
  if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+4))continue;
  for(const z of [-15.35,15.35]){drains.push({x,z});for(let i=0;i<6;i++)slots.push({x:x-.27+i*.108,z});}
 }
 const metal=new THREE.InstancedMesh(new THREE.BoxGeometry(.72,.018,.40),darkIron,drains.length);
 const holes=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,.006,.30),new THREE.MeshStandardMaterial({color:0x141b1c,roughness:1}),slots.length);
 drains.forEach((p,i)=>{o.position.set(p.x,.016,p.z);o.rotation.set(0,0,0);o.updateMatrix();metal.setMatrixAt(i,o.matrix);});
 slots.forEach((p,i)=>{o.position.set(p.x,.028,p.z);o.updateMatrix();holes.setMatrixAt(i,o.matrix);});
 scene.add(metal,holes);
 const patchShape=new THREE.Shape();patchShape.moveTo(-1,-.5);patchShape.lineTo(.65,-.6);patchShape.lineTo(1,-.3);patchShape.lineTo(.9,.48);patchShape.lineTo(-.72,.6);patchShape.closePath();
 const patchGeo=new THREE.ShapeGeometry(patchShape);patchGeo.rotateX(-Math.PI/2);
 const patches=new THREE.InstancedMesh(patchGeo,new THREE.MeshStandardMaterial({color:0x222522,roughness:1,transparent:true,opacity:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),data.length);
 data.forEach((p,i)=>{o.position.set(p.x+7,.007,p.z*.55);o.rotation.set(0,rand(-.12,.12),0);o.scale.set(rand(1,3),1,rand(1,2.3));o.updateMatrix();patches.setMatrixAt(i,o.matrix);});patches.receiveShadow=true;scene.add(patches);
}
/* Fictitious local advertising, all ground supports outside the carriageway. */
for(const [i,x] of [-875,-595,-315,105,385,805].entries()){
 const z=25.4;if(onDrivingRoad(x,z,1))continue;
 const big=i%2===0,w=big?9:2.2,h=big?3.8:2.9,y=big?7:2;
 const mat=new THREE.MeshStandardMaterial({map:signTex(['أسيوط تجمعنا','سنتر النميس · تسوق قريب','صيانة سيارتك · خدمة يومية'][i%3],['#e6b86c','#78bec5','#95b486'][i%3]),roughness:.65});
 const panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,.18),mat);panel.position.set(x,y,z);scene.add(panel);
 for(const dx of big?[-w*.36,w*.36]:[0]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,y,8),new THREE.MeshStandardMaterial({color:0x343a3d}));post.position.set(x+dx,y/2,z);scene.add(post);ROAD_FURNITURE.push({x:x+dx,z,kind:'advert'});}
}
// Far bank makes the water read as the Nile rather than an open sea.
{const bank=new THREE.Mesh(new THREE.PlaneGeometry(4000,700),new THREE.MeshStandardMaterial({color:0x8e9470,roughness:1}));bank.rotation.x=-Math.PI/2;bank.position.set(0,.015,-550);scene.add(bank);}
