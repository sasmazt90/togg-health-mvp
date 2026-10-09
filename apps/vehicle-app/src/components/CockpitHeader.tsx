'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { InformationButton } from './InformationButton';
import { usePathname } from 'next/navigation';
import { useVehicle } from '../context/VehicleContext';
import {
  Eye,
  Sparkles,
  HeartPulse,
  CalendarCheck,
  User,
  Ear,
  Smile,
  Car,
  Activity,
  AlertTriangle
} from 'lucide-react';

export const CockpitHeader: React.FC = () => {
  const pathname = usePathname();
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => { navigation.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [pathname]);
  const { state, toggleDrivingMode, isParked, syncStatus, syncError } = useVehicle();

  const navItems = [
    { href: '/', label: 'Kokpit', icon: Activity },
    { href: '/vision', label: 'Göz Sağlığı', icon: Eye },
    { href: '/skin', label: 'Cilt Sağlığı', icon: Sparkles },
    { href: '/dental', label: 'Diş Sağlığı', icon: Smile },
    { href: '/hearing', label: 'İşitme Sağlığı', icon: Ear },
    { href: '/mental', label: 'Ruhsal Sağlık', icon: HeartPulse },
    { href: '/care', label: 'Uzman & Randevu', icon: CalendarCheck },
    { href: '/profile', label: 'Sağlık Geçmişim', icon: User },
  ];

  return (
    <header data-cockpit-header className="border-b border-white/10 bg-[#050b14]/95 backdrop-blur-md md:sticky top-0 z-50">
      {/* Üst Telemetri ve Güvenlik Durum Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b border-white/5 text-xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img
              src="/brand/togg/togg-logo.svg"
              alt="Togg"
              className="h-5 w-auto object-contain"
            />
            <span className="h-3.5 w-px bg-slate-700/60" />
            <span className="font-extrabold text-white tracking-wide text-sm flex items-center">
              Attune<span className="text-togg-turquoise">.more</span>
            </span>
          </Link>


        </div>

        {/* Sensörler, Batarya ve Araç Durumu Butonu */}
        <div className="flex items-center gap-3">


          {/* Sürüş / Park Durumu */}
          <span data-vehicle-status className={`flex items-center gap-2 rounded-full px-3 py-2 border text-xs ${isParked?'text-emerald-300 border-emerald-800':'text-amber-200 border-amber-700'}`}><Car className="w-3.5 h-3.5"/>{syncStatus!=='synced'?(syncStatus==='failed'?'ARAÇ DURUMU BELİRSİZ':'ARAÇ DURUMU DOĞRULANIYOR'):isParked?'PARK':'SÜRÜŞ'}</span>
          <InformationButton title="Demo araç durumu"><p>Windows MVP’si gerçek araç API/CAN bağlantısına sahip değildir. Aşağıdaki demo kontrolü gerçek frontend/backend durumunu değiştirir. PARK doğrulanmadan işlemler açılmaz. Kamera ve mikrofonun native izinleri araç sensörlerinden bağımsızdır.</p>          <button
            onClick={toggleDrivingMode}
            disabled={syncStatus === 'loading' || syncStatus === 'updating'}
            className={`flex items-center gap-2 px-3 py-1 rounded-full shrink-0 font-bold text-xs transition-all border shadow-sm ${
              isParked
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/70 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/80 hover:bg-amber-900/70 animate-pulse'
            }`}
            title="Sürüş ve Park modları arasında geçiş"
          >
            <Car className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">
              {syncStatus !== 'synced' ? <strong>{syncStatus === 'failed' ? 'ARAÇ DURUMU BELİRSİZ' : 'ARAÇ DURUMU DOĞRULANIYOR'}</strong> : isParked ? (
                <>
                  <strong>PARK</strong> • 0 km/s
                </>
              ) : (
                <>
                  <strong>SÜRÜŞ</strong> • {state.currentSpeed} km/s
                </>
              )}
            </span>
            <span className="text-[9px] bg-white/10 px-1.5 py-0.2 rounded text-slate-300 font-normal">
              Değiştir
            </span>
          </button></InformationButton>
        </div>
      </div>

      {/* Ana Navigasyon Sekmeleri (Geniş Otomotiv Dokunmatik Çubuğu) */}
      <nav ref={navigation} aria-label="Ana sekmeler" className="flex items-center justify-between px-6 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onFocus={(event:React.FocusEvent<HTMLAnchorElement>)=>event.currentTarget.scrollIntoView({block:'nearest',inline:'nearest'})}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap min-h-touch ${
                  isActive
                    ? 'bg-togg-turquoise/15 text-togg-turquoise border border-togg-turquoise/30 shadow-[0_0_15px_rgba(0,194,231,0.18)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-togg-turquoise' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Sürüş Modu Kısıt Bildirimi */}
        {syncStatus === 'synced' && !isParked && (
          <div className="hidden xl:flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Sürüş modu devrede: Görsel testler kilitlendi.</span>
          </div>
        )}
      </nav>
      {syncError && <p role="alert" className="px-6 py-2 text-xs text-amber-200">{syncError}</p>}
    </header>
  );
};
