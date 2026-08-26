'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Save,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileText,
  UserPlus,
  Trash2,
  Mic,
  Maximize2,
  X,
  CheckCircle2,
  Copy,
  Eye,
  User,
  ShieldCheck,
} from 'lucide-react';
import { PhotoUploader, PhotoItem } from './PhotoUploader';
import { PDFPreviewModal } from './PDFPreviewModal';
import { ReauthModal } from '@/components/ui/ReauthModal';
import { useToast } from '@/components/ui/Toast';
import { Activity, ActivityType } from '@/types/laporan';
import { checkActivityNameCollision } from '@/services/laporanService';

const DRAFT_KEY = 'mamang_activity_draft';

interface ReportFormProps {
  initialData?: Activity;
}

export const ReportForm: React.FC<ReportFormProps> = ({ initialData }) => {
  const router = useRouter();
  const { showToast } = useToast();

  // Reauth Modal State
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [reauthMessage, setReauthMessage] = useState('');

  // Activity Core Form State
  const [activityType, setActivityType] = useState<ActivityType>('NON_PERJALANAN_DINAS');
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [description, setDescription] = useState('');
  const [jumlahParagraf, setJumlahParagraf] = useState<'1' | '2' | '3' | 'auto'>('auto');
  const [modePanjang, setModePanjang] = useState<'panjang' | 'pendek'>('panjang');

  // PD Specific Form State
  const [destination, setDestination] = useState('');
  const [letterNumber, setLetterNumber] = useState('');
  const [spdNumber, setSpdNumber] = useState('');
  const [people, setPeople] = useState<{ person_name: string; position: string }[]>([
    { person_name: '', position: '' },
  ]);

  // Profile Snapshot State (Editable per report)
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');

  // Documentation Photos State
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Workflow & UI State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Status State
  const isGenerated = initialData?.status === 'GENERATED';

  // Load User Profile & Initial Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bps_auth_user') || localStorage.getItem('bps_saved_profile');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.nama) setNamaPegawai(parsed.nama);
          if (parsed.nip) setNip(parsed.nip);
          if (parsed.jabatan) setJabatan(parsed.jabatan);
        } catch (e) {}
      }
    }

    if (initialData) {
      setActivityType(initialData.activity_type || (initialData.spd_number ? 'PERJALANAN_DINAS' : 'NON_PERJALANAN_DINAS'));
      setNamaKegiatan(initialData.name || initialData.nama_kegiatan || '');
      setStartDate(initialData.start_date || initialData.tanggal || new Date().toISOString().split('T')[0]);
      setEndDate(initialData.end_date || initialData.tanggal_selesai || initialData.start_date || new Date().toISOString().split('T')[0]);
      setStartTime(initialData.start_time || '08:00');
      setEndTime(initialData.end_time || '16:00');
      setDescription(initialData.description || initialData.deskripsi_kegiatan || initialData.ringkasan_kegiatan || '');

      if (initialData.nama_pegawai) setNamaPegawai(initialData.nama_pegawai);
      if (initialData.nip) setNip(initialData.nip);
      if (initialData.jabatan) setJabatan(initialData.jabatan);

      setDestination(initialData.destination || initialData.tempat_tujuan || '');
      setLetterNumber(initialData.letter_number || initialData.nomor_surat || '');
      setSpdNumber(initialData.spd_number || initialData.nomor_spd || '');

      if (initialData.people && initialData.people.length > 0) {
        setPeople(initialData.people.map((p) => ({ person_name: p.person_name, position: p.position })));
      } else if ((initialData as any).petugas_ditemui) {
        setPeople((initialData as any).petugas_ditemui.map((p: any) => ({ person_name: p.nama, position: p.jabatan })));
      }

      if (initialData.documents && Array.isArray(initialData.documents)) {
        const mapped: PhotoItem[] = initialData.documents.map((d: any, idx: number) => ({
          id: d.id || `foto_${idx}`,
          name: d.original_filename || d.file_name || `Foto_${idx + 1}.jpg`,
          previewUrl: d.drive_file_id ? `https://drive.google.com/thumbnail?id=${d.drive_file_id}&sz=w1000` : d.previewUrl || '',
          tanggal_foto: d.documentation_date || d.tanggal_foto || initialData.start_date,
          drive_file_id: d.drive_file_id,
          drive_file_url: d.web_view_url || d.drive_file_url,
        }));
        setPhotos(mapped);
      }
    }
  }, [initialData]);

  // People List Manager Functions
  const handleAddPerson = () => setPeople([...people, { person_name: '', position: '' }]);
  const handleRemovePerson = (index: number) => setPeople(people.filter((_, i) => i !== index));
  const handlePersonChange = (index: number, field: 'person_name' | 'position', value: string) => {
    const updated = [...people];
    updated[index][field] = value;
    setPeople(updated);
  };

  // AI Description Refiner (Gemini)
  const handleGenerateAiDescription = async () => {
    if (!namaKegiatan.trim() || !description.trim()) {
      showToast('Masukkan Nama Kegiatan dan Catatan Poin Kegiatan terlebih dahulu!', 'warning');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaKegiatan,
          deskripsiKegiatan: description,
          namaPegawai,
          jumlahParagraf,
          modePanjang,
        }),
      });

      const data = await res.json();
      const summaryText = data.summary || data.ringkasan;
      if (res.ok && summaryText) {
        setDescription(summaryText);
        showToast('Narasi berhasil dirapikan dengan AI! Anda dapat memeriksa dan mengeditnya.', 'success');
      } else {
        throw new Error(data.error || 'Gagal memproses dengan Gemini AI');
      }
    } catch (err: any) {
      showToast(`Gagal merapikan dengan AI: ${err.message}`, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Submit Activity Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaKegiatan.trim()) {
      showToast('Nama Kegiatan wajib diisi!', 'error');
      return;
    }
    if (!namaPegawai.trim() || !nip.trim() || !jabatan.trim()) {
      showToast('Nama Pegawai, NIP, dan Jabatan wajib diisi!', 'error');
      return;
    }

    if (activityType === 'PERJALANAN_DINAS') {
      if (!destination.trim() || !letterNumber.trim() || !spdNumber.trim()) {
        showToast('Untuk Perjalanan Dinas, Tempat Tujuan, No Surat, dan No SPD wajib diisi!', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitProgress('Menyimpan data kegiatan...');

    try {
      const activityPayload: Partial<Activity> = {
        id: initialData?.id,
        activity_type: activityType,
        name: namaKegiatan,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        destination: activityType === 'PERJALANAN_DINAS' ? destination : undefined,
        letter_number: activityType === 'PERJALANAN_DINAS' ? letterNumber : undefined,
        spd_number: activityType === 'PERJALANAN_DINAS' ? spdNumber : undefined,
        description: description,
        nama_pegawai: namaPegawai,
        nip: nip,
        jabatan: jabatan,
      };

      const validPeople = people.filter((p) => p.person_name.trim().length > 0);

      const res = await fetch(
        initialData?.id ? `/api/activities/${initialData.id}` : '/api/activities',
        {
          method: initialData?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity: activityPayload,
            people: validPeople,
            photos: photos.map((p) => ({
              id: p.id,
              documentation_date: p.tanggal_foto || startDate,
              tanggal_foto: p.tanggal_foto || startDate,
              original_filename: p.name,
              file_name: p.name,
              name: p.name,
              mime_type: 'image/jpeg',
              previewUrl: p.previewUrl || p.drive_file_url || (p as any).web_view_url || '',
              web_view_url: p.drive_file_url || (p as any).web_view_url || p.previewUrl || '',
              drive_file_id: p.drive_file_id || '',
            })),
          }),
        }
      );

      const resText = await res.text();
      let result: any = {};
      try {
        result = JSON.parse(resText);
      } catch (err) {
        if (res.status === 413) {
          throw new Error('Ukuran foto / payload melebihi batas server (413 Payload Too Large). Harap gunakan foto beresolusi lebih kecil.');
        }
        throw new Error(`Server Error (${res.status}): ${resText.slice(0, 100)}`);
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal menyimpan kegiatan');
      }

      if (typeof window !== 'undefined' && result.data) {
        try {
          const local = localStorage.getItem('bps_laporan_data');
          let list = local ? JSON.parse(local) : [];
          const idx = list.findIndex((l: any) => l.id === result.data.id);
          if (idx >= 0) list[idx] = result.data;
          else list.unshift(result.data);
          localStorage.setItem('bps_laporan_data', JSON.stringify(list));
          window.dispatchEvent(new Event('bps_laporan_updated'));
        } catch (e) {}
      }

      showToast('Kegiatan berhasil disimpan!', 'success');
      router.push('/laporan');
      router.refresh();
    } catch (err: any) {
      const errMsg = err.message || 'Terjadi kesalahan saat menyimpan data';
      showToast(errMsg, 'error');

      const isAuthError = /token|kredensial|login|logout|401|403|google|oauth|permission|unauthorized|drive/i.test(errMsg);
      if (isAuthError) {
        setReauthMessage(errMsg);
        setIsReauthOpen(true);
      }
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  // Preview Object
  const previewActivity: Activity = {
    id: initialData?.id || 'preview_id',
    user_id: '00000000-0000-0000-0000-000000000000',
    activity_type: activityType,
    name: namaKegiatan || 'Nama Kegiatan Harian',
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    startTime: startTime,
    endTime: endTime,
    jam_mulai: startTime,
    jam_selesai: endTime,
    jamMulai: startTime,
    jamSelesai: endTime,
    status: initialData?.status || 'DRAFT',
    nama_pegawai: namaPegawai,
    nip: nip,
    jabatan: jabatan,
    destination,
    letter_number: letterNumber,
    spd_number: spdNumber,
    description,
    tanggal: startDate,
    tanggal_selesai: endDate !== startDate ? endDate : undefined,
    nama_kegiatan: namaKegiatan,
    ringkasan_kegiatan: description,
    tempat_tujuan: destination,
    nomor_surat: letterNumber,
    nomor_spd: spdNumber,
    petugas_ditemui: people.filter((p) => p.person_name.trim().length > 0).map((p) => ({ nama: p.person_name, jabatan: p.position })),
    documents: photos.map((p, idx) => ({
      id: p.id,
      drive_file_id: p.drive_file_id || `prev_${idx}`,
      web_view_url: p.previewUrl || p.drive_file_url || '',
      file_name: p.name,
      tanggal_foto: p.tanggal_foto || startDate,
    })),
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner & Status */}
      <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">Form Laporan Harian BPS</h1>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                isGenerated ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              Status: {initialData?.status || 'DRAFT'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            BPS Kabupaten Lebak — Isi detail kegiatan, atur dokumentasi, dan rapikan narasi dengan AI sebelum mencetak PDF.
          </p>
        </div>
      </div>

      {/* Section 0: Pelaksana Kegiatan (Nama, NIP, Jabatan) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-sky-500" /> Pelaksana Kegiatan (Profil Pegawai BPS)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nama Pegawai *
            </label>
            <input
              type="text"
              required
              value={namaPegawai}
              onChange={(e) => setNamaPegawai(e.target.value)}
              placeholder="Nama Lengkap & Gelar"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              NIP Pegawai (18 Digit) *
            </label>
            <input
              type="text"
              required
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="1995xxxxxxxxxxxxxx"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Jabatan *
            </label>
            <input
              type="text"
              required
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Jabatan Pegawai BPS"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </div>

      {/* Section 1: Type Selection */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-500" /> Jenis Kegiatan *
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setActivityType('NON_PERJALANAN_DINAS')}
            className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all ${
              activityType === 'NON_PERJALANAN_DINAS'
                ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Non-Perjalanan Dinas</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kegiatan rutin kantor, pelatihan, rapat internal, pengolahan data, atau supervisi harian.
              </div>
            </div>
            {activityType === 'NON_PERJALANAN_DINAS' && <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => setActivityType('PERJALANAN_DINAS')}
            className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all ${
              activityType === 'PERJALANAN_DINAS'
                ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Perjalanan Dinas (PD)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tugas luar kantor dengan Surat Tugas dan Nomor SPD resmi BPS.
              </div>
            </div>
            {activityType === 'PERJALANAN_DINAS' && <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />}
          </button>
        </div>
      </div>

      {/* Section 2: Identity & Dates */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-sky-500" /> Identitas & Waktu Kegiatan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nama Kegiatan *
            </label>
            <input
              type="text"
              required
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              placeholder="Contoh: Pendampingan lapangan pencacahan Survei Ekonomi Pertanian"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tanggal Mulai *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tanggal Selesai *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Jam Mulai *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Jam Selesai *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Perjalanan Dinas Extra Fields */}
      {activityType === 'PERJALANAN_DINAS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-500" /> Detail Perjalanan Dinas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Tempat Tujuan *
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Contoh: Desa Aweh, Kec. Kalanganyar"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Nomor Surat Tugas *
              </label>
              <input
                type="text"
                required
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder="Contoh: B-123/36020/06/2026"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Nomor SPD *
              </label>
              <input
                type="text"
                required
                value={spdNumber}
                onChange={(e) => setSpdNumber(e.target.value)}
                placeholder="Contoh: 098/SPD/BPS/2026"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          {/* People Encountered Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Daftar Petugas / Orang yang Ditemui
              </label>
              <button
                type="button"
                onClick={handleAddPerson}
                className="px-3 py-1.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Tambah Orang
              </button>
            </div>

            {people.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={p.person_name}
                  onChange={(e) => handlePersonChange(idx, 'person_name', e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={p.position}
                  onChange={(e) => handlePersonChange(idx, 'position', e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                {people.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(idx)}
                    className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Narrative & AI Refiner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" /> Deskripsi & Narasi Kegiatan
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Dropdown Jumlah Paragraf */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0">Paragraf:</span>
              <select
                value={jumlahParagraf}
                onChange={(e) => setJumlahParagraf(e.target.value as any)}
                className="bg-transparent font-bold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer"
              >
                <option value="auto">Otomatis (Proporsional)</option>
                <option value="1">1 Paragraf Utuh</option>
                <option value="2">2 Paragraf</option>
                <option value="3">3 Paragraf</option>
              </select>
            </div>

            {/* Dropdown Panjang Deskripsi */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0">Panjang Narasi:</span>
              <select
                value={modePanjang}
                onChange={(e) => setModePanjang(e.target.value as any)}
                className="bg-transparent font-bold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer"
              >
                <option value="panjang">Panjang & Detail (Mendalam)</option>
                <option value="pendek">Pendek & Ringkas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiDescription}
              disabled={isGeneratingAi}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all"
            >
              {isGeneratingAi ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>{isGeneratingAi ? 'Merapikan Narasi...' : 'Rapikan dengan AI (Gemini)'}</span>
            </button>
          </div>
        </div>

        <div>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ketik catatan kegiatan atau poin-poin kegiatan mentah. Contoh: Melaksanakan pendampingan pendataan di Desa Aweh bersama PML Sundari..."
            className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Section 5: Photo Documentation Uploader */}
      <PhotoUploader
        startDate={startDate}
        endDate={endDate}
        photos={photos}
        onChange={setPhotos}
      />

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 z-40">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
        >
          <Eye className="w-4 h-4 text-sky-600" />
          <span>Pratinjau PDF (Preview)</span>
        </button>

        <div className="flex items-center gap-3">
          {submitProgress && (
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 animate-pulse hidden sm:inline">
              {submitProgress}
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kegiatan'}</span>
          </button>
        </div>
      </div>

      {/* Preview PDF Modal */}
      {isPreviewOpen && (
        <PDFPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          laporan={previewActivity}
        />
      )}

      {/* Re-Login Required Modal */}
      <ReauthModal
        isOpen={isReauthOpen}
        onClose={() => setIsReauthOpen(false)}
        message={reauthMessage}
      />
    </form>
  );
};
