'use client';

import React from 'react';
import Link from 'next/link';
import { PenugasanForm } from '@/components/penugasan/PenugasanForm';
import { FileCheck, ArrowLeft } from 'lucide-react';

export default function TambahPenugasanPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Buat Laporan Penugasan BPS Baru</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Format resmi Laporan Perjalanan Dinas BPS (Nomor ST, Nomor SPD, Petugas Ditemui, Resume & Dokumentasi)
          </p>
        </div>

        <Link
          href="/penugasan"
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>
      </div>

      <PenugasanForm />
    </div>
  );
}
