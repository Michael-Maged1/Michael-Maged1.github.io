/* ------------------------- الناس ------------------------- */
const SKIN = [0xc58a5e, 0xa86f4a, 0x8a5738, 0xd9a477, 0x6f442c];
const SHIRTS = [0xd94f3d, 0x3d6bd9, 0x3f8f6b, 0x8f3f7e, 0xc9b45a, 0x2f9fb3, 0xe07b39, 0x6b5bd9];

function makePerson(shirt, skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({color:shirt,roughness:.94});
  const skinMat = new THREE.MeshStandardMaterial({color:skin,roughness:.76});
  const pantsMat = new THREE.MeshStandardMaterial({color:pick([0x29313c,0x42423a,0x182a40,0x605344]),roughness:.95});
  const shoeMat = new THREE.MeshStandardMaterial({color:0x24201d,roughness:.8});
  const hairMat = new THREE.MeshStandardMaterial({color:pick([0x201711,0x30251c,0x171719,0x4b3e33]),roughness:1});
  const eyesMat = new THREE.MeshStandardMaterial({color:0x201b17,roughness:.6});
  const sphere = new THREE.SphereGeometry(1,16,12);
  function ell(parent,mat,pos,scale) {
    const m=new THREE.Mesh(sphere,mat);m.position.set(...pos);m.scale.set(...scale);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function limb(parent,mat,len,r1,r2) {
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,10),mat);
    m.position.y=-len/2;m.castShadow=true;parent.add(m);return m;
  }
  // Human proportions: 1.76 m, shoulders, neck, jaw and separate limbs.
  ell(g,shirtMat,[0,1.17,0],[.225,.31,.125]);
  ell(g,pantsMat,[0,.91,0],[.19,.145,.115]);
  ell(g,skinMat,[0,1.47,0],[.063,.095,.063]);
  const head=new THREE.Group();head.position.y=1.615;g.add(head);
  ell(head,skinMat,[0,0,0],[.105,.145,.105]);
  ell(head,skinMat,[0,-.065,.023],[.078,.073,.078]);
  ell(head,skinMat,[0,-.014,.104],[.025,.036,.033]);
  for(const side of [-1,1]) {
    ell(head,skinMat,[side*.105,-.008,0],[.021,.038,.022]);
    ell(head,eyesMat,[side*.041,.018,.095],[.011,.007,.005]);
    ell(head,hairMat,[side*.041,.039,.092],[.029,.006,.007]);
  }
  ell(head,skinMat,[0,-.073,.094],[.028,.005,.006]);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(1,16,12,0,Math.PI*2,0,Math.PI*.53),hairMat);
  hair.scale.set(.109,.151,.11);hair.position.y=.013;head.add(hair);
  if(Math.random()<.35) ell(head,hairMat,[0,-.07,.047],[.08,.055,.063]);
  const arms=[],legs=[],knees=[];
  for(const side of [-1,1]) {
    const arm=new THREE.Group();arm.position.set(side*.222,1.35,0);arm.rotation.z=side*.08;g.add(arm);arms.push(arm);
    ell(arm,shirtMat,[0,-.055,0],[.079,.12,.082]);
    limb(arm,skinMat,.26,.055,.042);
    const elbow=new THREE.Group();elbow.position.y=-.26;elbow.rotation.x=-.13;arm.add(elbow);
    ell(elbow,skinMat,[0,0,0],[.044,.045,.044]);limb(elbow,skinMat,.24,.043,.03);
    ell(elbow,skinMat,[0,-.27,.01],[.036,.064,.026]);
    const leg=new THREE.Group();leg.position.set(side*.097,.91,0);g.add(leg);legs.push(leg);
    limb(leg,pantsMat,.405,.089,.063);
    const knee=new THREE.Group();knee.position.y=-.405;leg.add(knee);knees.push(knee);
    ell(knee,pantsMat,[0,0,0],[.065,.067,.065]);limb(knee,pantsMat,.39,.061,.044);
    ell(knee,shoeMat,[0,-.40,.045],[.066,.065,.13]);
    const sole=new THREE.Mesh(new THREE.BoxGeometry(.132,.025,.23),shoeMat);sole.position.set(0,-.444,.04);knee.add(sole);
  }
  // Shirt placket, collar, seams and occasional shoulder bag.
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.008,.31,.006),new THREE.MeshStandardMaterial({color:0x687174,roughness:1}));
  seam.position.set(0,1.22,.124);g.add(seam);
  for(const side of [-1,1]) ell(g,shirtMat,[side*.048,1.425,.065],[.045,.028,.06]);
  if(Math.random()<.3) {
    const bag=new THREE.Mesh(new THREE.BoxGeometry(.14,.24,.22),new THREE.MeshStandardMaterial({color:0x554132,roughness:.9}));
    bag.position.set(.27,.96,0);bag.castShadow=true;g.add(bag);
  }
  g.userData.shirtMat=shirtMat;g.userData.walk={arms,legs,knees};
  const h=rand(.94,1.06);g.scale.set(h,h,h);
  const lod=new THREE.LOD();lod.addLevel(g,0);
  const distant=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.57,2,6),shirtMat);torso.position.y=1.12;distant.add(torso);
  const farHead=new THREE.Mesh(new THREE.SphereGeometry(.115,6,4),skinMat);farHead.position.y=1.62;distant.add(farHead);
  for(const side of [-1,1]) {const leg=new THREE.Mesh(new THREE.CylinderGeometry(.067,.044,.83,5),pantsMat);leg.position.set(side*.095,.48,0);distant.add(leg);}
  distant.scale.copy(g.scale);lod.addLevel(distant,55);lod.addLevel(new THREE.Group(),220);
  lod.userData=g.userData;return lod;
}

function animatePerson(person, phase, strength=1) {
  if(animateImportedPerson(person, phase, strength))return;
  const rig=person.userData.walk;if(!rig)return;
  for(let i=0;i<2;i++) {
    // Biomechanical heel-to-toe gait: hip swing (0.42 rad), knee flexion (0.72 rad) on back-swing,
    // and arm counter-swing (0.32 rad) with natural lateral clearance.
    const a=phase+i*Math.PI, swing=Math.sin(a), back=Math.max(0,-swing);
    const lift=Math.max(0,Math.sin(a+Math.PI*.18));
    rig.legs[i].rotation.x=(swing*.42+lift*.055)*strength;
    rig.knees[i].rotation.x=(back*.72+lift*.10)*strength;
    rig.arms[i].rotation.x=-swing*.32*strength;
    rig.arms[i].rotation.z=(i?-.045:.045)*Math.abs(swing)*strength;
  }
}

const peds = [];
for (let i = 0; i < 44; i++) {
  const p = makePerson(pick(SHIRTS), pick(SKIN));
  const side = Math.random() < .5 ? 1 : -1;
  p.position.set((i<16?rand(-85,85):rand(-HALF + 40, HALF - 40)), .34, side * rand(18.6, 22.8));
  p.rotation.y = Math.PI / 2;
  scene.add(p);
  peds.push({ mesh: p, speed: rand(.35, .9) * (Math.random() < .5 ? 1 : -1), z: p.position.z, phase: rand(0, 6) });
}

/* ------------------------- الزبون ------------------------- */
const passenger = makePerson(0x2f9fb3, 0xb87b50);
passenger.visible = false;
scene.add(passenger);

/* ------------------------- ماركر الزبون ------------------------- */
const pickupMarker = new THREE.Group();
pickupMarker.visible = false;
scene.add(pickupMarker);

const pHatch = new THREE.Mesh(
  new THREE.PlaneGeometry(6.4, 4.2),
  new THREE.MeshBasicMaterial({
    map: pickupHatchTex, transparent: true, opacity: .9, depthWrite: false,
  })
);
pHatch.rotation.x = -Math.PI / 2;
pHatch.position.y = .04;
pickupMarker.add(pHatch);

const pRing = new THREE.Mesh(
  new THREE.TorusGeometry(5.8, .12, 8, 36),
  new THREE.MeshBasicMaterial({ color: 0xffc61a })
);
pRing.rotation.x = Math.PI / 2;
pRing.position.y = .07;
pickupMarker.add(pRing);

const pDisc = new THREE.Mesh(
  new THREE.CircleGeometry(5.8, 36),
  new THREE.MeshBasicMaterial({
    map: RADIAL_TEX, color: 0xffc61a, transparent: true, opacity: .6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
pDisc.rotation.x = -Math.PI / 2;
pDisc.position.y = .035;
pickupMarker.add(pDisc);

const pBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(.7, 1.5, 7.5, 18, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xffc61a, transparent: true, opacity: .3, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
pBeam.position.y = 3.75;
pickupMarker.add(pBeam);

const pLabel = labelSprite('اتفضل اركب', '#ffd34d');
pLabel.scale.set(3.2, .8, 1);
pLabel.position.y = 4.0;
pickupMarker.add(pLabel);

/* ------------------------- ماركر الوجهة ------------------------- */
const destMarker = new THREE.Group();
destMarker.visible = false;
scene.add(destMarker);

const dRing = new THREE.Mesh(
  new THREE.TorusGeometry(6.5, .12, 8, 40),
  new THREE.MeshBasicMaterial({ color: 0x3dff8a })
);
dRing.rotation.x = Math.PI / 2;
dRing.position.y = .07;
destMarker.add(dRing);

const dDisc = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 40),
  new THREE.MeshBasicMaterial({
    map: RADIAL_TEX, color: 0x3dff8a, transparent: true, opacity: .45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
dDisc.rotation.x = -Math.PI / 2;
dDisc.position.y = .035;
destMarker.add(dDisc);

const dBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(.65, 1.15, 7, 18, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0x3dff8a, transparent: true, opacity: .15, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
dBeam.position.y = 3.5;
destMarker.add(dBeam);

const dLabel = labelSprite('الوجهة', '#5dffa0');
dLabel.position.y = 3.8;
destMarker.add(dLabel);

/* ------------------------- سهم الوجهة الطاير ------------------------- */
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, 1.9);
arrowShape.lineTo(1.55, .35);
arrowShape.lineTo(.58, .35);
arrowShape.lineTo(.58, -1.9);
arrowShape.lineTo(-.58, -1.9);
arrowShape.lineTo(-.58, .35);
arrowShape.lineTo(-1.55, .35);
arrowShape.closePath();
const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, {
  depth: .42, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 1,
});
arrowGeo.center();
const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshStandardMaterial({
  color: 0x3dff8a, emissive: 0x1fa85a, emissiveIntensity: 1.0,
  roughness: .35, metalness: .15,
}));
arrow.visible = false;
arrow.scale.setScalar(.62);
scene.add(arrow);

const arrowGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: GLOW_TEX, color: 0x3dff8a, transparent: true, opacity: .3,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
arrowGlow.scale.set(9, 9, 1);
arrowGlow.visible = false;
scene.add(arrowGlow);
