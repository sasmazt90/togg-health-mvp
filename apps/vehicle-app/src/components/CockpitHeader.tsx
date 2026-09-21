'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVehicle } from '../context/VehicleContext';
import {
  Eye,
  Sparkles,
  HeartPulse,
  CalendarCheck,
  User,
  ShieldCheck,
  Car,
  Activity,
  BatteryCharging,
  Video,
  Mic,
  AlertTriangle
} from 'lucide-react';

export const CockpitHeader: React.FC = () => {
  const pathname = usePathname();
  const { state, toggleDrivingMode, isParked } = useVehicle();

  const navItems = [
    { href: '/', label: 'Kokpit', icon: Activity },
    { href: '/vision', label: 'Görme Kontrolü', icon: Eye },
    { href: '/skin', label: 'Cilt Kontrolü', icon: Sparkles },
    { href: '/mental', label: 'Ruhsal İyi Oluş', icon: HeartPulse },
    { href: '/care', label: 'Uzman & Randevu', icon: CalendarCheck },
    { href: '/profile', label: 'Sağlık Geçmişim', icon: User },
    { href: '/privacy', label: 'Gizlilik & İzinler', icon: ShieldCheck },
  ];

  return (
    <header className="border-b border-white/10 bg-[#050b14]/95 backdrop-blur-md sticky top-0 z-50">
      {/* Üst Telemetri ve Güvenlik Durum Çubuğu */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 text-xs">
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

          <div className="hidden md:flex items-center gap-2.5 text-slate-400 border-l border-white/10 pl-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <User className="w-3.5 h-3.5 text-togg-turquoise" />
              <span>{state.driverName}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{state.currentLocation.label}</span>
          </div>
        </div>

        {/* Sensörler, Batarya ve Araç Durumu Butonu */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-slate-400 bg-slate-950/80 px-3.5 py-1 rounded-full border border-white/10 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Video className="w-3 h-3 text-emerald-400" /> Kamera
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Mic className="w-3 h-3 text-emerald-400" /> Mikrofon
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <BatteryCharging className="w-3.5 h-3.5 text-togg-turquoise" /> %{state.batteryLevelPct}
            </span>
          </div>

          {/* Sürüş / Park Durumu */}
          <button
            onClick={toggleDrivingMode}
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs transition-all border shadow-sm ${
              isParked
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/70 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/80 hover:bg-amber-900/70 animate-pulse'
            }`}
            title="Sürüş ve Park modları arasında geçiş"
          >
            <Car className="w-3.5 h-3.5" />
            <span>
              {isParked ? (
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
          </button>
        </div>
      </div>

      {/* Ana Navigasyon Sekmeleri (Geniş Otomotiv Dokunmatik Çubuğu) */}
      <nav className="flex items-center justify-between px-6 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
        {!isParked && (
          <div className="hidden xl:flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Sürüş modu devrede: Görsel testler kilitlendi.</span>
          </div>
        )}
      </nav>
    </header>
  );
};
