import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { VisionTracker } from './visionTracking';
import type { Eye } from './spokenVision';
let face:FaceLandmarker,hand:HandLandmarker,tracker=new VisionTracker(),delegate:'CPU'|'GPU'='GPU';
let canvas:OffscreenCanvas,ctx:OffscreenCanvasRenderingContext2D;
self.onmessage=async(event:MessageEvent)=>{
 const {id,type,frame,frameTime,eye}=event.data;
 try{
  if(type==='initialize'){
   delegate=event.data.delegate==='CPU'?'CPU':'GPU';
   const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
   face=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate},runningMode:'IMAGE',numFaces:2,outputFaceBlendshapes:true});
   hand=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate},runningMode:'IMAGE',numHands:2});
   tracker=new VisionTracker();self.postMessage({id,ready:true});return;
  }
  if(!canvas||canvas.width!==frame.width||canvas.height!==frame.height){canvas=new OffscreenCanvas(frame.width,frame.height);ctx=canvas.getContext('2d',{willReadFrequently:true})!;}
  ctx.drawImage(frame,0,0);const start=performance.now(),f=face.detect(canvas),h=hand.detect(canvas),categories=f.faceBlendshapes[0]?.categories||[];
  const model={landmarks:f.faceLandmarks,hands:h.landmarks,blinkRight:categories.find(v=>v.categoryName==='eyeBlinkRight')?.score??null,blinkLeft:categories.find(v=>v.categoryName==='eyeBlinkLeft')?.score??null,inferenceMs:performance.now()-start,frameTime};
  const result=tracker.assess(ctx as unknown as CanvasRenderingContext2D,canvas.width,canvas.height,model,frameTime,eye as Eye|null);
  self.postMessage({id,evidence:{...result,delegate}});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}finally{frame?.close();}
};
