'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  FileCheck,
  Calendar,
  Image as ImageIcon,
  FilePlus,
  ExternalLink,
  Eye,
  Sparkles,
} from 'lucide-react';
import { fetchLaporanList } from '@/services/laporanService';
import { Activity } from '@/types/laporan';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { formatDateIndonesian } from '@/utils/formatters';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';

export default function DashboardPage() {
  const [laporanList, setLaporanList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaporan, setSelectedLaporan] = useState<Activity | null>(null);

  useEffect(() => {
    fetchLaporanList().then((list) => {
      setLaporanList(list);
      setLoading(false);
    });
  }, []);

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  // Metrics computation
  const monthlyReports = laporanList.filter((l) => {
    const dateStr = l.start_date || l.tanggal || '';
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
  }).length;

  const yearlyReports = laporanList.filter((l) => {
    const dateStr = l.start_date || l.tanggal || '';
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === currentYear;
  }).length;

  const totalActivities = laporanList.length;
  const totalPhotos = laporanList.reduce((acc, curr) => acc + (curr.documents?.length || curr.fotos?.length || 0), 0);
  const totalPdfs = laporanList.filter((l) => l.drive_pdf_url).length;

  // Monthly Chart Data
  const monthlyChartData = BULAN_INDONESIA.map((monthName, idx) => {
    const count = laporanList.filter((l) => {
      const dateStr = l.start_date || l.tanggal || '';
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === idx;
    }).length;
    return { month: monthName, count };
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="gradient-bps p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-sky-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Otomasi Bukti Dukung BPS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang di Laporan Harian Kerja
          </h1>
          <p className="text-sm text-sky-100/90 leading-relaxed">
            Buat ringkasan kegiatan formal dengan AI Gemini, kelola foto dokumentasi, dan hasilkan PDF standar resmi BPS Kabupaten Lebak yang tersinkronisasi dengan Google Drive.
          </p>
        </div>

        <Link
          href="/laporan/tambah"
          className="z-10 px-6 py-3.5 bg-white text-sky-800 hover:bg-sky-50 font-bold rounded-2xl text-sm shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 flex-shrink-0"
        >
          <FilePlus className="w-5 h-5 text-sky-600" />
          <span>Buat Laporan Hari Ini</span>
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Laporan Bulan Ini"
          value={monthlyReports}
          subtitle={`Periode ${BULAN_INDONESIA[currentMonthIdx]}`}
          icon={Calendar}
          color="sky"
        />
        <StatCard
          title="Laporan Tahun Ini"
          value={yearlyReports}
          subtitle={`Tahun ${currentYear}`}
          icon={FileText}
          color="emerald"
        />
        <StatCard
          title="Total Kegiatan"
          value={totalActivities}
          subtitle="Keseluruhan Laporan"
          icon={FileCheck}
          color="amber"
        />
        <StatCard
          title="Foto Dokumentasi"
          value={totalPhotos}
          subtitle="Tersimpan di Drive"
          icon={ImageIcon}
          color="indigo"
        />
        <StatCard
          title="File PDF BPS"
          value={totalPdfs}
          subtitle="Siap Cetak & Kirim"
          icon={FileText}
          color="rose"
        />
      </div>

      {/* Monthly Activity Chart */}
      <ActivityChart data={monthlyChartData} />

      {/* Recent Reports Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Laporan Kegiatan Terbaru</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daftar entri bukti dukung harian terkini</p>
          </div>
          <Link
            href="/laporan"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Lihat Semua Laporan →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Memuat data laporan harian...
          </div>
        ) : laporanList.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Belum ada laporan kegiatan</p>
            <p className="text-xs text-slate-400">
              Klik tombol 'Buat Laporan Hari Ini' untuk menambah laporan baru
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nama Pegawai</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {laporanList.slice(0, 5).map((lap) => (
                  <tr key={lap.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDateIndonesian(lap.start_date || lap.tanggal || '')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{lap.nama_pegawai || 'Dede Setiawan'}</td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {lap.name || lap.nama_kegiatan}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-full">
                        {lap.activity_type === 'PERJALANAN_DINAS' ? 'Perjadin' : 'Non-PD'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedLaporan(lap)}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Preview PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {lap.drive_pdf_url && (
                          <a
                            href={lap.drive_pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Buka PDF di Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {selectedLaporan && (
        <PDFPreviewModal
          isOpen={!!selectedLaporan}
          onClose={() => setSelectedLaporan(null)}
          laporan={selectedLaporan}
        />
      )}
    </div>
  );
}
