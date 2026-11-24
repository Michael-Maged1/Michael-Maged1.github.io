/* Named Assiut places: recognizable visual identities tied to OSM road names. */
const ASSYUT_SPECIALS={landmarks:[],zones:[],medianAds:0,ledScreens:0,kazyonCount:0,mechanicsCount:0,foulCount:0};

function assyutRoadByName(pattern){
  return ASSYUT.roads.filter(r=>pattern.test(String(r.name||''))&&r.length>35).sort((a,b)=>b.length-a.length)[0]||null;
}
function assyutRoadMidpoint(road,ratio=.52){
  const seg=ASSYUT.segments[road.segments[Math.floor(road.segments.length*ratio)]]||ASSYUT.segments[road.segments[0]];
  if(!seg)return null;
  return {x:(seg.a.x+seg.b.x)/2,z:(seg.a.z+seg.b.z)/2,heading:seg.heading,nx:-(seg.b.z-seg.a.z)/seg.length,nz:(seg.b.x-seg.a.x)/seg.length,tx:(seg.b.x-seg.a.x)/seg.length,tz:(seg.b.z-seg.a.z)/seg.length,width:seg.width};
}
function assyutBoard(text,sub,color='#074b8c',w=7,h=2.1){
  const tex=canvasTex(1024,300,g=>{g.fillStyle=color;g.fillRect(0,0,1024,300);g.strokeStyle='#eef6fa';g.lineWidth=10;g.strokeRect(12,12,1000,276);g.direction='rtl';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffffff';g.font='bold 74px Tahoma, Cairo';g.fillText(text,512,114,930);g.font='600 34px Tahoma, Cairo';g.fillStyle='#dceeff';g.fillText(sub,512,220,940);});
  const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.55,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);mesh.castShadow=true;return mesh;
}
function placeAssyutBoard(road,text,sub,color,side=1,along=.5){
  const p=assyutRoadMidpoint(road,along);if(!p)return;
  const x=p.x+p.nx*side*(p.width/2+2.6),z=p.z+p.nz*side*(p.width/2+2.6);
  if(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))return;
  const board=assyutBoard(text,sub,color);board.position.set(x,3.6,z);board.rotation.y=p.heading+Math.PI/2;REAL_CITY.group.add(board);
  const postMat=new THREE.MeshStandardMaterial({color:0x4d5556,roughness:.65,metalness:.35});
  for(const ox of[-2.2,2.2]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,3.4,7),postMat);const v=new THREE.Vector3(ox,0,.05).applyAxisAngle(new THREE.Vector3(0,1,0),board.rotation.y);post.position.set(x+v.x,1.7,z+v.z);REAL_CITY.group.add(post);}
  ASSYUT_SPECIALS.landmarks.push({name:text,x,z,road:road.name});
  return {x,z,heading:p.heading,nx:p.nx,nz:p.nz};
}

// 1. مبنى محطة سكة حديد أسيوط الحقيقي على يمين شارع الجلاء / ميدان المحطة
function addAsyutRailwayStation(){
  const galaa=assyutRoadByName(/شارع الجلاء/)||ASSYUT.roads[0];
  if(!galaa)return;
  const seg=ASSYUT.segments[galaa.segments[Math.min(2,galaa.segments.length-1)]]||ASSYUT.segments[0];
  if(!seg)return;
  const tx=(seg.b.x-seg.a.x)/seg.length,tz=(seg.b.z-seg.a.z)/seg.length;
  const nx=-tz,nz=tx;
  // وضع المبنى على يمين الشارع (side = 1) بمسافة آمنة خلف الرصيف
  let sx=0,sz=0,placed=false,sideChosen=1;
  for(const side of [1,-1]){
    for(const shift of [0,18,-18,34,-34]){
      const cx=(seg.a.x+seg.b.x)/2+tx*shift+nx*side*(seg.width/2+11.5);
      const cz=(seg.a.z+seg.b.z)/2+tz*shift+nz*side*(seg.width/2+11.5);
      const near=nearestAssyutRoad({x:cx,z:cz});
      if(near&&near.distance>=near.width/2+7.5){sx=cx;sz=cz;sideChosen=side;placed=true;break;}
    }
    if(placed)break;
  }
  if(!placed)return;

  const g=new THREE.Group();
  g.position.set(sx,0,sz);
  // توجيه واجهة المحطة لتقابل الشارع مباشرة
  const facingYaw=Math.atan2(-nx*sideChosen,-nz*sideChosen);
  g.rotation.y=facingYaw;

  const stoneMat=new THREE.MeshStandardMaterial({color:0xdfd1b4,roughness:.86,envMapIntensity:.16});
  const trimMat=new THREE.MeshStandardMaterial({color:0xc2ab82,roughness:.80,envMapIntensity:.18});
  const baseMat=new THREE.MeshStandardMaterial({color:0x8c8272,roughness:.92});
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x1b3340,roughness:.16,metalness:.3,clearcoat:.7,envMapIntensity:.8});
  const goldMat=new THREE.MeshStandardMaterial({color:0xd8b048,roughness:.45,metalness:.55});

  // الهيكل الرئيسي لمحطة أسيوط
  const body=new THREE.Mesh(new THREE.BoxGeometry(24,10.5,11),stoneMat);
  body.position.y=5.25;body.castShadow=true;body.receiveShadow=true;g.add(body);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(24.5,1.4,11.5),baseMat);
  plinth.position.y=.7;plinth.receiveShadow=true;g.add(plinth);
  const cornice=new THREE.Mesh(new THREE.BoxGeometry(24.8,.75,11.8),trimMat);
  cornice.position.y=10.6;cornice.castShadow=true;g.add(cornice);
  // تاج علوي كلاسيكي في منتصف المحطة
  const pediment=new THREE.Mesh(new THREE.BoxGeometry(11.5,2.4,1.2),trimMat);
  pediment.position.set(0,11.9,5.1);pediment.castShadow=true;g.add(pediment);

  // 3 بوابات مقوسة زجاجية لمدخل الركاب
  for(const ax of [-6.8,0,6.8]){
    const archGlass=new THREE.Mesh(new THREE.BoxGeometry(3.8,5.2,.18),glassMat);
    archGlass.position.set(ax,3.1,5.52);g.add(archGlass);
    const frameTop=new THREE.Mesh(new THREE.BoxGeometry(4.3,.45,.32),trimMat);
    frameTop.position.set(ax,5.8,5.56);g.add(frameTop);
    for(const px of [-2.05,2.05]){
      const pilaster=new THREE.Mesh(new THREE.BoxGeometry(.55,9.6,.52),trimMat);
      pilaster.position.set(ax+px,5.0,5.56);pilaster.castShadow=true;g.add(pilaster);
    }
  }
  // مظلة مدخل المحطة
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(18.5,.38,3.2),trimMat);
  canopy.position.set(0,5.8,6.9);canopy.castShadow=true;g.add(canopy);
  for(const cx of [-7.5,0,7.5]){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,5.6,10),stoneMat);
    col.position.set(cx,2.8,8.1);col.castShadow=true;g.add(col);
  }
  // ساعة محطة القطار الدائرية
  const clockTex=canvasTex(256,256,c=>{
    c.fillStyle='#f8f4e6';c.beginPath();c.arc(128,128,118,0,Math.PI*2);c.fill();
    c.strokeStyle='#1e3a5f';c.lineWidth=14;c.stroke();
    c.strokeStyle='#1a1a1a';c.lineWidth=10;c.beginPath();c.moveTo(128,128);c.lineTo(128,54);c.moveTo(128,128);c.lineTo(182,142);c.stroke();
  });
  const clock=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.22,20),new THREE.MeshStandardMaterial({map:clockTex,roughness:.4}));
  clock.rotation.x=Math.PI/2;clock.position.set(0,8.2,5.68);g.add(clock);

  // اليافطة الرسمية المضيئة: محطة سكة حديد أسيوط
  const stationSignTex=canvasTex(1024,256,c=>{
    c.fillStyle='#074b8c';c.fillRect(0,0,1024,256);
    c.strokeStyle='#f0c850';c.lineWidth=12;c.strokeRect(12,12,1000,232);
    c.direction='rtl';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#ffffff';c.font='bold 92px Tahoma, Cairo, Arial';
    c.fillText('محطة سكة حديد أسيوط',512,102,940);
    c.fillStyle='#ffd966';c.font='bold 42px Tahoma, Arial';
    c.fillText('ASYUT RAILWAY STATION · محطة أسيوط',512,196,920);
  });
  const stationSignMat=new THREE.MeshStandardMaterial({map:stationSignTex,emissiveMap:stationSignTex,emissive:new THREE.Color(0xffffff),emissiveIntensity:.35,roughness:.42});
  if(typeof nightMats!=='undefined')nightMats.push(stationSignMat);
  const topSign=new THREE.Mesh(new THREE.BoxGeometry(13.5,2.3,.28),stationSignMat);
  topSign.position.set(0,11.9,5.8);g.add(topSign);
  const entranceSign=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.35,.22),stationSignMat);
  entranceSign.position.set(0,6.65,8.45);g.add(entranceSign);

  REAL_CITY.group.add(g);
  MAP.buildings.push({x0:sx-11,x1:sx+11,z0:sz-6,z1:sz+6,h:12});
  ASSYUT_SPECIALS.landmarks.push({name:'محطة سكة حديد أسيوط',x:sx,z:sz,road:galaa.name});
}

// 2. فروع كازيون ماركت + ورش ميكانيكا + مطاعم فول وطعمية على أرصفة شوارع أسيوط
function addEgyptianStreetShops(){
  const tireMat=new THREE.MeshStandardMaterial({color:0x1b1d20,roughness:.92});
  const drumBlue=new THREE.MeshStandardMaterial({color:0x16548a,roughness:.55,metalness:.35});
  const drumRed=new THREE.MeshStandardMaterial({color:0xa82420,roughness:.55,metalness:.35});
  const tableMat=new THREE.MeshStandardMaterial({color:0xc5b8a0,roughness:.78});
  const chairMat=new THREE.MeshStandardMaterial({color:0x1e5c8a,roughness:.82});
  const potMat=new THREE.MeshStandardMaterial({color:0xb88438,roughness:.35,metalness:.75});
  const kazyonRed=new THREE.MeshStandardMaterial({color:0xc8102e,roughness:.65});
  const kazyonYellow=new THREE.MeshStandardMaterial({color:0xffd200,roughness:.6});

  const targetPatterns=[/شارع الجلاء/,/شارع الجمهوريه|الجمهورية/,/شارع الجيش/,/شارع يسرى راغب/,/شارع الرياض|عبد المنعم رياض/,/شارع احمد الهلالي/,/شارع النميس/];
  let idx=0;
  for(const pat of targetPatterns){
    const road=assyutRoadByName(pat);
    if(!road)continue;
    // فرع كازيون ماركت
    const kp=assyutRoadMidpoint(road,.30);
    if(kp){
      const x=kp.x+kp.nx*(kp.width/2+2.3),z=kp.z+kp.nz*(kp.width/2+2.3);
      if(!(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))){
        const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=kp.heading;
        const kiosk=new THREE.Mesh(new THREE.BoxGeometry(3.8,.16,1.2),kazyonRed);kiosk.position.set(0,2.75,0);g.add(kiosk);
        const trim=new THREE.Mesh(new THREE.BoxGeometry(3.82,.14,.14),kazyonYellow);trim.position.set(0,2.65,.56);g.add(trim);
        const board=assyutBoard('كازيون ماركت · KAZYON','أقرب سوبر ماركت ليك · عروض يومية','#c8102e',4.4,1.15);
        board.position.set(0,3.4,0);g.add(board);
        for(const sx of[-1.6,1.6]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,2.9,6),kazyonRed);pole.position.set(sx,1.45,0);g.add(pole);}
        REAL_CITY.group.add(g);
        ASSYUT_SPECIALS.kazyonCount++;
      }
    }
    // ورشة ميكانيكا وكاوتش (إطارات + براميل زيت + يافطة ورشة)
    const mp=assyutRoadMidpoint(road,.55);
    if(mp){
      const x=mp.x-mp.nx*(mp.width/2+2.15),z=mp.z-mp.nz*(mp.width/2+2.15);
      if(!(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))){
        const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=mp.heading+Math.PI;
        for(let t=0;t<3;t++){const tire=new THREE.Mesh(new THREE.TorusGeometry(.28,.10,8,14),tireMat);tire.rotation.x=Math.PI/2;tire.position.set(-.8,.12+t*.18,0);g.add(tire);}
        const drum=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.86,12),idx%2?drumBlue:drumRed);drum.position.set(.65,.43,0);drum.castShadow=true;g.add(drum);
        const sign=assyutBoard('ورشة ميكانيكا وكهرباء سيارات','عفشة · كاوتش · تغيير زيت','#123d72',3.8,1.0);
        sign.position.set(0,2.85,0);g.add(sign);
        for(const sx of[-1.3,1.3]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,2.5,6),drumBlue);p.position.set(sx,1.25,0);g.add(p);}
        REAL_CITY.group.add(g);
        ASSYUT_SPECIALS.mechanicsCount++;
      }
    }
    // مطعم فول وطعمية (قدرة فول + ترابيزات وكراسي على الرصيف + يافطة)
    const fp=assyutRoadMidpoint(road,.76);
    if(fp){
      const x=fp.x+fp.nx*(fp.width/2+2.15),z=fp.z+fp.nz*(fp.width/2+2.15);
      if(!(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.2))){
        const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=fp.heading;
        const cart=new THREE.Mesh(new THREE.BoxGeometry(1.5,.88,.72),tableMat);cart.position.set(-.6,.44,0);g.add(cart);
        const pot=new THREE.Mesh(new THREE.CylinderGeometry(.20,.26,.46,10),potMat);pot.position.set(-.6,1.08,0);g.add(pot);
        const tbl=new THREE.Mesh(new THREE.BoxGeometry(.9,.72,.9),tableMat);tbl.position.set(.95,.36,0);g.add(tbl);
        for(const cx of[.35,1.55]){const ch=new THREE.Mesh(new THREE.BoxGeometry(.38,.45,.38),chairMat);ch.position.set(cx,.22,0);g.add(ch);}
        const sign=assyutBoard('مطعم فول وطعمية الصعيدي','فول · طعمية سخنة · ساندوتشات','#b83214',4.0,1.05);
        sign.position.set(0,2.95,0);g.add(sign);
        REAL_CITY.group.add(g);
        ASSYUT_SPECIALS.foulCount++;
      }
    }
    idx++;
  }
}

// 3. أعمدة إعلانات الرصيف الأوسط (الجزيرة الوسطى) + يافطات وشاشات LED ضخمة
function addMedianPoleAdsAndGiantScreens(){
  const poleMat=new THREE.MeshStandardMaterial({color:0x3c454a,roughness:.55,metalness:.55});
  const frameMat=new THREE.MeshStandardMaterial({color:0x1b2024,roughness:.42,metalness:.65});

  const medianAdSpecs=[
    { title:'كازيون ماركت', sub:'عروض كل يوم في أسيوط', bg:'#c8102e', fg:'#ffd200' },
    { title:'أهلاً بكم في أسيوط', sub:'عاصمة الصعيد · قيادة آمنة', bg:'#074b8c', fg:'#ffffff' },
    { title:'شبكة 5G الأسرع', sub:'تغطية شاملة في أسيوط', bg:'#5b21b6', fg:'#f8fafc' },
    { title:'أبراج النيل السكنية', sub:'استلام فوري · كورنيش أسيوط', bg:'#0f5132', fg:'#fef08a' }
  ];
  const medianAdMats=medianAdSpecs.map(ad=>{
    const tex=canvasTex(384,640,g=>{
      g.fillStyle=ad.bg;g.fillRect(0,0,384,640);
      g.strokeStyle=ad.fg;g.lineWidth=10;g.strokeRect(12,12,360,616);
      g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=ad.fg;g.font='bold 48px Tahoma, Cairo';
      g.fillText(ad.title,192,240,330);
      g.fillStyle='#ffffff';g.font='600 30px Tahoma, Cairo';
      g.fillText(ad.sub,192,365,330);
    });
    const m=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(0xffffff),emissiveIntensity:.28,roughness:.35});
    if(typeof nightMats!=='undefined')nightMats.push(m);
    return m;
  });

  // أعمدة إعلانات على الرصيف اللي في نص الشوارع ذات الاتجاهين
  let medianCount=0;
  for(const seg of ASSYUT.segments){
    if(INFRA.profiles.has(seg.road)||seg.width<13.0||seg.length<22||medianCount>=90)continue;
    for(let d=12;d<seg.length-10&&medianCount<90;d+=28){
      const x=lerp(seg.a.x,seg.b.x,d/seg.length),z=lerp(seg.a.z,seg.b.z,d/seg.length);
      const y=assyutRoadHeightAt(x,z);
      const g=new THREE.Group();g.position.set(x,y+.18,z);g.rotation.y=seg.heading;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,6.4,8),poleMat);
      pole.position.y=3.2;pole.castShadow=true;g.add(pole);
      // ذراعين إنارة للاتجاهين
      const crossArm=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,2.2),poleMat);
      crossArm.position.y=6.2;g.add(crossArm);
      // لوحة إعلانات مضيئة مزدوجة الوجه على عمود الرصيف الأوسط
      const adMat=medianAdMats[medianCount%medianAdMats.length];
      const box=new THREE.Mesh(new THREE.BoxGeometry(.16,1.85,1.15),[adMat,adMat,frameMat,frameMat,frameMat,frameMat]);
      box.position.y=3.45;box.castShadow=true;g.add(box);
      REAL_CITY.group.add(g);
      medianCount++;
    }
  }
  ASSYUT_SPECIALS.medianAds=medianCount;

  // شاشات LED رقمية مضيئة ويافطات إعلانات ضخمة على المحاور الرئيسية
  const ledSpecs=[
    { title:'أسيوط الجديدة · سيتي مول', sub:'تسوق · مطاعم · سينما · ترفيه', bg:'#0b1938', accent:'#38bdf8' },
    { title:'كازيون ماركت — عروض الشهر', sub:'خصومات حتى 40% في جميع فروع أسيوط', bg:'#991b1b', accent:'#facc15' },
    { title:'أوبر أسيوط · مشوارك أسرع', sub:'اطلب عربيتك في أي مكان في أسيوط 24/7', bg:'#111827', accent:'#22c55e' },
    { title:'مطاعم ومشويات الصعيد', sub:'طعم أصيل · توصيل سريع لوسط أسيوط', bg:'#451a03', accent:'#fb923c' }
  ];
  const ledMats=ledSpecs.map(spec=>{
    const tex=canvasTex(1024,512,g=>{
      const grad=g.createLinearGradient(0,0,1024,512);
      grad.addColorStop(0,spec.bg);grad.addColorStop(1,'#090d16');
      g.fillStyle=grad;g.fillRect(0,0,1024,512);
      g.strokeStyle=spec.accent;g.lineWidth=14;g.strokeRect(16,16,992,480);
      g.direction='rtl';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=spec.accent;g.font='bold 78px Tahoma, Cairo';
      g.fillText(spec.title,512,185,930);
      g.fillStyle='#ffffff';g.font='600 44px Tahoma, Cairo';
      g.fillText(spec.sub,512,330,920);
      // تأثير نقاط شاشة LED خفيف
      g.fillStyle='rgba(255,255,255,0.06)';
      for(let y=0;y<512;y+=8)g.fillRect(0,y,1024,2);
    });
    return new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(0xffffff),emissiveIntensity:.72,roughness:.25});
  });

  const majorAvenues=[/شارع الجلاء/,/شارع الجمهوريه|الجمهورية/,/شارع الجيش/,/شارع يسرى راغب/,/شارع احمد الهلالي/];
  let screenCount=0;
  for(const pat of majorAvenues){
    const road=assyutRoadByName(pat);
    if(!road)continue;
    for(const ratio of [.22,.50,.78]){
      const p=assyutRoadMidpoint(road,ratio);if(!p)continue;
      const side=(screenCount%2===0)?1:-1;
      const x=p.x+p.nx*side*(p.width/2+4.8),z=p.z+p.nz*side*(p.width/2+4.8);
      if(typeof onDrivingRoad==='function'&&onDrivingRoad(x,z,1.8))continue;
      const g=new THREE.Group();g.position.set(x,assyutRoadHeightAt(x,z),z);
      g.rotation.y=p.heading+(side>0?Math.PI/2:-Math.PI/2);
      // عمود حديدي ضخم (Unipole)
      const pylon=new THREE.Mesh(new THREE.CylinderGeometry(.26,.34,6.8,10),poleMat);
      pylon.position.y=3.4;pylon.castShadow=true;g.add(pylon);
      // شاشة LED أو يافطة إعلانات ضخمة
      const isLED=(screenCount%2===0);
      const sw=isLED?6.8:8.6,sh=isLED?3.4:3.6;
      const mat=ledMats[screenCount%ledMats.length];
      const screen=new THREE.Mesh(new THREE.BoxGeometry(sw,sh,.32),[frameMat,frameMat,frameMat,frameMat,mat,mat]);
      screen.position.y=7.4;screen.castShadow=true;g.add(screen);
      REAL_CITY.group.add(g);
      screenCount++;
    }
  }
  ASSYUT_SPECIALS.ledScreens=screenCount;
}

function addMarketStalls(road){
  const p=assyutRoadMidpoint(road);if(!p)return;
  const colors=[0xc84a2c,0x6b9837,0xe0ad39,0x9e3c30];
  for(let i=-4;i<=4;i++){
    const side=i%2?1:-1,x=p.x+p.nx*side*(p.width/2+2.8)+p.tx*i*3.1,z=p.z+p.nz*side*(p.width/2+2.8)+p.tz*i*3.1;
    const crate=new THREE.Mesh(new THREE.BoxGeometry(1.2,.42,.85),new THREE.MeshStandardMaterial({color:colors[(i+8)%colors.length],roughness:.9}));crate.position.set(x,.27,z);crate.rotation.y=p.heading;REAL_CITY.group.add(crate);
    const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.7,.07,1.45),new THREE.MeshStandardMaterial({color:i%2?0xc23d2b:0xd8b13b,roughness:.85}));canopy.position.set(x,2.15,z);canopy.rotation.y=p.heading;REAL_CITY.group.add(canopy);
  }
  ASSYUT_SPECIALS.zones.push({name:'سوق شارع رياض',road:road.name,type:'produce'});
}
function addNileEdge(road){
  const p=assyutRoadMidpoint(road);if(!p)return;
  const water=new THREE.Mesh(new THREE.BoxGeometry(Math.min(road.length,190),.10,30),new THREE.MeshStandardMaterial({color:0x2c8190,roughness:.22,metalness:.12,transparent:true,opacity:.90}));
  water.position.set(p.x+p.nx*(p.width/2+18),-.02,p.z+p.nz*(p.width/2+18));water.rotation.y=p.heading;water.receiveShadow=true;REAL_CITY.group.add(water);
  const bank=new THREE.Mesh(new THREE.BoxGeometry(Math.min(road.length,190),.18,2.4),new THREE.MeshStandardMaterial({color:0xb49b70,roughness:.94}));
  bank.position.set(p.x+p.nx*(p.width/2+3.2),.06,p.z+p.nz*(p.width/2+3.2));bank.rotation.y=p.heading;REAL_CITY.group.add(bank);
  ASSYUT_SPECIALS.zones.push({name:'شارع البحر',road:road.name,type:'nile'});
}
function addDurnakaGate(){
  const road=assyutRoadByName(/جبل|زراع|محلي/);const p=road&&assyutRoadMidpoint(road);
  const x=p?p.x+p.nx*(p.width/2+20):ASSYUT.bounds.x0+130,z=p?p.z+p.nz*(p.width/2+20):ASSYUT.bounds.z0+150,heading=p?.heading||0;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=heading;
  const rock=new THREE.Mesh(new THREE.ConeGeometry(20,18,7),new THREE.MeshStandardMaterial({color:0x8b7158,roughness:.98}));rock.position.set(0,9,7);rock.scale.set(1.5,.9,.65);rock.castShadow=true;g.add(rock);
  const stone=new THREE.MeshStandardMaterial({color:0xd8c29b,roughness:.9});
  const wall=new THREE.Mesh(new THREE.BoxGeometry(15,5,.9),stone);wall.position.set(0,2.5,0);wall.castShadow=true;g.add(wall);
  for(const side of[-1,1]){const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.7,8,10),stone);tower.position.set(side*6.3,4,0);tower.castShadow=true;g.add(tower);}
  const arch=new THREE.Mesh(new THREE.TorusGeometry(3.0,.45,8,20,Math.PI),stone);arch.position.set(0,4.5,-.55);arch.rotation.x=Math.PI/2;g.add(arch);
  const crossMat=new THREE.MeshStandardMaterial({color:0x7b3d2e,roughness:.75});
  const v=new THREE.Mesh(new THREE.BoxGeometry(.22,2.2,.22),crossMat);v.position.set(0,9.5,0);const h=new THREE.Mesh(new THREE.BoxGeometry(1.15,.22,.22),crossMat);h.position.set(0,9.65,0);g.add(v,h);
  REAL_CITY.group.add(g);
  const board=assyutBoard('دير العذراء مريم · درنكة','طريق زراعي · جبل أسيوط الغربي','#6d3f31',8,2.3);board.position.set(x,5.8,z-1.2);board.rotation.y=heading+Math.PI/2;REAL_CITY.group.add(board);
  ASSYUT_SPECIALS.landmarks.push({name:'دير العذراء مريم · درنكة',x,z,road:road?.name||'طريق درنكة'});
}
function addAssyutNamedPlacesPass(){
  if(typeof REAL_CITY==='undefined')return;
  addAsyutRailwayStation();
  addEgyptianStreetShops();
  addMedianPoleAdsAndGiantScreens();
  const riyadh=assyutRoadByName(/شارع الرياض|عبد المنعم رياض/);if(riyadh){placeAssyutBoard(riyadh,'شارع رياض','سوق الخضار والفاكهة · أسيوط','#074b8c',1,.50);addMarketStalls(riyadh);}
  const station=assyutRoadByName(/محطة|الجمهوريه|الجمهورية/);if(station){placeAssyutBoard(station,'ميدان المحطة · شارع الجمهورية','محطة أسيوط · نفق المنفذ','#074b8c');ASSYUT_SPECIALS.zones.push({name:'شارع المحطة',road:station.name,type:'busy'});}
  const nile=assyutRoadByName(/النيل|البحرى|البحري|طراد النيل/);if(nile){placeAssyutBoard(nile,'شارع البحر','كورنيش النيل · أسيوط','#074b8c');addNileEdge(nile);}
  addDurnakaGate();REAL_CITY.specialPlaces=ASSYUT_SPECIALS;
}
addAssyutNamedPlacesPass();
