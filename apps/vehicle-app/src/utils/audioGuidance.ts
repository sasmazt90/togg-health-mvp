'use client';
import {useEffect,useId,useMemo,useRef} from 'react';
import manifest from '../../public/audio/guidance/manifest.json';
type Entry={text:string;voice:string;rate:string;pitch:string;url:string;sha256:string;textVersion:string};
export type GuidanceId=keyof typeof manifest.entries;
type Job={owner:string;id:GuidanceId;controller:AbortController;audio?:HTMLAudioElement;url?:string;resolve:(played:boolean)=>void;finished:boolean};
let current:Job|undefined,pending:Job|undefined,muted=false;
const completed=new Set<string>();
const streams=new Set<object>();
const token=(owner:string,id:GuidanceId)=>owner+':'+id;
const hearingOwns=()=>Number(localStorage.getItem('attune_hearing_audio_focus')||0)>Date.now();
function dispose(job:Job,played=false){if(job.finished)return;job.finished=true;job.controller.abort();job.audio?.pause();if(job.audio){job.audio.removeAttribute('src');job.audio.load();}if(job.url)URL.revokeObjectURL(job.url);if(played)completed.add(token(job.owner,job.id));if(current===job)current=undefined;if(pending===job)pending=undefined;job.resolve(played);}
export function cancelGuidance(owner?:string){for(const job of [current,pending])if(job&&(!owner||job.owner===owner))dispose(job);}
export function muteGuidance(value:boolean){muted=value;if(value)cancelGuidance();window.dispatchEvent(new CustomEvent('attune-guidance-muted',{detail:value}));}
export function speakGuidance(owner:string,id:GuidanceId,repeat=false):Promise<boolean>{
 if(muted||streams.size||hearingOwns())return Promise.resolve(false);
 if(!repeat&&completed.has(token(owner,id)))return Promise.resolve(true);
 if(current?.owner===owner&&current.id===id)return Promise.resolve(false);
 cancelGuidance();
 return new Promise(resolve=>{const job:Job={owner,id,controller:new AbortController(),resolve,finished:false};current=job;void load(job);});
}
async function load(job:Job){
 try{
  const e=manifest.entries[job.id] as Entry;
  const expected=job.id.startsWith('mental-')?'tr-TR-EmelNeural':'tr-TR-AhmetNeural';
  if(manifest.version!=='guidance-20261009-v1'||e.textVersion!==manifest.version||e.voice!==expected||e.rate!=='-10%'||e.pitch!=='-10Hz')throw Error('GUIDANCE_CONTRACT');
  const response=await fetch(e.url,{signal:job.controller.signal});if(!response.ok)throw Error('GUIDANCE_LOAD');const bytes=await response.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==e.sha256)throw Error('GUIDANCE_HASH');
  if(job.finished||current!==job||muted||streams.size||hearingOwns())return dispose(job);
  job.url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));job.audio=new Audio(job.url);job.audio.dataset.guidanceId=job.id;
  job.audio.onended=()=>{window.dispatchEvent(new CustomEvent('attune-guidance-event',{detail:{id:job.id,event:'ended'}}));dispose(job,true);};
  job.audio.onerror=()=>dispose(job);
  await play(job);
 }catch{dispose(job);}
}
async function play(job:Job){
 if(job.finished||current!==job||muted||streams.size||hearingOwns())return dispose(job);
 try{await job.audio!.play();pending=undefined;window.dispatchEvent(new CustomEvent('attune-guidance-event',{detail:{id:job.id,event:'playing'}}));}
 catch(error){if(job.finished)return;if((error as DOMException).name==='NotAllowedError'){pending=job;window.dispatchEvent(new CustomEvent('attune-guidance-event',{detail:{id:job.id,event:'interaction-required'}}));}else dispose(job);}
}
if(typeof window!=='undefined'){
 window.addEventListener('attune-stream-focus',event=>{const e=event as Event & {owner:object;active:boolean};if(e.active){streams.add(e.owner);cancelGuidance();}else streams.delete(e.owner);});
 window.addEventListener('attune-guidance-cancel',()=>cancelGuidance());
 window.addEventListener('attune-audio-focus',()=>{if(hearingOwns())cancelGuidance();});
 const retry=(e:Event)=>{if(e.isTrusted&&pending)void play(pending);};
 window.addEventListener('pointerdown',retry,{capture:true});window.addEventListener('keydown',retry,{capture:true});
}
/** One session per mounted route. Issues must be stable 900ms and resolve 1200ms before repeating. */
export function useGuidance(owner:string,enabled=true){
 const key=owner+useId();const available=useRef(enabled);available.current=enabled;
 const api=useMemo(()=>{
  let phaseKey='',phaseId:GuidanceId|undefined,issueKey='',issuePlayed='',timer:ReturnType<typeof setTimeout>|undefined,clearTimer:ReturnType<typeof setTimeout>|undefined;
  return {
   say:(id:GuidanceId,repeat=true)=>available.current?speakGuidance(key,id,repeat):Promise.resolve(false),
   phase:(phase:string,id?:GuidanceId)=>{if(phase===phaseKey)return;phaseKey=phase;phaseId=id;issueKey='';issuePlayed='';if(timer)clearTimeout(timer);if(clearTimer){clearTimeout(clearTimer);clearTimer=undefined;}cancelGuidance(key);if(id&&available.current)void speakGuidance(key,id,true);},
   issue:(code:string,id?:GuidanceId)=>{if(code&&code===issueKey){if(clearTimer){clearTimeout(clearTimer);clearTimer=undefined;}return;}if(!code&&clearTimer)return;if(timer)clearTimeout(timer);if(clearTimer)clearTimeout(clearTimer);if(!code){clearTimer=setTimeout(()=>{clearTimer=undefined;if(issueKey)cancelGuidance(key);issueKey='';issuePlayed='';},1200);return;}if(code===issuePlayed)return;if(issueKey)cancelGuidance(key);issueKey=code;timer=setTimeout(()=>{timer=undefined;if(issueKey===code&&id&&available.current){issuePlayed=code;void speakGuidance(key,id,true);}},900);},
   repeat:()=>phaseId?speakGuidance(key,phaseId,true):Promise.resolve(false),
   cancel:()=>{if(timer)clearTimeout(timer);if(clearTimer)clearTimeout(clearTimer);cancelGuidance(key);},
  };
 },[key]);
 useEffect(()=>{if(!enabled)api.cancel();return()=>api.cancel();},[api,enabled]);
 return api;
}
export function qualityGuidance(text:string):GuidanceId|undefined{
 if(/ayrıntı|yaklaş|detay/i.test(text))return 'quality-near';if(/uzak|kadraj|alın ve çene/i.test(text))return 'quality-far';
 if(/ışık|parla|yansı/i.test(text))return 'quality-light';if(/net|sabit|hareket/i.test(text))return 'quality-blur';if(/yüz.*algı|yüz.*gör/i.test(text))return 'quality-face';
 if(/dil|dudak|diş.*gör|ağzınızı/i.test(text))return 'dental-teeth';return undefined;
}
