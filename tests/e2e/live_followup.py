"""Live-test regressions: production DOM, pixels and real API; no private media."""
import base64
import json
from pathlib import Path
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
            angle=svg.evaluate("s=>Number(s.parentElement.style.transform.match(/[-\d.]+/)[0])")
            direction={0:'Sağ',90:'Aşağı',180:'Sol',270:'Yukarı',-90:'Yukarı'}[angle]
            before=svg.evaluate('s=>({rect:s.getBoundingClientRect().toJSON(),width:s.getAttribute("width"),height:s.getAttribute("height"),computedWidth:getComputedStyle(s).width,computedHeight:getComputedStyle(s).height,trial:s.dataset.trial,parent:s.parentElement.getBoundingClientRect().toJSON()})')
            svg.scroll_into_view_if_needed()
            page.screenshot(animations='disabled')
            box=svg.bounding_box()
            geometry=svg.evaluate('s=>{const m=s.getScreenCTM();const c=new DOMPoint(50,50).matrixTransform(m);return {cx:c.x,cy:c.y,radius:Math.hypot(m.a,m.b)*40};}')
            png=page.screenshot()
            afterBox=svg.bounding_box()
            assert box==afterBox, ('Geometry moved during capture',box,afterBox)
            decoded=page.evaluate('''async ({encoded,box}) => {
                const bytes=Uint8Array.from(atob(encoded), c=>c.charCodeAt(0));
                const bitmap=await createImageBitmap(new Blob([bytes], {type:'image/png'}));
                const dpr=window.devicePixelRatio;
                const padding=dpr;
                const left=Math.floor(box.x*dpr)-padding,top=Math.floor(box.y*dpr)-padding;
                const width=Math.ceil(box.width*dpr)+2*padding,height=Math.ceil(box.height*dpr)+2*padding;
                const canvas=new OffscreenCanvas(width,height);
                const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,left,top,width,height,0,0,width,height);
                const outputBytes=new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer());
                const result={left,top,width,height,pixels:Array.from(ctx.getImageData(0,0,width,height).data),png:btoa(String.fromCharCode(...outputBytes))};
                bitmap.close(); return result;
            }''',{'encoded':base64.b64encode(png).decode('ascii'),'box':box})
            (OUT/f'vision-{angle}.png').write_bytes(base64.b64decode(decoded['png']))
            w,h=decoded['width'],decoded['height']
            def pixel(x,y):
                offset=(y*w+x)*4
                return decoded['pixels'][offset:offset+3]
            painted=[(x,y) for y in range(h) for x in range(w) if pixel(x,y)[0]<60 and pixel(x,y)[1]>180 and pixel(x,y)[2]>230]
            assert painted, 'No actual painted optotype'
            x0,x1=min(x for x,y in painted),max(x for x,y in painted)
            y0,y1=min(y for x,y in painted),max(y for x,y in painted)
            cx,cy=(x0+x1)/2,(y0+y1)/2
            radius=min(x1-x0+1,y1-y0+1)*.4
            points={'Sağ':(cx+radius,cy),'Sol':(cx-radius,cy),'Yukarı':(cx,cy-radius),'Aşağı':(cx,cy+radius)}
            for name,(x,y) in points.items():
                rgb=pixel(min(w-1,int(x)),min(h-1,int(y)))
                bright=rgb[1]>100 and rgb[2]>100
                assert bright==(name!=direction),(angle,name,rgb,(w,h),before,geometry)
            print('PIXEL_TRIAL',json.dumps({'before':before,'angle':angle,'png':[w,h],'paint':[x0,x1,y0,y1]}),flush=True)
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
