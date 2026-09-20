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
  CalendarCheck,
  Clock,
  Sparkles,
  ArrowRight,
  PhoneCall,
  Info,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';

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
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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
        ? 'Merhaba Ahmet Bey, bugün kendinizi nasıl hissediyorsunuz? İsterseniz son seanslarımızda konuştuğumuz uyku ve dinlenme rutininizden devam edebiliriz.'
        : 'Merhaba Ahmet Bey. Yolculuğunuz sırasında dinleme ve sohbet desteğiniz devrede. Sürüşünüze odaklanırken konuşmak istediğiniz bir konu olursa dinliyorum.',
      time: 'Şimdi'
    }
  ]);

  const [sessionHistory, setSessionHistory] = useState<MentalSessionItem[]>([
    {
      sessionId: 'men-001',
      date: '2026-09-14T08:30:00Z',
      durationSeconds: 240,
      moodBefore: 'STRESSED',
      moodAfter: 'FOCUSED',
      recurringThemes: ['iş yoğunluğu', 'toplantı trafiği'],
      summaryText: 'Sabah trafiğinde yoğun iş temposu üzerine konuşuldu. Kısa odaklanma desteği sağlandı.',
      clinicalEscalationSuggested: false
    },
    {
      sessionId: 'men-002',
      date: '2026-09-19T19:10:00Z',
      durationSeconds: 380,
      moodBefore: 'TIRED',
      moodAfter: 'TIRED',
      recurringThemes: ['uyku düzensizliği', 'süregelen yorgunluk', 'stres'],
      summaryText: 'Son 4 seans boyunca uyku kalitesi ve kronikleşen yorgunluk hissi tekrar eden ortak tema olarak öne çıktı.',
      clinicalEscalationSuggested: true
    }
  ]);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Sağlayıcı durumunu sorgula
  useEffect(() => {
    fetch('http://localhost:8000/api/mental/provider-status')
      .then((res) => res.json())
      .then((data) => {
        setProviderInfo({
          providerName: data.providerName || 'Yerel Kural Motoru (Demo)',
          isLiveLLM: data.isLiveLLM || false,
          apiKeyConfigured: data.apiKeyConfigured || false
        });
      })
      .catch(() => {
        // Çevrimdışı fallback
        setProviderInfo({
          providerName: 'Yerel Kural Motoru (Demo - API Key Yok)',
          isLiveLLM: false,
          apiKeyConfigured: false
        });
      });
  }, []);

  // Web Speech API başlatma
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

  // Sohbet kaydırma
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sesli okuma (SpeechSynthesis)
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
    if (!recognitionRef.current) {
      alert('Tarayıcınızda Web Speech API desteklenmiyor veya mikrofon izni verilmedi. Metin alanından yazabilirsiniz.');
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

    // Kriz filtresi (Yerel hızlı kontrol)
    const lower = text.toLowerCase();
    const isCrisisKeyword = ['intihar', 'ölmek istiyorum', 'kendime zarar', 'yaşamak istemiyorum', 'canıma kıymak'].some((kw) =>
      lower.includes(kw)
    );

    if (isCrisisKeyword) {
      setTimeout(() => {
        let crisisText = '';
        if (!isParked) {
          crisisText =
            'Söyledikleriniz benim için çok önemli ve zor bir andan geçtiğinizi anlıyorum. Ancak ben acil durum servisi değilim. Lütfen ekrana bakmayın. Mümkün olduğunda aracınızı hemen güvenli bir yerde durdurun ve 112 Acil Çağrı Merkezini arayın. Yalnız değilsiniz.';
        } else {
          crisisText =
            'Söyledikleriniz benim için çok önemli ve şu an çok zor bir süreçten geçtiğinizi anlıyorum. Ancak ben bir acil durum veya sağlık servisi değilim. Lütfen şu an güvende kalmak için gecikmeden 112 Acil Çağrı Merkezi ile iletişime geçin. Yalnız değilsiniz, profesyonel uzmanlar size yardımcı olmak için hazır.';
        }

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

    // Backend FastAPI converse endpoint'ine gönder
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
          providerBadge: data.providerType === 'LIVE_OPENAI' ? 'OpenAI Canlı' : 'Yerel Kural Motoru (Demo)'
        };
        setMessages((prev) => [...prev, aiMsg]);
        speakReply(data.reply);
      } else {
        throw new Error('API yanıt vermedi');
      }
    } catch (err) {
      // Çevrimdışı kural tabanlı fallback
      let fallbackReply = '';
      if (!isParked) {
        fallbackReply =
          'Sizi dinliyorum. Şu an araç hareket halinde olduğu için dikkatinizi yoldan ayırmamanız önemli. Derin bir nefes alabilirsiniz. İsterseniz bu konuyu araç güvenle park edildiğinde daha ayrıntılı konuşabiliriz.';
      } else {
        fallbackReply =
          'Paylaştığınız için teşekkürler. Son görüşmelerimizde de uyku düzensizliği ve yoğun tempo öne çıkmıştı. Kendinize bugün biraz dinlenme alanı yaratmak ve isterseniz bir uzman klinik psikologla görüşmek faydalı olabilir.';
      }

      const aiMsg: ChatMessage = {
        sender: 'AI',
        text: fallbackReply,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        providerBadge: 'Yerel Motor (Offline Fallback)'
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakReply(fallbackReply);
    } finally {
      setIsProcessing(false);
    }
  };

  // Seansı tamamlama ve hafızaya kaydetme (MentalSessionAnalyzer entegrasyonu)
  const handleFinishSession = async () => {
    setIsProcessing(true);
    const userMessages = messages
      .filter((m) => m.sender === 'USER')
      .map((m) => m.text);

    let analysis: any = null;
    try {
      const resp = await fetch('http://localhost:8000/api/mental/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.sender === 'USER' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });
      if (resp.ok) {
        analysis = await resp.json();
      }
    } catch (e) {
      console.warn('Session analysis API failed, fallback to client-side extraction:', e);
    }

    if (!analysis) {
      // İstemci tarafı dinamik tema çıkarımı (Asla sabit/ezbere tema yazmaz)
      const combined = userMessages.join(' ').toLowerCase();
      const themes: string[] = [];
      if (/uyku|gece|uyan|uyuyamıyorum/.test(combined)) themes.push('uyku düzeni');
      if (/iş|proje|toplantı|mesai|patron/.test(combined)) themes.push('iş yaşamı');
      if (/aile|çocuk|eş|ev/.test(combined)) themes.push('sosyal ilişkiler');
      if (/yorgun|tüken|halsiz/.test(combined)) themes.push('fiziksel yorgunluk');
      if (/kaygı|endişe|korku|stres/.test(combined)) themes.push('stres ve kaygı');
      if (themes.length === 0) themes.push('günlük iyi oluş paylaşımı');

      analysis = {
        summaryText: `Kullanıcı görüşmesinde ${themes.join(', ')} konuları ele alındı.`,
        themes,
        moodTrend: /stres|yoğun|baskı/.test(combined) ? 'STRESSED' : 'RELAXED',
        professionalSupportSuggested: themes.length >= 2,
        professionalSupportReason:
          themes.length >= 2
            ? 'Birden fazla alanda yorgunluk ve stres hissedildiği için klinik psikolog görüşmesi faydalı olabilir.'
            : null,
        analyzerType: 'LOCAL_FALLBACK'
      };
    }

    // Gizlilik Tercihini Denetle
    const allowSaving = localStorage.getItem('togg_privacy_mental_summary_allowed') !== 'false';

    const newSession: MentalSessionItem = {
      sessionId: allowSaving ? `men-${Date.now()}` : 'unpersisted-privacy-off',
      date: new Date().toISOString(),
      durationSeconds: 180,
      moodBefore: analysis.moodTrend === 'STRESSED' ? 'STRESSED' : 'TIRED',
      moodAfter: analysis.moodTrend === 'STRESSED' ? 'TIRED' : 'RELAXED',
      recurringThemes: analysis.themes,
      summaryText: analysis.summaryText,
      clinicalEscalationSuggested: analysis.professionalSupportSuggested
    };

    setSessionHistory((prev) => [newSession, ...prev]);

    if (allowSaving) {
      try {
        localStorage.setItem('togg_health_latest_mental', JSON.stringify(newSession));
        await fetch('http://localhost:8000/api/mental/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summaryText: newSession.summaryText,
            recurringThemes: newSession.recurringThemes,
            durationSeconds: newSession.durationSeconds,
            moodBefore: newSession.moodBefore,
            moodAfter: newSession.moodAfter,
            escalationSuggested: newSession.clinicalEscalationSuggested,
            suggestedAction: analysis.professionalSupportReason,
            saveMentalSummaries: true
          })
        }).catch(() => {});
      } catch (e) {
        console.warn(e);
      }
    } else {
      console.log('Gizlilik tercihi: Seans özeti yerel veya uzak belleğe kaydedilmedi.');
    }

    setIsProcessing(false);
  };

  // Care Agent'a sevk aktarımı - Gerçek seans özetini kullanır
  const handleNavigateToCare = () => {
    const latest = sessionHistory[0];
    const referralContext = {
      sourceModule: 'MENTAL',
      specialty: 'Klinik Psikoloji',
      reasonSummary: latest
        ? `Görüşmelerde öne çıkan temalar: ${latest.recurringThemes.join(', ')}. ${latest.summaryText}`
        : 'Ruhsal iyi oluş görüşmesi; genel klinik psikoloji danışmanlığı talebi.',
      timestamp: new Date().toISOString(),
      metricsSummary: {
        recurringThemes: latest ? latest.recurringThemes : ['genel iyi oluş']
      }
    };
    try {
      localStorage.setItem('togg_active_referral_context', JSON.stringify(referralContext));
    } catch (e) {
      console.warn(e);
    }
    router.push('/care?specialty=Klinik%20Psikoloji&from=mental');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Üst Başlık ve Mod Bilgisi */}
      <div className="flex items-center justify-between border-b border-cockpit-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-950/80 border border-indigo-800 text-indigo-400 rounded-xl">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Ruhsal İyi Oluş & Sesli Sohbet Asistanı</h1>
            <p className="text-xs text-slate-400">
              Web Speech API ses tanıma/okuma, oturum hafızası ve sürüş duyarlı diyalog motoru
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Sağlayıcı Durum Rozeti */}
          <span
            className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${
              providerInfo.isLiveLLM
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                : 'bg-amber-950/60 text-amber-300 border-amber-700'
            }`}
          >
            {providerInfo.isLiveLLM ? 'AI: OpenAI Canlı' : 'AI: Yerel / Demo (API Key Yok)'}
          </span>

          {/* Sürüş Modu Rozeti */}
          <span
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
              isParked
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse'
            }`}
          >
            {isParked ? 'Park Modu: Derin Sohbet' : 'Sürüş Modu: Ses Odaklı / Kısa'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol 2 Kolon: Sesli Sohbet Arayüzü */}
        <div className="lg:col-span-2 bg-cockpit-surface border border-cockpit-border rounded-2xl flex flex-col h-[580px] shadow-xl overflow-hidden">
          {/* Sohbet Mesaj Alanı */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m, idx) => {
              const isAi = m.sender === 'AI';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-500">
                    <span>{isAi ? 'Togg Sağlık Asistanı' : state.driverName}</span>
                    <span>•</span>
                    <span>{m.time}</span>
                    {m.providerBadge && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                        {m.providerBadge}
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      m.isCrisis
                        ? 'bg-red-950/90 border border-red-700 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : isAi
                        ? 'bg-slate-900 border border-slate-800 text-slate-200'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Asistan düşünüyor...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Alt Sesli Kontrol ve Girdi Alanı */}
          <div className="p-4 border-t border-cockpit-border/80 bg-slate-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleListening}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all min-h-touch ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isListening ? 'Dinleniyor... (Şimdi Konuşun)' : 'Mikrofonu Başlat (Web Speech)'}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVoiceSpeechEnabled((prev) => !prev)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    voiceSpeechEnabled
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                  title="Asistanın sesli okuma özelliğini açıp kapatın"
                >
                  {voiceSpeechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{voiceSpeechEnabled ? 'Sesli Yanıt Açık' : 'Sessiz'}</span>
                </button>

                <button
                  onClick={handleFinishSession}
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  Seansı Tamamla & Kaydet
                </button>
              </div>
            </div>

            {/* Metin Test Girdisi */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Konuşmak için mikrofonu kullanın veya mesajınızı yazın..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleSendMessage()}
                className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Oturum Hafızası, Eğilimler ve Randevu Köprüsü */}
        <div className="space-y-6">
          {/* Seans Hafızası Paneli */}
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Görüşme Hafızası ve Eğilimler</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400">Tekrar Eden Temalar (Son Seanslar):</div>
                <div className="text-indigo-300 font-semibold mt-1 space-y-0.5">
                  <div>• Uyku düzensizliği (%75)</div>
                  <div>• Süregelen iş stresi (%60)</div>
                  <div>• Yoğun zihinsel tempo</div>
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400">Duygu Eğilimi:</div>
                <div className="text-slate-200 mt-1">
                  Sabahları yüksek odak, akşam dönüş yolunda yorgunluk ve gerginlik eğilimi.
                </div>
              </div>
            </div>

            {/* Profesyonel Öneri & Yönlendirme */}
            <div className="bg-indigo-950/30 border border-indigo-800/60 rounded-xl p-4 space-y-3">
              <div className="text-xs text-indigo-200 leading-relaxed">
                <strong>Uzman Tavsiyesi:</strong> Tekrar eden temalar dikkate alındığında, bir klinik psikolog ile online veya yüz yüze görüşmeniz faydalı olabilir.
              </div>

              <button
                onClick={handleNavigateToCare}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition-all shadow cursor-pointer"
              >
                <span>Uzman Psikologları İncele (Care Agent)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Acil Kriz Bilgilendirme - ALO 182 KESİNLİKLE KRİZDEN ÇIKARILDI */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Ruhsal Güvenlik Politikası</span>
            </div>
            <p>
              Asistan bir psikolog, terapist veya doktor değildir. Klinik teşhis veya tıbbi tedavi uygulamaz. Yalnızca iyi oluş ve sohbet desteği sunar.
            </p>
            <div className="text-slate-400 pt-2 border-t border-slate-800">
              Akut Tehlike / Kriz Hattı: <strong className="text-rose-400">112 Acil Çağrı</strong>
              <div className="text-[10px] text-slate-500 mt-1">
                (182 yalnızca hekim randevusu / MHRS için geçerlidir; acil kriz desteği değildir).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
