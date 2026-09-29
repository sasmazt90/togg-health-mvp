"""Focused original-app audit. Native devices, actual model, no fabricated results.
The direct engine checks are integration tests, not a replacement for blocked UI E2E.
"""
import json,pathlib,subprocess,time,traceback,math
from playwright.sync_api import sync_playwright
OUT=pathlib.Path('audit-results');OUT.mkdir(exist_ok=True)
BASE='http://localhost:3000';results=[]
def require(ok,message):
 if not ok:raise AssertionError(message)
def record(name,fn):
 try:r={'name':name,'status':'PASS','detail':fn()}
 except Exception as e:r={'name':name,'status':'FAIL','error':str(e),'traceback':traceback.format_exc(limit=3)}
 results.append(r);print('FOCUSED_RESULT '+json.dumps(r,ensure_ascii=False),flush=True)
INIT=r'''(()=>{window.__audit={streams:[],raf:[],cancel:[],draw:0,speech:[],tts:[]};const g=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...a)=>{const s=await g(...a);window.__audit.streams.push(s);return s;};const raf=requestAnimationFrame;window.requestAnimationFrame=(f)=>{let id=raf(t=>{window.__audit.raf.push({id,event:'fired'});return f(t);});window.__audit.raf.push({id,event:'scheduled'});return id;};const cancel=cancelAnimationFrame;window.cancelAnimationFrame=(id)=>{window.__audit.cancel.push(id);return cancel(id);};const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...a){window.__audit.draw++;return draw.apply(this,a);};const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const W=function(){const s=new SR();['start','end','error','result'].forEach(k=>s.addEventListener(k,e=>window.__audit.speech.push({type:k,error:e.error||null,transcript:e.results?.[0]?.[0]?.transcript||null})));return s;};window.SpeechRecognition=W;window.webkitSpeechRecognition=W;}const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{let item={text:u.text,lang:u.lang,events:[]};['start','end','error'].forEach(k=>u.addEventListener(k,e=>item.events.push({type:k,error:e.error||null})));window.__audit.tts.push(item);return speak(u);};})();'''
face=str(pathlib.Path('audit-fixtures/face.y4m').resolve())
args=['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+face,'--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chromium',headless=True,args=args)
 def new(browser=b,granted=True):
  c=browser.new_context(viewport={'width':1600,'height':1000},permissions=['camera','microphone'] if granted else [],locale='tr-TR');c.add_init_script(INIT);p=c.new_page();p.set_default_timeout(8000);p._errors=[];p._console=[];p.on('pageerror',lambda e:p._errors.append(str(e)));p.on('console',lambda m:p._console.append({'type':m.type,'text':m.text}));return c,p
 def go(p,path):p.goto(BASE+path,wait_until='domcontentloaded');p.wait_for_timeout(1000)
 def state(p):return p.evaluate('({body:document.body.innerText,storage:Object.fromEntries(Object.entries(localStorage)),video:[...document.querySelectorAll("video")].map(v=>({w:v.videoWidth,h:v.videoHeight,time:v.currentTime,ready:v.readyState,paused:v.paused})),tracks:window.__audit.streams.flatMap(s=>s.getTracks().map(t=>({kind:t.kind,state:t.readyState}))),raf:window.__audit.raf,cancel:window.__audit.cancel,draw:window.__audit.draw,speech:window.__audit.speech,tts:window.__audit.tts})')
 def snap(p,name):
  d=state(p);d.update(errors=p._errors,console=p._console);(OUT/(name+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2));p.screenshot(path=str(OUT/(name+'.png')),full_page=True);return d
 def deny_camera(c,p):
  s=c.new_cdp_session(p);info=s.send('Target.getTargetInfo');ctx=info['targetInfo'].get('browserContextId');payload={'permission':{'name':'camera'},'setting':'denied','origin':BASE}
  if ctx:payload['browserContextId']=ctx
  s.send('Browser.setPermission',payload)
  return p.evaluate('navigator.permissions.query({name:"camera"}).then(p=>p.state)')
 c,p=new()
 def stalled_scan():
  go(p,'/skin');p.wait_for_timeout(5000);p.get_by_role('button',name='Analizi Başlat',exact=True).click();p.wait_for_timeout(10000);d=snap(p,'skin-live-loop-diagnostic');require(d['video'] and d['video'][0]['w']>0 and d['video'][0]['time']>5,'No actual decoded video');require(d['draw']>0,'Live camera has decoded frames, but analysis drew ZERO canvas frames. RAF trace: '+str(d['raf'])+' cancelled: '+str(d['cancel']));return d
 record('original skin live preview actually reaches frame analysis',stalled_scan)
 def route_cleanup():
  p.get_by_role('link',name='Gizlilik & İzinler',exact=True).click();p.wait_for_timeout(800);d=snap(p,'skin-route-cleanup');require(all(t['state']=='ended' for t in d['tracks']),'Video track survives route exit')
 record('skin camera stops on navigation away',route_cleanup);c.close()
 c,p=new(granted=False)
 def genuine_denial():
  go(p,'/privacy');permission=deny_camera(c,p);require(permission=='denied','Browser denial not actually established: '+permission);go(p,'/skin');p.wait_for_timeout(2000);p.get_by_role('button',name='Analizi Başlat',exact=True).click();p.wait_for_timeout(600);d=snap(p,'native-camera-denied');require('Kamera erişimi sağlanamadı' in d['body'],'Missing denial message');require(not d['tracks'],'Camera acquired despite native denial');require('togg_health_latest_skin' not in d['storage'],'Result fabricated after denial')
 record('native browser camera rejection handled without fake result',genuine_denial)
 def demo_all_regions():
  go(p,'/skin?demo=1');p.get_by_role('button',name='Analizi Başlat',exact=True).click();p.get_by_text('Cilt Analizi Tamamlandı',exact=True).wait_for(timeout=10000);d=snap(p,'skin-demo-completed');require('attune_demo_skin_result' in d['storage'],'Demo record missing');require('togg_health_latest_skin' not in d['storage'],'Demo contaminated real storage')
  visited=[]
  for i in range(6):
   visited.append(p.locator('body').inner_text());p.get_by_role('button',name='Sonraki Bölge',exact=True).click();p.wait_for_timeout(200)
  require(len(set(visited))==6,'Six region pages are not distinct');snap(p,'skin-demo-six-regions');return 'Six distinct result regions; synthetic demo, not camera analysis'
 record('explicit demo completion isolation and six-region navigation',demo_all_regions)
 def demo_modals():
  buttons=p.get_by_role('button').all_text_contents();details=[]
  for word in ['Zaman','Gözlem','Aksiyon']:
   target=p.get_by_role('button').filter(has_text=word).first;target.click();p.wait_for_timeout(300);details.append({'word':word,'body':p.locator('body').inner_text()});snap(p,'skin-demo-modal-'+word);p.keyboard.press('Escape');p.wait_for_timeout(200)
  return details
 record('explicit demo trend observation action modals and escape',demo_modals)
 def demo_referral():
  p.get_by_role('button',name='Uzman Seçeneklerini Gör',exact=True).click();p.wait_for_timeout(2000);d=snap(p,'skin-demo-referral');require('/care' in p.url and 'Dermatoloji' in d['body'],'No dermatology handoff');require('togg_active_referral_context' not in d['storage'],'Demo referral contaminated real context');return 'Navigation only, no external booking'
 record('explicit demo skin to care referral separated from real record',demo_referral);c.close()
 # Execute original TypeScript SkinAnalyzer, changing only module URL resolution.
 source=pathlib.Path('apps/vehicle-app/src/utils/skinAnalyzer.ts').read_text()
 js=subprocess.check_output(['node','-e',"const ts=require('typescript');const fs=require('fs');process.stdout.write(ts.transpileModule(fs.readFileSync('apps/vehicle-app/src/utils/skinAnalyzer.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2020,target:ts.ScriptTarget.ES2020}}).outputText)"]).decode().replace("'@mediapipe/tasks-vision'","'/audit-mediapipe.mjs'")
 (OUT/'actual-skin-engine.js').write_text(js)
 c,p=new();p.route('**/audit-skin-engine.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=js));p.route('**/audit-mediapipe.mjs',lambda r:r.fulfill(status=200,content_type='text/javascript',body=pathlib.Path('node_modules/@mediapipe/tasks-vision/vision_bundle.mjs').read_text()))
 def actual_engine():
  go(p,'/privacy');d=p.evaluate('''async()=>{const {SkinAnalyzer:S}=await import('/audit-skin-engine.js');window.__S=S;await S.getFaceLandmarker();const stream=await navigator.mediaDevices.getUserMedia({video:true});const v=document.createElement('video');v.muted=true;v.srcObject=stream;document.body.append(v);await v.play();await new Promise(r=>setTimeout(r,500));const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);const align=S.assessAlignment(ctx,canvas.width,canvas.height);const quality=S.checkQuality(ctx,canvas.width,canvas.height,align.faceDetected);const regions=S.analyzeRegions(ctx,canvas.width,canvas.height,align);const baseline=S.compareWithBaseline(regions,null);const repeat=S.compareWithBaseline(regions,regions);window.__canvas=canvas;window.__regions=regions;stream.getTracks().forEach(t=>t.stop());return {modelReady:S.isMediaPipeReady(),align:{...align,landmarks:undefined,landmarkCount:align.landmarks?.length},quality,regions,baseline,repeat};}''')
  (OUT/'actual-mediapipe-engine-results.json').write_text(json.dumps(d,ensure_ascii=False,indent=2));require(d['modelReady'] and d['align']['isMediaPipeActive'] and d['align']['faceDetected'],'Actual model did not detect fixture face');require(len(d['regions'])==6,'Missing actual six anatomical regions');require(d['baseline']['isBaseline'] and d['repeat']['highestChangePct']==0,'Baseline/repeat consistency failed');return d
 record('integration actual MediaPipe face six regions baseline repeat (not UI E2E)',actual_engine)
 def engine_negatives():
  d=p.evaluate('''()=>{const S=window.__S,c=window.__canvas,x=c.getContext('2d',{willReadFrequently:true}),out={};for(const [name,col] of [['dark','black'],['bright','white'],['blank','rgb(120,120,120)']]){x.fillStyle=col;x.fillRect(0,0,c.width,c.height);const a=S.assessAlignment(x,c.width,c.height);out[name]={faceDetected:a.faceDetected,quality:S.checkQuality(x,c.width,c.height,a.faceDetected),qualityWithFace:S.checkQuality(x,c.width,c.height,true)};}return out;}''')
  (OUT/'actual-engine-negative-frames.json').write_text(json.dumps(d,ensure_ascii=False,indent=2));require(all(not v['faceDetected'] and not v['quality']['isValid'] for v in d.values()),'Blank frames accepted as valid face');require(d['dark']['qualityWithFace']['status']=='TOO_DARK' and d['bright']['qualityWithFace']['status']=='TOO_BRIGHT' and d['blank']['qualityWithFace']['status']=='BLURRY','Quality gates incorrect');return d
 record('integration actual engine rejects no-face dark bright textureless frames',engine_negatives);c.close();b.close()
 # Branded Chrome + real OS PulseAudio virtual microphone: no fake-device flags.
 for headed in [True,False]:
  b=pw.chromium.launch(channel='chrome',headless=not headed,args=['--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream']);c,p=new(b);go(p,'/mental');p.wait_for_timeout(1200)
  player=subprocess.Popen(['bash','-c','for i in $(seq 1 8); do paplay --device=audit_mic audit-fixtures/speech.wav; sleep 1; done'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  def audio_energy():
   d=p.evaluate('''async()=>{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});const a=new AudioContext();await a.resume();const src=a.createMediaStreamSource(s),an=a.createAnalyser();src.connect(an);const buf=new Float32Array(an.fftSize);let peak=0;for(let i=0;i<35;i++){an.getFloatTimeDomainData(buf);peak=Math.max(peak,...buf.map(Math.abs));await new Promise(r=>setTimeout(r,100));}s.getTracks().forEach(t=>t.stop());await a.close();return {peak};}''');require(d['peak']>.001,'No spoken PCM signal reached OS microphone');return d
  record('native PulseAudio spoken input amplitude headed='+str(headed),audio_energy)
  def speech():
   p.get_by_role('button',name='MİKROFONU BAŞLAT',exact=True).click();p.wait_for_timeout(18000);d=snap(p,'native-speech-'+str(headed));require(any(e['type']=='result' and e['transcript'] for e in d['speech']),'Native recognition failed to transcribe: '+json.dumps(d['speech']));return d['speech']
  record('original app actual Turkish speech recognition headed='+str(headed),speech)
  def tts():
   p.get_by_role('button',name='İsterseniz yazabilirsiniz').click();p.locator('input').fill('Bugün yeni bir kitap okudum.');p.locator('input').press('Enter');p.wait_for_timeout(8000);d=snap(p,'native-tts-'+str(headed));voices=p.evaluate('speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang,local:v.localService}))');(OUT/('tts-voices-'+str(headed)+'.json')).write_text(json.dumps(voices,ensure_ascii=False,indent=2));require(any(any(e['type']=='start' for e in t['events']) for t in d['tts']),'Speech synthesis called but no native start event');return {'tts':d['tts'],'voices':voices}
  record('original app speech synthesis emits native start event headed='+str(headed),tts)
  player.terminate();c.close();b.close()
(OUT/'focused-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('FOCUSED_SUMMARY '+json.dumps({'total':len(results),'pass':sum(r['status']=='PASS' for r in results),'fail':sum(r['status']=='FAIL' for r in results)}),flush=True)
raise SystemExit(1 if any(r['status']=='FAIL' for r in results) else 0)
