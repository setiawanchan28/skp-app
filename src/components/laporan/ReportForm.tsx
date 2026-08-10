'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Save,
  Loader2,
  Bookmark,
  Calendar as CalendarIcon,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Mic,
  Maximize2,
  X,
  Check,
} from 'lucide-react';
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
  
  // Custom Category State
  const [kategori, setKategori] = useState('Pelatihan');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  const [jumlahParagraf, setJumlahParagraf] = useState('auto');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Voice Dictation & Fullscreen Writing Modal State
  const [isListeningDeskripsi, setIsListeningDeskripsi] = useState(false);
  const [isListeningRingkasan, setIsListeningRingkasan] = useState(false);
  const [fullscreenField, setFullscreenField] = useState<'deskripsi' | 'ringkasan' | null>(null);

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

      const existingKategori = initialData.kategori || 'Pelatihan';
      const presetCategories = ['Pelatihan', 'Rapat', 'Monitoring', 'Supervisi', 'Sosialisasi', 'Evaluasi', 'Pengolahan Data', 'Lainnya'];
      if (presetCategories.includes(existingKategori)) {
        setKategori(existingKategori);
      } else {
        setKategori('CUSTOM_NEW');
        setIsCustomCategory(true);
        setCustomCategoryText(existingKategori);
      }

      // Map existing photos with Google Drive thumbnail previews
      if (initialData.fotos && Array.isArray(initialData.fotos) && initialData.fotos.length > 0) {
        const mappedPhotos: PhotoItem[] = initialData.fotos.map((f: any, idx: number) => {
          const driveId = f.drive_file_id;
          const preview = driveId
            ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`
            : f.drive_file_url || f.previewUrl || '';

          return {
            id: f.id || `foto_${idx}_${Date.now()}`,
            name: f.file_name || `Foto Dokumentasi ${idx + 1}.jpg`,
            previewUrl: preview,
            tanggal_foto: f.tanggal_foto || initialData.tanggal,
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

  // Voice Dictation Helper (Web Speech API - Bahasa Indonesia)
  const toggleVoiceDictation = (targetField: 'deskripsi' | 'ringkasan') => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Browser Anda belum mendukung Dikte Suara (Gunakan Chrome/Edge)', 'error');
      return;
    }

    const isCurrentlyListening = targetField === 'deskripsi' ? isListeningDeskripsi : isListeningRingkasan;

    if (isCurrentlyListening) {
      setIsListeningDeskripsi(false);
      setIsListeningRingkasan(false);
      showToast('Dikte Suara Dihentikan', 'info');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = false;

      if (targetField === 'deskripsi') setIsListeningDeskripsi(true);
      if (targetField === 'ringkasan') setIsListeningRingkasan(true);

      showToast('🎙️ Dikte Suara Aktif! Silakan bicaralah dalam Bahasa Indonesia...', 'info');

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript;

        if (targetField === 'deskripsi') {
          setDeskripsiKegiatan((prev) => (prev ? `${prev} ${transcript}` : transcript));
        } else {
          setRingkasanKegiatan((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListeningDeskripsi(false);
        setIsListeningRingkasan(false);
      };

      recognition.onend = () => {
        setIsListeningDeskripsi(false);
        setIsListeningRingkasan(false);
      };

      recognition.start();
    } catch (err) {
      setIsListeningDeskripsi(false);
      setIsListeningRingkasan(false);
      showToast('Gagal mengaktifkan mikrofon', 'error');
    }
  };

  // Category Selector Change Handler
  const handleCategoryChange = (val: string) => {
    if (val === 'CUSTOM_NEW') {
      setKategori('CUSTOM_NEW');
      setIsCustomCategory(true);
    } else {
      setKategori(val);
      setIsCustomCategory(false);
    }
  };

  const finalKategori = isCustomCategory ? customCategoryText.trim() || 'Kegiatan BPS' : kategori;

  // Auto-Save Draft every 30 seconds
  useEffect(() => {
    if (initialData) return;
    const interval = setInterval(() => {
      if (namaKegiatan || deskripsiKegiatan || ringkasanKegiatan || photos.length > 0) {
        saveDraftToLocal(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [namaKegiatan, deskripsiKegiatan, ringkasanKegiatan, photos, initialData]);

  const saveDraftToLocal = (showToastNotice = true) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const draft = {
      namaKegiatan,
      deskripsiKegiatan,
      ringkasanKegiatan,
      tanggal,
      tanggalSelesai,
      photos: photos.map((p) => ({
        id: p.id,
        name: p.name,
        previewUrl: p.previewUrl,
        tanggal_foto: p.tanggal_foto,
      })),
      savedAt: nowTime,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSavedAt(nowTime);

    if (showToastNotice) {
      showToast('Draf laporan berhasil disimpan!', 'success');
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
    handleCategoryChange(tmpl.kategori);
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
      formData.append('id', initialData?.id || '');
      formData.append('namaPegawai', namaPegawai);
      formData.append('nip', nip);
      formData.append('jabatan', jabatan);
      formData.append('tanggal', tanggal);
      if (isRangeDate && tanggalSelesai) {
        formData.append('tanggalSelesai', tanggalSelesai);
      }
      formData.append('namaKegiatan', namaKegiatan);
      formData.append('deskripsiKegiatan', deskripsiKegiatan);
      formData.append('ringkasanKegiatan', ringkasanKegiatan);
      formData.append('kategori', finalKategori);

      photos.forEach((p, index) => {
        if (p.file) {
          formData.append(`photo_${index}`, p.file);
          formData.append(`photoDate_${index}`, p.tanggal_foto || tanggal);
        } else if (p.drive_file_id) {
          formData.append(`existing_drive_id_${index}`, p.drive_file_id);
          formData.append(`photoDate_${index}`, p.tanggal_foto || tanggal);
        }
      });

      setSubmitProgress('Membuat berkas PDF & Word di Google Drive...');
      const res = await fetch('/api/laporan/save-complete', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan laporan');

      showToast('Laporan & Berkas PDF/Word berhasil disimpan!', 'success');
      localStorage.removeItem(DRAFT_KEY);

      router.push('/laporan');
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses pembuatan laporan', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  // Current transient preview object
  const transientLaporanPreview: Laporan = {
    id: initialData?.id || 'preview',
    nama_pegawai: namaPegawai || 'Dede Setiawan',
    nip: nip || '199502282024211021',
    jabatan: jabatan || 'Pranata Komputer',
    tanggal: tanggal,
    tanggal_selesai: isRangeDate ? tanggalSelesai : undefined,
    nama_kegiatan: namaKegiatan || 'Nama Kegiatan',
    deskripsi_kegiatan: deskripsiKegiatan,
    ringkasan_kegiatan: ringkasanKegiatan || 'Ringkasan Kegiatan...',
    kategori: finalKategori,
    fotos: photos.map((p, idx) => ({
      id: p.id,
      drive_file_id: p.drive_file_id || `preview_${idx}`,
      drive_file_url: p.previewUrl || p.drive_file_url || '',
      file_name: p.name,
      previewUrl: p.previewUrl,
      tanggal_foto: p.tanggal_foto,
    })),
  };

  return (
    <>
      <form onSubmit={handleSubmitLaporan} className="space-y-6 max-w-4xl mx-auto">
        {/* Template Selector Banner */}
        <TemplateSelector onSelect={handleTemplateSelect} />

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-6 transition-colors">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <span>Form Bukti Dukung Kegiatan Harian</span>
                {draftSavedAt && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Draf Tersimpan ({draftSavedAt})</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Isi formulir untuk membuat laporan kegiatan harian pegawai BPS Kabupaten Lebak
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveDraftToLocal(true)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Simpan Draf</span>
            </button>
          </div>

          {/* Pegawai Dropdown & Auto Filled Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Pilih Nama Pegawai *
              </label>
              <select
                value={selectedPegawaiId}
                onChange={handlePegawaiChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors dark:text-white"
              >
                {pegawaiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                NIP (Otomatis)
              </label>
              <input
                type="text"
                readOnly
                value={nip}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Jabatan (Otomatis)
              </label>
              <input
                type="text"
                readOnly
                value={jabatan}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Date Picker Mode & Category Section */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tanggal & Kategori Pelaksanaan *
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
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
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isRangeDate ? 'Tanggal Mulai *' : 'Tanggal Kegiatan *'}
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors dark:text-white"
                />
              </div>

              {isRangeDate && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Tanggal Selesai *
                  </label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors dark:text-white"
                  />
                </div>
              )}

              <div className={isRangeDate ? '' : 'md:col-span-2'}>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kategori Kegiatan *
                </label>
                <select
                  value={isCustomCategory ? 'CUSTOM_NEW' : kategori}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors dark:text-white"
                >
                  <option value="Pelatihan">Pelatihan</option>
                  <option value="Rapat">Rapat</option>
                  <option value="Monitoring">Monitoring</option>
                  <option value="Supervisi">Supervisi</option>
                  <option value="Sosialisasi">Sosialisasi</option>
                  <option value="Evaluasi">Evaluasi</option>
                  <option value="Pengolahan Data">Pengolahan Data</option>
                  <option value="Sensus & Survei">Sensus & Survei</option>
                  <option value="Teknologi Informasi">Teknologi Informasi</option>
                  <option value="Administrasi & Keuangan">Administrasi & Keuangan</option>
                  <option value="Lainnya">Lainnya</option>
                  <option value="CUSTOM_NEW">+ Tulis Kategori Custom Baru...</option>
                </select>

                {isCustomCategory && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={customCategoryText}
                      onChange={(e) => setCustomCategoryText(e.target.value)}
                      placeholder="Tuliskan nama kategori khusus Anda..."
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nama Kegiatan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nama Kegiatan *
            </label>
            <input
              type="text"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              placeholder="Contoh: Pelatihan Petugas Sakernas Periode Agustus 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors font-medium text-slate-800 dark:text-white"
            />
          </div>

          {/* Deskripsi Kegiatan (With Voice Dictation & Fullscreen Expand Modal) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Deskripsi Kegiatan (Poin-poin / Catatan Kegiatan)
              </label>

              <div className="flex items-center gap-2">
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('deskripsi')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                    isListeningDeskripsi
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-600 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title="Dikte Suara Bahasa Indonesia"
                >
                  <Mic className={`w-3.5 h-3.5 ${isListeningDeskripsi ? 'text-rose-600 animate-spin' : 'text-sky-600 dark:text-sky-400'}`} />
                  <span className="hidden xs:inline">{isListeningDeskripsi ? 'Mendengarkan...' : 'Dikte Suara 🎙️'}</span>
                </button>

                {/* Fullscreen Expand Button */}
                <button
                  type="button"
                  onClick={() => setFullscreenField('deskripsi')}
                  className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                  title="Perbesar Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={deskripsiKegiatan}
              onChange={(e) => setDeskripsiKegiatan(e.target.value)}
              placeholder="- Mendampingi petugas pencacah di wilayah sampel&#10;- Melakukan validasi isian kuesioner digital/fisik&#10;- Desa Aweh&#10;- PML Bu Sundari dan PPL Fahmi"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors leading-relaxed min-h-[130px] resize-y dark:text-white"
            />
          </div>

          {/* Ringkasan Kegiatan & Gemini Controls */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ringkasan Kegiatan (Bahasa Laporan Resmi BPS) *
              </label>

              <div className="flex items-center gap-2">
                {/* Voice Dictation Button for Ringkasan */}
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('ringkasan')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                    isListeningRingkasan
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-600 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title="Dikte Suara Bahasa Indonesia"
                >
                  <Mic className={`w-3.5 h-3.5 ${isListeningRingkasan ? 'text-rose-600 animate-spin' : 'text-sky-600 dark:text-sky-400'}`} />
                  <span className="hidden xs:inline">{isListeningRingkasan ? 'Mendengarkan...' : 'Dikte Suara 🎙️'}</span>
                </button>

                {/* Fullscreen Expand Button */}
                <button
                  type="button"
                  onClick={() => setFullscreenField('ringkasan')}
                  className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                  title="Perbesar Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <select
                  value={jumlahParagraf}
                  onChange={(e) => setJumlahParagraf(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
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
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ai-pulse-button"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyusun Narasi BPS...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Narasi AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={ringkasanKegiatan}
              onChange={(e) => setRingkasanKegiatan(e.target.value)}
              placeholder="Susunan paragraf narasi resmi kegiatan BPS (dimulai dengan kata kerja aktif seperti 'Melaksanakan...', 'Mengikuti...')"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors leading-relaxed min-h-[140px] resize-y dark:text-white"
            />
          </div>

          {/* Photo Uploader Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              dateList={computedDateList}
              isRangeDate={isRangeDate}
            />
          </div>
        </div>

        {/* Action Controls Header / Sticky Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {submitProgress ? (
              <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{submitProgress}</span>
              </span>
            ) : (
              <span>Dokumen PDF & Word akan di-update otomatis ke Google Drive</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Preview PDF</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Laporan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Final & Sinkron ke Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Fullscreen Expand Writing Modal for Mobile HP */}
      {fullscreenField && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-sky-600" />
                <span>
                  {fullscreenField === 'deskripsi'
                    ? 'Tulis Deskripsi Kegiatan (Layar Penuh HP)'
                    : 'Tulis Narasi Ringkasan BPS (Layar Penuh HP)'}
                </span>
              </h3>

              <button
                type="button"
                onClick={() => setFullscreenField(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation(fullscreenField)}
                  className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1.5"
                >
                  <Mic className="w-4 h-4 text-sky-600" />
                  <span>Dikte Suara 🎙️</span>
                </button>
                <span className="text-xs text-slate-400">
                  {(fullscreenField === 'deskripsi' ? deskripsiKegiatan : ringkasanKegiatan).length} karakter
                </span>
              </div>

              <textarea
                value={fullscreenField === 'deskripsi' ? deskripsiKegiatan : ringkasanKegiatan}
                onChange={(e) =>
                  fullscreenField === 'deskripsi'
                    ? setDeskripsiKegiatan(e.target.value)
                    : setRingkasanKegiatan(e.target.value)
                }
                placeholder="Ketik atau gunakan dikte suara di sini..."
                className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:text-white resize-none"
              />
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setFullscreenField(null)}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 ml-auto"
              >
                <Check className="w-4 h-4" />
                <span>Selesai & Simpan Teks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Transient Preview Modal */}
      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        laporan={transientLaporanPreview}
      />
    </>
  );
};
