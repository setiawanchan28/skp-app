'use client';

import React from 'react';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';

interface ActivityChartProps {
  data: { month: string; count: number }[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 5);

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/70 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-900">Grafik Laporan Kegiatan Per Bulan</h3>
          <p className="text-xs text-slate-500">Statistik aktivitas harian kerja tahun 2026</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-3 h-3 rounded-full bg-sky-600" />
          <span className="font-medium text-slate-600">Jumlah Laporan</span>
        </div>
      </div>

      <div className="pt-4 h-64 flex items-end justify-between gap-2 border-b border-slate-100 pb-2">
        {data.map((item, idx) => {
          const heightPercent = (item.count / maxCount) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div className="text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-xs">
                {item.count}
              </div>
              <div
                style={{ height: `${Math.max(heightPercent, 8)}%` }}
                className="w-full bg-sky-500 group-hover:bg-sky-600 rounded-t-lg transition-all duration-300 relative"
              />
              <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">
                {item.month.substring(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
