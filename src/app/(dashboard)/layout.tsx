'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Authentication Guard Check for Dashboard
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (typeof window !== 'undefined') {
        const savedUserStr =
          localStorage.getItem('bps_auth_user') ||
          localStorage.getItem('bps_saved_profile') ||
          localStorage.getItem('bps_user_profile');

        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed && (parsed.nama || parsed.nama_pegawai || parsed.nip || parsed.email || parsed.id)) {
              if (isMounted) setIsCheckingAuth(false);
              return;
            }
          } catch (e) {}
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
          const result: any = await Promise.race([sessionPromise, timeoutPromise]);
          if (result?.data?.session) {
            if (isMounted) setIsCheckingAuth(false);
            return;
          }
        } catch (e) {}
      }

      if (typeof window !== 'undefined') {
        const localData = localStorage.getItem('bps_laporan_data');
        if (localData) {
          if (isMounted) setIsCheckingAuth(false);
          return;
        }
      }

      // Not authenticated -> Redirect to Login Page
      if (isMounted) setIsCheckingAuth(false);
      router.replace('/login');
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-xs font-bold text-sky-400 animate-pulse">
          Memverifikasi sesi pengguna...
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
          {/* Desktop & Mobile Responsive Sidebar */}
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
            <Navbar onMenuClick={() => setIsMobileOpen(!isMobileOpen)} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
          </div>

          {/* Mobile Navigation Bar */}
          <MobileNav />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
