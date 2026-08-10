'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PenugasanForm } from '@/components/penugasan/PenugasanForm';
import { fetchPenugasanById } from '@/services/penugasanService';
import { LaporanPenugasan } from '@/types/penugasan';
import { FileEdit, ArrowLeft, Loader2 } from 'lucide-react';

export default function EditPenugasanPage() {
  const params = useParams();
  const id = params?.id as string;

  const [laporan, setLaporan] = useState<LaporanPenugasan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPenugasanById(id).then((data) => {
        if (data) {
          setLaporan(data);
        }
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Memuat laporan penugasan...</p>
      </div>
    );
  }

  if (!laporan) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">Laporan penugasan tidak ditemukan!</p>
        <Link
          href="/penugasan"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Penugasan</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Edit Laporan Penugasan BPS</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Perbarui rincian kegiatan penugasan, nomor ST/SPD, daftar petugas ditemui, atau resume
          </p>
        </div>

        <Link
          href="/penugasan"
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Batal</span>
        </Link>
      </div>

      <PenugasanForm initialData={laporan} />
    </div>
  );
}
