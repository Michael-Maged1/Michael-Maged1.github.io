/* Keep the supplied Sheriff Cruiser's original meshes, paint, decals and materials. */
function configureOriginalPoliceModel(body){
 const emergency=[];
 body.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
  const channel=/^(?:roof_light_(blue|red|white)(?:\.\d+)?|emit_(blue|red))$/.exec(material.name);const colorCh=channel?.[1]||channel?.[2];if(colorCh)emergency.push({material,side:colorCh==='red'?1:colorCh==='blue'?0:2,intensity:material.emissiveIntensity,emissive:material.emissive.clone()});
 }});
 body.userData.emergencyLights=emergency;
}
function updatePoliceLights(t){
 const list=taxiBody?.userData.emergencyLights;if(!list)return;
 const on=G.mode==='police'&&POLICE.siren,phase=Math.floor(t/.14)%4;
 for(const light of list){light.material.emissive.copy(light.emissive);if(on&&light.emissive.getHex()===0)light.material.emissive.setHex(light.side===1?0xff1724:light.side===0?0x126dff:0xffffff);const flash=light.side===2?phase===0:(phase<2?light.side===0:light.side===1);light.material.emissiveIntensity=on?(flash?Math.max(4,light.intensity):0):light.intensity;}
}
function tintPoliceRearWindows(body,c){
 body.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(body),height=bounds.max.y-bounds.min.y,meshes=[];body.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&/windows|glass|transparent_clear|steclo/i.test(o.material.name))meshes.push(o);});
 const v=new THREE.Vector3(),inverse=new THREE.Matrix4().copy(body.matrixWorld).invert();
 for(const mesh of meshes){const g=mesh.geometry,positions=g.attributes.position,index=g.index,ordinary=[],rear=[],transform=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),count=index?index.count:positions.count;
  for(let i=0;i<count;i+=3){let x=0,y=0,z=0;for(let k=0;k<3;k++){const j=index?index.getX(i+k):i+k;v.fromBufferAttribute(positions,j).applyMatrix4(transform);x+=v.x/3;y+=v.y/3;z+=v.z/3;}const target=x<-.22&&y>height*.62&&(Math.abs(z)>(c.halfWidth||.9)*.52||x<-c.length*.32)?rear:ordinary;for(let k=0;k<3;k++)target.push(index?index.getX(i+k):i+k);}
  if(!rear.length)continue;const tint=mesh.material.clone();tint.name+='_RearPrivacyTint';tint.map=null;tint.color.setHex(0x071018);tint.transmission=0;tint.transparent=false;tint.opacity=1;tint.roughness=.28;tint.metalness=.12;tint.side=THREE.FrontSide;tint.depthWrite=true;const copy=g.clone();copy.setIndex(ordinary.concat(rear));copy.clearGroups();if(ordinary.length)copy.addGroup(0,ordinary.length,0);copy.addGroup(ordinary.length,rear.length,1);mesh.geometry=copy;mesh.material=[mesh.material,tint];
 }
}
