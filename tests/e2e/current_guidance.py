"""Production fixed-cache HTML audio lifecycle, real autoplay and route cancellation."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('audit-results/current-health-20261009/guidance');OUT.mkdir(parents=True,exist_ok=True)
INIT="window.guidanceEvents=[];window.guidanceAudio=[];window.addEventListener('attune-guidance-event',e=>window.guidanceEvents.push({...e.detail,at:performance.now()}));const A=window.Audio;window.Audio=class extends A{constructor(...a){super(...a);window.guidanceAudio.push(this);}};"
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=document-user-activation-required']);c=b.new_context();c.add_init_script(INIT);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('http://127.0.0.1:3000/dental');p.wait_for_timeout(4000) # Polling JS itself grants Chrome activation; allow native policy to reject first.
 try:p.wait_for_function('window.guidanceEvents.some(e=>e.event==="interaction-required")',timeout=10000)
 except Exception:
  state=p.evaluate('({events:window.guidanceEvents,audios:window.guidanceAudio?.map(a=>({id:a.dataset.guidanceId,paused:a.paused,src:a.src,error:a.error?.code})),body:document.body.innerText})');print(json.dumps({'state':state,'errors':errors},ensure_ascii=False),flush=True);raise
 assert not p.evaluate('window.guidanceEvents.some(e=>e.event==="ended")')
 p.get_by_label('Fotoğraflarımı yalnız bu cihazda geçici işlemeyi kabul ediyorum.').check()
 p.wait_for_function('window.guidanceEvents.some(e=>e.id==="dental-entry"&&e.event==="ended")',timeout=20000)
 first=p.evaluate('window.guidanceEvents.filter(e=>e.id==="dental-entry"&&e.event==="playing").length');assert first==1
 for _ in range(3):p.get_by_label('Fotoğraf doğal, rahat diş kapanışında çekildi.').check();p.get_by_label('Fotoğraf doğal, rahat diş kapanışında çekildi.').uncheck()
 assert p.evaluate('window.guidanceEvents.filter(e=>e.id==="dental-entry"&&e.event==="playing").length')==1
 p.get_by_role('button',name='Yönergeyi dinle',exact=True).click();p.wait_for_function('window.guidanceEvents.filter(e=>e.id==="dental-entry"&&e.event==="playing").length===2')
 p.get_by_role('button',name='Yönerge sesini kapat',exact=True).click();assert p.evaluate('window.guidanceAudio.every(a=>a.paused&&!a.getAttribute("src"))')
 p.get_by_role('button',name='Yönergeyi dinle',exact=True).click();p.wait_for_timeout(300);assert p.evaluate('window.guidanceEvents.filter(e=>e.id==="dental-entry"&&e.event==="playing").length')==2
 p.get_by_role('button',name='Yönerge sesini aç',exact=True).click();p.get_by_role('button',name='Yönergeyi dinle',exact=True).click();p.wait_for_function('window.guidanceEvents.filter(e=>e.id==="dental-entry"&&e.event==="playing").length===3')
 p.get_by_role('link',name='Kokpit',exact=True).click();expect(p).to_have_url('http://127.0.0.1:3000/');assert p.evaluate('window.guidanceAudio.filter(a=>a.dataset.guidanceId==="dental-entry").every(a=>a.paused&&!a.getAttribute("src"))')
 p.get_by_role('link',name='Sağlık Geçmişim',exact=True).click();expect(p).to_have_url('http://127.0.0.1:3000/profile');assert p.evaluate('window.guidanceAudio.filter(a=>a.dataset.guidanceId==="cockpit-entry").every(a=>a.paused&&!a.getAttribute("src"))')
 assert not errors,errors
 events=p.evaluate('window.guidanceEvents');manifest=json.loads(Path('apps/vehicle-app/public/audio/guidance/manifest.json').read_text('utf8'))
 for id,e in manifest['entries'].items():assert e['voice']==('tr-TR-EmelNeural' if id.startswith('mental-') else 'tr-TR-AhmetNeural') and e['rate']=='-10%' and e['pitch']=='-10Hz'
 (OUT/'proof.json').write_text(json.dumps({'status':'PASS','buildId':Path('apps/vehicle-app/.next/BUILD_ID').read_text().strip(),'actualHTMLAudio':True,'actualAutoplayBlockAndTrustedRetry':True,'endedRequired':True,'rerenderDedup':True,'manualRepeat':True,'muteCancel':True,'routeCancel':True,'manifestVersion':manifest['version'],'entries':len(manifest['entries']),'events':events,'humanAuditoryAcceptance':False,'pageErrors':errors},indent=2),'utf8');b.close()
print('PASS native autoplay block/retry, real ended, rerender dedup, repeat/mute/route cancellation')
