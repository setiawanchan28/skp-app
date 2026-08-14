'use client';

import React from 'react';
import { LogOut, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const ReauthModal: React.FC<ReauthModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  const handleLogoutAndReauth = async () => {
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-center">
        <div className="w-14 h-14 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <KeyRound className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Sesi Login Google Perlu Diperbarui
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {message ||
              'Token otentikasi Google Drive Anda telah kadaluwarsa atau belum terhubung dengan akun Google (Gmail) Anda.'}
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-medium text-left leading-relaxed mt-3">
            💡 <strong>Solusi:</strong> Silakan klik tombol di bawah untuk keluar, lalu login kembali menggunakan tombol <strong>"Masuk dengan Akun Google"</strong> agar berkas tersimpan otomatis di Google Drive pribadi Anda.
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Tutup / Nanti
          </button>
          <button
            type="button"
            onClick={handleLogoutAndReauth}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar & Login Kembali</span>
          </button>
        </div>
      </div>
    </div>
  );
};
