'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  ExternalLink,
  X,
  Sparkles,
  Eye,
} from 'lucide-react';
import { fetchLaporanList } from '@/services/laporanService';
import { Laporan } from '@/types/laporan';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';
import { formatDateIndonesian } from '@/utils/formatters';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';

export default function KalenderPage() {
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026 default

  // Selected date popup modal state
  const [selectedDayLaporan, setSelectedDayLaporan] = useState<{ day: number; list: Laporan[] } | null>(null);
  const [previewLaporan, setPreviewLaporan] = useState<Laporan | null>(null);

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

  const handleCellClick = (day: number, list: Laporan[]) => {
    if (list.length > 0) {
      setSelectedDayLaporan({ day, list });
    }
  };

  const daysGrid = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Kalender Kegiatan Harian</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualisasi sebaran pelaksanaan kegiatan harian BPS Kabupaten Lebak (Klik tanggal untuk detail)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-slate-900 dark:text-white text-sm w-36 text-center">
            {BULAN_INDONESIA[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4 transition-colors">
        {/* Days Header */}
        <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-rose-500 dark:text-rose-400">Minggu</span>
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
              return <div key={idx} className="h-28 bg-slate-50/40 dark:bg-slate-800/20 rounded-xl border border-transparent" />;
            }

            const dayLaporan = getLaporanForDate(day);
            const hasLaporan = dayLaporan.length > 0;

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(day, dayLaporan)}
                className={`h-28 p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                  hasLaporan
                    ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 shadow-2xs hover:shadow-md hover:scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-xs ${
                      hasLaporan ? 'text-sky-700 dark:text-sky-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {day}
                  </span>
                  {hasLaporan && (
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
                  )}
                </div>

                {hasLaporan ? (
                  <div className="space-y-1">
                    {dayLaporan.map((lap) => (
                      <div
                        key={lap.id}
                        className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-sky-900 dark:text-sky-200 rounded p-1 text-[10px] font-semibold truncate hover:bg-sky-100 dark:hover:bg-sky-900/60"
                        title={lap.nama_kegiatan}
                      >
                        {lap.nama_kegiatan}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-300 dark:text-slate-600 text-center">Tidak ada agenda</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Popup Modal showing list of activities on clicked date */}
      {selectedDayLaporan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>Rincian Kegiatan Tanggal {selectedDayLaporan.day} {BULAN_INDONESIA[month]} {year}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Terdeteksi {selectedDayLaporan.list.length} kegiatan harian resmi
                </p>
              </div>
              <button
                onClick={() => setSelectedDayLaporan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedDayLaporan.list.map((lap) => (
                <div
                  key={lap.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-sky-900 dark:text-sky-300">
                      {lap.nama_kegiatan}
                    </h4>
                    <span className="px-2.5 py-0.5 bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold rounded-full shrink-0">
                      {lap.kategori || 'Kegiatan BPS'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lap.nama_pegawai} ({lap.nip})</span>
                  </div>

                  {lap.ringkasan_kegiatan && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {lap.ringkasan_kegiatan}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setPreviewLaporan(lap)}
                      className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-sky-200 dark:border-sky-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview PDF</span>
                    </button>

                    {lap.drive_pdf_url && (
                      <a
                        href={lap.drive_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Google Drive</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedDayLaporan(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={!!previewLaporan}
        onClose={() => setPreviewLaporan(null)}
        laporan={previewLaporan}
      />
    </div>
  );
}
