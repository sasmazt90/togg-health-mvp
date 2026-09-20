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
    <header className="border-b border-cockpit-border bg-cockpit-surface/90 backdrop-blur-md sticky top-0 z-50">
      {/* Üst Telemetri ve Güvenlik Durum Çubuğu */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-cockpit-border/50 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-200 tracking-wider">TOGG HEALTH MVP</span>
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] border border-slate-700">
              TRU-CONNECT v0.1
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-400 border-l border-slate-800 pl-4">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-slate-200">{state.driverName}</strong> (Tru.ID: {state.driverId})
            </span>
            <span>•</span>
            <span className="text-slate-300">{state.currentLocation.label}</span>
          </div>
        </div>

        {/* Sensörler, Batarya ve Araç Durumu Simülatör Butonu */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            <span className="flex items-center gap-1 text-emerald-400">
              <Video className="w-3.5 h-3.5" /> Kabin Kamera
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Mic className="w-3.5 h-3.5" /> Mikrofon
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-cyan-400">
              <BatteryCharging className="w-3.5 h-3.5" /> %{state.batteryLevelPct}
            </span>
          </div>

          {/* Sürüş Modu / Park Modu Canlı Toggle Butonu */}
          <button
            onClick={toggleDrivingMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs transition-all border shadow-sm ${
              isParked
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                : 'bg-amber-950/80 text-amber-300 border-amber-600 hover:bg-amber-900 animate-pulse'
            }`}
            title="Sürüş ve Park modları arasında geçiş yapmak için tıklayın (Test Simülatörü)"
          >
            <Car className="w-4 h-4" />
            <span>
              {isParked ? (
                <>
                  <strong className="font-bold">PARK (P)</strong> • 0 km/s
                </>
              ) : (
                <>
                  <strong className="font-bold">SÜRÜŞ (D)</strong> • {state.currentSpeed} km/s
                </>
              )}
            </span>
            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded ml-1 border border-white/10">
              Değiştir
            </span>
          </button>
        </div>
      </div>

      {/* Ana Navigasyon Sekmeleri (Geniş Otomotiv Dokunmatik Çubuğu) */}
      <nav className="flex items-center justify-between px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-touch ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Sürüş Modu Kısıt Bildirimi */}
        {!isParked && (
          <div className="hidden xl:flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sürüş modu devrede: Görsel dikkat gerektiren testler kilitlendi.</span>
          </div>
        )}
      </nav>
    </header>
  );
};
