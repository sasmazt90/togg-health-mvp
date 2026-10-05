'use client';
import { useEffect, useRef, useState } from 'react';
import { useVehicle } from '../../context/VehicleContext';
import { AccessibleDialog } from '../../components/AccessibleDialog';
import { InformationButton } from '../../components/InformationButton';
import { RecordHistory } from '../../components/RecordHistory';
import { LetterVisionResult } from '../../components/LetterVisionResult';
import { LetterStimulus } from '../../components/LetterStimulus';
import { CameraPreview } from '../../components/CameraPreparation';
import { VisionInference } from '../../utils/visionInference';
import type { VisionEvidence } from '../../utils/visionTracking';
import { VisionFlow, eyeInstruction } from '../../utils/visionFlow';
import { LETTER_PATHS, LETTER_PROTOCOL, LetterResult, RenderedSymbolGeometry, ParsedAnswer, SpokenLetterSession, letterConditionFailure, parseLetterAnswer } from '../../utils/spokenVision';
import { appendHealthRecord } from '../../utils/healthRecords';
import { isCameraAllowed, isMicrophoneAllowed, isVisionSavingAllowed, isDemoMode } from '../../utils/attuneMode';
import { streamSpeech } from '../../utils/streamSpeech';
const TEXT:Record<string,string>={face:'Yüzünüzü kamera görüntüsünde tutun.',framing:'Yüzünüzün tamamını kamera görüntüsünde tutun.',pose:'Başınızı biraz ekrana çevirin; harf alanına bakabilirsiniz.',light:'Açık gözünüzün bulunduğu tarafı aydınlatın.',bright:'Yüzünüzdeki parlamayı azaltın.',blur:'Açık göz çevresinde netlik yetersiz. Kamera netliğini kontrol edin.',preparing:'İki göz açık: başlangıç konumu öğreniliyor.',recede:'Biraz geri çekilin.',approach:'Biraz yaklaşın.','distance-unknown':'Mesafeyi güvenilir izleyemiyorum; yüzünüzü görünür tutun.',camera:'Kamera görüntüsü güncel değil.',eye:'Test edilen göz açık; diğer göz kapalı veya örtülü olmalı.',uncertain:'Göz örtüsünü veya göz açıklığını kontrol edemiyorum.','both-eyes':'İki göz de kapalı veya örtülü. Test edilen gözünüzü açın.','test-eye':'Test edilen gözünüzü açın; diğer gözü kapatın veya örtün.','cover-other':'Diğer gözünüzü kapatın veya örtün.'};
const EYE_TEXT={open:'açık',closed:'kapalı',covered:'örtülü',uncertain:'değerlendirilemiyor'};
export default function SpokenLetterPage(){
 const {isParked,syncStatus}=useVehicle(),parked=useRef(isParked);parked.current=isParked;
 const [,redraw]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[dialog,setDialog]=useState<string|null>(null),[result,setResult]=useState<LetterResult|null>(null);
 const [evidence,setEvidence]=useState<VisionEvidence|null>(null),[voice,setVoice]=useState<'quiet'|'loading'|'playing'|'listening'|'failed'>('quiet');
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),symbol=useRef<SVGSVGElement>(null),flow=useRef(new VisionFlow());
 const r=useRef({mounted:false,epoch:0,active:false,stream:null as MediaStream|null,engine:null as VisionInference|null,raf:0,timer:null as ReturnType<typeof setInterval>|null,session:null as SpokenLetterSession|null,evidence:null as VisionEvidence|null,recognition:null as any,audio:null as HTMLAudioElement|null,controller:null as AbortController|null,cancelSpeech:null as (()=>void)|null,url:null as string|null,restart:null as ReturnType<typeof setTimeout>|null,voiceGeneration:0,voiceTimeout:null as ReturnType<typeof setTimeout>|null,muted:false,modal:false,fault:'',faultSince:0,announcedFault:'',partial:{} as ParsedAnswer,clarifications:0,saving:false,previewPoints:undefined as VisionEvidence['alignment']['landmarks']});
 const actions=useRef({inspect:()=>{},receive:(_text:string,_confidence:number,_id:string)=>{},listen:()=>{},stop:()=>{},measure:()=>null as RenderedSymbolGeometry|null,prompt:(_code?:string)=>{},current:(_epoch:number):boolean=>false,renderError:()=>{},timing:(_name:string)=>{}});
 const refresh=()=>redraw(v=>v+1);
 function stage(next:Parameters<VisionFlow['transition']>[0],reason=''){flow.current.transition(next,reason);refresh();}
 function current(epoch:number){return r.current.mounted&&r.current.active&&r.current.epoch===epoch&&parked.current&&isCameraAllowed()&&isMicrophoneAllowed();}
 function timing(name:string){window.dispatchEvent(new CustomEvent('attune-vision-speech-timing',{detail:{stage:name,atMs:performance.now(),clock:'browser-performance',presentationId:flow.current.presentationId}}));}
 function abortRecognition(){const a=r.current,old=a.recognition;a.recognition=null;if(a.restart)clearTimeout(a.restart);a.restart=null;try{old?.abort();}catch{}}
 function stopVoice(){const a=r.current;a.voiceGeneration++;if(a.voiceTimeout)clearTimeout(a.voiceTimeout);a.voiceTimeout=null;abortRecognition();a.controller?.abort();a.controller=null;a.cancelSpeech?.();a.cancelSpeech=null;if(a.audio){a.audio.onplaying=a.audio.onended=a.audio.onerror=null;a.audio.pause();a.audio.removeAttribute('src');a.audio.load();a.audio=null;}if(a.url)URL.revokeObjectURL(a.url);a.url=null;if(a.mounted)setVoice('quiet');}
 function stop(){const a=r.current;a.epoch++;a.active=false;stopVoice();cancelAnimationFrame(a.raf);if(a.timer)clearInterval(a.timer);a.timer=null;a.stream?.getTracks().forEach(t=>t.stop());a.stream=null;a.engine?.close();a.engine=null;a.session=null;a.evidence=null;a.previewPoints=undefined;if(canvas.current)delete canvas.current.dataset.visionEvidence;a.modal=false;a.partial={};if(video.current)video.current.srcObject=null;flow.current.reset();if(a.mounted){setEvidence(null);refresh();}}
 function measureSymbol():RenderedSymbolGeometry|null{
  const svg=symbol.current,path=svg?.querySelector('path');if(!svg||!path||!flow.current.letterVisible||document.hidden)return null;
  const b=svg.getBoundingClientRect(),p=path.getBoundingClientRect(),style=getComputedStyle(svg),area=svg.parentElement!.getBoundingClientRect(),stroke=Number.parseFloat(getComputedStyle(path).strokeWidth)*b.width/svg.viewBox.baseVal.width;
  if(style.visibility!=='visible'||Number(style.opacity)===0||b.width<=0||b.height<=0||p.width<=0||p.height<=0||b.left<area.left||b.right>area.right+.5||b.top<area.top||b.bottom>area.bottom+.5||b.left<0||b.top<0||b.right>innerWidth+1||b.bottom>innerHeight+1)return null;
  const matrix=path.getScreenCTM();if(!matrix)return null;const length=path.getTotalLength();for(let i=0;i<=8;i++){const point=path.getPointAtLength(length*i/8),screenPoint=new DOMPoint(point.x,point.y).matrixTransform(matrix),hit=document.elementFromPoint(screenPoint.x,screenPoint.y);if(!hit||!svg.contains(hit))return null;}
  return {viewportWidthCssPx:b.width,viewportHeightCssPx:b.height,pathWidthCssPx:p.width,pathHeightCssPx:p.height,strokeWidthCssPx:stroke,measuredAt:performance.now(),method:'dom-svg-css-pixels'};
 }
 async function speak(code:string,onEnded:()=>void){
  const a=r.current,epoch=a.epoch;if(!current(epoch)||a.muted)return;stopVoice();const generation=a.voiceGeneration,token=flow.current.token(),controller=new AbortController();a.controller=controller;
  const valid=()=>current(epoch)&&a.voiceGeneration===generation&&a.controller===controller&&flow.current.matches(token);
  const fail=()=>{if(!valid())return;if(flow.current.stage==='eye-instruction')flow.current.instructionEye=null;stopVoice();stage('error','Sesli yönerge kullanılamıyor. Tekrar deneyin.');setVoice('failed');setError('Ahmet Türkçe yönerge oynatılamadı; yanıt dinlenmedi ve puanlanmadı.');};
  setVoice('loading');a.voiceTimeout=setTimeout(()=>{if(valid()){controller.abort();fail();}},25000);
  try{timing('request');const response=await fetch('http://127.0.0.1:8000/api/vision/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:code,cloudConsent:true}),signal:controller.signal});
   if(!valid()){await response.body?.cancel();return;}if(!response.ok)throw Error('VOICE_UNAVAILABLE');
   const audio=new Audio();a.audio=audio;audio.onplaying=()=>{if(valid()){setVoice('playing');timing('playing');}};audio.onerror=fail;
   audio.onended=()=>{if(!valid())return;timing('ended');stopVoice();onEnded();};
   const stream=streamSpeech(audio,response,controller.signal,valid,name=>timing(name));a.url=stream.url;a.cancelSpeech=stream.cancel;await stream.finished;
  }catch{fail();}
 }
 function listen(){
  const a=r.current,s=a.session,epoch=a.epoch,f=flow.current;if(!s||!current(epoch)||a.recognition||a.muted||a.modal||!f.canAnswer||failure()||!measureSymbol())return;
  const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR){stage('error','Konuşma tanıma bu tarayıcıda kullanılamıyor.');setError('Türkçe konuşma tanıma için desteklenen Chrome tarayıcısını kullanın.');return;}
  const recognition=new SR(),id=s.presentationId,token=f.token();a.recognition=recognition;recognition.lang='tr-TR';recognition.continuous=false;recognition.interimResults=false;let accepted=false;
  const valid=()=>current(epoch)&&a.recognition===recognition&&flow.current.matches(token)&&s.presentationId===id&&flow.current.canAnswer;
  recognition.onstart=()=>{if(valid()){setVoice('listening');timing('listening');}else{try{recognition.abort();}catch{}}};
  recognition.onresult=(event:any)=>{if(!valid()||accepted)return;const item=event.results[event.resultIndex||0];if(!item?.isFinal)return;accepted=true;const answer=item[0];abortRecognition();actions.current.receive(answer.transcript,answer.confidence,id);};
  recognition.onerror=(event:any)=>{if(!valid()||event.error==='no-speech')return;abortRecognition();s.suspendResponse();stage('error','Mikrofon veya konuşma hizmeti kullanılamıyor.');setVoice('failed');setError('Konuşma tanıma başarısız. Yanıt puanlanmadı; tekrar deneyebilirsiniz.');};
  recognition.onend=()=>{if(!valid())return;a.recognition=null;a.restart=setTimeout(()=>{if(current(epoch)&&flow.current.matches(token))actions.current.listen();},350);};
  try{recognition.start();}catch{abortRecognition();s.suspendResponse();stage('error','Mikrofon başlatılamadı.');setError('Yanıt puanlanmadı. Tekrar deneyin.');}
 }
 function failure(){const a=r.current,s=a.session,c=a.evidence?.conditions||null,v=video.current;if(!c||!v||v.paused||v.ended||v.readyState<2||!a.stream?.getVideoTracks().every(t=>t.readyState==='live')||performance.now()-c.observedAt>750)return 'camera';if(c.blocker)return c.blocker;const gate=s?flow.current.gatedEye(s.eye):null;if(gate){const opened=gate==='RIGHT'?c.right:c.left,other=gate==='RIGHT'?c.left:c.right;if(['closed','covered'].includes(opened.state)&&['closed','covered'].includes(other.state))return 'both-eyes';if(['closed','covered'].includes(opened.state))return 'test-eye';if(opened.state==='open'&&other.state==='open')return 'cover-other';}return letterConditionFailure(c,gate,performance.now());}
 function inspect(){
  const a=r.current,s=a.session,f=flow.current;if(a.active&&s)refresh();if(!a.active||!s||['idle','result','error','user-paused'].includes(f.stage)||a.muted||a.modal)return;
  const problem=failure();if(f.stage==='eye-instruction'||(f.stage==='preparing'&&a.controller))return;
  if(problem){
   if(a.fault!==problem){a.fault=problem;a.faultSince=performance.now();}
   if(['rendering','prompting','listening'].includes(f.stage)){s.suspendResponse();stopVoice();stage('condition-paused',TEXT[problem]||TEXT.uncertain);}
   else if(f.stage==='condition-paused'){f.reason=TEXT[problem]||TEXT.uncertain;refresh();}
   if(s.presentationId&&performance.now()-a.faultSince>=800&&a.announcedFault!==problem){s.invalidate(problem,a.evidence?.conditions||null,performance.now(),null);f.presentationId='';a.partial={};a.announcedFault=problem;a.modal=true;setDialog(TEXT[problem]||TEXT.uncertain);refresh();}return;
  }
  a.fault='';a.faultSince=0;a.announcedFault='';
  if(f.instructionEye!==s.eye){f.eye=s.eye;f.instructionEye=s.eye;stage('eye-instruction',eyeInstruction(s.eye));void speak(s.eye==='RIGHT'?'right':'left',()=>{stage('eye-check',eyeInstruction(s.eye));actions.current.inspect();});return;}
  if(f.stage==='preparing'||f.stage==='eye-check'||f.stage==='condition-paused'){if(!s.presentationId){s.present();a.partial={};a.clarifications=0;}f.presentationId=s.presentationId;stage('rendering');return;}
  if(f.stage==='listening')actions.current.listen();
 }
 function pause(){r.current.session?.suspendResponse();stopVoice();stage('user-paused','Duraklatıldı. Devam et ile sürdürebilirsiniz.');}
 function resume(){const a=r.current;if(!a.session)return;setError('');a.modal=false;setDialog(null);stopVoice();stage('condition-paused','Koşullar kontrol ediliyor.');inspect();}
 async function complete(cancelled=false){
  const a=r.current,s=a.session;if(!s)return;const epoch=a.epoch;s.suspendResponse();stopVoice();stage('user-paused');
  if(cancelled){stop();setDialog('Görev bitirildi. Tamamlanmamış sonuç kaydedilmedi.');return;}
  const value:LetterResult={id:s.id,date:new Date().toISOString(),protocolVersion:LETTER_PROTOCOL,trials:s.ledger.map(t=>structuredClone(t)),deviceContext:{width:screen.width,height:screen.height,dpr:devicePixelRatio},profileVerification:'unverified',distanceMethod:'relative-head-anchors',physicalScale:null,completed:s.completed};
  let notice='Görev tamamlandı. Saklama tercihi kapalı; geçmişe kayıt eklenmedi.';
  if(isVisionSavingAllowed()&&!isDemoMode()&&!a.saving){a.saving=true;try{await appendHealthRecord('vision',value,{},()=>current(epoch)&&isVisionSavingAllowed());notice='Görev tamamlandı. Sonuç bu cihazdaki geçmişe kaydedildi.';}catch{notice='Görev tamamlandı ancak sonuç kaydedilemedi.';}finally{a.saving=false;}}
  if(a.epoch!==epoch)return;stop();setResult(value);stage('result');setDialog(notice);
 }
 function prompt(code='repeat'){const a=r.current,s=a.session;if(!s||!measureSymbol())return;abortRecognition();s.suspendResponse();stage('prompting');void speak(code,()=>{if(!s.presentationId||failure()||!measureSymbol()){stage('condition-paused');inspect();return;}stage('listening');s.beginResponse();listen();});}
 function receive(text:string,confidence:number,id:string){
  const a=r.current,s=a.session;if(!s||!current(a.epoch)||!flow.current.canAnswer||s.presentationId!==id)return;const parsed=parseLetterAnswer(text);
  if(parsed.command==='finish'){void complete(true);return;}if(parsed.command==='pause'){pause();return;}if(parsed.command==='resume'){resume();return;}
  if(failure()||!measureSymbol()){inspect();return;}if(parsed.command==='repeat'){prompt();return;}
  const merged:ParsedAnswer={...parsed,letter:parsed.letter||a.partial.letter,orientation:parsed.orientation||a.partial.orientation},low=confidence>0&&confidence<.5,unclear=!parsed.command&&(low||parsed.clarify==='reverse'||!merged.letter||!merged.orientation);
  if(unclear){s.unscored(low?'ASR_LOW_CONFIDENCE':'ASR_UNCLEAR',a.evidence?.conditions||null,performance.now(),measureSymbol(),parsed);if(++a.clarifications>2){s.invalidate('ASR_RETRY_LIMIT',a.evidence?.conditions||null,performance.now(),measureSymbol());flow.current.presentationId='';pause();setDialog('Yanıt iki açıklama turunda anlaşılamadı. Puanlanmadı; Devam et ile aynı hedefi yeniden deneyebilirsiniz.');return;}if(!low)a.partial=parsed.clarify==='reverse'?{letter:merged.letter}:merged;prompt(parsed.clarify==='reverse'?'reverse':!merged.letter||low?'letter':'orientation');return;}
  delete merged.clarify;if(s.respond(merged,a.evidence?.conditions||null,performance.now(),id,measureSymbol())){stopVoice();flow.current.presentationId='';a.partial={};a.clarifications=0;if(s.completed)void complete();else{stage('eye-check');inspect();}}
 }
 actions.current={inspect,receive,listen,stop,measure:measureSymbol,prompt,current,timing,renderError:()=>{stage('error','Harf alanı görünür değil. Alanı ekrana getirip tekrar deneyin.');setError('Harf gösterilemedi; yanıt istenmedi veya puanlanmadı.');}};
 const renderStage=flow.current.stage,renderToken=flow.current.token();
 // Require a painted, nonzero, unclipped stimulus before any response prompt.
 useEffect(()=>{if(renderStage!=='rendering')return;const token=renderToken,epoch=r.current.epoch;let cancelled=false,raf=0;const startedAt=performance.now();const verify=()=>{if(cancelled||!actions.current.current(epoch)||!flow.current.matches(token))return;if(actions.current.measure()){actions.current.timing('letter-rendered');actions.current.prompt();}else if(performance.now()-startedAt<2000)raf=requestAnimationFrame(verify);else actions.current.renderError();};raf=requestAnimationFrame(()=>{raf=requestAnimationFrame(verify);});return()=>{cancelled=true;cancelAnimationFrame(raf);};},[renderStage,renderToken]);
 useEffect(()=>{const state=r.current;state.mounted=true;setReady(true);const revoke=()=>{if(!isCameraAllowed()||!isMicrophoneAllowed()){actions.current.stop();setError('Kamera veya mikrofon tercihi kapalı; görev durduruldu.');}};window.addEventListener('storage',revoke);window.addEventListener('attune-privacy',revoke);return()=>{state.mounted=false;actions.current.stop();window.removeEventListener('storage',revoke);window.removeEventListener('attune-privacy',revoke);};},[]);
 useEffect(()=>{if(!isParked){actions.current.stop();setDialog(null);}},[isParked]);
 useEffect(()=>{if(video.current&&r.current.stream&&video.current.srcObject!==r.current.stream){video.current.srcObject=r.current.stream;void video.current.play().catch(()=>{});}});
 async function start(){
  if(!parked.current)return;stop();if(canvas.current)delete canvas.current.dataset.visionFailure;setDialog(null);setError('');setResult(null);if(!isCameraAllowed()||!isMicrophoneAllowed()){setError('Kamera ve mikrofon izinlerini Gizlilik ekranından açın.');return;}
  const a=r.current;a.active=true;a.muted=false;a.fault='';a.announcedFault='';a.session=new SpokenLetterSession();flow.current.start(a.session.id);refresh();const epoch=a.epoch;
  try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});if(!current(epoch)){stream.getTracks().forEach(t=>t.stop());return;}a.stream=stream;refresh();
   const engine=new VisionInference();a.engine=engine;await engine.initialize();if(!current(epoch))return;if(!video.current)throw Error('PREVIEW');video.current.srcObject=stream;await video.current.play();void speak('prepare',()=>inspect());
   let last=-1;const analysis=document.createElement('canvas');const inferenceFailure=(error:unknown)=>{if(current(epoch)){if(canvas.current)canvas.current.dataset.visionFailure=JSON.stringify({stage:'frame',message:error instanceof Error?error.message:'UNKNOWN',atMs:performance.now()});stop();setError('Kamera değerlendirmesi kesildi. Görev kaydedilmedi; tekrar deneyebilirsiniz.');}};const loop=async()=>{
    if(!current(epoch))return;const v=video.current,c=canvas.current;if(!v||!c||stream.getVideoTracks().some(t=>t.readyState!=='live'))throw Error('CAMERA_ENDED');
    if(v.readyState>=2&&v.currentTime!==last){last=v.currentTime;const captureSession=flow.current.sessionId,captureEye=a.session?.eye,capturePresentation=a.session?.presentationId;const time=performance.now(),ratio=Math.min(1,640/v.videoWidth);analysis.width=Math.round(v.videoWidth*ratio);analysis.height=Math.round(v.videoHeight*ratio);analysis.getContext('2d',{willReadFrequently:true})!.drawImage(v,0,0,analysis.width,analysis.height);
     const observed=await engine.assess(analysis,time,a.session?flow.current.gatedEye(a.session.eye):null);if(!current(epoch))return;if(flow.current.sessionId!==captureSession||a.session?.eye!==captureEye||a.session?.presentationId!==capturePresentation){a.raf=requestAnimationFrame(()=>void loop().catch(inferenceFailure));return;}observed.conditions.cameraLive=!v.paused&&!v.ended&&stream.getVideoTracks().every(t=>t.readyState==='live');a.evidence=observed;if(observed.alignment.landmarks)a.previewPoints=observed.alignment.landmarks;setEvidence(observed);
     c.dataset.visionEvidence=JSON.stringify({delegate:observed.delegate,conditions:observed.conditions,distanceRatios:observed.distanceRatios,distanceSamples:observed.distanceSamples,inferenceMs:observed.inferenceMs,frameTime:last});inspect();}
    if(current(epoch))a.raf=requestAnimationFrame(()=>void loop().catch(inferenceFailure));};void loop().catch(inferenceFailure);a.timer=setInterval(inspect,200);
  }catch(error){if(current(epoch)){const modelStarted=!!a.engine;if(canvas.current)canvas.current.dataset.visionFailure=JSON.stringify({stage:modelStarted?'model-or-preview':'camera',message:error instanceof Error?error.message:'UNKNOWN',atMs:performance.now()});stop();setError(modelStarted?'Yüz/el modeli veya önizleme başlatılamadı. Bağlantıyı kontrol edip tekrar deneyin.':'Kamera görüntüsü alınamadı. Kamera izinlerini ve cihazı kontrol edin.');}}
 }
 const f=flow.current,s=r.current.session,c=evidence?.conditions,fresh=!!c&&performance.now()-c.observedAt<=750,active=r.current.active;
 const problem=active?failure():null,faceVisible=fresh&&c?.faceCount===1,eyeLine=c?`Sol göz: ${EYE_TEXT[c.left.state]} · Sağ göz: ${EYE_TEXT[c.right.state]}`:'İki göz açık başlayın';
 const rows=[['Yüz / Kadraj',!fresh?'Ölçüm bekleniyor':c?.blocker==='pose'||c?.blocker==='framing'?TEXT[c.blocker]:c?.faceCount===1?'Yüz izleniyor':'Yüzünüzü görüntüde tutun'],['Işık',!faceVisible?'Ölçüm bekleniyor':evidence?.quality.status==='TOO_DARK'?TEXT.light:evidence?.quality.status==='TOO_BRIGHT'?TEXT.bright:'İyi'],['Netlik',!faceVisible?'Ölçüm bekleniyor':(evidence?.quality.blurScore||0)>=4?'İyi':TEXT.blur],['Mesafe / Konum',c?.blocker&&['preparing','recede','approach','distance-unknown'].includes(c.blocker)?TEXT[c.blocker]:c?.distanceState==='stable'?'Başlangıç mesafesi korunuyor':c?.distanceState==='unknown'?'Mesafe ölçümü güvenilir değil':'Başlangıç bekleniyor'],['Göz kontrolü',eyeLine],['Görüntü güncelliği',fresh?'Güncel':'Kamera karesi bekleniyor']];
 const blockLabel=problem&&['eye','uncertain','both-eyes','test-eye','cover-other'].includes(problem)?'Göz':problem==='pose'?'Baş pozu':problem==='blur'?'Netlik':problem==='light'||problem==='bright'?'Işık':problem==='camera'?'Görüntü':problem==='face'||problem==='framing'?'Kadraj':'Mesafe';
 const placeholder=!evidence&&f.stage==='preparing'?'Kamera ve cihazdaki modeller hazırlanıyor…':f.stage==='user-paused'||f.stage==='error'?f.reason:f.stage==='eye-instruction'?eyeInstruction(s?.eye||'RIGHT'):f.stage==='eye-check'?eyeInstruction(s?.eye||'RIGHT')+(problem&&problem!=='cover-other'?' '+(TEXT[problem]||TEXT.uncertain):''):problem?(problem==='preparing'?'Başlangıç kontrolü sürüyor.':`${blockLabel} kontrolü nedeniyle duraklatıldı.`):'Harf hazırlanıyor…';
 return <div className="space-y-6" data-vision-stage={f.stage} data-vision-trial={f.presentationId}>
  <div className="flex justify-between gap-3"><h1 className="text-2xl font-bold">Sesli harf tanıma</h1><InformationButton title="Görme görevi ve hizmet bilgisi"><p>Bu görev klinik görme keskinliği veya göz numarası ölçmez. Kamera pikselleri ve göz başlangıcı yalnız cihaz belleğinde değerlendirilir. Görüntü aynasızdır; sağ ve sol, kendi anatomik gözünüzdür. Mutlak uzaklık ölçülmez.</p><p>Sabit yönergeler onaylanan Microsoft Edge tr-TR-AhmetNeural sesiyle -10% hız, -10Hz pitch ile okunur. Yönerge metni çevrimiçi Edge hizmetine gönderilir. Tarayıcı konuşma tanıma hizmeti mikrofon sesini buluta aktarabilir. Ham görüntü ve ses saklanmaz. Sonuç yalnız saklama izniyle kaydedilir.</p></InformationButton></div>
  {!isParked?<p>{syncStatus==='synced'?'Sürüş sırasında görev kapalıdır.':'Araç durumu doğrulanamadı; görev kapalıdır.'}</p>:<>
   {f.stage==='idle'&&<section className="rounded-2xl border border-white/10 bg-cockpit-surface p-6 space-y-4"><h2 className="text-xl font-bold">Harfi ve yönünü söyleyin</h2><p>İki gözünüz açık başlayın. Başlangıç konumunuz öğrenildikten sonra ekrandaki göz yönergesini izleyin. Harf alanına bakabilirsiniz.</p><button onClick={()=>void start()} disabled={!ready} className="min-h-11 rounded-xl bg-togg-turquoise text-togg-darkBlue px-6 font-bold">Başlat</button></section>}
   {active&&<section className="grid lg:grid-cols-2 gap-5 rounded-2xl bg-cockpit-surface border border-white/10 p-5">
    <div className="space-y-3"><CameraPreview videoRef={video} landmarks={r.current.previewPoints} vision/><div data-camera-preparation className="space-y-2">{rows.map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2 p-3 rounded-xl border border-white/10 text-sm"><span>{label}</span><span className={value==='İyi'||value==='Güncel'?'text-emerald-400':'text-slate-300'}>{value}</span></div>)}</div><p className="text-sm text-togg-turquoise" data-vision-voice={voice}>{voice==='playing'?'Yönerge okunuyor':voice==='loading'?'Yönerge hazırlanıyor':voice==='listening'?'Dinliyor':''}</p></div>
    <div className="order-first lg:order-none flex flex-col items-center justify-start gap-4 min-w-0 self-start w-full lg:sticky lg:top-5">
     <p className="text-center font-semibold">{s?`${s.eye==='RIGHT'?'Sağ':'Sol'} göz · ${s.trials.length%12+1}/12`:''}</p>
     <div data-letter-area className="flex items-center justify-center bg-black border border-white/20 rounded-2xl w-full min-w-0" style={{height:320,maxWidth:400,padding:12}}>
      {f.letterVisible&&s?<LetterStimulus svgRef={symbol} path={LETTER_PATHS[s.letter]} orientation={s.orientation} sizePx={s.sizePx}/>:<p role="status" data-letter-placeholder className="p-4 text-center text-slate-200">{placeholder}</p>}
     </div>
     <p className="text-sm text-slate-300 text-center">Dinlerken “Tekrar”, “göremiyorum”, “duraklat” veya “bitir” diyebilirsiniz. Duraklatma sırasında düğmeleri kullanın.</p>
     <div className="flex flex-wrap gap-3"><button onClick={()=>void start()} className="min-h-11 rounded-xl border border-white/20 px-4">Yeni konumla yeniden başlat</button><button onClick={()=>f.stage==='user-paused'?resume():pause()} className="min-h-11 rounded-xl border border-white/20 px-4">{f.stage==='user-paused'?'Devam et':'Duraklat'}</button><button onClick={()=>{r.current.muted=!r.current.muted;if(r.current.muted)pause();else resume();refresh();}} className="min-h-11 rounded-xl border border-white/20 px-4">{r.current.muted?'Sesi aç':'Sesi kapat'}</button><button onClick={()=>void complete(true)} className="min-h-11 rounded-xl border border-white/20 px-4">Bitir</button>{f.stage==='error'&&<button onClick={resume} className="min-h-11 rounded-xl border border-white/20 px-4">Tekrar dene</button>}</div>
    </div>
   </section>}
   {error&&<p role="alert" className="text-amber-200">{error}</p>}
   {f.stage==='result'&&result&&<section className="rounded-2xl border border-white/10 bg-cockpit-surface p-6 space-y-5"><LetterVisionResult result={result}/><button onClick={()=>{setResult(null);flow.current.reset();refresh();}} className="min-h-11 rounded-xl border border-white/20 px-4">Yeni görev</button></section>}
   <RecordHistory category="vision" parked={isParked}/>
  </>}
  <canvas ref={canvas} hidden/>
  {dialog&&<AccessibleDialog title="Görme bildirimi" onClose={()=>{r.current.modal=false;setDialog(null);inspect();}} className="w-full max-w-md rounded-2xl border border-white/20 bg-cockpit-surface p-6 space-y-4"><h2 className="font-bold">Görme bildirimi</h2><p>{dialog}</p><button onClick={()=>{r.current.modal=false;setDialog(null);inspect();}} className="min-h-11 rounded-xl bg-togg-turquoise text-togg-darkBlue px-6">Tamam</button></AccessibleDialog>}
 </div>;
}
