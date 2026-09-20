'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
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
  UserCheck
} from 'lucide-react';

interface CareSlot {
  id: string;
  specialty: 'Dermatoloji' | 'Göz Hastalıkları' | 'Klinik Psikoloji';
  providerName: string;
  title: string;
  clinicName: string;
  locationLabel: string;
  isOnline: boolean;
  dateTime: string;
  displayTime: string;
  travelTimeMin: number;
  calendarConflict: boolean;
  matchScore: number;
}

function CareContent() {
  const { state } = useVehicle();
  const searchParams = useSearchParams();
  const initialSpecialty = (searchParams.get('specialty') as any) || 'Dermatoloji';

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(initialSpecialty);
  const [filterType, setFilterType] = useState<'ALL' | 'IN_PERSON' | 'ONLINE'>('ALL');
  const [selectedSlot, setSelectedSlot] = useState<CareSlot | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<'SELECTING' | 'CONFIRM_MODAL' | 'BOOKED'>('SELECTING');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const mockSlots: CareSlot[] = [
    {
      id: 'slot-01',
      specialty: 'Dermatoloji',
      providerName: 'Doç. Dr. Selin Kaya',
      title: 'Dermatoloji Uzmanı',
      clinicName: 'Acıbadem Altunizade Hastanesi',
      locationLabel: 'Altunizade, Üsküdar',
      isOnline: false,
      dateTime: '2026-09-22T18:20:00',
      displayTime: 'Yarın (Salı) 18:20',
      travelTimeMin: 14,
      calendarConflict: false,
      matchScore: 98,
    },
    {
      id: 'slot-02',
      specialty: 'Dermatoloji',
      providerName: 'Uzm. Dr. Burak Çetin',
      title: 'Dermatoloji & Cilt Hastalıkları',
      clinicName: 'Online Danışmanlık Odası',
      locationLabel: 'Online / Araç İçi Görüşme',
      isOnline: true,
      dateTime: '2026-09-23T19:00:00',
      displayTime: 'Çarşamba 19:00',
      travelTimeMin: 0,
      calendarConflict: false,
      matchScore: 94,
    },
    {
      id: 'slot-03',
      specialty: 'Göz Hastalıkları',
      providerName: 'Prof. Dr. Emre Demir',
      title: 'Göz Hastalıkları & Retina',
      clinicName: 'Dünyagöz Etiler',
      locationLabel: 'Etiler, Beşiktaş',
      isOnline: false,
      dateTime: '2026-09-23T17:45:00',
      displayTime: 'Çarşamba 17:45',
      travelTimeMin: 22,
      calendarConflict: false,
      matchScore: 95,
    },
    {
      id: 'slot-04',
      specialty: 'Klinik Psikoloji',
      providerName: 'Uzm. Psk. Zeynep Arslan',
      title: 'Klinik Psikolog & Bilişsel Terapist',
      clinicName: 'Online Görüşme Odası',
      locationLabel: 'Online Görüşme',
      isOnline: true,
      dateTime: '2026-09-23T20:00:00',
      displayTime: 'Çarşamba 20:00',
      travelTimeMin: 0,
      calendarConflict: false,
      matchScore: 96,
    }
  ];

  const filteredSlots = mockSlots.filter((slot) => {
    if (selectedSpecialty !== 'TÜMÜ' && slot.specialty !== selectedSpecialty) return false;
    if (filterType === 'IN_PERSON' && slot.isOnline) return false;
    if (filterType === 'ONLINE' && !slot.isOnline) return false;
    return true;
  });

  const handleTriggerSearch = (spec: string) => {
    setSelectedSpecialty(spec);
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 1200);
  };

  const handleSelectSlot = (slot: CareSlot) => {
    setSelectedSlot(slot);
    setConfirmationStep('CONFIRM_MODAL');
  };

  const handleConfirmBooking = () => {
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
            <h1 className="text-xl md:text-2xl font-bold text-white">Sağlık Profesyoneli & Randevu Asistanı</h1>
            <p className="text-xs text-slate-400">
              Otonom browser-agent ile hekim arama, takvim entegrasyonu ve sürüş süresi hesabı
            </p>
          </div>
        </div>

        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Açık Kullanıcı Onayı Zorunludur</span>
        </div>
      </div>

      {/* Branş ve Filtre Çubuğu */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-2">Branş Seçimi:</span>
            {['Dermatoloji', 'Göz Hastalıkları', 'Klinik Psikoloji', 'TÜMÜ'].map((spec) => (
              <button
                key={spec}
                onClick={() => handleTriggerSearch(spec)}
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

        {/* Browser Agent Durum Göstergesi */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 text-xs text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSearching ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>
              {isSearching
                ? 'Playwright Agent: DoktorTakvimi ve klinik portalları taranıyor...'
                : 'Browser Agent Hazır: Takvim boşluklarınız ve araç sürüş süresi entegre edildi.'}
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Konum: <strong>Kadıköy</strong> • Tercih Edilen Şehir: <strong>İstanbul</strong>
          </div>
        </div>
      </div>

      {/* Uygun Randevu Slotları Listesi */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Takviminiz ve Ulaşım Sürenizle Uyumlu Seçenekler ({filteredSlots.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 space-y-4 hover:border-violet-500/50 transition-all flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-800">
                      {slot.specialty}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{slot.providerName}</h3>
                    <p className="text-xs text-slate-400">{slot.title} • {slot.clinicName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-800">
                      %{slot.matchScore} Uyum
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <strong>{slot.displayTime}</strong>
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Takviminiz Uygun
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {slot.locationLabel}
                    </span>
                    {!slot.isOnline && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Car className="w-3.5 h-3.5 text-cyan-400" />
                        Tahmini Ulaşım: {slot.travelTimeMin} dk
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSelectSlot(slot)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all min-h-touch shadow"
              >
                <span>Bu Randevuyu Seç</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Onay Modalı (Explicit User Confirmation Gate) */}
      {confirmationStep === 'CONFIRM_MODAL' && selectedSlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cockpit-surface border border-violet-500/50 rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 border-b border-cockpit-border pb-4">
              <div className="p-2.5 bg-violet-950 text-violet-400 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Randevu Onayı</h3>
                <p className="text-xs text-slate-400">Geri döndürülemez işlem öncesi açık kullanıcı teyidi</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Hekim:</span>
                <strong className="text-white">{selectedSlot.providerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Branş / Klinik:</span>
                <span className="text-slate-200 text-xs">{selectedSlot.specialty} • {selectedSlot.clinicName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Zaman:</span>
                <strong className="text-cyan-400">{selectedSlot.displayTime}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Ulaşım / Konum:</span>
                <span className="text-slate-300 text-xs">{selectedSlot.locationLabel}</span>
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 text-xs text-amber-200">
              <strong>Önemli Bilgi:</strong> Onay vermeniz durumunda randevu talebi ilgili sağlık kuruluşuna iletilecektir. Sistem sizin açık onayınız olmadan hiçbir form göndermez veya ödeme yapmaz.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmationStep('SELECTING')}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmBooking}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg"
              >
                Randevuyu Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başarılı Randevu Bildirimi */}
      {confirmationStep === 'BOOKED' && selectedSlot && (
        <div className="bg-emerald-950/30 border border-emerald-600/80 rounded-2xl p-6 md:p-8 space-y-4 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-emerald-900/50 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Randevu Başarıyla Planlandı</h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            {selectedSlot.displayTime} tarihindeki {selectedSlot.providerName} randevunuz takviminize kaydedildi ve araç navigasyonunuza rota olarak hazırlandı.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setConfirmationStep('SELECTING')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Listeye Geri Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CarePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Yükleniyor...</div>}>
      <CareContent />
    </React.Suspense>
  );
}
