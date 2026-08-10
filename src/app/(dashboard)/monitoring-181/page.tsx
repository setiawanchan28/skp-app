'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Phone,
  Mail,
  TrendingUp,
  ShieldCheck,
  Building,
  MapPin,
  Eye,
  X
} from 'lucide-react';
import { Mon181ParsedResult, SummaryPetugas, SlsRowData, parseMon181CsvContent } from '@/utils/mon181Parser';

export default function Monitoring181Page() {
  const [activeTab, setActiveTab] = useState<'PPL' | 'PML'>('PPL');
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pplData, setPplData] = useState<Mon181ParsedResult | null>(null);
  const [pmlData, setPmlData] = useState<Mon181ParsedResult | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDesa, setFilterDesa] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [selectedPetugas, setSelectedPetugas] = useState<SummaryPetugas | null>(null);
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

  // Handle client-side file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = parseMon181CsvContent(text, file.name);

      if (parsed.type === 'PPL') {
        setPplData(parsed);
        setActiveTab('PPL');
      } else if (parsed.type === 'PML') {
        setPmlData(parsed);
        setActiveTab('PML');
      } else {
        // Fallback check based on filename
        if (file.name.toUpperCase().includes('PML')) {
          setPmlData(parsed);
          setActiveTab('PML');
        } else {
          setPplData(parsed);
          setActiveTab('PPL');
        }
      }

      // Also send to backend to persist
      const formData = new FormData();
      formData.append('file', file);
      await fetch('/api/monitoring-181', {
        method: 'POST',
        body: formData,
      });

      setMessage({ type: 'success', text: `File "${file.name}" berhasil diproses!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal memproses file: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const currentData = activeTab === 'PPL' ? pplData : pmlData;

  // Filter list of desa/kelurahan
  const desaOptions = React.useMemo(() => {
    if (!currentData) return [];
    const desas = new Set<string>();
    currentData.rawRows.forEach(r => {
      if (r.namaDesa) desas.add(r.namaDesa);
    });
    return Array.from(desas).sort();
  }, [currentData]);

  // Filtered Summary List
  const filteredSummary = React.useMemo(() => {
    if (!currentData) return [];
    return currentData.summaryPetugasList.filter(p => {
      // Search by name, email, phone
      const matchesSearch =
        p.namaPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.emailPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.noTelpPetugas.includes(searchQuery);

      // Filter by desa
      const matchesDesa =
        filterDesa === 'ALL' || p.slsList.some(sls => sls.namaDesa === filterDesa);

      // Filter by status progres
      let matchesStatus = true;
      if (filterStatus === '100') matchesStatus = p.progresPercent >= 100;
      else if (filterStatus === '50-99') matchesStatus = p.progresPercent >= 50 && p.progresPercent < 100;
      else if (filterStatus === '<50') matchesStatus = p.progresPercent < 50;

      return matchesSearch && matchesDesa && matchesStatus;
    });
  }, [currentData, searchQuery, filterDesa, filterStatus]);

  const openPetugasDetail = (petugas: SummaryPetugas) => {
    setSelectedPetugas(petugas);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Title Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Hidden Monitoring System (Mon181)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Monitoring Progres Petugas Lapangan
            </h1>
            <p className="text-sm text-sky-200/80 mt-1 max-w-2xl">
              Pantau realisasi dan capaian progres per nama petugas PPL dan PML secara real-time berdasarkan upload data Excel / CSV berkala.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all duration-200 active:scale-95">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Mengunggah...' : 'Upload Excel / CSV'}</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
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

      {/* Main Tabs (PPL vs PML) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PPL')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'PPL'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Petugas PPL (Pendata)</span>
            {pplData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                {pplData.summaryPetugasList.length}
              </span>
            )}
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
            <span>Petugas PML (Pemeriksa)</span>
            {pmlData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                {pmlData.summaryPetugasList.length}
              </span>
            )}
          </button>
        </div>

        {currentData?.fileName && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Sumber File: <strong className="text-slate-800 dark:text-slate-200">{currentData.fileName}</strong></span>
          </div>
        )}
      </div>

      {/* Quick Summary Cards */}
      {currentData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Petugas {activeTab}</span>
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {currentData.summaryPetugasList.length} <span className="text-xs font-medium text-slate-400">Orang</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Target SLS / Wilayah</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {currentData.totalRows} <span className="text-xs font-medium text-slate-400">SLS</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Target Dokumen</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {currentData.totalTarget.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Capaian Realisasi</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {currentData.overallProgres}%
              </p>
              <span className="text-xs font-bold text-slate-500">
                {currentData.totalRealisasi.toLocaleString('id-ID')} / {currentData.totalTarget.toLocaleString('id-ID')}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(currentData.overallProgres, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari nama petugas ${activeTab}, email, atau no telp...`}
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
              <option value="100">Selesai (100%)</option>
              <option value="50-99">Progres (50% - 99%)</option>
              <option value="<50">Kurang (&lt; 50%)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Memuat data monitoring...</p>
        </div>
      ) : !currentData || currentData.summaryPetugasList.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Data Monitoring {activeTab}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Silakan unggah file CSV atau Excel monitoring Mon181 dari tombol <strong>Upload Excel / CSV</strong> di atas.
          </p>
        </div>
      ) : (
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
                {filteredSummary.map((p, idx) => {
                  const isComplete = p.progresPercent >= 100;
                  const isWarning = p.progresPercent < 50;

                  return (
                    <tr
                      key={p.namaPetugas}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {p.namaPetugas}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                            {p.emailPetugas && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" /> {p.emailPetugas}
                              </span>
                            )}
                            {p.noTelpPetugas && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {p.noTelpPetugas}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {p.totalSls} SLS
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-400">
                        {p.targetAssignment}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-amber-600 dark:text-amber-400">
                        {p.open + p.draft}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-sky-600 dark:text-sky-400">
                        {p.submittedByPpl}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-indigo-600 dark:text-indigo-400">
                        {p.approvedByPml}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.realisasi}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span
                              className={
                                isComplete
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isWarning
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }
                            >
                              {p.progresPercent}%
                            </span>
                            {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isComplete ? 'bg-emerald-500' : isWarning ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(p.progresPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openPetugasDetail(p)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-600 dark:text-sky-400 font-semibold text-[11px] flex items-center justify-center gap-1 mx-auto transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                  Detail SLS / Wilayah Tugas {activeTab}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedPetugas.namaPetugas}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-4 mt-0.5">
                  <span>Target: <strong>{selectedPetugas.targetAssignment}</strong></span>
                  <span>Realisasi: <strong>{selectedPetugas.realisasi}</strong></span>
                  <span>Progres: <strong className="text-emerald-600">{selectedPetugas.progresPercent}%</strong></span>
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
                  {selectedPetugas.slsList.map((sls, idx) => (
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
