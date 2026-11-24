#!/usr/bin/env python3
"""Run from any directory: python tools/music-library.py [--serve] [--root PATH]."""
import argparse,json
from pathlib import Path
from urllib.parse import quote,urlsplit
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
parser=argparse.ArgumentParser();parser.add_argument('--serve',action='store_true');parser.add_argument('--root',type=Path,default=(Path(__file__).resolve().parents[1] if Path(__file__).resolve().parent.name=='tools' else Path(__file__).resolve().parent));parser.add_argument('--port',type=int,default=8000);args=parser.parse_args();root=args.root.resolve()
def scan():
 return {role:['assets/music/'+role+'/'+quote(p.name) for p in sorted((root/'assets/music'/role).glob('*')) if p.is_file() and p.suffix.lower()=='.mp3'] for role in ['police','uber']}
if not args.serve:
 (root/'assets/music/playlist.json').write_text(json.dumps(scan(),ensure_ascii=False,indent=2));print('Music playlist updated')
else:
 class Handler(SimpleHTTPRequestHandler):
  def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
  def do_GET(self):
   if urlsplit(self.path).path=='/assets/music/playlist.json':
    body=json.dumps(scan(),ensure_ascii=False).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
   else:super().do_GET()
 print('Open http://localhost:'+str(args.port)+'/index.html (or /assyut-driver.html)',flush=True);ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
