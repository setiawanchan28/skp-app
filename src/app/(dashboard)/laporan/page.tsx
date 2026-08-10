'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Download,
  Eye,
  ExternalLink,
  Edit2,
  Trash2,
  FilePlus,
  Copy,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  Filter,
} from 'lucide-react';
import { fetchLaporanList, deleteLaporanRecord } from '@/services/laporanService';
import { Laporan } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

export default function RiwayatLaporanPage() {
  const { showToast } = useToast();
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'harian' | 'penugasan'>('all');

  // Modals
  const [previewLaporan, setPreviewLaporan] = useState<Laporan | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{ id: string; jenis?: 'harian' | 'penugasan' } | null>(null);
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

  const filteredList = laporanList.filter((lap) => {
    const matchesSearch =
      lap.nama_kegiatan.toLowerCase().includes(search.toLowerCase()) ||
      lap.nama_pegawai.toLowerCase().includes(search.toLowerCase()) ||
      lap.deskripsi_kegiatan.toLowerCase().includes(search.toLowerCase()) ||
      (lap.kategori && lap.kategori.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (typeFilter === 'harian') return lap.jenis_laporan !== 'penugasan';
    if (typeFilter === 'penugasan') return lap.jenis_laporan === 'penugasan';

    return true;
  });

  const handleConfirmDelete = async () => {
    if (deletingTarget) {
      await deleteLaporanRecord(deletingTarget.id, deletingTarget.jenis);
      showToast('Laporan berhasil dihapus', 'info');
      setDeletingTarget(null);
      loadData();
    }
  };

  const handleCopyPdfUrl = (url: string, id: string) => {
    if (!url) {
      showToast('Link PDF Drive belum tersedia', 'error');
      return;
    }
    let viewOnlyUrl = url;
    if (viewOnlyUrl.includes('/edit')) {
      viewOnlyUrl = viewOnlyUrl.replace(/\/edit.*$/, '/view?usp=sharing');
    } else if (!viewOnlyUrl.includes('/view')) {
      viewOnlyUrl = `${viewOnlyUrl.replace(/\/+$/, '')}/view?usp=sharing`;
    }
    navigator.clipboard.writeText(viewOnlyUrl);
    setCopiedId(id);
    showToast('Link PDF View-Only berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Riwayat Laporan BPS Terpadu</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Arsip terpusat Laporan Harian Kerja & Laporan Penugasan Perjadin BPS Kabupaten Lebak
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            title="Refresh Data Riwayat"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/laporan/tambah"
            className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <FilePlus className="w-4 h-4" />
            <span>+ Laporan Harian</span>
          </Link>

          <Link
            href="/penugasan/tambah"
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <FileCheck className="w-4 h-4" />
            <span>+ Laporan Penugasan</span>
          </Link>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4 transition-colors">
        {/* Type Filter Buttons & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Semua Laporan ({laporanList.length})
            </button>
            <button
              onClick={() => setTypeFilter('harian')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                typeFilter === 'harian'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Harian</span>
            </button>
            <button
              onClick={() => setTypeFilter('penugasan')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                typeFilter === 'penugasan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Penugasan (Perjadin)</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama kegiatan, pegawai..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Memuat riwayat laporan...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Tidak ada laporan ditemukan
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">Jenis & Tanggal</th>
                  <th className="py-3 px-4">Pegawai</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Google Drive PDF</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((lap) => {
                  const isPenugasan = lap.jenis_laporan === 'penugasan';

                  return (
                    <tr key={lap.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                            {formatDateIndonesian(lap.tanggal, lap.tanggal_selesai)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold w-fit ${
                              isPenugasan
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            }`}
                          >
                            {isPenugasan ? '📋 Penugasan Perjadin' : '📝 Laporan Harian'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {lap.nama_pegawai}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs">
                        <div className="line-clamp-2">{lap.nama_kegiatan}</div>
                        {isPenugasan && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                            {lap.deskripsi_kegiatan}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg">
                          {lap.kategori || 'BPS'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {lap.drive_pdf_url ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={lap.drive_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-sky-200 dark:border-sky-800"
                              title="Buka PDF di Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPdfUrl(lap.drive_pdf_url!, lap.id)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                              title="Salin Link PDF"
                            >
                              {copiedId === lap.id ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Draf</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPreviewLaporan(lap)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Preview Dokumen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <Link
                            href={isPenugasan ? `/penugasan/edit/${lap.id}` : `/laporan/edit/${lap.id}`}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Laporan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => setDeletingTarget({ id: lap.id, jenis: lap.jenis_laporan })}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Laporan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <PDFPreviewModal
        isOpen={!!previewLaporan}
        onClose={() => setPreviewLaporan(null)}
        laporan={previewLaporan}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingTarget}
        onClose={() => setDeletingTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Laporan?"
        message="Apakah Anda yakin ingin menghapus laporan ini? File PDF dan foto di Google Drive juga akan disinkronkan."
        confirmText="Hapus Laporan"
        isDangerous
      />
    </div>
  );
}
