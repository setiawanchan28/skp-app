'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Loader2,
  Bookmark,
  User,
  Plus,
  Trash2,
  Mic,
  Maximize2,
  X,
  Check,
  CheckCircle2,
  FileText,
  Eye,
} from 'lucide-react';
import { fetchPegawaiList } from '@/services/pegawaiService';
import { Pegawai } from '@/types/pegawai';
import { PhotoUploader, PhotoItem, DateGroupOption } from '../laporan/PhotoUploader';
import { PDFPreviewModal } from '../laporan/PDFPreviewModal';
import { useToast } from '@/components/ui/Toast';
import { LaporanPenugasan, PetugasDitemui } from '@/types/penugasan';
import { Laporan } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';

interface PenugasanFormProps {
  initialData?: LaporanPenugasan | null;
}

export const PenugasanForm: React.FC<PenugasanFormProps> = ({ initialData }) => {
  const router = useRouter();
  const { showToast } = useToast();

  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<string>('');

  // I. Pelaksana
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');

  // II. Perjalanan Dinas
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [isRangeDate, setIsRangeDate] = useState(false);
  const [tanggalPerjadin, setTanggalPerjadin] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesaiPerjadin, setTanggalSelesaiPerjadin] = useState('');
  const [tempatTujuan, setTempatTujuan] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [nomorSpd, setNomorSpd] = useState('');

  // III. Petugas yang Ditemui (Dynamic rows)
  const [petugasDitemui, setPetugasDitemui] = useState<PetugasDitemui[]>([
    { nama: 'Sundari', jabatan: 'PML' },
    { nama: 'Husnul Khotimah', jabatan: 'PPL' },
  ]);

  // IV. Resume Perjalanan Dinas
  const [resumeKegiatan, setResumeKegiatan] = useState('');

  // V. Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [isListeningResume, setIsListeningResume] = useState(false);
  const [isFullscreenResume, setIsFullscreenResume] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load Pegawai List
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

  // Initial Data or Draft Pre-fill
  useEffect(() => {
    if (initialData) {
      setNamaPegawai(initialData.nama_pegawai || '');
      setNip(initialData.nip || '');
      setJabatan(initialData.jabatan || '');
      setNamaKegiatan(initialData.nama_kegiatan || '');
      setTanggalPerjadin(initialData.tanggal_perjadin || new Date().toISOString().split('T')[0]);
      if (initialData.tanggal_selesai_perjadin) {
        setIsRangeDate(true);
        setTanggalSelesaiPerjadin(initialData.tanggal_selesai_perjadin);
      }
      setTempatTujuan(initialData.tempat_tujuan || '');
      setNomorSurat(initialData.nomor_surat || '');
      setNomorSpd(initialData.nomor_spd || '');
      if (initialData.petugas_ditemui && initialData.petugas_ditemui.length > 0) {
        setPetugasDitemui(initialData.petugas_ditemui);
      }
      setResumeKegiatan(initialData.resume_kegiatan || '');

      if (initialData.fotos && Array.isArray(initialData.fotos) && initialData.fotos.length > 0) {
        const mappedPhotos: PhotoItem[] = initialData.fotos.map((f: any, idx: number) => {
          const driveId = f.drive_file_id;
          const preview = driveId
            ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`
            : f.drive_file_url || f.previewUrl || '';

          return {
            id: f.id || `foto_${idx}_${Date.now()}`,
            name: f.file_name || `Foto Penugasan ${idx + 1}.jpg`,
            previewUrl: preview,
            tanggal_foto: f.tanggal_foto || initialData.tanggal_perjadin,
            drive_file_id: driveId,
            drive_file_url: f.drive_file_url,
          };
        });
        setPhotos(mappedPhotos);
      }
    }
  }, [initialData]);

  // Handle Pegawai Selection
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

  // Add / Delete Dynamic Rows for Petugas Ditemui
  const handleAddPetugasRow = () => {
    setPetugasDitemui([...petugasDitemui, { nama: '', jabatan: '' }]);
  };

  const handleRemovePetugasRow = (index: number) => {
    setPetugasDitemui(petugasDitemui.filter((_, idx) => idx !== index));
  };

  const handlePetugasChange = (index: number, field: 'nama' | 'jabatan', value: string) => {
    const updated = [...petugasDitemui];
    updated[index][field] = value;
    setPetugasDitemui(updated);
  };

  // Voice Dictation
  const toggleVoiceDictation = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Browser Anda belum mendukung Dikte Suara (Gunakan Chrome/Edge)', 'error');
      return;
    }

    if (isListeningResume) {
      setIsListeningResume(false);
      showToast('Dikte Suara Dihentikan', 'info');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = false;

      setIsListeningResume(true);
      showToast('🎙️ Dikte Suara Aktif! Silakan bicaralah dalam Bahasa Indonesia...', 'info');

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript;
        setResumeKegiatan((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => setIsListeningResume(false);
      recognition.onend = () => setIsListeningResume(false);

      recognition.start();
    } catch (err) {
      setIsListeningResume(false);
      showToast('Gagal mengaktifkan mikrofon', 'error');
    }
  };

  // Compute Date List for Multi-day Upload
  const computedDateList: DateGroupOption[] = React.useMemo(() => {
    if (!isRangeDate || !tanggalSelesaiPerjadin || tanggalPerjadin === tanggalSelesaiPerjadin) {
      return [{ dateStr: tanggalPerjadin, formattedLabel: formatDateIndonesian(tanggalPerjadin) }];
    }
    const start = new Date(tanggalPerjadin);
    const end = new Date(tanggalSelesaiPerjadin);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return [{ dateStr: tanggalPerjadin, formattedLabel: formatDateIndonesian(tanggalPerjadin) }];
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
  }, [tanggalPerjadin, tanggalSelesaiPerjadin, isRangeDate]);

  // Submit Handler
  const handleSubmitPenugasan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaPegawai || !nip || !namaKegiatan || !tempatTujuan || !nomorSurat || !resumeKegiatan) {
      showToast('Mohon lengkapi seluruh kolom wajib bertanda bintang (*)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitProgress('Menyiapkan berkas laporan penugasan...');

      const formData = new FormData();
      formData.append('id', initialData?.id || '');
      formData.append('namaPegawai', namaPegawai);
      formData.append('nip', nip);
      formData.append('jabatan', jabatan);
      formData.append('namaKegiatan', namaKegiatan);
      formData.append('tanggalPerjadin', tanggalPerjadin);
      if (isRangeDate && tanggalSelesaiPerjadin) {
        formData.append('tanggalSelesaiPerjadin', tanggalSelesaiPerjadin);
      }
      formData.append('tempatTujuan', tempatTujuan);
      formData.append('nomorSurat', nomorSurat);
      formData.append('nomorSpd', nomorSpd);
      formData.append('petugasDitemui', JSON.stringify(petugasDitemui.filter((p) => p.nama.trim())));
      formData.append('resumeKegiatan', resumeKegiatan);

      photos.forEach((p, index) => {
        if (p.file) {
          formData.append(`photo_${index}`, p.file);
          formData.append(`photoDate_${index}`, p.tanggal_foto || tanggalPerjadin);
        } else if (p.drive_file_id) {
          formData.append(`existing_drive_id_${index}`, p.drive_file_id);
          formData.append(`photoDate_${index}`, p.tanggal_foto || tanggalPerjadin);
        }
      });

      setSubmitProgress('Membuat berkas PDF & Word Penugasan di Google Drive...');
      const res = await fetch('/api/penugasan/save-complete', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan laporan penugasan');

      showToast('Laporan Penugasan BPS berhasil disimpan!', 'success');
      router.push('/laporan');
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses pembuatan laporan penugasan', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  // Transient preview object
  const transientPenugasanPreview: Laporan = {
    id: initialData?.id || 'preview_penugasan',
    nama_pegawai: namaPegawai || 'Dede Setiawan',
    nip: nip || '199502282024211021',
    jabatan: jabatan || 'Pranata Komputer',
    tanggal: tanggalPerjadin,
    tanggal_selesai: isRangeDate ? tanggalSelesaiPerjadin : undefined,
    nama_kegiatan: namaKegiatan || 'Nama Kegiatan Penugasan',
    deskripsi_kegiatan: `Tempat Tujuan: ${tempatTujuan} | Nomor ST: ${nomorSurat} | Nomor SPD: ${nomorSpd}`,
    ringkasan_kegiatan: resumeKegiatan || 'Resume Perjalanan Dinas...',
    kategori: 'Perjalanan Dinas',
    jenis_laporan: 'penugasan',
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
      <form onSubmit={handleSubmitPenugasan} className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-6 transition-colors">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>Formulir Laporan Penugasan / Perjalanan Dinas BPS</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Format resmi laporan perjalanan dinas BPS Kabupaten Lebak (Dilengkapi Nomor Surat, Nomor SPD, Petugas Ditemui, Resume & Dokumentasi)
            </p>
          </div>

          {/* BAGIAN I: KETERANGAN PELAKSANA PERJALANAN DINAS */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              I. KETERANGAN PELAKSANA PERJALANAN DINAS
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Nama Pegawai *
                </label>
                <select
                  value={selectedPegawaiId}
                  onChange={handlePegawaiChange}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none dark:text-white"
                >
                  {pegawaiList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Pranata Komputer Terampil"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  readOnly
                  value={nip}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN II: KETERANGAN PERJALANAN DINAS */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              II. KETERANGAN PERJALANAN DINAS
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kegiatan Penugasan *
              </label>
              <input
                type="text"
                required
                value={namaKegiatan}
                onChange={(e) => setNamaKegiatan(e.target.value)}
                placeholder="Contoh: Pengawasan dan Pemeriksaan ke Kecamatan Kalanganyar dalam rangka Sensus Ekonomi 2026 di Kabupaten Lebak"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tanggal Perjadin *
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={isRangeDate}
                      onChange={(e) => setIsRangeDate(e.target.checked)}
                      className="w-3.5 h-3.5 text-sky-600 rounded"
                    />
                    <span>Multi-Hari</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={tanggalPerjadin}
                    onChange={(e) => setTanggalPerjadin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold"
                  />
                  {isRangeDate && (
                    <input
                      type="date"
                      value={tanggalSelesaiPerjadin}
                      onChange={(e) => setTanggalSelesaiPerjadin(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tempat Tujuan Perjadin *
                </label>
                <input
                  type="text"
                  required
                  value={tempatTujuan}
                  onChange={(e) => setTempatTujuan(e.target.value)}
                  placeholder="Contoh: Kecamatan Kalanganyar / Desa Aweh"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Surat Tugas (ST) *
                </label>
                <input
                  type="text"
                  required
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  placeholder="Contoh: 635/ST/36020/2026"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor SPD *
                </label>
                <input
                  type="text"
                  required
                  value={nomorSpd}
                  onChange={(e) => setNomorSpd(e.target.value)}
                  placeholder="Contoh: 651/SPD/36020/2026"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN III: DAFTAR PETUGAS YANG DITEMUI */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                III. DAFTAR PETUGAS YANG DITEMUI
              </h4>

              <button
                type="button"
                onClick={handleAddPetugasRow}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Petugas</span>
              </button>
            </div>

            <div className="space-y-2">
              {petugasDitemui.map((petugas, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-slate-500">{idx + 1}.</span>
                  <input
                    type="text"
                    value={petugas.nama}
                    onChange={(e) => handlePetugasChange(idx, 'nama', e.target.value)}
                    placeholder="Nama Petugas Ditemui (misal: Sundari)"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white"
                  />
                  <input
                    type="text"
                    value={petugas.jabatan}
                    onChange={(e) => handlePetugasChange(idx, 'jabatan', e.target.value)}
                    placeholder="Jabatan (misal: PML / PPL / Koseka)"
                    className="w-36 sm:w-48 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white"
                  />
                  {petugasDitemui.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePetugasRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BAGIAN IV: RESUME PERJALANAN DINAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                IV. RESUME PERJALANAN DINAS *
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                    isListeningResume
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-600 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Mic className={`w-3.5 h-3.5 ${isListeningResume ? 'text-rose-600 animate-spin' : 'text-sky-600 dark:text-sky-400'}`} />
                  <span>{isListeningResume ? 'Mendengarkan...' : 'Dikte Suara 🎙️'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenResume(true)}
                  className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={7}
              required
              value={resumeKegiatan}
              onChange={(e) => setResumeKegiatan(e.target.value)}
              placeholder="Pada hari Selasa, 28 Juli 2026, dilaksanakan kegiatan Pengawasan Lapangan Sensus Ekonomi 2026 di Desa Aweh, Kecamatan Kalanganyar..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 leading-relaxed min-h-[150px] resize-y dark:text-white"
            />
          </div>

          {/* BAGIAN V: DOKUMENTASI (Up to 24 photos supported) */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
              V. DOKUMENTASI FOTO PERJALANAN DINAS (Hingga 24 Foto, Kompresi Hemat Drive)
            </h4>
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              dateList={computedDateList}
              isRangeDate={isRangeDate}
              maxPhotos={24}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {submitProgress ? (
              <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{submitProgress}</span>
              </span>
            ) : (
              <span>Dokumen Penugasan PDF & Word akan di-generate resmi di Google Drive</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-sky-600" />
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
                  <span>Menyimpan Penugasan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Laporan Penugasan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Fullscreen Writing Modal */}
      {isFullscreenResume && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-sky-600" />
                <span>Tulis Resume Perjalanan Dinas (Layar Penuh HP)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFullscreenResume(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1.5"
                >
                  <Mic className="w-4 h-4 text-sky-600" />
                  <span>Dikte Suara 🎙️</span>
                </button>
                <span className="text-xs text-slate-400">{resumeKegiatan.length} karakter</span>
              </div>

              <textarea
                value={resumeKegiatan}
                onChange={(e) => setResumeKegiatan(e.target.value)}
                placeholder="Ketik atau gunakan dikte suara untuk mengisi narasi resume perjalanan dinas..."
                className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm leading-relaxed focus:outline-none dark:text-white resize-none"
              />
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsFullscreenResume(false)}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 ml-auto"
              >
                <Check className="w-4 h-4" />
                <span>Selesai & Simpan Teks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Transient Preview Modal for Laporan Penugasan */}
      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        laporan={transientPenugasanPreview}
      />
    </>
  );
};
