'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Calendar,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { BPS_CONFIG } from '@/constants/bpsConfig';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/laporan/tambah', label: 'Buat Laporan', icon: FilePlus },
  { href: '/laporan', label: 'Riwayat Laporan', icon: FileText },
  { href: '/pegawai', label: 'Master Pegawai', icon: Users },
  { href: '/kalender', label: 'Kalender Kegiatan', icon: Calendar },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

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

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">System Status</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            Connected to Supabase DB & Google Drive API
          </p>
        </div>
      </div>
    </aside>
  );
};
