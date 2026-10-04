"""Actual production MediaPipe on licensed recorded frames; no physical camera or scored result."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('audit-results/vision-camera');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chromium',headless=True,args=['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(Path('audit-fixtures/valid-face.y4m').resolve()),'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(permissions=['camera'],viewport={'width':1280,'height':900});context.add_init_script("window.actualStreams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await original(...args);window.actualStreams.push(stream);return stream;};")
    context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://localhost:3000/vision');page.get_by_role('button',name='Hazırlığı Başlat',exact=True).click();expect(page.get_by_text('Kamera: açık · Yüz değerlendirmesi: çalışıyor',exact=True)).to_be_visible(timeout=45000);page.wait_for_timeout(2500)
    expect(page.get_by_role('button',name='Alıştırma ve denemelere geç',exact=True)).to_be_disabled();assert page.evaluate('window.actualStreams.some(s=>s.getTracks().some(t=>t.readyState==="live"))');page.screenshot(path=str(OUT/'actual-prepare.png'),full_page=True)
    page.get_by_role('button',name='Alıştırmayla devam et',exact=True).click();assert page.locator('video').count()==1 and page.evaluate('window.actualStreams.some(s=>s.getTracks().some(t=>t.readyState==="live"))');assert page.evaluate('localStorage.getItem("togg_health_latest_vision")') is None
    page.get_by_role('button',name='BOŞLUĞU GÖREMİYORUM',exact=True).click();expect(page.get_by_text('1 alıştırma yanıtı',exact=False)).to_be_visible();page.screenshot(path=str(OUT/'actual-practice-camera.png'),full_page=True)
    context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':30});expect(page.get_by_role('button',name='Hazırlığı Başlat',exact=True)).to_be_disabled(timeout=10000);page.wait_for_function('window.actualStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))');assert page.evaluate('localStorage.getItem("togg_health_latest_vision")') is None
    context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0});expect(page.get_by_role('button',name='Hazırlığı Başlat',exact=True)).to_be_enabled(timeout=10000);page.get_by_role('button',name='Hazırlığı Başlat',exact=True).click();expect(page.get_by_text('Kamera: açık · Yüz değerlendirmesi: çalışıyor',exact=True)).to_be_visible(timeout=45000)
    page.evaluate('localStorage.setItem("attune_privacy_camera_allowed","false");window.dispatchEvent(new Event("attune-privacy"))');page.wait_for_function('window.actualStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))');assert not errors,errors
    proof={'status':'PASS','actualProductionMediaPipe':True,'physicalCamera':False,'fixture':'licensed recorded face video','cameraContinuesThroughPractice':True,'assessmentBlockedWithoutCalibration':True,'drivingAndPermissionRevokeEndAllTracks':True,'scoredRecords':0};(OUT/'proof.json').write_text(json.dumps(proof,indent=2),encoding='utf-8');context.close();browser.close()
print(json.dumps(proof))
