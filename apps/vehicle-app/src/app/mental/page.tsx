'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, HeartPulse } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import { useMentalConversation } from '../../utils/useMentalConversation';
import { mentalThemeStats, translateMood } from '../../utils/mentalHistory';
import { isDemoMode, STORAGE_KEYS } from '../../utils/attuneMode';

const PHASES = { ready: 'Hazır', listening: 'Dinliyor', preparing: 'Yanıt hazırlanıyor', speaking: 'Seslendiriliyor', ending: 'Bitiriliyor', completed: 'Tamamlandı', error: 'Hata' };
const COLORS = ['#00c2e7', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#facc15'];

export default function MentalPage() {
  const { isParked } = useVehicle();
  const router = useRouter();
  const c = useMentalConversation(isParked);
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoMode()), []);
  const transcript = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const stats = mentalThemeStats(c.history);
  useEffect(() => {
    if (follow.current && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [c.messages, c.phase]);
  const send = () => { if (!input.trim()) return; void c.send(input); setInput(''); };
  const referral = () => {
    const demo = isDemoMode();
    try { localStorage.setItem(demo ? STORAGE_KEYS.DEMO_REFERRAL : STORAGE_KEYS.REFERRAL_CONTEXT, JSON.stringify({
      sourceModule: 'MENTAL', specialty: 'Klinik Psikoloji', reasonSummary: 'Kullanıcının klinik psikolog seçeneklerini inceleme talebi.',
      timestamp: new Date().toISOString(), isDemo: demo, metricsSummary: { recurringThemes: [...new Set(c.history.flatMap(h => h.themes))] }
    })); } catch {}
    router.push('/care?specialty=Klinik%20Psikoloji&from=mental' + (demo ? '&demo=1' : ''));
  };
  let angle = 0;
  const gradient = stats.rows.map((row, i) => { const start = angle; angle += row.percent * 3.6; return `${COLORS[i % COLORS.length]} ${start}deg ${angle}deg`; }).join(', ');

  const conversationTranscript = <div ref={transcript} data-conversation-transcript className="max-h-[28rem] overflow-y-auto space-y-3" onScroll={() => { const el = transcript.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
        {!c.messages.length && <p className="text-sm text-slate-400">Merhaba, bugün kendinizi nasıl hissediyorsunuz? Paylaşmak istediğiniz bir konu varsa dinliyorum.</p>}
        {c.messages.map((m, i) => <article key={m.id} data-chat-author={m.sender} data-chat-position={i} data-turn={m.turn} className={`rounded-xl border p-3 text-sm ${m.isCrisis ? 'border-rose-500 bg-rose-950' : m.sender === 'USER' ? 'border-togg-turquoise/30 bg-togg-darkBlue' : 'border-white/10 bg-slate-950'}`}><p className="text-xs text-slate-400">{m.sender === 'USER' ? 'Siz' : 'Attune'} · {m.time}</p><p className="mt-1">{m.text}</p>{m.providerBadge && <p className="mt-2 text-xs text-togg-turquoise">{m.providerBadge}</p>}</article>)}
      </div>;

  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2 text-togg-turquoise"><HeartPulse /><span>Sesli İyi Oluş Asistanı</span></div>
      <h1 className="text-2xl font-bold">Bugün nasıl hissediyorsunuz?</h1>
      <p className="text-sm text-slate-300">Park halinde konuşabilir veya yazarak devam edebilirsiniz. Bu hizmet klinik tanı veya acil yardım hizmeti değildir.</p>
      <p className="text-xs text-slate-400" data-provider-config>{c.provider.apiKeyConfigured ? 'OpenAI anahtarı yapılandırılmış; bağlantı başarısı her gerçek yanıtta ayrıca gösterilir.' : 'LOCAL_DEMO — Yerel Kural Motoru (Demo), OpenAI anahtarı yok.'}</p>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={c.cloudConsent} onChange={e => c.setCloudConsent(e.target.checked)} aria-label="OpenAI bulut aktarımı onayı" />Görüşme metnimin yanıt ve özet için OpenAI’a gönderilmesine izin veriyorum. Kapalıyken yerel demo motoru kullanılır.</label>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={c.speechConsent} onChange={e => c.setSpeechConsent(e.target.checked)} aria-label="Ses aktarımı onayı" />Sesimin tarayıcının konuşma tanıma hizmetine aktarılmasına izin veriyorum. Bu hizmet bulutta çalışabilir. Ham ses bu uygulamada saklanmaz.</label>
      <label className="flex gap-2 items-center text-xs">Yanıt sesi<select aria-label="Yanıt sesi" value={c.speechSource} onChange={e => c.setSpeechSource(e.target.value as 'native' | 'openai')} disabled={c.active} className="bg-slate-950 p-2 rounded"><option value="native">Tarayıcı Türkçe sesi</option><option value="openai" disabled={!c.cloudConsent || !c.provider.apiKeyConfigured}>OpenAI Türkçe sesi (bulut)</option></select></label>
      <p className="text-xs text-slate-400">Sesli yanıt yapay zekâ tarafından üretilir. Ses kalitesi kullanılan hizmet ve cihaza bağlıdır.</p>
      <div className="flex gap-3">
        <button onClick={() => c.active ? void c.finish() : c.start()} disabled={!isParked || c.phase === 'ending'} className="flex-1 bg-togg-turquoise text-togg-darkBlue font-bold p-4 rounded-xl disabled:opacity-50 flex gap-2 justify-center items-center">{c.active ? <MicOff /> : <Mic />}<span>{c.active ? 'Görüşmeyi Bitir' : 'Görüşmeyi Başlat'}</span></button>
        <button onClick={() => c.setVoiceEnabled(!c.voiceEnabled)} className="border border-white/20 rounded-xl p-3" aria-label={c.voiceEnabled ? 'Sesli yanıtı kapat' : 'Sesli yanıtı aç'}>{c.voiceEnabled ? <Volume2 /> : <VolumeX />}</button>
      </div>
      <p role="status" data-conversation-phase={c.phase} className="text-sm text-togg-turquoise">{PHASES[c.phase]}{c.active && c.textMode && c.phase === 'ready' ? ' — yazarak devam edin' : ''}</p>
      <p className="text-xs" data-voice-state={c.voiceState}>{!c.voiceEnabled ? 'Sessiz' : c.voiceState === 'speaking' ? 'Sesli Yanıt Oynatılıyor' : c.voiceState === 'starting' ? 'Sesli Yanıt Başlatılıyor' : c.voiceState === 'ready' ? 'Sesli Yanıt Hazır' : c.voiceState === 'failed' ? 'Sesli Yanıt Başarısız' : c.voiceState === 'loading' ? 'Sesler Yükleniyor' : 'Sesli Yanıt Kullanılamıyor'}</p>
      {c.voiceNotice && <p role="status" className="text-xs text-amber-200">{c.voiceNotice}</p>}
      {c.notice && <p role="status" className="text-sm text-amber-200">{c.notice}</p>}
      {!isParked && <p className="text-amber-200">Sürüş sırasında görüşme kapalıdır. Lütfen dikkatinizi yola verin.</p>}
      <button onClick={() => { c.switchText(); if (!c.active) c.start(true); }} disabled={!isParked || c.phase === 'ending'} className="text-sm underline disabled:opacity-50">İsterseniz yazabilirsiniz</button>
      {c.textMode && <div className="flex gap-2"><input aria-label="Görüşme mesajı" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }} placeholder="Düşüncelerinizi yazın..." disabled={!c.active || ['preparing', 'speaking', 'ending', 'error'].includes(c.phase)} className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2" /><button onClick={send} disabled={!c.active || !input.trim() || ['preparing', 'speaking', 'ending', 'error'].includes(c.phase)} className="bg-togg-turquoise text-togg-darkBlue rounded-xl p-3 disabled:opacity-50">Gönder</button></div>}
      {!c.active && conversationTranscript}
      <p className="text-xs">Acil Kriz Destek: <strong>112 Acil Çağrı</strong></p>
    </section>
    {c.active && isParked && <section data-live-transcript className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-5"><h2 className="font-bold">Görüşme Akışı</h2>{conversationTranscript}</section>}
    {!c.active && isParked && !demo && <section data-mental-history className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-5">
      <h2 className="font-bold">Stres Ağırlıkları Özeti</h2>
      <p className="text-xs text-slate-400">Bu grafik tanı veya ölçülmüş stres düzeyi değildir; tamamlanmış ve saklama izinli görüşmelerdeki tema paylarını gösterir.</p>
      {!stats.mentions ? <p>Henüz tema verisi yok. Eski kayıtların tamamlanma ve izin bilgisi doğrulanamadığı için grafiğe katılmaz.</p> : <>
        <div className="flex gap-4 items-center"><div role="img" aria-label="Görüşme tema payları" className="w-32 h-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }} /><div className="space-y-2">{stats.rows.map((r, i) => <button key={r.theme} onClick={() => setTheme(r.theme)} className="block text-xs text-left"><span style={{ color: COLORS[i % COLORS.length] }}>● </span>{r.theme}: %{r.percent} ({r.count}/{stats.mentions} tema kaydı)</button>)}</div></div>
        <p className="text-xs">{stats.sessions} tamamlanmış izinli görüşme, {stats.mentions} tema kaydı. Çok temalı görüşmeler her farklı temaya bir kez katkı verir. Yüzdeler toplamı 100 olacak şekilde yuvarlanır.</p>
        {theme && <div data-selected-theme><h3 className="font-bold">{theme}</h3>{c.history.filter(h => h.schemaVersion === 2 && h.completed && h.consented && h.themes.includes(theme)).map(h => <p className="text-sm mt-2" key={h.id}>{translateMood(h.summaryText)}</p>)}</div>}
      </>}
      <h2 className="font-bold">Kayıtlı Görüşme Özetleri</h2>
      <p>{c.history.length} kayıtlı görüşme</p>
      {c.active && <p className="text-xs text-slate-400">Bu görüşme bitmeden yeni özet veya geçmiş kaydı oluşturulmaz.</p>}
      {c.summary && <div data-current-summary><h3 className="text-sm font-bold">Tamamlanan görüşmenin özeti</h3><p className="text-sm">{translateMood(c.summary.summaryText)}</p><p data-summary-provider className="text-xs text-togg-turquoise">{c.summary.providerType === 'LIVE_OPENAI' ? 'LIVE_OPENAI — OpenAI özeti' : c.summary.providerType === 'LOCAL_DEMO_FALLBACK' ? 'LOCAL_DEMO_FALLBACK — sağlayıcıya ulaşılamadı, yerel özet' : c.summary.providerType === 'LOCAL_DEMO' ? 'LOCAL_DEMO — yerel özet' : 'Özet sağlayıcı bilgisi yok'}</p></div>}
      {!c.history.length && <p>Henüz kayıtlı görüşme yok. Yalnızca gerçekleştirdiğiniz ve kaydedilmesine izin verdiğiniz görüşmeler burada gösterilir.</p>}
      {[...c.history].reverse().map(h => <article key={h.id} data-history-id={h.id} className="border-t border-white/10 pt-3 text-sm"><time dateTime={h.date}>{new Date(h.date).toLocaleString('tr-TR')}</time><p>{translateMood(h.summaryText)}</p><p className="text-xs text-slate-400">{h.themes.join(' • ')}{h.moodTrend ? ` · ${translateMood(h.moodTrend)}` : ''}</p>{h.schemaVersion !== 2 && <p className="text-xs text-slate-400">Eski kayıt; tamamlanma ve izin bilgisi doğrulanamadı.</p>}</article>)}
      <p className="text-xs text-slate-400">Özet oluşturma ve kalıcı saklama ayrı işlemlerdir. Saklama izni Gizlilik & İzinler menüsünden yönetilir. Ham ses ve tam görüşme dökümü saklanmaz.</p>
      <button onClick={referral} className="text-togg-turquoise font-bold text-sm">PSİKOLOG SEÇENEKLERİNİ GÖR</button>
    </section>}
    {demo && <p className="text-amber-200">Demo / Örnek içerik — gerçek görüşme geçmişiniz değildir.</p>}
  </div>;
}
