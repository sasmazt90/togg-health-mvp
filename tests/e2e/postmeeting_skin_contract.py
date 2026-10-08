"""Licensed video fixture, real production MediaPipe, no pose/quality override.
V3 source pixels, regional graphs, reference separation and responsive screenshots.
"""
import json,time,sys,os,math,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(os.environ.get('SKIN_RESULT_AUDIT_DIR','audit-results/postmeeting/skin'));OUT.mkdir(parents=True,exist_ok=True)
INIT="window.workerMessages=[];const post=Worker.prototype.postMessage;Worker.prototype.postMessage=function(m,...args){window.workerMessages.push({type:m.type,at:performance.now()});return post.call(this,m,...args);};"
profile=None;native200=None
with sync_playwright() as pw:
 gpu=['--use-gl=angle','--use-angle=swiftshader'] if '--software-gpu' in sys.argv else []
 b=pw.chromium.launch(channel='chrome',headless=True,args=['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(Path('audit-fixtures/three-angle.y4m').resolve()),'--enable-unsafe-swiftshader',*gpu])
 c=b.new_context(permissions=['camera'],viewport={'width':1600,'height':1000})
 c.add_init_script(INIT)
 p=c.new_page();errors=[];console=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:console.append({'type':m.type,'text':m.text[:1000]}));model_requests=[];p.on('request',lambda r:model_requests.append(r.url) if 'selfie_multiclass' in r.url else None)
 c.request.post('http://127.0.0.1:8000/api/vehicle/speed',data={'speedKmH':0})
 runs=[]
 for n in range(2):
  if n==1:
   saved=c.storage_state();c.close();b.close()
   profile=tempfile.TemporaryDirectory(prefix='attune-skin-result-zoom-')
   pref=Path(profile.name)/'Default';pref.mkdir();(pref/'Preferences').write_text(json.dumps({'partition':{'default_zoom_level':{'x':math.log(2)/math.log(1.2)}}}),'utf8')
   c=pw.chromium.launch_persistent_context(profile.name,channel='chrome',headless=False,no_viewport=True,permissions=['camera'],args=['--window-size=1600,1000','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(Path('audit-fixtures/three-angle.y4m').resolve()),'--enable-unsafe-swiftshader',*gpu])
   c.add_init_script(INIT)
   storage=saved['origins'][0]['localStorage']
   c.add_init_script('if(location.origin==="http://127.0.0.1:3000" && !sessionStorage.getItem("restored-fixture-state")){for(const v of '+json.dumps(storage)+')localStorage.setItem(v.name,v.value);sessionStorage.setItem("restored-fixture-state","1");}')
   p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:model_requests.append(r.url) if 'selfie_multiclass' in r.url else None)
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
  if n==1:
   native200=p.evaluate('({innerWidth,outerWidth,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom})')
   assert native200['dpr']>=2 and native200['innerWidth']<native200['outerWidth']*.65 and native200['cssZoom']=='1',native200
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
   width=float(svg.get_attribute('data-snapshot-width'));height=float(svg.get_attribute('data-snapshot-height'))
   crop=json.loads(p.locator('[data-face-panel]').get_attribute('data-preview-crop'))
   box=list(map(float,svg.get_attribute('viewBox').split()))
   expected=[crop['x']*width,crop['y']*height,crop['width']*width,crop['height']*height]
   assert all(abs(a-b)<.0001 for a,b in zip(box,expected))
   assert 0<=box[0] and 0<=box[1] and box[0]+box[2]<=width+.0001 and box[1]+box[3]<=height+.0001
   assert box[2]<width*.9 and box[3]<height*.95, 'Result must use actual face framing'
   assert p.evaluate("""()=>{const s=document.querySelector('[data-skin-snapshot]'),v=s.viewBox.baseVal,m=s.querySelector('[data-skin-mesh]').getBBox();return m.x>=v.x&&m.y>=v.y&&m.x+m.width<=v.x+v.width&&m.y+m.height<=v.y+v.height;}""")
   shown=p.locator('[data-skin-score]').all_text_contents()
   numeric=[v for v in value['indicators'][region] if v['score'] is not None]
   assert shown==[str(math.floor(v['score']+.5)) for v in numeric]
   assert p.get_by_role('meter').count()==len(numeric)
   for indicator in value['indicators'][region]:
    if indicator['score'] is None:assert p.locator('[data-skin-indicator="'+indicator['id']+'"]').get_by_role('meter').count()==0
   layout=p.locator('[data-skin-result-layout]').bounding_box();photo=p.locator('[data-face-panel]').bounding_box()
   assert abs(photo['y']-layout['y'])<=1, 'Photo must align with summary top'

   alpha=p.evaluate('''async()=>{const image=new Image();image.src=document.querySelector('[data-skin-snapshot] image').getAttribute('href');await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let nonopaque=0;for(let i=3;i<data.length;i+=4)if(data[i]!==255)nonopaque++;return {nonopaque,width:canvas.width,height:canvas.height};}''')
   assert alpha['nonopaque']==0
   if region=='nose':assert p.get_by_role('heading',name='T-Bölgesi',exact=True).count()==1 and p.locator('[data-skin-indicator]').count()==5
   if region=='periorbital':assert p.locator('[data-skin-indicator]').count()==4
   for indicator in value['indicators'][region]:
    if indicator['id'] in ('oil','dry','sag','acne','dark','bags','lines'):assert indicator['score'] is None
   assert p.locator('[data-skin-navigation]').bounding_box()['y']>=p.locator('[data-face-panel]').bounding_box()['y']+p.locator('[data-face-panel]').bounding_box()['height']-1
   if n==1:
    geometry=p.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,photo:document.querySelector("[data-face-panel]").getBoundingClientRect().toJSON(),summary:document.querySelector("[data-skin-indicators]").getBoundingClientRect().toJSON()})')
    assert geometry['scroll']<=geometry['width'] and geometry['photo']['right']<=geometry['width'] and geometry['summary']['right']<=geometry['width'],geometry
    # Convert CDP device-pixel content bounds to screenshot DIP coordinates.
    # Playwright full_page's CSS clip cuts the native-zoom raster in half.
    import base64,struct
    cdp=c.new_cdp_session(p);metrics=cdp.send('Page.getLayoutMetrics');bounds=metrics['contentSize']
    base_scale=p.evaluate('devicePixelRatio')/metrics['cssVisualViewport']['zoom']
    png=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True,'clip':{'x':0,'y':0,'width':bounds['width']/base_scale,'height':bounds['height']/base_scale,'scale':1}})
    pixels=base64.b64decode(png['data']);size=struct.unpack('>II',pixels[16:24]);assert abs(size[0]-bounds['width'])<=2 and abs(size[1]-bounds['height'])<=2,(size,bounds)
    (OUT/f'{n}-{region}-native200.png').write_bytes(pixels)
    (OUT/f'{n}-{region}-native200-geometry.json').write_text(json.dumps({'dom':geometry,'cdp':metrics}),'utf8');cdp.detach()
   else:
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
 proof={'status':'PASS','controlledFixture':True,'physicalCamera':False,'poseMock':False,'qualityOverride':False,'segmentationRequests':model_requests,'legacyReferencePreserved':True,'sourcePhotoOpaque':True,'faceFraming':True,'integerScores':True,'unavailableBars':False,'native200':native200,'pageErrors':errors,'runs':runs}
 (OUT/'proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2),'utf8');c.close()
 if profile:profile.cleanup()
print('PASS: V3 source photo, actual three fixture poses, six selected meshes, responsive layout, separate references')
