/* Second visual pass: lived-in street props with no gameplay collision. */
const STREET_PROP_MATS={
  wood:new THREE.MeshStandardMaterial({color:0x735039,roughness:.94}),
  crate:[0x9d5c32,0x6d8a4c,0xc08b3c,0x7a4f39].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.92})),
  tarp:[0x9a332a,0x286078,0x47754a,0xc19235].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.86})),
  bin:new THREE.MeshStandardMaterial({color:0x31555a,roughness:.9}),
  cloth:[0xd4523e,0xe4bf63,0x3d7088,0xe7e0c9].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.82,side:THREE.DoubleSide})),
  stain:new THREE.MeshStandardMaterial({color:0x121417,roughness:.18,metalness:.15,envMapIntensity:1.45,transparent:true,opacity:.68,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3})
};

function addMarketStall(x,z,heading,idx){
  const g=new THREE.Group();g.position.set(x,.02,z);g.rotation.y=heading;
  const table=new THREE.Mesh(new THREE.BoxGeometry(2.25,.48,.78),STREET_PROP_MATS.wood);table.position.y=.52;table.castShadow=true;g.add(table);
  for(const sx of[-.82,.82])for(const sz of[-.25,.25]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.72,6),STREET_PROP_MATS.wood);leg.position.set(sx,.18,sz);g.add(leg);}
  for(let i=0;i<4;i++){const basket=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.16,10),STREET_PROP_MATS.crate[(idx+i)%STREET_PROP_MATS.crate.length]);basket.position.set(-.72+i*.48,.86,(i%2?-.16:.16));g.add(basket);}
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.9,.08,1.35),STREET_PROP_MATS.tarp[idx%STREET_PROP_MATS.tarp.length]);canopy.position.y=2.28;canopy.rotation.x=-.08;g.add(canopy);
  for(const sx of[-1.08,1.08]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,1.7,6),ASSYUT_DETAIL_MATS.pole);pole.position.set(sx,1.35,0);g.add(pole);}
  REAL_CITY.group.add(g);return g;
}

function addStreetMarketProps(){
  let stalls=0,bins=0;
  for(let i=1;i<ASSYUT.places.length&&stalls<28;i+=3){
    const p=ASSYUT.places[i],n=nearestAssyutRoad(p);if(!p||!n||n.width<8)continue;
    const side=stalls%2?1:-1,x=n.point.x+n.nx*(n.width/2+2.8)*side,z=n.point.z+n.nz*(n.width/2+2.8)*side;
    if(n.distance<n.width/2+1.5)continue;
    addMarketStall(x,z,n.heading+Math.PI/2,stalls++);
    if(stalls%2===0){const bin=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.66,10),STREET_PROP_MATS.bin);bin.position.set(x+n.nx*1.8,.35,z+n.nz*1.8);REAL_CITY.group.add(bin);bins++;}
  }
  REAL_CITY.streetStalls=stalls;REAL_CITY.streetBins=bins;
}

function addRooftopLaundry(){
  let count=0;
  for(const b of REAL_CITY.buildings){
    if(!b||b.h<5||count>=24||count%3!==0){count++;continue;}
    const g=new THREE.Group();g.position.set(b.x,b.h+.18,b.z);g.rotation.y=(count%5)*.41;
    const lineMat=new THREE.LineBasicMaterial({color:0x34383a,transparent:true,opacity:.72});
    const pts=[new THREE.Vector3(-1.55,0,0),new THREE.Vector3(1.55,0,0)];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat));
    for(let i=0;i<4;i++){const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.42,.65),STREET_PROP_MATS.cloth[(count+i)%STREET_PROP_MATS.cloth.length]);cloth.position.set(-1.2+i*.8,-.33,0);cloth.rotation.y=Math.PI/2;g.add(cloth);}
    REAL_CITY.group.add(g);count++;
  }
  REAL_CITY.rooftopLaundry=Math.min(24,Math.floor(count/3));
}

function addAsphaltStains(){
  const geo=new THREE.CircleGeometry(1,14);let added=0;
  for(const s of ASSYUT.segments){
    if(added>=140||s.width<7.5||s.length<16||cityRandom()>.25)continue;
    const t=.15+cityRandom()*.70,x=lerp(s.a.x,s.b.x,t),z=lerp(s.a.z,s.b.z,t);
    const stain=new THREE.Mesh(geo,STREET_PROP_MATS.stain);
    stain.position.set(x,assyutRoadHeightAt(x,z)+.021,z);
    stain.rotation.x=-Math.PI/2;
    const isStreak=cityRandom()<.42;
    stain.scale.set(isStreak?.25+cityRandom()*.35:.45+cityRandom()*.8,isStreak?1.1+cityRandom()*1.8:.22+cityRandom()*.45,1);
    stain.rotation.z=s.heading;
    stain.receiveShadow=true;
    REAL_CITY.group.add(stain);added++;
  }
  REAL_CITY.asphaltStains=added;
}

function runStreetLifeProps(){
  if(typeof REAL_CITY==='undefined'||!REAL_CITY.group)return;
  addStreetMarketProps();addRooftopLaundry();addAsphaltStains();
}
runStreetLifeProps();
