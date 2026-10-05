'use client';
import { useEffect, useRef, useState } from 'react';
import { useVehicle } from '../../context/VehicleContext';
import { AccessibleDialog } from '../../components/AccessibleDialog';
import { InformationButton } from '../../components/InformationButton';
import { RecordHistory } from '../../components/RecordHistory';
import { LetterVisionResult } from '../../components/LetterVisionResult';
import { SkinInference } from '../../utils/skinInference';
import { SkinAnalyzer } from '../../utils/skinAnalyzer';
import { assessEyePixels } from '../../utils/visionEyePixels';
import { LETTER_PATHS, LETTER_PROTOCOL, LetterConditions, LetterResult, RenderedSymbolGeometry, ParsedAnswer, SpokenLetterSession, letterConditionFailure, parseLetterAnswer } from '../../utils/spokenVision';
import { appendHealthRecord } from '../../utils/healthRecords';
import { isCameraAllowed, isMicrophoneAllowed, isVisionSavingAllowed, isDemoMode } from '../../utils/attuneMode';
import { streamSpeech } from '../../utils/streamSpeech';
import { CameraPreview, CameraPreparation } from '../../components/CameraPreparation';
import { PreparationEvidence, visionPreparationCode, PREPARATION_TEXT } from '../../utils/visionPreparation';
import { SourceMotion } from '../../utils/cameraStability';
import { visionFrameQuality } from '../../utils/visionFrameQuality';


export default function SpokenLetterPage(){
 const {isParked,syncStatus}=useVehicle();const parked=useRef(isParked);parked.current=isParked;
 const [ready,setReady]=useState(false);
 const [mode,setMode]=useState<'idle'|'prepare'|'test'|'result'>('idle'),[revision,setRevision]=useState(0);
 const [status,setStatus]=useState(''),[error,setError]=useState(''),[dialog,setDialog]=useState<string|null>(null),[result,setResult]=useState<LetterResult|null>(null);
 const [evidence,setEvidence]=useState<PreparationEvidence|null>(null);
 const [muted,setMuted]=useState(false),[live,setLive]=useState(false),[voice,setVoice]=useState<'quiet'|'loading'|'playing'|'listening'|'failed'>('quiet');
 const symbol=useRef<SVGSVGElement>(null);
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const r=useRef({mounted:false,epoch:0,active:false,stream:null as MediaStream|null,engine:null as SkinInference|null,raf:0,timer:null as ReturnType<typeof setInterval>|null,baseline:null as number|null,stableSince:0,conditions:null as LetterConditions|null,evidence:null as PreparationEvidence|null,session:null as SpokenLetterSession|null,recognition:null as any,audio:null as HTMLAudioElement|null,controller:null as AbortController|null,streamCancel:null as (()=>void)|null,url:null as string|null,voiceWaiting:false,muted:false,audioFailed:false,modal:false,restart:null as ReturnType<typeof setTimeout>|null,paused:false,fault:null as string|null,faultSince:0,announcedFault:null as string|null,eyeAnnounced:null as string|null,partial:{} as ParsedAnswer,saving:false});
 const answerGate=useRef({ready:false,announced:'',clarifications:0});
 const actions=useRef({listen:()=>{},receive:(_text:string,_confidence:number)=>{},speak:async(_code:string)=>{},stop:()=>{},inspect:()=>{}});
 function timing(stage:string){window.dispatchEvent(new CustomEvent('attune-vision-speech-timing',{detail:{stage,atMs:performance.now(),clock:'browser-performance'}}));}
 function current(epoch:number){return r.current.mounted&&r.current.active&&r.current.epoch===epoch&&parked.current&&isCameraAllowed()&&isMicrophoneAllowed();}
 function abortRecognition(){const old=r.current.recognition;r.current.recognition=null;if(old){try{old.abort();}catch{}}}
 function stopVoice(){const a=r.current;abortRecognition();if(a.restart)clearTimeout(a.restart);a.restart=null;a.controller?.abort();a.controller=null;a.streamCancel?.();a.streamCancel=null;if(a.audio){a.audio.onplaying=a.audio.onended=a.audio.onerror=null;a.audio.pause();a.audio.removeAttribute('src');a.audio.load();a.audio=null;}if(a.url)URL.revokeObjectURL(a.url);a.url=null;a.voiceWaiting=false;}
 function stop(){const a=r.current;a.epoch++;a.active=false;stopVoice();cancelAnimationFrame(a.raf);if(a.timer)clearInterval(a.timer);a.timer=null;a.stream?.getTracks().forEach(t=>t.stop());a.stream=null;a.engine?.close();a.engine=null;a.conditions=null;a.evidence=null;a.baseline=null;a.stableSince=0;a.session=null;if(video.current)video.current.srcObject=null;if(a.mounted){setLive(false);setVoice('quiet');}}
 function listen(){
  const a=r.current,epoch=a.epoch;if(!current(epoch)||a.recognition||a.voiceWaiting||a.muted||a.audioFailed||a.paused||a.modal||!a.session?.presentationId||!answerGate.current.ready||letterConditionFailure(a.conditions,a.session.eye,performance.now()))return;
  const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!SR){setError('Bu tarayıcı Türkçe konuşma tanımayı desteklemiyor. Görev başlatılamadı.');stop();setMode('idle');return;}
  const recognition=new SR();a.recognition=recognition;recognition.lang='tr-TR';recognition.continuous=false;recognition.interimResults=false;
  const valid=()=>current(epoch)&&a.recognition===recognition&&!a.voiceWaiting;let accepted=false;
  recognition.onstart=()=>{if(valid()){setVoice('listening');timing('listening');}else abortRecognition();};
  recognition.onresult=(event:any)=>{if(!valid()||accepted)return;const item=event.results[event.resultIndex||0];if(!item?.isFinal)return;accepted=true;const answer=item[0];abortRecognition();actions.current.receive(answer.transcript,answer.confidence);};
  recognition.onerror=(event:any)=>{if(!valid())return;if(event.error==='no-speech')return;abortRecognition();setVoice('failed');setError('Konuşma tanıma başarısız. Mikrofon ve bağlantıyı kontrol edin; yanıt puanlanmadı.');};
  recognition.onend=()=>{if(!valid())return;a.recognition=null;if(current(epoch)&&!a.voiceWaiting)a.restart=setTimeout(()=>{if(current(epoch))actions.current.listen();},350);};
  try{recognition.start();}catch{abortRecognition();setVoice('failed');setError('Mikrofon başlatılamadı. Yanıt puanlanmadı.');}
 }
 async function speak(code:string){
  const a=r.current,epoch=a.epoch;if(!current(epoch)||a.muted)return;stopVoice();a.audioFailed=false;a.voiceWaiting=true;setVoice('loading');setError('');
  const controller=new AbortController();a.controller=controller;const valid=()=>current(epoch)&&a.controller===controller;
  const deadline=setTimeout(()=>controller.abort(),25000);
  const fail=()=>{if(!valid())return;stopVoice();a.audioFailed=true;setVoice('failed');setError('Ahmet Türkçe seslendirme kullanılamıyor. Görev sesli yönerge olmadan ilerletilmedi.');};
  try{
   timing('request');const response=await fetch('http://localhost:8000/api/vision/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:code,cloudConsent:true}),signal:controller.signal});
   if(!valid()){await response.body?.cancel();return;}if(!response.ok)throw Error('Voice unavailable');
   const audio=new Audio();a.audio=audio;audio.onplaying=()=>{if(valid()){setVoice('playing');timing('playing');}};
   audio.onended=()=>{if(!valid())return;timing('ended');stopVoice();setVoice('quiet');if(a.session?.presentationId&&answerGate.current.announced===a.session.presentationId){answerGate.current.ready=true;a.session.beginResponse();}actions.current.inspect();a.restart=setTimeout(()=>{if(current(epoch))actions.current.listen();},350);};audio.onerror=fail;
   const stream=streamSpeech(audio,response,controller.signal,valid,stage=>timing(stage));a.url=stream.url;a.streamCancel=stream.cancel;await stream.finished;
  }catch{fail();}finally{clearTimeout(deadline);}
 }
 function inspectConditions(){
  const a=r.current;if(!a.active||!a.session)return;
  const failure=letterConditionFailure(a.conditions,a.eyeAnnounced?a.session.eye:null,performance.now());
  const preparation=visionPreparationCode(a.conditions,a.evidence,performance.now());
  const code=failure==='eye'||failure==='uncertain'?failure:preparation;
  const guidance=PREPARATION_TEXT[code];
  if(failure){
   answerGate.current.ready=false;abortRecognition();if(!a.voiceWaiting)setVoice('quiet');
   if(a.fault!==code){a.fault=code;a.faultSince=performance.now();}
   setStatus(guidance);
   // Immediate scoring gate; delayed warning avoids treating a brief blink as
   // a persistent condition violation. Acknowledgement never changes evidence.
   if(a.session.presentationId&&performance.now()-a.faultSince>=800&&a.announcedFault!==code){a.session.invalidate(failure,a.conditions,performance.now(),measureSymbol());setRevision(n=>n+1);a.partial={};a.announcedFault=code;a.modal=true;setDialog(guidance);void actions.current.speak(code);}
   return;
  }
  a.fault=null;a.faultSince=0;a.announcedFault=null;
  if(a.paused||a.muted){answerGate.current.ready=false;abortRecognition();setVoice('quiet');setStatus('Duraklatıldı');return;}
  if(a.eyeAnnounced!==a.session.eye){a.eyeAnnounced=a.session.eye;setStatus(a.session.eye==='RIGHT'?'Konum hazır · sağ göz açık, sol göz kapalı':'Konum hazır · sol göz açık, sağ göz kapalı');void actions.current.speak(a.session.eye==='RIGHT'?'right':'left');return;}
  if(!a.session.presentationId&&!a.voiceWaiting&&!a.audioFailed&&!a.modal){answerGate.current.ready=false;answerGate.current.clarifications=0;a.session.present();setMode('test');setRevision(n=>n+1);setStatus('Harfi ve yönünü söyleyin');}
  else if(a.session.presentationId&&!a.voiceWaiting&&!a.audioFailed&&!a.modal){if(!answerGate.current.ready){answerGate.current.announced='';setRevision(n=>n+1);}else actions.current.listen();}
 }
 async function complete(cancelled=false){
  const a=r.current,s=a.session;if(!s)return;const epoch=a.epoch;
  const value:LetterResult={id:s.id,date:new Date().toISOString(),protocolVersion:LETTER_PROTOCOL,trials:s.ledger.map(t=>structuredClone(t)),deviceContext:{width:screen.width,height:screen.height,dpr:devicePixelRatio},profileVerification:'unverified',distanceMethod:'relative-face-scale-only',physicalScale:null,completed:!cancelled&&s.completed};
  if(cancelled){stop();setMode('idle');setDialog('Görev bitirildi. Tamamlanmamış sonuç kaydedilmedi.');return;}
  a.paused=true;stopVoice();setResult(value);setMode('result');let notice='Görev tamamlandı. Saklama tercihi kapalı; geçmişe kayıt eklenmedi.';
  if(isVisionSavingAllowed()&&!isDemoMode()&&!a.saving){a.saving=true;try{await appendHealthRecord('vision',value,{},()=>current(epoch)&&isVisionSavingAllowed());notice='Görev tamamlandı. Sonuç bu cihazdaki geçmişe kaydedildi.';}catch{notice='Görev tamamlandı ancak sonuç kaydedilemedi. Başarılı kayıt eklenmedi.';}finally{a.saving=false;}}
  if(a.epoch!==epoch)return;stop();setDialog(notice);
 }
 function measureSymbol():RenderedSymbolGeometry|null {
  const svg=symbol.current,path=svg?.querySelector('path');if(!svg||!path)return null;
  const box=svg.getBoundingClientRect(),paint=path.getBoundingClientRect();
  return {viewportWidthCssPx:box.width,viewportHeightCssPx:box.height,pathWidthCssPx:paint.width,pathHeightCssPx:paint.height,strokeWidthCssPx:Number.parseFloat(getComputedStyle(path).strokeWidth)*box.width/100,measuredAt:performance.now(),method:'dom-svg-css-pixels'};
 }
 function restartListening(){const a=r.current,epoch=a.epoch;if(a.restart)clearTimeout(a.restart);a.restart=setTimeout(()=>{if(current(epoch)&&!a.voiceWaiting)actions.current.listen();},350);}
 function receive(text:string,confidence:number){
  const a=r.current,s=a.session;if(!s||!current(a.epoch)||a.voiceWaiting)return;
  const parsed=parseLetterAnswer(text);
  if(parsed.command==='finish'){void complete(true);return;}
  if(parsed.command==='pause'){a.paused=true;setStatus('Duraklatıldı');void speak('paused');return;}
  if(parsed.command==='resume'){a.paused=false;inspectConditions();restartListening();return;}
  if(parsed.command==='repeat'){void speak('repeat');return;}
  if(a.paused||a.modal||a.audioFailed||!answerGate.current.ready||!s.presentationId||letterConditionFailure(a.conditions,s.eye,performance.now())){restartListening();return;}
  if((confidence>0&&confidence<.5)||parsed.clarify){answerGate.current.clarifications++;if(answerGate.current.clarifications>2){s.invalidate('ASR_RETRY_LIMIT',a.conditions,performance.now(),measureSymbol());answerGate.current.ready=false;a.paused=true;setRevision(n=>n+1);setDialog('Yanıt iki açıklama turunda anlaşılamadı. Deneme puanlanmadı. Devam et ile aynı hedefi yeniden deneyebilir veya Bitir ile çıkabilirsiniz.');a.modal=true;setVoice('quiet');return;}}
  if(confidence>0&&confidence<.5){s.unscored('ASR_LOW_CONFIDENCE',a.conditions,performance.now(),measureSymbol(),parsed);void speak('letter');return;}
  const merged:ParsedAnswer={...parsed,letter:parsed.letter||a.partial.letter,orientation:parsed.orientation||a.partial.orientation};
  if(parsed.clarify==='reverse'){s.unscored('ASR_UNCLEAR',a.conditions,performance.now(),measureSymbol(),parsed);a.partial={letter:merged.letter};void speak('reverse');return;}
  if(!parsed.command&&(!merged.letter||!merged.orientation)){s.unscored('ASR_UNCLEAR',a.conditions,performance.now(),measureSymbol(),parsed);a.partial=merged;void speak(!merged.letter?'letter':'orientation');return;}
  delete merged.clarify;
  const geometry=measureSymbol();
  if(s.respond(merged,a.conditions,performance.now(),s.presentationId,geometry)){a.partial={};setRevision(n=>n+1);if(s.completed)void complete();else {inspectConditions();restartListening();}}
 }
 actions.current={listen,receive,speak,stop,inspect:inspectConditions};
 useEffect(()=>{const a=r.current,s=a.session;if(mode!=='test'||!s?.presentationId||a.paused||a.modal||a.voiceWaiting||answerGate.current.ready||answerGate.current.announced===s.presentationId)return;const geometry=measureSymbol();if(!geometry)return;answerGate.current.announced=s.presentationId;timing('letter-rendered');void actions.current.speak('repeat');},[mode,revision]);
 useEffect(()=>{
  const a=r.current;a.mounted=true;setReady(true);
  const revoke=()=>{if(!isCameraAllowed()||!isMicrophoneAllowed()){actions.current.stop();setMode('idle');setError('Kamera veya mikrofon tercihi kapalı. Görev durduruldu.');}};
  window.addEventListener('storage',revoke);window.addEventListener('attune-privacy',revoke);
  return()=>{a.mounted=false;actions.current.stop();window.removeEventListener('storage',revoke);window.removeEventListener('attune-privacy',revoke);};
 },[]);
 useEffect(()=>{if(!isParked){actions.current.stop();setMode('idle');setDialog(null);}},[isParked]);
 useEffect(()=>{if(video.current&&r.current.stream){video.current.srcObject=r.current.stream;void video.current.play().catch(()=>{});}},[mode,live]);
 async function start(){
  if(!parked.current)return;stop();setDialog(null);setResult(null);setError('');
  if(!isCameraAllowed()||!isMicrophoneAllowed()){setError('Kamera ve mikrofon izinlerini Gizlilik ekranından açın.');return;}
  const a=r.current;a.active=true;a.muted=false;setMuted(false);a.paused=false;a.modal=false;a.audioFailed=false;a.eyeAnnounced=null;a.announcedFault=null;a.partial={};a.session=new SpokenLetterSession();const epoch=a.epoch;setMode('prepare');setStatus('Kamera ve başlangıç konumu kontrol ediliyor');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
   if(!current(epoch)){stream.getTracks().forEach(t=>t.stop());return;}a.stream=stream;setLive(true);
   const engine=new SkinInference();a.engine=engine;await engine.initialize();if(!current(epoch))return;
   if(!video.current)throw Error('Preview');video.current.srcObject=stream;await video.current.play();void speak('prepare');
   let last=-1;const analysis=document.createElement('canvas'),motion=new SourceMotion();
   const loop=async()=>{
    if(!current(epoch))return;const v=video.current,c=canvas.current;
    if(!v||!c||stream.getVideoTracks().some(t=>t.readyState!=='live'))throw Error('Camera ended');
    if(v.readyState>=2&&v.currentTime!==last){last=v.currentTime;c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas');ctx.drawImage(v,0,0,c.width,c.height);const observedAt=performance.now();
     const ratio=Math.min(1,640/c.width);analysis.width=Math.round(c.width*ratio);analysis.height=Math.round(c.height*ratio);const ac=analysis.getContext('2d',{willReadFrequently:true})!;ac.drawImage(c,0,0,analysis.width,analysis.height);
     const alignment=await engine.assessAlignment(analysis);if(!current(epoch))return;const quality=visionFrameQuality(ac,analysis.width,analysis.height,alignment,a.eyeAnnounced?a.session?.eye||null:null);
     const priorQuality=SkinAnalyzer.checkQuality(ac,analysis.width,analysis.height,alignment.faceDetected,alignment.box);
     c.dataset.visionQualityComparison=JSON.stringify({frameTime:last,oldFaceMeanGradient:priorQuality.blurScore,visibleEyeGradient:quality.blurScore,oldStatus:priorQuality.status,newStatus:quality.status});
     if(alignment.box){const b=alignment.box;alignment.box={x:b.x/ratio,y:b.y/ratio,width:b.width/ratio,height:b.height/ratio};}
     const nose=alignment.landmarks?.[1],motionStable=!nose||!motion.update(nose.x,nose.y,alignment.scaleRatio,observedAt);
     const telemetry={alignment,quality,width:c.width,height:c.height};a.evidence=telemetry;setEvidence(telemetry);
     const positioned=motionStable&&alignment.isMediaPipeActive&&alignment.faceCount===1&&alignment.isAligned&&Math.abs(alignment.roll)<=.15&&!!alignment.box&&alignment.box.x>=0&&alignment.box.y>=0&&alignment.box.x+alignment.box.width<=c.width&&alignment.box.y+alignment.box.height<=c.height;
     if(positioned){if(!a.stableSince)a.stableSince=observedAt;if(!a.baseline&&quality.isValid&&observedAt-a.stableSince>=1000)a.baseline=alignment.scaleRatio;}else a.stableSince=0;
     a.conditions={observedAt,cameraLive:v.readyState>=2&&!v.paused&&!v.ended,modelActive:alignment.isMediaPipeActive,faceCount:alignment.faceCount||0,qualityValid:quality.isValid,motionStable,positionValid:positioned&&observedAt-a.stableSince>=1000,relativeScaleChange:a.baseline?(alignment.scaleRatio-a.baseline)/a.baseline:null,...assessEyePixels(ctx,c.width,c.height,alignment)};
     c.dataset.visionQuality=JSON.stringify(quality);c.dataset.visionMotion=String(!motionStable);c.dataset.visionScale=String(alignment.scaleRatio);c.dataset.visionFrameTime=String(last);c.dataset.visionAnalysisSize=`${analysis.width}x${analysis.height}`;
     c.dataset.visionModelActive=String(a.conditions.modelActive);c.dataset.visionFaceCount=String(a.conditions.faceCount);c.dataset.visionRightEye=a.conditions.right.state;c.dataset.visionLeftEye=a.conditions.left.state;c.dataset.visionObservedAt=String(observedAt);
     inspectConditions();
    }
    if(current(epoch))a.raf=requestAnimationFrame(()=>void loop().catch(()=>{if(current(epoch)){stop();setMode('idle');setError('Kamera değerlendirmesi kesildi. Görev kaydedilmedi.');}}));
   };void loop().catch(()=>{if(current(epoch)){stop();setMode('idle');setError('Kamera değerlendirmesi başlatılamadı.');}});
   a.timer=setInterval(inspectConditions,200);
  }catch{if(current(epoch)){stop();setMode('idle');setError('Kamera veya yüz modeli başlatılamadı. İzin ve bağlantıyı kontrol edin.');}}
 }
 const session=r.current.session;const rotation={upright:0,right:90,down:180,left:270,mirror:0};
 return <div className="space-y-6" data-letter-task-revision={revision}>
  <div className="flex justify-between gap-3"><h1 className="text-2xl font-bold">Sesli harf tanıma</h1><InformationButton title="Görme görevi ve hizmet bilgisi"><p>Harfi ve yönünü sesle söyleyin. Bu görev klinik görme keskinliği, göz numarası veya reçete ölçmez. Kamera görüntüsü yalnız cihaz belleğinde değerlendirilir. Sabit yönergeler Microsoft Edge tr-TR-AhmetNeural sesiyle -10% hız ve yaklaşık düşük pitch (-10Hz) ile Türkçe okunur; Clipchamp Low ile doğrulanmış eşleşme değildir. Yönerge metni çevrimiçi Edge hizmetine gönderilir; kullanıcı yanıtı bu ses hizmetine gönderilmez. Edge tüketici erişimi Azure ücretsiz kotası değildir.</p><p>Başlat, tarayıcı konuşma tanıma hizmetinin mikrofon kullanımını başlatır; bu hizmet sesinizi buluta aktarabilir. Ham görüntü veya ses uygulamada saklanmaz. Sonuç yalnız Gizlilik ekranındaki saklama izniyle kaydedilir.</p></InformationButton></div>
  {!isParked?<p>{syncStatus==='synced'?'Sürüş sırasında görev kapalıdır.':'Araç durumu doğrulanamadı; görev kapalıdır.'}</p>:<>
   {mode==='idle'&&<section className="rounded-2xl border border-white/10 bg-cockpit-surface p-6 space-y-4"><h2 className="text-xl font-bold">Harfi ve yönünü söyleyin</h2><p>Kamera koşulları otomatik kontrol edilir. Sağ ve sol gözünüz için kısa bir görev tamamlayacaksınız.</p><button onClick={()=>void start()} disabled={!ready} className="min-h-11 rounded-xl bg-togg-turquoise text-togg-darkBlue px-6 font-bold">Başlat</button></section>}
   {(mode==='prepare'||mode==='test')&&<section className="grid lg:grid-cols-2 gap-5 rounded-2xl bg-cockpit-surface border border-white/10 p-5">
    <div className="space-y-3"><CameraPreview videoRef={video} landmarks={evidence?.alignment.landmarks} vision/><CameraPreparation alignment={evidence?.alignment} quality={evidence?.quality} position={status} fresh={!!r.current.conditions && performance.now()-r.current.conditions.observedAt<=750}/><p role="status" data-letter-condition={r.current.fault||'valid'}>{status}</p><p className="text-sm text-togg-turquoise" data-vision-voice={voice}>{voice==='playing'?'Yönerge okunuyor':voice==='loading'?'Yönerge hazırlanıyor':voice==='listening'?'Dinliyor':''}</p></div>
    <div className="flex flex-col items-center justify-center gap-5 min-h-64">
     {mode==='test'&&session?.presentationId&&<svg ref={symbol} data-letter-optotype role="img" aria-label="Yanıtlanacak harf" viewBox="0 0 100 100" style={{width:session.sizePx,height:session.sizePx,maxWidth:'100%'}}><g transform={`translate(50 50) rotate(${rotation[session.orientation]}) scale(${session.orientation==='mirror'?-1:1} 1) translate(-50 -50)`}><path d={LETTER_PATHS[session.letter]} stroke="white" strokeWidth="10" strokeLinecap="square" strokeLinejoin="miter" fill="none"/></g></svg>}
     <p>{session?`${session.eye==='RIGHT'?'Sağ':'Sol'} göz · ${session.trials.length%12+1}/12`:''}</p><p className="text-sm text-slate-300">“Tekrar”, “göremiyorum”, “duraklat”, “devam et” veya “bitir” diyebilirsiniz.</p>
     <div className="flex flex-wrap gap-3"><button onClick={()=>void start()} className="min-h-11 rounded-xl border border-white/20 px-4">Yeni konumla yeniden başlat</button><button onClick={()=>{r.current.paused=!r.current.paused;setRevision(n=>n+1);inspectConditions();}} className="min-h-11 rounded-xl border border-white/20 px-4">{r.current.paused?'Devam et':'Duraklat'}</button><button onClick={()=>{const a=r.current;a.muted=!a.muted;setMuted(a.muted);if(a.muted){stopVoice();setVoice('quiet');setStatus('Ses kapalı; görev duraklatıldı');}else {a.eyeAnnounced=null;inspectConditions();}}} className="min-h-11 rounded-xl border border-white/20 px-4">{muted?'Sesi aç':'Sesi kapat'}</button><button onClick={()=>void complete(true)} className="min-h-11 rounded-xl border border-white/20 px-4">Bitir</button></div>
    </div>
   </section>}
   {error&&<p role="alert" className="text-amber-200">{error}</p>}
   {mode==='result'&&result&&<section className="rounded-2xl border border-white/10 bg-cockpit-surface p-6 space-y-5"><LetterVisionResult result={result}/><button onClick={()=>{setResult(null);setMode('idle');}} className="min-h-11 rounded-xl border border-white/20 px-4">Yeni görev</button></section>}
   <RecordHistory category="vision" parked={isParked}/>
  </>}
  <canvas ref={canvas} hidden/>
  {dialog&&<AccessibleDialog title="Görme bildirimi" onClose={()=>{r.current.modal=false;setDialog(null);}} className="w-full max-w-md rounded-2xl border border-white/20 bg-cockpit-surface p-6 space-y-4"><h2 className="font-bold">Görme bildirimi</h2><p>{dialog}</p><button onClick={()=>{r.current.modal=false;setDialog(null);}} className="min-h-11 rounded-xl bg-togg-turquoise text-togg-darkBlue px-6">Tamam</button></AccessibleDialog>}
 </div>;
}
