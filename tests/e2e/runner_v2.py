"""Repeat baseline audit with an independently verified media-capable browser.
Only test instrumentation is changed; application source remains original.
Virtual camera frames are not a clinical or physical-device validation.
"""
import pathlib,json,time,traceback,os
from playwright.sync_api import sync_playwright
OUT=pathlib.Path('audit-results'); OUT.mkdir(exist_ok=True)
face=str(pathlib.Path('audit-fixtures/face.y4m').resolve())
audio=str(pathlib.Path('audit-fixtures/speech.wav').resolve())
baseargs=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-video-capture='+face,'--use-file-for-fake-audio-capture='+audio,'--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
preflight=[]; chosen=None
with sync_playwright() as pw:
 for channel,headless in [('chromium',True),('chrome',True),('chromium',False)]:
  b=None
  try:
   b=pw.chromium.launch(channel=channel,headless=headless,args=baseargs)
   c=b.new_context(permissions=['camera','microphone']); p=c.new_page();p.goto('http://localhost:3000/privacy')
   d=p.evaluate('''async()=>{const timeout=(f)=>Promise.race([f,new Promise((_,r)=>setTimeout(()=>r(Error('media timeout')),8000))]); const out={ua:navigator.userAgent,devices:await navigator.mediaDevices.enumerateDevices().then(ds=>ds.map(d=>({kind:d.kind,label:d.label}))),supported:navigator.mediaDevices.getSupportedConstraints()};for(const kind of ['video','audio']){try{const s=await timeout(navigator.mediaDevices.getUserMedia({[kind]:true}));out[kind]={tracks:s.getTracks().map(t=>({kind:t.kind,state:t.readyState,settings:t.getSettings()}))};if(kind==='video'){const v=document.createElement('video');v.muted=true;v.srcObject=s;document.body.append(v);await timeout(v.play());out.video.width=v.videoWidth;out.video.height=v.videoHeight;}s.getTracks().forEach(t=>t.stop());}catch(e){out[kind]={error:e.name+': '+e.message};}}return out;}''')
   d.update(channel=channel,headless=headless,version=b.version);preflight.append(d);print('MEDIA_PREFLIGHT '+json.dumps(d),flush=True)
   if d.get('video',{}).get('width',0)>0 and chosen is None:chosen={'channel':channel,'headless':headless}
  except Exception as e:preflight.append({'channel':channel,'headless':headless,'error':str(e)})
  finally:
   if b:b.close()
(OUT/'media-preflight.json').write_text(json.dumps(preflight,indent=2))
source=pathlib.Path('tests/e2e/audit_browser.py').read_text()
if chosen is None:
 chosen={'channel':'chromium','headless':True}
 print('MEDIA_NOT_VERIFIED: continue negative tests; do not claim camera E2E passed',flush=True)
source=source.replace("browser=pw.chromium.launch(headless=True,args=args)","browser=pw.chromium.launch(channel="+repr(chosen['channel'])+",headless="+repr(chosen['headless'])+",args=args+['--use-fake-ui-for-media-stream'])")
source=source.replace("{'name':'videoCapture'}","{'name':'camera'}")
source=source.replace("page.wait_for_timeout(900);click_toggle(page);snap(page,'vision-driving')", "page.wait_for_timeout(900);require(page.evaluate('window.__audit.streams.some(s=>s.getVideoTracks().some(t=>t.readyState===\"live\"))'),'PRECONDITION: no active camera before driving');click_toggle(page);snap(page,'vision-driving')")
source=source.replace("window.__audit.speech.push({type:k,error:e.error||null,transcript:e.results?.[0]?.[0]?.transcript||null})", "window.__audit.speech.push({type:k,error:e.error||null,transcript:e.results?.[0]?.[0]?.transcript||null})")
extra=r'''
    # Additional actual-user and negative-path regression checks.
    c,page=new()
    def vision_geometry():
        go(page,'/vision');page.get_by_role('button',name='TESTİ HAZIRLA').click();page.get_by_role('button',name='Ölçek Doğrulandı, Mesafeye Geç').click();page.get_by_role('button',name='Doğrulandı, Testi Başlat').click()
        circle=page.locator('circle[stroke-dasharray]');svg=circle.locator('..');widths=[]
        for i in range(3):
            widths.append(svg.evaluate('(s)=>({width:s.getBoundingClientRect().width,attr:s.getAttribute("width"),style:s.getAttribute("style")})'))
            deg=svg.evaluate('(s)=>parseFloat(s.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1])')
            title={0:'Sağ',90:'Aşağı',180:'Sol',270:'Yukarı',-90:'Yukarı'}[deg]
            page.get_by_title(title,exact=True).click();page.wait_for_timeout(450)
        snap(page,'vision-geometry');(OUT/'vision-geometry-values.json').write_text(json.dumps(widths,indent=2));require(widths[-1]['width']<widths[0]['width'],'Correct responses change reported difficulty but actual symbol width remains '+str(widths))
        return widths
    check('vision actual rendered symbol shrinks after correct responses',vision_geometry);close(c,'vision-geometry')

    c,page=new()
    def mental_fabricated_panels():
        go(page,'/mental');body=page.locator('body').inner_text();snap(page,'mental-panels');require('4 Seans Analiz Edildi' not in body,'Four nonexistent analyzed sessions shown to a first-time user');require('75' not in body,'Unmeasured theme percentage shown')
    check('mental fresh-user insight panels contain no invented statistics',mental_fabricated_panels)
    def mental_api_outage():
        page.route('**/api/mental/converse',lambda r:r.abort());text_input('Bugün yeni bir kitap okudum.');snap(page,'mental-api-outage');body=page.locator('body').inner_text().lower();require('son konuşmalarımızda' not in body,'API failure fallback invents prior patient history');require('bağlantı' in body or 'ulaşılamıyor' in body,'API outage not disclosed')
    check('mental API outage transparently disclosed without invented history',mental_api_outage)
    close(c,'mental-negative')

    c,page=new()
    def mental_upper_crisis():
        go(page,'/mental');text_input('İNTİHAR ETMEK İSTİYORUM');snap(page,'mental-uppercase-crisis')
        tts=page.evaluate('window.__audit.tts');require(tts and '112' in tts[-1]['text'],'Uppercase Turkish crisis not escalated in actual reply')
    check('mental Turkish uppercase crisis escalation',mental_upper_crisis);close(c,'mental-upper')

    c,page=new()
    def wipe_outage():
        api('/api/mental/sessions',{'summaryText':'AUDIT ONLY backend deletion outage','recurringThemes':[],'saveMentalSummaries':True})
        go(page,'/privacy');page.route('**/api/privacy/wipe',lambda r:r.abort());page.get_by_role('button',name='TÜM YEREL VERİLERİ SİL',exact=True).click();page.get_by_role('button',name='Evet, Tüm Verileri Sil',exact=True).click();page.wait_for_timeout(700);snap(page,'privacy-wipe-outage')
        records=api('/api/mental/sessions');require(not records or 'Tüm yerel veriler başarıyla temizlendi.' not in page.locator('body').inner_text(),'Deletion success claimed while backend health summaries remain')
    check('privacy deletion failure not falsely reported as success',wipe_outage);close(c,'privacy-outage');api('/api/privacy/wipe',{})

    c,page=new()
    def skin_missing_model():
        page.route('**/face_landmarker.task',lambda r:r.abort());page.route('**/wasm/**',lambda r:r.abort());go(page,'/skin');page.wait_for_timeout(3000);page.get_by_role('button',name='Analizi Başlat',exact=True).click();page.wait_for_timeout(2500);snap(page,'skin-model-offline');require(not page.evaluate('localStorage.getItem("togg_health_latest_skin")'),'Fabricated result persisted without model');require('başlatılamadı' in page.locator('body').inner_text().lower(),'Model failure has no clear retry/error state')
    check('skin model network failure safe with no measurement persistence',skin_missing_model);close(c,'skin-offline')

    c,page=new()
    def corrupt_storage():
        go(page,'/privacy');page.evaluate('localStorage.setItem("togg_health_latest_skin","{");localStorage.setItem("togg_health_latest_vision","{");localStorage.setItem("togg_health_latest_mental","{")');go(page,'/');snap(page,'corrupt-storage');require('Application error' not in page.locator('body').inner_text(),'Corrupted user storage crashes app')
    check('corrupt persisted JSON does not crash dashboard',corrupt_storage);close(c,'corrupt-data')

    c,page=new()
    def privacy_mic():
        go(page,'/privacy');page.get_by_role('button',name='Erişimi Kapat',exact=True).nth(1).click();page.get_by_role('link',name='Ruhsal İyi Oluş',exact=True).click();page.wait_for_timeout(800);page.get_by_role('button',name='MİKROFONU BAŞLAT',exact=True).click();snap(page,'privacy-mic-off');require('Mikrofon kullanım izni Gizlilik ayarlarında kapalıdır' in page.locator('body').inner_text(),'App microphone preference ignored');require(not page.evaluate('window.__audit.speech.some(e=>e.type==="start")'),'Recognition starts without app permission')
    check('privacy microphone off blocks listening and offers typing',privacy_mic);close(c,'privacy-mic')
'''
source=source.replace('    browser.close()\n',extra+'\n    browser.close()\n')
(OUT/'executed-harness.py').write_text(source)
exec(compile(source,'audit_browser_v2_expanded.py','exec'),{'__name__':'__main__'})
