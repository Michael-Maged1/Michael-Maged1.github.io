/* ------------------------- شبكة شوارع المدينة ------------------------- */
const CITY_Z1 = 286;                 // آخر المدينة من ناحية القبلة
const H_STREETS = [
  { z: 0,   half: ROAD_HALF, kind: 'corniche' },   // الكورنيش
  { z: 64,  half: 5.5, kind: 'narrow' },           // شارع ضيق
  { z: 140, half: 11,  kind: 'wide' },             // شارع واسع
  { z: 210, half: 5,   kind: 'narrow' },           // شارع ضيق
  { z: 274, half: 12,  kind: 'wide' },             // شارع واسع
];
const V_STREETS = [];
for (let x = -1080; x <= 1080; x += 120) {
  const wide = Math.abs(x) % 480 === 0;
  V_STREETS.push({ x, half: wide ? 12 : 6, kind: wide ? 'wide' : 'narrow' });
}

const MAP = {
  buildings: [],   // {x0,x1,z0,z1,h}
  streets: [],
  alleys: [],
  places: [],      // أماكن الزباين
};
const WALK_IN = 3.6, ALLEY_W = 7;

for (const h of H_STREETS) {
  MAP.streets.push({ axis: 'x', c: h.z, half: h.half, from: -HALF, to: HALF, kind: h.kind });
}
for (const v of V_STREETS) {
  MAP.streets.push({ axis: 'z', c: v.x, half: v.half, from: 16, to: CITY_Z1, kind: v.kind });
}

/* بلوكات المدينة بين الشوارع */
const BLOCKS = [];
for (let i = 0; i < V_STREETS.length - 1; i++) {
  const a = V_STREETS[i], b = V_STREETS[i + 1];
  const x0 = a.x + a.half, x1 = b.x - b.half;
  for (let j = 0; j < H_STREETS.length - 1; j++) {
    const h0 = H_STREETS[j], h1 = H_STREETS[j + 1];
    BLOCKS.push({ x0, x1, z0: h0.z + h0.half, z1: h1.z - h1.half, band: j });
  }
}

/* أماكن داخل المدينة — على الشوارع وفي الحارات الضيقة */
const INLAND_PLACES = [
  // شارع ضيق (الشارع الأول جوه البلد) — الزبون واقف على الرصيف
  { x: -840, z: 57.0, name: 'شارع النميس' },
  { x: -240, z: 57.0, name: 'شارع الجمهورية' },
  { x: 360,  z: 57.0, name: 'ميدان المنفذ' },
  { x: 840,  z: 57.0, name: 'شارع الهلالي' },
  // شارع واسع
  { x: -720, z: 127.2, name: 'شارع يسري راغب' },
  { x: 0,    z: 127.2, name: 'ميدان المحطة' },
  { x: 720,  z: 127.2, name: 'شارع رياض' },
  // شارع ضيق تاني
  { x: -480, z: 203.6, name: 'شارع ثابت' },
  { x: 240,  z: 203.6, name: 'شارع ٢٦ يوليو' },
  { x: 960,  z: 203.6, name: 'منطقة المجاهدين' },
  // أوسع شارع في المدينة
  { x: -960, z: 260.4, name: 'حي غرب أسيوط' },
  { x: -120, z: 260.4, name: 'حي شرق أسيوط' },
  { x: 600,  z: 260.4, name: 'حي الوليدية' },
  // حارات ضيقة (بين البلوكات) — الزبون على جنب الحارة
  { x: 540,  z: 101.9, name: 'حارة متفرعة من النميس' },
  { x: -540, z: 180.7, name: 'حارة شارع رياض' },
  { x: 63,   z: 241.2, name: 'حارة شارع الهلالي' },
];

const PLACES = [
  ...STOPS.map(s => ({ x: s.x, z: STOP_Z, name: s.name })),
  { x: -180, z: STOP_Z, name: 'جامعة أسيوط' },
  { x: -380, z: STOP_Z, name: 'كوبري الهلالي' },
  { x: 340,  z: STOP_Z, name: 'محطة قطارات أسيوط' },
  ...INLAND_PLACES,
];
MAP.places = PLACES;

/* Shared visible and collidable curb segments. */
const CURB_SEGMENTS = [];
function buildCurbSegments(){
  CURB_SEGMENTS.length=0;
  const cutsX = V_STREETS.map(v => [v.x - v.half - .3, v.x + v.half + .3]);
  const cutsZ = [...H_STREETS.map(h => [h.z - h.half - .3, h.z + h.half + .3]),...MAP.alleys.map(a=>[a.z0-.3,a.z1+.3])].sort((a,b)=>a[0]-b[0]);

  const pushSeg = (axis, line, from, to, cuts) => {
    let start = from;
    for (const [a, b] of cuts) {
      if (b <= start) continue;
      if (a >= to) break;
      if (a > start) CURB_SEGMENTS.push({ axis, line, a: start, b: Math.min(a, to) });
      start = Math.max(start, b);
    }
    if (start < to) CURB_SEGMENTS.push({ axis, line, a: start, b: to });
  };

  const corridors=[...MAP.streets,...MAP.alleys.map(a=>({axis:'x',c:(a.z0+a.z1)/2,half:(a.z1-a.z0)/2,from:a.x0,to:a.x1}))];
  for (const st of corridors) {
    if (st.axis === 'x') {
      for (const s of [-1, 1]) pushSeg('z', st.c + s * st.half, st.from, st.to, cutsX);
    } else {
      for (const s of [-1, 1]) pushSeg('x', st.c + s * st.half, st.from, st.to, cutsZ);
    }
  }
}


buildCurbSegments();

const ROAD_FURNITURE=[];
function onDrivingRoad(x,z,margin=.65){
 if(typeof ASSYUT!=='undefined'){const p=nearestAssyutRoad({x,z});return p&&p.distance<p.width/2+margin;}
 for(const st of MAP.streets){const along=st.axis==='x'?x:z,across=st.axis==='x'?z:x;if(along>=st.from-margin&&along<=st.to+margin&&Math.abs(across-st.c)<st.half+margin)return true;}
 return MAP.alleys.some(a=>x>a.x0-margin&&x<a.x1+margin&&z>a.z0-margin&&z<a.z1+margin);
}
