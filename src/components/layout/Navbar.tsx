'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, User, Sparkles, Menu, FilePlus, LogOut, LogIn } from 'lucide-react';
import { formatDateIndonesian } from '@/utils/formatters';

interface NavbarProps {
  onMenuClick?: () => void;
}

interface AuthUser {
  nama: string;
  nip: string;
  email?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const router = useRouter();
  const todayStr = new Date().toISOString().split('T')[0];
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bps_auth_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {}
      } else {
        // Default login user profile
        const defaultUser: AuthUser = {
          nama: 'Dede Supriatna, S.Si., M.Stat.',
          nip: '198805122010121002',
          email: 'dede.supriatna@bps.go.id',
        };
        setUser(defaultUser);
        localStorage.setItem('bps_auth_user', JSON.stringify(defaultUser));
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bps_auth_user');
    }
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            Sistem Bukti Dukung BPS
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
            <span>{formatDateIndonesian(todayStr)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/laporan/tambah"
          className="flex items-center gap-2 py-2 px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-200"
        >
          <FilePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Buat Laporan Baru</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{user.nama}</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. {user.nip}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <LogIn className="w-4 h-4 text-sky-600" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
};
