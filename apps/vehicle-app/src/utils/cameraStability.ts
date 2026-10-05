export type Crop={x:number;y:number;width:number;height:number};
export const CAMERA_STABILITY={cropTauMs:160,centerDeadband:.005,scaleDeadband:.02,largeChange:.08,motionFaceWidthsPerSecond:.45,positionHoldMs:1000} as const;
/** Display only. No smoothed coordinate is passed to inference or scoring. */
export class StablePreviewCrop {
 private value:Crop|null=null;private at=0;
 update(target:Crop,at:number):Crop {
  if(!this.value){this.value={...target};this.at=at;return this.value;}
  const prev=this.value,dt=Math.min(250,Math.max(1,at-this.at));this.at=at;
  const large=Math.max(Math.abs(target.x-prev.x),Math.abs(target.y-prev.y),Math.abs(target.width-prev.width))>CAMERA_STABILITY.largeChange;
  const alpha=large?1:1-Math.exp(-dt/CAMERA_STABILITY.cropTauMs);
  const next={...prev};
  for(const k of ['x','y','width','height'] as const){const band=k==='x'||k==='y'?CAMERA_STABILITY.centerDeadband:prev[k]*CAMERA_STABILITY.scaleDeadband;if(Math.abs(target[k]-prev[k])>band)next[k]=prev[k]+alpha*(target[k]-prev[k]);}
  this.value=next;return next;
 }
}
/** Relative geometry over real source-frame timestamps; exposure is not motion. */
export class SourceMotion {
 private samples:{x:number;y:number;scale:number;at:number}[]=[];
 update(x:number,y:number,scale:number,at:number){
  this.samples.push({x,y,scale,at});this.samples=this.samples.filter(s=>at-s.at<=600);
  const first=this.samples[0],dt=(at-first.at)/1000;
  return dt>=.3 && scale>0 && Math.hypot(x-first.x,y-first.y)/(scale*dt)>CAMERA_STABILITY.motionFaceWidthsPerSecond;
 }
}
