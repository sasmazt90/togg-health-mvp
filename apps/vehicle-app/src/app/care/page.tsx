'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import { ReferralContext } from '@packages/health-profile/types';
import {
  CalendarCheck,
  Search,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Car,
  Filter,
  UserCheck,
  RefreshCw,
  Sparkles,
  Eye,
  HeartPulse,
  AlertTriangle,
  Globe
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
  rawExtractedTime?: string;
  travelTimeMin: number;
  trafficBadge?: string;
  calendarConflict: boolean;
  calendarFits: boolean;
  calendarBadge?: string;
  sourceType: 'LIVE_AVAILABILITY' | 'LIVE_PROVIDER_ONLY' | 'DEMO';
  sourceBadge: string;
  matchScore: number;
  bookingUrl?: string;
  bookingStatus?: string;
  instructions?: string;
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
  const [searchProviderStatus, setSearchProviderStatus] = useState<{
    status: string;
    sourceBadge: string;
    handoffNote?: string;
    liveSearchUrl?: string;
  }>({
    status: 'SUCCESS',
    sourceBadge: 'Browser Agent Hazır'
  });

  // Ortak Sevk / Yönlendirme Bağlamı
  const [referralContext, setReferralContext] = useState<ReferralContext | null>(null);

  // Rezervasyon Onay Modalı
  const [selectedSlot, setSelectedSlot] = useState<CareSlot | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<'SELECTING' | 'CONFIRM_MODAL' | 'BOOKED'>('SELECTING');
  const [consentApproved, setConsentApproved] = useState<boolean>(false);

  // Sevk bağlamını localStorage'dan yükle
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

  // Backend API'den randevuları çek
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
        setSearchProviderStatus({
          status: data.status,
          sourceBadge: data.sourceBadge || 'Browser Agent',
          handoffNote: data.handoffNote,
          liveSearchUrl: data.liveSearchUrl
        });
      } else {
        throw new Error('API Hatası');
      }
    } catch (err) {
      // Jenerik Sentetik Fallback (Asla gerçek marka veya gerçek hekim ismi kullanılmaz)
      setSlots([
        {
          id: 'fb-01',
          specialty,
          providerName: 'Uzm. Dr. A. Yılmaz (Demo Hekim)',
          title: `${specialty} Uzmanı`,
          clinicName: 'Demo Göz & Cilt Sağlığı Merkezi',
          locationLabel: 'Merkez Şube, İstanbul',
          isOnline: false,
          dateTime: '2026-09-22T18:20:00',
          displayTime: 'Yarın 18:20',
          travelTimeMin: 14,
          trafficBadge: 'Tahmini Süre — Demo Model',
          calendarConflict: true,
          calendarFits: false,
          calendarBadge: 'Demo Takvim (Yerel Simülasyon)',
          sourceType: 'DEMO',
          sourceBadge: 'Demo Randevu Verisi',
          matchScore: 88,
          bookingUrl: 'https://www.doktortakvimi.com'
        },
        {
          id: 'fb-02',
          specialty,
          providerName: 'Doç. Dr. B. Kaya (Demo Hekim)',
          title: `${specialty} Danışmanı`,
          clinicName: 'Demo Sağlık Grubu',
          locationLabel: 'Batı Yakası, İstanbul',
          isOnline: false,
          dateTime: '2026-09-23T17:45:00',
          displayTime: 'Çarşamba 17:45',
          travelTimeMin: 22,
          trafficBadge: 'Tahmini Süre — Demo Model',
          calendarConflict: false,
          calendarFits: true,
          calendarBadge: 'Demo Takvim (Yerel Simülasyon)',
          sourceType: 'DEMO',
          sourceBadge: 'Demo Randevu Verisi',
          matchScore: 95,
          bookingUrl: 'https://www.doktortakvimi.com'
        }
      ]);
      setSearchProviderStatus({
        status: 'OFFLINE_FALLBACK',
        sourceBadge: 'Demo Randevu Verisi',
        handoffNote: 'Ağ bağlantısı kurulamadı; yerel demo hekim profilleri görüntülendi.'
      });
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Üst Başlık */}
      <div className="flex items-center justify-between border-b border-cockpit-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-950/80 border border-violet-800 text-violet-400 rounded-xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Sağlık Asistanı ve Hekim Randevusu (Care Agent)</h1>
            <p className="text-xs text-slate-400">
              Web hekim arama motoru, yerel takvim çakışma kontrolü ve güvenli dış sevk el sıkışması
            </p>
          </div>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          Durum: <strong className="text-emerald-400">Aktif</strong>
        </div>
      </div>

      {/* AKTİF SEVK BAĞLAMI BİLDİRİMİ */}
      {referralContext && (
        <div className="bg-gradient-to-r from-violet-950/50 via-slate-900/90 to-cyan-950/40 border border-violet-700/80 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>
                {referralContext.sourceModule === 'VISION' && '👁️ Görme Kontrolü Modülünden Sevk Edildi'}
                {referralContext.sourceModule === 'SKIN' && '✨ Cilt Takip Modülünden Sevk Edildi'}
                {referralContext.sourceModule === 'MENTAL' && '🧠 Ruhsal Asistan Modülünden Sevk Edildi'}
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('togg_active_referral_context');
                setReferralContext(null);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Bağlamı Temizle
            </button>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-violet-900/50">
            <strong>Klinik Olmayan Ön Bulgu Özeti:</strong> {referralContext.reasonSummary}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Önerilen Uzmanlık: <strong className="text-violet-300">{referralContext.specialty}</strong></span>
            <span>Tarih: {new Date(referralContext.timestamp).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>
      )}

      {/* Branş ve Filtre Çubuğu */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Branş:</span>
            {['Dermatoloji', 'Göz Hastalıkları', 'Klinik Psikoloji'].map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all min-h-touch ${
                  selectedSpecialty === spec
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Görüşme Türü:</span>
            {(['ALL', 'IN_PERSON', 'ONLINE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filterType === type
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {type === 'ALL' ? 'Tümü' : type === 'IN_PERSON' ? 'Yüz Yüze' : 'Online'}
              </button>
            ))}
          </div>
        </div>

        {/* Browser Agent ve Veri Kaynağı Durum Çubuğu */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>
              {loading
                ? 'Playwright Browser Agent: Hekim arama dizinleri taranıyor...'
                : searchProviderStatus.handoffNote ||
                  'Browser Agent Taraması Tamamlandı. Yerel takvim simülasyonu ve sürüş süreleri eşleştirildi.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                searchProviderStatus.sourceBadge.includes('Canlı')
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
              }`}
            >
              {searchProviderStatus.sourceBadge}
            </span>

            {searchProviderStatus.liveSearchUrl && (
              <a
                href={searchProviderStatus.liveSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Globe className="w-3 h-3" /> Canlı Arama Sayfası
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Randevu Slot Kartları */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-12 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm font-semibold text-white">Uygun Hekimler Aranıyor...</div>
            <div className="text-xs text-slate-400">
              Playwright browser agent hekim portallarını tarıyor ve araç içi simüle takvimle eşleştiriyor.
            </div>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-8 text-center text-xs text-slate-400">
            Seçilen kriterlere uygun hekim bulunamadı.
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const hasConflict = slot.calendarConflict;
            const isLiveProviderOnly = slot.sourceType === 'LIVE_PROVIDER_ONLY';

            return (
              <div
                key={slot.id}
                className={`bg-cockpit-surface border rounded-2xl p-5 md:p-6 transition-all hover:border-violet-500/60 shadow-lg ${
                  hasConflict ? 'border-amber-900/60 bg-slate-950/50 opacity-80' : 'border-cockpit-border'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Hekim Bilgileri */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{slot.providerName}</h3>
                      <span className="text-[11px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {slot.title}
                      </span>
                      {slot.isOnline ? (
                        <span className="text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                          Online Görüşme
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          Yüz Yüze
                        </span>
                      )}

                      {/* Canlı / Demo Rozeti */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          slot.sourceType === 'LIVE_AVAILABILITY'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                            : slot.sourceType === 'LIVE_PROVIDER_ONLY'
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {slot.sourceBadge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{slot.clinicName} • {slot.locationLabel}</span>
                    </p>

                    {/* Sürüş Süresi & Demo Takvim Durumu */}
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Car className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Araçla Ulaşım: <strong>{slot.travelTimeMin} dk</strong></span>
                        <span className="text-[10px] text-slate-500">({slot.trafficBadge || 'Tahmini Süre — Demo Model'})</span>
                      </div>

                      {slot.dateTime && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          {hasConflict ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <strong>Demo Takvim: Çakışıyor (Mevcut Program Dolu)</strong>
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <strong>Demo Takvim: Uygun</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isLiveProviderOnly && (
                      <div className="text-[11px] text-cyan-300/80 pt-1">
                        ℹ️ {slot.instructions || 'Doktor profili canlı kaynaktan bulundu — müsaitlik için siteyi aç'}
                      </div>
                    )}
                  </div>

                  {/* Tarih & Seçim Butonu */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">
                        {isLiveProviderOnly ? 'Müsaitlik Durumu' : 'Önerilen Saat'}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {isLiveProviderOnly ? 'Siteden Seçiniz' : slot.displayTime}
                      </div>
                    </div>

                    {isLiveProviderOnly ? (
                      <a
                        href={slot.bookingUrl || searchProviderStatus.liveSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all min-h-touch flex items-center gap-1.5 shadow"
                      >
                        <span>Siteyi Aç ve Müsaitliği Gör</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleSelectSlot(slot)}
                        className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all min-h-touch flex items-center gap-1.5 shadow"
                      >
                        <span>Randevu Planla</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AÇIK ONAY MODALI (CONSENT GATE) */}
      {confirmationStep === 'CONFIRM_MODAL' && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-cockpit-border pb-3">
              <div className="flex items-center gap-2 text-violet-400 font-bold text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>Açık Kullanıcı Onayı (Randevu Yönlendirmesi)</span>
              </div>
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                Togg Health MVP, onayınız olmadan dış web sitelerine adınıza bağlayıcı bir hasta kaydı oluşturmaz.
              </p>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1 text-slate-200">
                <div className="font-semibold text-white">{selectedSlot.providerName}</div>
                <div className="text-slate-400">{selectedSlot.clinicName} • {selectedSlot.locationLabel}</div>
                <div className="text-cyan-400 font-mono font-bold pt-1">{selectedSlot.displayTime}</div>
                <div className="text-[10px] text-amber-400">Veri Niteliği: {selectedSlot.sourceBadge}</div>
              </div>

              {referralContext && (
                <div className="bg-violet-950/30 border border-violet-800/40 p-2.5 rounded-lg text-[11px] text-violet-300">
                  ℹ️ Bu randevu talebine <strong>{referralContext.specialty}</strong> ön sevk bağlamı eklenecektir.
                </div>
              )}

              {/* Zorunlu Açık Onay Checkbox */}
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentApproved}
                  onChange={(e) => setConsentApproved(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 accent-violet-600 cursor-pointer"
                />
                <span className="text-slate-300 leading-snug">
                  Randevu bilgilerimin sağlık asistanı tarafından işlenmesini, sevk bağlamımın hekime aktarılmak üzere hazırlanmasını ve harici sağlayıcı bağlantısına yönlendirilmeyi <strong>açıkça onaylıyorum</strong>.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cockpit-border">
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={!consentApproved}
                className={`py-2.5 px-5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all ${
                  consentApproved
                    ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer shadow-lg'
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

      {/* BAŞARILI REZERVASYON DEVİR EKRANI */}
      {confirmationStep === 'BOOKED' && selectedSlot && (
        <div className="bg-cockpit-surface border border-emerald-800/80 rounded-2xl p-6 md:p-8 space-y-4 text-center">
          <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white">Randevu Yönlendirmesi Hazırlandı</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Seçtiğiniz randevu için sevk bağlamınız oluşturuldu. Hekim sisteminde randevunuzu tamamlamak için harici doğrulama sayfasına geçebilirsiniz.
          </p>

          <div className="max-w-sm mx-auto bg-slate-900/90 border border-slate-800 p-4 rounded-xl text-xs text-left space-y-1">
            <div className="font-bold text-white">{selectedSlot.providerName}</div>
            <div className="text-slate-400">{selectedSlot.clinicName}</div>
            <div className="text-cyan-400 font-mono">{selectedSlot.displayTime}</div>
            <div className="text-[11px] text-amber-400/80 pt-1">Veri Kaynağı: {selectedSlot.sourceBadge}</div>
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
              className="py-2.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
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
