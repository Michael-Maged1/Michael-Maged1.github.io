/* Small offline-renderable scenes used by the two mission video transitions. */
function createPoliceMovie(kind,label='قسم أول'){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xc4d2d8);scene.add(new THREE.HemisphereLight(0xffffff,0x707366,2.7));const sun=new THREE.DirectionalLight(0xffefd8,2.5);sun.position.set(-4,8,5);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x737675,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
 const c=CARS[G.carIdx]?.police?CARS[G.carIdx]:CARS.find(c=>c.police),rig=makeUploadedCarRig(c);scene.add(rig.group);
 const movieCamera=new THREE.PerspectiveCamera(48,16/9,.04,70);movieCamera.position.set(-8.4,3.1,6.2);movieCamera.lookAt(kind==='arrest'?-1:1,1,0);
 const actors=[];const officerCount=3,suspectCount=2;
 for(let i=0;i<suspectCount;i++){const actor=makePoliceSuspect();scene.add(actor);actors.push({mesh:actor,officer:false,lane:i===0?-.34:.34,back:i*.75});}
 for(let i=0;i<officerCount;i++){const actor=makeEgyptianOfficer();scene.add(actor);actors.push({mesh:actor,officer:true,lane:i===0?-.95:i===1?.95:0,back:i===2?1.4:.25});}
 let hatch=null;
 if(kind==='arrest'){
  const opening=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.24),new THREE.MeshBasicMaterial({color:0x111a21,side:THREE.DoubleSide}));opening.rotation.y=-Math.PI/2;opening.position.set(-c.length/2-.05,1.03,0);scene.add(opening);
  hatch=new THREE.Group();hatch.position.set(-c.length/2-.08,1.65,0);const panel=new THREE.Mesh(new THREE.BoxGeometry(.045,1.15,1.57),new THREE.MeshStandardMaterial({color:0x101316}));panel.position.y=-.575;hatch.add(panel);scene.add(hatch);
 }else{
  rig.group.position.set(-2.6,0,2.2);
  const station=makePoliceStationBuilding(label);station.rotation.y=Math.PI/2;station.position.set(8.5,0,0);scene.add(station);

 }
 return {scene,camera:movieCamera,update(t){const progress=clamp((t-.5)/4.5,0,1);if(hatch)hatch.rotation.z=-1.15*clamp(t/.8,0,1);for(const a of actors){const x=kind==='arrest'?lerp(-6-a.back,-2.1-a.back*.1,progress):lerp(-3.9-a.back,3.8-a.back*.1,progress);a.mesh.position.set(x,.03,a.lane);a.mesh.rotation.y=Math.PI/2;a.mesh.visible=progress<(a.officer?.99:.92);animatePerson(a.mesh,t*6,progress<1?1:0);if(a.officer)for(const arm of a.mesh.userData.walk.arms)arm.rotation.x=-.45;}},duration:6};
}
