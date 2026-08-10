'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronDown,
  Mail,
  Phone,
  ShieldCheck,
  Eye,
  X,
  Layers,
  Maximize2,
  Minimize2,
  Camera,
  History,
  Trash2,
  Clock
} from 'lucide-react';
import { Mon181ParsedResult, SummaryPetugas, parseMon181CsvContent } from '@/utils/mon181Parser';
import { toPng } from 'html-to-image';

interface CombinedSummaryRow {
  namaPetugas: string;
  emailPetugas: string;
  noTelpPetugas: string;
  
  // Data PPL
  pplTarget: number;
  pplRealisasi: number;
  pplProgres: number;
  pplSlsCount: number;
  pplSummary?: SummaryPetugas;

  // Data PML
  pmlTarget: number;
  pmlApproved: number;
  pmlProgres: number;
  pmlSlsCount: number;
  pmlSummary?: SummaryPetugas;
}

export default function Monitoring181Page() {
  const [activeTab, setActiveTab] = useState<'GABUNGAN' | 'PPL' | 'PML'>('GABUNGAN');
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingPpl, setUploadingPpl] = useState<boolean>(false);
  const [uploadingPml, setUploadingPml] = useState<boolean>(false);
  const [downloadingImg, setDownloadingImg] = useState<boolean>(false);
  const [isCompactView, setIsCompactView] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pplData, setPplData] = useState<Mon181ParsedResult | null>(null);
  const [pmlData, setPmlData] = useState<Mon181ParsedResult | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDesa, setFilterDesa] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [selectedPetugas, setSelectedPetugas] = useState<{ petugas: SummaryPetugas; type: 'PPL' | 'PML' } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Load cache from LocalStorage if available
  const loadCacheFromLocalStorage = () => {
    try {
      const cachedPpl = localStorage.getItem('MON181_PPL_CACHE');
      const cachedPml = localStorage.getItem('MON181_PML_CACHE');

      if (cachedPpl) setPplData(JSON.parse(cachedPpl));
      if (cachedPml) setPmlData(JSON.parse(cachedPml));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  // Fetch initial data from server database (Supabase)
  const fetchMon181Data = async () => {
    setLoading(true);
    loadCacheFromLocalStorage();

    try {
      const res = await fetch('/api/monitoring-181');
      const json = await res.json();
      if (json.success) {
        if (json.pplResult) {
          setPplData(json.pplResult);
          try { localStorage.setItem('MON181_PPL_CACHE', JSON.stringify(json.pplResult)); } catch (e) {}
        }
        if (json.pmlResult) {
          setPmlData(json.pmlResult);
          try { localStorage.setItem('MON181_PML_CACHE', JSON.stringify(json.pmlResult)); } catch (e) {}
        }
        if (json.historyList) {
          setHistoryList(json.historyList);
        }
      }
    } catch (err) {
      console.error('Error fetching Mon181 data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMon181Data();
  }, []);

  // Handle upload specific PPL file
  const handleUploadPpl = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPpl(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = parseMon181CsvContent(text, file.name);
      parsed.type = 'PPL';
      setPplData(parsed);

      try { localStorage.setItem('MON181_PPL_CACHE', JSON.stringify(parsed)); } catch (e) {}

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'PPL');
      await fetch('/api/monitoring-181', { method: 'POST', body: formData });

      setMessage({ type: 'success', text: `File PPL "${file.name}" berhasil disimpan ke database!` });
      fetchMon181Data();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal memproses file PPL: ${err.message}` });
    } finally {
      setUploadingPpl(false);
    }
  };

  // Handle upload specific PML file
  const handleUploadPml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPml(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = parseMon181CsvContent(text, file.name);
      parsed.type = 'PML';
      setPmlData(parsed);

      try { localStorage.setItem('MON181_PML_CACHE', JSON.stringify(parsed)); } catch (e) {}

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'PML');
      await fetch('/api/monitoring-181', { method: 'POST', body: formData });

      setMessage({ type: 'success', text: `File PML "${file.name}" berhasil disimpan ke database!` });
      fetchMon181Data();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal memproses file PML: ${err.message}` });
    } finally {
      setUploadingPml(false);
    }
  };

  // Delete history item
  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan histori upload ini?')) return;

    try {
      await fetch(`/api/monitoring-181?id=${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Riwayat data berhasil dihapus!' });
      fetchMon181Data();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Gagal menghapus histori' });
    }
  };

  // Export Dashboard as Image PNG
  const handleDownloadImage = async () => {
    if (!dashboardRef.current) return;
    setDownloadingImg(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, { cacheBust: true, quality: 0.95 });
      const link = document.createElement('a');
      link.download = `Monitoring_Mon181_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      setMessage({ type: 'success', text: 'Dashboard berhasil diunduh sebagai Gambar PNG!' });
    } catch (err: any) {
      console.error('Error exporting image:', err);
      setMessage({ type: 'error', text: 'Gagal mengunduh gambar dashboard' });
    } finally {
      setDownloadingImg(false);
    }
  };

  // Build combined summary list (Gabungan PPL & PML)
  const combinedSummaryList = React.useMemo<CombinedSummaryRow[]>(() => {
    const map = new Map<string, CombinedSummaryRow>();

    if (pplData) {
      pplData.summaryPetugasList.forEach(p => {
        const key = p.namaPetugas.trim().toLowerCase();
        map.set(key, {
          namaPetugas: p.namaPetugas,
          emailPetugas: p.emailPetugas,
          noTelpPetugas: p.noTelpPetugas,
          pplTarget: p.targetAssignment,
          pplRealisasi: p.realisasi,
          pplProgres: p.progresPercent,
          pplSlsCount: p.totalSls,
          pplSummary: p,
          pmlTarget: 0,
          pmlApproved: 0,
          pmlProgres: 0,
          pmlSlsCount: 0,
        });
      });
    }

    if (pmlData) {
      pmlData.summaryPetugasList.forEach(p => {
        const key = p.namaPetugas.trim().toLowerCase();
        if (map.has(key)) {
          const item = map.get(key)!;
          item.pmlTarget = p.targetAssignment;
          item.pmlApproved = p.approvedByPml || p.realisasi;
          item.pmlProgres = p.progresPercent;
          item.pmlSlsCount = p.totalSls;
          item.pmlSummary = p;
          if (!item.emailPetugas) item.emailPetugas = p.emailPetugas;
          if (!item.noTelpPetugas) item.noTelpPetugas = p.noTelpPetugas;
        } else {
          map.set(key, {
            namaPetugas: p.namaPetugas,
            emailPetugas: p.emailPetugas,
            noTelpPetugas: p.noTelpPetugas,
            pplTarget: 0,
            pplRealisasi: 0,
            pplProgres: 0,
            pplSlsCount: 0,
            pmlTarget: p.targetAssignment,
            pmlApproved: p.approvedByPml || p.realisasi,
            pmlProgres: p.progresPercent,
            pmlSlsCount: p.totalSls,
            pmlSummary: p,
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const avgA = (a.pplProgres + a.pmlProgres) / (a.pplTarget > 0 && a.pmlTarget > 0 ? 2 : 1);
      const avgB = (b.pplProgres + b.pmlProgres) / (b.pplTarget > 0 && b.pmlTarget > 0 ? 2 : 1);
      return avgB - avgA;
    });
  }, [pplData, pmlData]);

  // Unique desa options
  const desaOptions = React.useMemo(() => {
    const desas = new Set<string>();
    pplData?.rawRows.forEach(r => r.namaDesa && desas.add(r.namaDesa));
    pmlData?.rawRows.forEach(r => r.namaDesa && desas.add(r.namaDesa));
    return Array.from(desas).sort();
  }, [pplData, pmlData]);

  // Filtered lists
  const filteredCombined = React.useMemo(() => {
    return combinedSummaryList.filter(row => {
      const matchesSearch =
        row.namaPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.emailPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.noTelpPetugas.includes(searchQuery);

      const matchesDesa =
        filterDesa === 'ALL' ||
        row.pplSummary?.slsList.some(s => s.namaDesa === filterDesa) ||
        row.pmlSummary?.slsList.some(s => s.namaDesa === filterDesa);

      let matchesStatus = true;
      const maxProgres = Math.max(row.pplProgres, row.pmlProgres);
      if (filterStatus === '100') matchesStatus = row.pplProgres >= 100 && (row.pmlTarget === 0 || row.pmlProgres >= 100);
      else if (filterStatus === '50-99') matchesStatus = maxProgres >= 50 && maxProgres < 100;
      else if (filterStatus === '<50') matchesStatus = maxProgres < 50;

      return matchesSearch && matchesDesa && matchesStatus;
    });
  }, [combinedSummaryList, searchQuery, filterDesa, filterStatus]);

  const currentSingleData = activeTab === 'PPL' ? pplData : activeTab === 'PML' ? pmlData : null;

  const filteredSingleSummary = React.useMemo(() => {
    if (!currentSingleData) return [];
    return currentSingleData.summaryPetugasList.filter(p => {
      const matchesSearch =
        p.namaPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.emailPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.noTelpPetugas.includes(searchQuery);

      const matchesDesa = filterDesa === 'ALL' || p.slsList.some(sls => sls.namaDesa === filterDesa);

      let matchesStatus = true;
      if (filterStatus === '100') matchesStatus = p.progresPercent >= 100;
      else if (filterStatus === '50-99') matchesStatus = p.progresPercent >= 50 && p.progresPercent < 100;
      else if (filterStatus === '<50') matchesStatus = p.progresPercent < 50;

      return matchesSearch && matchesDesa && matchesStatus;
    });
  }, [currentSingleData, searchQuery, filterDesa, filterStatus]);

  const openPetugasDetail = (petugas: SummaryPetugas, type: 'PPL' | 'PML') => {
    setSelectedPetugas({ petugas, type });
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Histori Upload Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
            title="Lihat Riwayat File CSV yang Pernah Diunggah"
          >
            <History className="w-3.5 h-3.5 text-sky-500" />
            <span>Riwayat Upload</span>
            {historyList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-white font-bold">
                {historyList.length}
              </span>
            )}
          </button>

          {/* Mode 1 Halaman Toggle */}
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              isCompactView
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {isCompactView ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isCompactView ? '1 Halaman' : 'Scroll Normal'}</span>
          </button>

          {/* Download Image Button */}
          <button
            onClick={handleDownloadImage}
            disabled={downloadingImg}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{downloadingImg ? 'Memproses...' : 'Unduh PNG'}</span>
          </button>
        </div>

        {/* Dual Upload Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingPpl ? 'Simpan...' : 'Upload CSV PPL'}</span>
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleUploadPpl} disabled={uploadingPpl} />
          </label>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingPml ? 'Simpan...' : 'Upload CSV PML'}</span>
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleUploadPml} disabled={uploadingPml} />
          </label>

          <button
            onClick={fetchMon181Data}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Message */}
      {message && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CAPTURE WRAPPER FOR IMAGE DOWNLOAD */}
      <div ref={dashboardRef} className="space-y-4 bg-slate-50 dark:bg-slate-950 p-2 sm:p-3 rounded-2xl">
        {/* Header Title Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 p-4 sm:p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3" /> Database Permanen • Mon181 BPS
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                Dashboard Capaian PPL & PML
              </h1>
              <p className="text-[11px] sm:text-xs text-sky-200/80 mt-0.5">
                Data tersimpan secara permanen di database server dan dapat diakses dari perangkat manapun
              </p>
            </div>

            {/* Quick Badges File */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-sky-300 block font-semibold">Progres PPL</span>
                <span className="text-lg font-black text-emerald-400">{pplData ? `${pplData.overallProgres}%` : '-'}</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-right">
                <span className="text-[10px] text-indigo-300 block font-semibold">Progres PML</span>
                <span className="text-lg font-black text-emerald-400">{pmlData ? `${pmlData.overallProgres}%` : '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Filters */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('GABUNGAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                activeTab === 'GABUNGAN'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matriks Gabungan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white">
                {combinedSummaryList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PPL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                activeTab === 'PPL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Detail PPL</span>
            </button>

            <button
              onClick={() => setActiveTab('PML')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                activeTab === 'PML'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Detail PML</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari petugas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="relative md:w-36">
              <select
                value={filterDesa}
                onChange={e => setFilterDesa(e.target.value)}
                className="w-full pl-2.5 pr-6 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none"
              >
                <option value="ALL">Semua Desa</option>
                {desaOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* MAIN DATA TABLE CONTAINER WITH RESPONSIVE OVERFLOW */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto ${
          isCompactView ? 'max-h-[68vh] overflow-y-auto' : ''
        }`}>
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Memuat data dari database database...</p>
            </div>
          ) : activeTab === 'GABUNGAN' ? (
            /* GABUNGAN COMPACT TABLE */
            <table className="w-full text-left text-[11px] border-collapse min-w-[640px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-center w-10">No</th>
                  <th className="px-3 py-2">Nama Petugas</th>
                  <th className="px-2 py-2 text-center bg-sky-50 dark:bg-sky-950/40 border-l border-sky-100 dark:border-sky-900" colSpan={3}>
                    Capaian Pendataan PPL
                  </th>
                  <th className="px-2 py-2 text-center bg-indigo-50 dark:bg-indigo-950/40 border-l border-indigo-100 dark:border-indigo-900" colSpan={3}>
                    Capaian Pemeriksaan PML
                  </th>
                  <th className="px-2 py-2 text-center w-16">Aksi</th>
                </tr>
                <tr className="bg-slate-100/70 dark:bg-slate-800/80 text-[10px]">
                  {/* Sub PPL */}
                  <th className="px-2 py-1.5 text-center bg-sky-50/70 dark:bg-sky-950/40 border-l border-sky-100/50">Target</th>
                  <th className="px-2 py-1.5 text-center bg-sky-50/70 dark:bg-sky-950/40">Realisasi</th>
                  <th className="px-2 py-1.5 text-center bg-sky-50/70 dark:bg-sky-950/40">Progres %</th>

                  {/* Sub PML */}
                  <th className="px-2 py-1.5 text-center bg-indigo-50/70 dark:bg-indigo-950/40 border-l border-indigo-100/50">Target</th>
                  <th className="px-2 py-1.5 text-center bg-indigo-50/70 dark:bg-indigo-950/40">Approved</th>
                  <th className="px-2 py-1.5 text-center bg-indigo-50/70 dark:bg-indigo-950/40">Progres %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCombined.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      Tidak ada data petugas. Silakan unggah CSV PPL & PML via tombol di atas.
                    </td>
                  </tr>
                ) : (
                  filteredCombined.map((row, idx) => (
                    <tr key={row.namaPetugas} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 text-center font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {row.namaPetugas}
                      </td>

                      {/* PPL COLUMNS */}
                      <td className="px-2 py-2 text-center font-medium bg-sky-50/20 dark:bg-sky-950/10 border-l border-sky-100/40">
                        {row.pplTarget}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-sky-700 dark:text-sky-300 bg-sky-50/20 dark:bg-sky-950/10">
                        {row.pplRealisasi}
                      </td>
                      <td className="px-2 py-2 text-center bg-sky-50/20 dark:bg-sky-950/10">
                        {row.pplTarget > 0 ? (
                          <span className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                            row.pplProgres >= 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : row.pplProgres < 50
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {row.pplProgres}%
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* PML COLUMNS */}
                      <td className="px-2 py-2 text-center font-medium bg-indigo-50/20 dark:bg-indigo-950/10 border-l border-indigo-100/40">
                        {row.pmlTarget}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/10">
                        {row.pmlApproved}
                      </td>
                      <td className="px-2 py-2 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                        {row.pmlTarget > 0 ? (
                          <span className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                            row.pmlProgres >= 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : row.pmlProgres < 50
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {row.pmlProgres}%
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* ACTION DETAIL */}
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.pplSummary && (
                            <button
                              onClick={() => openPetugasDetail(row.pplSummary!, 'PPL')}
                              className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-[9px]"
                            >
                              PPL
                            </button>
                          )}
                          {row.pmlSummary && (
                            <button
                              onClick={() => openPetugasDetail(row.pmlSummary!, 'PML')}
                              className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[9px]"
                            >
                              PML
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* SINGLE TAB VIEW */
            <table className="w-full text-left text-[11px] min-w-[640px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-center w-10">No</th>
                  <th className="px-3 py-2">Nama Petugas {activeTab}</th>
                  <th className="px-3 py-2 text-center">SLS</th>
                  <th className="px-3 py-2 text-center">Target</th>
                  <th className="px-3 py-2 text-center">Open/Draft</th>
                  <th className="px-3 py-2 text-center">Submit PPL</th>
                  <th className="px-3 py-2 text-center">Approve PML</th>
                  <th className="px-3 py-2 text-center">Realisasi</th>
                  <th className="px-3 py-2 text-center">Progres %</th>
                  <th className="px-3 py-2 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSingleSummary.map((p, idx) => (
                  <tr key={p.namaPetugas} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 text-center font-semibold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{p.namaPetugas}</td>
                    <td className="px-3 py-2 text-center font-semibold">{p.totalSls}</td>
                    <td className="px-3 py-2 text-center font-semibold">{p.targetAssignment}</td>
                    <td className="px-3 py-2 text-center text-amber-600">{p.open + p.draft}</td>
                    <td className="px-3 py-2 text-center text-sky-600">{p.submittedByPpl}</td>
                    <td className="px-3 py-2 text-center text-indigo-600">{p.approvedByPml}</td>
                    <td className="px-3 py-2 text-center font-bold text-emerald-600">{p.realisasi}</td>
                    <td className="px-3 py-2 text-center font-bold">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.progresPercent >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {p.progresPercent}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => openPetugasDetail(p, activeTab)}
                        className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 text-[10px] font-bold rounded"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-sky-500" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">Riwayat Database Upload Mon181</h2>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada riwayat upload di database.
                </div>
              ) : (
                historyList.map(h => (
                  <div key={h.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.type === 'PPL' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {h.type}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{h.file_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(h.uploaded_at).toLocaleString('id-ID')}</span>
                        <span>Target: {h.total_target}</span>
                        <span>Realisasi: {h.total_realisasi} ({h.overall_progres}%)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(h.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      title="Hapus Catatan Histori Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg text-xs font-bold">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Detail Modal */}
      {isDetailModalOpen && selectedPetugas && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold uppercase mb-1">
                  Detail SLS Tugas {selectedPetugas.type}
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedPetugas.petugas.namaPetugas}
                </h2>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">Desa</th>
                    <th className="p-2">SLS / RT</th>
                    <th className="p-2 text-center">Target</th>
                    <th className="p-2 text-center">Open</th>
                    <th className="p-2 text-center">Submit PPL</th>
                    <th className="p-2 text-center">Approve PML</th>
                    <th className="p-2 text-center">Realisasi</th>
                    <th className="p-2 text-center">Progres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPetugas.petugas.slsList.map((sls, idx) => (
                    <tr key={sls.kodeSls + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold">{sls.namaDesa}</td>
                      <td className="p-2 font-semibold text-sky-600">{sls.namaSls}</td>
                      <td className="p-2 text-center">{sls.targetAssignment}</td>
                      <td className="p-2 text-center text-amber-600">{sls.open}</td>
                      <td className="p-2 text-center text-sky-600">{sls.submittedByPpl}</td>
                      <td className="p-2 text-center text-indigo-600">{sls.approvedByPml}</td>
                      <td className="p-2 text-center font-bold text-emerald-600">{sls.realisasi}</td>
                      <td className="p-2 text-center font-bold text-emerald-600">{sls.progresPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg text-xs font-bold">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
