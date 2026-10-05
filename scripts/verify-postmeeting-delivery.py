"""Normal existing LNK -> installed launcher -> clean source -> served build.
Closes only windows belonging to its verified product Chrome profile. Other
visible Chrome windows are inventoried and preserved. No user storage changes.
"""
import hashlib,json,os,socket,subprocess,time,urllib.request
from pathlib import Path
import psutil,win32com.client,win32gui,win32process,win32con
ROOT=Path(__file__).resolve().parents[1]
HOME=Path(r'C:\Users\PC\Desktop\YENİ İŞ\Applications\7. TOGG\.launcher')
LINK=HOME.parent/'TOGG Başlat.lnk';OUT=ROOT/'audit-results/postmeeting/delivery.json';OUT.parent.mkdir(parents=True,exist_ok=True)
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
assert git('status','--porcelain')=='','Commit verified source before delivery proof'
head=git('rev-parse','HEAD');build=(ROOT/'apps/vehicle-app/.next/BUILD_ID').read_text().strip()
shortcut=win32com.client.Dispatch('WScript.Shell').CreateShortcut(str(LINK))
assert str(HOME/'start_togg.pyw').lower() in shortcut.Arguments.lower()
assert Path(shortcut.TargetPath).name.lower()=='pythonw.exe'
installed=(HOME/'start_togg.pyw').read_text('utf8')
expected=(ROOT/'scripts/windows-launcher/start_togg.pyw').read_text('utf8').replace('ROOT = Path(__file__).resolve().parents[2]','ROOT = Path('+repr(str(ROOT))+')')
assert installed==expected
assert (HOME/'backend_host.py').read_bytes()==(ROOT/'scripts/windows-launcher/backend_host.py').read_bytes()
source={}
for rel in git('ls-files','apps/vehicle-app/src','services/core-api','scripts/windows-launcher').splitlines():
 source[rel]=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()
assert (ROOT/'apps/vehicle-app/.next/BUILD_ID').stat().st_mtime>=max((ROOT/p).stat().st_mtime for p in source)
manifest=json.loads((ROOT/'apps/vehicle-app/.next/app-build-manifest.json').read_text())['pages']
chunks=sorted({p for route,paths in manifest.items() for p in paths})
hashes={rel:hashlib.sha256((ROOT/'apps/vehicle-app/.next'/rel).read_bytes()).hexdigest() for rel in chunks}
def state():return json.loads((HOME/'session.json').read_text())
def wait(check,seconds=45):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  try:
   value=check()
   if value:return value
  except Exception:pass
  time.sleep(.2)
 raise AssertionError('Bounded lifecycle check timed out')
def free(port):
 with socket.socket() as s:s.settimeout(.2);return s.connect_ex(('127.0.0.1',port))!=0
assert free(3000) and free(8000),'Refuse to adopt/stop another service'
def windows():
 rows=[]
 def collect(hwnd,_):
  if not win32gui.IsWindowVisible(hwnd):return
  pid=win32process.GetWindowThreadProcessId(hwnd)[1]
  try:
   if psutil.Process(pid).name().lower()=='chrome.exe':rows.append({'hwnd':hwnd,'pid':pid})
  except psutil.Error:pass
 win32gui.EnumWindows(collect,None);return rows
other=windows();os.startfile(str(LINK));running=wait(lambda:state() if state().get('status')=='running' else None)
assert running['url']=='http://127.0.0.1:3000' and Path(running['profile']).resolve()==(HOME/'chrome-profile').resolve()
assert Path(psutil.Process(running['frontend_pid']).cwd()).resolve()==ROOT/'apps/vehicle-app'
assert str(ROOT/'services/core-api').lower() in ' '.join(psutil.Process(running['backend_pid']).cmdline()).lower()
for rel,digest in hashes.items():
 with urllib.request.urlopen('http://127.0.0.1:3000/_next/'+rel,timeout=5) as response:assert hashlib.sha256(response.read()).hexdigest()==digest
for route in ['skin','vision','mental']:
 with urllib.request.urlopen('http://127.0.0.1:3000/'+route,timeout=5) as response:
  html=response.read().decode();assert all(rel in html for rel in manifest['/'+route+'/page'] if '/app/'+route+'/page-' in rel)
browser=psutil.Process(running['browser_pid']);assert '--user-data-dir='+str(HOME/'chrome-profile') in browser.cmdline()
os.startfile(str(LINK));time.sleep(2);assert state()['frontend_pid']==running['frontend_pid'] and state()['backend_pid']==running['backend_pid']
owned={browser.pid,*[p.pid for p in browser.children(recursive=True)]}
closed=[]
for row in windows():
 if row['pid'] in owned:win32gui.PostMessage(row['hwnd'],win32con.WM_CLOSE,0,0);closed.append(row)
assert closed,'No owned product window found'
wait(lambda:state().get('status')=='stopped');wait(lambda:free(3000) and free(8000))
preserved=[{**row,'preserved':bool(win32gui.IsWindow(row['hwnd']) and win32process.GetWindowThreadProcessId(row['hwnd'])[1]==row['pid'])} for row in other]
assert all(row['preserved'] for row in preserved),'Pre-existing Chrome window changed; inspect before claiming preservation'
os.startfile(str(LINK));reopened=wait(lambda:state() if state().get('status')=='running' else None)
for rel,digest in hashes.items():
 with urllib.request.urlopen('http://127.0.0.1:3000/_next/'+rel,timeout=5) as response:assert hashlib.sha256(response.read()).hexdigest()==digest
proof={'status':'PASS','sourceHead':head,'branch':git('branch','--show-current'),'buildId':build,'shortcut':str(LINK),'shortcutTarget':shortcut.TargetPath,'shortcutArguments':shortcut.Arguments,'productRoot':str(ROOT),'sourceFileSHA256':source,'servedChunkSHA256':hashes,'routeChunks':manifest,'installedLauncherMatchesSource':True,'repeatUsesOwnedServices':True,'lastOwnedWindowStopsServices':True,'otherChromeWindows':preserved,'reopenedState':reopened,'leftRunning':True,'physicalCameraAcceptance':'OPEN','subjectiveSpeechAcceptance':'OPEN'}
OUT.write_text(json.dumps(proof,indent=2),'utf8');print(json.dumps({k:proof[k] for k in ['status','sourceHead','buildId','branch','productRoot','leftRunning']}))
