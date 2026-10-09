"""Actual production tone and silent catch intervals; no human response/threshold claim."""
import json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('audit-results/current-health-20261009/hearing-tone');OUT.mkdir(parents=True,exist_ok=True)
INIT='''const originalRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=function(a){if(a instanceof Uint32Array&&a.length===1){a[0]=8102026;return a;}return originalRandom(a);};window.guidanceEvents=[];window.addEventListener('attune-guidance-event',e=>window.guidanceEvents.push({...e.detail,at:performance.now()}));window.playedPCM=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){const buffer=this.buffer;if(buffer){const channels=[];for(let i=0;i<buffer.numberOfChannels;i++){const samples=buffer.getChannelData(i);let energy=0,peak=0;for(const x of samples){energy+=x*x;peak=Math.max(peak,Math.abs(x));}channels.push({rms:Math.sqrt(energy/samples.length),peak,first:samples[0],last:samples.at(-1)});}const row={sampleRate:buffer.sampleRate,channels,ended:false,at:performance.now()};window.playedPCM.push(row);this.addEventListener('ended',()=>row.ended=true);}return start.apply(this,args);};'''
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=no-user-gesture-required']);c=b.new_context();c.add_init_script(INIT);p=c.new_page()
 p.goto('http://127.0.0.1:3000/hearing');p.get_by_label('Yerel ses testi işlemini başlatmayı kabul ediyorum.').check();expect(p.get_by_role('button',name='Ses hazırlığını başlat')).to_be_enabled();p.get_by_role('button',name='Ses hazırlığını başlat').click()
 p.get_by_label('Stereo kulaklık kullanıyorum; mono/speaker kullanmıyorum.').check()
 for ear in ('sol','sağ'):
  p.get_by_role('button',name=ear.capitalize()+' kanalı dinle').click();expect(p.get_by_label('Yalnız '+ear+' kulağımda duydum.')).to_be_enabled(timeout=10000);p.get_by_label('Yalnız '+ear+' kulağımda duydum.').check()
 p.get_by_role('button',name='Saf ses testi',exact=True).click();expect(p.get_by_role('button',name='Duydum · Space',exact=True)).to_be_visible(timeout=20000)
 # Read the actual config, keep the product RNG/staircase and native timers unchanged.
 config=json.loads(subprocess.check_output(['node','-e',"const fs=require('fs'),ts=require('typescript');const e={};new Function('exports',ts.transpileModule(fs.readFileSync('apps/vehicle-app/src/utils/hearingProtocol.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(e);process.stdout.write(JSON.stringify(e.HEARING_CONFIG));"],text=True))
 seed=8102026
 def rand():
  global seed
  seed=(1664525*seed+1013904223)&0xffffffff;return seed/2**32
 timeline=[];end=0
 for i in range(6):
  gap=config['gapMin']+rand()*(config['gapMax']-config['gapMin']);silent=rand()<config['catchProbability'];duration=config['durationMin']+rand()*(config['durationMax']-config['durationMin']);at=end+gap;end=at+duration+config['responseSeconds'];timeline.append({'index':i,'atSeconds':at,'silent':silent,'duration':duration})
 assert sum(v['silent'] for v in timeline)==2
 ended=p.evaluate('window.guidanceEvents.find(e=>e.id==="hearing-tone"&&e.event==="ended").at')
 elapsed=p.evaluate('performance.now()')-ended;p.wait_for_timeout(max(0,int(end*1000+250-elapsed)))
 waves=p.evaluate('window.playedPCM');assert len(waves)==6 # Two channel checks + four tones; two catch trials emit no PCM.
 audible=[v for v in timeline if not v['silent']]
 for i,(wave,expected) in enumerate(zip(waves[2:],audible,strict=True)):
  assert abs((wave['at']-ended)/1000-expected['atSeconds'])<.8
  assert wave['ended'] and wave['channels'][1]['rms']==0
  assert abs(wave['channels'][0]['peak']-10**((-60+i*5)/20))<1e-7
 events=p.evaluate('window.guidanceEvents');assert not [e for e in events if e['event']=='playing' and ended<e['at']<p.evaluate('performance.now()')]
 p.get_by_role('button',name='Yönergeyi tekrar dinle',exact=True).click();expect(p.get_by_role('button',name='Ses hazırlığını başlat')).to_be_visible();p.wait_for_function('window.guidanceEvents.filter(e=>e.id==="hearing-tone"&&e.event==="ended").length===2',timeout=20000)
 assert p.evaluate('window.playedPCM.length')==6 and p.evaluate('localStorage.getItem("attune_hearing_latest_v1")') is None
 proof={'status':'PASS','buildId':Path('apps/vehicle-app/.next/BUILD_ID').read_text().strip(),'actualPCM':waves,'actualNativeTimers':True,'seed':8102026,'expectedNativeTimeline':timeline,'silentCatchIntervals':2,'guidanceEndedBeforeTone':True,'noScoredTTSOverlap':True,'repeatPausesNoResult':True,'humanAcceptance':False,'events':p.evaluate('window.guidanceEvents')};(OUT/'proof.json').write_text(json.dumps(proof,indent=2),'utf8');b.close()
print('PASS native tones and two silent catch intervals, ended/exclusion/repeat pause')
