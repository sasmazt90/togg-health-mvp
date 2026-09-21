'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import {
  HeartPulse,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  Sparkles,
  ChevronDown
} from 'lucide-react';

import { isMicrophoneAllowed, isMentalSummarySavingAllowed, STORAGE_KEYS } from '../../utils/attuneMode';

interface ChatMessage {
  sender: 'USER' | 'AI';
  text: string;
  time: string;
  isCrisis?: boolean;
  providerBadge?: string;
}

interface MentalSessionItem {
  sessionId: string;
  date: string;
  durationSeconds: number;
  moodBefore: string;
  moodAfter: string;
  recurringThemes: string[];
  summaryText: string;
  clinicalEscalationSuggested: boolean;
}

export default function MentalPage() {
  const router = useRouter();
  const { isParked, state } = useVehicle();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState<boolean>(true);
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const [providerInfo, setProviderInfo] = useState<{
    providerName: string;
    isLiveLLM: boolean;
    apiKeyConfigured: boolean;
  }>({
    providerName: 'Yerel Kural Motoru (Demo)',
    isLiveLLM: false,
    apiKeyConfigured: false
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'AI',
      text: isParked
        ? 'Merhaba Ahmet Bey, bugün kendinizi nasıl hissediyorsunuz? İsterseniz son konuşmalarımızdaki uyku ve dinlenme rutininizden devam edebiliriz.'
        : 'Merhaba Ahmet Bey. Yolculuğunuz boyunca sesli asistanınız hazır. Sürüşünüze odaklanırken paylaşmak istediğiniz bir konu olursa dinliyorum.',
      time: 'Şimdi'
    }
  ]);

  const recognitionRef = useRef<any>(null);

  // Sağlayıcı durumunu sorgula
  useEffect(() => {
    fetch('http://localhost:8000/api/mental/provider-status')
      .then((res) => res.json())
      .then((data) => {
        setProviderInfo({
          providerName: data.providerName || 'Yerel Model (Demo)',
          isLiveLLM: data.isLiveLLM || false,
          apiKeyConfigured: data.apiKeyConfigured || false
        });
      })
      .catch(() => {
        setProviderInfo({
          providerName: 'Yerel Model (Demo)',
          isLiveLLM: false,
          apiKeyConfigured: false
        });
      });
  }, []);

  // Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleSendMessage(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  const speakReply = (text: string) => {
    if (!voiceSpeechEnabled || typeof window === 'undefined') return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const toggleListening = () => {
    if (!isMicrophoneAllowed()) {
      setMicNotice(
        'Mikrofon kullanım izni Gizlilik ayarlarında kapalıdır. Lütfen Gizlilik sayfasından açın veya yazarak iletişim kurun.'
      );
      setShowTextInput(true);
      return;
    }
    setMicNotice(null);

    if (!recognitionRef.current) {
      setShowTextInput(true);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        window.speechSynthesis?.cancel();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn(e);
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      sender: 'USER',
      text,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    // Kriz filtresi kontrolü
    const lower = text.toLowerCase();
    const isCrisisKeyword = ['intihar', 'ölmek istiyorum', 'kendime zarar', 'yaşamak istemiyorum', 'canıma kıymak'].some((kw) =>
      lower.includes(kw)
    );

    if (isCrisisKeyword) {
      setTimeout(() => {
        const crisisText = isParked
          ? 'Paylaştıklarınız benim için çok önemli. Ancak ben acil durum servisi değilim. Lütfen güvende kalmak için 112 Acil Çağrı Merkezini arayın. Yalnız değilsiniz.'
          : 'Söyledikleriniz benim için çok önemli. Ancak acil durum servisi değilim. Lütfen ekrana bakmayın, aracınızı güvenli bir yerde durdurun ve 112 Acil Çağrı Merkezini arayın.';

        const crisisMsg: ChatMessage = {
          sender: 'AI',
          text: crisisText,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          isCrisis: true,
          providerBadge: 'Kriz Güvenlik Filtresi'
        };

        setMessages((prev) => [...prev, crisisMsg]);
        setIsProcessing(false);
        speakReply(crisisText);
      }, 300);
      return;
    }

    // Backend iletişimi
    try {
      const response = await fetch('http://localhost:8000/api/mental/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          history: messages.map((m) => ({
            role: m.sender === 'AI' ? 'assistant' : 'user',
            content: m.text
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: ChatMessage = {
          sender: 'AI',
          text: data.reply,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          isCrisis: data.isCrisis,
          providerBadge: data.providerType === 'LIVE_OPENAI' ? 'OpenAI Canlı' : 'Yerel Model'
        };
        setMessages((prev) => [...prev, aiMsg]);
        speakReply(data.reply);
      } else {
        throw new Error('API Hatası');
      }
    } catch (err) {
      const fallbackReply = isParked
        ? 'Sizi dinliyorum. Son konuşmalarımızda da yorgunluk ve uyku temposu öne çıkmıştı. Kendinize bugün biraz dinlenme zamanı ayırmak iyi gelebilir.'
        : 'Sizi dinliyorum. Sürüş sırasında yoldan dikkatinizi ayırmamanız önemli. Derin bir nefes alabilirsiniz; konuyu araç park edildiğinde de sürdürebiliriz.';

      const aiMsg: ChatMessage = {
        sender: 'AI',
        text: fallbackReply,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        providerBadge: 'Yerel Motor'
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakReply(fallbackReply);
    } finally {
      setIsProcessing(false);

      // Seans Hafızası Gizlilik Kontrolü:
      // Eğer togg_privacy_mental_summary_allowed KAPALI ise, özet kalıcı olarak kaydedilmez!
      if (isMentalSummarySavingAllowed()) {
        try {
          const theme = lower.includes('uyku')
            ? 'Uyku Düzensizliği'
            : lower.includes('iş') || lower.includes('stres')
            ? 'İş Temposu & Stres'
            : 'Odaklanma & Rahatlama';
          const mentalRecord = {
            dateTr: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            primaryTheme: theme,
            sessionCount: 1,
            recommendation: 'Kabin içi rahatlatıcı ses önerildi'
          };
          localStorage.setItem(STORAGE_KEYS.LATEST_MENTAL, JSON.stringify(mentalRecord));
        } catch {}
      }
    }
  };

  const handleNavigateToCare = () => {
    const referralContext = {
      sourceModule: 'MENTAL',
      specialty: 'Klinik Psikoloji',
      reasonSummary: 'Son seanslarda öne çıkan uyku düzensizliği, yoğun iş temposu ve zihinsel yorgunluk temaları için psikolojik destek talebi.',
      timestamp: new Date().toISOString(),
      metricsSummary: {
        recurringThemes: ['uyku düzensizliği', 'iş temposu']
      }
    };
    try {
      localStorage.setItem('togg_active_referral_context', JSON.stringify(referralContext));
    } catch (e) {
      console.warn(e);
    }
    router.push('/care?specialty=Klinik%20Psikoloji&from=mental');
  };

  // Son 2 mesajı al (Sürücü ve Asistan)
  const recentMessages = messages.slice(-2);

  return (
    <div className="space-y-6">
      {/* 1. SCREEN 07: SES ODAKLI ANA ETKİLEŞİM ALANI (FIRST VIEWPORT) */}
      <section className="bg-gradient-to-br from-cockpit-surface via-[#071322] to-cockpit-bg border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-6">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-togg-turquoise/10 rounded-full blur-3xl pointer-events-none" />

        {/* Üst Başlık & Subtitle */}
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-togg-turquoise/10 border border-togg-turquoise/30 text-togg-turquoise text-[11px] font-semibold tracking-wider uppercase">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Sesli İyi Oluş Asistanı</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Bugün nasıl hissediyorsunuz?
          </h1>

          <p className="text-sm text-slate-300">
            {isParked
              ? 'Kabin konforunda dilediğiniz gibi konuşabilir veya dinleyebilirsiniz.'
              : 'Yolculuk boyunca konuşabilirsiniz; gözünüz yolda, zihniniz rahat olsun.'}
          </p>
        </div>

        {/* BÜYÜK SES ORBU / DALGA ANİMASYONU */}
        <div className="relative my-3 flex items-center justify-center">
          {/* Dış Halka 1 (Genişleyen Nefes) */}
          <div
            className={`w-48 h-48 md:w-56 md:h-56 rounded-full border border-togg-turquoise/20 flex items-center justify-center transition-all duration-1000 ${
              isListening ? 'scale-110 border-togg-turquoise/50 animate-ping' : 'animate-pulse'
            }`}
          />

          {/* Dış Halka 2 */}
          <div
            className={`absolute w-36 h-36 md:w-44 md:h-44 rounded-full border border-togg-turquoise/30 bg-togg-turquoise/5 flex items-center justify-center backdrop-blur-sm transition-all duration-700 ${
              isListening ? 'scale-105 shadow-[0_0_40px_rgba(0,194,231,0.3)]' : ''
            }`}
          />

          {/* Merkez Orb */}
          <div
            className={`absolute w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
              isListening
                ? 'bg-gradient-to-tr from-rose-500 via-purple-500 to-togg-turquoise shadow-[0_0_35px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-gradient-to-tr from-cyan-600 via-togg-turquoise to-blue-500 shadow-[0_0_30px_rgba(0,194,231,0.4)]'
            }`}
          >
            {isListening ? (
              <Mic className="w-10 h-10 text-white animate-bounce" />
            ) : (
              <Sparkles className="w-10 h-10 text-togg-darkBlue animate-pulse" />
            )}
          </div>
        </div>

        {/* BİRİNCİL AKSİYON: MİKROFONU BAŞLAT */}
        <div className="space-y-3 w-full max-w-sm">
          <button
            onClick={toggleListening}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2.5 min-h-touch ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-pulse'
                : 'bg-togg-turquoise hover:bg-[#33D0EE] text-togg-darkBlue shadow-[0_0_20px_rgba(0,194,231,0.3)]'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>{isListening ? 'DİNLENİYOR... KONUŞUN' : 'MİKROFONU BAŞLAT'}</span>
          </button>

          <div className="flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => setShowTextInput((prev) => !prev)}
              className="text-slate-400 hover:text-white transition-colors underline underline-offset-4"
            >
              İsterseniz yazabilirsiniz
            </button>

            <span className="text-slate-600">•</span>

            <button
              onClick={() => setVoiceSpeechEnabled((prev) => !prev)}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {voiceSpeechEnabled ? <Volume2 className="w-3.5 h-3.5 text-togg-turquoise" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              <span>{voiceSpeechEnabled ? 'Sesli Yanıt Açık' : 'Sessiz'}</span>
            </button>
          </div>

          {/* Mikrofon İzin Uyarısı */}
          {micNotice && (
            <div className="p-3 bg-amber-950/70 border border-amber-700/80 rounded-xl text-amber-200 text-xs flex items-center gap-2 text-left animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{micNotice}</span>
            </div>
          )}

          {/* İsteğe Bağlı Metin Girişi Kutusu */}
          {showTextInput && (
            <div className="pt-2 flex gap-2 w-full animate-in fade-in">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Düşüncelerinizi yazın..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-togg-turquoise"
              />
              <button
                onClick={() => handleSendMessage()}
                className="px-4 py-2 bg-togg-turquoise text-togg-darkBlue font-bold rounded-xl text-xs hover:bg-[#33D0EE]"
              >
                Gönder
              </button>
            </div>
          )}
        </div>

        {/* SON 1-2 KONUŞMA DÖKÜMÜ (KOMPAKT KABİN DİYALOĞU) */}
        <div className="w-full max-w-2xl space-y-2 pt-2">
          {recentMessages.map((m, idx) => {
            const isAi = m.sender === 'AI';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl text-xs leading-relaxed text-left flex items-start gap-3 transition-all ${
                  m.isCrisis
                    ? 'bg-rose-950/80 border border-rose-700 text-rose-100'
                    : isAi
                    ? 'bg-slate-950/80 border border-white/10 text-slate-200'
                    : 'bg-togg-darkBlue/80 border border-togg-turquoise/30 text-white ml-auto max-w-lg'
                }`}
              >
                <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                  {isAi ? 'Attune' : 'Siz'}
                </span>
                <p className="flex-1">{m.text}</p>
              </div>
            );
          })}
          {isProcessing && (
            <div className="text-xs text-slate-400 italic flex items-center justify-center gap-2 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-togg-turquoise animate-ping" />
              <span>Asistan dinliyor ve yanıt hazırlıyor...</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. BELOW FOLD: SON GÖRÜŞMELERDEN İÇGÖRÜLER (SADECE PARK HALİNDE DETAYLI) */}
      {isParked ? (
        <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-bold text-white">
              <TrendingUp className="w-4 h-4 text-togg-turquoise" />
              <span>Son Görüşmelerden İçgörüler</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">4 Seans Analiz Edildi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kart 1: Tekrar Eden Temalar */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 space-y-2.5 text-xs">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                <span>Tekrar Eden Temalar</span>
                <span className="text-togg-turquoise font-mono font-bold">1. Örüntü</span>
              </div>
              <div className="space-y-1.5 text-slate-200">
                <div className="flex justify-between items-center">
                  <span>Uyku Düzensizliği</span>
                  <span className="font-mono text-togg-turquoise font-semibold">%75</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>İş Temposu & Stres</span>
                  <span className="font-mono text-togg-turquoise font-semibold">%60</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                Haftalık seanslarda en sık tekrar eden anahtar konular.
              </p>
            </div>

            {/* Kart 2: Duygu Eğilimi */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 space-y-2.5 text-xs">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                <span>Duygu Eğilimi</span>
                <span className="text-amber-400 font-mono font-bold">Zaman İçi</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Sabah saatlerinde odaklanma seviyesi yüksek; akşam dönüş saatlerinde zihinsel yorgunluk ve gerginlik eğilimi izleniyor.
              </p>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                Kabin aydınlatma ve rahatlama sesleri önerildi.
              </p>
            </div>

            {/* Kart 3: Profesyonel Destek */}
            <div className="bg-togg-darkBlue/40 border border-togg-darkTurquoise/60 rounded-xl p-4 space-y-3 text-xs flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-togg-turquoise font-semibold flex items-center justify-between">
                  <span>Profesyonel Destek</span>
                  <span className="text-emerald-400 font-mono font-bold">Öneri</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Tekrar eden yorgunluk ve stres örüntüleri için online veya yüz yüze klinik psikolog görüşmesi önerilir.
                </p>
              </div>

              <button
                onClick={handleNavigateToCare}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-togg-turquoise text-togg-darkBlue font-bold text-xs hover:bg-[#33D0EE] transition-all shadow-md"
              >
                <span>PSİKOLOG SEÇENEKLERİNİ GÖR</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>* Seans dökümleri yerel-first prensibiyle işlenir; ham ses kaydı saklanmaz.</span>
            <span>Acil Kriz Destek: <strong className="text-rose-400 font-semibold">112 Acil Çağrı</strong></span>
          </div>
        </section>
      ) : (
        /* Sürüş Modunda Görsel Geçmiş Kilitlidir */
        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 text-center text-xs text-slate-400">
          Sürüş sırasında görsel sağlık geçmişi ve analiz grafikleri gizlenir. Yalnızca sesli asistan aktiftir.
        </div>
      )}
    </div>
  );
}
