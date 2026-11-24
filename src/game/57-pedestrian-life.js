/* Sidewalk walkers, cautious crossings, couples and families share one group state. */
const WALKING_GROUPS=[];
function pedestrianEdges(){return ASSYUT.edges.filter(e=>{if(ASSYUT.roads[e.road].width<4||e.length<=12)return false;if(INFRA?.profiles&&INFRA.profiles.has(e.road))return false;const na=ASSYUT.nodes[e.a],nb=ASSYUT.nodes[e.b];if(assyutRoadHeightAt(na.x,na.z)>0.35||assyutRoadHeightAt(nb.x,nb.z)>0.35)return false;return true;});}
function pedestrianFrame(edge){const a=ASSYUT.nodes[edge.a],b=ASSYUT.nodes[edge.b],len=Math.hypot(b.x-a.x,b.z-a.z);return {a,b,len,fx:(b.x-a.x)/len,fz:(b.z-a.z)/len};}
function groupPosition(g,offset=null){
 const road=ASSYUT.roads[g.edge.road];
 if(offset===null){
  offset=g.side*(road.width/2+(g.gutter?0.15:1.05));
 }
 const f=pedestrianFrame(g.edge);
 return {x:f.a.x+f.fx*g.s-f.fz*offset,z:f.a.z+f.fz*g.s+f.fx*offset};
}
function initializePedestrianLife(){
 for(const p of peds)scene.remove(p.mesh);peds.length=0;
 const eligible=pedestrianEdges(),near=eligible.filter(e=>Math.hypot(ASSYUT.nodes[e.a].x-ASSYUT.start.x,ASSYUT.nodes[e.a].z-ASSYUT.start.z)<230);
 // الأغلب الساحق يمشي على الرصيف، مع عبور منظم من رصيف لآخر ونسبة نادرة بجانب الرصيف.
 for(let i=0;i<82;i++){
  const family=i%7===0,couple=!family&&i%4===0,mode=i%5===0?'fast':i%4===0?'slow':'normal';
  const pool=i<55&&near.length?near:eligible,edge=pool[i%pool.length],f=pedestrianFrame(edge);
  const gutter=i===11||i===43;
  const canCross=!family&&(i%7===1);
  const crossIn=canCross?(i===1?12:(35+(i*9)%75)):999999;
  const speed=family?.85:mode==='fast'?1.85:mode==='slow'?.75:1.25;
  const g={id:i,edge,s:4+(i*3.7)%Math.max(1,f.len-8),side:i%2===0?1:-1,speed,state:'walk',gutter,crossIn,crossProgress:0,waitTime:0,members:[],family,mode,canCross};
  const count=family?4:couple?2:1;
  for(let j=0;j<count;j++){
   const child=family&&j>=2,mesh=makePerson(pick(SHIRTS),pick(SKIN));mesh.scale.setScalar(child?.65:1.0);scene.add(mesh);
   const fVec={x:f.fx,z:f.fz};
   const spread=(j%2-.5)*.42,behind=Math.floor(j/2)*.65;
   const base=groupPosition(g);
   const px=base.x-fVec.x*behind-fVec.z*spread,pz=base.z-fVec.z*behind+fVec.x*spread;
   mesh.position.set(px,.18,pz);
   const p={mesh,speed:g.speed,phase:(i*1.3+j*.9)%6.28,child,life:g,member:j};peds.push(p);g.members.push(p);
  }
  WALKING_GROUPS.push(g);
 }
}
function crossingSafe(g){
 const f=pedestrianFrame(g.edge),center=groupPosition(g,0),width=ASSYUT.roads[g.edge.road].width;
 const crossesIn=width/Math.max(.5,g.speed)+1.1;
 for(const t of traffic){const dx=t.mesh.position.x-center.x,dz=t.mesh.position.z-center.z,along=dx*f.fx+dz*f.fz,across=-dx*f.fz+dz*f.fx;if(Math.abs(across)>width/2+2||Math.abs(along)>60)continue;const toward=(Math.cos(t.mesh.rotation.y)*f.fx-Math.sin(t.mesh.rotation.y)*f.fz)*along<0;if(toward&&t.speed>.8&&Math.abs(along)<Math.max(8,Math.min(5,crossesIn)*t.speed+4))return false;}
 const dx=car.x-center.x,dz=car.z-center.z,along=dx*f.fx+dz*f.fz,across=-dx*f.fz+dz*f.fx,toward=(Math.cos(car.heading)*f.fx-Math.sin(car.heading)*f.fz)*along*car.speed<0;
 if(typeof G!=='undefined'&&G.mode==='police'&&typeof POLICE!=='undefined'&&POLICE.siren&&Math.hypot(dx,dz)<50)return false;
 return !(Math.abs(across)<width/2+2&&toward&&Math.abs(car.speed)>.8&&Math.abs(along)<Math.max(10,Math.abs(car.speed)*4));
}
function updateAssyutPeds(dt){
 for(const g of WALKING_GROUPS){
  let f=pedestrianFrame(g.edge),moving=g.state!=='wait';
  if(g.state==='walk'){
   g.s+=g.speed*dt;g.crossIn-=dt;
   if(g.s>f.len-1){
    const choices=ASSYUT.adj[g.edge.b].map(a=>ASSYUT.edges[a.edge]).filter(e=>{if(e.b===g.edge.a||ASSYUT.roads[e.road].width<4)return false;if(INFRA?.profiles&&INFRA.profiles.has(e.road))return false;const na=ASSYUT.nodes[e.a],nb=ASSYUT.nodes[e.b];if(assyutRoadHeightAt(na.x,na.z)>0.35||assyutRoadHeightAt(nb.x,nb.z)>0.35)return false;return true;});
    if(choices.length&&Math.random()<.75){
     g.edge=pick(choices);g.s=1.2;f=pedestrianFrame(g.edge);
     const newBase=groupPosition(g);for(const p of g.members){p.mesh.position.x=newBase.x;p.mesh.position.z=newBase.z;}
    }else{
     const reverse=ASSYUT.adj[g.edge.b].map(a=>ASSYUT.edges[a.edge]).find(e=>{if(e.b!==g.edge.a)return false;if(INFRA?.profiles&&INFRA.profiles.has(e.road))return false;const na=ASSYUT.nodes[e.a],nb=ASSYUT.nodes[e.b];if(assyutRoadHeightAt(na.x,na.z)>0.35||assyutRoadHeightAt(nb.x,nb.z)>0.35)return false;return true;});
     if(reverse){
      g.edge=reverse;g.s=1.2;f=pedestrianFrame(g.edge);
      const newBase=groupPosition(g);for(const p of g.members){p.mesh.position.x=newBase.x;p.mesh.position.z=newBase.z;}
     }else{
      g.s=f.len-1.2;g.speed=-Math.abs(g.speed);
     }
    }
   }else if(g.s<1.2&&g.speed<0){
    g.speed=Math.abs(g.speed);g.s=1.2;
   }
   if(g.canCross&&g.crossIn<=0&&f.len>22&&g.s>7&&g.s<f.len-7){g.state='wait';g.crossIn=rand(50,110);g.waitTime=0;g.gutter=false;}
  }else if(g.state==='wait'){
   g.waitTime+=dt;moving=false;
   if(crossingSafe(g)){g.state='cross';g.crossProgress=0;STREET_LIFE.pedestrianYields++;}
   else if(g.waitTime>16){g.state='walk';g.crossIn=rand(30,60);}
  }else if(g.state==='cross'){
   const road=ASSYUT.roads[g.edge.road],width=road.width+2.1;
   g.crossProgress+=Math.max(1.3,g.speed*1.3)*dt/width;
   if(g.crossProgress>=1){g.side*=-1;g.state='walk';g.crossProgress=0;}
  }
  const road=ASSYUT.roads[g.edge.road];
  const sidewalkOffset=g.side*(road.width/2+(g.gutter?0.15:1.05));
  const offset=g.state==='cross'?sidewalkOffset*(1-2*g.crossProgress):sidewalkOffset;
  const base=groupPosition(g,offset);
  const direction=g.state==='cross'?{x:f.fz*g.side,z:-f.fx*g.side}:{x:f.fx,z:f.fz};
  for(const p of g.members){
   const member=p.member,spread=(member%2-.5)*.42,behind=Math.floor(member/2)*.65;
   const tx=base.x-direction.x*behind-direction.z*spread,tz=base.z-direction.z*behind+direction.x*spread;
   const dx=tx-p.mesh.position.x,dz=tz-p.mesh.position.z,dist=Math.hypot(dx,dz),step=Math.min(dist,Math.max(.6,g.speed*(p.child?1.15:1.1))*dt*2.5);
   if(dist>.01){
    p.mesh.position.x+=dx/dist*step;
    p.mesh.position.z+=dz/dist*step;
    const targetRot=Math.atan2(dx,dz);
    let rotDiff=(targetRot-p.mesh.rotation.y)%(Math.PI*2);
    if(rotDiff>Math.PI)rotDiff-=Math.PI*2;
    if(rotDiff<-Math.PI)rotDiff+=Math.PI*2;
    p.mesh.rotation.y+=rotDiff*(1-Math.exp(-dt*9.5));
   }
   const near=Math.hypot(p.mesh.position.x-car.x,p.mesh.position.z-car.z);
   if(near<2.5&&Math.abs(car.speed)>1){const awayX=p.mesh.position.x-car.x,awayZ=p.mesh.position.z-car.z,n=Math.max(.01,Math.hypot(awayX,awayZ));p.mesh.position.x+=awayX/n*dt*2;p.mesh.position.z+=awayZ/n*dt*2;if(car.hitCd<=0){car.hitCd=.8;sfxThud();setObjective('انتبه للمشاة · خفّف السرعة',1800);}}
   const walkBob=moving?Math.abs(Math.sin(p.phase*2))*.026:0;
   p.mesh.rotation.x=moving?.038:0;
   p.mesh.rotation.z=moving?Math.sin(p.phase)*.022:0;
   const elevation=g.state==='cross'?lerp(.18,.028,Math.sin(Math.min(1,Math.max(0,g.crossProgress))*Math.PI)):(g.gutter?.03:.18);
   const rh=assyutRoadHeightAt(p.mesh.position.x,p.mesh.position.z);
   const groundH=(rh>0&&rh<0.4)?rh:0;
   p.mesh.position.y=groundH+elevation+walkBob;
   p.phase+=moving?dt*g.speed*6:0;
   if(near<90)animatePerson(p.mesh,p.phase,moving?1:0);
  }
 }
}
initializePedestrianLife();
