/** One MP3 provider response -> ordered MSE buffer -> actual HTML audio events.
 * A stream is never converted to a full Blob. Unsupported formats fail visibly.
 */
export function streamSpeech(audio:HTMLAudioElement,response:Response,signal:AbortSignal,current:()=>boolean) {
  if(!response.body || !response.headers.get('content-type')?.startsWith('audio/mpeg') || !MediaSource.isTypeSupported('audio/mpeg')) throw new Error('Streaming audio unsupported');
  const source=new MediaSource(),url=URL.createObjectURL(source),reader=response.body.getReader();
  let buffer:SourceBuffer|null=null,closed=false,playStarted=false;
  const cancelled=()=>closed||signal.aborted||!current();
  const abortError=()=>new DOMException('Playback cancelled','AbortError');
  const wait=(target:EventTarget,event:string)=>new Promise<void>((resolve,reject)=>{
    if(cancelled()){reject(abortError());return;}
    const clear=()=>{target.removeEventListener(event,done);target.removeEventListener('error',fail);signal.removeEventListener('abort',fail);};
    const done=()=>{clear();cancelled()?reject(abortError()):resolve();};
    const fail=()=>{clear();reject(cancelled()?abortError():new Error('Media buffer'));};
    target.addEventListener(event,done,{once:true});target.addEventListener('error',fail,{once:true});signal.addEventListener('abort',fail,{once:true});
  });
  const cancel=()=>{closed=true;void reader.cancel().catch(()=>{});if(buffer?.updating&&source.readyState==='open'){try{buffer.abort();}catch{}}};
  signal.addEventListener('abort',cancel,{once:true});
  const opened=wait(source,'sourceopen');audio.preload='auto';audio.src=url;audio.load();
  const finished=(async()=>{
    try {
      await opened;if(cancelled())throw abortError();
      buffer=source.addSourceBuffer('audio/mpeg');buffer.mode='sequence';
      let total=0;
      for(;;){
        const part=await reader.read();if(cancelled())throw abortError();
        if(part.done)break;
        total+=part.value.byteLength;if(total>8*1024*1024)throw new Error('Speech output too large');
        const updated=wait(buffer,'updateend');buffer.appendBuffer(part.value as Uint8Array<ArrayBuffer>);await updated;
        if(!playStarted){playStarted=true;void audio.play().catch(()=>{if(!cancelled()){cancel();audio.dispatchEvent(new Event('error'));}});}
      }
      if(!total||cancelled())throw abortError();
      if(source.readyState==='open')source.endOfStream();
    } finally {signal.removeEventListener('abort',cancel);reader.releaseLock();}
  })();
  return {url,cancel,finished};
}
