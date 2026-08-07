'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Download,
  Filter,
  Eye,
  ExternalLink,
  Edit2,
  Trash2,
  Folder,
  FilePlus,
  Copy,
  CheckCircle2,
  RefreshCw,
  Bookmark,
} from 'lucide-react';
import { fetchLaporanList, deleteLaporanRecord } from '@/services/laporanService';
import { Laporan } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { exportLaporanToExcel } from '@/lib/excel';
import { useToast } from '@/components/ui/Toast';

export default function RiwayatLaporanPage() {
  const { showToast } = useToast();
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters - default to 'all' for month and year so no new report is accidentally hidden
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Modals
  const [previewLaporan, setPreviewLaporan] = useState<Laporan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLaporanList();
    setLaporanList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered List
  const filteredList = laporanList.filter((lap) => {
    const d = new Date(lap.tanggal || Date.now());
    const matchSearch =
      lap.nama_kegiatan.toLowerCase().includes(search.toLowerCase()) ||
      lap.nama_pegawai.toLowerCase().includes(search.toLowerCase()) ||
      lap.ringkasan_kegiatan.toLowerCase().includes(search.toLowerCase());

    const matchMonth =
      selectedMonth === 'all' || d.getMonth() === parseInt(selectedMonth, 10);
    const matchYear =
      selectedYear === 'all' || d.getFullYear() === parseInt(selectedYear, 10);

    return matchSearch && matchMonth && matchYear;
  });

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await deleteLaporanRecord(deletingId);
      showToast('Laporan dan file terkait berhasil dihapus', 'info');
      setDeletingId(null);
      loadData();
    }
  };

  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data laporan untuk diexport', 'error');
      return;
    }
    exportLaporanToExcel(filteredList);
    showToast('Riwayat laporan berhasil diexport ke Excel!', 'success');
  };

  const handleCopyPdfUrl = (url: string, id: string) => {
    if (!url) {
      showToast('Link PDF Drive belum tersedia', 'error');
      return;
    }
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('Link PDF Google Drive (Akses View) berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-600" />
            <span>Riwayat Laporan Harian Kerja</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Arsip seluruh bukti dukung kegiatan harian resmi BPS Kabupaten Lebak (Terhubung Google Drive)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            title="Refresh Data Riwayat"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <Link
            href="/laporan/tambah"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <FilePlus className="w-4 h-4" />
            <span>Buat Laporan Baru</span>
          </Link>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kegiatan atau nama pegawai..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            >
              <option value="all">Semua Bulan</option>
              {BULAN_INDONESIA.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            >
              <option value="all">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Memuat riwayat laporan...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada laporan ditemukan</p>
            <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter bulan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Pegawai</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Ringkasan</th>
                  <th className="py-3 px-4 text-center">Google Drive PDF</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((lap) => (
                  <tr key={lap.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {formatDateIndonesian(lap.tanggal, lap.tanggal_selesai)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {lap.nama_pegawai}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-900 max-w-xs truncate">
                      {lap.nama_kegiatan}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">
                      {lap.ringkasan_kegiatan}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {lap.drive_pdf_url ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={lap.drive_pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-sky-200"
                            title="Buka file PDF di Google Drive (View Mode)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View PDF</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyPdfUrl(lap.drive_pdf_url!, lap.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Salin Link PDF Google Drive"
                          >
                            {copiedId === lap.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                <span>Salin Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Draf / Belum Final</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewLaporan(lap)}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Lihat Detail & Preview Dokumen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(lap.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Laporan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
      <PDFPreviewModal
        isOpen={!!previewLaporan}
        onClose={() => setPreviewLaporan(null)}
        laporan={previewLaporan}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Laporan Kegiatan?"
        message="Apakah Anda yakin ingin menghapus laporan ini? File PDF dan foto terkait juga akan disinkronkan."
        confirmText="Hapus Laporan"
        isDangerous
      />
    </div>
  );
}
