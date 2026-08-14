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
  FileCheck,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { BPS_CONFIG } from '@/constants/bpsConfig';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/laporan/tambah', label: 'Buat Laporan', icon: FilePlus },
  { href: '/laporan', label: 'Riwayat Laporan', icon: FileText },
  { href: '/penugasan', label: 'Perjadin & Penugasan', icon: FileCheck },
  { href: '/kalender', label: 'Kalender Kerja', icon: Calendar },
  { href: '/pengaturan', label: 'Pengaturan Akun', icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bps_auth_user');
      localStorage.removeItem('bps_saved_profile');
      localStorage.removeItem('google_provider_token');
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }

    window.location.href = '/login';
  };

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header Logo & Branding */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0">
              <img
                src={BPS_CONFIG.logoPath}
                alt="BPS"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  Laporan Harian BPS
                </h1>
                <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 truncate">
                  BPS Kabupaten Lebak
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
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
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
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

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

        {/* Footer Mode Toggle & Logout Button */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          <button
            onClick={toggleTheme}
            className={`w-full py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="Ganti Mode Malam / Siang"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                {!isCollapsed && <span>Mode Siang (Light)</span>}
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-sky-600 shrink-0" />
                {!isCollapsed && <span>Mode Malam (Dark)</span>}
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 transition-colors flex items-center justify-center gap-2"
            title="Keluar / Logout Akun"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar / Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
