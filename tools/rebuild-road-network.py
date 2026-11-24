"""Game adaptation of OSM: open two-way streets, same-grade junctions and connected end streets."""
import json,gzip,math,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];file=ROOT/'src/game/12-assyut-layout.js';text=file.read_text();start=text.index('const ASSYUT_DATA=')+len('const ASSYUT_DATA=');end=text.index(';\nconst ASSYUT=',start);doc=json.loads(text[start:end]);source=ROOT/'assets/road-network-source.json.gz'
if not source.exists():
 with gzip.open(source,'wt',encoding='utf8')as f:json.dump(doc['roads'],f,ensure_ascii=False,separators=(',',':'))
with gzip.open(source,'rt',encoding='utf8')as f:raw=json.load(f)
spec=(ROOT/'src/game/13-infrastructure-data.js').read_text();tags=json.loads(spec[spec.index('tags:')+5:spec.index(',profiles:')]);bounds=doc['bounds'];x0,x1,z0,z1=bounds['x0']+24,bounds['x1']-24,bounds['z0']+24,bounds['z1']-24
roads=[];nodes={};positions={};uid=900000000001

def node(x,z,h=0):
 global uid
 key=(round(x,2),round(z,2))
 for nh,nid in nodes.get(key,[]):
  if abs(h-nh)<.35:return [key[0],key[1],nid]
 nid=uid;uid+=1;nodes.setdefault(key,[]).append((h,nid));positions[nid]=(key[0],key[1],h);return [key[0],key[1],nid]
def elevation(ri,d):
 r=roads[ri];tag=tags.get(r[0].split('_')[0]);length=r[6]
 if not tag or length<=12:return 0
 ramp=min(35 if tag['kind']=='tunnel'else 55,length*.35);return(-2.6 if tag['kind']=='tunnel'else 3.8)*min(1,max(0,d)/ramp,max(0,length-d)/ramp)
for r in raw:
 pts=[]
 for p in r[5]:
  q=[max(x0,min(x1,p[0])),max(z0,min(z1,p[1]))]
  if not pts or math.dist(q,pts[-1])>.1:pts.append(q)
 if len(pts)<2:continue
 length=sum(math.dist(a,b)for a,b in zip(pts,pts[1:]));roads.append([*r[:3],max(8,r[3]),'no',[],length]);ri=len(roads)-1;d=0
 for i,p in enumerate(pts):
  if i:d+=math.dist(pts[i-1],p)
  roads[ri][5].append(node(*p,elevation(ri,d)))
roads.append(['game-ring','الطريق الدائري للمدينة','secondary',10,'no',[node(x0,z0),node(x1,z0),node(x1,z1),node(x0,z1),node(x0,z0)],2*(x1-x0+z1-z0)])
def segments():
 out=[]
 for ri,r in enumerate(roads):
  d=0
  for k,(a,b)in enumerate(zip(r[5],r[5][1:])):
   length=math.dist(a[:2],b[:2])
   if length>.1:out.append((ri,k,a,b,length,d))
   d+=length
 return out

def project(p,s):
 _,_,a,b,l,_=s;dx,dz=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(l*l)));return t,(a[0]+dx*t,a[1]+dz*t)

def split_intersections():
 seg=segments();grid=collections.defaultdict(list);pairs=set();cuts={};cell=48
 for i,s in enumerate(seg):
  a,b=s[2:4]
  for x in range(math.floor(min(a[0],b[0])/cell),math.floor(max(a[0],b[0])/cell)+1):
   for z in range(math.floor(min(a[1],b[1])/cell),math.floor(max(a[1],b[1])/cell)+1):
    for j in grid[x,z]:pairs.add((j,i))
    grid[x,z].append(i)
 def cut(i,t,p):
  s=seg[i];h=elevation(s[0],s[5]+t*s[4]);cuts.setdefault((s[0],s[1]),[]).append((t,node(*p,h)))
 count=0
 for i,j in pairs:
  a,b=seg[i],seg[j];ax,az=a[2][:2];bx,bz=a[3][:2];cx,cz=b[2][:2];dx,dz=b[3][:2];rx,rz=bx-ax,bz-az;sx,sz=dx-cx,dz-cz;den=rx*sz-rz*sx
  if abs(den)<1e-7:
   for ii,jj in[(i,j),(j,i)]:
    for p in seg[ii][2:4]:
     t,q=project(p,seg[jj])
     if math.dist(p[:2],q)<.025 and abs(elevation(seg[ii][0],seg[ii][5]+(0 if p is seg[ii][2]else seg[ii][4]))-elevation(seg[jj][0],seg[jj][5]+t*seg[jj][4]))<.35:cut(jj,t,q)
   continue
  t=((cx-ax)*sz-(cz-az)*sx)/den;u=((cx-ax)*rz-(cz-az)*rx)/den
  if -1e-7<=t<=1.0000001 and -1e-7<=u<=1.0000001:
   t=max(0,min(1,t));u=max(0,min(1,u));ha=elevation(a[0],a[5]+t*a[4]);hb=elevation(b[0],b[5]+u*b[4])
   if abs(ha-hb)>.35:continue
   p=(ax+rx*t,az+rz*t);cut(i,t,p);cut(j,u,p);count+=1
 for ri,r in enumerate(roads):
  points=[]
  for k,(a,b)in enumerate(zip(r[5],r[5][1:])):
   values=[(0,a),(1,b),*cuts.get((ri,k),[])];values.sort(key=lambda q:q[0])
   for _,p in values:
    if not points or math.dist(p[:2],points[-1][:2])>.07:points.append(p)
  r[5]=points;r[6]=sum(math.dist(a[:2],b[:2])for a,b in zip(points,points[1:]))
 return count

def graph():
 adj=collections.defaultdict(set);membership=collections.defaultdict(set)
 for ri,r in enumerate(roads):
  for a,b in zip(r[5],r[5][1:]):adj[a[2]].add(b[2]);adj[b[2]].add(a[2]);membership[a[2]].add(ri);membership[b[2]].add(ri)
 unseen=set(adj);groups=[]
 while unseen:
  todo=[unseen.pop()];group=set(todo)
  while todo:
   for v in adj[todo.pop()]:
    if v in unseen:unseen.remove(v);group.add(v);todo.append(v)
  groups.append(group)
 return adj,membership,sorted(groups,key=len,reverse=True)

def connection(nid,candidates,exclude):
 p=positions[nid];best=None
 for s in candidates:
  if s[0]in exclude or nid in(s[2][2],s[3][2]):continue
  t,q=project(p,s);distance=math.dist(p[:2],q)
  if distance<9 or abs(elevation(s[0],s[5]+t*s[4]))>.2:continue
  if best is None or distance<best[0]:best=(distance,q)
 return best

def link(nid,q):
 p=positions[nid];a=node(*p[:2]);b=node(*q);roads.append(['game-link-'+str(len(roads)),'وصلة مرورية','residential',8,'no',[a,b],math.dist(a[:2],b[:2])])
print('Initial crossings:',split_intersections(),flush=True)
_,membership,groups=graph();base=groups[0];baseSeg=[s for s in segments()if s[2][2]in base and s[3][2]in base]
for group in groups[1:]:
 best=None
 for nid in group:
  if abs(positions[nid][2])>.2:continue
  c=connection(nid,baseSeg,membership[nid])
  if c and(best is None or c[0]<best[0]):best=(*c,nid)
 if best:link(best[2],best[1])
print('Connected components:',len(groups),flush=True);split_intersections()
for iteration in range(1):
 adj,membership,groups=graph();leaves=[nid for nid,a in adj.items()if len(a)==1];print('Leaf pass',iteration,len(leaves),'components',len(groups),flush=True)
 if not leaves:break
 seg=segments()
 for nid in leaves:
  c=connection(nid,seg,membership[nid])
  if c:link(nid,c[1])
 split_intersections()
for _ in range(2000):
 adj,_,groups=graph();peel={n for n,a in adj.items()if len(a)<2}
 if not peel:break
 for r in roads:
  pts=[]
  for p in r[5]:
   if p[2]not in peel and(not pts or math.dist(p[:2],pts[-1][:2])>.11):pts.append(p)
  r[5]=pts;r[6]=sum(math.dist(a[:2],b[:2])for a,b in zip(pts,pts[1:]))
 roads[:]=[r for r in roads if len(r[5])>=2]
adj,_,groups=graph();report={'originalRoads':len(raw),'roads':len(roads),'segments':sum(len(r[5])-1 for r in roads),'components':len(groups),'deadEnds':sum(len(a)<2 for a in adj.values()),'minimumWidth':min(r[3]for r in roads),'adaptations':'Two-way gameplay streets, widened alleys, same-level intersection welding, connecting end streets and an inset perimeter loop.'};print(json.dumps(report),flush=True)
assert len(groups)==1 and report['deadEnds']==0
for r in roads:del r[6:]
doc['roads']=roads;doc['source']['gameplayAdaptations']=report
file.write_text(text[:start]+json.dumps(doc,ensure_ascii=False,separators=(',',':'))+text[end:]);(ROOT/'assets/road-network-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
