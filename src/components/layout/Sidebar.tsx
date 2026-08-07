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
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/laporan/tambah', label: 'Buat Laporan', icon: FilePlus },
  { href: '/laporan', label: 'Riwayat Laporan', icon: FileText },
  { href: '/pegawai', label: 'Master Pegawai', icon: Users },
  { href: '/kalender', label: 'Kalender Kegiatan', icon: Calendar },
  { href: '/pengaturan', label: 'Pengaturan Akun', icon: Settings },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out shadow-lg lg:shadow-none overflow-hidden
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between min-h-[73px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl gradient-bps flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight leading-tight truncate">
                  Laporan Harian
                </h1>
                <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold tracking-wider uppercase">
                  BPS KAB. LEBAK
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white lg:hidden rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isCollapsed ? 'Tampilkan Sidebar' : 'Sembunyikan Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Menu Utama
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 font-bold border border-sky-200/60 dark:border-sky-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer Mode Siang & Malam Toggle */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={toggleTheme}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="Ganti Mode Malam / Siang"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                {!isCollapsed && <span>Mode Siang (Light)</span>}
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-sky-600" />
                {!isCollapsed && <span>Mode Malam (Dark)</span>}
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
