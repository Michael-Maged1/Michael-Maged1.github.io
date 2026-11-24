const VEHICLE_SIGNALS={brake:false,reverse:false,left:false,right:false,blink:0,manual:0,hazards:false};
/* Exact surface-measured lamp sockets (FL/RL positive half-widths mirrored across Z=0) for each imported vehicle GLB. */
function getUploadedLampAnchorsTable(){
 return {
  qashqai:{head:[2.00,.85,.61],frontTurn:[1.93,.88,.75],brake:[-2.04,1.03,.66],reverse:[-2.10,1.03,.46],rearTurn:[-2.00,1.03,.75]},
  roadster:{head:[1.85,.75,.61],frontTurn:[1.77,.76,.74],brake:[-1.94,.86,.61],reverse:[-2.00,.82,.47],rearTurn:[-1.89,.88,.70]},
  micra:{head:[1.61,.79,.59],frontTurn:[1.56,.82,.65],brake:[-1.69,.77,.63],reverse:[-1.74,.69,.54],rearTurn:[-1.71,.75,.73]},
  sentra18:{head:[2.13,.71,.54],frontTurn:[2.04,.75,.66],brake:[-2.14,.88,.61],reverse:[-2.18,.84,.44],rearTurn:[-2.10,.89,.73]},
  sport370:{head:[1.83,.67,.61],frontTurn:[1.76,.68,.73],brake:[-1.95,.76,.59],reverse:[-2.00,.74,.46],rearTurn:[-1.91,.80,.70]},
  epower:{head:[2.08,.68,.63],frontTurn:[1.97,.72,.78],brake:[-2.17,.90,.62],reverse:[-2.22,.91,.43],rearTurn:[-2.10,.92,.76]},
  versa:{head:[2.00,.68,.58],frontTurn:[1.96,.68,.56],brake:[-2.04,.88,.63],reverse:[-2.08,.84,.52],rearTurn:[-2.02,.85,.63]},
  xtrail:{head:[2.15,.75,.61],frontTurn:[1.96,.95,.73],brake:[-2.13,1.15,.64],reverse:[-2.17,1.16,.47],rearTurn:[-2.05,1.14,.77]},
  altima:{head:[2.21,.66,.61],frontTurn:[2.03,.71,.79],brake:[-2.25,.90,.62],reverse:[-2.31,.90,.44],rearTurn:[-2.20,.87,.75]},
  fiat1300:{head:[1.88,.61,.51],frontTurn:[1.79,.61,.68],brake:[-1.95,.72,.52],reverse:[-1.95,.72,.47],rearTurn:[-1.92,.72,.61]},
  policeSuburban:{head:[2.48,.93,.80],frontTurn:[2.55,1.00,.84],brake:[-2.62,1.04,.84],reverse:[-2.65,.92,.84],rearTurn:[-2.64,1.14,.85]},
  policeDuster:{head:[1.98,.78,.68],frontTurn:[1.90,.82,.74],brake:[-2.03,.92,.74],reverse:[-2.06,.86,.62],rearTurn:[-2.00,.94,.77]}
 };
}
function getVehicleLampAnchors(c,visual){
 const key=c?.asset||c?.id,exact=getUploadedLampAnchorsTable()[key];
 if(exact)return exact;
 const box=visual?new THREE.Box3().setFromObject(visual):null;
 const maxX=box&&isFinite(box.max.x)?box.max.x:(c?.length||4.4)/2,minX=box&&isFinite(box.min.x)?box.min.x:-(c?.length||4.4)/2;
 const h=box&&isFinite(box.max.y)?box.max.y:1.55,hw=c?.halfWidth||.9;
 return{head:[maxX-.14,h*.48,hw*.66],frontTurn:[maxX-.18,h*.50,hw*.77],brake:[minX+.06,h*.56,hw*.70],reverse:[minX+.04,h*.52,hw*.52],rearTurn:[minX+.07,h*.56,hw*.79]};
}
function createVehicleSignals(c,visual){
 const group=new THREE.Group(),brakeMats=[],a=getVehicleLampAnchors(c,visual);
 const lens=(x,y,z,color,w=.12,ht=.062)=>{const mat=new THREE.MeshBasicMaterial({color,toneMapped:false,transparent:true,opacity:1});const mesh=new THREE.Mesh(new THREE.BoxGeometry(.034,ht,w),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const brakes=[],reverse=[],left=[],right=[];
 if(c.id==='policeSuburban'){
  for(const side of [-1,1]){reverse.push(lens(a.reverse[0],a.reverse[1],side*a.reverse[2],0xf3f7ff,.075,.055));const target=side<0?left:right;target.push(lens(a.frontTurn[0],a.frontTurn[1],side*a.frontTurn[2],0xffae18,.085,.055),lens(a.rearTurn[0],a.rearTurn[1],side*a.rearTurn[2],0xffae18,.085,.055));}
  group.traverse(o=>{if(o.isMesh){o.scale.x=.35;o.scale.y=.65;}});
 }else if(!c.police)
 for(const side of [-1,1]){brakes.push(lens(a.brake[0]-.008,a.brake[1],side*a.brake[2],0xff2420,.14,.062));reverse.push(lens(a.reverse[0]-.01,a.reverse[1],side*a.reverse[2],0xf3f7ff,.10,.052));const target=side<0?left:right;target.push(lens(a.frontTurn[0]+.01,a.frontTurn[1],side*a.frontTurn[2],0xffae18,.11,.052),lens(a.rearTurn[0]-.01,a.rearTurn[1],side*a.rearTurn[2],0xffae18,.10,.052));}
 if(visual)visual.traverse(o=>{if(o.isMesh&&/red.?glass|brakelight|back_lights|red_lens|weideng|glass_solid_red|glass_basic_red/i.test(o.material?.name||''))brakeMats.push(o.material);});
 return {group,brakes,reverse,left,right,brakeMats,anchors:a};
}
function updateVehicleSignals(dt){
 const s=VEHICLE_SIGNALS;s.blink=(s.blink+dt)% .9;
 const braking=keys.KeyS||keys.ArrowDown||touch.brk||keys.Space||touch.hb;
 s.brake=!!braking&&car.speed>-.15;s.reverse=car.speed<-.15;
 const steer=(keys.KeyA||keys.ArrowLeft||touch.left?1:0)-(keys.KeyD||keys.ArrowRight||touch.right?1:0);
 s.left=s.hazards||s.manual===-1||(!s.manual&&steer>0);s.right=s.hazards||s.manual===1||(!s.manual&&steer<0);
 const rig=taxiRig.signals;if(!rig)return;
 for(const o of rig.brakes){o.material.color.setHex(s.brake?0xff1410:0x67130f);o.material.opacity=s.brake?1:.35;}
 for(const m of rig.brakeMats){m.emissive.setHex(0xff2416);m.emissiveIntensity=s.brake?2:.08;}
 for(const o of rig.reverse)o.visible=s.reverse;
 for(const o of rig.left)o.visible=s.left&&s.blink<.45;
 for(const o of rig.right)o.visible=s.right&&s.blink<.45;
}
addEventListener('keydown',e=>{if(G.state!=='play'||e.repeat)return;if(e.code==='KeyQ')VEHICLE_SIGNALS.manual=VEHICLE_SIGNALS.manual===-1?0:-1;if(e.code==='KeyE')VEHICLE_SIGNALS.manual=VEHICLE_SIGNALS.manual===1?0:1;if(e.code==='KeyZ')VEHICLE_SIGNALS.hazards=!VEHICLE_SIGNALS.hazards;});
