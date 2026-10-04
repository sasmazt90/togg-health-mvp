import { FaceAlignment, SkinAnalyzer } from './skinAnalyzer';
import { SkinAngle } from './skinMultiAngle';
/** Volatile only: never pass these objects to history/reference writers. */
export interface SkinSnapshot {
  dataUrl:string; width:number; height:number; angle:SkinAngle;
  rois:{id:string;nameTr:string;x:number;y:number;w:number;h:number}[];
  exclusions:{x:number;y:number;w:number;h:number}[];
}
export function snapshotSkinFrame(canvas:HTMLCanvasElement, alignment:FaceAlignment, angle:SkinAngle):SkinSnapshot {
  const {roiDefinitions,exclusionBoxes}=SkinAnalyzer.regionGeometry(canvas.width,canvas.height,alignment);
  const allowed=angle==='FRONT'?['forehead','nose','chin','periorbital','rightCheek','leftCheek']:[angle==='RIGHT'?'leftCheek':'rightCheek'];
  const rois=roiDefinitions.filter(r=>allowed.includes(r.id)).map(r=>{
    const x=Math.max(0,Math.ceil(r.x)),y=Math.max(0,Math.ceil(r.y));
    return {...r,x,y,w:Math.min(canvas.width,Math.floor(r.x+r.w))-x,h:Math.min(canvas.height,Math.floor(r.y+r.h))-y};
  });
  if(rois.some(r=>r.w<4||r.h<4))throw new Error('INVALID_ROI');
  return { dataUrl:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,angle,rois,exclusions:exclusionBoxes };
}
export function snapshotAngleForRegion(id:string,threeAngle:boolean):SkinAngle {
  return !threeAngle?'FRONT':id==='rightCheek'?'LEFT':id==='leftCheek'?'RIGHT':'FRONT';
}
export const REGION_COLORS:Record<string,string>={forehead:'#67e8f9',rightCheek:'#c4b5fd',leftCheek:'#fda4af',nose:'#fcd34d',chin:'#86efac',periorbital:'#93c5fd'};
