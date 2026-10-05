import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { SkinAnalyzer, type FaceAlignment } from './skinAnalyzer';
import { visionFrameQuality } from './visionFrameQuality';
import type { Eye, EyePixelEvidence, LetterConditions } from './spokenVision';
export const VISION_TRACKING_RULES={baselineMs:1000,eyeHoldMs:600,distanceEnter:.15,distanceExit:.10,distanceHoldMs:600,recoveryMs:350} as const;
const eyeIds={RIGHT:[33,160,158,133,153,144],LEFT:[362,385,387,263,373,380]};
const anchors=[10,168,1,4,2,17,152,172,397,234,454];
const pairs=[[10,152],[10,1],[1,152],[168,17],[4,17],[234,454],[172,397]];
type Patch={gray:number[];rgb:number[];mean:number;gradient:number};
type Box={x:number;y:number;width:number;height:number};
const median=(v:number[])=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)];
export class SustainedEyeState {
 private candidate='uncertain';private since=0;private last:number|null=null;
 update(candidate:EyePixelEvidence['state'],now:number){if(this.last!==null&&now-this.last>300)this.since=now;this.last=now;if(candidate!==this.candidate){this.candidate=candidate;this.since=now;}const heldMs=now-this.since;return {state:candidate==='closed'||candidate==='covered'?heldMs>=VISION_TRACKING_RULES.eyeHoldMs?candidate:'uncertain':candidate,heldMs} as {state:EyePixelEvidence['state'];heldMs:number};}
}
export class HeadDistanceHysteresis {
 private committed:'stable'|'near'|'far'='stable';private candidate='';private since=0;private last:number|null=null;
 update(relative:number|null,now:number,reliable=true):'stable'|'near'|'far'|'unknown'{
  if(this.last!==null&&now-this.last>300)this.candidate='';this.last=now;if(relative===null||!reliable){this.candidate='';return 'unknown';}
  const target=relative>VISION_TRACKING_RULES.distanceEnter?'near':relative< -VISION_TRACKING_RULES.distanceEnter?'far':Math.abs(relative)<=VISION_TRACKING_RULES.distanceExit?'stable':this.committed;
  if(target!==this.committed){if(this.candidate!==target){this.candidate=target;this.since=now;}if(now-this.since>=(target==='stable'?VISION_TRACKING_RULES.recoveryMs:VISION_TRACKING_RULES.distanceHoldMs))this.committed=target;}else this.candidate='';
  return this.committed;
 }
}
function bounds(p:NormalizedLandmark[],ids:number[],w:number,h:number,padding:number):Box{
 const q=ids.map(i=>p[i]),span=Math.abs(q[0].x-q[3].x)*w,x=Math.min(...q.map(a=>a.x))*w-padding*span,y=Math.min(...q.map(a=>a.y))*h-padding*span;
 return {x,y,width:Math.max(...q.map(a=>a.x))*w+padding*span-x,height:Math.max(...q.map(a=>a.y))*h+padding*span-y};
}
function patch(ctx:CanvasRenderingContext2D,b:Box):Patch|null{
 const {width:w,height:h}=ctx.canvas;if(b.x<0||b.y<0||b.x+b.width>w||b.y+b.height>h||b.width<8||b.height<4)return null;
 const data=ctx.getImageData(Math.floor(b.x),Math.floor(b.y),Math.ceil(b.width),Math.ceil(b.height)),gray:number[]=[],rgb:number[]=[];
 for(let y=0;y<16;y++)for(let x=0;x<24;x++){const i=(Math.min(data.height-1,Math.floor(y*data.height/16))*data.width+Math.min(data.width-1,Math.floor(x*data.width/24)))*4;rgb.push(data.data[i],data.data[i+1],data.data[i+2]);gray.push(.299*data.data[i]+.587*data.data[i+1]+.114*data.data[i+2]);}
 let gradient=0;for(let i=0;i<gray.length;i++)if(i%24)gradient+=Math.abs(gray[i]-gray[i-1]);
 return {gray,rgb,mean:gray.reduce((s,v)=>s+v,0)/gray.length,gradient:gradient/gray.length};
}
function compare(a:Patch,b:Patch){let cross=0,aa=0,bb=0,changed=0;for(let i=0;i<a.gray.length;i++){const x=a.gray[i]-a.mean,y=b.gray[i]-b.mean;cross+=x*y;aa+=x*x;bb+=y*y;const j=i*3;const d=Math.abs(a.rgb[j]-b.rgb[j])+Math.abs(a.rgb[j+1]-b.rgb[j+1])+Math.abs(a.rgb[j+2]-b.rgb[j+2]);if(d>85)changed++;}return {correlation:cross/Math.max(1,Math.sqrt(aa*bb)),change:changed/a.gray.length};}
function inside(p:NormalizedLandmark,b:Box,w:number,h:number){return p.x*w>=b.x&&p.x*w<=b.x+b.width&&p.y*h>=b.y&&p.y*h<=b.y+b.height;}
function handCoverage(hands:NormalizedLandmark[][],b:Box,w:number,h:number){
 // Use the palm (not a broad whole-hand box). Its projected polygon must
 // actually overlap the eye ROI; a raised hand elsewhere cannot pass.
 let covered=0;for(const hand of hands){const hull=[0,1,5,9,13,17].map(i=>({x:hand[i].x*w,y:hand[i].y*h}));let count=0;
  for(let y=0;y<8;y++)for(let x=0;x<12;x++){const px=b.x+(x+.5)*b.width/12,py=b.y+(y+.5)*b.height/8;let hit=false;for(let i=0,j=hull.length-1;i<hull.length;j=i++){const a=hull[i],z=hull[j];if((a.y>py)!==(z.y>py)&&px<(z.x-a.x)*(py-a.y)/(z.y-a.y)+a.x)hit=!hit;}if(hit)count++;}covered=Math.max(covered,count/96);
 }return covered;
}
export interface VisionModelFrame {landmarks:NormalizedLandmark[][];hands:NormalizedLandmark[][];blinkRight:number|null;blinkLeft:number|null;inferenceMs:number;frameTime:number}
export interface VisionEvidence {alignment:FaceAlignment;quality:ReturnType<typeof visionFrameQuality>;conditions:LetterConditions;distanceSamples:number;distanceRatios:number[];inferenceMs:number;width:number;height:number;delegate?:'CPU'|'GPU'}
/** Templates and personal baseline stay in worker memory and are destroyed on
 * close. No image, identity embedding or absolute camera distance is stored. */
export class VisionTracker {
 private baseline:Record<Eye,{ear:number;blink:number;patch:Patch;wide:Patch}>|null=null;
 private baselinePairs:number[]|null=null;private samples:{ears:number[];blinks:number[];narrow:Patch[];wide:Patch[];lengths:number[]}[]=[];private baselineSince=0;private lastFrame=0;
 private eyeHold={RIGHT:new SustainedEyeState(),LEFT:new SustainedEyeState()};
 private distance:'learning'|'stable'|'near'|'far'|'unknown'='learning';private distanceHold=new HeadDistanceHysteresis();
 private lastPoints:NormalizedLandmark[]|null=null;private trustedPatches:{id:number;image:Patch;box:Box}[]=[];private trackedScaleReliable=false;
 private followPixels(ctx:CanvasRenderingContext2D,w:number,h:number):NormalizedLandmark[]|null{
  this.trackedScaleReliable=false;if(!this.lastPoints||this.trustedPatches.length<3)return null;
  const hits:{id:number;dx:number;dy:number;correlation:number}[]=[];
  for(const a of this.trustedPatches){let best={dx:0,dy:0,correlation:-1};for(let dy=-12;dy<=12;dy+=3)for(let dx=-12;dx<=12;dx+=3){const p=patch(ctx,{...a.box,x:a.box.x+dx,y:a.box.y+dy});if(!p)continue;const cmp=compare(a.image,p);if(cmp.correlation>best.correlation)best={dx,dy,correlation:cmp.correlation};}if(best.correlation>.78)hits.push({id:a.id,...best});}
  if(hits.length<3)return null;const dx=median(hits.map(v=>v.dx)),dy=median(hits.map(v=>v.dy));if(hits.filter(v=>Math.hypot(v.dx-dx,v.dy-dy)<5).length<3)return null;
  const scales:number[]=[];for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++){const a=this.lastPoints[hits[i].id],b=this.lastPoints[hits[j].id],x=(a.x-b.x)*w,y=(a.y-b.y)*h,d=Math.hypot(x,y);if(d>80)scales.push(Math.hypot(x+hits[i].dx-hits[j].dx,y+hits[i].dy-hits[j].dy)/d);}
  if(scales.length<2||Math.max(...scales)-Math.min(...scales)>.06)return null;
  const scale=median(scales),cx=median(hits.map(v=>this.lastPoints![v.id].x)),cy=median(hits.map(v=>this.lastPoints![v.id].y));
  const tx=median(hits.map(v=>v.dx/w-(this.lastPoints![v.id].x-cx)*(scale-1))),ty=median(hits.map(v=>v.dy/h-(this.lastPoints![v.id].y-cy)*(scale-1)));
  // Scale comes from several independently matched, separated visible head
  // patches. Missing eye landmarks themselves never supply cover or distance.
  const p=this.lastPoints.map(v=>({...v,x:cx+(v.x-cx)*scale+tx,y:cy+(v.y-cy)*scale+ty,z:v.z*scale}));this.lastPoints=p;
  this.trustedPatches=this.trustedPatches.map(v=>({...v,box:{x:cx*w+(v.box.x-cx*w)*scale+tx*w,y:cy*h+(v.box.y-cy*h)*scale+ty*h,width:v.box.width*scale,height:v.box.height*scale}}));this.trackedScaleReliable=true;return p;
 }
 assess(ctx:CanvasRenderingContext2D,w:number,h:number,model:VisionModelFrame,now:number,eye:Eye|null):VisionEvidence{
  if(!this.baseline&&this.lastFrame&&now-this.lastFrame>300){this.samples=[];this.baselineSince=0;}this.lastFrame=now;
  let p=model.landmarks.length===1?model.landmarks[0]:null;const native=!!p;let tracked=false;
  if(!p&&model.landmarks.length===0){p=this.followPixels(ctx,w,h);tracked=!!p;}
  const absent:EyePixelEvidence={state:'uncertain',ear:null,darkFraction:null,contrast:null,method:'no-reliable-eye-pixels'};
  if(!p){this.eyeHold.RIGHT.update('uncertain',now);this.eyeHold.LEFT.update('uncertain',now);this.distanceHold.update(null,now);}
  if(!p){const a:FaceAlignment={faceDetected:false,isMediaPipeActive:true,faceCount:model.landmarks.length,box:undefined,yaw:0,pitch:0,roll:0,scaleRatio:0,isAligned:false,guidanceTextTr:'Yüzünüzü kamera görüntüsünde tutun.'};return {alignment:a,quality:SkinAnalyzer.checkQuality(ctx,w,h,false),conditions:{observedAt:now,cameraLive:true,modelActive:true,faceCount:model.landmarks.length,qualityValid:false,positionValid:false,relativeScaleChange:null,right:absent,left:absent,distancePolicy:'head-anchors-hysteresis-v1',distanceState:'unknown',blocker:'face'},distanceSamples:this.samples.length,distanceRatios:[],inferenceMs:model.inferenceMs,width:w,height:h};}
  const xs=p.slice(0,468).map(v=>v.x),ys=p.slice(0,468).map(v=>v.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const yaw=(p[1].x-(p[33].x+p[263].x)/2)/Math.max(.01,Math.abs(p[33].x-p[263].x)),pitch=(p[1].y-p[10].y)/Math.max(.01,p[152].y-p[10].y),roll=Math.atan2((p[263].y-p[33].y)*h,(p[263].x-p[33].x)*w);
  const alignment:FaceAlignment={faceDetected:true,isMediaPipeActive:true,faceCount:1,box:{x:minX*w,y:minY*h,width:(maxX-minX)*w,height:(maxY-minY)*h},yaw,pitch,roll,scaleRatio:maxX-minX,isAligned:true,guidanceTextTr:'Yüz izleniyor',landmarks:p};
  const quality=visionFrameQuality(ctx,w,h,alignment,eye);
  const measurements=(['RIGHT','LEFT'] as Eye[]).map(side=>{const ids=eyeIds[side],q=ids.map(i=>p![i]),dist=(i:number,j:number)=>Math.hypot((q[i].x-q[j].x)*w,(q[i].y-q[j].y)*h);return {ear:(dist(1,5)+dist(2,4))/(2*Math.max(1,dist(0,3))),narrow:patch(ctx,bounds(p!,ids,w,h,.08)),wide:patch(ctx,bounds(p!,ids,w,h,.40)),box:bounds(p!,ids,w,h,.12),blink:side==='RIGHT'?model.blinkRight:model.blinkLeft};});
  const lengths=pairs.map(([a,b])=>Math.hypot((p![a].x-p![b].x)*w,(p![a].y-p![b].y)*h,((p![a].z||0)-(p![b].z||0))*w));
  const poseValid=Math.abs(yaw)<.38&&pitch>.30&&pitch<.80&&Math.abs(roll)<.55;
  const framed=minX>.005&&maxX<.995&&minY>.005&&maxY<.995&&(maxY-minY)>.25;
  if(!this.baseline&&native&&poseValid&&framed&&quality.isValid&&measurements.every(v=>v.narrow&&v.wide&&v.ear>.12&&v.blink!==null&&v.blink<.55)){
   if(!this.baselineSince)this.baselineSince=now;this.samples.push({ears:measurements.map(v=>v.ear),blinks:measurements.map(v=>v.blink!),narrow:measurements.map(v=>v.narrow!),wide:measurements.map(v=>v.wide!),lengths});
   if(now-this.baselineSince>=VISION_TRACKING_RULES.baselineMs&&this.samples.length>=6){this.baselinePairs=lengths.map((_,i)=>median(this.samples.map(s=>s.lengths[i])));const sample=this.samples[Math.floor(this.samples.length/2)];this.baseline={RIGHT:{ear:median(this.samples.map(s=>s.ears[0])),blink:median(this.samples.map(s=>s.blinks[0])),patch:sample.narrow[0],wide:sample.wide[0]},LEFT:{ear:median(this.samples.map(s=>s.ears[1])),blink:median(this.samples.map(s=>s.blinks[1])),patch:sample.narrow[1],wide:sample.wide[1]}};this.distance='stable';}
  }else if(!this.baseline){this.baselineSince=0;this.samples=[];}
  const ratios=this.baselinePairs?lengths.map((v,i)=>v/this.baselinePairs![i]-1):[];
  const reliableRatios=ratios.filter((_,i)=>!model.hands.some(hand=>pairs[i].some(id=>{const b={x:p![id].x*w-10,y:p![id].y*h-10,width:20,height:20};return hand.some(v=>inside(v,b,w,h));})));
  const relative=ratios.length&&(native||this.trackedScaleReliable)&&reliableRatios.length>=3?median(reliableRatios):null;
  const distanceReliable=relative!==null&&poseValid&&framed&&Math.max(...reliableRatios)-Math.min(...reliableRatios)<.24;
  if(this.baseline)this.distance=this.distanceHold.update(relative,now,distanceReliable);
  const states=measurements.map((v,i)=>{const side=(i===0?'RIGHT':'LEFT') as Eye,base=this.baseline?.[side];const cmp=base&&v.narrow?compare(base.patch,v.narrow):null,wide=base&&v.wide?compare(base.wide,v.wide):null;
   let candidate:EyePixelEvidence['state']='uncertain',method='personal-lid-geometry-and-blink';const palm=handCoverage(model.hands,v.box,w,h);
   if(base&&cmp&&wide){const ratio=v.ear/base.ear;
    if(palm>.55&&(wide.change>.50||cmp.correlation<.25)&&wide.correlation<.55){candidate='covered';method='palm-over-eye-and-local-appearance';}
    else if(wide.change>.65&&wide.correlation<.18&&cmp.correlation<.25){candidate='covered';method='opaque-local-appearance-and-visible-head';}
    else if(native&&ratio<.58&&((v.blink!==null&&v.blink>base.blink+.28)||ratio<.42)){candidate='closed';}
    else if(native&&palm<.25&&wide.change<.45&&ratio>.74&&v.blink!==null&&v.blink<Math.min(.90,base.blink+.25)&&cmp.correlation>.20){candidate='open';}
    else if(tracked&&cmp.correlation>.78&&wide.change<.25){candidate='open';method='trusted-eye-template-and-visible-head';}
   }
   const held=this.eyeHold[side].update(candidate,now);
   return {...held,ear:native?v.ear:null,darkFraction:null,contrast:v.narrow?.gradient??null,method,baselineEar:base?.ear,blinkCoefficient:v.blink,appearanceChange:wide?.change,templateCorrelation:cmp?.correlation} as EyePixelEvidence;
  });
  // Refresh only visible independent patches, excluding palms and suspect eyes.
  if(native&&poseValid){this.lastPoints=p;this.trustedPatches=anchors.filter(id=>!model.hands.some(hand=>hand.some(v=>Math.hypot(v.x-p![id].x,v.y-p![id].y)<.08))).map(id=>{const box={x:p![id].x*w-9,y:p![id].y*h-9,width:18,height:18};return {id,box,image:patch(ctx,box)!};}).filter(v=>v.image&&v.image.gradient>5);}
  const blocker=!framed?'framing':!poseValid?'pose':!quality.isValid?quality.status==='TOO_DARK'?'light':quality.status==='TOO_BRIGHT'?'bright':'blur':!this.baseline?'preparing':this.distance==='unknown'?'distance-unknown':this.distance==='near'?'recede':this.distance==='far'?'approach':null;
  return {alignment,quality,conditions:{observedAt:now,cameraLive:true,modelActive:true,faceCount:1,qualityValid:quality.isValid,positionValid:!blocker,relativeScaleChange:relative,right:states[0],left:states[1],distancePolicy:'head-anchors-hysteresis-v1',distanceState:this.distance,blocker,trackingMethod:native?'mediapipe-face-and-head-anchors':'visible-anchor-template-tracking'},distanceSamples:this.samples.length,distanceRatios:ratios,inferenceMs:model.inferenceMs,width:w,height:h};
 }
}
