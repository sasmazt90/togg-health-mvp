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
  dateTime: string;
  displayTime: string;
  travelTimeMin: number;
  trafficBadge?: string;
  calendarConflict: boolean;
  calendarFits: boolean;
  sourceType: 'LIVE' | 'DEMO';
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
      // Fallback
      setSlots([
        {
          id: 'fb-01',
          specialty,
          providerName: 'Doç. Dr. Selin Kaya',
          title: `${specialty} Uzmanı`,
          clinicName: 'Acıbadem Altunizade Hastanesi',
          locationLabel: 'Altunizade, İstanbul',
          isOnline: false,
          dateTime: '2026-09-22T18:20:00',
          displayTime: 'Yarın 18:20',
          travelTimeMin: 14,
          trafficBadge: 'Tahmini Sürüş (Demo Veri)',
          calendarConflict: true,
          calendarFits: false,
          sourceType: 'DEMO',
          sourceBadge: 'Demo Veri (Offline)',
          matchScore: 88,
          bookingUrl: 'https://www.doktortakvimi.com'
        },
        {
          id: 'fb-02',
          specialty,
          providerName: 'Prof. Dr. Emre Demir',
          title: `${specialty} ve Danışman Hekim`,
          clinicName: 'Dünyagöz Etiler',
          locationLabel: 'Etiler, Beşiktaş',
          isOnline: false,
          dateTime: '2026-09-23T17:45:00',
          displayTime: 'Çarşamba 17:45',
          travelTimeMin: 22,
          trafficBadge: 'Tahmini Sürüş (Demo Veri)',
          calendarConflict: false,
          calendarFits: true,
          sourceType: 'DEMO',
          sourceBadge: 'Demo Veri (Offline)',
          matchScore: 95,
          bookingUrl: 'https://www.doktortakvimi.com'
        }
      ]);
      setSearchProviderStatus({
        status: 'FALLBACK',
        sourceBadge: 'Demo Veri (Çevrimdışı Mod)'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(selectedSpecialty);
  }, [selectedSpecialty]);

  const filteredSlots = slots.filter((slot) => {
    if (filterType === 'IN_PERSON' && slot.isOnline) return false;
    if (filterType === 'ONLINE' && !slot.isOnline) return false;
    return true;
  });

  const handleSelectSlot = (slot: CareSlot) => {
    setSelectedSlot(slot);
    setConsentApproved(false);
    setConfirmationStep('CONFIRM_MODAL');
  };

  const handleConfirmBooking = () => {
    if (!consentApproved) return;
    setConfirmationStep('BOOKED');
  };

  const clearReferralContext = () => {
    try {
      localStorage.removeItem('togg_active_referral_context');
    } catch (e) {
      console.warn(e);
    }
    setReferralContext(null);
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
            <h1 className="text-xl md:text-2xl font-bold text-white">Sağlık Profesyoneli & Randevu Asistanı</h1>
            <p className="text-xs text-slate-400">
              Otonom browser-agent ile hekim arama, gerçek takvim çakışma kontrolü ve sürüş süresi hesabı
            </p>
          </div>
        </div>

        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Açık Kullanıcı Onayı Zorunludur</span>
        </div>
      </div>

      {/* ORTAK SEVK / YÖNLENDİRME BAĞLAMI (ReferralContext) */}
      {referralContext && (
        <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-700/60 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              {referralContext.sourceModule === 'VISION' && <Eye className="w-4 h-4 text-cyan-400" />}
              {referralContext.sourceModule === 'SKIN' && <Sparkles className="w-4 h-4 text-emerald-400" />}
              {referralContext.sourceModule === 'MENTAL' && <HeartPulse className="w-4 h-4 text-indigo-400" />}
              <span>Yönlendirme / Sevk Bağlamı Aktarıldı ({referralContext.sourceModule})</span>
              <span className="bg-cyan-900/60 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded text-[10px]">
                Önerilen: {referralContext.specialty}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              <strong>Değerlendirme Notu:</strong> {referralContext.reasonSummary}
            </p>
          </div>

          <button
            onClick={clearReferralContext}
            className="text-[11px] text-slate-400 hover:text-white underline shrink-0 self-start md:self-center"
          >
            Bağlamı Kaldır
          </button>
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
                ? 'Playwright Browser Agent: DoktorTakvimi ve hekim portalları taranıyor...'
                : searchProviderStatus.handoffNote ||
                  'Browser Agent Taraması Tamamlandı. Takvim ve sürüş süreleri eşleştirildi.'}
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
            <div className="text-sm font-semibold text-white">Uygun Hekimler ve Boş Saatler Aranıyor...</div>
            <div className="text-xs text-slate-400">
              Playwright browser agent hekim portallarını tarıyor ve araç takvimiyle eşleştiriyor.
            </div>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-8 text-center text-xs text-slate-400">
            Seçilen kriterlere uygun müsait randevu bulunamadı.
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const hasConflict = slot.calendarConflict;

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
                          slot.sourceType === 'LIVE'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
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

                    {/* Sürüş Süresi & Takvim Durumu */}
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Car className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Araçla Ulaşım: <strong>{slot.travelTimeMin} dk</strong></span>
                        <span className="text-[10px] text-slate-500">({slot.trafficBadge || 'Demo Veri'})</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        {hasConflict ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <strong>Takviminizle Çakışıyor (Mevcut Program Dolu)</strong>
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <strong>Takviminiz Uygun</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tarih & Seçim Butonu */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Önerilen Saat</div>
                      <div className="text-sm font-bold text-white">{slot.displayTime}</div>
                    </div>

                    <button
                      onClick={() => handleSelectSlot(slot)}
                      className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all min-h-touch flex items-center gap-1.5 shadow"
                    >
                      <span>Randevu Planla</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
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
                <span>Açık Kullanıcı Onayı (Randevu Handoff)</span>
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

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div><strong>Hekim:</strong> {selectedSlot.providerName} ({selectedSlot.title})</div>
                <div><strong>Klinik:</strong> {selectedSlot.clinicName}</div>
                <div><strong>Saat:</strong> {selectedSlot.displayTime}</div>
                <div><strong>Ulaşım:</strong> {selectedSlot.travelTimeMin} dakika ({selectedSlot.trafficBadge})</div>
                <div><strong>Veri Kaynağı:</strong> {selectedSlot.sourceBadge}</div>
              </div>

              <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                Randevuyu kesinleştirmek veya SMS doğrulamasını tamamlamak için hekimin kamuya açık randevu portalı güvenli şekilde açılacaktır.
              </div>

              {/* Onay Kutusu */}
              <label className="flex items-start gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentApproved}
                  onChange={(e) => setConsentApproved(e.target.checked)}
                  className="mt-0.5 accent-violet-500 rounded"
                />
                <span className="text-slate-300 text-xs">
                  Randevu bilgilerini ve tahmini ulaşım süresini inceledim. Hekim randevu sayfasına yönlendirilmeyi <strong>onaylıyorum</strong>.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-cockpit-border">
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Vazgeç
              </button>

              <button
                onClick={handleConfirmBooking}
                disabled={!consentApproved}
                className={`py-2.5 px-5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                  consentApproved
                    ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Onayla ve Sayfayı Aç (Safe Handoff)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REZERVASYON TAMAMLANDI / HANDOFF EKRANI */}
      {confirmationStep === 'BOOKED' && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl max-w-lg w-full p-6 space-y-5 text-center shadow-2xl">
            <div className="w-14 h-14 bg-emerald-950/80 text-emerald-400 border border-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Güvenli Yönlendirme Hazır</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedSlot.providerName} için randevu portalı açılmaya hazır. SMS doğrulaması gibi kişisel güvenlik adımlarını tarayıcıda tamamlayabilirsiniz.
              </p>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-left text-xs text-slate-300 space-y-1">
              <div><strong>Seçilen Randevu:</strong> {selectedSlot.providerName}</div>
              <div><strong>Zaman:</strong> {selectedSlot.displayTime}</div>
              <div><strong>Ulaşım Süresi:</strong> {selectedSlot.travelTimeMin} dakika</div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Kapat
              </button>

              <a
                href={selectedSlot.bookingUrl || 'https://www.doktortakvimi.com'}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow"
              >
                <span>Hekim Sayfasına Git</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CarePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Yükleniyor...</div>}>
      <CareContent />
    </Suspense>
  );
}
