'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, HeartPulse } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import { useMentalConversation } from '../../utils/useMentalConversation';
import { mentalThemeStats, translateMood } from '../../utils/mentalHistory';
import { isDemoMode, STORAGE_KEYS } from '../../utils/attuneMode';
import { RecordHistory } from '../../components/RecordHistory';
import { spokenText } from '../../utils/spokenText';
import { InformationButton } from '../../components/InformationButton';

const PHASES = { ready: 'Hazır', permission: 'Mikrofon başlatılıyor', listening: 'Dinliyor', preparing: 'Yanıt hazırlanıyor', speaking: 'Seslendiriliyor', ending: 'Bitiriliyor', completed: 'Tamamlandı', error: 'Hata' };
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
        {!c.messages.length && <p className="text-sm text-slate-400">Görüşmeyi başlattığınızda konuşabilir veya yazabilirsiniz.</p>}
        {c.messages.map((m, i) => <article key={m.id} data-chat-author={m.sender} data-chat-position={i} data-turn={m.turn} className={`rounded-xl border p-3 text-sm ${m.isCrisis ? 'border-rose-500 bg-rose-950' : m.sender === 'USER' ? 'border-togg-turquoise/30 bg-togg-darkBlue' : 'border-white/10 bg-slate-950'}`}><p className="text-xs text-slate-400">{m.sender === 'USER' ? 'Siz' : 'Attune'} · {m.time}</p><p className="mt-1 whitespace-pre-line break-words">{spokenText(m.text)}</p><span data-provider-kind={m.providerBadge?.split(" ")[0]} /></article>)}
      </div>;

  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-5">
      {demo && <p className="text-amber-200">Demo / Örnek içerik — gerçek görüşme geçmişiniz değildir.</p>}
      <div className="flex items-center gap-2 text-togg-turquoise"><HeartPulse /><span>Sesli İyi Oluş Asistanı</span></div>
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">Bugün nasıl hissediyorsunuz?</h1><InformationButton title="Ruhsal iyi oluş"><p>Park halinde konuşabilir veya yazabilirsiniz. Bu hizmet klinik tanı ve acil yardım hizmeti değildir. Sesli yanıt yapay zekâ tarafından üretilir.</p></InformationButton></div>
      <p className="text-sm text-slate-300">Park halinde konuşabilir veya yazarak devam edebilirsiniz. Bu hizmet klinik tanı veya acil yardım hizmeti değildir.</p>
      <div className="flex gap-3">
        <button onClick={() => c.active ? c.phase === 'permission' && !c.messages.length ? c.cancelConversation() : void c.finish() : c.start()} disabled={!isParked || c.phase === 'ending' || (!c.active && !c.serviceConsent)} className="flex-1 bg-togg-turquoise text-togg-darkBlue font-bold p-4 rounded-xl disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed flex gap-2 justify-center items-center">{c.active ? <MicOff /> : <Mic />}<span>{c.active ? c.phase === 'permission' && !c.messages.length ? 'Başlatmayı iptal et' : 'Görüşmeyi Bitir' : 'Görüşmeyi Başlat'}</span></button>
        <button onClick={() => c.setVoiceEnabled(!c.voiceEnabled)} className="border border-white/20 rounded-xl p-3" aria-label={c.voiceEnabled ? 'Sesli yanıtı kapat' : 'Sesli yanıtı aç'}>{c.voiceEnabled ? <Volume2 /> : <VolumeX />}</button>
      </div>
      <div className="flex items-start gap-2"><label className="flex min-h-11 items-start gap-3 text-sm flex-1"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={c.serviceConsent} onChange={e => c.setServiceConsent(e.target.checked)} aria-label="TOGG Attune hizmet onayı" /><span><strong className="block mb-1">TOGG Attune hizmet onayı</strong>Sesimin konuşmaya çevrilmesine; metnimin yanıt, seslendirme ve özet için işlenmesine izin veriyorum.</span></label><InformationButton title="TOGG Attune hizmet aydınlatması"><p>Normal görüşmede yazdığınız ve konuşmadan elde edilen metinler, yanıt ve özet oluşturmak üzere OpenAI’a gönderilir. Yanıt metni Türkçe yapay ses üretimi için OpenAI’a gönderilir.</p><p>Konuşma tanıma tarayıcının/cihazın hizmetini kullanır; bu hizmet sesi buluta aktarabilir. Kullanılan hizmetin kimliği bu uygulamada doğrulanmamıştır. Tarayıcı/cihaz mikrofon izni ayrıca gereklidir.</p><p>Uygulama ham sesi saklamaz. Tamamlanan özet ve tam konuşma dökümü için Gizlilik ekranında ayrı saklama tercihleri vardır. Döküm varsayılan kapalıdır; açılırsa özet saklama izniyle birlikte yalnız bu tarayıcıda aynı oturum kaydında tutulur. Onayı geri çekmek aktif görüşmeyi durdurur; geçmiş sağlayıcı isteklerini silmez.</p><p>Bu açıklama uygulamanın mevcut teknik işleyişini anlatır; şirket tarafından onaylanmış bir hukuki belge değildir.</p></InformationButton></div>
      <p role="status" data-conversation-phase={c.phase} className="text-sm text-togg-turquoise">{c.phase === 'preparing' && ['loadingSpeech', 'starting'].includes(c.voiceState) ? 'Ses hazırlanıyor — yanıtı görüşme akışından okuyabilirsiniz' : PHASES[c.phase]}{c.active && c.textMode && c.phase === 'ready' ? ' — yazarak devam edin' : ''}</p>
      <p className="text-xs" data-voice-state={c.voiceState}>{!c.voiceEnabled ? 'Sessiz' : c.voiceState === 'speaking' ? 'Sesli Yanıt Oynatılıyor' : c.voiceState === 'starting' ? 'Sesli Yanıt Başlatılıyor' : c.voiceState === 'ready' ? 'Sesli Yanıt Hazır' : c.voiceState === 'failed' ? 'Sesli Yanıt Başarısız' : c.voiceState === 'loadingSpeech' ? 'Ses hazırlanıyor' : c.voiceState === 'loading' ? 'Sesler Yükleniyor' : 'Sesli Yanıt Kullanılamıyor'}</p>
      {c.phase === 'ending' && <button onClick={c.cancelSummary} className="block w-fit text-sm px-3 py-2 rounded-xl border border-togg-turquoise text-togg-turquoise">Özet hazırlamayı iptal et</button>}
      {c.voiceNotice && <p role="status" className="text-xs text-amber-200">{c.voiceNotice}</p>}
      {c.notice && <p role="status" className="text-sm text-amber-200">{c.notice}</p>}
      {!isParked && <p className="text-amber-200">Sürüş sırasında görüşme kapalıdır. Lütfen dikkatinizi yola verin.</p>}
      <button onClick={() => { c.switchText(); if (!c.active) c.start(true); }} disabled={!isParked || c.phase === 'ending' || !c.serviceConsent} className="min-h-11 text-sm underline disabled:text-slate-500 disabled:cursor-not-allowed">İsterseniz yazabilirsiniz</button>
      {c.textMode && <div className="flex gap-2"><input aria-label="Görüşme mesajı" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }} placeholder="Düşüncelerinizi yazın..." disabled={!c.active || ['preparing', 'speaking', 'ending', 'error'].includes(c.phase)} className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2" /><button onClick={send} disabled={!c.active || !input.trim() || ['preparing', 'speaking', 'ending', 'error'].includes(c.phase)} className="bg-togg-turquoise text-togg-darkBlue rounded-xl p-3 disabled:opacity-50">Gönder</button></div>}
      <p className="text-xs">Acil Kriz Destek: <strong>112 Acil Çağrı</strong></p>
    </section>
    {!c.active && c.messages.some(m => m.sender === 'AI' && m.isCrisis) && <section role="alert" aria-label="Acil destek yanıtı" className="rounded-2xl border border-rose-500 bg-rose-950 p-6"><h2 className="font-bold mb-3">Acil destek</h2>{c.messages.filter(m => m.sender === 'AI' && m.isCrisis).slice(-1).map(m => <article key={m.id} data-chat-author="AI" data-turn={m.turn}><p className="text-xs text-rose-200">Attune · {m.time}</p><p className="whitespace-pre-line break-words mt-2">{spokenText(m.text)}</p></article>)}</section>}
    {c.active && isParked && <section data-live-transcript className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-5"><h2 className="font-bold">Görüşme Akışı</h2>{conversationTranscript}<button onClick={referral} className="text-togg-turquoise font-bold text-sm">PSİKOLOG SEÇENEKLERİNİ GÖR</button></section>}
    {!c.active && isParked && !demo && <section data-mental-history className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Görüşme temaları</h2><InformationButton title="Görüşme temaları"><p>Bu grafik tanı veya ölçülmüş stres düzeyi değildir; tamamlanmış ve saklama izinli görüşmelerdeki tema paylarını gösterir. Çok temalı görüşmeler her temaya bir kez katkı verir. Tamamlanma ve izin bilgisi doğrulanamayan eski kayıtlar grafiğe katılmaz.</p></InformationButton></div>

      {!stats.mentions ? <p>Henüz tema verisi yok.</p> : <>
        <div className="flex flex-wrap gap-4 items-center"><div role="img" aria-label="Görüşme tema payları" className="w-32 h-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }} /><div className="space-y-2">{stats.rows.map((r, i) => <button key={r.theme} onClick={() => setTheme(r.theme)} aria-pressed={theme === r.theme} className="block text-xs text-left rounded-lg px-2 py-1 hover:bg-white/5"><span style={{ color: COLORS[i % COLORS.length] }}>● </span>{r.theme}: %{r.percent} ({r.count}/{stats.mentions} tema kaydı)</button>)}</div></div>
        <p className="text-xs">{stats.sessions} tamamlanmış izinli görüşme, {stats.mentions} tema kaydı. Çok temalı görüşmeler her farklı temaya bir kez katkı verir. Yüzdeler toplamı 100 olacak şekilde yuvarlanır.</p>
        {theme && <div data-selected-theme><h3 className="font-bold">{theme}</h3>{c.history.filter(h => [2,3].includes(h.schemaVersion || 0) && h.completed && h.consented && h.themes.includes(theme)).map(h => <p className="text-sm mt-2" key={h.id}>{translateMood(h.summaryText)}</p>)}</div>}
      </>}

      {c.active && <p className="text-xs text-slate-400">Bu görüşme bitmeden yeni özet veya geçmiş kaydı oluşturulmaz.</p>}

      <RecordHistory category="mental" parked={isParked} />
      <button onClick={referral} className="text-togg-turquoise font-bold text-sm">PSİKOLOG SEÇENEKLERİNİ GÖR</button>
    </section>}

  </div>;
}
