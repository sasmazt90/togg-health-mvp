'use client';

import { useEffect, useRef, useState } from 'react';
import { checkCrisisTrigger } from '@packages/safety/crisisDetector';
import { isMicrophoneAllowed, isMentalSummarySavingAllowed, isDemoMode } from './attuneMode';
import { MentalHistoryItem, readMentalHistory, saveMentalHistory } from './mentalHistory';

export type ConversationPhase = 'ready' | 'listening' | 'preparing' | 'speaking' | 'ending' | 'completed' | 'error';
export interface ConversationMessage {
  id: string; turn: number; sender: 'USER' | 'AI'; text: string; time: string;
  completed: boolean; isCrisis?: boolean; providerBadge?: string;
}
const API = 'http://localhost:8000/api/mental';
const LABELS: Record<string, string> = {
  'not-allowed': 'Ses girişine izin verilmedi. Tarayıcı mikrofon iznini kontrol edin.',
  'service-not-allowed': 'Konuşma tanıma servisine izin verilmiyor.',
  'audio-capture': 'Mikrofona erişilemiyor.', network: 'Konuşma tanıma servisine ulaşılamadı.',
  'language-not-supported': 'Türkçe konuşma tanıma bu ortamda desteklenmiyor.'
};

export function useMentalConversation(parked: boolean) {
  const [phase, setPhase] = useState<ConversationPhase>('ready');
  const [active, setActive] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState('loading');
  const [textMode, setTextMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [speechConsent, setSpeechConsent] = useState(false);
  const [speechSource, setSpeechSource] = useState<'native' | 'openai'>('native');
  const [history, setHistory] = useState<MentalHistoryItem[]>([]);
  const [summary, setSummary] = useState<MentalHistoryItem | null>(null);
  const [provider, setProvider] = useState({ apiKeyConfigured: false, providerName: 'Yerel Kural Motoru (Demo)' });
  const runtime = useRef({ mounted: false, active: false, epoch: 0, turn: 0, busy: false, failed: false,
    id: '', transcript: [] as ConversationMessage[], recognition: null as any,
    utterance: null as SpeechSynthesisUtterance | null, audio: null as HTMLAudioElement | null,
    audioUrl: null as string | null, controller: null as AbortController | null,
    restart: null as ReturnType<typeof setTimeout> | null, audioEpoch: 0, voiceWaiting: false });
  const settings = useRef({ parked, textMode, voiceEnabled, cloudConsent, speechConsent, speechSource });
  settings.current = { parked, textMode, voiceEnabled, cloudConsent, speechConsent, speechSource };
  const actions = useRef({ listen: () => {}, cancel: (_reason?: string) => {}, send: (_text: string) => {}, audioOff: () => {} });

  function abortRecognition() {
    const r = runtime.current;
    const recognition = r.recognition;
    r.recognition = null; // Identity gate invalidates every late native event.
    if (recognition) { try { recognition.abort(); } catch {} }
  }
  function stopAudio() {
    const r = runtime.current;
    r.audioEpoch++;
    r.utterance = null;
    window.speechSynthesis?.cancel();
    if (r.audio) { r.audio.onplaying = r.audio.onended = r.audio.onerror = null; r.audio.pause(); r.audio.removeAttribute('src'); r.audio.load(); r.audio = null; }
    if (r.audioUrl) { URL.revokeObjectURL(r.audioUrl); r.audioUrl = null; }
    r.voiceWaiting = false;
  }
  function cleanup() {
    const r = runtime.current;
    if (r.restart) clearTimeout(r.restart);
    r.restart = null;
    abortRecognition(); stopAudio(); r.controller?.abort(); r.controller = null;
  }
  function valid(epoch: number) {
    const r = runtime.current;
    return r.mounted && r.epoch === epoch && r.active && settings.current.parked;
  }
  function resume(epoch: number) {
    if (!valid(epoch)) return;
    runtime.current.busy = false;
    if (settings.current.textMode) { setPhase('ready'); return; }
    // Allow output device and recognition teardown to settle before capture starts.
    runtime.current.restart = setTimeout(() => { if (valid(epoch)) actions.current.listen(); }, 350);
  }
  function cancel(reason?: string) {
    const r = runtime.current;
    r.epoch++; r.active = false; r.busy = false; r.failed = true;
    cleanup();
    if (r.mounted) { setActive(false); setVoiceState('ready'); setPhase(reason ? 'error' : 'ready'); if (reason) setNotice(reason); }
  }
  function listen() {
    const r = runtime.current, epoch = r.epoch;
    if (!valid(epoch) || r.busy || r.recognition || r.voiceWaiting) return;
    if (!isMicrophoneAllowed() || !settings.current.speechConsent) {
      setTextMode(true); setPhase('ready'); setNotice(!isMicrophoneAllowed() ? 'Mikrofon kullanım izni Gizlilik ayarlarında kapalıdır. Yazarak devam edebilirsiniz.' : 'Ses aktarım izni kapalı. Yazarak devam edebilirsiniz.'); return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setTextMode(true); setPhase('ready'); setNotice('Bu tarayıcı konuşma tanımayı desteklemiyor. Yazarak devam edebilirsiniz.'); return; }
    const recognition = new SR(); r.recognition = recognition;
    recognition.lang = 'tr-TR'; recognition.continuous = false; recognition.interimResults = false;
    let accepted = false, failed = false;
    const current = () => valid(epoch) && r.recognition === recognition && isMicrophoneAllowed() && settings.current.speechConsent;
    recognition.onstart = () => { if (current()) { setPhase('listening'); setNotice(null); } else abortRecognition(); };
    recognition.onresult = (event: any) => {
      if (!current() || accepted || r.busy || r.voiceWaiting) return;
      const index = event.resultIndex || 0;
      if (event.results[index]?.isFinal === false) return;
      const transcript = event.results[index]?.[0]?.transcript?.trim();
      if (!transcript) return;
      accepted = true; abortRecognition(); actions.current.send(transcript);
    };
    recognition.onerror = (event: any) => {
      if (!current()) return;
      if (event.error === 'no-speech') return;
      failed = true; abortRecognition(); setTextMode(true); setPhase('ready');
      setNotice((LABELS[event.error] || 'Konuşma tanıma başarısız.') + ' Yazarak devam edebilirsiniz.');
    };
    recognition.onend = () => {
      if (!current()) return;
      r.recognition = null;
      if (!accepted && !failed && !r.busy) resume(epoch);
    };
    try { recognition.start(); } catch { abortRecognition(); setTextMode(true); setPhase('ready'); setNotice('Mikrofon başlatılamadı. Yazarak devam edebilirsiniz.'); }
  }
  async function speak(text: string, epoch: number, crisis: boolean) {
    const r = runtime.current;
    if (!valid(epoch)) return;
    if (!settings.current.voiceEnabled) { if (crisis) { r.active = false; r.busy = false; setActive(false); setPhase('error'); } else resume(epoch); return; }
    abortRecognition(); stopAudio();
    const audioEpoch = r.audioEpoch;
    const current = () => valid(epoch) && r.audioEpoch === audioEpoch;
    r.voiceWaiting = true;
    const end = () => { if (!current()) return; stopAudio(); setVoiceState('ready'); if (!crisis) resume(epoch); else { r.active = false; setActive(false); setPhase('error'); } };
    const fail = () => { if (!current()) return; stopAudio(); setVoiceState('failed'); setVoiceNotice('Sesli yanıt başarısız. Yanıtı metin olarak okuyabilirsiniz.'); setTextMode(true); r.busy = false; setPhase('ready'); if (crisis) { r.active = false; setActive(false); setPhase('error'); } };
    setVoiceState(settings.current.speechSource === 'openai' ? 'loadingSpeech' : 'starting');
    if (settings.current.speechSource === 'openai') {
      if (!settings.current.cloudConsent) { fail(); return; }
      const controller = new AbortController(); r.controller = controller;
      const deadline = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(API + '/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, cloudConsent: true }), signal: controller.signal });
        if (!response.ok) throw new Error('Speech service');
        const blob = await response.blob();
        if (!current()) return;
        setVoiceState('starting');
        const url = URL.createObjectURL(blob); r.audioUrl = url;
        const audio = new Audio(url); r.audio = audio;
        audio.onplaying = () => { if (current()) { setPhase('speaking'); setVoiceState('speaking'); } };
        audio.onended = end; audio.onerror = fail;
        await audio.play();
      } catch { fail(); }
      finally { clearTimeout(deadline); if (r.controller === controller) r.controller = null; }
      return;
    }
    const voice = window.speechSynthesis?.getVoices().find(v => v.lang.toLowerCase().startsWith('tr'));
    if (!voice) { if (current()) { stopAudio(); setVoiceState('unavailable'); setVoiceNotice('Türkçe ses bulunamadı. Yanıtı metin olarak okuyabilirsiniz.'); if (crisis) { r.active = false; setActive(false); setPhase('error'); } else resume(epoch); } return; }
    const u = new SpeechSynthesisUtterance(text); r.utterance = u;
    u.lang = 'tr-TR'; u.voice = voice; u.rate = 0.95;
    u.onstart = () => { if (current()) { setVoiceState('speaking'); setPhase('speaking'); } };
    u.onend = end; u.onerror = fail;
    try { window.speechSynthesis.speak(u); } catch { fail(); }
  }
  function append(message: ConversationMessage) {
    runtime.current.transcript = [...runtime.current.transcript, message];
    setMessages(runtime.current.transcript);
  }
  async function send(value: string) {
    const r = runtime.current, epoch = r.epoch, text = value.trim();
    if (!text || !valid(epoch) || r.busy || r.voiceWaiting || r.failed) return;
    r.busy = true; abortRecognition();
    const turn = ++r.turn, time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const prior = r.transcript.filter(m => m.completed).map(m => ({ role: m.sender === 'USER' ? 'user' : 'assistant', content: m.text }));
    const user: ConversationMessage = { id: `${r.id}-${turn}-user`, turn, sender: 'USER', text, time, completed: false };
    append(user); setPhase('preparing'); setNotice(null);
    const crisis = checkCrisisTrigger(text, !settings.current.parked);
    const controller = new AbortController(); r.controller = controller;
    const deadline = setTimeout(() => controller.abort(), 30000);
    try {
      let data: any;
      if (crisis.isCrisis) data = { reply: crisis.emergencyResponseTr, isCrisis: true, providerType: 'CRISIS_SAFETY_GUARD' };
      else {
        const response = await fetch(API + '/converse', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: text, history: prior, sessionId: r.id, cloudConsent: settings.current.cloudConsent }), signal: controller.signal });
        if (!response.ok) throw new Error('Conversation service');
        data = await response.json();
      }
      if (!valid(epoch)) return;
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Invalid reply');
      r.transcript = r.transcript.map(m => m.id === user.id ? { ...m, completed: true } : m);
      const badge = data.providerType === 'LIVE_OPENAI' ? 'LIVE_OPENAI — OpenAI Canlı' : data.providerType === 'CRISIS_SAFETY_GUARD' ? 'Kriz Güvenlik Filtresi' : data.providerType === 'LOCAL_DEMO_FALLBACK' ? 'LOCAL_DEMO_FALLBACK — sağlayıcıya ulaşılamadı' : 'LOCAL_DEMO — Yerel Model';
      append({ id: `${r.id}-${turn}-ai`, turn, sender: 'AI', text: data.reply, time, completed: true, isCrisis: data.isCrisis, providerBadge: badge });
      if (data.providerType === 'LOCAL_DEMO_FALLBACK') setNotice('Canlı sağlayıcıya ulaşılamadı; bu yanıt yerel demo motorundan geldi.');
      if (data.isCrisis) { r.failed = true; setNotice('Normal görüşme durduruldu. Acil Kriz Destek: 112 Acil Çağrı.'); }
      await speak(data.reply, epoch, !!data.isCrisis);
    } catch {
      if (!valid(epoch)) return;
      r.failed = true; r.busy = false; setPhase('error');
      append({ id: `${r.id}-${turn}-error`, turn, sender: 'AI', text: 'İyi oluş servisine bağlantı kurulamadı. Bu mesaj için değerlendirme oluşturulamadı. Lütfen daha sonra yeniden deneyin.', time, completed: false, providerBadge: 'Servis Bağlantısı Başarısız' });
      setNotice('İyi oluş servisine bağlantı kurulamadı. Görüşme başarılı kayıt olarak sayılmadı. Lütfen görüşmeyi bitirip daha sonra yeniden deneyin.');
    } finally { clearTimeout(deadline); }
  }
  function start(asText = settings.current.textMode) {
    if (!settings.current.parked || runtime.current.active) return;
    cleanup(); const r = runtime.current;
    r.epoch++; r.active = true; r.failed = false; r.busy = false; r.turn = 0; r.id = crypto.randomUUID(); r.transcript = [];
    settings.current.textMode = asText;
    setActive(true); setTextMode(asText); setMessages([]); setSummary(null); setNotice(null); setVoiceNotice(null); setVoiceState('ready'); setPhase('ready');
    if (!asText) listen();
  }
  async function finish() {
    const r = runtime.current;
    if (!r.active) return;
    const failed = r.failed || r.transcript.some(m => !m.completed);
    const completed = r.transcript.filter(m => m.completed);
    const epoch = ++r.epoch; r.active = false; r.busy = false; cleanup(); setActive(false); setPhase('ending');
    if (failed || !completed.some(m => m.sender === 'USER')) { setPhase(failed ? 'error' : 'completed'); setNotice('Boş, iptal edilmiş veya başarısız görüşme geçmişe kaydedilmedi.'); return; }
    const controller = new AbortController(); r.controller = controller;
    const deadline = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(API + '/analyze-session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: completed.map(m => ({ role: m.sender === 'USER' ? 'user' : 'assistant', content: m.text })), cloudConsent: settings.current.cloudConsent }), signal: controller.signal });
      if (!response.ok) throw new Error('Summary service');
      const data = await response.json();
      if (!r.mounted || r.epoch !== epoch || !settings.current.parked) return;
      if (typeof data.summaryText !== 'string' || !data.summaryText.trim() || !Array.isArray(data.themes) || !data.themes.every((t: unknown) => typeof t === 'string')) throw new Error('Invalid summary');
      const item: MentalHistoryItem = { id: r.id, date: new Date().toISOString(), summaryText: data.summaryText, themes: data.themes,
        moodTrend: typeof data.moodTrend === 'string' ? data.moodTrend : undefined, providerType: data.providerType, schemaVersion: 2, completed: true, consented: false };
      setSummary(item); setPhase('completed');
      if (!isDemoMode() && isMentalSummarySavingAllowed()) {
        // This is the last operation before storage. Consent can change during analysis.
        item.consented = true; setHistory(saveMentalHistory(item)); setNotice('Tamamlanan görüşmenin tek özeti kaydedildi.');
      } else setNotice('Özet hazır. Kalıcı saklama izni kapalı; geçmişe kayıt eklenmedi.');
    } catch {
      if (r.mounted && r.epoch === epoch) { setPhase('error'); setNotice('Görüşme özeti oluşturulamadı veya kaydedilemedi; başarılı kayıt eklenmedi.'); }
    } finally { clearTimeout(deadline); }
  }
  function switchText() {
    settings.current.textMode = true; abortRecognition(); setTextMode(true);
    if (runtime.current.active && !runtime.current.busy) setPhase('ready');
  }
  actions.current = { listen, cancel, send, audioOff: () => { if (runtime.current.voiceWaiting) { const epoch = runtime.current.epoch; runtime.current.controller?.abort(); runtime.current.controller = null; stopAudio(); setVoiceState('ready'); resume(epoch); } } };
  useEffect(() => {
    const r = runtime.current; r.mounted = true;
    setHistory(readMentalHistory());
    const controller = new AbortController();
    fetch(API + '/provider-status', { signal: controller.signal }).then(res => res.json()).then(data => {
      if (r.mounted) setProvider(data);
    }).catch(() => {});
    const voices = () => { if (r.mounted && !r.voiceWaiting) setVoiceState(window.speechSynthesis?.getVoices().some(v => v.lang.toLowerCase().startsWith('tr')) ? 'ready' : 'unavailable'); };
    voices(); window.speechSynthesis?.addEventListener('voiceschanged', voices);
    const revoke = () => {
      if (r.active && !isMicrophoneAllowed() && !settings.current.textMode) actions.current.cancel('Mikrofon izni geri çekildi. Görüşme kapatıldı; yazarak yeni görüşme başlatabilirsiniz.');
      if (r.mounted) setHistory(readMentalHistory());
    };
    window.addEventListener('storage', revoke); window.addEventListener('attune-privacy', revoke);
    return () => { r.mounted = false; actions.current.cancel(); controller.abort(); window.speechSynthesis?.removeEventListener('voiceschanged', voices); window.removeEventListener('storage', revoke); window.removeEventListener('attune-privacy', revoke); };
  }, []);
  useEffect(() => { if (!parked && (runtime.current.active || phase === 'ending')) actions.current.cancel('Sürüş geçişinde görüşme güvenle kapatıldı. Park ettiğinizde yeni görüşme başlatabilirsiniz.'); }, [parked, phase]);
  useEffect(() => { if (!voiceEnabled) actions.current.audioOff(); }, [voiceEnabled]);
  function changeCloud(value: boolean) { if (!value && (runtime.current.active || phase === 'ending')) cancel('Bulut aktarım izni geri çekildi. Görüşme kapatıldı.'); setCloudConsent(value); }
  function changeSpeech(value: boolean) { if (!value && runtime.current.active) cancel('Ses aktarım izni geri çekildi. Görüşme kapatıldı.'); setSpeechConsent(value); }
  return { phase, active, messages, notice, voiceNotice, voiceState, textMode, voiceEnabled, setVoiceEnabled,
    cloudConsent, setCloudConsent: changeCloud, speechConsent, setSpeechConsent: changeSpeech, speechSource, setSpeechSource,
    history, summary, provider, start, finish, send, switchText, cancelSummary: () => { cancel('Özet hazırlama iptal edildi. Görüşme geçmişe kaydedilmedi.'); setPhase('ready'); } };
}
