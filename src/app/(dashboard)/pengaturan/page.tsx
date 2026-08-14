'use client';

import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Save, BadgeCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { savePegawaiOnline, fetchPegawaiList } from '@/services/pegawaiService';

interface UserProfile {
  nama: string;
  nip: string;
  jabatan: string;
  email: string;
}

export default function PengaturanAkunPage() {
  const { showToast } = useToast();

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [email, setEmail] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let hasLocalSaved = false;

    // 1. Prioritize saved local profile if present
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bps_saved_profile') || localStorage.getItem('bps_auth_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.nama && !parsed.nama.includes('NIP:')) {
            setNama(parsed.nama);
            hasLocalSaved = true;
          }
          if (parsed.nip && !parsed.nip.includes('@')) setNip(parsed.nip);
          if (parsed.jabatan) setJabatan(parsed.jabatan);
          if (parsed.email) setEmail(parsed.email);
        } catch (e) {}
      }
    }

    // 2. Only fallback to online list if local profile is not set yet
    if (!hasLocalSaved) {
      fetchPegawaiList().then((list) => {
        if (list && list.length > 0) {
          const p = list[0];
          if (p.nama && !p.nama.includes('NIP:')) setNama(p.nama);
          if (p.nip && !p.nip.includes('@')) setNip(p.nip);
          if (p.jabatan) setJabatan(p.jabatan);
          if (p.email) setEmail(p.email);
        }
      });
    }
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    const updatedUser: UserProfile = {
      nama: nama.trim(),
      nip: nip.trim(),
      jabatan: jabatan.trim(),
      email: email.trim(),
    };

    // 1. Immediately update localStorage synchronously
    if (typeof window !== 'undefined') {
      localStorage.setItem('bps_auth_user', JSON.stringify(updatedUser));
      localStorage.setItem('bps_saved_profile', JSON.stringify(updatedUser));
    }

    // 2. Sync to online server API & Supabase DB
    try {
      await savePegawaiOnline({
        id: 'peg-main',
        nama: updatedUser.nama,
        nip: updatedUser.nip,
        jabatan: updatedUser.jabatan,
        email: updatedUser.email,
      });

      showToast('Profil akun pegawai berhasil diperbarui dan tersimpan permanen!', 'success');
    } catch (err: any) {
      showToast('Profil tersimpan di perangkat lokal!', 'info');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Pengaturan Akun Pegawai</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola profil identitas resmi pegawai BPS Kabupaten Lebak (Tersimpan Permanen)
          </p>
        </div>

        <div className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-xl text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5">
          <BadgeCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Akun Pegawai Aktif</span>
        </div>
      </div>

      {/* Profil Identity Form */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
            Informasi Profil Pegawai
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nama Lengkap & Gelar *
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              NIP (18 Digit) *
            </label>
            <input
              type="text"
              required
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Jabatan Pegawai *
            </label>
            <input
              type="text"
              required
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Resmi BPS *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
