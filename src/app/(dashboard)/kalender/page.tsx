'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  ExternalLink,
  X,
  Eye,
  FileText,
} from 'lucide-react';
import { fetchLaporanList } from '@/services/laporanService';
import { Activity } from '@/types/laporan';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';

export default function KalenderPage() {
  const [laporanList, setLaporanList] = useState<Activity[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026 default

  // Selected date popup modal state
  const [selectedDayLaporan, setSelectedDayLaporan] = useState<{ day: number; list: Activity[] } | null>(null);
  const [previewLaporan, setPreviewLaporan] = useState<Activity | null>(null);

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

    return laporanList.filter((l) => (l.start_date || l.tanggal) === targetDateStr);
  };

  const handleCellClick = (day: number, list: Activity[]) => {
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
            Visualisasi sebaran pelaksanaan kegiatan harian BPS Kabupaten Lebak (Klik tanggal untuk melihat kegiatan)
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

      {/* Calendar Grid Container with Horizontal Scroll for Mobile HP */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-6 transition-colors overflow-x-auto">
        <div className="min-w-[650px]">
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

          {/* Days Grid with Proportional Heights */}
          <div className="grid grid-cols-7 gap-2 pt-3">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={idx} className="min-h-[90px] bg-slate-50/40 dark:bg-slate-800/20 rounded-xl border border-transparent" />;
              }

              const dayLaporan = getLaporanForDate(day);
              const hasLaporan = dayLaporan.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(day, dayLaporan)}
                  className={`min-h-[90px] p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    hasLaporan
                      ? 'bg-sky-50/80 dark:bg-sky-950/50 border-sky-300 dark:border-sky-800 shadow-2xs hover:shadow-md hover:scale-[1.02]'
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
                      <span className="px-1.5 py-0.5 bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-900 text-[10px] font-black rounded-full">
                        {dayLaporan.length}
                      </span>
                    )}
                  </div>

                  {/* Activity Titles Only */}
                  {hasLaporan ? (
                    <div className="space-y-1">
                      {dayLaporan.map((lap) => (
                        <div
                          key={lap.id}
                          className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-sky-900 dark:text-sky-200 rounded-lg px-2 py-1 text-[11px] font-bold truncate hover:bg-sky-100 dark:hover:bg-sky-900/60 shadow-2xs"
                          title={lap.name || lap.nama_kegiatan}
                        >
                          {lap.name || lap.nama_kegiatan}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-300 dark:text-slate-600 text-center">TIDAK ADA AGENDA</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clean Activity Titles Popup Modal */}
      {selectedDayLaporan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>Daftar Kegiatan Tanggal {selectedDayLaporan.day} {BULAN_INDONESIA[month]} {year}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedDayLaporan.list.length} Kegiatan Terdaftar
                </p>
              </div>
              <button
                onClick={() => setSelectedDayLaporan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Activity Titles */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {selectedDayLaporan.list.map((lap) => (
                <div
                  key={lap.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2 hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                      {lap.name || lap.nama_kegiatan}
                    </h4>
                    <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold rounded-full shrink-0">
                      {lap.activity_type === 'PERJALANAN_DINAS' ? 'Perjadin' : 'Non-PD'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lap.nama_pegawai || 'Pegawai BPS'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewLaporan(lap)}
                        className="p-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-sky-200 dark:border-sky-800"
                        title="Lihat Detail & Preview Dokumen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {lap.drive_pdf_url && (
                        <a
                          href={lap.drive_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1"
                          title="Buka PDF Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Drive</span>
                        </a>
                      )}
                    </div>
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
      {previewLaporan && (
        <PDFPreviewModal
          isOpen={!!previewLaporan}
          onClose={() => setPreviewLaporan(null)}
          laporanData={{
            id: previewLaporan.id,
            name: previewLaporan.name || previewLaporan.nama_kegiatan,
            namaKegiatan: previewLaporan.name || previewLaporan.nama_kegiatan,
            nama_kegiatan: previewLaporan.name || previewLaporan.nama_kegiatan,
            start_date: previewLaporan.start_date || previewLaporan.tanggal,
            end_date: previewLaporan.end_date || previewLaporan.tanggal_selesai,
            tanggal: previewLaporan.start_date || previewLaporan.tanggal,
            tanggalSelesai: previewLaporan.end_date || previewLaporan.tanggal_selesai,
            tanggal_selesai: previewLaporan.end_date || previewLaporan.tanggal_selesai,
            jamMulai: previewLaporan.start_time || '08:00',
            jamSelesai: previewLaporan.end_time || '16:00',
            description: previewLaporan.description || (previewLaporan as any).deskripsi_kegiatan || (previewLaporan as any).ringkasan_kegiatan || '',
            deskripsiKegiatan: previewLaporan.description || (previewLaporan as any).deskripsi_kegiatan || (previewLaporan as any).ringkasan_kegiatan || '',
            ringkasanKegiatan: previewLaporan.description || (previewLaporan as any).ringkasan_kegiatan || (previewLaporan as any).deskripsi_kegiatan || '',
            ringkasan_kegiatan: previewLaporan.description || (previewLaporan as any).ringkasan_kegiatan || (previewLaporan as any).deskripsi_kegiatan || '',
            activity_type: previewLaporan.activity_type,
            jenisLaporan: previewLaporan.activity_type === 'PERJALANAN_DINAS' ? 'penugasan' : 'harian',
            destination: previewLaporan.destination || (previewLaporan as any).tempat_tujuan,
            tempatTujuan: previewLaporan.destination || (previewLaporan as any).tempat_tujuan,
            letter_number: previewLaporan.letter_number || (previewLaporan as any).nomor_surat,
            nomorSurat: previewLaporan.letter_number || (previewLaporan as any).nomor_surat,
            spd_number: previewLaporan.spd_number || (previewLaporan as any).nomor_spd,
            nomorSpd: previewLaporan.spd_number || (previewLaporan as any).nomor_spd,
            people: previewLaporan.people || [],
            petugasDitemui: previewLaporan.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || (previewLaporan as any).petugas_ditemui || [],
            petugas_ditemui: previewLaporan.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || (previewLaporan as any).petugas_ditemui || [],
            namaPegawai: previewLaporan.nama_pegawai || 'Pegawai BPS',
            nama_pegawai: previewLaporan.nama_pegawai || 'Pegawai BPS',
            nip: previewLaporan.nip || '',
            jabatan: previewLaporan.jabatan || 'Pegawai BPS',
            documents: previewLaporan.documents || (previewLaporan as any).fotos || [],
            fotos: previewLaporan.documents || (previewLaporan as any).fotos || [],
          }}
        />
      )}
    </div>
  );
}
