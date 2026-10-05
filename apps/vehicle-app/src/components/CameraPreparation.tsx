'use client';
import { useState, type RefObject } from 'react';
import { InformationButton } from './InformationButton';
import type { FaceAlignment, ImageQuality } from '../utils/skinAnalyzer';

export function cameraCrop(points?:{x:number;y:number}[]) {
 if(!points || points.length<468)return {x:0,y:0,width:1,height:1};
 const minX=Math.min(...points.slice(0,468).map(p=>p.x)),maxX=Math.max(...points.slice(0,468).map(p=>p.x));
 const minY=Math.min(...points.slice(0,468).map(p=>p.y)),maxY=Math.max(...points.slice(0,468).map(p=>p.y));
 const w=maxX-minX,h=maxY-minY;
 const x=Math.max(0,minX-w*.32),y=Math.max(0,minY-h*.35);
 return {x,y,width:Math.min(1,maxX+w*.32)-x,height:Math.min(1,maxY+h*.16)-y};
}
/** Display crop only. Analysis always reads the native uncropped camera. */
export function CameraPreview({videoRef,landmarks,vision=false}:{videoRef:RefObject<HTMLVideoElement|null>;landmarks?:{x:number;y:number}[];vision?:boolean}) {
 const [ratio,setRatio]=useState(4/3),crop=cameraCrop(landmarks);
 return <div data-camera-preview className="relative w-full max-w-[480px] mx-auto overflow-hidden rounded-2xl bg-black" style={{aspectRatio:ratio*crop.width/crop.height}}>
  <video ref={videoRef} autoPlay playsInline muted data-vision-camera={vision?true:undefined} onLoadedMetadata={e=>{if(e.currentTarget.videoHeight)setRatio(e.currentTarget.videoWidth/e.currentTarget.videoHeight);}} className="absolute max-w-none" style={{width:`${100/crop.width}%`,height:'auto',left:`${-100*crop.x/crop.width}%`,top:`${-100*crop.y/crop.height}%`}}/>
 </div>;
}
export interface CameraResolution { width:number; height:number; maxWidth?:number; maxHeight?:number }
export function CameraPreparation({alignment,quality,position,fresh=true,resolution}:{alignment?:FaceAlignment;quality?:ImageQuality;position:string;fresh?:boolean;resolution?:CameraResolution}) {
 const face=fresh&&alignment?.isMediaPipeActive&&alignment.faceCount===1;
 const rows=[['Yüz / Kadraj',!fresh?'Görüntü bekleniyor':!face?'Yüzünüzü kameraya gösterin':'Yüz görünüyor'],['Işık',!face?'Ölçüm bekleniyor':quality?.avgLuminance!>=40&&quality?.avgLuminance!<=220?'İyi':quality?.status==='TOO_BRIGHT'?'Parlamayı azaltın':'Yüzünüzü aydınlatın'],['Netlik',!face?'Ölçüm bekleniyor':quality?.blurScore!>=4?'İyi':'Sabit durun; kamerayı kontrol edin'],['Konum',position],['Görüntü',fresh?'Güncel':'Kamera görüntüsü güncel değil']];
 return <div className="space-y-2" data-camera-preparation>{rows.map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2 p-3 rounded-xl border border-white/10 text-sm"><span>{label}</span><span className={value==='İyi'||value==='Güncel'||value==='Konum hazır'?'text-emerald-400':'text-slate-300'}>{value}</span></div>)}{resolution && resolution.width<1280 && <p role="status" className="text-xs text-amber-200">Kamera ayrıntısı sınırlı. Daha net bir sonuç için iyi ışıkta, alın ve çene kadrajda kalacak şekilde yeniden çekin; mümkünse daha yüksek çözünürlüklü kamera seçin.</p>}<InformationButton title="Kamera hazırlığı"><p>Önizleme yüz çevresine görsel olarak büyütülür; kamera çözünürlüğü, fiziksel uzaklık veya kalite puanı değişmez. Alın ve çene korunur. Görüntü aynasızdır. Işık ve netlik gerçek kamera karesindeki yüz piksellerinden ölçülür; klinik yeterlilik veya mutlak mesafe ölçümü değildir. Görme ve cilt için kabul edilen pozlar farklıdır. Donmuş kare ile test ilerletilmez.</p>{resolution && <p data-camera-resolution>Alınan kamera: {resolution.width} × {resolution.height} piksel. {resolution.maxWidth && resolution.maxHeight ? `Cihazın bildirdiği üst sınırlar: ${resolution.maxWidth} × ${resolution.maxHeight}; bu iki sınırın birlikte desteklendiği garanti değildir.` : "Cihaz çözünürlük üst sınırlarını bildirmedi."} Fotoğraf tuvali gerçek video boyutunu korur; kaynaktaki eksik ayrıntı üretilmez.</p>}</InformationButton></div>;
}
