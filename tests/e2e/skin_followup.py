"""Actual MediaPipe/UI baseline, anatomy, reminder and repeat comparison."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT=Path('audit-results/live-followup'); OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chromium',headless=True,args=[
      '--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(Path('audit-fixtures/valid-face.y4m').resolve()),
      '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(permissions=['camera'],accept_downloads=True)
    context.add_init_script("window.actualStreams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await original(...args);window.actualStreams.push(stream);return stream;};")
    assert context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0}).ok
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://localhost:3000/skin')
    page.get_by_role('button',name='Analizi Başlat',exact=True).click()
    page.wait_for_function('''()=>{const video=document.querySelector('video');return video && video.videoWidth>0 && video.videoHeight>0;}''')
    geometry=page.locator('video').evaluate('''video=>{
      const box=video.getBoundingClientRect();const panel=video.closest('[data-face-panel]').getBoundingClientRect();
      return {source:video.videoWidth/video.videoHeight,display:box.width/box.height,panel:panel.width/panel.height};
    }''')
    assert abs(geometry['source']-geometry['display'])<.02,geometry
    expect(page.get_by_text('Cilt Analizi Tamamlandı',exact=True)).to_be_visible(timeout=45000)
    first=page.evaluate('JSON.parse(localStorage.getItem("togg_health_latest_skin"))')
    assert first['isBaseline'] is True and first['usedMediaPipe'] is True
    assert first['quality']['blurScore']>=4 and 40<=first['quality']['avgLuminance']<=220
    expect(page.get_by_text('Referans oluşturuldu; sonraki uygun taramalar bununla karşılaştırılacak.',exact=True)).to_be_visible()
    assert page.locator('video').count()==0
    page.wait_for_function('window.actualStreams.length>0 && window.actualStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')
    assert '%0' not in page.locator('body').inner_text()
    for _ in range(6):
        graphic=page.locator('[data-face-schematic] svg')
        label=graphic.get_attribute('aria-label')
        assert graphic.locator('path[fill="#00c2e7"]').count()>0
        page.get_by_role('button',name='Gözlem Notu',exact=True).click()
        selected=label.replace(' anatomik yüz şeması','')
        note=page.get_by_text(selected+' — Referans oluşturuldu',exact=True)
        expect(note).to_be_visible()
        page.keyboard.press('Escape')
        page.get_by_role('button',name='Sonraki Bölge',exact=True).click()
    page.screenshot(path=str(OUT/'skin-baseline-schematic.png'))
    page.get_by_role('button',name='Önerilen Aksiyonlar',exact=True).click()
    page.get_by_role('button',name='Hatırlat',exact=True).click()
    page.get_by_role('button',name='Hatırlatmayı kaydet',exact=True).click()
    expect(page.get_by_text('Uygulama içi plan kaydedildi. İşletim sistemi bildirimi kurulmadı.',exact=True)).to_be_visible()
    reminder=page.evaluate('JSON.parse(localStorage.getItem("togg_health_skin_reminder"))')
    page.get_by_role('button',name='Hatırlatmayı kaydet',exact=True).click()
    assert page.evaluate('JSON.parse(localStorage.getItem("togg_health_skin_reminder")).id')==reminder['id']
    with page.expect_download() as pending: page.get_by_role('button',name='Takvim dosyasını indir (.ics)',exact=True).click()
    download=pending.value;download.save_as(str(OUT/'planlanan-takip.ics'))
    calendar=(OUT/'planlanan-takip.ics').read_text(encoding='utf-8')
    assert 'BEGIN:VEVENT' in calendar and 'BEGIN:VALARM' in calendar and 'SUMMARY:Planlanan takip' in calendar
    assert 'cilt' not in calendar.lower() and 'mental' not in calendar.lower()
    page.get_by_role('button',name='Hatırlatmayı iptal et',exact=True).click()
    assert not page.evaluate('localStorage.getItem("togg_health_skin_reminder")')
    page.keyboard.press('Escape')
    page.goto('http://localhost:3000/skin')
    page.get_by_role('button',name='Analizi Başlat',exact=True).click()
    expect(page.get_by_text('Cilt Analizi Tamamlandı',exact=True)).to_be_visible(timeout=45000)
    second=page.evaluate('JSON.parse(localStorage.getItem("togg_health_latest_skin"))')
    assert second['id']!=first['id'] and second['isBaseline'] is False
    assert second['baselineId']==first['id'] and not second['comparisonUnavailable']
    assert len(second['regions'])==6
    assert all('changeFromBaselinePct' in r for r in second['regions'].values())
    assert not errors,errors
    page.screenshot(path=str(OUT/'skin-repeat-schematic.png'))
    (OUT/'skin.json').write_text(json.dumps({'first':first,'second':second,'calendarUid':reminder['id'],'cameraStoppedInResult':True,'allSixRegionsVisible':True},ensure_ascii=False,indent=2),encoding='utf-8')
    # Migration fixture starts from the two actual UI scans above, never injected metrics.
    original_baseline=page.evaluate('localStorage.getItem("togg_health_skin_baseline")')
    page.evaluate('localStorage.removeItem("togg_health_skin_baseline_meta")')
    page.goto('http://localhost:3000/skin')
    page.get_by_role('button',name='Analizi Başlat',exact=True).click()
    expect(page.get_by_text('Cilt Analizi Tamamlandı',exact=True)).to_be_visible(timeout=45000)
    legacy=page.evaluate('JSON.parse(localStorage.getItem("togg_health_latest_skin"))')
    assert legacy['isBaseline'] is False and legacy['comparisonUnavailable'] is True
    assert all('changeFromBaselinePct' not in r for r in legacy['regions'].values())
    assert page.evaluate('localStorage.getItem("togg_health_skin_baseline")')==original_baseline
    expect(page.get_by_text('Karşılaştırma yapılamadı:',exact=False)).to_be_visible()
    # Controlled corrupt-storage fault: prove existing data is preserved, not overwritten.
    page.evaluate('localStorage.setItem("togg_health_skin_baseline","invalid-reference-json")')
    latest_before=page.evaluate('localStorage.getItem("togg_health_latest_skin")')
    page.goto('http://localhost:3000/skin')
    page.get_by_role('button',name='Analizi Başlat',exact=True).click()
    expect(page.get_by_text('Mevcut referans okunamadı. Referansınız değiştirilmedi; bu tarama kaydedilmedi.',exact=True)).to_be_visible(timeout=45000)
    assert page.evaluate('localStorage.getItem("togg_health_skin_baseline")')=='invalid-reference-json'
    assert page.evaluate('localStorage.getItem("togg_health_latest_skin")')==latest_before
    assert not errors,errors
    page.goto('http://localhost:3000/profile')
    page.get_by_role('button',name='Hekimle Paylaşılabilir Özet',exact=True).click()
    choices=page.get_by_role('checkbox')
    assert choices.evaluate_all('(items)=>items.every(i=>!i.checked)')
    page.get_by_label('Cilt',exact=True).check()
    preview=page.locator('[data-share-preview]').inner_text()
    assert 'Cilt' in preview and 'Ruhsal iyi oluş' not in preview and 'Görme' not in preview
    # Observe the native print event and the actual print document; do not replace print().
    page.evaluate('''()=>{
      window.printReports=[];
      const original=Node.prototype.appendChild;
      Node.prototype.appendChild=function(node){
        const result=original.call(this,node);
        if(node instanceof HTMLIFrameElement){
          const doc=node.contentDocument, close=doc.close.bind(doc);
          // document.open removes window listeners: attach after the real document closes.
          doc.close=function(){
            const closed=close();
            node.contentWindow.addEventListener('beforeprint',()=>{
              window.printReports.push({html:doc.documentElement.outerHTML,title:doc.title,text:doc.body.innerText});
            });
            return closed;
          };
        }
        return result;
      };
    }''')
    page.get_by_role('button',name='Yazdır / PDF olarak kaydet',exact=True).click()
    page.wait_for_function('window.printReports.length===1')
    report=page.evaluate('window.printReports[0]')
    assert 'Cilt' in report['text'] and 'Ruhsal iyi oluş' not in report['html'] and 'Görme' not in report['html']
    assert 'klinik tanı' in report['text'] and 'Ahmet Yılmaz' not in report['html']
    assert 'http://localhost:8000' not in report['html']
    (OUT/'selected-print.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    context.close();browser.close()
print('PASS: actual MediaPipe baseline/repeat; six anatomy regions; real calendar file; cancellation')
