import bpy,bmesh,math,os
from mathutils import Vector
from PIL import Image,ImageDraw,ImageFont
ROOT='/workspace/work/alex-taxi/assets'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0,rough=.5,coat=0,alpha=1,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if 'Coat Weight' in p.inputs:p.inputs['Coat Weight'].default_value=coat
 if 'Alpha' in p.inputs:p.inputs['Alpha'].default_value=alpha
 if alpha<1:
  if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
  elif hasattr(m,'blend_method'):m.blend_method='BLEND'
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
paint=material('N17_Pearl_Silver',(.46,.48,.50),.62,.23,1)
chrome=material('N17_Chrome',(.64,.68,.70),.96,.16)
black=material('N17_Trim',(.014,.018,.021),.05,.62)
rubber=material('N17_Tyre_Rubber',(.012,.013,.014),0,.93)
glass=material('N17_Glass',(.28,.38,.44),.13,.08,.9,.18)
lens=material('N17_Headlight_Lens',(.73,.79,.81),.2,.13,.95,.50)
reflector=material('N17_Headlight_Reflector',(.62,.65,.67),.94,.16)
red=material('N17_Red_Lens',(.55,.012,.018),.15,.22,.9,1,.22)
amber=material('N17_Indicator_Lens',(.75,.25,.025),.2,.25,.6)
beige=material('N17_Cabin_Warm_Grey',(.31,.29,.26),0,.92)
soft=material('N17_Dashboard_Soft_Black',(.031,.036,.037),0,.86)
piano=material('N17_Console_Piano_Black',(.008,.012,.013),.15,.19,.8)
needleMat=material('N17_Needle_Red',(.96,.08,.025),0,.48,0,1,.3)
def attach(obj,mat,name,parent=None):
 obj.name=name;obj.data.materials.append(mat)
 if parent:obj.parent=parent
 return obj
def mesh(name,verts,faces,mat,parent=None,smooth=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);attach(o,mat,name,parent)
 if smooth:
  for p in me.polygons:p.use_smooth=True
 return o
def box(name,pos,size,mat,bevel=.015,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return attach(o,mat,name,parent)
def sphere(name,pos,scale,mat,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos);o=bpy.context.object;o.scale=scale
 for p in o.data.polygons:p.use_smooth=True
 return attach(o,mat,name,parent)
def cyl(name,pos,radius,depth,mat,rot=(0,0,0),parent=None,vertices=40):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=pos,rotation=rot);o=bpy.context.object
 for p in o.data.polygons:p.use_smooth=True
 return attach(o,mat,name,parent)
def torus(name,pos,major,minor,mat,rot=(0,0,0),parent=None):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=40,minor_segments=8,location=pos,rotation=rot);o=bpy.context.object
 for p in o.data.polygons:p.use_smooth=True
 return attach(o,mat,name,parent)
def curve(name,points,radius,mat,parent=None):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=3;cu.bevel_depth=radius;cu.bevel_resolution=2
 s=cu.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 if parent:o.parent=parent
 return o
def empty(name,pos=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos;return o
# N17 dimensions and profiles referenced against Nissan Motor Egypt's Sunny brochure.
sections=[(-2.212,.64,.76),(-2.16,.75,.83),(-2.02,.81,.91),(-1.70,.835,.98),(-1.32,.841,1.01),(-.83,.845,1.025),(-.25,.847,1.035),(.35,.845,1.04),(.88,.832,1.035),(1.25,.817,1.005),(1.66,.785,.94),(1.99,.74,.84),(2.17,.65,.71),(2.212,.55,.61)]
verts=[]
for x,w,h in sections:
 for y,z in [(-w*.84,.36),(-w,.48),(-w,h-.13),(-w*.96,h-.025),(-w*.70,h+.028),(0,h+.05),(w*.70,h+.028),(w*.96,h-.025),(w,h-.13),(w,.48),(w*.84,.36),(0,.34)]:verts.append((x,y,z))
n=12;faces=[]
for i in range(len(sections)-1):
 for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
faces+=[tuple(range(n-1,-1,-1)),tuple((len(sections)-1)*n+j for j in range(n))]
body=mesh('Nissan_Sunny_N17_Body',verts,faces,paint)
sub=body.modifiers.new('Pressed steel curvature','SUBSURF');sub.levels=2;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=sub.name)
# Actual wheel openings, rather than black disks pasted over a solid body.
for x in [-1.31,1.29]:
 cutter=cyl('Wheel arch cutter',(x,0,.315),.357,2.3,black,(math.pi/2,0,0),vertices=64)
 bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Wheel arch','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except:pass
 bpy.data.objects.remove(cutter,do_unlink=True)
# Hollow the cabin so the driver does not look through a solid body deck.
cutter=box('Cabin cavity',(-.20,0,1.0),(2.10,1.43,1.0),black,.08)
bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Hollow cabin','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
# Curved glass canopy and roof metal, with real A/B/C pillars.
cab=[(-1.34,.73,1.055),(-1.06,.70,1.27),(-.72,.655,1.455),(-.40,.65,1.50),(.27,.645,1.49),(.59,.67,1.35),(1.04,.735,1.06)]
verts=[]
for x,w,h in cab:
 for y,z in [(-.775,1.01),(-w,h-.025),(0,h+.012),(w,h-.025),(.775,1.01)]:verts.append((x,y,z))
faces=[(i*5+j,i*5+j+1,(i+1)*5+j+1,(i+1)*5+j)for i in range(len(cab)-1)for j in range(4)]
mesh('N17_Glass_Canopy',verts,faces,glass)
roof=mesh('N17_Roof',[(-.80,-.65,1.46),(-.80,0,1.49),(-.80,.65,1.46),(-.40,-.65,1.50),(-.40,0,1.52),(-.40,.65,1.50),(.27,-.645,1.49),(.27,0,1.51),(.27,.645,1.49),(.42,-.66,1.43),(.42,0,1.46),(.42,.66,1.43)],[(i*3+j,(i+1)*3+j,(i+1)*3+j+1,i*3+j+1)for i in range(3)for j in range(2)],paint)
sol=roof.modifiers.new('Roof skin','SOLIDIFY');sol.thickness=.025
for side in [-1,1]:
 curve('N17_Painted_Window_Frame',[(-1.35,side*.775,1.02),(-1.04,side*.70,1.29),(-.72,side*.655,1.46),(-.4,side*.65,1.50),(.27,side*.645,1.49),(.59,side*.67,1.35),(1.04,side*.775,1.035)],.029,paint)
 curve('N17_Window_Belt',[(-1.37,side*.78,1.015),(1.06,side*.78,1.045)],.011,chrome)
 curve('N17_B_Pillar',[(-.18,side*.78,1.02),(-.18,side*.655,1.49)],.031,black)
 curve('N17_Rear_Window_Divider',[(-.99,side*.76,1.04),(-.91,side*.687,1.35)],.012,black)
 for x in [-1.10,-.22,.98]:curve('N17_Door_Shutline',[(x,side*.842,.43),(x-.02,side*.846,.77),(x-.055,side*.79,1.025)],.0037,black)
 curve('N17_Shoulder_Line',[(-2.05,side*.78,.86),(-1.32,side*.84,.92),(.95,side*.82,.945),(1.9,side*.75,.85)],.005,paint)
 for x in [-.66,.64]:
  box('N17_Handle_Recess',(x,side*.847,.942),(.205,.018,.045),black,.017)
  box('N17_Chrome_Door_Handle',(x,side*.861,.945),(.165,.029,.026),chrome,.011)
 sphere('N17_Painted_Mirror',(.86,side*.925,1.12),(.14,.083,.075),paint)
 sphere('N17_Mirror_Glass',(.735,side*.927,1.124),(.012,.065,.052),chrome)
 curve('N17_Mirror_Stalk',[(.86,side*.77,1.07),(.88,side*.9,1.11)],.022,black)
 curve('N17_Sill',[(-1.88,side*.82,.40),(1.95,side*.78,.40)],.021,paint)
# Signature swept-back N17 headlights. The lens follows the front corner instead of using round lamps.
for side in [-1,1]:
 outline=[(2.18,side*.36,.71),(2.13,side*.61,.78),(1.85,side*.77,.90),(1.68,side*.79,.91),(1.86,side*.80,.78),(2.11,side*.67,.66)]
 head=mesh('N17_Headlamp_Chrome_Shell',outline,[(0,1,2,3,4,5)],reflector)
 sol=head.modifiers.new('Lamp depth','SOLIDIFY');sol.thickness=.025
 lensverts=[(x+.008,y*1.005,z+.002)for x,y,z in outline];mesh('N17_Headlamp_Clear_Lens',lensverts,[(0,1,2,3,4,5)],lens)
 sphere('N17_Headlamp_Lowbeam',(2.125,side*.60,.805),(.042,.073,.065),reflector)
 sphere('N17_Headlamp_Highbeam',(2.085,side*.70,.847),(.040,.052,.053),reflector)
 box('N17_Amber_Corner',(1.84,side*.806,.858),(.10,.016,.065),amber,.014)
 curve('N17_Headlight_Upper_Edge',[(x+.012,y,z+.004)for x,y,z in outline[:4]],.008,chrome)
 # Tall rear tail lamps, with the horizontal trunk section and a clear reversing strip.
 tail=[(-2.16,side*.63,.72),(-2.16,side*.70,.96),(-1.93,side*.815,1.00),(-1.78,side*.83,.95),(-1.97,side*.82,.79)]
 mesh('N17_Taillamp_Red',tail,[(0,1,2,3,4)],red)
 box('N17_Reverse_Lamp',(-2.166,side*.62,.82),(.028,.20,.055),lens,.01)
# Chromed trapezoid grille, lower intake and circular fog lamps.
mesh('N17_Grille_Black',[(2.205,-.405,.83),(2.225,.405,.83),(2.24,.28,.58),(2.24,-.28,.58)],[(0,1,2,3)],black)
curve('N17_Grille_Chrome_Outline',[(2.22,-.415,.84),(2.24,-.29,.58),(2.245,0,.555),(2.24,.29,.58),(2.22,.415,.84)],.019,chrome)
for z in [.62,.69,.76,.82]:curve('N17_Grille_Bar',[(2.248,-.34,z),(2.25,0,z),(2.248,.34,z)],.009,chrome)
torus('N17_Nissan_Emblem',(2.27,0,.735),.071,.009,chrome,(0,math.pi/2,0));box('N17_Badge_Bar',(2.28,0,.735),(.018,.15,.025),chrome,.004)
box('N17_Lower_Intake',(2.208,0,.385),(.045,.91,.125),black,.04)
for side in [-1,1]:
 sphere('N17_Foglight_Recess',(2.10,side*.58,.40),(.063,.105,.081),black)
 cyl('N17_Foglight',(2.155,side*.58,.41),.045,.018,lens,(0,math.pi/2,0),vertices=24)
curve('N17_Hood_Panel_Gap',[(2.14,-.37,.855),(1.74,-.62,.962),(1.11,-.69,1.048)],.0038,black)
curve('N17_Hood_Panel_Gap',[(2.14,.37,.855),(1.74,.62,.962),(1.11,.69,1.048)],.0038,black)
curve('N17_Trunk_Panel_Gap',[(-2.155,-.57,.96),(-1.63,-.66,1.02),(-1.36,0,1.07),(-1.63,.66,1.02),(-2.155,.57,.96)],.0038,black)
# Wheels and wheel wells, each assembly has its own named pivot.
for x,front in [(-1.31,False),(1.29,True)]:
 for side in [-1,1]:
  root=empty('Wheel_'+('F'if front else'R')+('L'if side>0 else'R'),(x,side*.758,.312))
  tire=torus('N17_Tyre',(0,0,0),.252,.061,rubber,(math.pi/2,0,0),root)
  for edge in [-1,1]:torus('N17_Sidewall',(0,edge*.050,0),.264,.012,rubber,(math.pi/2,0,0),root)
  cyl('N17_Brake_Disc',(0,0,0),.195,.10,reflector,(math.pi/2,0,0),root)
  cyl('N17_Wheel_Recess',(0,side*.063,0),.218,.018,black,(math.pi/2,0,0),root)
  torus('N17_Alloy_Rim',(0,side*.078,0),.210,.013,chrome,(math.pi/2,0,0),root)
  for i in range(8):
   angle=i*math.tau/8;o=box('N17_Alloy_Spoke',(math.sin(angle)*.105,side*.080,math.cos(angle)*.105),(.033,.023,.19),chrome,.009,root);o.rotation_euler.y=angle
  cyl('N17_Wheel_Hub',(0,side*.096,0),.052,.024,chrome,(math.pi/2,0,0),root,24)
  for i in range(4):
   a=i*math.pi/2;cyl('N17_Wheel_Nut',(math.sin(a)*.043,side*.113,math.cos(a)*.043),.008,.010,black,(math.pi/2,0,0),root,8)
# Interior: two-tone dashboard, instrument binnacle and the N17 centre-stack layout.
box('N17_Cabin_Floor',(-.20,0,.39),(2.45,1.45,.11),black,.04)
box('N17_Dashboard_Lower',(.73,0,.735),(.48,1.46,.22),beige,.095)
box('N17_Dashboard_Top',(.79,0,.925),(.52,1.47,.14),soft,.065)
sphere('N17_Instrument_Binnacle',(.68,.385,1.015),(.225,.294,.155),soft)
box('N17_Instrument_Back',(.495,.38,.993),(.028,.46,.225),black,.044)
for side in [-1,1]:
 cyl('N17_Side_Vent',(.53,side*.64,.941),.072,.035,black,(0,math.pi/2,0))
 torus('N17_Side_Vent_Chrome',(.504,side*.64,.941),.073,.006,chrome,(0,math.pi/2,0))
 for k in [-2,-1,0,1,2]:box('N17_Vent_Slat',(.493,side*.64,.941+k*.019),(.013,.12,.006),soft,.002)
 box('N17_Inner_Door',(-.2,side*.755,.71),(1.65,.065,.59),beige,.04)
 box('N17_Door_Armrest',(-.21,side*.705,.695),(.62,.11,.11),soft,.035)
 box('N17_Interior_Handle',(.25,side*.702,.90),(.16,.025,.04),chrome,.015)
box('N17_Glovebox',(.493,-.39,.76),(.025,.55,.20),beige,.028)
box('N17_Glovebox_Handle',(.472,-.39,.825),(.018,.11,.018),black,.004)
# Centre console: paired horizontal vents, glossy radio fascia, and round climate control.
box('N17_Centre_Piano_Fascia',(.493,-.02,.83),(.07,.33,.43),piano,.05)
for y in [-.105,.065]:
 box('N17_Centre_Vent',(.45,y,.993),(.025,.145,.092),black,.016)
 for i in range(4):box('N17_Centre_Vent_Slat',(.432,y,.963+i*.020),(.015,.13,.007),soft,.002)
box('N17_Radio',(.44,-.02,.875),(.025,.292,.108),black,.007)
radio=material('N17_Radio_Amber_LCD',(.50,.16,.018),0,.3,0,1,.6)
box('N17_Radio_LCD',(.421,-.02,.892),(.006,.204,.033),radio,.002)
for side in [-1,1]:cyl('N17_Radio_Knob',(.419,-.02+side*.117,.851),.018,.02,chrome,(0,math.pi/2,0),vertices=20)
cyl('N17_Climate_Round_Control',(.433,-.02,.724),.082,.02,chrome,(0,math.pi/2,0))
cyl('N17_Climate_Black_Dial',(.419,-.02,.724),.068,.02,black,(0,math.pi/2,0))
for a in [-1.0,0,1.0]:cyl('N17_HVAC_Button',(.402,-.02+math.sin(a)*.045,.724+math.cos(a)*.045),.013,.012,soft,(0,math.pi/2,0),vertices=16)
box('N17_Centre_Tunnel',(-.10,0,.49),(1.4,.25,.19),beige,.06)
curve('N17_Gear_Lever',[(-.04,-.02,.57),(-.01,-.02,.73)],.016,chrome)
sphere('N17_Gear_Handle',(-.01,-.02,.747),(.043,.034,.033),black)
# Seats, headrests, seam piping.
for x in [-.25,-1.15]:
 for side in [-1,1]:
  box('N17_Seat_Cushion',(x,side*.36,.56),(.47,.49,.16),beige,.07)
  back=box('N17_Seat_Back',(x-.19,side*.36,.87),(.15,.47,.55),beige,.06);back.rotation_euler.y=-.11
  box('N17_Headrest',(x-.23,side*.36,1.18),(.12,.29,.16),soft,.045)
# Steering wheel and rotating needles are real 3D nodes controlled by the game.
steer=empty('SteeringWheelRoot',(.275,.37,.885))
torus('N17_Steering_Rim',(0,0,0),.176,.018,soft,(0,math.pi/2,0),steer)
cyl('N17_Steering_Hub',(0,0,0),.082,.055,soft,(0,math.pi/2,0),steer)
for a in [-1.16,1.16,math.pi]:
 dy=-math.sin(a)*.095;dz=math.cos(a)*.095;sp=box('N17_Steering_Spoke',(-.008,dy,dz),(.041,.046,.126),soft,.018,steer);sp.rotation_euler.x=a
cyl('N17_Steering_Badge',(-.038,0,0),.025,.006,chrome,(0,math.pi/2,0),steer,24)
for side in [-1,1]:box('N17_Steering_Button',(-.031,side*.095,.027),(.014,.034,.052),black,.009,steer)
curve('N17_Indicator_Stalk',[(.34,.44,.87),(.30,.57,.86)],.013,black)
# Gauge faces use original, purpose-drawn textures, not a flat photograph pasted over the screen.
os.makedirs('/workspace/work/n17/textures',exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for name,cy,maximum,unit in [('Speed',.245,180,'km/h'),('RPM',.485,8,'x1000')]:
 im=Image.new('RGB',(512,512),(7,13,20));dr=ImageDraw.Draw(im);dr.ellipse((19,19,493,493),outline=(66,102,178),width=9);dr.ellipse((28,28,484,484),outline=(121,147,192),width=2)
 for i in range(37):
  a=math.radians(-135+i*270/36);r1=201 if i%4==0 else 215;r2=231
  dr.line((256+math.sin(a)*r1,256-math.cos(a)*r1,256+math.sin(a)*r2,256-math.cos(a)*r2),fill=(223,231,240),width=4 if i%4==0 else 2)
 for i in range(10 if name=='Speed' else 9):
  a=math.radians(-135+i*270/(9 if name=='Speed' else 8));v=str(i*20 if name=='Speed' else i);f=ImageFont.truetype(font,28);bbox=dr.textbbox((0,0),v,font=f);dr.text((256+math.sin(a)*174-(bbox[2]-bbox[0])/2,256-math.cos(a)*174-14),v,font=f,fill=(221,229,242))
 dr.text((213,328),unit,font=ImageFont.truetype(font,23),fill=(163,185,217));path='/workspace/work/n17/textures/'+name+'.png';im.save(path)
 tex=bpy.data.images.load(path);mat=material('N17_'+name+'_Gauge',(.8,.8,.8),0,.65);p=mat.node_tree.nodes.get('Principled BSDF');node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex;mat.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color']);mat.node_tree.links.new(node.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.35
 r=.105;v=[(.472,cy+r,.993-r),(.472,cy-r,.993-r),(.472,cy-r,.993+r),(.472,cy+r,.993+r)]
 face=mesh('N17_'+name+'_Face',v,[(0,1,2,3)],mat,smooth=False);uv=face.data.uv_layers.new();coords=[(0,0),(1,0),(1,1),(0,1)]
 for poly in face.data.polygons:
  for li in poly.loop_indices:uv.data[li].uv=coords[face.data.loops[li].vertex_index]
 pivot=empty(name+'Needle',(.466,cy,.993));needle=box('N17_'+name+'_Needle',(0,0,.042),(.006,.008,.087),needleMat,.002,pivot);pivot.rotation_euler.x=math.radians(-135)
 cyl('N17_'+name+'_Needle_Hub',(.455,cy,.993),.011,.008,black,(0,math.pi/2,0),vertices=20)
# Mirror, sun visors, headliner and wipers complete the in-car silhouette.
box('N17_Rearview_Mirror',(.57,0,1.34),(.06,.25,.085),black,.025)
box('N17_Rearview_Reflective',(.535,0,1.34),(.006,.219,.060),chrome,.016)
for side in [-1,1]:box('N17_Sun_Visor',(.44,side*.37,1.405),(.13,.37,.035),beige,.013)
for y in [-.26,.28]:curve('N17_Wiper',[(1.03,y,1.06),(.81,y+.18,1.16)],.006,black)
# Export selected game-ready asset with embedded gauge textures.
for obj in list(bpy.context.scene.objects):
 if obj.type=='CURVE':
  bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath='/workspace/work/n17/sunny-n17.blend')
bpy.ops.export_scene.gltf(filepath=ROOT+'/sunny-n17.glb',export_format='GLB',export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_animations=False)
print('N17 asset exported',os.path.getsize(ROOT+'/sunny-n17.glb'))
