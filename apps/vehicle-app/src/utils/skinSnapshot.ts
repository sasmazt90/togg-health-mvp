import { FaceAlignment, SkinAnalyzer } from './skinAnalyzer';
import { SkinAngle } from './skinMultiAngle';
/** Volatile only: never pass these objects to history/reference writers. */
export interface SkinSnapshot {
  dataUrl:string; width:number; height:number; angle:SkinAngle;
  rois:{id:string;nameTr:string;x:number;y:number;w:number;h:number}[];
  exclusions:{x:number;y:number;w:number;h:number}[];
  faceContour:{x:number;y:number}[];
  contours:Record<string,{x:number;y:number}[]>;
  crop:{x:number;y:number;width:number;height:number};
}
// Anatomical indices in the unmirrored accepted MediaPipe frame. Sampling ROIs
// remain unchanged; presentation contours are clipped to those original ROIs.
export const FACE_OUTLINE=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
export const SKIN_CONTOURS:Record<string,number[]>={
  forehead:[109,67,103,54,21,71,63,105,66,107,9,336,296,334,293,301,251,284,332,297,338,10,109],
  rightCheek:[50,101,205,187,147,123,116,111,117,118,119,100,126,142,36,50],
  leftCheek:[280,330,349,348,347,346,340,345,352,376,411,425,321,280],
  nose:[168,6,197,195,5,4,1,19,94,2,98,97,129,209,49,48,115,220,45,51,3,196,168,419,248,281,275,440,344,278,279,429,358,327,326,2],
  periorbital:[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33,130,247,30,29,27,28,56,190,243,112,26,22,23,24,110,25,130,263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466,263],
  chin:[61,146,91,181,84,17,314,405,321,375,291,422,424,418,421,200,201,194,204,202,61,176,148,152,377,400,378,149,176]
};
export function snapshotSkinFrame(canvas:HTMLCanvasElement, alignment:FaceAlignment, angle:SkinAngle):SkinSnapshot {
  const {roiDefinitions,exclusionBoxes}=SkinAnalyzer.regionGeometry(canvas.width,canvas.height,alignment);
  const allowed=angle==='FRONT'?['forehead','nose','chin','periorbital','rightCheek','leftCheek']:[angle==='RIGHT'?'leftCheek':'rightCheek'];
  const rois=roiDefinitions.filter(r=>allowed.includes(r.id)).map(r=>{
    const x=Math.max(0,Math.ceil(r.x)),y=Math.max(0,Math.ceil(r.y));
    return {...r,x,y,w:Math.min(canvas.width,Math.floor(r.x+r.w))-x,h:Math.min(canvas.height,Math.floor(r.y+r.h))-y};
  });
  if(rois.some(r=>r.w<4||r.h<4))throw new Error('INVALID_ROI');
  const landmarks=alignment.landmarks;
  if(!landmarks||landmarks.length<468)throw new Error('MISSING_FACE_CONTOUR');
  const points=(indices:number[])=>indices.map(i=>({x:landmarks[i].x*canvas.width,y:landmarks[i].y*canvas.height}));
  const faceContour=points(FACE_OUTLINE);
  const x=Math.max(0,Math.min(...faceContour.map(p=>p.x))),y=Math.max(0,Math.min(...faceContour.map(p=>p.y)));
  const crop={x,y,width:Math.min(canvas.width,Math.max(...faceContour.map(p=>p.x)))-x,height:Math.min(canvas.height,Math.max(...faceContour.map(p=>p.y)))-y};
  return { dataUrl:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,angle,rois,exclusions:exclusionBoxes,faceContour,crop,contours:Object.fromEntries(Object.entries(SKIN_CONTOURS).map(([id,indices])=>[id,points(indices)])) };
}
export function snapshotAngleForRegion(id:string,threeAngle:boolean):SkinAngle {
  return !threeAngle?'FRONT':id==='rightCheek'?'LEFT':id==='leftCheek'?'RIGHT':'FRONT';
}
export const REGION_COLORS:Record<string,string>={forehead:'#67e8f9',rightCheek:'#c4b5fd',leftCheek:'#fda4af',nose:'#fcd34d',chin:'#86efac',periorbital:'#93c5fd'};
