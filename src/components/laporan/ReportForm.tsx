'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Save, Loader2, RefreshCw, Eye, Bookmark, Calendar as CalendarIcon, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchPegawaiList } from '@/services/pegawaiService';
import { Pegawai } from '@/types/pegawai';
import { TemplateSelector } from './TemplateSelector';
import { PhotoUploader, PhotoItem, DateGroupOption } from './PhotoUploader';
import { PDFPreviewModal } from './PDFPreviewModal';
import { useToast } from '@/components/ui/Toast';
import { ActivityTemplate } from '@/constants/templates';
import { Laporan } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';
import { saveLaporanRecord } from '@/services/laporanService';

const DRAFT_KEY = 'laporan_form_draft';

interface ReportFormProps {
  initialData?: any;
}

export const ReportForm: React.FC<ReportFormProps> = ({ initialData }) => {
  const router = useRouter();
  const { showToast } = useToast();

  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<string>('');
  
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  
  const [isRangeDate, setIsRangeDate] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [deskripsiKegiatan, setDeskripsiKegiatan] = useState('');
  const [ringkasanKegiatan, setRingkasanKegiatan] = useState('');
  const [kategori, setKategori] = useState('Pelatihan');
  const [jumlahParagraf, setJumlahParagraf] = useState('auto');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load Pegawai List on mount
  useEffect(() => {
    fetchPegawaiList().then((list) => {
      setPegawaiList(list);
      if (list.length > 0 && !initialData && !selectedPegawaiId) {
        const p = list[0];
        setSelectedPegawaiId(p.id);
        setNamaPegawai(p.nama);
        setNip(p.nip);
        setJabatan(p.jabatan);
      }
    });
  }, [initialData]);

  // Load Initial Data if editing or Draft if present
  useEffect(() => {
    if (initialData) {
      setNamaPegawai(initialData.nama_pegawai || '');
      setNip(initialData.nip || '');
      setJabatan(initialData.jabatan || '');
      setTanggal(initialData.tanggal || new Date().toISOString().split('T')[0]);
      if (initialData.tanggal_selesai) {
        setIsRangeDate(true);
        setTanggalSelesai(initialData.tanggal_selesai);
      }
      setNamaKegiatan(initialData.nama_kegiatan || '');
      setDeskripsiKegiatan(initialData.deskripsi_kegiatan || '');
      setRingkasanKegiatan(initialData.ringkasan_kegiatan || '');
      setKategori(initialData.kategori || 'Pelatihan');

      // Map existing photos with Google Drive thumbnail previews
      if (initialData.fotos && Array.isArray(initialData.fotos) && initialData.fotos.length > 0) {
        const mappedPhotos: PhotoItem[] = initialData.fotos.map((f: any, idx: number) => {
          const driveId = f.drive_file_id;
          const preview = driveId
            ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`
            : f.drive_file_url || f.previewUrl || '';

          return {
            id: f.id || `foto_${idx}_${Date.now()}`,
            fileName: f.file_name || `Foto Dokumentasi ${idx + 1}.jpg`,
            previewUrl: preview,
            tanggalFoto: f.tanggal_foto || initialData.tanggal,
            drive_file_id: driveId,
            drive_file_url: f.drive_file_url,
          };
        });
        setPhotos(mappedPhotos);
      }
    } else {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setNamaKegiatan(parsed.namaKegiatan || '');
          setDeskripsiKegiatan(parsed.deskripsiKegiatan || '');
          setRingkasanKegiatan(parsed.ringkasanKegiatan || '');
          if (parsed.tanggal) setTanggal(parsed.tanggal);
          if (parsed.tanggalSelesai) {
            setIsRangeDate(true);
            setTanggalSelesai(parsed.tanggalSelesai);
          }
          if (parsed.photos && Array.isArray(parsed.photos)) {
            setPhotos(parsed.photos);
          }
          if (parsed.savedAt) setDraftSavedAt(parsed.savedAt);
        } catch (e) {}
      }
    }
  }, [initialData]);

  // Auto-Save Draft every 30 seconds
  useEffect(() => {
    if (initialData) return;
    const interval = setInterval(() => {
      if (namaKegiatan || deskripsiKegiatan || ringkasanKegiatan || photos.length > 0) {
        saveDraftToLocal(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [namaKegiatan, deskripsiKegiatan, ringkasanKegiatan, tanggal, tanggalSelesai, photos, initialData]);

  // Explicit Save Draft Helper
  const saveDraftToLocal = (showToastNotice: boolean = true) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const draft = {
      namaKegiatan,
      deskripsiKegiatan,
      ringkasanKegiatan,
      tanggal,
      tanggalSelesai,
      kategori,
      photos: photos.map((p) => ({
        id: p.id,
        name: p.name,
        previewUrl: p.previewUrl || p.existingUrl || '',
        tanggal_foto: p.tanggal_foto,
        fitMode: p.fitMode,
      })),
      savedAt: nowTime,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSavedAt(nowTime);

    if (showToastNotice) {
      showToast('Draf laporan berhasil disimpan! Anda dapat melanjutkan/menyicil foto besok.', 'success');
    }
  };

  // Generate Date List Options for Multi-day Upload
  const computedDateList: DateGroupOption[] = React.useMemo(() => {
    if (!isRangeDate || !tanggalSelesai || tanggal === tanggalSelesai) {
      return [{ dateStr: tanggal, formattedLabel: formatDateIndonesian(tanggal) }];
    }
    const start = new Date(tanggal);
    const end = new Date(tanggalSelesai);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return [{ dateStr: tanggal, formattedLabel: formatDateIndonesian(tanggal) }];
    }
    const list: DateGroupOption[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      const label = `${curr.getDate()} ${BULAN_INDONESIA[curr.getMonth()]} ${yyyy}`;
      list.push({ dateStr: iso, formattedLabel: label });
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [tanggal, tanggalSelesai, isRangeDate]);

  // Pegawai Dropdown Change Handler
  const handlePegawaiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPegawaiId(id);
    const found = pegawaiList.find((p) => p.id === id);
    if (found) {
      setNamaPegawai(found.nama);
      setNip(found.nip);
      setJabatan(found.jabatan);
    }
  };

  // Template select handler
  const handleTemplateSelect = (tmpl: ActivityTemplate) => {
    setNamaKegiatan(tmpl.nama);
    setDeskripsiKegiatan(tmpl.deskripsiPlaceholder);
    setRingkasanKegiatan(tmpl.ringkasanTemplate);
    setKategori(tmpl.kategori);
    showToast(`Template ${tmpl.kategori} diterapkan!`, 'info');
  };

  // Generate with Gemini AI
  const handleGenerateGemini = async () => {
    if (!namaKegiatan.trim()) {
      showToast('Mohon isi Nama Kegiatan terlebih dahulu!', 'error');
      return;
    }
    if (!deskripsiKegiatan.trim()) {
      showToast('Mohon isi Deskripsi Kegiatan sebagai bahan acuan AI!', 'error');
      return;
    }

    try {
      setIsGeneratingAi(true);
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaKegiatan, deskripsiKegiatan, namaPegawai, jumlahParagraf }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate ringkasan');

      setRingkasanKegiatan(data.ringkasan);
      showToast('Ringkasan kegiatan resmi BPS berhasil dibuat dengan Gemini AI!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungi Gemini API', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Automated 1-Click "Simpan Laporan" Submit Handler
  const handleSubmitLaporan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaPegawai || !nip || !namaKegiatan || !ringkasanKegiatan) {
      showToast('Mohon lengkapi seluruh bidang bertanda bintang (*)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitProgress('Menyiapkan data & kompresi foto...');

      const formData = new FormData();
      if (initialData?.id) formData.append('id', initialData.id);
      formData.append('nama_pegawai', namaPegawai);
      formData.append('nip', nip);
      formData.append('jabatan', jabatan);
      formData.append('tanggal', tanggal);
      if (isRangeDate && tanggalSelesai) {
        formData.append('tanggal_selesai', tanggalSelesai);
      }
      formData.append('nama_kegiatan', namaKegiatan);
      formData.append('deskripsi_kegiatan', deskripsiKegiatan);
      formData.append('ringkasan_kegiatan', ringkasanKegiatan);
      formData.append('kategori', kategori);

      const photosMeta = photos.map((p, idx) => ({
        index: idx,
        tanggal_foto: p.tanggal_foto,
      }));
      formData.append('photos_metadata', JSON.stringify(photosMeta));

      for (const item of photos) {
        if (item.file) {
          formData.append('photos', item.file, item.name);
        }
      }

      setSubmitProgress('Menyimpan data, unggah foto, PDF & Word ke Google Drive...');

      const res = await fetch('/api/laporan/save-complete', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan laporan');

      // ALWAYS SAVE CLIENT-SIDE LOCAL STORAGE RECORD IMMEDIATELY AFTER API SUCCESS
      if (result.data) {
        await saveLaporanRecord(result.data, result.data.fotos || []);
      }

      localStorage.removeItem(DRAFT_KEY);

      showToast('Laporan harian, foto, PDF, dan Word (.docx) berhasil disimpan ke Drive!', 'success');
      router.push('/laporan');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan saat menyimpan laporan', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  // Current transient preview object
  const transientLaporanPreview: Laporan = {
    id: 'preview',
    nama_pegawai: namaPegawai || 'Dede Setiawan',
    nip: nip || '199502282024211021',
    jabatan: jabatan || 'Pranata Komputer',
    tanggal: tanggal,
    tanggal_selesai: isRangeDate ? tanggalSelesai : undefined,
    nama_kegiatan: namaKegiatan || 'Nama Kegiatan',
    deskripsi_kegiatan: deskripsiKegiatan,
    ringkasan_kegiatan: ringkasanKegiatan || 'Ringkasan Kegiatan...',
    kategori: kategori,
    fotos: photos.map((p, idx) => ({
      id: p.id,
      drive_file_id: `preview_${idx}`,
      drive_file_url: p.previewUrl || p.existingUrl || '',
      file_name: p.name,
      previewUrl: p.previewUrl || p.existingUrl,
      tanggal_foto: p.tanggal_foto,
    })),
  };

  return (
    <>
      <form onSubmit={handleSubmitLaporan} className="space-y-6 max-w-4xl mx-auto">
        {/* Template Selector Banner */}
        <TemplateSelector onSelect={handleTemplateSelect} />

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span>Form Bukti Dukung Kegiatan Harian</span>
                {draftSavedAt && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Draf Tersimpan ({draftSavedAt})</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Isi formulir untuk membuat laporan kegiatan harian pegawai BPS Kabupaten Lebak (dapat dicicil per-hari)
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveDraftToLocal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 text-sky-600" />
              <span>Simpan Draf</span>
            </button>
          </div>

          {/* Pegawai Dropdown & Auto Filled Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pilih Nama Pegawai *
              </label>
              <select
                value={selectedPegawaiId}
                onChange={handlePegawaiChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
              >
                {pegawaiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                NIP (Otomatis)
              </label>
              <input
                type="text"
                readOnly
                value={nip}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jabatan (Otomatis)
              </label>
              <input
                type="text"
                readOnly
                value={jabatan}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Date Picker Mode & Category Section */}
          <div className="space-y-4 p-4 bg-slate-50 border border-slate-200/70 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tanggal & Kategori Pelaksanaan *
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isRangeDate}
                  onChange={(e) => setIsRangeDate(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                />
                <span>Rentang Tanggal (Multi-hari, misal 1 - 3 Agustus)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {isRangeDate ? 'Tanggal Mulai *' : 'Tanggal Kegiatan *'}
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>

              {isRangeDate && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tanggal Selesai *
                  </label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                  />
                </div>
              )}

              <div className={isRangeDate ? '' : 'md:col-span-2'}>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kategori Kegiatan *
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                >
                  <option value="Pelatihan">Pelatihan</option>
                  <option value="Rapat">Rapat</option>
                  <option value="Monitoring">Monitoring</option>
                  <option value="Supervisi">Supervisi</option>
                  <option value="Sosialisasi">Sosialisasi</option>
                  <option value="Evaluasi">Evaluasi</option>
                  <option value="Pengolahan Data">Pengolahan Data</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nama Kegiatan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Kegiatan *
            </label>
            <input
              type="text"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              placeholder="Contoh: Pelatihan Petugas Sakernas Periode Agustus 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors font-medium text-slate-800"
            />
          </div>

          {/* Deskripsi Kegiatan */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Deskripsi Kegiatan (Poin-poin / Catatan Kegiatan)
              </label>
              <span className="text-[10px] text-slate-400">Dapat ditarik/diperbesar ukurannya</span>
            </div>
            <textarea
              rows={5}
              value={deskripsiKegiatan}
              onChange={(e) => setDeskripsiKegiatan(e.target.value)}
              placeholder="- Mendampingi petugas pencacah di wilayah sampel&#10;- Melakukan validasi isian kuesioner digital/fisik&#10;- Desa Aweh&#10;- PML Bu Sundari dan PPL Fahmi&#10;- Menyampaikan perbaikan anomali data"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors leading-relaxed min-h-[120px] resize-y"
            />
          </div>

          {/* Ringkasan Kegiatan & Gemini Controls */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ringkasan Kegiatan (Bahasa Laporan Resmi BPS) *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={jumlahParagraf}
                  onChange={(e) => setJumlahParagraf(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  title="Pilih Jumlah Paragraf Ringkasan AI"
                >
                  <option value="auto">Paragraf: Otomatis</option>
                  <option value="1">Paragraf: 1 Paragraf</option>
                  <option value="2">Paragraf: 2 Paragraf</option>
                  <option value="3">Paragraf: 3 Paragraf</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateGemini}
                  disabled={isGeneratingAi}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ai-pulse-button"
                >
                  {isGeneratingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Generate dengan Gemini</span>
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={ringkasanKegiatan}
              onChange={(e) => setRingkasanKegiatan(e.target.value)}
              placeholder="Ringkasan narasi kegiatan harian pribadi akan dihasilkan otomatis oleh Gemini AI..."
              className="w-full px-3.5 py-2.5 bg-sky-50/50 border border-sky-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors leading-relaxed font-medium text-slate-800 min-h-[160px] resize-y"
            />
          </div>

          {/* Photo Uploader with 24 photo limit */}
          <PhotoUploader
            photos={photos}
            onChange={setPhotos}
            maxPhotos={24}
            dateList={computedDateList}
            isRangeDate={isRangeDate}
          />
        </div>

        {/* Submit & Preview & Save Draft Button Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm sticky bottom-4 z-10">
          <div className="text-xs text-slate-500">
            {submitProgress ? (
              <span className="font-semibold text-sky-700 animate-pulse">{submitProgress}</span>
            ) : (
              <span>Simpan draf untuk menyicil data, atau simpan final ke Google Drive</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => saveDraftToLocal(true)}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              title="Simpan sementara draf laporan untuk dicicil besok"
            >
              <Bookmark className="w-4 h-4 text-sky-600" />
              <span>Simpan Draf</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Preview</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Laporan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Live PDF & Document Preview Modal */}
      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        laporan={transientLaporanPreview}
      />
    </>
  );
};
