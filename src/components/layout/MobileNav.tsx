'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, FilePlus, FileCheck, Users, Settings } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { href: '/', label: 'Beranda', icon: LayoutDashboard },
  { href: '/laporan/tambah', label: 'Tambah', icon: FilePlus },
  { href: '/laporan', label: 'Riwayat', icon: FileText },
  { href: '/penugasan', label: 'Penugasan', icon: FileCheck },
  { href: '/pegawai', label: 'Pegawai', icon: Users },
  { href: '/pengaturan', label: 'Akun', icon: Settings },
];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg transition-colors">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
