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
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { fetchLaporanList, trashLaporanRecord, copyActivityRecord } from '@/services/laporanService';
import { Activity } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';

export default function RiwayatLaporanPage() {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode & Filters
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERJALANAN_DINAS' | 'NON_PERJALANAN_DINAS'>('ALL');
  const [filterBulan, setFilterBulan] = useState<string>('ALL');
  const [filterTahun, setFilterTahun] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'NAME_ASC'>('NEWEST');

  // Modals & Action Loading States
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [savedProfile, setSavedProfile] = useState<{ nama?: string; nip?: string; jabatan?: string }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localUser = localStorage.getItem('bps_auth_user') || localStorage.getItem('bps_saved_profile');
      if (localUser) {
        try {
          setSavedProfile(JSON.parse(localUser));
        } catch (e) {}
      }
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLaporanList();
    setActivities(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Sort Logic
  const filteredList = activities
    .filter((act) => {
      const actDateStr = act.start_date || act.tanggal || '';
      const dateObj = new Date(actDateStr);

      if (filterTahun !== 'ALL') {
        const y = String(dateObj.getFullYear());
        if (y !== filterTahun) return false;
      }

      if (filterBulan !== 'ALL') {
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        if (m !== filterBulan) return false;
      }

      const matchesSearch =
        act.name.toLowerCase().includes(search.toLowerCase()) ||
        (act.description && act.description.toLowerCase().includes(search.toLowerCase())) ||
        (act.destination && act.destination.toLowerCase().includes(search.toLowerCase())) ||
        (act.nama_pegawai && act.nama_pegawai.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (typeFilter === 'PERJALANAN_DINAS') return act.activity_type === 'PERJALANAN_DINAS';
      if (typeFilter === 'NON_PERJALANAN_DINAS') return act.activity_type === 'NON_PERJALANAN_DINAS';

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'NAME_ASC') {
        return a.name.localeCompare(b.name);
      }
      const timeA = new Date(a.start_date || a.tanggal || 0).getTime();
      const timeB = new Date(b.start_date || b.tanggal || 0).getTime();
      if (sortOrder === 'OLDEST') return timeA - timeB;
      return timeB - timeA; // NEWEST
    });

  const handleGeneratePdf = async (act: Activity) => {
    setGeneratingPdfId(act.id);
    try {
      const googleToken =
        (typeof window !== 'undefined' && localStorage.getItem('google_provider_token')) ||
        (savedProfile as any)?.provider_token ||
        '';

      const cleanDocs = (act.documents || (act as any).fotos || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name || doc.file_name,
        previewUrl: doc.previewUrl || doc.existingUrl || doc.base64 || doc.url || '',
        existingUrl: doc.existingUrl || doc.previewUrl || doc.base64 || doc.url || '',
        tanggal_foto: doc.tanggal_foto || doc.documentation_date || act.start_date,
      }));

      const payloadActivityData = {
        ...act,
        documents: cleanDocs,
        fotos: cleanDocs,
        provider_token: googleToken,
      };

      const res = await fetch(`/api/activities/${act.id}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-google-token': googleToken,
        },
        body: JSON.stringify({
          idempotency_key: `gen_${act.id}_${Date.now()}`,
          user_drive_token: googleToken,
          activityData: payloadActivityData,
        }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        if (res.status === 413) {
          throw new Error('Ukuran data / foto dokumentasi terlalu besar (413 Payload Too Large). Harap kompres foto atau gunakan foto beresolusi lebih kecil.');
        }
        throw new Error(`Gagal Generate PDF (Server Error ${res.status}): ${responseText.slice(0, 100)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal generate PDF');
      }

      const rawActivity = data.data?.activity || {};
      const updatedAct = {
        ...act,
        ...rawActivity,
        status: 'GENERATED',
        drive_pdf_url: data.data?.pdf_url || rawActivity.drive_pdf_url || act.drive_pdf_url,
        documents: rawActivity.documents?.length ? rawActivity.documents : act.documents || (act as any).fotos || [],
        fotos: rawActivity.fotos?.length ? rawActivity.fotos : (act as any).fotos || act.documents || [],
      };

      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('bps_laporan_data');
          let list = local ? JSON.parse(local) : [];
          const idx = list.findIndex((l: any) => l.id === act.id);
          if (idx >= 0) list[idx] = updatedAct;
          else list.unshift(updatedAct);
          localStorage.setItem('bps_laporan_data', JSON.stringify(list));
        } catch (e) {}
      }

      setActivities((prev) =>
        prev.map((item) => (item.id === act.id ? updatedAct : item))
      );

      showToast('PDF berhasil dibuat dan status berubah menjadi GENERATED!', 'success');
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
            <span>Riwayat Laporan & Kegiatan</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            BPS Kabupaten Lebak — Pengelolaan laporan kegiatan Perjalanan Dinas (PD) & Non-PD
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
            <span>Buat Laporan</span>
          </Link>
        </div>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kegiatan atau pelaksana..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Filter Dropdowns (Bulan, Tahun, Urutan) */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Filter Jenis */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {(['ALL', 'PERJALANAN_DINAS', 'NON_PERJALANAN_DINAS'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === t
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t === 'ALL' ? 'Semua' : t === 'PERJALANAN_DINAS' ? 'Perjadin' : 'Non-PD'}
                </button>
              ))}
            </div>

            {/* Filter Bulan */}
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Bulan</option>
              {BULAN_INDONESIA.map((b, idx) => (
                <option key={idx} value={String(idx + 1).padStart(2, '0')}>
                  {b}
                </option>
              ))}
            </select>

            {/* Filter Tahun */}
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer"
            >
              <option value="NEWEST">Terbaru</option>
              <option value="OLDEST">Terlama</option>
              <option value="NAME_ASC">Nama (A-Z)</option>
            </select>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ml-auto lg:ml-0">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'TABLE' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Tabel Baris"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'GRID' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main List Rendering */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-sky-500" /> Memuat daftar kegiatan...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Kegiatan</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Klik tombol "Buat Laporan" di atas untuk menambahkan kegiatan baru.
          </p>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* TABLE ROW VIEW FORMAT */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4 w-36">Tanggal</th>
                  <th className="p-4">Nama Kegiatan & Jenis</th>
                  <th className="p-4 w-28 text-center">Foto</th>
                  <th className="p-4 w-32 text-center">Status</th>
                  <th className="p-4 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((act, index) => {
                  const isGen = act.status === 'GENERATED';
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDateIndonesian(act.start_date)}
                        {act.end_date && act.end_date !== act.start_date ? (
                          <div className="text-[10px] text-slate-400 font-normal">s.d. {formatDateIndonesian(act.end_date)}</div>
                        ) : null}
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">{act.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              act.activity_type === 'PERJALANAN_DINAS'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                            }`}
                          >
                            {act.activity_type === 'PERJALANAN_DINAS' ? 'Perjadin' : 'Non-PD'}
                          </span>
                          {act.destination && (
                            <span className="text-[10px] text-slate-500 truncate max-w-xs">📍 {act.destination}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {act.documents?.length || act.fotos?.length || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            isGen
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {isGen && <Lock className="w-3 h-3 text-emerald-600" />}
                          {act.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPreviewActivity(act)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 rounded-lg"
                            title="Pratinjau PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/laporan/edit/${act.id}`}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500 rounded-lg"
                            title="Edit Kegiatan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleCopyActivity(act.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 rounded-lg"
                            title="Copy Kegiatan"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleGeneratePdf(act)}
                            disabled={generatingPdfId === act.id}
                            className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs"
                            title="Generate / Cetak PDF Drive"
                          >
                            {generatingPdfId === act.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                          </button>

                          {act.drive_pdf_url && (
                            <button
                              onClick={() => handleCopyPdfUrl(act.drive_pdf_url, act.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 rounded-lg"
                              title="Copy Link Drive PDF"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeletingId(act.id)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg"
                            title="Hapus"
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
        </div>
      ) : (
        /* GRID CARD VIEW FORMAT */
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
            name: previewActivity.name || previewActivity.nama_kegiatan,
            namaKegiatan: previewActivity.name || previewActivity.nama_kegiatan,
            nama_kegiatan: previewActivity.name || previewActivity.nama_kegiatan,
            start_date: previewActivity.start_date || previewActivity.tanggal,
            end_date: previewActivity.end_date || previewActivity.tanggal_selesai,
            tanggal: previewActivity.start_date || previewActivity.tanggal,
            tanggalSelesai: previewActivity.end_date || previewActivity.tanggal_selesai,
            tanggal_selesai: previewActivity.end_date || previewActivity.tanggal_selesai,
            jamMulai: previewActivity.start_time,
            jamSelesai: previewActivity.end_time,
            description: previewActivity.description || (previewActivity as any).deskripsi_kegiatan || (previewActivity as any).ringkasan_kegiatan || '',
            deskripsiKegiatan: previewActivity.description || (previewActivity as any).deskripsi_kegiatan || (previewActivity as any).ringkasan_kegiatan || '',
            ringkasanKegiatan: previewActivity.description || (previewActivity as any).ringkasan_kegiatan || (previewActivity as any).deskripsi_kegiatan || '',
            ringkasan_kegiatan: previewActivity.description || (previewActivity as any).ringkasan_kegiatan || (previewActivity as any).deskripsi_kegiatan || '',
            activity_type: previewActivity.activity_type,
            jenisLaporan: previewActivity.activity_type === 'PERJALANAN_DINAS' ? 'penugasan' : 'harian',
            destination: previewActivity.destination || (previewActivity as any).tempat_tujuan,
            tempatTujuan: previewActivity.destination || (previewActivity as any).tempat_tujuan,
            letter_number: previewActivity.letter_number || (previewActivity as any).nomor_surat,
            nomorSurat: previewActivity.letter_number || (previewActivity as any).nomor_surat,
            spd_number: previewActivity.spd_number || (previewActivity as any).nomor_spd,
            nomorSpd: previewActivity.spd_number || (previewActivity as any).nomor_spd,
            people: previewActivity.people || [],
            petugasDitemui: previewActivity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || (previewActivity as any).petugas_ditemui || [],
            petugas_ditemui: previewActivity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || (previewActivity as any).petugas_ditemui || [],
            namaPegawai: previewActivity.nama_pegawai || savedProfile.nama || 'Pegawai BPS',
            nama_pegawai: previewActivity.nama_pegawai || savedProfile.nama || 'Pegawai BPS',
            nip: previewActivity.nip || savedProfile.nip || '',
            jabatan: previewActivity.jabatan || savedProfile.jabatan || 'Pegawai BPS',
            documents: previewActivity.documents || (previewActivity as any).fotos || [],
            fotos: previewActivity.documents || (previewActivity as any).fotos || [],
          }}
        />
      )}
    </div>
  );
}
