-- SQL Script for Supabase setup: Laporan Harian Kerja & Laporan Penugasan BPS
-- Execute this script in your Supabase SQL Editor

-- 1. Create Pegawai Table
CREATE TABLE IF NOT EXISTS public.pegawai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  jabatan TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Laporan Harian Table
CREATE TABLE IF NOT EXISTS public.laporan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
  nama_pegawai TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  jabatan TEXT NOT NULL,
  tanggal DATE NOT NULL,
  tanggal_selesai DATE,
  nama_kegiatan TEXT NOT NULL,
  deskripsi_kegiatan TEXT NOT NULL,
  ringkasan_kegiatan TEXT NOT NULL,
  kategori TEXT DEFAULT 'Lainnya',
  drive_pdf_url TEXT,
  drive_pdf_file_id TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Laporan Harian Foto Table
CREATE TABLE IF NOT EXISTS public.laporan_foto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  laporan_id UUID REFERENCES public.laporan(id) ON DELETE CASCADE,
  drive_file_id TEXT,
  drive_file_url TEXT,
  file_name TEXT NOT NULL,
  tanggal_foto DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Laporan Penugasan / Perjadin BPS Table
CREATE TABLE IF NOT EXISTS public.laporan_penugasan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_pegawai TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  jabatan TEXT NOT NULL,
  nama_kegiatan TEXT NOT NULL,
  tanggal_perjadin DATE NOT NULL,
  tanggal_selesai_perjadin DATE,
  tempat_tujuan TEXT NOT NULL,
  nomor_surat TEXT NOT NULL,
  nomor_spd TEXT NOT NULL,
  resume_kegiatan TEXT NOT NULL,
  drive_pdf_url TEXT,
  drive_pdf_file_id TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Penugasan Petugas Ditemui Table
CREATE TABLE IF NOT EXISTS public.penugasan_petugas_ditemui (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  penugasan_id UUID REFERENCES public.laporan_penugasan(id) ON DELETE CASCADE,
  no INT DEFAULT 1,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Penugasan Foto Table
CREATE TABLE IF NOT EXISTS public.penugasan_foto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  penugasan_id UUID REFERENCES public.laporan_penugasan(id) ON DELETE CASCADE,
  drive_file_id TEXT,
  drive_file_url TEXT,
  file_name TEXT NOT NULL,
  tanggal_foto DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_foto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_penugasan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penugasan_petugas_ditemui ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penugasan_foto ENABLE ROW LEVEL SECURITY;
