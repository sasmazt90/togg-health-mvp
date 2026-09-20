'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useVehicle } from '../../context/VehicleContext';
import {
  HeartPulse,
  Mic,
  MicOff,
  Volume2,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  CalendarCheck,
  Clock,
  Sparkles,
  ArrowRight,
  PhoneCall
} from 'lucide-react';

interface ChatMessage {
  sender: 'USER' | 'AI';
  text: string;
  time: string;
  isCrisis?: boolean;
}

export default function MentalPage() {
  const { isParked, state } = useVehicle();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'AI',
      text: isParked
        ? 'Merhaba Ahmet Bey, bugün kendinizi nasıl hissediyorsunuz? İsterseniz son seanslarımızda konuştuğumuz uyku ve dinlenme rutininizden devam edebiliriz.'
        : 'Merhaba Ahmet Bey. Yolculuğunuz sırasında dinleme ve sohbet desteğiniz devrede. Sürüşünüze odaklanırken konuşmak istediğiniz bir konu olursa dinliyorum.',
      time: 'Şimdi'
    }
  ]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      sender: 'USER',
      text,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Kriz filtresi
    const lower = text.toLowerCase();
    if (lower.includes('intihar') || lower.includes('kendime zarar') || lower.includes('ölmek istiyorum')) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'AI',
            text: 'Söyledikleriniz benim için çok önemli ve şu an çok zor bir andan geçtiğinizi anlıyorum. Ancak ben acil bir sağlık servisi değilim. Lütfen şu an güvende kalmak için hemen 112 Acil Çağrı veya 182 Danışma Hattı ile görüşün. Yalnız değilsiniz.',
            time: 'Şimdi',
            isCrisis: true
          }
        ]);
      }, 600);
      return;
    }

    // Sürüş vs. Park yanıt mantığı
    setTimeout(() => {
      let reply = '';
      if (!isParked) {
        reply = 'Sizi dinliyorum. Şu an araç hareket halinde olduğu için dikkatinizi yoldan ayırmamanız çok önemli. Derin bir nefes alın. İsterseniz bu konunun ayrıntılarını araç güvenle park edildiğinde konuşalım.';
      } else {
        reply = 'Paylaştığınız için teşekkürler. Son 4 seansımızda uyku düzensizliği ve yoğun tempo konularının tekrar ettiğini görüyorum. Kendinize bugün biraz dinlenme alanı yaratmak ve isterseniz bir uzman klinik psikologla bu süreci değerlendirmek faydalı olabilir. Randevu seçeneklerini incelemek ister misiniz?';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'AI',
          text: reply,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1000);
  };

  const handleVoiceToggle = () => {
    if (!isListening) {
      setIsListening(true);
      // Simüle sesli girdi
      setTimeout(() => {
        setIsListening(false);
        handleSendMessage('Bugün yoğun bir gündü, son günlerde geceleri rahat uyuyamıyorum.');
      }, 3000);
    } else {
      setIsListening(false);
    }
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
              Oturum hafızası, eğilim analizi ve sürüş durumuna duyarlı sesli diyalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
              isParked
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse'
            }`}
          >
            {isParked ? 'Park Modu: Derinlemesine Sohbet & Analiz' : 'Sürüş Modu: Ses Odaklı / Kısa Yanıtlar'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol 2 Kolon: Sesli Sohbet Arayüzü */}
        <div className="lg:col-span-2 bg-cockpit-surface border border-cockpit-border rounded-2xl flex flex-col h-[560px] shadow-xl overflow-hidden">
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
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      m.isCrisis
                        ? 'bg-red-950/80 border border-red-700 text-red-100'
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
          </div>

          {/* Alt Sesli Kontrol ve Girdi Alanı */}
          <div className="p-4 border-t border-cockpit-border/80 bg-slate-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={handleVoiceToggle}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all min-h-touch ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isListening ? 'Dinleniyor... (Konuşun)' : 'Mikrofonu Başlat'}</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Sesli Yanıtlama Açık</span>
              </div>
            </div>

            {/* Metin Test Girdisi (Park Halinde) */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Mesajınızı yazın veya yukarıdaki mikrofonu kullanın..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleSendMessage()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
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
                <div className="text-slate-400">Tekrar Eden Temalar (Son 4 Seans):</div>
                <div className="text-indigo-300 font-semibold mt-1">
                  • Uyku düzensizliği (%75)<br />
                  • Süregelen iş stresi (%60)<br />
                  • Yoğun zihinsel tempo
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

              <Link
                href="/care?specialty=Klinik%20Psikoloji"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition-all shadow"
              >
                <span>Uzman Psikolog Bul (Care Agent)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Acil Kriz Bilgilendirme */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Ruhsal Güvenlik Politikası</span>
            </div>
            <p>
              Asistan bir psikolog, terapist veya psikiyatrist değildir. Klinik teşhis veya tıbbi tedavi uygulamaz. Yalnızca konuşma ve iyi oluş desteği sunar.
            </p>
            <div className="text-slate-500 pt-1 border-t border-slate-800">
              Acil durum hatları: <strong>112 (Acil)</strong> • <strong>182 (MHRS)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
