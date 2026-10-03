"""Bounded local verification with owned processes and disposable health storage."""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

parser=argparse.ArgumentParser();parser.add_argument('--live',action='store_true');parser.add_argument('--provider-admission',action='store_true');parser.add_argument('scripts',nargs='+');args=parser.parse_args()
if args.provider_admission:
    assert args.live and args.scripts==['tests/e2e/live_provider_voice_followup.py --approved-additional-text-run'], 'Admission server only supports the explicitly authorized bounded text/TTS run'
root=Path(__file__).resolve().parents[1];out=root/'audit-results';out.mkdir(exist_ok=True)
for port in [3000,8000]:
    with socket.socket() as sock:
        assert sock.connect_ex(('127.0.0.1',port))!=0,'Port occupied; refusing to adopt or stop another application'
env={k:v for k,v in os.environ.items() if not k.startswith('OPENAI_')}
env.update(OPENAI_API_KEY='',ATTUNE_LOAD_LOCAL_ENV='1' if args.live else '0',PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
processes=[];logs=[];results=[]
with tempfile.TemporaryDirectory(prefix='attune-followup-') as data:
    env['ATTUNE_DATA_DIR']=data
    try:
        backend_command = [sys.executable, str(root/'tests/e2e/live_provider_backend.py'), '--approved-additional-text-run'] if args.provider_admission else [sys.executable,'-m','uvicorn','main:app','--app-dir',str(root/'services/core-api'),'--host','127.0.0.1','--port','8000']
        for name,command in [('backend',backend_command),('frontend',[shutil.which('node'),str(root/'node_modules/next/dist/bin/next'),'start',str(root/'apps/vehicle-app'),'--hostname','127.0.0.1','-p','3000'])]:
            service_env={**env,'ATTUNE_LOAD_LOCAL_ENV':'0'} if name=='frontend' else env
            log=(out/(name+'-followup.log')).open('w',encoding='utf-8');logs.append(log)
            processes.append(subprocess.Popen(command,cwd=root,env=service_env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0))
        for url in ['http://localhost:8000/api/health','http://localhost:3000']:
            deadline=time.monotonic()+60
            while True:
                try:
                    with urllib.request.urlopen(url,timeout=2) as response:assert response.status==200
                    break
                except Exception:
                    assert time.monotonic()<deadline,'Service startup failed'
                    time.sleep(.25)
        for script in args.scripts:
            name=Path(script.split()[0]).stem
            with (out/(name+'-followup.log')).open('w',encoding='utf-8') as log:
                result=subprocess.run([sys.executable,*script.split()],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
            results.append({'script':script,'exitCode':result.returncode});print(json.dumps(results[-1]),flush=True)
    finally:
        for process in reversed(processes):
            if process.poll() is None:process.terminate()
            process.wait(timeout=15)
        for log in logs:log.close()
(out/('live-matrix.json' if args.live else 'local-matrix.json')).write_text(json.dumps(results,indent=2),encoding='utf-8')
raise SystemExit(1 if any(r['exitCode'] for r in results) else 0)
