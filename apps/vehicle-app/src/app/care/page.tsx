'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import { ReferralContext } from '@packages/health-profile/types';
import {
  CalendarCheck,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Car,
  Filter,
  Sparkles,
  Eye,
  HeartPulse,
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react';

interface CareSlot {
  id: string;
  specialty: string;
  providerName: string;
  title: string;
  clinicName: string;
  locationLabel: string;
  isOnline: boolean;
  dateTime?: string;
  displayTime?: string;
  travelTimeMin: number;
  calendarConflict: boolean;
  sourceBadge: string;
  matchScore: number;
  bookingUrl?: string;
}

function CareContent() {
  const { state } = useVehicle();
  const searchParams = useSearchParams();
  const paramSpecialty = searchParams.get('specialty');
  const paramFrom = searchParams.get('from');

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(paramSpecialty || 'Dermatoloji');
  const [filterType, setFilterType] = useState<'ALL' | 'IN_PERSON' | 'ONLINE'>('ALL');
  const [slots, setSlots] = useState<CareSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Ortak Sevk Bağlamı
  const [referralContext, setReferralContext] = useState<ReferralContext | null>(null);

  // Rezervasyon Onay Modalı
  const [selectedSlot, setSelectedSlot] = useState<CareSlot | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<'SELECTING' | 'CONFIRM_MODAL' | 'BOOKED'>('SELECTING');
  const [consentApproved, setConsentApproved] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('togg_active_referral_context');
      if (stored) {
        const parsed: ReferralContext = JSON.parse(stored);
        setReferralContext(parsed);
        if (!paramSpecialty && parsed.specialty) {
          setSelectedSpecialty(parsed.specialty);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }, [paramSpecialty]);

  const fetchAppointments = async (specialty: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/care/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialty,
          preferredCity: 'İstanbul',
          maxTravelTimeMin: 30,
          useBrowserAgent: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSlots(data.matchedSlots || []);
      } else {
        throw new Error('API Hatası');
      }
    } catch (err) {
      // Demo Hekim Verileri
      if (specialty === 'Dermatoloji') {
        setSlots([
          {
            id: 'care-01',
            specialty: 'Dermatoloji',
            providerName: 'Uzm. Dr. B. Kaya (Demo Hekim)',
            title: 'Dermatoloji Uzmanı',
            clinicName: 'Demo Dermatoloji Kliniği',
            locationLabel: 'Ataşehir, İstanbul',
            isOnline: false,
            displayTime: 'Yarın 18:20',
            travelTimeMin: 14,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 96,
            bookingUrl: 'https://www.doktortakvimi.com'
          },
          {
            id: 'care-02',
            specialty: 'Dermatoloji',
            providerName: 'Uzm. Dr. K. Arslan (Demo Hekim)',
            title: 'Klinik Dermatolog',
            clinicName: 'Demo Kadıköy Cilt Sağlığı Merkezi',
            locationLabel: 'Moda, İstanbul',
            isOnline: false,
            displayTime: 'Çarşamba 11:30',
            travelTimeMin: 18,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 90,
            bookingUrl: 'https://www.doktortakvimi.com'
          },
          {
            id: 'care-03',
            specialty: 'Dermatoloji',
            providerName: 'Doç. Dr. A. Erdem (Demo Danışman)',
            title: 'Dermatoloji & Estetik Konsültanı',
            clinicName: 'Demo Online Teledermatoloji',
            locationLabel: 'Görüntülü Görüşme',
            isOnline: true,
            displayTime: 'Yarın 20:00',
            travelTimeMin: 0,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 88,
            bookingUrl: 'https://www.doktortakvimi.com'
          }
        ]);
      } else if (specialty === 'Göz Hastalıkları') {
        setSlots([
          {
            id: 'care-vis-01',
            specialty: 'Göz Hastalıkları',
            providerName: 'Uzm. Dr. A. Yılmaz (Demo Hekim)',
            title: 'Oftalmoloji & Refraktif Muayene',
            clinicName: 'Demo Göz Sağlığı Merkezi',
            locationLabel: 'Üsküdar, İstanbul',
            isOnline: false,
            displayTime: 'Yarın 15:40',
            travelTimeMin: 12,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 95,
            bookingUrl: 'https://www.doktortakvimi.com'
          },
          {
            id: 'care-vis-02',
            specialty: 'Göz Hastalıkları',
            providerName: 'Op. Dr. E. Çetin (Demo Hekim)',
            title: 'Göz Hastalıkları Uzmanı',
            clinicName: 'Demo Göztepe Polikliniği',
            locationLabel: 'Kadıköy, İstanbul',
            isOnline: false,
            displayTime: 'Perşembe 10:00',
            travelTimeMin: 16,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 89,
            bookingUrl: 'https://www.doktortakvimi.com'
          }
        ]);
      } else {
        setSlots([
          {
            id: 'care-men-01',
            specialty: 'Klinik Psikoloji',
            providerName: 'Uzm. Psk. C. Bilgin (Demo Danışman)',
            title: 'Uzman Klinik Psikolog',
            clinicName: 'Demo Kabin & Online Terapi',
            locationLabel: 'Online Görüntülü',
            isOnline: true,
            displayTime: 'Bu Akşam 20:30',
            travelTimeMin: 0,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 98,
            bookingUrl: 'https://www.doktortakvimi.com'
          },
          {
            id: 'care-men-02',
            specialty: 'Klinik Psikoloji',
            providerName: 'Psk. Dr. E. Sönmez (Demo Danışman)',
            title: 'Bilişsel Davranışçı Terapist',
            clinicName: 'Bağdat Caddesi Psikoloji Enstitüsü',
            locationLabel: 'Kadıköy, İstanbul',
            isOnline: false,
            displayTime: 'Çarşamba 17:00',
            travelTimeMin: 15,
            calendarConflict: false,
            sourceBadge: 'Demo Randevu Verisi',
            matchScore: 91,
            bookingUrl: 'https://www.doktortakvimi.com'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(selectedSpecialty);
  }, [selectedSpecialty]);

  const filteredSlots = slots.filter((slot) => {
    if (filterType === 'IN_PERSON') return !slot.isOnline;
    if (filterType === 'ONLINE') return slot.isOnline;
    return true;
  });

  const featuredSlot = filteredSlots[0];
  const secondarySlots = filteredSlots.slice(1);

  const handleSelectSlot = (slot: CareSlot) => {
    setSelectedSlot(slot);
    setConsentApproved(false);
    setConfirmationStep('CONFIRM_MODAL');
  };

  const handleConfirmBooking = () => {
    if (!consentApproved || !selectedSlot) return;
    setConfirmationStep('BOOKED');
  };

  return (
    <div className="space-y-6">
      {/* 1. SCREEN 08: ÜST BAŞLIK VE FİLTRE ÇUBUĞU (FIRST VIEWPORT) */}
      <section className="bg-gradient-to-br from-cockpit-surface via-[#071322] to-cockpit-bg border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-togg-turquoise/10 border border-togg-turquoise/30 text-togg-turquoise text-[11px] font-semibold tracking-wider uppercase">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Care Agent • Akıllı Hekim Erişimi</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Sizin için uygun uzmanlar
            </h1>

            <p className="text-sm text-slate-300">
              Kabin içi sağlık değerlendirmeleriniz, takviminiz ve araç rotanızla eşleştirilmiş uzman randevuları.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Demo Takvim • Tahmini Ulaşım</span>
          </div>
        </div>

        {/* AKTİF SEVK BAĞLAMI BİLDİRİMİ */}
        {referralContext && (
          <div className="bg-togg-darkBlue/40 border border-togg-turquoise/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-togg-turquoise shrink-0" />
              <div className="text-slate-200">
                <span className="font-bold text-white">
                  {referralContext.sourceModule === 'SKIN' && 'Cilt Analizi → Dermatoloji'}
                  {referralContext.sourceModule === 'VISION' && 'Görme Kontrolü → Göz Hastalıkları'}
                  {referralContext.sourceModule === 'MENTAL' && 'Ruhsal İyi Oluş → Klinik Psikoloji'}
                </span>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="text-slate-300 text-[11px]">{referralContext.reasonSummary}</span>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('togg_active_referral_context');
                setReferralContext(null);
              }}
              className="text-[11px] text-slate-400 hover:text-white underline shrink-0 self-end sm:self-auto"
            >
              Bağlamı Kaldır
            </button>
          </div>
        )}

        {/* BRANŞ VE GÖRÜŞME TÜRÜ FİLTRE HAPLARI */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Branş:</span>
            {['Dermatoloji', 'Göz Hastalıkları', 'Klinik Psikoloji'].map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-touch ${
                  selectedSpecialty === spec
                    ? 'bg-togg-turquoise text-togg-darkBlue shadow-[0_0_15px_rgba(0,194,231,0.3)]'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs">
            {(['ALL', 'IN_PERSON', 'ONLINE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === type
                    ? 'bg-togg-turquoise/15 text-togg-turquoise border border-togg-turquoise/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type === 'ALL' ? 'Tümü' : type === 'IN_PERSON' ? 'Yüz Yüze' : 'Online'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. ÖNE ÇIKAN UZMAN KARTI (FEATURED PROVIDER CARD) */}
      {featuredSlot && (
        <section className="bg-cockpit-surface border border-togg-turquoise/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden group hover:border-togg-turquoise/60 transition-all">
          <div className="absolute top-0 right-0 w-80 h-80 bg-togg-turquoise/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Sol: Doktor Bilgileri & Rozetler */}
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-semibold tracking-wider uppercase">
                  Önerilen Eşleşme (%{featuredSlot.matchScore})
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-mono">
                  {featuredSlot.isOnline ? 'Online Görüşme' : 'Yüz Yüze Muayene'}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] font-mono">
                  {featuredSlot.sourceBadge}
                </span>
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-white group-hover:text-togg-turquoise transition-colors">
                  {featuredSlot.providerName}
                </h2>
                <div className="text-xs text-slate-400 font-medium mt-0.5">
                  {featuredSlot.title}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-togg-turquoise" />
                  <span>{featuredSlot.clinicName} • {featuredSlot.locationLabel}</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-togg-turquoise" />
                  <span>{featuredSlot.isOnline ? 'Ulaşım Gerektirmez' : `${featuredSlot.travelTimeMin} dk araçla`}</span>
                </span>

                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Takviminizle Uyumlu</span>
                </span>
              </div>
            </div>

            {/* Sağ: Önerilen Saat ve Birincil CTA */}
            <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
              <div className="text-left lg:text-right space-y-0.5">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Önerilen Saat</div>
                <div className="text-lg md:text-xl font-bold text-white font-mono">{featuredSlot.displayTime}</div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleSelectSlot(featuredSlot)}
                  className="py-3 px-6 rounded-xl bg-togg-turquoise hover:bg-[#33D0EE] text-togg-darkBlue font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,194,231,0.25)] min-h-touch"
                >
                  <span>RANDEVUYU İNCELE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={featuredSlot.bookingUrl || 'https://www.doktortakvimi.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                  title="Sağlayıcı sayfasını aç"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. BELOW FOLD: ALTERNATİF UZMAN SEÇENEKLERİ */}
      {secondarySlots.length > 0 && (
        <section className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Diğer Uygun Seçenekler
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {secondarySlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all shadow-lg space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white">{slot.providerName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                      {slot.isOnline ? 'Online' : 'Yüz Yüze'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{slot.clinicName} • {slot.locationLabel}</span>
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-300 pt-1">
                    <span className="text-togg-turquoise font-mono font-bold">{slot.displayTime}</span>
                    <span className="text-slate-600">•</span>
                    <span>{slot.isOnline ? 'Online' : `${slot.travelTimeMin} dk sürüş`}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-end">
                  <button
                    onClick={() => handleSelectSlot(slot)}
                    className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-togg-turquoise border border-togg-turquoise/30 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>İncele</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AÇIK ONAY MODALI (CONSENT GATE) */}
      {confirmationStep === 'CONFIRM_MODAL' && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cockpit-surface border border-white/20 rounded-2xl max-w-lg w-full p-6 md:p-7 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-togg-turquoise font-bold text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>Kullanıcı Onayı ve Sevk Bağlamı</span>
              </div>
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Attune.more açık onayınız olmadan dış hekim randevu portallarına adınıza kayıt oluşturmaz.
              </p>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-white text-sm">{selectedSlot.providerName}</div>
                <div className="text-slate-400">{selectedSlot.clinicName} • {selectedSlot.locationLabel}</div>
                <div className="text-togg-turquoise font-mono font-bold pt-1">{selectedSlot.displayTime}</div>
              </div>

              {referralContext && (
                <div className="bg-togg-darkBlue/40 border border-togg-turquoise/40 p-3 rounded-xl text-[11px] text-togg-turquoise">
                  ℹ️ Randevu talebine <strong>{referralContext.specialty}</strong> ön değerlendirme özeti eklenecektir.
                </div>
              )}

              <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentApproved}
                  onChange={(e) => setConsentApproved(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 accent-togg-turquoise cursor-pointer"
                />
                <span className="text-slate-300 leading-snug">
                  Randevu bilgilerimin sağlık asistanı tarafından işlenmesini, sevk bağlamımın hekime aktarılmak üzere hazırlanmasını ve harici sağlayıcı bağlantısına yönlendirilmeyi <strong>açıkça onaylıyorum</strong>.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={!consentApproved}
                className={`py-2.5 px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  consentApproved
                    ? 'bg-togg-turquoise hover:bg-[#33D0EE] text-togg-darkBlue cursor-pointer shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Onayla ve Devam Et</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAŞARILI DEVİR EKRANI */}
      {confirmationStep === 'BOOKED' && selectedSlot && (
        <div className="bg-cockpit-surface border border-emerald-800/80 rounded-2xl p-6 md:p-8 space-y-4 text-center max-w-xl mx-auto shadow-2xl">
          <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white">Randevu Yönlendirmesi Hazırlandı</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Seçtiğiniz hekim için klinik dışı sevk bağlamınız oluşturuldu. Hekim sisteminde randevunuzu tamamlamak için harici sayfaya geçebilirsiniz.
          </p>

          <div className="max-w-sm mx-auto bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-xs text-left space-y-1">
            <div className="font-bold text-white">{selectedSlot.providerName}</div>
            <div className="text-slate-400">{selectedSlot.clinicName}</div>
            <div className="text-togg-turquoise font-mono">{selectedSlot.displayTime}</div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setConfirmationStep('SELECTING');
                setSelectedSlot(null);
              }}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Kapat
            </button>
            <a
              href={selectedSlot.bookingUrl || 'https://www.doktortakvimi.com'}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-6 rounded-xl bg-togg-turquoise hover:bg-[#33D0EE] text-togg-darkBlue font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <span>Sağlayıcı Sayfasına Git</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CarePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Yükleniyor...</div>}>
      <CareContent />
    </Suspense>
  );
}
