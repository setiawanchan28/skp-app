-- Table untuk menyimpan history upload file Mon181 (PPL & PML)
CREATE TABLE IF NOT EXISTS public.monitoring_181 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(10) NOT NULL, -- 'PPL' atau 'PML'
  file_name TEXT NOT NULL,
  total_rows INT DEFAULT 0,
  total_target INT DEFAULT 0,
  total_realisasi INT DEFAULT 0,
  overall_progres NUMERIC(5,2) DEFAULT 0,
  parsed_data JSONB NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.monitoring_181 ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for monitoring_181
CREATE POLICY "Allow public select monitoring_181" ON public.monitoring_181 FOR SELECT USING (true);
CREATE POLICY "Allow public insert monitoring_181" ON public.monitoring_181 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete monitoring_181" ON public.monitoring_181 FOR DELETE USING (true);
