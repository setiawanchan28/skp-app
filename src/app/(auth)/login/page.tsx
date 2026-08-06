'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan sistem saat login');
        setLoading(false);
        return;
      }
    }

    // Direct access to dashboard
    router.push('/');
  };

  const handleDemoAccess = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="max-w-md w-full relative z-10">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl space-y-6">
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-2xl gradient-bps items-center justify-center text-white shadow-lg shadow-sky-500/30 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Laporan Harian Kerja
            </h1>
            <p className="text-xs font-semibold text-sky-600 tracking-wider uppercase">
              BADAN PUSAT STATISTIK KABUPATEN LEBAK
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Pegawai
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nip@bps.go.id"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Kata Sandi
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
              onClick={handleDemoAccess}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
            >
              <span>Masuk Mode Demonstrasi Langsung</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
