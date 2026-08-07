'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Calendar,
  Settings,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/laporan/tambah', label: 'Buat Laporan', icon: FilePlus },
  { href: '/laporan', label: 'Riwayat Laporan', icon: FileText },
  { href: '/pegawai', label: 'Master Pegawai', icon: Users },
  { href: '/kalender', label: 'Kalender Kegiatan', icon: Calendar },
  { href: '/pengaturan', label: 'Pengaturan Akun', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [status, setStatus] = useState<{
    connected?: boolean;
    pegawaiCountInDb?: number;
    laporanCountInDb?: number;
    errorMessage?: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkSupabaseStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {}
    setChecking(false);
  };

  useEffect(() => {
    checkSupabaseStatus();
  }, []);

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-bps flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight">
            Laporan Harian
          </h1>
          <p className="text-[11px] text-sky-600 font-semibold tracking-wider uppercase">
            BPS KAB. LEBAK
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Menu Utama
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs border border-sky-200/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer System Status Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span>Status Supabase</span>
            </span>
            <button
              onClick={checkSupabaseStatus}
              disabled={checking}
              className="text-slate-400 hover:text-sky-600 transition-colors"
              title="Cek Status Ulang"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {status ? (
            status.connected ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terhubung Ke Supabase DB</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {status.pegawaiCountInDb} Pegawai, {status.laporanCountInDb} Laporan Terdeteksi di DB
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Belum Terhubung Server</span>
                </div>
                <p className="text-[10px] text-amber-700 leading-tight">
                  {status.errorMessage || 'Cek Vercel Environment Variables'}
                </p>
              </div>
            )
          ) : (
            <p className="text-[11px] text-slate-400 animate-pulse">Memeriksa koneksi Supabase...</p>
          )}
        </div>
      </div>
    </aside>
  );
};
