'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // 1. Check local session state
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('bps_auth_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed && parsed.nama) {
              router.replace('/laporan');
              return;
            }
          } catch (e) {}
        }
      }

      // 2. Check Supabase Auth session if configured
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            router.replace('/laporan');
            return;
          }
        } catch (e) {}
      }

      // Default: Redirect to Login Page
      router.replace('/login');
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-xs font-bold text-sky-400 animate-pulse">
        Mengarahkan ke halaman login...
      </div>
    </div>
  );
}
