'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, FilePlus, Sparkles } from 'lucide-react';
import { fetchLaporanList } from '@/services/laporanService';
import { Laporan } from '@/types/laporan';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';
import { formatDateIndonesian } from '@/utils/formatters';

export default function KalenderPage() {
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026 default

  useEffect(() => {
    fetchLaporanList().then(setLaporanList);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getLaporanForDate = (dayNumber: number) => {
    const formattedDay = String(dayNumber).padStart(2, '0');
    const formattedMonth = String(month + 1).padStart(2, '0');
    const targetDateStr = `${year}-${formattedMonth}-${formattedDay}`;

    return laporanList.filter((l) => l.tanggal === targetDateStr);
  };

  const daysGrid = [];
  // Empty padding cells for start of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-sky-600" />
            <span>Kalender Kegiatan Harian</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi sebaran pelaksanaan kegiatan harian BPS Kabupaten Lebak
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-slate-900 text-sm w-36 text-center">
            {BULAN_INDONESIA[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        {/* Days Header */}
        <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
          <span className="text-rose-500">Minggu</span>
          <span>Senin</span>
          <span>Selasa</span>
          <span>Rabu</span>
          <span>Kamis</span>
          <span>Jumat</span>
          <span>Sabtu</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysGrid.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="h-28 bg-slate-50/40 rounded-xl border border-transparent" />;
            }

            const dayLaporan = getLaporanForDate(day);
            const hasLaporan = dayLaporan.length > 0;

            return (
              <div
                key={idx}
                className={`h-28 p-2 rounded-xl border transition-all flex flex-col justify-between ${
                  hasLaporan
                    ? 'bg-sky-50/60 border-sky-200 shadow-2xs'
                    : 'bg-white border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-xs ${
                      hasLaporan ? 'text-sky-700 font-extrabold' : 'text-slate-700'
                    }`}
                  >
                    {day}
                  </span>
                  {hasLaporan && (
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </div>

                {hasLaporan ? (
                  <div className="space-y-1">
                    {dayLaporan.map((lap) => (
                      <div
                        key={lap.id}
                        className="bg-white border border-sky-200 text-sky-900 rounded p-1 text-[10px] font-semibold truncate"
                        title={lap.nama_kegiatan}
                      >
                        {lap.nama_kegiatan}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-300 text-center">Tidak ada agenda</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
