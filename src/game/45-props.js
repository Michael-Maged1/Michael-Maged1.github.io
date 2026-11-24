/* ------------------------- أعمدة نور الشوارع ------------------------- */
{
  const lampPos = [];
  const nearVertical = x => V_STREETS.some(v => Math.abs(x - v.x) < v.half + 3);
  const nearHorizontal = z => H_STREETS.some(h => Math.abs(z - h.z) < h.half + 3);

  for (const h of H_STREETS) {
    if (h.kind === 'corniche') continue;
    const step = h.kind === 'wide' ? 58 : 70;
    for (let x = -HALF + 34; x < HALF - 34; x += step) {
      for (const s of [-1, 1]) {
        const px = x + (s > 0 ? 0 : step / 2);
        const pz = h.z + s * (h.half + 1.5);
        if (nearVertical(px)) continue;
        lampPos.push({ x: px, z: pz, nx: 0, nz: -s });
      }
    }
  }
  for (const v of V_STREETS) {
    if (v.kind !== 'wide') continue;
    for (let z = 34; z < CITY_Z1 - 26; z += 58) {
      for (const s of [-1, 1]) {
        const px = v.x + s * (v.half + 1.5);
        const pz = z + (s > 0 ? 0 : 29);
        if (nearHorizontal(pz)) continue;
        lampPos.push({ x: px, z: pz, nx: -s, nz: 0 });
      }
    }
  }

  for(let i=lampPos.length-1;i>=0;i--)if(onDrivingRoad(lampPos[i].x,lampPos[i].z,.2))lampPos.splice(i,1);
  ROAD_FURNITURE.push(...lampPos.map(p=>({x:p.x,z:p.z,kind:"streetlight"})));
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f3946, roughness: .65, metalness: .35 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .11, 7, 6), poleMat, lampPos.length);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, .12, .16), poleMat, lampPos.length);
  const heads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(.23, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8 }),
    lampPos.length
  );
  const pools = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffb060, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    lampPos.length
  );

  const glowPts = [];
  lampPos.forEach((p, i) => {
    dummy.position.set(p.x, 3.5, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x + p.nx * .68, 6.88, p.z + p.nz * .68);
    dummy.rotation.set(0, Math.atan2(-p.nz, p.nx), 0);
    dummy.updateMatrix();
    arms.setMatrixAt(i, dummy.matrix);

    const hx = p.x + p.nx * 1.42, hz = p.z + p.nz * 1.42;
    dummy.position.set(hx, 6.78, hz);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x + p.nx * 3.2, .045, p.z + p.nz * 3.2);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(5.4, 5.4, 1);
    dummy.updateMatrix();
    pools.setMatrixAt(i, dummy.matrix);

    glowPts.push(hx, 6.72, hz);
  });
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);

  for (const m of [poles, arms, heads, pools]) {
    m.frustumCulled = false;
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  }

  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPts, 3));
  const glowMat = new THREE.PointsMaterial({
    map: GLOW_TEX, color: 0xffc880, size: 9, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lampGlow = new THREE.Points(glowGeo, glowMat);
  lampGlow.frustumCulled = false;
  scene.add(lampGlow);

  nightGlows.push({ mat: glowMat, day: 0, night: .95 });
  nightGlows.push({ mat: pools.material, day: 0, night: .34 });
}

/* أفق بعيد عبر البحر */
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x51456a, roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const w = rand(20, 58), h = rand(16, 62), d = rand(16, 30);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(rand(-1500, 1500), h / 2 - 1, rand(-640, -520));
    scene.add(b);
  }

}

/* ------------------------- النخيل (جذوع حلقية + سعف متهدل + نخيل الجزيرة الوسطى) ------------------------- */
const TREES = [];
{
  const positions = [];
  for (let x = -HALF + 12; x < HALF - 12; x += 26) {
    if (Math.random() < .18) continue;
    positions.push({ x: x + rand(-3, 3), z: -21.4 + rand(-1, 1), h: rand(7.5, 11) });
    if (Math.random() < .8) positions.push({ x: x + rand(-6, 6), z: 21.4 + rand(-1, 1), h: rand(7.5, 11) });
  }
  // نخيل الجزيرة الوسطى (الكورنيش) زي الفيديو
  for (let x = -HALF + 32; x < HALF - 32; x += 38) {
    if (V_STREETS.some(v => Math.abs(x - v.x) < v.half + 5)) continue;
    positions.push({ x: x + rand(-2, 2), z: rand(-.2, .2), h: rand(8.5, 11.8) });
  }
  // نخيل جوه المدينة على أرصفة الشوارع
  for (const line of [{ z: 64, h: 5.5 }, { z: 140, h: 11 }, { z: 210, h: 5 }, { z: 274, h: 12 }]) {
    for (let x = -HALF + 40; x < HALF - 40; x += 44) {
      if (V_STREETS.some(v => Math.abs(x - v.x) < v.half + 5)) continue;
      for (const s of [-1, 1]) {
        if (Math.random() < .35) continue;
        positions.push({ x: x + rand(-2, 2), z: line.z + s * (line.h + 1.5), h: rand(6.5, 9.5) });
      }
    }
  }
  for(let i=positions.length-1;i>=0;i--){
    const p=positions[i];
    if(onDrivingRoad(p.x,p.z,.5))positions.splice(i,1);
  }
  for (const p of positions) TREES.push({ x: p.x, z: p.z, r: .55 });

  const barkTex = canvasTex(64, 128, g => {
    g.fillStyle = '#5c4128'; g.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 8) {
      g.fillStyle = y % 16 ? '#46301c' : '#6c4d32';
      g.fillRect(0, y, 64, 5);
    }
  });
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
  barkTex.repeat.set(1, 5);

  const trunkGeo = new THREE.CylinderGeometry(.22, .40, 6.5, 7);
  trunkGeo.translate(0, 3.25, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: .95 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  trunks.castShadow = true;
  trunks.frustumCulled = false;
  positions.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, rand(0, 6.28), rand(-.05, .05));
    dummy.scale.set(1, p.h / 6.5, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  scene.add(trunks);

  const leafGeo = new THREE.ConeGeometry(.42, 3.6, 5);
  leafGeo.translate(0, 1.8, 0);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2c6e3d, roughness: .9, flatShading: true, side: THREE.DoubleSide,
  });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, positions.length * 10);
  leaves.castShadow = true;
  leaves.frustumCulled = false;
  let li = 0;
  for (const p of positions) {
    for (let k = 0; k < 10; k++) {
      dummy.position.set(p.x, p.h - .15, p.z);
      dummy.rotation.set(0, k * (Math.PI * 2 / 10) + rand(-.12, .12), rand(1.1, 1.65));
      dummy.scale.set(rand(.85, 1.15), rand(.9, 1.15), rand(.85, 1.15));
      dummy.updateMatrix();
      leaves.setMatrixAt(li++, dummy.matrix);
    }
  }
  scene.add(leaves);
}

/* ------------------------- أعمدة نور الكورنيش الكلاسيكية (فانوسين) ------------------------- */
{
  const lampPos = [];
  for(let x=-HALF+8;x<HALF;x+=32){for(const p of [{x,z:-21.5},{x:x+16,z:21.8}])if(!onDrivingRoad(p.x,p.z)){lampPos.push(p);ROAD_FURNITURE.push({...p,kind:'lamp'});}}
  const poleGeo = new THREE.CylinderGeometry(.11, .19, 7.6, 8);
  poleGeo.translate(0, 3.8, 0);
  const metal = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: .5, metalness: .55 });
  const poles = new THREE.InstancedMesh(poleGeo, metal, lampPos.length);
  poles.castShadow = true;
  poles.frustumCulled = false;

  const armGeo = new THREE.BoxGeometry(2.4, .12, .12);
  const arms = new THREE.InstancedMesh(armGeo, metal, lampPos.length);
  arms.frustumCulled = false;

  const lanternGeo = new THREE.CylinderGeometry(.22, .15, .52, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4a0 });
  const bulbs = new THREE.InstancedMesh(lanternGeo, bulbMat, lampPos.length * 2);
  bulbs.frustumCulled = false;

  const glowPositions = [];
  let bi = 0;
  lampPos.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, 7.55, p.z);
    dummy.updateMatrix();
    arms.setMatrixAt(i, dummy.matrix);

    for (const s of [-1, 1]) {
      const bx = p.x + s * 1.15;
      dummy.position.set(bx, 7.30, p.z);
      dummy.updateMatrix();
      bulbs.setMatrixAt(bi++, dummy.matrix);
      glowPositions.push(bx, 7.30, p.z);
    }
  });
  scene.add(poles, arms, bulbs);

  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3));
  const glowMat = new THREE.PointsMaterial({
    map: GLOW_TEX, color: 0xffc070, size: 1.4, sizeAttenuation: true,
    transparent: true, opacity: .85, blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glows = new THREE.Points(glowGeo, glowMat);
  glows.frustumCulled = false;
  scene.add(glows);
  nightGlows.push({ mat: glowMat, day: .15, night: .95 });
}

/* ------------------------- شجيرات الجزيرة ------------------------- */
{
  const bushGeo = new THREE.SphereGeometry(1, 8, 6);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x56634a, roughness: .98, flatShading: false });
  const count = Math.ceil(WORLD / 24);
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, count);
  let n = 0;
  for (let x = -HALF + 16; x < HALF; x += 24) {
    if(V_STREETS.some(v=>Math.abs(x-v.x)<v.half+5))continue;
    dummy.position.set(x + rand(-4, 4), .68, rand(-.35, .35));
    dummy.rotation.set(0, rand(0, 6), 0);
    dummy.scale.set(rand(.55, .95), rand(.45, .72), rand(.55, .95));
    dummy.updateMatrix();
    bushes.setMatrixAt(n++, dummy.matrix);
  }
  bushes.count = n;
  bushes.frustumCulled = false;
  scene.add(bushes);
}

/* ------------------------- مواقف ومهملات ------------------------- */
{
  const signBoard = canvasTex(256, 128, g => {
    g.fillStyle = '#0b2a4a'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#ffc61a'; g.lineWidth = 6; g.strokeRect(4, 4, 248, 120);
    g.fillStyle = '#ffc61a'; g.font = '900 46px Cairo, Tahoma, Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('موقف', 128, 48);
    g.fillStyle = '#fff'; g.font = '700 24px Cairo, Tahoma, Arial';
    g.fillText('ASSIUT', 128, 96);
  });
  for (let x = -HALF + 90; x < HALF - 60; x += 260) {
    if(onDrivingRoad(x,22.9))continue;ROAD_FURNITURE.push({x,z:22.9,kind:'sign'});
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(.07, .07, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: .7 })
    );
    pole.position.set(x, 1.5, 22.9);
    scene.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, .9),
      new THREE.MeshBasicMaterial({ map: signBoard, side: THREE.DoubleSide })
    );
    board.position.set(x, 3.1, 22.9);
    board.rotation.y = Math.PI / 2;
    scene.add(board);
  }
}

/* Large, lane-facing signals. Every ground mast is placed outside the carriageway. */
const TRAFFIC_LIGHTS=[];
function signalHead(ix,axis,dir){
 const post=axis==='x'?{x:ix.x-dir*(ix.halfX+2.2),z:ix.z+dir*(ix.halfZ+2.5)}:{x:ix.x-dir*(ix.halfX+2.5),z:ix.z-dir*(ix.halfZ+2.2)};
 const center=axis==='x'?{x:post.x,z:ix.z+dir*Math.min(9.4,ix.halfZ*.58)}:{x:ix.x-dir*ix.halfX*.5,z:post.z};
 const metal=new THREE.MeshStandardMaterial({color:0x303633,metalness:.35,roughness:.55});
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.14,.19,7.1,12),metal);mast.position.set(post.x,3.55,post.z);mast.castShadow=true;scene.add(mast);
 ROAD_FURNITURE.push({...post,kind:'signal'});
 const arm=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?.18:Math.abs(center.x-post.x)+.25,.18,axis==='x'?Math.abs(center.z-post.z)+.25:.18),metal);arm.position.set((post.x+center.x)/2,7.0,(post.z+center.z)/2);scene.add(arm);
 const head=new THREE.Group();head.position.set(center.x,5.92,center.z);head.rotation.y=axis==='x'?(dir>0?-Math.PI/2:Math.PI/2):(dir>0?Math.PI:0);
 const back=new THREE.Mesh(new THREE.BoxGeometry(1.12,2.75,.32),new THREE.MeshStandardMaterial({color:0x151b18,roughness:.7}));head.add(back);
 const trim=new THREE.Mesh(new THREE.BoxGeometry(1.24,2.89,.16),new THREE.MeshStandardMaterial({color:0xc6bf91,roughness:.86}));trim.position.z=-.18;head.add(trim);
 const make=(y,color)=>{const mat=new THREE.MeshBasicMaterial({color,toneMapped:false});const disk=new THREE.Mesh(new THREE.CircleGeometry(.315,28),mat);disk.position.set(0,y,.171);head.add(disk);
 const shade=new THREE.Mesh(new THREE.TorusGeometry(.334,.044,6,28),new THREE.MeshStandardMaterial({color:0x111613,roughness:.9}));shade.position.set(0,y,.22);head.add(shade);
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.position.set(0,y,.25);glow.scale.set(1.8,1.8,1);head.add(glow);return {mat,glow};};
 const r=make(.83,0xff1610),y=make(0,0xffc323),gr=make(-.83,0x1bff64);scene.add(head);
 // A visible stop line corresponds to the front-bumper crossing used for fines.
 const stop=axis==='x'?ix.x-dir*(ix.halfX+2.5):ix.z-dir*(ix.halfZ+2.5);
 const line=new THREE.Mesh(new THREE.PlaneGeometry(axis==='x'?.44:ix.halfX-.9,axis==='x'?ix.halfZ-.9:.44),new THREE.MeshStandardMaterial({color:0xe2dfcc,roughness:.9}));line.rotation.x=-Math.PI/2;
 line.position.set(axis==='x'?stop:ix.x-dir*ix.halfX*.5,.036,axis==='x'?ix.z+dir*ix.halfZ*.5:stop);scene.add(line);
 return {r:r.mat,y:y.mat,gr:gr.mat,redGlow:r.glow,yellowGlow:y.glow,greenGlow:gr.glow};
}
for(const ix of [
 {x:-480,z:0,halfX:12,halfZ:ROAD_HALF,phase:0},{x:0,z:0,halfX:12,halfZ:ROAD_HALF,phase:6},{x:480,z:0,halfX:12,halfZ:ROAD_HALF,phase:12},{x:960,z:0,halfX:12,halfZ:ROAD_HALF,phase:18},
 {x:-480,z:140,halfX:12,halfZ:11,phase:9},{x:0,z:140,halfX:12,halfZ:11,phase:15},{x:480,z:140,halfX:12,halfZ:11,phase:3}
])TRAFFIC_LIGHTS.push({...ix,timer:ix.phase,xState:'green',zState:'red',xBulbs:[signalHead(ix,'x',1),signalHead(ix,'x',-1)],zBulbs:[signalHead(ix,'z',1),signalHead(ix,'z',-1)]});
function updateTrafficLights(dt){
 for(const tl of TRAFFIC_LIGHTS){tl.timer=(tl.timer+dt)%28;if(tl.timer<12){tl.xState='green';tl.zState='red';}else if(tl.timer<15){tl.xState='yellow';tl.zState='red';}else if(tl.timer<25){tl.xState='red';tl.zState='green';}else{tl.xState='red';tl.zState='yellow';}
 for(const [list,state]of [[tl.xBulbs,tl.xState],[tl.zBulbs,tl.zState]])for(const b of list){b.r.color.setHex(state==='red'?0xff1610:0x180705);b.y.color.setHex(state==='yellow'?0xffc323:0x181405);b.gr.color.setHex(state==='green'?0x1bff64:0x051309);if(b.redGlow){b.redGlow.visible=state==='red';b.yellowGlow.visible=state==='yellow';b.greenGlow.visible=state==='green';}}
 }
}
function signalAhead(){
 if(typeof ASSYUT!=='undefined')return assyutSignalAhead();
 let best=null;
 for(const tl of TRAFFIC_LIGHTS){for(const axis of ['x','z']){const forward=axis==='x'?Math.cos(car.heading):-Math.sin(car.heading);if(Math.abs(forward)<.72)continue;const dir=forward>0?1:-1,across=axis==='x'?Math.abs(car.z-tl.z):Math.abs(car.x-tl.x),half=axis==='x'?tl.halfZ:tl.halfX;if(across>half-.5)continue;
 const stop=(axis==='x'?tl.x:tl.z)-dir*((axis==='x'?tl.halfX:tl.halfZ)+2.5),pos=axis==='x'?car.x:car.z,distance=(stop-pos)*dir-vehicleParameters().halfLength;
 if(distance>=-2&&distance<110&&(!best||distance<best.distance))best={light:tl,axis,dir,distance,state:axis==='x'?tl.xState:tl.zState};}}
 return best;
}
function updateSignalHint(){const el=$('trafficSignalHint');if(!el)return;const signal=G.state==='play'?signalAhead():null;el.classList.toggle('hidden',!signal);if(!signal)return;
 const labels={red:'قف · إشارة حمراء',yellow:'استعد للتوقف',green:'إشارة خضراء'},colors={red:'#ff5148',yellow:'#ffd35b',green:'#63e89c'};el.style.setProperty('--signal-color',colors[signal.state]);el.innerHTML=`<i></i><span>${labels[signal.state]}</span><b>${Math.max(0,Math.round(signal.distance))} م</b>`;}
updateTrafficLights(0);
