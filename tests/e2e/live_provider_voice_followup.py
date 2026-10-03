"""Bounded provider/TTS verification after explicit additional-run approval.
Windows native STT remains pending: physical-microphone-denied source preflight failed.
No physical microphone permission is granted; all input is explicit synthetic text.
"""
import argparse
import json
from pathlib import Path
import time
from playwright.sync_api import sync_playwright, expect
parser=argparse.ArgumentParser();parser.add_argument('--approved-additional-text-run',action='store_true');args=parser.parse_args()
if not args.approved_additional_text_run:raise SystemExit('Additional live run requires explicit approval; no provider request made')
OUT=Path('audit-results/live-provider');OUT.mkdir(parents=True,exist_ok=True)
TEXTS=['Bugün yeni bir kitap okudum.','Kitabın konusu arkadaşlık üzerineydi.','Arkadaşlarımla bu konuyu konuşmak iyi geldi.']
INIT=r'''(()=>{window.audioProof=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){if(!this.__observed){this.__observed=true;for(const type of ['playing','ended','error','pause','abort'])this.addEventListener(type,()=>window.audioProof.push({type,time:performance.now(),error:this.error?.code||null}));}return play.apply(this,args);};})();'''
proof={'voiceInputAcceptance':'PENDING','input':'explicit synthetic text','subjectiveListeningPerformed':False,'responses':[],'historyLengths':[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=no-user-gesture-required'])
    context=browser.new_context(viewport={'width':1600,'height':1000},locale='tr-TR');context.add_init_script(INIT)
    context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0})
    page=context.new_page();starts=[]
    def guard(route):
        data=route.request.post_data_json
        turn=len(starts)
        if turn>=3 or data['userMessage']!=TEXTS[turn]:route.abort();raise RuntimeError('Synthetic admission or request cap failed')
        assert all(m['role'] in ['user','assistant'] for m in data['history'])
        starts.append(page.evaluate('performance.now()'));proof['historyLengths'].append(len(data['history']));route.continue_()
    page.route('**/api/mental/converse',guard)
    def observe(response):
        if response.url.endswith('/mental/converse'):
            data=response.json();proof['responses'].append({'providerType':data['providerType'],'responseMs':round(page.evaluate('performance.now()')-starts[len(proof['responses'])],1)})
    page.on('response',observe)
    try:
        page.goto('http://localhost:3000/mental');page.get_by_role('checkbox',name='OpenAI bulut aktarımı onayı',exact=True).check()
        page.get_by_role('combobox',name='Yanıt sesi',exact=True).select_option('openai')
        page.get_by_role('button',name='İsterseniz yazabilirsiniz',exact=True).click()
        for turn,text in enumerate(TEXTS):
            box=page.get_by_role('textbox',name='Görüşme mesajı');expect(box).to_be_enabled();box.fill(text);page.get_by_role('button',name='Gönder',exact=True).click()
            expect(page.locator('[data-chat-author="AI"]')).to_have_count(turn+1,timeout=35000)
            assert proof['responses'][turn]['providerType']=='LIVE_OPENAI'
            page.wait_for_function('(count)=>window.audioProof.filter(e=>e.type==="ended").length===count',arg=turn+1,timeout=60000)
            assert page.evaluate('localStorage.getItem("togg_health_mental_history")') is None
        page.get_by_role('button',name='Görüşmeyi Bitir',exact=True).click();expect(page.locator('[data-conversation-phase]')).to_have_attribute('data-conversation-phase','completed',timeout=35000)
        assert proof['historyLengths']==[0,2,4]
        assert len(page.evaluate('JSON.parse(localStorage.getItem("togg_health_mental_history"))'))==1
        proof['audioEvents']=page.evaluate('window.audioProof');playing=[e for e in proof['audioEvents'] if e['type']=='playing']
        assert len(playing)==3 and not [e for e in proof['audioEvents'] if e['type']=='error']
        proof['playbackOnsetMs']=[round(e['time']-starts[i],1) for i,e in enumerate(playing)]
        proof['status']='PASS';page.screenshot(path=str(OUT/'synthetic-text-tts-completed.png'),full_page=True)
    finally:context.close();browser.close()
(OUT/'synthetic-text-tts-results.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(proof,ensure_ascii=False))
