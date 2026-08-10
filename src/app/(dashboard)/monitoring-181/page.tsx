'use client';

import React, { useState, useEffect } from 'react';
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
  FileText,
  Phone,
  Mail,
  TrendingUp,
  ShieldCheck,
  Building,
  Eye,
  X,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Mon181ParsedResult, SummaryPetugas, parseMon181CsvContent } from '@/utils/mon181Parser';

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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pplData, setPplData] = useState<Mon181ParsedResult | null>(null);
  const [pmlData, setPmlData] = useState<Mon181ParsedResult | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDesa, setFilterDesa] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [selectedPetugas, setSelectedPetugas] = useState<{ petugas: SummaryPetugas; type: 'PPL' | 'PML' } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Fetch initial data from server Mon181 folder
  const fetchMon181Data = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring-181');
      const json = await res.json();
      if (json.success) {
        if (json.pplResult) setPplData(json.pplResult);
        if (json.pmlResult) setPmlData(json.pmlResult);
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

      const formData = new FormData();
      formData.append('file', file);
      await fetch('/api/monitoring-181', { method: 'POST', body: formData });

      setMessage({ type: 'success', text: `File PPL "${file.name}" berhasil diproses!` });
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

      const formData = new FormData();
      formData.append('file', file);
      await fetch('/api/monitoring-181', { method: 'POST', body: formData });

      setMessage({ type: 'success', text: `File PML "${file.name}" berhasil diproses!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal memproses file PML: ${err.message}` });
    } finally {
      setUploadingPml(false);
    }
  };

  // Build combined summary list (Gabungan PPL & PML)
  const combinedSummaryList = React.useMemo<CombinedSummaryRow[]>(() => {
    const map = new Map<string, CombinedSummaryRow>();

    // Process PPL data
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

    // Process PML data
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Title Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Hidden Monitoring System (Mon181)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Monitoring Capaian PPL & PML
            </h1>
            <p className="text-sm text-sky-200/80 mt-1 max-w-2xl">
              Upload 2 file terpisah (PPL & PML) dan pantau perbandingan progres pendataan vs pemeriksaannya secara simultan.
            </p>
          </div>

          {/* Dedicated 2 File Uploaders */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Upload PPL Button */}
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all duration-200 active:scale-95 border border-sky-400/30">
              <Upload className="w-4 h-4" />
              <span>{uploadingPpl ? 'Mengunggah PPL...' : '1. Upload File PPL'}</span>
              <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleUploadPpl} disabled={uploadingPpl} />
            </label>

            {/* Upload PML Button */}
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-95 border border-indigo-400/30">
              <Upload className="w-4 h-4" />
              <span>{uploadingPml ? 'Mengunggah PML...' : '2. Upload File PML'}</span>
              <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleUploadPml} disabled={uploadingPml} />
            </label>

            <button
              onClick={fetchMon181Data}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Notification Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
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

      {/* Status Loaded Files Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          pplData ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${pplData ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">File Data PPL (Pendata Lapangan)</p>
              <p className="text-[11px] text-slate-500">
                {pplData ? `${pplData.fileName} • ${pplData.summaryPetugasList.length} Petugas PPL` : 'Belum diunggah'}
              </p>
            </div>
          </div>
          {pplData && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              Progres PPL: {pplData.overallProgres}%
            </span>
          )}
        </div>

        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          pmlData ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${pmlData ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">File Data PML (Pemeriksa Lapangan)</p>
              <p className="text-[11px] text-slate-500">
                {pmlData ? `${pmlData.fileName} • ${pmlData.summaryPetugasList.length} Petugas PML` : 'Belum diunggah'}
              </p>
            </div>
          </div>
          {pmlData && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
              Progres PML: {pmlData.overallProgres}%
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('GABUNGAN')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'GABUNGAN'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Matriks Gabungan (PPL vs PML)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
              {combinedSummaryList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PPL')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'PPL'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Detail PPL Only</span>
          </button>

          <button
            onClick={() => setActiveTab('PML')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'PML'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Detail PML Only</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama petugas, email, atau no telp..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <select
              value={filterDesa}
              onChange={e => setFilterDesa(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
            >
              <option value="ALL">Semua Desa / Kelurahan</option>
              {desaOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:w-44">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
            >
              <option value="ALL">Semua Progres</option>
              <option value="100">Selesai 100%</option>
              <option value="50-99">Progres 50%-99%</option>
              <option value="<50">Kurang &lt;50%</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Memuat data monitoring...</p>
        </div>
      ) : activeTab === 'GABUNGAN' ? (
        /* GABUNGAN TAB VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5" rowSpan={2}>No</th>
                  <th className="px-4 py-3.5" rowSpan={2}>Nama Petugas</th>
                  <th className="px-4 py-3.5 text-center bg-sky-50/50 dark:bg-sky-950/30 border-x border-sky-100 dark:border-sky-900" colSpan={3}>
                    Capain PPL (Pendataan Lapangan)
                  </th>
                  <th className="px-4 py-3.5 text-center bg-indigo-50/50 dark:bg-indigo-950/30 border-x border-indigo-100 dark:border-indigo-900" colSpan={3}>
                    Capaian PML (Pemeriksaan Lapangan)
                  </th>
                  <th className="px-4 py-3.5 text-center" rowSpan={2}>Detail</th>
                </tr>
                <tr className="bg-slate-100/60 dark:bg-slate-800 text-[10px]">
                  {/* PPL sub-headers */}
                  <th className="px-3 py-2 text-center bg-sky-50/50 dark:bg-sky-950/30">Target</th>
                  <th className="px-3 py-2 text-center bg-sky-50/50 dark:bg-sky-950/30">Realisasi</th>
                  <th className="px-3 py-2 text-center bg-sky-50/50 dark:bg-sky-950/30">Progres %</th>

                  {/* PML sub-headers */}
                  <th className="px-3 py-2 text-center bg-indigo-50/50 dark:bg-indigo-950/30">Target</th>
                  <th className="px-3 py-2 text-center bg-indigo-50/50 dark:bg-indigo-950/30">Approved</th>
                  <th className="px-3 py-2 text-center bg-indigo-50/50 dark:bg-indigo-950/30">Progres %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCombined.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Tidak ada data petugas yang cocok. Unggah file PPL & PML di atas.
                    </td>
                  </tr>
                ) : (
                  filteredCombined.map((row, idx) => {
                    return (
                      <tr key={row.namaPetugas} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {row.namaPetugas}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                              {row.emailPetugas && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" /> {row.emailPetugas}
                                </span>
                              )}
                              {row.noTelpPetugas && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" /> {row.noTelpPetugas}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* PPL COLUMNS */}
                        <td className="px-3 py-3.5 text-center font-medium bg-sky-50/20 dark:bg-sky-950/10 border-l border-sky-100/50 dark:border-sky-900/30">
                          {row.pplTarget}
                        </td>
                        <td className="px-3 py-3.5 text-center font-bold text-sky-700 dark:text-sky-300 bg-sky-50/20 dark:bg-sky-950/10">
                          {row.pplRealisasi}
                        </td>
                        <td className="px-3 py-3.5 text-center bg-sky-50/20 dark:bg-sky-950/10 border-r border-sky-100/50 dark:border-sky-900/30">
                          {row.pplTarget > 0 ? (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              row.pplProgres >= 100
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : row.pplProgres < 50
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {row.pplProgres}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        {/* PML COLUMNS */}
                        <td className="px-3 py-3.5 text-center font-medium bg-indigo-50/20 dark:bg-indigo-950/10 border-l border-indigo-100/50 dark:border-indigo-900/30">
                          {row.pmlTarget}
                        </td>
                        <td className="px-3 py-3.5 text-center font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/10">
                          {row.pmlApproved}
                        </td>
                        <td className="px-3 py-3.5 text-center bg-indigo-50/20 dark:bg-indigo-950/10 border-r border-indigo-100/50 dark:border-indigo-900/30">
                          {row.pmlTarget > 0 ? (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              row.pmlProgres >= 100
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : row.pmlProgres < 50
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {row.pmlProgres}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.pplSummary && (
                              <button
                                onClick={() => openPetugasDetail(row.pplSummary!, 'PPL')}
                                className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 text-sky-600 dark:text-sky-400 font-bold text-[10px] transition-colors"
                                title="Lihat Detail PPL"
                              >
                                SLS PPL
                              </button>
                            )}
                            {row.pmlSummary && (
                              <button
                                onClick={() => openPetugasDetail(row.pmlSummary!, 'PML')}
                                className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] transition-colors"
                                title="Lihat Detail PML"
                              >
                                SLS PML
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SINGLE TAB VIEW (PPL ONLY OR PML ONLY) */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">No</th>
                  <th className="px-4 py-3.5">Nama Petugas {activeTab}</th>
                  <th className="px-4 py-3.5 text-center">Beban SLS</th>
                  <th className="px-4 py-3.5 text-center">Target</th>
                  <th className="px-4 py-3.5 text-center">Open / Draft</th>
                  <th className="px-4 py-3.5 text-center">Submitted PPL</th>
                  <th className="px-4 py-3.5 text-center">Approved PML</th>
                  <th className="px-4 py-3.5 text-center">Realisasi</th>
                  <th className="px-4 py-3.5 text-center min-w-[140px]">Progres %</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSingleSummary.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      Belum ada data petugas {activeTab}. Silakan unggah file CSV {activeTab}.
                    </td>
                  </tr>
                ) : (
                  filteredSingleSummary.map((p, idx) => (
                    <tr key={p.namaPetugas} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{p.namaPetugas}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                            {p.emailPetugas && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.emailPetugas}</span>}
                            {p.noTelpPetugas && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.noTelpPetugas}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{p.totalSls} SLS</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-600">{p.targetAssignment}</td>
                      <td className="px-4 py-3 text-center font-medium text-amber-600">{p.open + p.draft}</td>
                      <td className="px-4 py-3 text-center font-medium text-sky-600">{p.submittedByPpl}</td>
                      <td className="px-4 py-3 text-center font-medium text-indigo-600">{p.approvedByPml}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">{p.realisasi}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          p.progresPercent >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.progresPercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openPetugasDetail(p, activeTab)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 font-semibold text-[11px] flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down Detail Modal */}
      {isDetailModalOpen && selectedPetugas && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Detail SLS / Wilayah Tugas {selectedPetugas.type}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedPetugas.petugas.namaPetugas}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-4 mt-0.5">
                  <span>Target: <strong>{selectedPetugas.petugas.targetAssignment}</strong></span>
                  <span>Realisasi: <strong>{selectedPetugas.petugas.realisasi}</strong></span>
                  <span>Progres: <strong className="text-emerald-600">{selectedPetugas.petugas.progresPercent}%</strong></span>
                </p>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">Desa</th>
                    <th className="p-2.5">Nama SLS / RT</th>
                    <th className="p-2.5 text-center">Target</th>
                    <th className="p-2.5 text-center">Open</th>
                    <th className="p-2.5 text-center">Submit PPL</th>
                    <th className="p-2.5 text-center">Approved PML</th>
                    <th className="p-2.5 text-center">Realisasi</th>
                    <th className="p-2.5 text-center">Progres %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPetugas.petugas.slsList.map((sls, idx) => (
                    <tr key={sls.kodeSls + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-medium text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{sls.namaDesa}</td>
                      <td className="p-2.5 font-semibold text-sky-600 dark:text-sky-400">{sls.namaSls}</td>
                      <td className="p-2.5 text-center font-medium">{sls.targetAssignment}</td>
                      <td className="p-2.5 text-center text-amber-600">{sls.open}</td>
                      <td className="p-2.5 text-center text-sky-600">{sls.submittedByPpl}</td>
                      <td className="p-2.5 text-center text-indigo-600">{sls.approvedByPml}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-600">{sls.realisasi}</td>
                      <td className="p-2.5 text-center font-bold">
                        <span className={sls.progresPercent >= 100 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}>
                          {sls.progresPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
