#!/usr/bin/env python3
"""Build one complete project ZIP, hosted in <25 MiB pieces for one-click download."""
from pathlib import Path
import hashlib,json,tempfile,zipfile,shutil
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'dist/download-data';dest.mkdir(parents=True,exist_ok=True)
for p in dest.glob('*'):p.unlink()
excluded={'.git','.openai','.codex','.agents','node_modules','dist','__pycache__'}
files=[]
for p in sorted(ROOT.rglob('*')):
 rel=p.relative_to(ROOT)
 if not p.is_file() or p.is_symlink() or any(part in excluded or part.startswith('.') for part in rel.parts) or rel.as_posix()=='index.html' or p.suffix in {'.zip','.pyc'}:continue
 files.append((p,rel.as_posix()))
files.append((ROOT/'dist/index.html','index.html'))
with tempfile.TemporaryDirectory() as temp:
 archive=Path(temp)/'assyut-drive-complete.zip'
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,6) as z:
  for p,name in files:z.write(p,name)
  z.writestr('ابدأ هنا.txt','كل ملفات اللعبة والمشروع موجودة هنا.\nشغل: python tools/music-library.py --serve\nثم افتح: http://localhost:8000/index.html\nلتعديل اللعبة: ملفات src. لإعادة البناء: node build.js --hosted\nالرابط الثابت للنسخة المنشورة الأحدث: https://alexandria-taxi-visual-upgrade.wintrycashew.chatgpt.site/download.html\n')
 digest=hashlib.sha256(archive.read_bytes()).hexdigest();parts=[]
 with archive.open('rb') as f:
  while data:=f.read(20*1024*1024):
   name=f'game-{digest[:16]}-{len(parts)+1:03}.bin';(dest/name).write_bytes(data)
   parts.append({'url':'download-data/'+name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 manifest={'filename':'assyut-drive-complete.zip','bytes':archive.stat().st_size,'sha256':digest,'files':len(files)+1,'builtAt':datetime.now(timezone.utc).isoformat(),'parts':parts}
 (ROOT/'dist/download-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 print(f'Complete download: {manifest["bytes"]:,} bytes, {len(parts)} parts, {manifest["files"]} files')
shutil.copyfile(ROOT/'src/download/index.html',ROOT/'dist/download.html')
shutil.copyfile(ROOT/'src/download/download.js',ROOT/'dist/download.js')
