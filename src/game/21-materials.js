/* Procedural HDRI reflection studio: realistic Egyptian sun radiance, atmospheric sky dome & ground bounce for automotive paint & glass reflections. */
const reflectionWorld = new THREE.Scene();
reflectionWorld.background = new THREE.Color(0xa2bfd4);
const envSphere = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {},
  vertexShader: `varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 vP; void main(){
    vec3 d=normalize(vP); float h=d.y;
    vec3 gnd=vec3(.20,.18,.15);
    vec3 hor=vec3(.82,.86,.90)*1.35;
    vec3 skyTop=vec3(.18,.44,.82)*1.65;
    vec3 c=h>0.?mix(hor,skyTop,smoothstep(0.,.72,h)):mix(hor,gnd,smoothstep(0.,-.42,h));
    vec3 sunDir=normalize(vec3(.55,.70,-.45));
    float sunDot=max(dot(d,sunDir),0.);
    float sunCore=pow(sunDot,1200.)*24.;
    float sunCorona=pow(sunDot,42.)*3.8;
    float sunGlow=pow(sunDot,6.)*.85;
    c+=(vec3(1.,.94,.82)*sunCore+vec3(1.,.88,.68)*sunCorona+vec3(1.,.80,.55)*sunGlow);
    float horBand=1.-smoothstep(0.,.12,abs(h-.03));
    float cityDetail=sin(atan(d.z,d.x)*18.)*.5+sin(atan(d.z,d.x)*37.)*.25;
    c=mix(c,c*(.72+.28*cityDetail),horBand*.45);
    gl_FragColor=vec4(c,1.);
  }`
}));
reflectionWorld.add(envSphere);
const envBake=new THREE.PMREMGenerator(renderer);
const reflectionTarget=envBake.fromScene(reflectionWorld,.04,.1,256);
scene.environment=reflectionTarget.texture;
if('environmentIntensity'in scene)scene.environmentIntensity=1.25;
reflectionWorld.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
envBake.dispose();

function detailVehicle(root, length=4.2, width=1.8, tall=false) {
 const trim=new THREE.MeshStandardMaterial({color:0x15191b,roughness:.65});
 const alloy=new THREE.MeshStandardMaterial({color:0xc5ccd0,metalness:.95,roughness:.16,envMapIntensity:1.45});
 const lens=new THREE.MeshPhysicalMaterial({color:0xbed3df,metalness:.15,roughness:.05,clearcoat:1,clearcoatRoughness:.04,reflectivity:.98,envMapIntensity:1.6});
 const line=(pts,mat=trim,r=.009)=>{
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  const m=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(3,pts.length*3),r,5,false),mat);root.add(m);return m;
 };
 const half=width/2+.012;
 for(const s of [-1,1]) {
  const z=s*half;
  // Door shut lines, sill, belt trim, handles and mirror housing.
  for(const x of [-.95,.15,.93]) line([[x,.46,z],[x,.79,z],[x-.06,.94,z]]);
  line([[-length*.43,.43,z],[length*.43,.43,z]],trim,.022);
  line([[-length*.39,.92,z],[length*.29,.92,z]],alloy,.012);
  for(const x of [-.63,.55]) {
   const h=new THREE.Mesh(new THREE.BoxGeometry(.19,.035,.035),alloy);h.position.set(x,.85,z+s*.015);root.add(h);
  }
  const mirror=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),trim);
  mirror.scale.set(.15,.075,.095);mirror.position.set(.89,1.01,s*(half+.14));root.add(mirror);
  const mirrorFace=new THREE.Mesh(new THREE.CircleGeometry(.063,14),lens);
  mirrorFace.rotation.y=-Math.PI/2;mirrorFace.position.set(.756,1.01,s*(half+.14));root.add(mirrorFace);
 }
 // Radiator slats and bonnet panel gaps.
 const front=length/2+.025;
 for(let i=0;i<7;i++) {
  const slat=new THREE.Mesh(new THREE.BoxGeometry(.018,.016,.65),alloy);
  slat.position.set(front,.55+i*.026,0);root.add(slat);
 }
 if(!tall) {
  for(const s of [-1,1]) line([[.99,.925,s*.66],[1.68,.875,s*.70],[length*.47,.835,s*.70]],trim,.006);
  for(const s of [-1,1]) line([[.56,1.015,s*.17],[.94,.935,s*.34]],trim,.013);
 }
}
