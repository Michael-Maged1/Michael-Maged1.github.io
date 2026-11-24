/* Keep deterministic vehicle physics at 120Hz, traffic decisions at 30Hz. */
let streetAccumulator=0,budgetAccumulator=0,_lowFpsStreak=0;
let _fpsFrames=0,_fpsLastTime=performance.now();
const PERFORMANCE={trafficHz:30,drawCalls:0,triangles:0,visibleBuildings:0,fps:60};
const _scratchPos=new THREE.Vector3();
function updateStreetCadence(dt){
 streetAccumulator+=Math.min(0.066,dt);
 let steps=0;
 while(streetAccumulator>=1/30 && steps<2){
  updateTraffic(1/30);
  updateTrafficLights(1/30);
  updatePeds(1/30);
  streetAccumulator-=1/30;
  steps++;
 }
 if(streetAccumulator>=1/30)streetAccumulator=0;
}
function updateSceneBudgets(dt){
 _fpsFrames++;
 const _now=performance.now();
 if(_now-_fpsLastTime>=1000){
  PERFORMANCE.fps=Math.round((_fpsFrames*1000)/(_now-_fpsLastTime));
  _fpsFrames=0;_fpsLastTime=_now;
  if(G.state==='play'&&PERFORMANCE.fps>0&&PERFORMANCE.fps<22){
   _lowFpsStreak++;
   if(_lowFpsStreak>=4&&G.graphicsQuality!=='low'&&typeof applyGraphicsSettings==='function'){
    applyGraphicsSettings('low');
    _lowFpsStreak=0;
   }
  }else{_lowFpsStreak=0;}
 }
 budgetAccumulator+=dt;if(budgetAccumulator<.08)return;budgetAccumulator=0;
 const q=typeof G!=='undefined'?G.graphicsQuality:'medium';
 const MAX_BLDG_DIST=q==='low'?140:q==='high'?225:175,MAX_BLDG_DIST2=MAX_BLDG_DIST*MAX_BLDG_DIST;
 const DETAIL_DIST=q==='low'?45:q==='high'?75:55,DETAIL_DIST2=DETAIL_DIST*DETAIL_DIST;
 const TRAFFIC_VIS=q==='low'?130:q==='high'?200:155,TRAFFIC_VIS2=TRAFFIC_VIS*TRAFFIC_VIS;
 const PED_VIS=q==='low'?50:q==='high'?85:65,PED_VIS2=PED_VIS*PED_VIS;
 const SIGN_VIS=q==='low'?110:150,SIGN_VIS2=SIGN_VIS*SIGN_VIS;
 const cx=G.state==='menu'?camera.position.x:car.x,cz=G.state==='menu'?camera.position.z:car.z;
 for(const sign of REAL_CITY.signs||[]){
  sign.getWorldPosition(_scratchPos);
  const dx=_scratchPos.x-cx,dz=_scratchPos.z-cz;
  if(Math.abs(dx)>SIGN_VIS||Math.abs(dz)>SIGN_VIS){sign.visible=false;continue;}
  sign.visible=(dx*dx+dz*dz)<SIGN_VIS2;
 }
 let visible=0;
 for(const b of REAL_CITY.buildings){
  const dx=b.x-cx,dz=b.z-cz;
  if(Math.abs(dx)>MAX_BLDG_DIST||Math.abs(dz)>MAX_BLDG_DIST){b.mesh.visible=false;continue;}
  const d2=dx*dx+dz*dz;
  const isVis=d2<MAX_BLDG_DIST2;
  b.mesh.visible=isVis;
  if(!isVis)continue;
  visible++;
  const showDetails=d2<DETAIL_DIST2;
  for(let i=1;i<b.mesh.children.length;i++)b.mesh.children[i].visible=showDetails;
 }
 for(const t of traffic){
  const dx=t.mesh.position.x-cx,dz=t.mesh.position.z-cz;
  if(Math.abs(dx)>TRAFFIC_VIS||Math.abs(dz)>TRAFFIC_VIS){t.mesh.visible=false;continue;}
  t.mesh.visible=(dx*dx+dz*dz)<TRAFFIC_VIS2;
 }
 for(const p of peds){
  const dx=p.mesh.position.x-cx,dz=p.mesh.position.z-cz;
  if(Math.abs(dx)>PED_VIS||Math.abs(dz)>PED_VIS){p.mesh.visible=false;continue;}
  p.mesh.visible=(dx*dx+dz*dz)<PED_VIS2;
 }
 PERFORMANCE.visibleBuildings=visible;PERFORMANCE.drawCalls=renderer.info?.render.calls||0;PERFORMANCE.triangles=renderer.info?.render.triangles||0;
}

// Architecture never moves; avoid recomputing thousands of static world transforms per frame.
REAL_CITY.group.updateMatrixWorld(true);
REAL_CITY.group.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
REAL_CITY.group.updateMatrixWorld=function(){};
