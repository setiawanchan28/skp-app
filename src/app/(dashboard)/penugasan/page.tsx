'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileCheck,
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
} from 'lucide-react';
import { fetchPenugasanList, deletePenugasanRecord } from '@/services/penugasanService';
import { LaporanPenugasan } from '@/types/penugasan';
import { formatDateIndonesian } from '@/utils/formatters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

export default function RiwayatPenugasanPage() {
  const { showToast } = useToast();
  const [penugasanList, setPenugasanList] = useState<LaporanPenugasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPenugasanList();
    setPenugasanList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredList = penugasanList.filter((lap) => {
    const query = search.toLowerCase();
    return (
      lap.nama_kegiatan.toLowerCase().includes(query) ||
      lap.nama_pegawai.toLowerCase().includes(query) ||
      lap.tempat_tujuan.toLowerCase().includes(query) ||
      lap.nomor_surat.toLowerCase().includes(query) ||
      lap.nomor_spd.toLowerCase().includes(query)
    );
  });

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await deletePenugasanRecord(deletingId);
      showToast('Laporan penugasan berhasil dihapus', 'info');
      setDeletingId(null);
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
    showToast('Link PDF Laporan Penugasan berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Riwayat Laporan Penugasan BPS</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Arsip resmi Laporan Penugasan / Perjalanan Dinas BPS Kabupaten Lebak (Terhubung Google Drive & Supabase DB)
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            href="/penugasan/tambah"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <FilePlus className="w-4 h-4" />
            <span>Buat Laporan Penugasan Baru</span>
          </Link>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4 transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kegiatan, pegawai, tempat tujuan, nomor ST, atau nomor SPD..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white transition-colors"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Memuat riwayat laporan penugasan...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <FileCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Belum ada laporan penugasan ditemukan
            </p>
            <p className="text-xs text-slate-400">
              Klik &quot;Buat Laporan Penugasan Baru&quot; untuk memulai
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">Tanggal Perjadin</th>
                  <th className="py-3 px-4">Pegawai</th>
                  <th className="py-3 px-4">Kegiatan Penugasan</th>
                  <th className="py-3 px-4">Tujuan</th>
                  <th className="py-3 px-4 text-center">Google Drive PDF</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((lap) => (
                  <tr key={lap.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDateIndonesian(lap.tanggal_perjadin, lap.tanggal_selesai_perjadin)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {lap.nama_pegawai}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-900 dark:text-sky-300">
                      <div>{lap.nama_kegiatan}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ST: {lap.nomor_surat} | SPD: {lap.nomor_spd}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {lap.tempat_tujuan}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {lap.drive_pdf_url ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={lap.drive_pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-sky-200 dark:border-sky-800"
                            title="Buka PDF Penugasan di Google Drive"
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
                        <Link
                          href={`/penugasan/edit/${lap.id}`}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Laporan Penugasan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeletingId(lap.id)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Penugasan"
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

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Laporan Penugasan?"
        message="Apakah Anda yakin ingin menghapus laporan penugasan ini? File PDF dan foto terkait juga akan disinkronkan."
        confirmText="Hapus Penugasan"
        isDangerous
      />
    </div>
  );
}
