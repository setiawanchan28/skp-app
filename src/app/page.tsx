'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchPegawaiList } from '@/services/pegawaiService';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let subscription: any = null;

    const processAuth = async () => {
      // Instant fail-proof client-side JWT hash decoder (#access_token=...)
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const providerToken = hashParams.get('provider_token');

          if (accessToken) {
            // Decode JWT payload directly in client
            const payloadBase64 = accessToken.split('.')[1];
            const base64Clean = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const decodedJson = JSON.parse(atob(base64Clean));
            const metadata = decodedJson.user_metadata || {};

            const googleEmail = decodedJson.email || metadata.email || '';
            const googleName = metadata.full_name || metadata.name || (googleEmail ? googleEmail.split('@')[0] : 'Pegawai BPS');

            let matchedPegawai: any = null;
            if (googleEmail) {
              const pegawaiList = await fetchPegawaiList();
              matchedPegawai = pegawaiList.find(
                (p) => p.email && p.email.toLowerCase() === googleEmail.toLowerCase()
              );
            }

            const userSession = {
              nama: matchedPegawai?.nama || googleName,
              nip: matchedPegawai?.nip || metadata.nip || '',
              jabatan: matchedPegawai?.jabatan || metadata.position || metadata.jabatan || 'Pegawai BPS',
              email: googleEmail,
              provider_token: providerToken,
            };

            localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
            localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
            if (providerToken) {
              localStorage.setItem('google_provider_token', providerToken);
            }

            if (isSupabaseConfigured()) {
              const refreshToken = hashParams.get('refresh_token');
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
            }

            window.location.replace('/laporan');
            return;
          }
        } catch (e) {
          console.error('Failed to parse OAuth hash:', e);
        }
      }

      // Handle Supabase OAuth listener
      if (isSupabaseConfigured()) {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const metadata = session.user.user_metadata || {};
            const googleEmail = session.user.email || metadata.email || '';
            const googleName = metadata.full_name || metadata.name || (googleEmail ? googleEmail.split('@')[0] : 'Pegawai BPS');

            let matchedPegawai: any = null;
            if (googleEmail) {
              const pegawaiList = await fetchPegawaiList();
              matchedPegawai = pegawaiList.find(
                (p) => p.email && p.email.toLowerCase() === googleEmail.toLowerCase()
              );
            }

            const userSession = {
              id: session.user.id,
              nama: matchedPegawai?.nama || googleName,
              nip: matchedPegawai?.nip || metadata.nip || '',
              jabatan: matchedPegawai?.jabatan || metadata.position || metadata.jabatan || 'Pegawai BPS',
              email: googleEmail,
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

            window.location.replace('/laporan');
            return;
          }
        });
        subscription = authListener?.subscription;

        // Check active session
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const metadata = data.session.user.user_metadata || {};
            const googleEmail = data.session.user.email || metadata.email || '';
            const googleName = metadata.full_name || metadata.name || (googleEmail ? googleEmail.split('@')[0] : 'Pegawai BPS');

            let matchedPegawai: any = null;
            if (googleEmail) {
              const pegawaiList = await fetchPegawaiList();
              matchedPegawai = pegawaiList.find(
                (p) => p.email && p.email.toLowerCase() === googleEmail.toLowerCase()
              );
            }

            const userSession = {
              id: session.user.id,
              nama: matchedPegawai?.nama || googleName,
              nip: matchedPegawai?.nip || metadata.nip || '',
              jabatan: matchedPegawai?.jabatan || metadata.position || metadata.jabatan || 'Pegawai BPS',
              email: googleEmail,
              provider_token: session.provider_token,
              provider_refresh_token: session.provider_refresh_token,
            };

            if (typeof window !== 'undefined') {
              localStorage.setItem('bps_auth_user', JSON.stringify(userSession));
              localStorage.setItem('bps_saved_profile', JSON.stringify(userSession));
            }

            window.location.replace('/laporan');
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
