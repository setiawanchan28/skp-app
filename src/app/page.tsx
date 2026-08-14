'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let subscription: any = null;

    const processAuth = async () => {
      // Handle Supabase OAuth hash listener (#access_token=...)
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

            router.replace('/laporan');
            return;
          }
        });
        subscription = authListener?.subscription;

        // Check active session
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const metadata = data.session.user.user_metadata || {};
            const userSession = {
              nama: metadata.full_name || metadata.name || 'Dede Setiawan, S.Tr.Stat.',
              nip: metadata.nip || '199502282024211021',
              jabatan: metadata.position || metadata.jabatan || 'Pranata Komputer Ahli Pertama',
              email: data.session.user.email,
              provider_token: data.session.provider_token,
              provider_refresh_token: data.session.provider_refresh_token,
            };

            if (typeof window !== 'undefined') {
              localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
              localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
            }

            router.replace('/laporan');
            return;
          }
        } catch (e) {}
      }

      // Check local session fallback
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

      // Default: Redirect to Login Page
      router.replace('/login');
    };

    processAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-xs font-bold text-sky-400 animate-pulse">
        Memverifikasi otentikasi Google...
      </div>
    </div>
  );
}
