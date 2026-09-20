import type { Metadata } from 'next';
import './globals.css';
import { VehicleContextProvider } from '../context/VehicleContext';
import { CockpitHeader } from '../components/CockpitHeader';

export const metadata: Metadata = {
  title: 'Togg Health MVP - Bütünleşik Önleyici Sağlık Platformu',
  description: 'Togg araçları için yapay zekâ destekli görme, cilt, mental iyi oluş ve hekim randevu ekosistemi.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-cockpit-bg text-cockpit-text flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
        <VehicleContextProvider>
          <CockpitHeader />
          <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-cockpit-border/40 py-4 px-6 text-center text-xs text-slate-500 bg-cockpit-surface/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 max-w-[1600px] mx-auto">
              <div>
                <strong className="text-slate-400">Togg Health MVP</strong> • Tıbbi teşhis içermez; ön değerlendirme ve değişim takibi sağlar.
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span>Acil Çağrı: 112</span>
                <span>•</span>
                <span>MHRS Randevu: 182</span>
                <span>•</span>
                <span>Gizlilik Öncelikli (Local-First)</span>
              </div>
            </div>
          </footer>
        </VehicleContextProvider>
      </body>
    </html>
  );
}
