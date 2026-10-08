export type Crop={x:number;y:number;width:number;height:number};
/** Face framing shared by live preview and accepted raw-photo presentation. */
export function cameraCrop(points?:{x:number;y:number}[]):Crop {
 if(!points || points.length<468)return {x:0,y:0,width:1,height:1};
 const face=points.slice(0,468);
 const minX=Math.min(...face.map(p=>p.x)),maxX=Math.max(...face.map(p=>p.x));
 const minY=Math.min(...face.map(p=>p.y)),maxY=Math.max(...face.map(p=>p.y));
 const w=maxX-minX,h=maxY-minY;
 const x=Math.max(0,minX-w*.32),y=Math.max(0,minY-h*.35);
 return {x,y,width:Math.min(1,maxX+w*.32)-x,height:Math.min(1,maxY+h*.16)-y};
}
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
