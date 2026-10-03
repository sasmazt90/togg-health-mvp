"""No OpenAI requests: prove native STT consumes only an explicit synthetic track.
Physical microphone permission is denied. No transcript is retained unless allowlisted.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('audit-results/live-provider');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=no-user-gesture-required'])
    context=browser.new_context()
    page=context.new_page()
    cdp=context.new_cdp_session(page)
    cdp.send('Browser.setPermission',{'permission':{'name':'microphone'},'setting':'denied','origin':'http://localhost:3000','browserContextId':cdp.send('Target.getTargetInfo')['targetInfo']['browserContextId']})
    page.route('http://localhost:3000/stt-source-preflight',lambda r:r.fulfill(content_type='text/html',body='<title>Synthetic source verification</title>'))
    page.route('http://localhost:3000/synthetic.wav',lambda r:r.fulfill(path='audit-fixtures/live-input-0.wav',content_type='audio/wav'))
    page.goto('http://localhost:3000/stt-source-preflight')
    proof=page.evaluate('''async()=>{
      const permission=await navigator.permissions.query({name:'microphone'});
      if(permission.state!=='denied')throw Error('Physical microphone is not denied');
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR)return {status:'UNSUPPORTED',physicalMicrophone:'denied'};
      const audio=new AudioContext();const buffer=await audio.decodeAudioData(await(await fetch('/synthetic.wav')).arrayBuffer());
      const source=audio.createBufferSource();source.buffer=buffer;const output=audio.createMediaStreamDestination();source.connect(output);
      const track=output.stream.getAudioTracks()[0];const recognition=new SR();recognition.lang='tr-TR';recognition.continuous=false;
      const events=[];let result=null;
      await new Promise(resolve=>{const timer=setTimeout(()=>{recognition.abort();resolve();},18000);
        recognition.onresult=e=>{const raw=e.results[e.resultIndex][0].transcript;const normalized=raw.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü ]/g,'').trim();
          const admitted=normalized==='bugün yeni bir kitap okudum';result=admitted?'ALLOWLISTED_SYNTHETIC':'UNEXPECTED_SOURCE_BLOCKED';events.push({type:'result',admitted});recognition.abort();};
        recognition.onerror=e=>events.push({type:'error',code:e.error});
        recognition.onend=()=>{clearTimeout(timer);resolve();};recognition.onstart=()=>{events.push({type:'start'});source.start();};
        try{recognition.start(track);}catch(e){events.push({type:'exception',name:e.name});clearTimeout(timer);resolve();}
      });track.stop();await audio.close();return {status:result==='ALLOWLISTED_SYNTHETIC'?'PASS':'PENDING',result,events,physicalMicrophone:permission.state,openAIRequests:0};
    }''')
    context.close();browser.close()
(OUT/'source-preflight.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')
print(json.dumps(proof))
