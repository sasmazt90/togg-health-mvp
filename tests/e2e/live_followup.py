"""Live-test regressions: production DOM, pixels and real API; no private media."""
import io
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect

OUT = Path('audit-results/live-followup')
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chromium', headless=True)
    context = browser.new_context(device_scale_factor=8)
    assert context.request.post('http://localhost:8000/api/vehicle/speed', data={'speedKmH':0}).ok
    page = context.new_page()
    seen = set()
    for session in range(8):
        page.goto('http://localhost:3000/vision')
        page.get_by_role('button',name='TESTİ HAZIRLA',exact=True).click()
        page.get_by_role('button',name='Ölçek Doğrulandı, Mesafeye Geç',exact=True).click()
        page.get_by_role('button',name='Doğrulandı, Testi Başlat',exact=True).click()
        for trial in range(6):
            svg=page.locator('svg[data-logmar]')
            angle=svg.evaluate("s=>Number(s.style.transform.match(/[-\d.]+/)[0])")
            direction={0:'Sağ',90:'Aşağı',180:'Sol',270:'Yukarı',-90:'Yukarı'}[angle]
            png=svg.screenshot()
            (OUT/f'vision-{angle}.png').write_bytes(png)
            im=Image.open(io.BytesIO(png)).convert('RGB')
            w,h=im.size
            painted=[(x,y) for y in range(h) for x in range(w) if im.getpixel((x,y))[0]<60 and im.getpixel((x,y))[1]>180 and im.getpixel((x,y))[2]>230]
            assert painted, 'No actual painted optotype'
            x0,x1=min(x for x,y in painted),max(x for x,y in painted)
            y0,y1=min(y for x,y in painted),max(y for x,y in painted)
            cx,cy=(x0+x1)/2,(y0+y1)/2
            radius=min(x1-x0+1,y1-y0+1)*.4
            points={'Sağ':(cx+radius,cy),'Sol':(cx-radius,cy),'Yukarı':(cx,cy-radius),'Aşağı':(cx,cy+radius)}
            for name,(x,y) in points.items():
                rgb=im.getpixel((min(w-1,int(x)),min(h-1,int(y))))
                bright=rgb[1]>100 and rgb[2]>100
                assert bright==(name!=direction),(angle,name,rgb,im.size)
            seen.add(direction)
            old=svg.get_attribute('data-trial')
            page.get_by_title(direction,exact=True).click()
            if trial<5: expect(svg).not_to_have_attribute('data-trial',old)
        if len(seen)==4: break
    assert len(seen)==4,seen
    context.close()
    context=browser.new_context()
    page=context.new_page()
    page.goto('http://localhost:3000/profile')
    page.get_by_role('button',name='Hekimle Paylaşılabilir Özet',exact=True).click()
    expect(page.get_by_role('button',name='Yazdır / PDF olarak kaydet',exact=True)).to_be_disabled()
    assert page.get_by_role('checkbox').count()==3
    assert page.get_by_role('checkbox').filter(has_text='').count()==3
    assert page.get_by_role('checkbox').evaluate_all('(items)=>items.every(i=>!i.checked && i.disabled)')
    assert 'Ahmet Yılmaz' not in page.locator('[data-share-preview]').inner_text()
    page.screenshot(path=str(OUT/'profile-empty.png'))
    (OUT/'first-group.json').write_text(json.dumps({'fourPaintedGapDirections':sorted(seen),'emptyShareBlocked':True,'noAutomaticMentalSelection':True},ensure_ascii=False,indent=2),encoding='utf-8')
    context.close();browser.close()
print('PASS: four actual painted directions; empty/unselected sharing')
