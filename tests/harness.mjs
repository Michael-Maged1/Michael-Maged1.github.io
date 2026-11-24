import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import vm from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const real=await import(uri(fs.readFileSync(root+'vendor/three.module.js')));
const gradient={addColorStop(){}};
const canvasContext=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:t=>({width:t.length*10}),getImageData:()=>({data:new Uint8ClampedArray(4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(target,p)=>p in target?target[p]:()=>{}});
export function createGameHarness(initialStorage={}){
const storage=new Map(Object.entries(initialStorage));
const elements=new Map(),listeners={};
function element(){
 const classes=new Set(),handlers={};
 return {style:{setProperty(){}},classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),toggle:(n,force)=>{const on=force===undefined?!classes.has(n):force;if(on)classes.add(n);else classes.delete(n);return on;},contains:n=>classes.has(n)},dataset:{},width:256,height:256,appendChild(){},replaceWith(){},remove(){},addEventListener:(type,fn)=>(handlers[type]||=([])).push(fn),handlers,querySelectorAll:()=>[],getContext:()=>canvasContext,setPointerCapture(){}};
}
const doc={body:element(),getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:()=>element(),querySelectorAll:()=>[],addEventListener:(e,f)=>(listeners[e]||=([])).push(f)};
class FakeRenderer{constructor(){this.domElement=element();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};}setPixelRatio(){}setSize(){}render(){}dispose(){}forceContextLoss(){}}
class FakePMREM{fromScene(){return {texture:new real.Texture()}}dispose(){}}
class FakeLoader{setMeshoptDecoder(){return this}parseAsync(){throw Error('No fixture asset expected')}}
const sandbox={console,Math,Date,performance,Uint8Array,Float32Array,Uint8ClampedArray,THREE:{...real,WebGLRenderer:FakeRenderer,PMREMGenerator:FakePMREM},GLTFLoader:FakeLoader,cloneSkeleton:o=>o.clone(),MeshoptDecoder:{},document:doc,innerWidth:1280,innerHeight:800,devicePixelRatio:1,navigator:{userAgent:'test'},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},matchMedia:()=>({matches:false}),requestAnimationFrame(){},addEventListener:(e,f)=>(listeners[e]||=([])).push(f),setTimeout:()=>0,clearTimeout(){},atob:s=>Buffer.from(s,'base64').toString('binary')};
sandbox.window=sandbox;sandbox.self=sandbox;
const context=vm.createContext(sandbox);
const files=fs.readdirSync(root+'src/game').filter(x=>x.endsWith('.js')).sort();
const script=files.map(f=>fs.readFileSync(root+'src/game/'+f,'utf8').replace(/^import .*?;\r?\n/gm,'')).join('\n');
vm.runInContext(script+'\nglobalThis.fixture={scene,road,MAP,car,G,M,keys,touch,physics,updateTraffic,SOLID,CURB_LINES,TREES,traffic,releaseDrivingInput,MEDIAN_SEGMENTS,facadeDetails,obbContact,playerBounds};',context,{timeout:60000});

return {context,elements,listeners,storage,source:script,real,root,vm};
}
