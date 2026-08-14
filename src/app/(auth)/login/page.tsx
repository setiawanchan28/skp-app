'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, UserCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { BPS_CONFIG } from '@/constants/bpsConfig';
import { fetchPegawaiList } from '@/services/pegawaiService';

export default function LoginPage() {
  const router = useRouter();
  const [nipOrEmail, setNipOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direct OAuth Hash Fragment parsing on mount (#access_token=...)
  useEffect(() => {
    const processOAuthHash = async () => {
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const providerToken = hashParams.get('provider_token');

          if (accessToken && isSupabaseConfigured()) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (!error && data?.session?.user) {
              const metadata = data.session.user.user_metadata || {};
              const userSession = {
                nama: metadata.full_name || metadata.name || 'Dede Setiawan, S.Tr.Stat.',
                nip: metadata.nip || '199502282024211021',
                jabatan: metadata.position || metadata.jabatan || 'Pranata Komputer Ahli Pertama',
                email: data.session.user.email,
                provider_token: providerToken || data.session.provider_token,
              };

              localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
              localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
              if (providerToken) {
                localStorage.setItem('google_provider_token', providerToken);
              }

              window.location.href = '/laporan';
              return;
            }
          }
        } catch (e) {
          console.error('Error parsing OAuth hash in login page:', e);
        }
      }

      if (isSupabaseConfigured()) {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const metadata = session.user.user_metadata || {};
            const userSession = {
              nama: metadata.full_name || metadata.name || 'Dede Setiawan, S.Tr.Stat.',
              nip: metadata.nip || '199502282024211021',
              jabatan: metadata.position || metadata.jabatan || 'Pranata Komputer Ahli Pertama',
              email: session.user.email,
              provider_token: session.provider_token,
              provider_refresh_token: session.provider_refresh_token,
            };

            if (typeof window !== 'undefined') {
              localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
              localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
              if (session.provider_token) {
                localStorage.setItem('google_provider_token', session.provider_token);
              }
            }

            window.location.href = '/laporan';
          }
        });

        return () => {
          authListener?.subscription.unsubscribe();
        };
      }
    };

    processOAuthHash();
  }, [router]);

  // AUTH-001: Google Account Login via Supabase OAuth
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            scopes: 'https://www.googleapis.com/auth/drive.file',
          },
        });
        if (oauthError) throw oauthError;
      } else {
        // Fallback demo access if Supabase OAuth is not configured
        handleQuickDemoAccess();
      }
    } catch (err: any) {
      setError(`Google Login Error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const inputClean = nipOrEmail.trim().toLowerCase();

    if (!inputClean || !password) {
      setError('Mohon masukkan NIP/Email dan Kata Sandi Anda!');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi salah / minimal harus 6 karakter!');
      setLoading(false);
      return;
    }

    // 1. If Supabase Auth is configured and input is an email, attempt Supabase Auth
    if (isSupabaseConfigured() && inputClean.includes('@')) {
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: inputClean,
          password,
        });

        if (!authError && data?.user) {
          const userSession = {
            nama: data.user.user_metadata?.full_name || data.user.user_metadata?.nama || 'Dede Setiawan, S.Tr.Stat.',
            nip: data.user.user_metadata?.nip || '199502282024211021',
            jabatan: data.user.user_metadata?.position || data.user.user_metadata?.jabatan || 'Pranata Komputer Ahli Pertama',
            email: data.user.email,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
            localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
          }
          setLoading(false);
          router.push('/laporan');
          return;
        }
      } catch (err) {}
    }

    // 2. Fetch active Pegawai Master list from database/server
    const pegawaiList = await fetchPegawaiList();
    const matchedPegawai = pegawaiList.find(
      (p) =>
        p.nip.toLowerCase() === inputClean ||
        (p.email && p.email.toLowerCase() === inputClean)
    );

    // 3. Read saved local profile
    let savedProfile: any = null;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('bps_saved_profile');
      if (raw) {
        try {
          savedProfile = JSON.parse(raw);
        } catch (e) {}
      }
    }

    const isMatchSaved =
      savedProfile &&
      (savedProfile.nip?.toLowerCase() === inputClean ||
        savedProfile.email?.toLowerCase() === inputClean);

    if (!matchedPegawai && !isMatchSaved) {
      setError(`NIP atau Email "${nipOrEmail}" tidak terdaftar dalam Master Pegawai! Silakan gunakan NIP/Email pegawai resmi atau Masuk dengan Akun Google.`);
      setLoading(false);
      return;
    }

    const activeProfile = matchedPegawai || savedProfile;
    const userSession = {
      nama: activeProfile?.nama || 'Dede Setiawan, S.Tr.Stat.',
      nip: activeProfile?.nip || '199502282024211021',
      jabatan: activeProfile?.jabatan || 'Pranata Komputer Ahli Pertama',
      email: inputClean.includes('@') ? inputClean : activeProfile?.email || 'ddsetiawan28@gmail.com',
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
      localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
    }

    setLoading(false);
    router.push('/laporan');
  };

  const handleQuickDemoAccess = async () => {
    let savedProfile: any = null;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('bps_saved_profile') || localStorage.getItem('bps_auth_user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.nama && !parsed.nama.includes('NIP:')) {
            savedProfile = parsed;
          }
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
              Mamang Racing
            </h1>
            <p className="text-xs font-bold text-sky-600 tracking-wider uppercase">
              Pikiran Ngebut, Laporan Tetap Rapi
            </p>
          </div>

          {/* Primary Google Login Button (PRD AUTH-001) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl text-sm border border-slate-300 shadow-md transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Masuk dengan Akun Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative">Atau NIP / Email</span>
          </div>

          {/* Form Login NIP/Email */}
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
                  placeholder="Masukkan NIP (18 Digit) atau Email BPS"
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium leading-relaxed">
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
