'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Save, Loader2, RefreshCw, Calendar as CalendarIcon, UserCheck, AlertCircle } from 'lucide-react';
import { fetchPegawaiList } from '@/services/pegawaiService';
import { Pegawai } from '@/types/pegawai';
import { TemplateSelector } from './TemplateSelector';
import { PhotoUploader, PhotoItem } from './PhotoUploader';
import { useToast } from '@/components/ui/Toast';
import { ActivityTemplate } from '@/constants/templates';

const DRAFT_KEY = 'laporan_form_draft';

interface ReportFormProps {
  initialData?: any; // If editing existing report
}

export const ReportForm: React.FC<ReportFormProps> = ({ initialData }) => {
  const router = useRouter();
  const { showToast } = useToast();

  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<string>('');
  
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [deskripsiKegiatan, setDeskripsiKegiatan] = useState('');
  const [ringkasanKegiatan, setRingkasanKegiatan] = useState('');
  const [kategori, setKategori] = useState('Pelatihan');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Load Pegawai List on mount
  useEffect(() => {
    fetchPegawaiList().then((list) => {
      setPegawaiList(list);
      if (list.length > 0 && !initialData && !selectedPegawaiId) {
        // Default select first pegawai
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
      setNamaKegiatan(initialData.nama_kegiatan || '');
      setDeskripsiKegiatan(initialData.deskripsi_kegiatan || '');
      setRingkasanKegiatan(initialData.ringkasan_kegiatan || '');
      setKategori(initialData.kategori || 'Pelatihan');
    } else {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setNamaKegiatan(parsed.namaKegiatan || '');
          setDeskripsiKegiatan(parsed.deskripsiKegiatan || '');
          setRingkasanKegiatan(parsed.ringkasanKegiatan || '');
          if (parsed.tanggal) setTanggal(parsed.tanggal);
        } catch (e) {}
      }
    }
  }, [initialData]);

  // Auto-Save Draft every 30 seconds
  useEffect(() => {
    if (initialData) return;
    const interval = setInterval(() => {
      if (namaKegiatan || deskripsiKegiatan || ringkasanKegiatan) {
        const draft = { namaKegiatan, deskripsiKegiatan, ringkasanKegiatan, tanggal };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setDraftSavedAt(nowTime);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [namaKegiatan, deskripsiKegiatan, ringkasanKegiatan, tanggal, initialData]);

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
        body: JSON.stringify({ namaKegiatan, deskripsiKegiatan }),
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
      formData.append('nama_kegiatan', namaKegiatan);
      formData.append('deskripsi_kegiatan', deskripsiKegiatan);
      formData.append('ringkasan_kegiatan', ringkasanKegiatan);
      formData.append('kategori', kategori);

      // Append photo files
      for (const item of photos) {
        if (item.file) {
          formData.append('photos', item.file, item.name);
        }
      }

      setSubmitProgress('Menyimpan data, unggah foto & generate PDF ke Google Drive...');

      const res = await fetch('/api/laporan/save-complete', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan laporan');

      // Clear local draft
      localStorage.removeItem(DRAFT_KEY);

      showToast('Laporan harian, dokumentasi foto, dan PDF resmi BPS berhasil disimpan ke Drive!', 'success');
      router.push('/laporan');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan saat menyimpan laporan', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  return (
    <form onSubmit={handleSubmitLaporan} className="space-y-6 max-w-4xl mx-auto">
      {/* Template Selector Banner */}
      <TemplateSelector onSelect={handleTemplateSelect} />

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Form Bukti Dukung Kegiatan</h3>
            <p className="text-xs text-slate-500">
              Isi formulir untuk membuat laporan kegiatan harian BPS Kabupaten Lebak
            </p>
          </div>
          {draftSavedAt && (
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">
              Draft tersimpan {draftSavedAt}
            </span>
          )}
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

        {/* Date and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tanggal Kegiatan *
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Kategori Kegiatan
            </label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
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

        {/* Deskripsi Kegiatan for AI prompt */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Deskripsi Kegiatan (Poin-poin / Penjelasan singkat untuk AI)
          </label>
          <textarea
            rows={3}
            value={deskripsiKegiatan}
            onChange={(e) => setDeskripsiKegiatan(e.target.value)}
            placeholder="- Mengikuti briefing pelaksanaan&#10;- Melakukan verifikasi data kuesioner digital&#10;- Berdiskusi dengan tim pengolahan"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors leading-relaxed"
          />
        </div>

        {/* Ringkasan Kegiatan & Gemini Button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ringkasan Kegiatan (Bahasa Resmi Laporan BPS) *
            </label>
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

          <textarea
            rows={4}
            value={ringkasanKegiatan}
            onChange={(e) => setRingkasanKegiatan(e.target.value)}
            placeholder="Ringkasan kegiatan formal akan dihasilkan secara otomatis oleh Gemini AI setelah Anda menekan tombol 'Generate dengan Gemini', atau Anda dapat mengetiknya secara manual..."
            className="w-full px-3.5 py-2.5 bg-sky-50/50 border border-sky-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors leading-relaxed font-medium text-slate-800"
          />
        </div>

        {/* Photo Uploader */}
        <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={6} />
      </div>

      {/* Submit Button Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm sticky bottom-4 z-10">
        <div className="text-xs text-slate-500">
          {submitProgress ? (
            <span className="font-semibold text-sky-700 animate-pulse">{submitProgress}</span>
          ) : (
            <span>Satu langkah otomatis untuk simpan data, foto, dan PDF BPS ke Drive</span>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-sky-600/20 transition-all flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memproses Otomatis...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Simpan Laporan</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
