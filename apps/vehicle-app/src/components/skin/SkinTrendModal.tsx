'use client';

import React from 'react';
import { TrendingUp, X } from 'lucide-react';
import { SkinRegionData } from '../../data/skinDemoFixture';

interface SkinTrendModalProps {
  region: SkinRegionData;
  onClose: () => void;
}

export const SkinTrendModal: React.FC<SkinTrendModalProps> = ({ region, onClose }) => {
  const trendPoints = region.trend;
  // Chart dimensions
  const width = 480;
  const height = 180;
  const padX = 50;
  const padY = 30;

  // Y scale: -20% to +40% (total range 60%)
  const minY = -20;
  const maxY = 40;
  const getY = (val: number) => {
    const norm = (val - minY) / (maxY - minY);
    return height - padY - norm * (height - 2 * padY);
  };

  const getX = (index: number) => {
    if (trendPoints.length <= 1) return width / 2;
    return padX + (index / (trendPoints.length - 1)) * (width - 2 * padX);
  };

  const pointsStr = trendPoints
    .map((p, i) => `${getX(i)},${getY(p.value)}`)
    .join(' ');

  const areaStr = `${pointsStr} ${getX(trendPoints.length - 1)},${height - padY} ${getX(0)},${height - padY}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-xl bg-[#0B1526] border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-togg-turquoise/10 border border-togg-turquoise/30 flex items-center justify-center text-togg-turquoise">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Zaman İçinde Değişim</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {region.nameTr} bölgesindeki görsel değişim (Demo Geçmiş)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chart Container */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y Guide Lines and Labels */}
            {[40, 20, 0, -20].map((level) => {
              const y = getY(level);
              return (
                <g key={level}>
                  <line
                    x1={padX - 10}
                    y1={y}
                    x2={width - padX + 10}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.15)"
                    strokeDasharray={level === 0 ? 'none' : '3 3'}
                    strokeWidth={level === 0 ? '1.2' : '0.8'}
                  />
                  <text
                    x={padX - 16}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-500 font-mono"
                  >
                    {level > 0 ? `+${level}%` : `${level}%`}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <polygon points={areaStr} fill="url(#trendAreaGradient)" />

            {/* Trend Polyline */}
            <polyline
              points={pointsStr}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {trendPoints.map((p, i) => {
              const cx = getX(i);
              const cy = getY(p.value);
              const isLast = i === trendPoints.length - 1;

              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isLast ? '5' : '4'}
                    fill="#F59E0B"
                    stroke="#0B1526"
                    strokeWidth="2"
                  />
                  {/* Badge on latest or above */}
                  {isLast ? (
                    <g transform={`translate(${cx - 20}, ${cy - 28})`}>
                      <rect
                        width="40"
                        height="20"
                        rx="6"
                        fill="#F59E0B"
                        className="shadow-md"
                      />
                      <text
                        x="20"
                        y="14"
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-slate-950 font-mono"
                      >
                        {p.value > 0 ? `+${p.value}%` : `${p.value}%`}
                      </text>
                    </g>
                  ) : (
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-slate-300 font-semibold"
                    >
                      {p.value > 0 ? `+${p.value}%` : `${p.value}%`}
                    </text>
                  )}
                  {/* X Axis Date Label */}
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    className="text-[11px] fill-slate-400 font-medium"
                  >
                    {p.date}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <span>Referans baz: 17 Eylül 2026</span>
          <span className="text-amber-400 font-medium">İzleme sıklığı: 2 günde bir</span>
        </div>
      </div>
    </div>
  );
};
