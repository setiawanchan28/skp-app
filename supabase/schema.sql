-- SQL Script for Supabase setup: Laporan Harian Kerja BPS
-- Execute this script in your Supabase SQL Editor

-- 1. Create Pegawai Table
CREATE TABLE IF NOT EXISTS public.pegawai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  jabatan TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Laporan Table
CREATE TABLE IF NOT EXISTS public.laporan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
  nama_pegawai TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  jabatan TEXT NOT NULL,
  tanggal DATE NOT NULL,
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

-- 3. Create Laporan Foto Table
CREATE TABLE IF NOT EXISTS public.laporan_foto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  laporan_id UUID REFERENCES public.laporan(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  drive_file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_foto ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Allows authenticated users to manage their data)
CREATE POLICY "Users can manage their own pegawai data" 
  ON public.pegawai FOR ALL 
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their own laporan data" 
  ON public.laporan FOR ALL 
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage photos for their laporan" 
  ON public.laporan_foto FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.laporan 
      WHERE id = laporan_foto.laporan_id 
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.laporan 
      WHERE id = laporan_foto.laporan_id 
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pegawai_nip ON public.pegawai(nip);
CREATE INDEX IF NOT EXISTS idx_laporan_tanggal ON public.laporan(tanggal);
CREATE INDEX IF NOT EXISTS idx_laporan_pegawai ON public.laporan(pegawai_id);
