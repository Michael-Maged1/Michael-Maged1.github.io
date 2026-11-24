/* Directed navigation on the real OpenStreetMap graph, including one-way streets. */
const NAV_STREET_SPECS=[];
const DRIVER_ROADS={nodes:ASSYUT.nodes,edges:ASSYUT.edges,adj:ASSYUT.adj};
{
 const n=ASSYUT.nodes.length,seen=new Uint8Array(n),order=[],reverse=Array.from({length:n},()=>[]);
 for(const e of ASSYUT.edges)reverse[e.b].push(e.a);
 for(let root=0;root<n;root++){if(seen[root])continue;const stack=[[root,0]];seen[root]=1;while(stack.length){const top=stack[stack.length-1],adj=ASSYUT.adj[top[0]];if(top[1]<adj.length){const v=adj[top[1]++].to;if(!seen[v]){seen[v]=1;stack.push([v,0]);}}else{order.push(top[0]);stack.pop();}}}
 const labels=new Int32Array(n).fill(-1),groups=[];
 for(let i=order.length-1;i>=0;i--){const root=order[i];if(labels[root]>=0)continue;const id=groups.length,list=[],stack=[root];labels[root]=id;while(stack.length){const u=stack.pop();list.push(u);for(const v of reverse[u])if(labels[v]<0){labels[v]=id;stack.push(v);}}groups.push(list);}
 const largest=groups.reduce((a,b)=>b.length>a.length?b:a,[]),allowed=new Set(largest);ASSYUT.navigableNodes=allowed;
 const places=ASSYUT.places.filter(p=>{const near=nearestAssyutRoad(p);return allowed.has(near.segment.aNode)&&allowed.has(near.segment.bNode);});
 ASSYUT.places=places.length>2?places:ASSYUT.places;MAP.places=ASSYUT.places;PLACES.splice(0,PLACES.length,...ASSYUT.places);
 // Start on a clear ground-level lane, facing its permitted traffic direction.
 const spawnEdges=ASSYUT.edges.filter(e=>allowed.has(e.a)&&allowed.has(e.b)&&e.length>28&&ASSYUT.roads[e.road].width>=9&&!INFRA.profiles.has(e.road)).sort((a,b)=>{const x=ASSYUT.nodes[a.a],y=ASSYUT.nodes[a.b],u=ASSYUT.nodes[b.a],v=ASSYUT.nodes[b.b];return Math.hypot((x.x+y.x)/2,(x.z+y.z)/2)-Math.hypot((u.x+v.x)/2,(u.z+v.z)/2);});
 const galaaEdge=spawnEdges.find(e=>(ASSYUT.roads[e.road]?.name?.includes("الجلاء")||e.segment===5)&&!driveSurfaceCandidates((ASSYUT.nodes[e.a].x+ASSYUT.nodes[e.b].x)/2,(ASSYUT.nodes[e.a].z+ASSYUT.nodes[e.b].z)/2).some(p=>INFRA.profiles.has(p.road)));
 const edge=galaaEdge||spawnEdges.find(e=>{const f=edgeFrame(e),x=(f.a.x+f.b.x)/2,z=(f.a.z+f.b.z)/2;return !driveSurfaceCandidates(x,z).some(p=>INFRA.profiles.has(p.road));})||spawnEdges[0];
 if(edge){const f=edgeFrame(edge);ASSYUT.start={x:(f.a.x+f.b.x)/2-f.fz*2,z:(f.a.z+f.b.z)/2+f.fx*2,heading:Math.atan2(-f.fz,f.fx),segment:edge.segment,road:edge.road};car.x=ASSYUT.start.x;car.z=ASSYUT.start.z;car.heading=ASSYUT.start.heading;car.y=0;car.surfaceRoad=edge.road;}

}
function closestRoadEdges(point){
 let near=nearestAssyutRoad(point);if(Number.isInteger(point.roadIndex)&&ASSYUT.roads[point.roadIndex]){let best=null;for(const index of ASSYUT.roads[point.roadIndex].segments){const s=ASSYUT.segments[index],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((point.x-s.a.x)*dx+(point.z-s.a.z)*dz)/(s.length*s.length),0,1),p={x:s.a.x+dx*t,z:s.a.z+dz*t},distance=Math.hypot(point.x-p.x,point.z-p.z);if(!best||distance<best.distance)best={index,t,point:p,distance};}if(best&&best.distance<18)near=best;}if(!near)return [];
 return ASSYUT.edges.filter(e=>e.segment===near.index).map(edge=>({edge,t:edge.dir===1?near.t:1-near.t,point:{...near.point},distance:near.distance}));
}
function roadRoute(from,to){
 const starts=closestRoadEdges(from),ends=closestRoadEdges(to),n=ASSYUT.nodes.length,start=n,goal=n+1,extra=new Map(),put=(a,e)=>{if(!extra.has(a))extra.set(a,[]);extra.get(a).push(e);};
 const useHeading=Number.isFinite(from.heading)&&(from.speed||0)>1.8,fx=useHeading?Math.cos(from.heading):0,fz=useHeading?-Math.sin(from.heading):0;
 for(const s of starts){let pen=0;if(useHeading&&s.edge.length>.5){const na=ASSYUT.nodes[s.edge.a],nb=ASSYUT.nodes[s.edge.b],dot=((nb.x-na.x)*fx+(nb.z-na.z)*fz)/s.edge.length;if(dot<-.25)pen=(1-dot)*45;}put(start,{to:s.edge.b,cost:s.distance+(1-s.t)*s.edge.length+pen,via:{...s.point,roadIndex:s.edge.road}});}
 for(const e of ends)put(e.edge.a,{to:goal,cost:e.t*e.edge.length+e.distance,via:{...e.point,roadIndex:e.edge.road}});
 for(const s of starts)for(const e of ends)if(s.edge===e.edge&&e.t>=s.t)put(start,{to:goal,cost:s.distance+(e.t-s.t)*s.edge.length+e.distance,via:{...s.point,roadIndex:s.edge.road},viaEnd:{...e.point,roadIndex:e.edge.road}});
 const costs=new Float64Array(n+2).fill(Infinity),prev=Array(n+2),heap=[];costs[start]=0;
 const push=(node,cost)=>{let i=heap.length;heap.push({node,cost});while(i>0){const p=(i-1)>>1;if(heap[p].cost<=cost)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let k=i,l=i*2+1,r=l+1;if(l<heap.length&&heap[l].cost<heap[k].cost)k=l;if(r<heap.length&&heap[r].cost<heap[k].cost)k=r;if(k===i)break;[heap[k],heap[i]]=[heap[i],heap[k]];i=k;}}return first;};
 push(start,0);
 while(heap.length){const {node:u,cost}=pop();if(cost>costs[u])continue;if(u===goal)break;for(const e of [...(ASSYUT.adj[u]||[]),...(extra.get(u)||[])]){const sum=cost+e.cost;if(sum<costs[e.to]){costs[e.to]=sum;prev[e.to]={u,e};push(e.to,sum);}}}
 if(!Number.isFinite(costs[goal]))return {points:[{...from}],length:Infinity,reachable:false};
 const chain=[];let cur=goal;while(cur!==start&&prev[cur]){chain.push(prev[cur]);cur=prev[cur].u;}chain.reverse();
 const points=[{...from}];for(const {e}of chain){if(e.via)points.push({...e.via});if(e.viaEnd)points.push({...e.viaEnd});if(e.to<n)points.push({...ASSYUT.nodes[e.to],roadIndex:Number.isInteger(e.edge)?ASSYUT.edges[e.edge].road:e.via?.roadIndex});}points.push({...to});
 return {points:points.filter((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.1),length:costs[goal],reachable:true};
}
function riderRoadStop(point){return assyutRoadStop(point);}

function refreshRideNavigation(){
 const target=M.phase==='toPick'?{x:M.pickupX,z:M.pickupZ,roadIndex:M.pickupRoad}:M.phase==='toDest'?{x:M.destX,z:M.destZ,roadIndex:M.destRoad}:null;
 setNavigationTarget(target);
}
function rideNavigationAim(){
 const nav=RIDE.navigation;if(!nav?.reachable)return null;const p=nav.points,progress=navigationProgress(nav);if(!progress)return p[p.length-1];
 const final=nav.target||p[p.length-1];
 let left=clamp(Math.abs(car.speed)*.45+5,5,11),a=progress;
 for(let i=progress.index;i<p.length-1;i++){
  const b=p[i+1],distance=Math.hypot(b.x-a.x,b.z-a.z);
  if(left<=distance){const t=left/Math.max(.01,distance);return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),roadIndex:b.roadIndex};}
  left-=distance;
  // Show the corner itself until reached, never aim diagonally across the block.
  if(i<p.length-2&&distance>2){const c=p[i+2],ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z;if((ux*vx+uz*vz)/Math.max(.01,distance*Math.hypot(vx,vz))<.94)return b;}
  a=b;
 }
 return final;
}
function navigationArrowTarget(lookAhead=20){
 const nav=RIDE.navigation;if(!nav?.reachable)return null;const p=nav.points,progress=navigationProgress(nav);if(!progress)return p[p.length-1];
 const final=nav.target||p[p.length-1];
 let left=clamp(Math.max(lookAhead,Math.abs(car.speed)*.7+15),14,28),a=progress,walked=0;
 for(let i=progress.index;i<p.length-1;i++){
  const b=p[i+1],distance=Math.hypot(b.x-a.x,b.z-a.z);
  if(distance<.05){a=b;continue;}
  if(left<=distance){const t=left/distance;return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),roadIndex:b.roadIndex};}
  left-=distance;walked+=distance;
  if(walked>4&&i<p.length-2&&distance>2){const c=p[i+2],ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z;if((ux*vx+uz*vz)/Math.max(.01,distance*Math.hypot(vx,vz))<.92)return b;}
  a=b;
 }
 return final;
}
function navigationArrowGuide(){
 const nav=RIDE.navigation;if(!nav?.reachable)return null;
 const pts=remainingNavigationPoints(),final=nav.target||pts[pts.length-1];
 if(pts.length<2)return {lead:0,guide:final,final};
 let walked=0,cornerDist=Infinity,guide=final;
 for(let i=0;i<pts.length-1;i++){
  const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<.05)continue;
  if(i<pts.length-2&&cornerDist===Infinity){
   const c=pts[i+2],len2=Math.hypot(c.x-b.x,c.z-b.z);
   if(len2>.5&&((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z))/(len*len2)<.86)cornerDist=walked+len;
  }
  walked+=len;
 }
 const lead=cornerDist<15?clamp(cornerDist,7,15):15;
 const sampleAt=dist=>{let rem=dist;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<.05)continue;if(rem<=len){const t=rem/len;return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),roadIndex:b.roadIndex};}rem-=len;}return final;};
 const guideDist=cornerDist<15?cornerDist+12:Math.min(lead+12,cornerDist<Infinity?cornerDist:lead+12);
 guide=sampleAt(guideDist);
 return {lead,guide,final};
}

function curbsideRidePlace(place){const p=nearestAssyutRoad(place);if(!p)return {...place};const side=p.side;return {...place,x:p.point.x+p.nx*side*(p.width/2+1),z:p.point.z+p.nz*side*(p.width/2+1)};}

// Keep progress along one route; do not send the driver back to each fresh projection.
function navigationProgress(nav){
 const p=nav?.points;if(!p?.length)return null;const startIdx=Math.max(0,(nav.cursor||0)-2);let best=null,span=0;
 for(let i=startIdx;i<Math.min(p.length-1,startIdx+30);i++){const a=p[i],b=p[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.01)continue;const t=clamp(((car.x-a.x)*dx+(car.z-a.z)*dz)/(len*len),0,1),x=a.x+dx*t,z=a.z+dz*t,d=Math.hypot(x-car.x,z-car.z);if(!best||d<best.distance-.12)best={index:i,t,x,z,distance:d,len};if(i>=startIdx+2){span+=len;if(span>180)break;}}
 if(!best)return {index:0,t:1,x:p[0].x,z:p[0].z,distance:Math.hypot(car.x-p[0].x,car.z-p[0].z),len:0};
 nav.cursor=best.index;let remaining=(1-best.t)*best.len;for(let i=best.index+1;i<p.length-1;i++)remaining+=Math.hypot(p[i+1].x-p[i].x,p[i+1].z-p[i].z);nav.remaining=remaining;return best;
}
function setNavigationTarget(target){
 if(!target){RIDE.navigation=null;return;}
 let nav=RIDE.navigation,progress=navigationProgress(nav);
 if(!nav?.reachable||!nav.target||Math.hypot(nav.target.x-target.x,nav.target.z-target.z)>.5||!progress||progress.distance>28){nav=roadRoute({x:car.x,z:car.z,roadIndex:car.surfaceRoad,heading:car.heading,speed:car.speed},target);nav.target={...target};nav.cursor=0;RIDE.navigation=nav;RIDE.navIndex=1;navigationProgress(nav);}
}
function nearbyNavigationStop(from,minDistance=65,maxDistance=350){
 const candidates=ASSYUT.segments.filter(s=>{
  if(s.width<7||s.length<=18||INFRA.profiles.has(s.road)||!ASSYUT.navigableNodes.has(s.aNode)||!ASSYUT.navigableNodes.has(s.bNode))return false;
  const d=Math.hypot((s.a.x+s.b.x)/2-from.x,(s.a.z+s.b.z)/2-from.z);
  return d>=minDistance*0.7&&d<=maxDistance*0.95;
 });
 for(let tries=0;tries<Math.min(18,candidates.length);tries++){const index=Math.floor(Math.random()*candidates.length),s=candidates.splice(index,1)[0],offset=Math.max(.5,s.width/2-2),nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,sign=ASSYUT.roads[s.road].oneway==='-1'?-1:1,p={x:(s.a.x+s.b.x)/2+nx*offset*sign,z:(s.a.z+s.b.z)/2+nz*offset*sign,roadIndex:s.road,name:ASSYUT.roads[s.road].name},route=roadRoute(from,p);if(route.reachable&&route.length>=minDistance&&route.length<=maxDistance)return {...p,route};}
 return null;
}
function remainingNavigationPoints(){const nav=RIDE.navigation,p=navigationProgress(nav);return p?[{x:p.x,z:p.z},...nav.points.slice(p.index+1)]:nav?.points||[];}
function renderRouteGuidance(){const panel=$('routeGuidance');if(!panel)return;const aim=rideNavigationAim(),nav=RIDE.navigation,active=G.state==='play'&&!!aim&&!!nav?.target;panel.classList.toggle('hidden',!active);if(!active)return;const dx=aim.x-car.x,dz=aim.z-car.z,fx=Math.cos(car.heading),fz=-Math.sin(car.heading),angle=Math.atan2(dx*(-fz)+dz*fx,dx*fx+dz*fz),near=(nav.remaining??Infinity)<14;panel.textContent=near?'◎ قف داخل الدائرة المضيئة لإنهاء المرحلة':`${Math.abs(angle)>2.3?'↶ لف وارجع بأمان':angle>.45?'↱ اتجه يمينًا':angle<-.45?'↰ اتجه يسارًا':'↑ استمر للأمام'} · ${Math.ceil(nav.remaining??nav.length)} م متبقية`;}
function navigationStopHeight(point){if(Number.isFinite(point.height))return point.height;if(Number.isInteger(point.roadIndex)&&ASSYUT.roads[point.roadIndex]){let best=null;for(const index of ASSYUT.roads[point.roadIndex].segments){const s=ASSYUT.segments[index],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((point.x-s.a.x)*dx+(point.z-s.a.z)*dz)/(s.length*s.length),0,1),d=Math.hypot(point.x-s.a.x-dx*t,point.z-s.a.z-dz*t);if(!best||d<best.d)best={d,h:infrastructureHeight(s.road,s.s0+t*s.length)};}if(best)return best.h;}return assyutRoadHeightAt(point.x,point.z);}
