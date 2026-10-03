"""Linux OS microphone and native Turkish STT/TTS, one start and three turns.
Generated non-personal PCM is played only into the isolated audit_mic sink.
Native results/events are observed, never replaced; CI remains keyless.
"""
import json,os,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('audit-results/native-three-turn');OUT.mkdir(parents=True,exist_ok=True)
TEXTS=['Bugün yeni bir kitap okudum.','Kitabın konusu arkadaşlık üzerineydi.','Arkadaşlarımla bu konuyu konuşmak iyi geldi.']
for i,text in enumerate(TEXTS):subprocess.run(['espeak-ng','-v','tr','-s','135','-w',str(OUT/f'input-{i}.wav'),text],check=True)
INIT=r'''(()=>{window.nativeProof={stt:[],tts:[]};const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const W=function(){const r=new SR();for(const type of ['start','audiostart','result','error','end'])r.addEventListener(type,e=>window.nativeProof.stt.push({type,time:performance.now(),error:e.error||null,transcript:e.results?.[e.resultIndex]?.[0]?.transcript||null}));return r;};window.SpeechRecognition=W;window.webkitSpeechRecognition=W;}const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{for(const type of ['start','end','error'])u.addEventListener(type,e=>window.nativeProof.tts.push({type,time:performance.now(),error:e.error||null}));return speak(u);};})();'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chromium',headless=False,args=['--enable-speech-dispatcher','--autoplay-policy=no-user-gesture-required'])
    context=browser.new_context(permissions=['microphone'],locale='tr-TR');context.add_init_script(INIT)
    context.request.post('http://localhost:8000/api/vehicle/speed',data={'speedKmH':0})
    page=context.new_page();requests=[];page.on('request',lambda r:requests.append(r.post_data_json) if r.url.endswith('/mental/converse') else None)
    try:
        page.goto('http://localhost:3000/mental');page.wait_for_function('speechSynthesis.getVoices().some(v=>v.lang.toLowerCase().startsWith("tr"))')
        page.get_by_role('checkbox',name='Ses aktarımı onayı',exact=True).check();page.get_by_role('button',name='Görüşmeyi Başlat',exact=True).click()
        for i in range(3):
            page.wait_for_function('(n)=>window.nativeProof.stt.filter(e=>e.type==="audiostart").length>=n',arg=i+1,timeout=20000)
            subprocess.run(['paplay','--device=audit_mic',str(OUT/f'input-{i}.wav')],check=True)
            expect(page.locator('[data-chat-author="USER"]')).to_have_count(i+1,timeout=25000)
            expect(page.locator('[data-chat-author="AI"]')).to_have_count(i+1,timeout=30000)
            page.wait_for_function('(n)=>window.nativeProof.tts.filter(e=>e.type==="end").length===n',arg=i+1,timeout=60000)
            assert page.evaluate('localStorage.getItem("togg_health_mental_history")') is None
        page.get_by_role('button',name='Görüşmeyi Bitir',exact=True).click();expect(page.locator('[data-conversation-phase]')).to_have_attribute('data-conversation-phase','completed')
        page.wait_for_timeout(1200);assert page.locator('[data-chat-author="USER"]').count()==page.locator('[data-chat-author="AI"]').count()==3
        assert [len(r['history']) for r in requests]==[0,2,4]
        assert len(page.evaluate('JSON.parse(localStorage.getItem("togg_health_mental_history"))'))==1
        proof=page.evaluate('window.nativeProof');assert len([e for e in proof['stt'] if e['type']=='result'])==3
        assert len([e for e in proof['tts'] if e['type']=='start'])==3
        (OUT/'results.json').write_text(json.dumps({'status':'PASS','events':proof,'provider':'LOCAL_DEMO','openAIKeyUsed':False},ensure_ascii=False,indent=2),encoding='utf-8')
        page.screenshot(path=str(OUT/'completed.png'),full_page=True)
    finally:context.close();browser.close()
print('PASS: one start, three real native STT/TTS turns, history 0/2/4, no duplicate or post-finish restart')
