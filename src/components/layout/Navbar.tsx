'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  User,
  Menu,
  FilePlus,
  LogOut,
  LogIn,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { formatDateIndonesian } from '@/utils/formatters';
import { useTheme } from '@/context/ThemeContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  onMenuClick?: () => void;
}

interface AuthUser {
  nama: string;
  nip: string;
  jabatan?: string;
  email?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const todayStr = new Date().toISOString().split('T')[0];

  const [user, setUser] = useState<AuthUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bps_auth_user') || localStorage.getItem('bps_saved_profile');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.nama) {
            setUser(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    setUser(null);
    setDropdownOpen(false);
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between transition-colors">
      {/* Mobile Hamburger & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95 shrink-0"
          title="Buka Menu Samping"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="min-w-0">
          <h2 className="text-xs sm:text-base font-extrabold text-slate-800 dark:text-white tracking-tight truncate">
            Sistem Bukti Dukung BPS
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">{formatDateIndonesian(todayStr)}</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/laporan/tambah"
          className="flex items-center gap-1.5 py-2 px-3 sm:px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200"
        >
          <FilePlus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Buat Laporan Baru</span>
        </Link>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            {/* User Profile Button with Name Visible on Mobile HP */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 py-1.5 px-2 sm:px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="block text-left">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[160px]">
                  {user.nama}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[90px] xs:max-w-[130px]">
                  NIP. {user.nip}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>

            {/* Profile Dropdown Menu with Logout Inside */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 space-y-1">
                {/* User Header Info */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                    {user.nama}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    NIP. {user.nip}
                  </p>
                  {user.jabatan && (
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{user.jabatan}</span>
                    </p>
                  )}
                </div>

                {/* Theme Switcher Inside Profile Menu */}
                <div className="px-2 pt-1">
                  <button
                    onClick={toggleTheme}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-sky-600" />
                      )}
                      <span>{theme === 'dark' ? 'Mode Siang (Light)' : 'Mode Malam (Dark)'}</span>
                    </span>
                  </button>

                  <Link
                    href="/pengaturan"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 mt-0.5"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Pengaturan Akun</span>
                  </Link>
                </div>

                {/* Logout Button Inside Profile Dropdown */}
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar / Logout Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            <LogIn className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
};
