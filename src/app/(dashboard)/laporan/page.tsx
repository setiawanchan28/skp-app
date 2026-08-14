'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Eye,
  Edit2,
  Trash2,
  FilePlus,
  Copy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Link2,
  Printer,
  Calendar,
  Lock,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { fetchLaporanList, trashLaporanRecord, copyActivityRecord } from '@/services/laporanService';
import { Activity } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

export default function RiwayatLaporanPage() {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERJALANAN_DINAS' | 'NON_PERJALANAN_DINAS'>('ALL');

  // Modals & Action Loading States
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLaporanList();
    setActivities(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredList = activities.filter((act) => {
    const matchesSearch =
      act.name.toLowerCase().includes(search.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(search.toLowerCase())) ||
      (act.destination && act.destination.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (typeFilter === 'PERJALANAN_DINAS') return act.activity_type === 'PERJALANAN_DINAS';
    if (typeFilter === 'NON_PERJALANAN_DINAS') return act.activity_type === 'NON_PERJALANAN_DINAS';

    return true;
  });

  const handleGeneratePdf = async (act: Activity) => {
    setGeneratingPdfId(act.id);
    try {
      const res = await fetch(`/api/activities/${act.id}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotency_key: `gen_${act.id}_${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal generate PDF');
      }
      showToast('PDF berhasil dibuat dan tersimpan di Google Drive!', 'success');
      loadData();
    } catch (err: any) {
      showToast(`Generate PDF Gagal: ${err.message}`, 'error');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleCopyActivity = async (id: string) => {
    try {
      await copyActivityRecord(id);
      showToast('Kegiatan berhasil disalin! Silakan tentukan tanggal dan waktu baru.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyalin kegiatan', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await trashLaporanRecord(deletingId);
      showToast('Kegiatan dipindahkan ke Sampah (Soft Delete)', 'info');
      setDeletingId(null);
      loadData();
    }
  };

  const handleCopyPdfUrl = (url?: string, id?: string) => {
    if (!url) {
      showToast('Link PDF Google Drive belum tersedia!', 'error');
      return;
    }
    let viewOnlyUrl = url;
    if (viewOnlyUrl.includes('/edit')) {
      viewOnlyUrl = viewOnlyUrl.replace(/\/edit.*$/, '/view?usp=sharing');
    } else if (!viewOnlyUrl.includes('/view')) {
      viewOnlyUrl = `${viewOnlyUrl.replace(/\/+$/, '')}/view?usp=sharing`;
    }
    navigator.clipboard.writeText(viewOnlyUrl);
    setCopiedId(id || null);
    showToast('Link PDF (Anyone with the link - Viewer) berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-500" />
            <span>Kegiatan & Laporan Pegawai BPS</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengelolaan Laporan Kegiatan Perjalanan Dinas (PD) & Non-PD dengan penyimpanan Google Drive
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/laporan/tambah"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" />
            <span>Buat Kegiatan</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kegiatan..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(['ALL', 'PERJALANAN_DINAS', 'NON_PERJALANAN_DINAS'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'Semua Jenis' : t === 'PERJALANAN_DINAS' ? 'Perjalanan Dinas' : 'Non-PD'}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-sky-500" /> Memuat daftar kegiatan...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Kegiatan</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Klik tombol "Buat Kegiatan" di atas untuk menambahkan kegiatan baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((act) => {
            const isGen = act.status === 'GENERATED';
            return (
              <div
                key={act.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Status & Type Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        act.activity_type === 'PERJALANAN_DINAS'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {act.activity_type === 'PERJALANAN_DINAS' ? 'Perjalanan Dinas' : 'Non-PD'}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isGen
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {isGen && <Lock className="w-3 h-3 text-emerald-600" />}
                      {act.status}
                    </span>
                  </div>

                  {/* Title & Dates */}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
                      {act.name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>
                        {formatDateIndonesian(act.start_date)}
                        {act.end_date && act.end_date !== act.start_date ? ` – ${formatDateIndonesian(act.end_date)}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {act.description || 'Belum ada deskripsi narasi kegiatan.'}
                  </p>

                  {/* Indicators (Photos / Drive PDF) */}
                  <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1 font-medium">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                      {act.documents?.length || act.fotos?.length || 0} Foto
                    </span>

                    {act.drive_pdf_url && (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PDF Drive Valid
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewActivity(act)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                      title="Pratinjau PDF"
                    >
                      <Eye className="w-4 h-4 text-sky-500" />
                    </button>

                    <Link
                      href={`/laporan/edit/${act.id}`}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                      title="Edit Kegiatan"
                    >
                      <Edit2 className="w-4 h-4 text-amber-500" />
                    </Link>

                    <button
                      onClick={() => handleCopyActivity(act.id)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                      title="Copy Kegiatan"
                    >
                      <Copy className="w-4 h-4 text-indigo-500" />
                    </button>

                    {act.drive_pdf_url && (
                      <button
                        onClick={() => handleCopyPdfUrl(act.drive_pdf_url, act.id)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                        title="Copy Link Public PDF Drive"
                      >
                        <Link2 className="w-4 h-4 text-emerald-500" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGeneratePdf(act)}
                      disabled={generatingPdfId === act.id}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      {generatingPdfId === act.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>{isGen ? 'Regenerate' : 'Generate'}</span>
                    </button>

                    <button
                      onClick={() => setDeletingId(act.id)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-xl transition-colors"
                      title="Hapus / Soft Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <ConfirmModal
          isOpen={Boolean(deletingId)}
          title="Pindahkan ke Sampah?"
          message="Kegiatan ini akan dipindahkan ke folder Sampah (Soft Delete). Anda dapat memulihkannya kembali dari halaman sampah."
          confirmText="Ya, Pindahkan ke Sampah"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingId(null)}
        />
      )}

      {/* PDF Preview Modal */}
      {previewActivity && (
        <PDFPreviewModal
          isOpen={Boolean(previewActivity)}
          onClose={() => setPreviewActivity(null)}
          laporanData={{
            id: previewActivity.id,
            namaKegiatan: previewActivity.name,
            tanggal: previewActivity.start_date,
            tanggalSelesai: previewActivity.end_date,
            jamMulai: previewActivity.start_time,
            jamSelesai: previewActivity.end_time,
            deskripsiKegiatan: previewActivity.description || '',
            ringkasanKegiatan: previewActivity.description || '',
            jenisLaporan: previewActivity.activity_type === 'PERJALANAN_DINAS' ? 'penugasan' : 'harian',
            tempatTujuan: previewActivity.destination,
            nomorSurat: previewActivity.letter_number,
            nomorSpd: previewActivity.spd_number,
            petugasDitemui: previewActivity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })),
            namaPegawai: previewActivity.nama_pegawai || 'Dede Setiawan, S.Tr.Stat.',
            nip: previewActivity.nip || '199502282024211021',
            jabatan: previewActivity.jabatan || 'Pranata Komputer Ahli Pertama',
            fotos: previewActivity.documents || previewActivity.fotos || [],
          }}
        />
      )}
    </div>
  );
}
