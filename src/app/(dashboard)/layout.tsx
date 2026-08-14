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
    const verifySession = async () => {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('bps_auth_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed && parsed.nama) {
              setIsCheckingAuth(false);
              return;
            }
          } catch (e) {}
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setIsCheckingAuth(false);
            return;
          }
        } catch (e) {}
      }

      // Not authenticated -> Redirect to Login Page
      router.replace('/login');
    };

    verifySession();
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
