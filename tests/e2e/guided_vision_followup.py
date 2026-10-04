"""24 actual-model guided trials on licensed frames, not physical-user acceptance."""
import json,math,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('audit-results/guided-vision');OUT.mkdir(parents=True,exist_ok=True)
def diagnose(p):
 return p.evaluate('''()=>{let e=document.querySelector('[data-vision-mode]'),f=e[Object.keys(e).find(k=>k.startsWith('__reactFiber'))];const rows=[];for(;f;f=f.return){for(let h=f.memoizedState;h&&typeof h==='object';h=h.next){const r=h.memoizedState?.current;if(r&&typeof r==='object'&&'submitting' in r)rows.push({conditions:r.conditions,age:r.conditions?performance.now()-r.conditions.observedAt:null,paused:r.paused,submitting:r.submitting,presentationId:r.session?.presentationId,trials:r.session?.trials?.length});}}return{rows,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio,viewportScale:visualViewport?.scale},calibration:JSON.parse(localStorage.getItem('attune_manual_screen_scale_v1')),mode:e.dataset.visionMode};}''')
def prepare(p):
 p.goto('http://localhost:3000/vision');p.get_by_role('button',name='Hazırlığı Başlat',exact=True).click()
 expect(p.get_by_text('Kamera: açık · Yüz değerlendirmesi: çalışıyor',exact=True)).to_be_visible(timeout=45000)
 scale=p.get_by_role('button',name='Ekran ölçeğini ayarla',exact=True)
 if not scale.count():scale=p.get_by_role('button',name='Ekran ölçeğini yeniden ayarla',exact=True)
 scale.click();p.get_by_role('slider',name='Kart kenarının ekrandaki genişliği').fill('350');p.get_by_role('button',name='Manuel eşleştirmeyi kaydet',exact=True).click()
 action=p.get_by_role('button',name='Alıştırma ve denemelere geç',exact=True);expect(action).to_be_enabled(timeout=45000);p.screenshot(path=str(OUT/'prepare.png'),full_page=False);expect(action).to_be_enabled(timeout=15000);action.click();expect(p.locator('[data-vision-mode]')).to_have_attribute('data-vision-mode','practice')
 for i in range(3):
  p.get_by_role('button',name='BOŞLUĞU GÖREMİYORUM',exact=True).click();expect(p.get_by_text(f'{i+1} alıştırma yanıtı',exact=False)).to_be_visible();p.wait_for_timeout(40)
 assert p.evaluate('localStorage.getItem("togg_health_latest_vision")') is None
 assert p.evaluate('window.actualStreams.some(s=>s.getTracks().some(t=>t.readyState==="live"))')
 p.get_by_role('button',name='Sağ göz denemelerine geç',exact=True).click();p.get_by_role('button',name='Bu koşulda denemeleri başlat',exact=True).click()
def complete(p,stale=False):
 for i in range(24):
  expect(p.get_by_text(f'Ön değerlendirme · {i+1}/24',exact=True)).to_be_visible();invisible=p.get_by_role('button',name='BOŞLUĞU GÖREMİYORUM',exact=True);expect(invisible).to_be_enabled(timeout=15000)
  if i==4 and stale:
   p.locator('video').evaluate('v=>v.pause()');p.wait_for_timeout(2000);expect(invisible).to_be_disabled(timeout=5000);p.screenshot(path=str(OUT/'stale.png'),full_page=False)
   invisible.evaluate('b=>{b.disabled=false;b.click();b.disabled=true}');expect(p.get_by_text('Ön değerlendirme · 5/24',exact=True)).to_be_visible();p.locator('video').evaluate('v=>v.play()');expect(invisible).to_be_enabled(timeout=15000)
  if i in (0,8,16):p.screenshot(path=str(OUT/f'active-{i}.png'),full_page=False)
  if i%4==0:
   deadline=time.monotonic()+15
   while p.get_by_text(f'Ön değerlendirme · {i+1}/24',exact=True).count():
    expect(invisible).to_be_enabled(timeout=15000);invisible.click();p.wait_for_timeout(50)
    assert time.monotonic()<deadline,'No fresh camera presentation accepted visibility response'
  else:
   # A real stale interval invalidates the presentation and clears selection.
   # Reacquire the new target after recovery; never force an invalid answer.
   deadline=time.monotonic()+15
   while time.monotonic()<deadline:
    expect(invisible).to_be_enabled(timeout=15000);p.wait_for_timeout(40)
    target=float(p.locator('[data-continuous-optotype] g').get_attribute('transform').split('(')[1].split()[0]);selector=p.locator('[data-continuous-selector]');selector.evaluate('e=>e.scrollIntoView({block:"center"})');r=selector.bounding_box();a=math.radians(target+2);x=r['x']+r['width']/2+r['width']*.4*math.cos(a);y=r['y']+r['height']/2+r['height']*.4*math.sin(a)
    assert selector.evaluate('(e,xy)=>e.contains(document.elementFromPoint(...xy))',[x,y]),'Actual pointer target covered'
    p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+.01,y+.01);p.mouse.up();submit=p.get_by_role('button',name='Yanıtla',exact=True)
    if submit.is_disabled():continue
    submit.evaluate('b=>{b.click();b.click()}');p.wait_for_timeout(50)
    if not p.get_by_text(f'Ön değerlendirme · {i+1}/24',exact=True).count():break
   else:raise AssertionError(f'No stable real-camera presentation accepted at trial {i+1}: '+json.dumps(diagnose(p)))
  if i in (7,15):
   action=p.get_by_role('button',name='Bu koşulda denemeleri başlat',exact=True);expect(action).to_be_enabled(timeout=15000);action.click()
 expect(p.locator('[data-orientation-result]')).to_be_visible();expect(p.locator('[data-orientation-result]')).to_contain_text('24 geçerli deneme · 6 göremedi');p.wait_for_function('window.actualStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))');p.screenshot(path=str(OUT/'result.png'),full_page=False)
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chromium',headless=True,args=['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(Path('audit-fixtures/valid-face.y4m').resolve()),'--enable-unsafe-swiftshader'])
 c=b.new_context(permissions=['camera'],viewport={'width':1280,'height':900});c.add_init_script('window.actualStreams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{if(args[0]?.audio)throw Error("Microphone forbidden");const s=await original(...args);window.actualStreams.push(s);return s;};');c.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0});p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('http://localhost:3000/privacy');consent=p.get_by_role('checkbox',name='Yön hizalama sonuçlarını bu cihazda sakla',exact=True);expect(consent).not_to_be_checked();consent.check();prepare(p);complete(p,True)
 expect(p.get_by_text('Sonuç bu cihazdaki geçmişe kaydedildi.',exact=True)).to_be_visible();result=p.evaluate('JSON.parse(localStorage.getItem("togg_health_latest_vision"))')
 assert result['protocolVersion']=='landolt-orientation-guided-v2' and result['validTrials']==24 and result['notVisible']==6 and abs(result['meanAngularError']-2)<.2 and result['invalidPresentations']>=1
 assert result['eyeOcclusionVerification']=='not-camera-verified-user-instruction' and result['distanceMethod']=='relative-face-scale-only' and result['screenCalibration']['method']=='manual-card'
 for t in result['trials']:
  assert t['conditions']['modelActive'] and t['conditions']['qualityValid'] and t['conditions']['positionValid'] and t['eyeOcclusionVerification']=='not-camera-verified-user-instruction'
  assert t['visibility']!='not-visible' or (t['responseAngle'] is None and t['minimumCircularError'] is None)
 assert not any(k in result for k in ['logMAR','acuityRightSnellen','ophthalmologistReferralRecommended']);assert 'data:image' not in json.dumps(result)
 p.reload();p.locator('[data-record-history=vision]').get_by_role('button',name='Sonucu Aç',exact=True).click();expect(p.get_by_role('dialog',name='Yön hizalama sonucu',exact=True)).to_contain_text('24 geçerli deneme');p.screenshot(path=str(OUT/'history-dialog.png'),full_page=False);p.keyboard.press('Escape')
 panel=p.locator('[data-record-history=vision]');panel.get_by_role('button',name='kaydını sil:').click();deleteDialog=p.get_by_role('dialog',name='Bu kaydı silmek istiyor musunuz?',exact=True);expect(deleteDialog).to_be_visible();p.keyboard.press('Escape');expect(deleteDialog).not_to_be_visible();expect(panel.locator('[data-record-id]')).to_have_count(1);panel.get_by_role('button',name='kaydını sil:').click();p.get_by_role('button',name='Evet, sil',exact=True).click();p.reload();expect(panel.locator('[data-record-id]')).to_have_count(0)
 p.goto('http://localhost:3000/privacy');p.get_by_role('checkbox',name='Yön hizalama sonuçlarını bu cihazda sakla',exact=True).uncheck();prepare(p);complete(p);assert p.evaluate('localStorage.getItem("togg_health_latest_vision")') is None
 assert not errors,errors
 (OUT/'proof.json').write_text(json.dumps({'status':'PASS','actualProductionMediaPipe':True,'physicalCamera':False,'opticalOcclusionCertified':False,'sampleResult':result,'consentOffDoesNotPersist':True,'staleHandlerBypassRejected':True,'refreshAndDelete':True},ensure_ascii=False,indent=2),encoding='utf-8');c.close();b.close()
print('PASS: guided real model 24 trials, results, consent, refresh and deletion')
