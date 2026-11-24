/* Keep deterministic vehicle physics at 120Hz, traffic decisions at 30Hz. */
let streetAccumulator=0,budgetAccumulator=0;
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
 }
 budgetAccumulator+=dt;if(budgetAccumulator<.08)return;budgetAccumulator=0;
 const cx=G.state==='menu'?camera.position.x:car.x,cz=G.state==='menu'?camera.position.z:car.z;
 for(const sign of REAL_CITY.signs||[]){
  sign.getWorldPosition(_scratchPos);
  const dx=_scratchPos.x-cx,dz=_scratchPos.z-cz;
  if(Math.abs(dx)>160||Math.abs(dz)>160){sign.visible=false;continue;}
  sign.visible=(dx*dx+dz*dz)<160*160;
 }
 let visible=0;
 const MAX_BLDG_DIST=230,MAX_BLDG_DIST2=230*230,DETAIL_DIST2=75*75;
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
 const TRAFFIC_VIS2=200*200;
 for(const t of traffic){
  const dx=t.mesh.position.x-cx,dz=t.mesh.position.z-cz;
  if(Math.abs(dx)>200||Math.abs(dz)>200){t.mesh.visible=false;continue;}
  t.mesh.visible=(dx*dx+dz*dz)<TRAFFIC_VIS2;
 }
 const PED_VIS2=85*85;
 for(const p of peds){
  const dx=p.mesh.position.x-cx,dz=p.mesh.position.z-cz;
  if(Math.abs(dx)>85||Math.abs(dz)>85){p.mesh.visible=false;continue;}
  p.mesh.visible=(dx*dx+dz*dz)<PED_VIS2;
 }
 PERFORMANCE.visibleBuildings=visible;PERFORMANCE.drawCalls=renderer.info?.render.calls||0;PERFORMANCE.triangles=renderer.info?.render.triangles||0;
}

// Architecture never moves; avoid recomputing thousands of static world transforms per frame.
REAL_CITY.group.updateMatrixWorld(true);
REAL_CITY.group.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
REAL_CITY.group.updateMatrixWorld=function(){};
