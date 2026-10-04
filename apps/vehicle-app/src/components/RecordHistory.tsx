'use client';
import { useEffect, useRef, useState } from 'react';
import { AccessibleDialog } from './AccessibleDialog';
import { MentalSessionRows } from './MentalSessionRows';
import { ContinuousVisionResult, OrientationResult } from './ContinuousVisionResult';
import { HealthCategory, HealthRecord, RECORD_LABELS, prepareHealthRecords, deleteHealthRecord, recordDate } from '../utils/healthRecords';

export function RecordHistory({ category, parked }: { category: HealthCategory; parked: boolean }) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selected, setSelected] = useState<HealthRecord | null>(null);
  const [viewed, setViewed] = useState<OrientationResult | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const parkedRef = useRef(parked); parkedRef.current = parked;
  useEffect(() => {
    let mounted = true;
    const refresh = () => { void prepareHealthRecords(category).then(rows => { if (mounted) setRecords(rows); }).catch(error => { if (mounted) setNotice(error.message); }); };
    refresh(); window.addEventListener('attune-records', refresh); window.addEventListener('storage', refresh);
    return () => { mounted = false; window.removeEventListener('attune-records', refresh); window.removeEventListener('storage', refresh); };
  }, [category]);
  const close = () => { if (!inFlight.current) setSelected(null); };
  const remove = async () => {
    if (!selected || !parkedRef.current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setNotice('');
    try { setNotice(await deleteHealthRecord(category, selected.id)); setSelected(null); requestAnimationFrame(() => heading.current?.focus()); }
    catch (error) { setNotice((error as Error).message); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <section data-record-history={category} className="space-y-3">
    <h2 ref={heading} tabIndex={-1} className="font-bold">{RECORD_LABELS[category]} kayıtları</h2>
    <p className="text-sm text-slate-400">{records.length} {category === 'mental' ? 'kayıtlı görüşme' : 'kayıt'}</p>
    {notice && <p role="status" className="text-sm text-amber-200">{notice}</p>}
    {!records.length && <p className="text-sm text-slate-400">Henüz kayıt yok.</p>}
    {category === 'mental' ? <MentalSessionRows records={records} onDelete={r=>{setNotice('');setSelected(r);}} parked={parked} busy={busy}/> : records.map(r => <article key={r.id} data-record-id={r.id} className="rounded-xl border border-white/10 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><time className="text-xs text-slate-400">{recordDate(r)}</time><button type="button" disabled={!parked || busy} aria-label={`${RECORD_LABELS[category]} kaydını sil: ${recordDate(r)}`} onClick={() => { setNotice(''); setSelected(r); }} className="min-h-11 px-4 rounded-xl border border-rose-400/40 text-rose-200 disabled:opacity-40 disabled:cursor-not-allowed">Sil</button></div>
      <p className="text-sm break-words">{category === 'skin' ? r.clinicalNoteTr || `${r.highestChangeRegion || 'Cilt'} • ${r.isBaseline ? 'Referans taraması' : r.comparisonUnavailable ? 'Karşılaştırma yok' : 'Analiz sonucu'}` : ['landolt-orientation-continuous-v1','landolt-orientation-guided-v2'].includes(r.protocolVersion) ? `Açısal ön değerlendirme · ${r.validTrials || 0} geçerli deneme · ${r.notVisible || 0} göremedi. Görme keskinliği bu protokolle hesaplanmadı.` : `Eski dört yönlü protokol · Keskinlik: ${r.acuityRightSnellen || '—'} • ${r.acuityLeftSnellen || '—'}`}</p>
      {category==='vision'&&r.protocolVersion==='landolt-orientation-guided-v2'&&Array.isArray(r.trials)&&<button className="min-h-11 px-4 rounded-xl border border-white/20 disabled:opacity-40" disabled={!parked} onClick={()=>setViewed(r as OrientationResult)}>Sonucu Aç</button>}
    </article>)}
    {viewed&&<AccessibleDialog title="Yön hizalama sonucu" onClose={()=>setViewed(null)} className="w-full max-w-2xl rounded-2xl border border-white/20 bg-cockpit-surface p-5 space-y-4"><div className="flex justify-between gap-3"><time>{recordDate(viewed)}</time><button className="min-h-11 min-w-11 rounded-xl border border-white/20" aria-label="Sonuç penceresini kapat" onClick={()=>setViewed(null)}>✕</button></div><ContinuousVisionResult result={viewed}/></AccessibleDialog>}
    {selected && <AccessibleDialog title="Bu kaydı silmek istiyor musunuz?" onClose={close} className="w-full max-w-lg rounded-2xl border border-white/20 bg-cockpit-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold">Bu kaydı silmek istiyor musunuz?</h2><button type="button" disabled={busy} aria-label="Silme penceresini kapat" onClick={close} className="min-h-11 min-w-11 rounded-xl border border-white/20 disabled:opacity-40">✕</button></div>
      <p>{RECORD_LABELS[category]} · {recordDate(selected)}</p><p className="text-sm text-slate-300">Bu işlem geri alınamaz.</p>
      {notice && <p role="alert" className="text-sm text-amber-200">{notice}</p>}
      {!parked && <p role="status">Silme yalnız PARK durumunda kullanılabilir.</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-white/20 px-4 disabled:opacity-40">Hayır, vazgeç</button><button type="button" disabled={busy || !parked} onClick={() => void remove()} className="min-h-11 rounded-xl bg-rose-700 px-4 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed">{busy ? 'Siliniyor…' : 'Evet, sil'}</button></div>
    </AccessibleDialog>}
  </section>;
}
