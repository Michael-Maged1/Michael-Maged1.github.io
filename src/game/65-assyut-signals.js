/* Simulation signals at real junctions; timing is game-authored, not live city timing. */
{
 const selected=[];
 const candidates=ASSYUT.junctions.slice().sort((a,b)=>Math.hypot(a.x-ASSYUT.start.x,a.z-ASSYUT.start.z)-Math.hypot(b.x-ASSYUT.start.x,b.z-ASSYUT.start.z));
 for(const j of candidates){if(selected.some(p=>Math.hypot(p.x-j.x,p.z-j.z)<170))continue;selected.push(j);if(selected.length>=16)break;}
 for(const [i,j]of selected.entries()){
  const tl={x:j.x,z:j.z,lifeNode:j.node,halfX:7,halfZ:7,timer:i*4%28,xState:'green',zState:'red',xBulbs:[],zBulbs:[],approaches:[]};
  const incoming=ASSYUT.edges.filter(e=>e.b===j.node),used=[];
  for(const edge of incoming){
   const f=edgeFrame(edge),road=ASSYUT.roads[edge.road],heading=Math.atan2(-f.fz,f.fx);if(used.some(h=>Math.abs(Math.atan2(Math.sin(h-heading),Math.cos(h-heading)))<.4))continue;used.push(heading);
   const axis=Math.abs(f.fx)>Math.abs(f.fz)?'x':'z',stop={x:j.x-f.fx*Math.max(12,...j.arms.map(a=>a.width/2+4)),z:j.z-f.fz*Math.max(12,...j.arms.map(a=>a.width/2+4))},offset=Math.min(road.width*.25,2.5),root=new THREE.Group();root.position.set(stop.x,0,stop.z);root.rotation.y=heading;
   let tries=0;while(onDrivingRoad(stop.x-f.fz*(road.width/2+1.4),stop.z+f.fx*(road.width/2+1.4),.15)&&tries++<8){stop.x-=f.fx*3;stop.z-=f.fz*3;}if(tries>=8)continue;root.position.set(stop.x,0,stop.z);
   const metal=new THREE.MeshStandardMaterial({color:0x303b36,roughness:.55,metalness:.3}),post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,6.7,8),metal);post.position.set(0,3.35,road.width/2+1.4);root.add(post);
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,road.width/2+1.4-offset),metal);arm.position.set(0,6.6,(road.width/2+1.4+offset)/2);root.add(arm);
   const head=new THREE.Group();head.position.set(0,5.55,offset);head.rotation.y=-Math.PI/2;root.add(head);
   const casing=new THREE.Mesh(new THREE.BoxGeometry(1.02,2.65,.28),new THREE.MeshStandardMaterial({color:0x101914,roughness:.75}));head.add(casing);
   const make=(y,c)=>{const mat=new THREE.MeshBasicMaterial({color:c,toneMapped:false});const m=new THREE.Mesh(new THREE.CircleGeometry(.30,24),mat);m.position.set(0,y,.15);head.add(m);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:c,transparent:true,opacity:.55,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));glow.position.set(0,y,.18);glow.scale.set(1.5,1.5,1);head.add(glow);return {mat,glow};};
   const r=make(.8,0xff1610),y=make(0,0xffc323),gr=make(-.8,0x1bff64);const bulbs={r:r.mat,y:y.mat,gr:gr.mat,redGlow:r.glow,yellowGlow:y.glow,greenGlow:gr.glow};tl[axis+'Bulbs'].push(bulbs);
   const line=new THREE.Mesh(new THREE.BoxGeometry(.32,.02,Math.max(2,road.width/2-.5)),new THREE.MeshStandardMaterial({color:0xe7e3ce}));line.position.set(0,.045,offset);root.add(line);REAL_CITY.group.add(root);
   const approach={edge,axis,fx:f.fx,fz:f.fz,nx:-f.fz,nz:f.fx,stop,width:road.width};tl.approaches.push(approach);
   const px=stop.x-f.fz*(road.width/2+1.4),pz=stop.z+f.fx*(road.width/2+1.4);if(!onDrivingRoad(px,pz,.1))ROAD_FURNITURE.push({x:px,z:pz,kind:'signal'});
  }
  TRAFFIC_LIGHTS.push(tl);
 }
 updateTrafficLights(0);
}
function assyutSignalAhead(){
 let best=null;const fx=Math.cos(car.heading),fz=-Math.sin(car.heading);
 for(const light of TRAFFIC_LIGHTS)for(const a of light.approaches||[]){if(fx*a.fx+fz*a.fz<.8)continue;const dx=a.stop.x-car.x,dz=a.stop.z-car.z,distance=dx*a.fx+dz*a.fz-vehicleParameters().halfLength,across=dx*a.nx+dz*a.nz;if(Math.abs(across)>a.width/2||distance<-1||distance>110)continue;if(!best||distance<best.distance)best={light,axis:a.axis,distance,state:light[a.axis+'State']};}
 return best;
}
function checkAssyutLights(prevX,prevZ){
 const fx=Math.cos(car.heading),fz=-Math.sin(car.heading),bounds=vehicleParameters();if(car.speed<1.2||car.redFineCd>0)return;
 for(const light of TRAFFIC_LIGHTS)for(const a of light.approaches||[]){if(light[a.axis+'State']!=='red'||fx*a.fx+fz*a.fz<.8)continue;const across=(car.x-a.stop.x)*a.nx+(car.z-a.stop.z)*a.nz;if(Math.abs(across)>a.width/2-.2)continue;const extent=bounds.halfLength*(fx*a.fx+fz*a.fz)+bounds.halfWidth*Math.abs(fx*a.nx+fz*a.nz),before=(prevX-a.stop.x)*a.fx+(prevZ-a.stop.z)*a.fz+extent,after=(car.x-a.stop.x)*a.fx+(car.z-a.stop.z)*a.fz+extent;
  if(before<0&&after>=0){car.redFineCd=6;G.money=Math.max(0,G.money-40);saveProgress();if(rideBusy())M.hits++;sfxFine();flashScreen();floatText('−40 ج.م · إشارة حمراء','#ff685d');setObjective('تجاوزت خط التوقف والإشارة حمراء · مخالفة 40 ج.م',3500);return;}
 }
}
