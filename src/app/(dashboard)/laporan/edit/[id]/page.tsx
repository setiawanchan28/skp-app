'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReportForm } from '@/components/laporan/ReportForm';
import { fetchLaporanById } from '@/services/laporanService';
import { Laporan } from '@/types/laporan';
import { FileEdit, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditLaporanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLaporanById(id).then((data) => {
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
        <p className="text-sm font-semibold text-slate-600">Memuat data laporan untuk diedit...</p>
      </div>
    );
  }

  if (!laporan) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-base font-bold text-slate-700">Laporan tidak ditemukan!</p>
        <Link
          href="/laporan"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Laporan</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-sky-600" />
            <span>Edit Laporan Kegiatan Harian</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Perbarui rincian kegiatan, deskripsi, narasi, atau foto dokumentasi laporan
          </p>
        </div>

        <Link
          href="/laporan"
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Batal & Kembali</span>
        </Link>
      </div>

      {/* Form with initialData */}
      <ReportForm initialData={laporan} />
    </div>
  );
}
