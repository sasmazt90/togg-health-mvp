"""Actual continuous selector/calibration UI. No measured/clinical success claim."""
import math,json,io
from PIL import Image
from pathlib import Path
from playwright.sync_api import expect

def selector_contract(page,out=None,tag='continuous'):
    page.goto('http://localhost:3000/vision')
    page.evaluate('localStorage.removeItem("attune_manual_screen_scale_v1")');page.reload()
    expect(page.locator('[data-vehicle-status]')).to_have_text('PARK')
    assert page.get_by_text('Sürüş sırasında görme kontrolü ve alıştırma kapalıdır.',exact=True).count()==0
    page.get_by_role('button',name='Kısa Alıştırma',exact=True).click()
    selector=page.get_by_role('slider',name='Boşluk yönünü ayarlayın',exact=True)
    submit=page.get_by_role('button',name='Yanıtla',exact=True)
    expect(submit).to_be_disabled()
    assert page.get_by_title('Yukarı',exact=True).count()==0
    for direction in ['Sağ','Sol','Aşağı']:assert page.get_by_title(direction,exact=True).count()==0
    before=page.locator('[data-continuous-optotype] g').get_attribute('transform')
    selector.evaluate('e=>e.scrollIntoView({block:"center"})')
    page.wait_for_timeout(50)
    rect=selector.bounding_box();cx=rect['x']+rect['width']/2;cy=rect['y']+rect['height']/2
    angle=37.35;x=cx+rect['width']*.4*math.cos(math.radians(angle));y=cy+rect['height']*.4*math.sin(math.radians(angle))
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+.01,y+.01);page.mouse.up()
    chosen=float(selector.get_attribute('aria-valuenow'));assert abs(chosen-angle)<.1 and abs(chosen/45-round(chosen/45))>.1
    assert page.locator('[data-continuous-optotype] g').get_attribute('transform')==before
    expect(submit).to_be_enabled()
    submit.evaluate('(button)=>{button.click();button.click();}')
    expect(page.get_by_text('1 alıştırma yanıtı',exact=False)).to_be_visible()
    expect(submit).to_be_disabled()
    page.get_by_role('button',name='BOŞLUĞU GÖREMİYORUM',exact=True).click()
    expect(page.get_by_text('2 alıştırma yanıtı',exact=False)).to_be_visible()
    assert page.evaluate('localStorage.getItem("togg_health_latest_vision")') is None
    assert page.evaluate('localStorage.getItem("togg_health_vision_history")') in [None,'[]']
    targets=[];arrows=[]
    for i in range(12):
        transform=page.locator('[data-continuous-optotype] g').get_attribute('transform');targets.append(float(transform.split('(')[1].split()[0]));arrows.append(float(selector.get_attribute('aria-valuenow')))
        # Inspect actual browser-painted pixels, not a separately generated SVG.
        page.locator('[data-continuous-optotype]').evaluate('element=>element.scrollIntoView({block:"center"})');page.wait_for_timeout(50)
        image=Image.open(io.BytesIO(page.locator('[data-continuous-optotype]').screenshot())).convert('RGB')
        width,height=image.size
        for offset in [0,90,180,270]:
            angle=math.radians(targets[-1]+offset)
            x=min(width-1,max(0,round(width/2+width*.4*math.cos(angle))))
            y=min(height-1,max(0,round(height/2+height*.4*math.sin(angle))))
            rgb=image.getpixel((x,y))
            assert all(channel>230 for channel in rgb) if offset==0 else all(channel<60 for channel in rgb),(targets[-1],offset,rgb)
        page.get_by_role('button',name='BOŞLUĞU GÖREMİYORUM',exact=True).click()
    assert len(set(targets))==12 and all(a%45!=0 for a in targets)
    assert all(abs(a-b)>1e-6 for a,b in zip(targets,arrows))
    if out:page.screenshot(path=str(Path(out)/(tag+'.png')),full_page=True)
    return {'continuousTargetAngles':targets,'interactionRequired':True,'dragDoesNotSubmit':True,'doubleSubmitBlocked':True,'practicePersistedRecords':0}

def manual_calibration_contract(page):
    page.goto('http://localhost:3000/vision')
    page.evaluate('localStorage.setItem("attune_privacy_camera_allowed","false")')
    page.get_by_role('button',name='Hazırlığı Başlat',exact=True).click()
    expect(page.get_by_role('button',name='Alıştırma ve denemelere geç',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Ekran ölçeğini ayarla',exact=True).click()
    slider=page.get_by_role('slider',name='Kart kenarının ekrandaki genişliği')
    slider.fill('80');page.get_by_role('button',name='Manuel eşleştirmeyi kaydet',exact=True).click()
    saved=page.evaluate('JSON.parse(localStorage.getItem("attune_manual_screen_scale_v1"))');assert abs(saved['pixelsPerMm']-80/85.6)<1e-8 and saved['pixelsPerMm']<2
    page.get_by_role('button',name='Alıştırmayla devam et',exact=True).click()
    rect=page.locator('[data-continuous-optotype]').bounding_box();assert abs(rect['width']-2*80/85.6)<.05
    page.get_by_role('button',name='Kontrolü Bitir',exact=True).click()
    page.reload();page.get_by_role('button',name='Hazırlığı Başlat',exact=True).click()
    expect(page.get_by_text('Ekran ölçeği: manuel ölçek kayıtlı',exact=True)).to_be_visible()
    assert page.evaluate('localStorage.getItem("togg_health_latest_vision")') is None
    return {'manualScale':saved['pixelsPerMm'],'actualRenderedWidth':rect['width'],'measuredDistanceInvented':False,'records':0}

if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    out=Path('audit-results/continuous-vision');out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);context=browser.new_context();page=context.new_page();context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0})
        proof={'selector':selector_contract(page,out),'calibration':manual_calibration_contract(page)}
        page.set_viewport_size({'width':633,'height':266})
        proof['shortViewportSelector']=selector_contract(page,out,'short-viewport-continuous')
        selector=page.locator('[data-continuous-selector]')
        selector.evaluate('e=>e.scrollIntoView({block:"center"})')
        rect=selector.bounding_box()
        assert rect['y']>=0 and rect['y']+rect['height']<=page.evaluate('innerHeight')
        assert page.locator('[data-cockpit-header]').evaluate('e=>getComputedStyle(e).position')=='static'
        assert selector.evaluate('e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+r.width/2,r.top+8))}')
        proof['shortViewportEntireRingVisibleAndHitTested']=True
        (out/'proof.json').write_text(json.dumps(proof,indent=2),encoding='utf-8');context.close();browser.close()
    print('PASS: continuous targets/responses, isolated practice, honest manual calibration')
