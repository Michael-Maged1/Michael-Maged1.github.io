/* Shared geometry checks for buildings, navigation and traffic. */
function segmentBoxHit(a,b,x0,x1,z0,z1){let lo=0,hi=1;for(const[p,d,min,max]of[[a.x,b.x-a.x,x0,x1],[a.z,b.z-a.z,z0,z1]]){if(Math.abs(d)<1e-8){if(p<min||p>max)return false;}else{let u=(min-p)/d,v=(max-p)/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}return true;}
function nearbyRoadSegments(box){const seen=new Set(),list=[];for(let x=Math.floor(box.x0/40);x<=Math.floor(box.x1/40);x++)for(let z=Math.floor(box.z0/40);z<=Math.floor(box.z1/40);z++)for(const i of ASSYUT.spatial.get(x+','+z)||[])if(!seen.has(i)){seen.add(i);list.push(ASSYUT.segments[i]);}return list;}
function roadCutsBuilding(x,z,w,d,padding=2.0){const box={x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2};return nearbyRoadSegments(box).some(s=>{const m=s.width/2+padding;return segmentBoxHit(s.a,s.b,box.x0-m,box.x1+m,box.z0-m,box.z1+m);});}
function roadCutsOrientedBuilding(x,z,heading,hl,hw,padding=1.6){const radius=Math.hypot(hl,hw)+12,c=Math.cos(heading),s=Math.sin(heading),local=p=>({x:(p.x-x)*c-(p.z-z)*s,z:(p.x-x)*s+(p.z-z)*c});return nearbyRoadSegments({x0:x-radius,x1:x+radius,z0:z-radius,z1:z+radius}).some(e=>{const m=e.width/2+padding;return segmentBoxHit(local(e.a),local(e.b),-hl-m,hl+m,-hw-m,hw+m);});}
const ROUTE_OBSTACLES={map:new Map(),version:-1};
function refreshRouteObstacles(){if(ROUTE_OBSTACLES.version===MAP.buildings.length)return;ROUTE_OBSTACLES.map.clear();for(const b of MAP.buildings)for(let x=Math.floor(b.x0/40);x<=Math.floor(b.x1/40);x++)for(let z=Math.floor(b.z0/40);z<=Math.floor(b.z1/40);z++){const key=x+','+z;if(!ROUTE_OBSTACLES.map.has(key))ROUTE_OBSTACLES.map.set(key,[]);ROUTE_OBSTACLES.map.get(key).push(b);}ROUTE_OBSTACLES.version=MAP.buildings.length;}
function segmentHitsBuilding(a,b,padding=.4){refreshRouteObstacles();const seen=new Set();for(let x=Math.floor((Math.min(a.x,b.x)-padding)/40);x<=Math.floor((Math.max(a.x,b.x)+padding)/40);x++)for(let z=Math.floor((Math.min(a.z,b.z)-padding)/40);z<=Math.floor((Math.max(a.z,b.z)+padding)/40);z++)for(const o of ROUTE_OBSTACLES.map.get(x+','+z)||[]){if(seen.has(o))continue;seen.add(o);if(o.oriented){const q=o.oriented,c=Math.cos(q.heading),s=Math.sin(q.heading),local=p=>({x:(p.x-q.x)*c-(p.z-q.z)*s,z:(p.x-q.x)*s+(p.z-q.z)*c});if(segmentBoxHit(local(a),local(b),-q.hl-padding,q.hl+padding,-q.hw-padding,q.hw+padding))return true;}else if(segmentBoxHit(a,b,o.x0-padding,o.x1+padding,o.z0-padding,o.z1+padding))return true;}return false;}

function trafficObstacleHit(x,z,heading,hl,hw,ox,oz,oheading,ohl,ohw){
 const fx=Math.cos(heading),fz=-Math.sin(heading),c=Math.cos(oheading),s=Math.sin(oheading);
 const local=p=>({x:(p.x-ox)*c-(p.z-oz)*s,z:(p.x-ox)*s+(p.z-oz)*c});
 return segmentBoxHit(local({x:x-fx*hl,z:z-fz*hl}),local({x:x+fx*hl,z:z+fz*hl}),-ohl-hw-.12,ohl+hw+.12,-ohw-hw-.12,ohw+hw+.12);
}
function trafficFootprintClear(x,z,heading,hl,hw,y=null){
 const fx=Math.cos(heading),fz=-Math.sin(heading);
 if(segmentHitsBuilding({x:x-fx*hl,z:z-fz*hl},{x:x+fx*hl,z:z+fz*hl},hw+.18))return false;
 if(y===null)return true;
 if(typeof INFRA!=='undefined'&&INFRA.barriers){
  for(const b of INFRA.barriers){
   if(Math.abs(x-b.x)>b.hl+hl+2||Math.abs(z-b.z)>b.hl+hl+2)continue;
   const solid=b.kind==='tunnel'?(y+1.5>=b.h&&y<=b.h+(b.height??3.3)+.3):(y>=b.h-.9&&y<=b.h+(b.height??.7)+.5)||(b.h<3.8&&y<b.h+(b.height??.7));
   if(solid&&trafficObstacleHit(x,z,heading,hl,hw+(b.h<3.8?0.45:0),b.x,b.z,b.heading,b.hl,b.hw))return false;
  }
 }
 if(typeof INFRA!=='undefined'&&INFRA.supports){
  for(const f of [...INFRA.supports,...(ROAD_FURNITURE||[])]){
   if(Math.abs(x-f.x)>hl+2||Math.abs(z-f.z)>hl+2)continue;
   if(f.kind!=='bridge-support')continue;
   if(Number.isFinite(f.top)&&y>f.top+.18)continue;
   if(trafficObstacleHit(x,z,heading,hl,hw,f.x,f.z,0,.65,.65))return false;
  }
 }
 if(typeof TREES!=='undefined'&&y<3){
  for(const tr of TREES){
   if(Math.abs(x-tr.x)>hl+1.5||Math.abs(z-tr.z)>hl+1.5)continue;
   if(trafficObstacleHit(x,z,heading,hl,hw,tr.x,tr.z,0,.35,.35))return false;
  }
 }
 return true;
}
function bridgeCutsBox(x,z,w,d,margin=3.2){
 if(typeof INFRA==='undefined'||!INFRA.profiles)return false;
 for(const [ri,p]of INFRA.profiles){
  if(p.kind!=='bridge')continue;
  const pad=(ASSYUT.roads[ri]?.width||8)/2+margin;
  for(const si of ASSYUT.roads[ri].segments){const s=ASSYUT.segments[si];if(segmentBoxHit(s.a,s.b,x-w/2-pad,x+w/2+pad,z-d/2-pad,z+d/2+pad))return true;}
 }
 return false;
}
