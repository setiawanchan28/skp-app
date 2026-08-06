import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Laporan Harian Kerja - BPS Kabupaten Lebak',
  description: 'Aplikasi Bukti Dukung Kegiatan Harian Badan Pusat Statistik Kabupaten Lebak',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
