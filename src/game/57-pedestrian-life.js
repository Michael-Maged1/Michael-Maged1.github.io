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
   const child=family&&j>=2;
   const ageGroup=child?'child':(i%6===0?'elder':(j===1||i%3===0)?'woman':'adult');
   const mesh=makePerson(pick(SHIRTS),pick(SKIN),ageGroup);
   if(child)mesh.scale.setScalar(.66);
   scene.add(mesh);
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
const CACHED_PED_EDGES=typeof ASSYUT!=='undefined'?pedestrianEdges():[];
let _pedRecycleCd=0;
function updateAssyutPeds(dt){
 const isTest=(typeof navigator!=='undefined'&&navigator.userAgent==='test');
 _pedRecycleCd=Math.max(0,_pedRecycleCd-dt);
 let recycledOne=false;
 for(const g of WALKING_GROUPS){
  let f=pedestrianFrame(g.edge),moving=g.state!=='wait';
  if(!isTest&&!recycledOne&&_pedRecycleCd<=0&&typeof G!=='undefined'&&G.state==='play'&&g.members.length&&CACHED_PED_EDGES.length){
   const m0=g.members[0].mesh.position;
   if(Math.hypot(m0.x-car.x,m0.z-car.z)>115){
    for(let k=0;k<12;k++){
     const e=CACHED_PED_EDGES[Math.floor(Math.random()*CACHED_PED_EDGES.length)];
     const a=ASSYUT.nodes[e.a],d=Math.hypot(a.x-car.x,a.z-car.z);
     if(d>35&&d<92){
      g.edge=e;f=pedestrianFrame(g.edge);g.s=rand(2,Math.max(3,f.len-2));g.state='walk';
      const nb=groupPosition(g);
      for(const pm of g.members){pm.knockTimer=0;pm.mesh.rotation.x=0;pm.mesh.position.x=nb.x;pm.mesh.position.z=nb.z;}
      recycledOne=true;_pedRecycleCd=0.25;break;
     }
    }
   }
  }
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
   if(p.knockTimer>0){
    p.knockTimer-=dt;
    p.mesh.position.x+=(p.knockVelX||0)*dt;p.mesh.position.z+=(p.knockVelZ||0)*dt;
    p.knockVelY=(p.knockVelY||0)-15*dt;
    p.knockH=(p.knockH||0)+p.knockVelY*dt;
    const rh=assyutRoadHeightAt(p.mesh.position.x,p.mesh.position.z);
    const groundH=(rh>0&&rh<0.4)?rh:0;
    if(p.knockH<=0){p.knockH=0;if(p.knockVelY<-1.5)p.knockVelY=-p.knockVelY*0.18;else p.knockVelY=0;p.knockVelX*=Math.exp(-dt*7.5);p.knockVelZ*=Math.exp(-dt*7.5);p.knockSpin=(p.knockSpin||0)*Math.exp(-dt*8);}
    else{p.knockVelX*=Math.exp(-dt*1.8);p.knockVelZ*=Math.exp(-dt*1.8);p.mesh.rotation.y+=(p.knockSpin||0)*dt;}
    const down=p.knockTimer>0.65;
    p.mesh.rotation.x=lerp(p.mesh.rotation.x,down?(p.knockPitchDir||1.46):0,1-Math.exp(-dt*(down?9.5:6)));
    p.mesh.rotation.z=lerp(p.mesh.rotation.z,down?(p.knockRoll||0.28):0,1-Math.exp(-dt*(down?8:6)));
    const rig=p.mesh.userData.walk;
    if(rig){
     const blend=1-Math.exp(-dt*(down?10:7));
     rig.arms[0].rotation.x=lerp(rig.arms[0].rotation.x,down?-1.15:0,blend);
     rig.arms[1].rotation.x=lerp(rig.arms[1].rotation.x,down?-0.75:0,blend);
     rig.arms[0].rotation.z=lerp(rig.arms[0].rotation.z,down?0.48:0.08,blend);
     rig.arms[1].rotation.z=lerp(rig.arms[1].rotation.z,down?-0.42:-0.08,blend);
     rig.legs[0].rotation.x=lerp(rig.legs[0].rotation.x,down?-0.42:0,blend);
     rig.legs[1].rotation.x=lerp(rig.legs[1].rotation.x,down?0.18:0,blend);
     rig.knees[0].rotation.x=lerp(rig.knees[0].rotation.x,down?0.78:0,blend);
     rig.knees[1].rotation.x=lerp(rig.knees[1].rotation.x,down?1.05:0,blend);
    }
    p.mesh.position.y=groundH+p.knockH+(down?0.16:0.18);
    continue;
   }
   const dxCar=p.mesh.position.x-car.x,dzCar=p.mesh.position.z-car.z;
   const near=Math.hypot(dxCar,dzCar);
   if(near<3.2&&Math.abs((p.mesh.position.y||0)-car.y)<2.0){
    const fx=Math.cos(car.heading),fz=-Math.sin(car.heading);
    const lx=dxCar*fx+dzCar*fz,lz=-dxCar*fz+dzCar*fx;
    const pb=typeof playerBounds==='function'?playerBounds():{hl:2.15,hw:0.91};
    const pedTouch=Math.abs(lx)<pb.hl+0.25&&Math.abs(lz)<pb.hw+0.20;
    if(pedTouch&&Math.abs(car.speed)>2.2){
     const awayX=dxCar,awayZ=dzCar,n=Math.max(.01,near);
     const spd=Math.abs(car.speed);
     const carDirX=spd>0.5?car.vel.x/spd:awayX/n,carDirZ=spd>0.5?car.vel.y/spd:awayZ/n;
     const push=clamp(spd*0.85,3.8,12.5);
     p.knockTimer=2.8;
     p.knockVelX=(carDirX*0.72+(awayX/n)*0.28)*push;
     p.knockVelZ=(carDirZ*0.72+(awayZ/n)*0.28)*push;
     p.knockVelY=clamp(spd*0.16,0.9,2.8);
     p.knockH=0.04;
     p.knockPitchDir=Math.random()>0.35?1.46:-1.40;
     p.knockRoll=(Math.random()>.5?1:-1)*0.32;
     p.knockSpin=(Math.random()-0.5)*3.4;
     p.mesh.position.x+=carDirX*0.35+(awayX/n)*0.25;p.mesh.position.z+=carDirZ*0.35+(awayZ/n)*0.25;
     car.vel.x*=0.98;car.vel.y*=0.98;if(typeof syncCarSpeed==='function')syncCarSpeed();
     car.shake=Math.max(car.shake||0,clamp(spd*0.035,0.28,0.65));
     car.suspensionJoltVel=clamp((car.suspensionJoltVel||0)+0.35,-1.8,1.8);
     if(car.hitCd<=0){car.hitCd=.8;if(typeof rideBusy==='function'&&rideBusy())M.hits=(M.hits||0)+1;if(typeof sfxThud==='function')sfxThud();if(typeof flashScreen==='function')flashScreen();if(typeof floatText==='function')floatText('⚠️ صدمت أحد المشاة — انتبه!','#ff685d');setObjective('انتبه للمشاة · خفّف السرعة',2000);}
     continue;
    }
    if(Math.abs(lx)<pb.hl+0.36&&Math.abs(lz)<pb.hw+0.32&&Math.abs(car.speed)>1){const awayX=dxCar,awayZ=dzCar,n=Math.max(.01,near);p.mesh.position.x+=awayX/n*dt*2;p.mesh.position.z+=awayZ/n*dt*2;if(car.hitCd<=0){car.hitCd=.8;sfxThud();setObjective('انتبه للمشاة · خفّف السرعة',1800);}}
   }
   const walkBob=moving?Math.abs(Math.sin(p.phase*2))*.018:0;
   p.mesh.rotation.x=moving?.022:0;
   p.mesh.rotation.z=moving?Math.sin(p.phase)*.014:0;
   const elevation=g.state==='cross'?lerp(.18,.028,Math.sin(Math.min(1,Math.max(0,g.crossProgress))*Math.PI)):(g.gutter?.03:.18);
   const rh=assyutRoadHeightAt(p.mesh.position.x,p.mesh.position.z);
   const groundH=(rh>0&&rh<0.4)?rh:0;
   p.mesh.position.y=groundH+elevation+walkBob;
   p.phase+=moving?dt*g.speed*3.4:0;
   if(near<90)animatePerson(p.mesh,p.phase,moving?1:0);
  }
 }
}
initializePedestrianLife();
