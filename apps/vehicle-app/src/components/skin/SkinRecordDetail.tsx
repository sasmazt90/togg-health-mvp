'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {REGION_ORDER,SKIN_REGIONS} from '../../data/skinDemoFixture';
import type {HealthRecord} from '../../utils/healthRecords';
import {SkinRegionNavigator} from './SkinRegionNavigator';
import {SkinIndicatorValue} from './SkinIndicatorValue';
import {SkinFacePanel} from './SkinFacePanel';
import {snapshotAngleForRegion} from '../../utils/skinSnapshot';
import {readSkinSnapshots,skinSnapshotVersion,subscribeSkinSnapshots} from '../../utils/skinVolatileHistory';

/** History uses current session pixels when available; persistent history stays numeric. */
export function SkinRecordDetail({record}:{record:HealthRecord}){
 const regions=REGION_ORDER.filter(id=>Array.isArray(record.indicators?.[id]));
 const [index,setIndex]=useState(0);
 const [selection,setSelection]=useState<{region:string;criterion:string}|null>(null);
 useSyncExternalStore(subscribeSkinSnapshots,skinSnapshotVersion,()=>0);
 useEffect(()=>{setIndex(0);setSelection(null);},[record.id]);
 const id=regions[index]||regions[0];
 if(!id)return <p>Bu kayıtta bölge ölçümü yok.</p>;
 const region={...SKIN_REGIONS[id],index:index+1};
 const snapshot=readSkinSnapshots(record.id)?.[snapshotAngleForRegion(id,record.comparisonScope==='three-angle-v2')];
 const selected=selection?.region===id?selection.criterion:null;
 const previous=()=>{setIndex(v=>(v+regions.length-1)%regions.length);setSelection(null);};
 const next=()=>{setIndex(v=>(v+1)%regions.length);setSelection(null);};
 return <div className="space-y-4" data-skin-record-carousel>
  <h3 className="font-bold text-lg">{region.nameTr}</h3>
  <div className={snapshot?'grid lg:grid-cols-2 items-start gap-5':'space-y-4'}>
   {snapshot&&<SkinFacePanel currentRegion={region} snapshot={snapshot} selectedCriterion={selected} onPrev={previous} onNext={next}/>}
   <div className="grid sm:grid-cols-2 gap-3">{record.indicators[id].map((v:any)=><button type="button" key={v.id} data-skin-record-indicator={v.id} aria-pressed={selected===v.id} onClick={()=>setSelection(selected===v.id?null:{region:id,criterion:v.id})} className={`rounded-xl border p-4 space-y-2 text-left ${selected===v.id?'border-togg-turquoise':'border-white/10'}`}><h4 className="text-sm font-semibold">{v.label}</h4><SkinIndicatorValue indicator={v}/></button>)}</div>
  </div>
  {!snapshot&&<SkinRegionNavigator currentRegion={region} total={regions.length} onPrev={previous} onNext={next}/>}
 </div>;
}
