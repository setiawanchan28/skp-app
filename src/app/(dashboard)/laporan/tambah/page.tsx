'use client';

import React from 'react';
import { ReportForm } from '@/components/laporan/ReportForm';
import { FilePlus } from 'lucide-react';

export default function TambahLaporanPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-sky-600" />
          <span>Buat Laporan Harian Kerja Baru</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Lengkapi detail kegiatan, generate ringkasan resmi dengan Gemini AI, lalu klik Simpan Laporan.
        </p>
      </div>

      <ReportForm />
    </div>
  );
}
