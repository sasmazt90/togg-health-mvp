"""Behavior-level backlog regressions against the built app and actual local API."""
import argparse
import json
import os
from pathlib import Path
import re
import traceback
import unicodedata

from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ATTUNE_AUDIT_BASE', 'http://localhost:3000')
API = os.environ.get('ATTUNE_API_BASE', 'http://localhost:8000')
OUT = Path(os.environ.get('ATTUNE_BACKLOG_OUT', 'audit-results/backlog'))
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--phase', required=True)
phase = parser.parse_args().phase
results = []


def record(name, fn):
    try:
        detail = fn()
        row = {'name': name, 'status': 'PASS', 'detail': detail}
    except Exception as error:
        row = {'name': name, 'status': 'FAIL', 'error': str(error), 'traceback': traceback.format_exc()}
    results.append(row)
    print(json.dumps(row, ensure_ascii=False), flush=True)


def enter_text(page, text):
    if page.locator('input').count() == 0:
        page.get_by_role('button', name='İsterseniz yazabilirsiniz', exact=True).click()
    old_reply = page.locator('[data-chat-author="AI"] p').last.inner_text()
    page.locator('input').fill(text)
    page.locator('input').press('Enter')
    expect(page.locator('[data-chat-author="AI"] p').last).not_to_have_text(old_reply)
    return page.locator('[data-chat-author="AI"] p').last.inner_text()


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chromium', headless=True)
    if phase == 'crisis':
        phrases = ['intihar', 'İNTİHAR', 'İntihar', 'iNtIhAr', 'INTIHAR', 'i\u0307ntihar',
                   'CANIMA KIYMAK', 'ÖLMEK İSTİYORUM', 'KeNdİmE ZaRaR',
                   unicodedata.normalize('NFD', 'YAŞAMAK İSTEMİYORUM')]
        for text in phrases + ['Bugün yeni bir kitap okudum.', 'İyi hissediyorum, ailemle görüştüm.']:
            def check(text=text):
                context = browser.new_context()
                try:
                    page = context.new_page()
                    page.goto(BASE + '/mental')
                    reply = enter_text(page, text)
                    if text in phrases:
                        assert '112' in reply and '182' not in reply, reply
                    else:
                        assert '112' not in reply, reply
                    return {'input': text, 'actualReply': reply}
                finally:
                    context.close()
            record('Actual frontend crisis reply: ' + text, check)
    elif phase == 'privacy':
        for local_available, backend_available in [(True, True), (True, False), (False, True), (False, False)]:
            def deletion(local_available=local_available, backend_available=backend_available):
                # Actual browser capability and an aborted network request: no fabricated responses.
                test_browser = pw.chromium.launch(channel='chromium', headless=True,
                    args=[] if local_available else ['--disable-local-storage'])
                context = test_browser.new_context()
                try:
                    created = context.request.post(API + '/api/mental/sessions', data={
                        'summaryText': 'Synthetic deletion capability check',
                        'recurringThemes': [], 'saveMentalSummaries': True})
                    assert created.ok and created.json()['persisted'] is True
                    page = context.new_page()
                    page.goto(BASE + '/privacy')
                    if not local_available:
                        assert page.evaluate('window.localStorage') is None
                    if not backend_available:
                        page.route('**/api/privacy/wipe', lambda route: route.abort())
                    page.get_by_role('button', name='TÜM YEREL VERİLERİ SİL', exact=True).click()
                    page.get_by_role('button', name='Evet, Tüm Verileri Sil', exact=True).click()
                    status = page.locator('[role="status"]').filter(has_text='Tarayıcıdaki sağlık kayıt')
                    expect(status).to_be_visible()
                    text = status.inner_text()
                    assert ('Tarayıcıdaki sağlık kayıtları silindi.' in text) is local_available
                    assert ('Yerel sunucudaki seans özetlerinin silindiği doğrulandı.' in text) is backend_available
                    body = page.locator('body').inner_text()
                    assert ('Tüm yerel veriler başarıyla temizlendi.' in body) is (local_available and backend_available)
                    if not local_available and not backend_available:
                        assert 'Silme işlemi tamamlanamadı.' in text
                    elif local_available != backend_available:
                        assert 'Silme işlemi kısmen tamamlandı.' in text
                    remaining = context.request.get(API + '/api/mental/sessions').json()
                    assert bool(remaining) is (not backend_available)
                    page.screenshot(path=str(OUT / f'privacy-{local_available}-{backend_available}.png'))
                    return {'localAvailable': local_available, 'backendAvailable': backend_available,
                            'actualStatus': text, 'remainingServerRecords': len(remaining)}
                finally:
                    context.request.post(API + '/api/privacy/wipe')
                    context.close()
                    test_browser.close()
            record(f'Deletion truthfulness local={local_available} backend={backend_available}', deletion)
    elif phase == 'vehicle':
        def transitions():
            face = str(Path('audit-fixtures/face.y4m').resolve())
            camera_browser = pw.chromium.launch(channel='chromium', headless=True, args=[
                '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + face,
                '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = camera_browser.new_context(permissions=['camera'])
            try:
                assert context.request.post(API+'/api/vehicle/speed', data={'speedKmH':0}).ok
                page = context.new_page()
                page.add_init_script("""window.cameraStreams=[];const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await gum(...args);window.cameraStreams.push(stream);return stream;};""")
                page.goto(BASE+'/vision')
                toggle = page.get_by_title('Sürüş ve Park modları arasında geçiş')
                expect(toggle).to_contain_text('PARK')
                page.get_by_role('button',name='TESTİ HAZIRLA',exact=True).click()
                page.get_by_role('button',name='Ölçek Doğrulandı, Mesafeye Geç',exact=True).click()
                page.wait_for_function('window.cameraStreams.some(s=>s.getVideoTracks().some(t=>t.readyState==="live"))')
                toggle.click()
                expect(toggle).to_contain_text('SÜRÜŞ')
                expect(page.get_by_role('heading',name='Görme Kontrolü Kullanılamıyor')).to_be_visible()
                assert page.evaluate('window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')
                driving = context.request.get(API+'/api/vehicle/state').json()
                assert driving['vehicleMoving'] is True and driving['currentSpeed'] == 75
                reply = context.request.post(API+'/api/mental/converse',data={'userMessage':'Bugün kitap okudum'}).json()
                assert reply['isDriving'] is True
                toggle.click()
                expect(toggle).to_contain_text('PARK')
                parked = context.request.get(API+'/api/vehicle/state').json()
                assert parked['vehicleMoving'] is False and parked['currentSpeed'] == 0
                expect(page.get_by_role('button',name='TESTİ HAZIRLA',exact=True)).to_be_visible()
                page.get_by_role('button',name='TESTİ HAZIRLA',exact=True).click()
                page.get_by_role('button',name='Ölçek Doğrulandı, Mesafeye Geç',exact=True).click()
                page.wait_for_function('window.cameraStreams.some(s=>s.getVideoTracks().some(t=>t.readyState==="live"))')
                page.get_by_role('link',name='Gizlilik & İzinler',exact=True).click()
                page.wait_for_function('window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')
                return {'driving':driving,'parked':parked,'drivingReply':reply,'tracksEndedOnNavigation':True}
            finally:
                context.request.post(API+'/api/vehicle/speed',data={'speedKmH':0})
                context.close()
                camera_browser.close()
        record('Vision capture stops; frontend transitions govern backend safety decisions',transitions)
        def outage():
            context = browser.new_context()
            try:
                context.request.post(API+'/api/vehicle/speed',data={'speedKmH':0})
                page = context.new_page()
                page.route('**/api/vehicle/state',lambda route:route.abort())
                page.goto(BASE+'/vision')
                notice = page.get_by_role('alert').filter(has_text='Araç durumu doğrulanamıyor')
                expect(notice).to_be_visible()
                assert page.get_by_role('button',name='TESTİ HAZIRLA',exact=True).count() == 0
                return {'actualSafetyNotice':notice.inner_text()}
            finally:
                context.close()
        record('Unverified vehicle state keeps visual controls locked',outage)
    elif phase == 'vision':
        def geometry():
            context = browser.new_context()
            try:
                context.request.post(API+'/api/vehicle/speed',data={'speedKmH':0})
                page = context.new_page()
                page.goto(BASE+'/vision')
                page.get_by_role('button',name='TESTİ HAZIRLA',exact=True).click()
                page.get_by_role('button',name='Ölçek Doğrulandı, Mesafeye Geç',exact=True).click()
                page.get_by_role('button',name='Doğrulandı, Testi Başlat',exact=True).click()
                symbol = page.get_by_role('img',name='Görme testi simgesi',exact=True)
                observations = []
                for i in range(3):
                    page.wait_for_function('document.querySelector("svg[data-logmar]").getAnimations().length === 0')
                    observations.append(symbol.evaluate('(s)=>({width:s.getBoundingClientRect().width,logMAR:Number(s.dataset.logmar)})'))
                    angle = symbol.evaluate("s=>parseFloat(s.style.transform.match(/rotate\(([-\\d.]+)deg\)/)[1])")
                    title = {0:'Sağ',90:'Aşağı',180:'Sol',270:'Yukarı',-90:'Yukarı'}[angle]
                    page.get_by_title(title,exact=True).click()
                assert observations[-1]['width'] < observations[0]['width'], observations
                ratio = observations[-1]['width']/observations[0]['width']
                expected = 10 ** (observations[-1]['logMAR']-observations[0]['logMAR'])
                assert abs(ratio-expected)<0.01, observations
                # Touch controls retain their readable size independently of the measured stimulus.
                assert page.get_by_title('Yukarı',exact=True).bounding_box()['height'] >= 90
                page.screenshot(path=str(OUT/'vision-geometry.png'))
                return observations
            finally:
                context.close()
        record('Rendered optotype geometry follows actual logMAR difficulty',geometry)
    else:
        raise ValueError('Unknown regression phase: ' + phase)
    browser.close()

(OUT / (phase + '.json')).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
raise SystemExit(1 if any(row['status'] != 'PASS' for row in results) else 0)
