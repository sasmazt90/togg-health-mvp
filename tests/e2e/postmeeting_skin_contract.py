"""Licensed video fixture, real production MediaPipe, no pose/quality override.
V3 source pixels, regional graphs, reference separation and responsive screenshots.
"""
import json,time,sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('audit-results/postmeeting/skin');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 gpu=['--use-gl=angle','--use-angle=swiftshader'] if '--software-gpu' in sys.argv else []
 b=pw.chromium.launch(channel='chrome',headless=True,args=['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(Path('audit-fixtures/three-angle.y4m').resolve()),'--enable-unsafe-swiftshader',*gpu])
 c=b.new_context(permissions=['camera'],viewport={'width':1600,'height':1000})
 c.add_init_script("window.workerMessages=[];const post=Worker.prototype.postMessage;Worker.prototype.postMessage=function(m,...args){window.workerMessages.push({type:m.type,at:performance.now()});return post.call(this,m,...args);};")
 p=c.new_page();errors=[];console=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:console.append({'type':m.type,'text':m.text[:1000]}));model_requests=[];p.on('request',lambda r:model_requests.append(r.url) if 'selfie_multiclass' in r.url else None)
 c.request.post('http://127.0.0.1:8000/api/vehicle/speed',data={'speedKmH':0})
 runs=[]
 for n in range(2):
  p.goto('http://127.0.0.1:3000/skin');start=time.monotonic();p.get_by_role('button',name='Analizi Başlat',exact=True).click()
  trace=[];deadline=time.monotonic()+270
  while not p.get_by_text('Cilt Analizi Tamamlandı',exact=True).count() and time.monotonic()<deadline:
   p.wait_for_timeout(2000)
   row=p.evaluate('({at:performance.now(),canvas:{...document.querySelector("canvas")?.dataset},guidance:document.querySelector("[data-camera-preparation]")?.innerText,body:document.body.innerText})');trace.append(row)
   (OUT/f'trace-{n}.json').write_text(json.dumps(trace,ensure_ascii=False,indent=2),'utf8')
   if not row['guidance'] and ('motoru' in row['body'] or 'başarısız' in row['body']):break
  if not p.get_by_text('Cilt Analizi Tamamlandı',exact=True).count():
   p.screenshot(path=str(OUT/f'failure-{n}.png'),full_page=True);(OUT/f'failure-{n}.json').write_text(json.dumps({'console':console,'pageErrors':errors,'body':p.locator('body').inner_text()},ensure_ascii=False,indent=2),'utf8')
  expect(p.get_by_text('Cilt Analizi Tamamlandı',exact=True)).to_be_visible(timeout=1000)
  value=p.evaluate('JSON.parse(localStorage.getItem("togg_health_latest_skin"))');ref=p.evaluate('JSON.parse(localStorage.getItem("togg_health_skin_signs_baseline_v3"))')
  assert value['schemaVersion']==3 and value['indicatorContract']=='regional-rgb-v3' and value['usedMediaPipe']
  assert value['isBaseline']==(n==0) and len(value['indicators'])==6
  assert len({v['frameToken'] for v in ref['captures'].values()})==3
  assert not model_requests and all(m['type'] not in ('initializeSegmentation','segment') for m in p.evaluate('window.workerMessages'))
  assert 'data:image' not in p.evaluate('JSON.stringify(Object.fromEntries(Object.entries(localStorage)))')
  graphs=[]
  for i in range(6):
   svg=p.locator('[data-skin-snapshot]');mesh=p.locator('[data-skin-mesh]');assert mesh.count()==1
   region=mesh.get_attribute('data-skin-mesh');graphs.append(region);assert mesh.locator('[data-mesh-edge]').count()>0
   assert svg.locator('clipPath,mask').count()==0
   assert svg.get_attribute('viewBox')==f"0 0 {svg.get_attribute('data-snapshot-width')} {svg.get_attribute('data-snapshot-height')}"
   alpha=p.evaluate('''async()=>{const image=new Image();image.src=document.querySelector('[data-skin-snapshot] image').getAttribute('href');await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let nonopaque=0;for(let i=3;i<data.length;i+=4)if(data[i]!==255)nonopaque++;return {nonopaque,width:canvas.width,height:canvas.height};}''')
   assert alpha['nonopaque']==0
   if region=='nose':assert p.get_by_role('heading',name='T-Bölgesi',exact=True).count()==1 and p.locator('[data-skin-indicator]').count()==5
   if region=='periorbital':assert p.locator('[data-skin-indicator]').count()==4
   for indicator in value['indicators'][region]:
    if indicator['id'] in ('oil','dry','sag','acne','dark','bags','lines'):assert indicator['score'] is None
   assert p.locator('[data-skin-navigation]').bounding_box()['y']>=p.locator('[data-face-panel]').bounding_box()['y']+p.locator('[data-face-panel]').bounding_box()['height']-1
   p.screenshot(path=str(OUT/f'{n}-{region}-desktop.png'),full_page=True)
   p.get_by_role('button',name='Sonraki Bölge',exact=True).click()
  assert len(set(graphs))==6
  runs.append({'seconds':time.monotonic()-start,'result':value,'reference':ref,'sourcePhotoOpaque':True,'graphs':graphs})
  (OUT/f'completed-{n}.json').write_text(json.dumps(runs[-1],ensure_ascii=False,indent=2),'utf8')
  p.set_viewport_size({'width':720,'height':900});p.screenshot(path=str(OUT/f'narrow-{n}.png'),full_page=True);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  p.set_viewport_size({'width':1600,'height':1000});p.evaluate("document.documentElement.style.zoom='2'");p.screenshot(path=str(OUT/f'zoom200-{n}.png'),full_page=True);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');p.evaluate("document.documentElement.style.zoom='1'")
  if n==0:
   legacy={'id':'fixture-legacy-preserved','timestamp':ref['timestamp'],'schemaVersion':2,'scope':'three-angle-v2','captures':ref['captures']}
   p.evaluate('(value)=>localStorage.setItem("togg_health_skin_multi_baseline_v2",JSON.stringify(value))',legacy);legacy_raw=p.evaluate('localStorage.getItem("togg_health_skin_multi_baseline_v2")')
  else:assert p.evaluate('localStorage.getItem("togg_health_skin_multi_baseline_v2")')==legacy_raw and ref['id']==runs[0]['reference']['id']
 p.set_viewport_size({'width':720,'height':900});p.screenshot(path=str(OUT/'narrow.png'),full_page=True);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
 p.evaluate("document.documentElement.style.zoom='2'");p.set_viewport_size({'width':1600,'height':1000});p.screenshot(path=str(OUT/'zoom200.png'),full_page=True);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 proof={'status':'PASS','controlledFixture':True,'physicalCamera':False,'poseMock':False,'qualityOverride':False,'segmentationRequests':model_requests,'legacyReferencePreserved':True,'sourcePhotoOpaque':True,'pageErrors':errors,'runs':runs}
 (OUT/'proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2),'utf8');c.close();b.close()
print('PASS: V3 source photo, actual three fixture poses, six selected meshes, responsive layout, separate references')
