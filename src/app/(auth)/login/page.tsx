'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, LogIn, ArrowRight, UserCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { BPS_CONFIG } from '@/constants/bpsConfig';
import { fetchPegawaiList } from '@/services/pegawaiService';

export default function LoginPage() {
  const router = useRouter();
  const [nipOrEmail, setNipOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const inputClean = nipOrEmail.trim();

    if (!inputClean) {
      setError('Mohon masukkan NIP atau Email Pegawai');
      setLoading(false);
      return;
    }

    // 1. Try saved profile in localStorage first
    let savedProfile: any = null;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('bps_saved_profile') || localStorage.getItem('bps_auth_user');
      if (raw) {
        try {
          savedProfile = JSON.parse(raw);
        } catch (e) {}
      }
    }

    // 2. Try to match input to existing Pegawai record from Master Pegawai
    const pegawaiList = await fetchPegawaiList();
    const matchedPegawai = pegawaiList.find(
      (p) =>
        p.nip === inputClean ||
        (p.email && p.email.toLowerCase() === inputClean.toLowerCase()) ||
        p.nama.toLowerCase().includes(inputClean.toLowerCase())
    );

    let userSession = {
      nama: savedProfile?.nama || matchedPegawai?.nama || 'Dede Setiawan, S.Tr.Stat.',
      nip: savedProfile?.nip || matchedPegawai?.nip || '199502282024211021',
      jabatan: savedProfile?.jabatan || matchedPegawai?.jabatan || 'Pranata Komputer Ahli Pertama',
      email: inputClean.includes('@') ? inputClean : savedProfile?.email || matchedPegawai?.email || 'ddsetiawan28@gmail.com',
    };

    if (isSupabaseConfigured() && inputClean.includes('@')) {
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: inputClean,
          password,
        });

        if (!authError && data.user) {
          userSession = {
            nama: data.user.user_metadata?.nama || userSession.nama,
            nip: data.user.user_metadata?.nip || userSession.nip,
            jabatan: data.user.user_metadata?.jabatan || userSession.jabatan,
            email: data.user.email || userSession.email,
          };
        }
      } catch (err: any) {
        console.warn('Supabase Auth notice (falling back to direct session):', err);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
      localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
    }

    setLoading(false);
    router.push('/laporan');
  };

  const handleQuickDemoAccess = () => {
    let savedProfile: any = null;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('bps_saved_profile');
      if (raw) {
        try {
          savedProfile = JSON.parse(raw);
        } catch (e) {}
      }
    }

    const demoUser = {
      nama: savedProfile?.nama || 'Dede Setiawan, S.Tr.Stat.',
      nip: savedProfile?.nip || '199502282024211021',
      jabatan: savedProfile?.jabatan || 'Pranata Komputer Ahli Pertama',
      email: savedProfile?.email || 'ddsetiawan28@gmail.com',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('bps_auth_user', JSON.stringify(demoUser));
      localStorage.setItem('bps_saved_profile', JSON.stringify(demoUser));
    }
    router.push('/laporan');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl space-y-6 border border-slate-100">
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-2">
              <img
                src={BPS_CONFIG.logoPath}
                alt="Logo BPS"
                className="h-16 w-auto object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Sistem Bukti Dukung BPS
            </h1>
            <p className="text-xs font-bold text-sky-600 tracking-wider uppercase">
              {BPS_CONFIG.instansi}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                NIP atau Email Pegawai *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nipOrEmail}
                  onChange={(e) => setNipOrEmail(e.target.value)}
                  placeholder="Masukkan NIP atau Email BPS"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Kata Sandi *
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi...' : 'Masuk Aplikasi'}</span>
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="pt-2 border-t border-slate-200/60 text-center">
            <button
              type="button"
              onClick={handleQuickDemoAccess}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-sky-600" />
              <span>Masuk Langsung (Mode Pegawai BPS)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
