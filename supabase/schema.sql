-- Supabase Schema DDL for Mamang Racing
-- Parent Docs: PRD.md, SRS.md, DATABASE.md, DESIGN.md

-- 1. Create Enumeration Types
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'PERJALANAN_DINAS',
    'NON_PERJALANAN_DINAS'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM (
    'DRAFT',
    'READY',
    'GENERATED',
    'TRASHED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE documentation_kind AS ENUM (
    'PHOTO',
    'DOCUMENT',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE drive_connection_status AS ENUM (
    'ACTIVE',
    'REAUTH_REQUIRED',
    'REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE drive_resource_type AS ENUM (
    'ROOT',
    'YEAR',
    'MONTH',
    'ACTIVITY',
    'PDF',
    'DOCUMENTATION',
    'TRASH'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE generation_status AS ENUM (
    'PROCESSING',
    'SUCCESS',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Create Profiles Table (1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Activities Table (Unified Activity Model)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  destination TEXT NULL,
  letter_number TEXT NULL,
  spd_number TEXT NULL,
  description TEXT NULL,
  nama_pegawai TEXT NULL,
  nip VARCHAR(18) NULL,
  jabatan TEXT NULL,
  status activity_status NOT NULL DEFAULT 'DRAFT',
  previous_status activity_status NULL,
  generated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_activity_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_single_day_time CHECK (
    start_date <> end_date OR end_time >= start_time
  ),
  CONSTRAINT chk_pd_fields CHECK (
    activity_type = 'NON_PERJALANAN_DINAS'
    OR (
      NULLIF(TRIM(destination), '') IS NOT NULL
      AND NULLIF(TRIM(letter_number), '') IS NOT NULL
      AND NULLIF(TRIM(spd_number), '') IS NOT NULL
    )
  )
);

-- Unique index for case-insensitive activity name per active user
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_activity_name
ON public.activities (user_id, normalized_name)
WHERE deleted_at IS NULL;

-- 4. Create Activity People Table
CREATE TABLE IF NOT EXISTS public.activity_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  position TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Activity Documents Table
CREATE TABLE IF NOT EXISTS public.activity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  documentation_date DATE NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NULL,
  kind documentation_kind NOT NULL DEFAULT 'PHOTO',
  drive_file_id TEXT NOT NULL,
  drive_name TEXT NOT NULL,
  sort_order INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Photo Limit Function & Trigger (Max 6 photos per activity per date)
CREATE OR REPLACE FUNCTION enforce_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  IF NEW.kind = 'PHOTO' THEN
    SELECT COUNT(*)
      INTO photo_count
    FROM public.activity_documents
    WHERE activity_id = NEW.activity_id
      AND documentation_date = NEW.documentation_date
      AND kind = 'PHOTO'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF photo_count >= 6 THEN
      RAISE EXCEPTION 'Maksimal 6 foto untuk satu kegiatan pada tanggal yang sama.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photo_limit ON public.activity_documents;
CREATE TRIGGER trg_photo_limit
BEFORE INSERT OR UPDATE ON public.activity_documents
FOR EACH ROW EXECUTE FUNCTION enforce_photo_limit();

-- 6. Create Drive Connections Table
CREATE TABLE IF NOT EXISTS public.drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_account_subject TEXT NOT NULL,
  status drive_connection_status NOT NULL DEFAULT 'ACTIVE',
  token_secret_ref TEXT NULL,
  scopes TEXT[] NOT NULL,
  last_verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create Drive Resources Table
CREATE TABLE IF NOT EXISTS public.drive_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID NULL REFERENCES public.activities(id) ON DELETE SET NULL,
  resource_type drive_resource_type NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_parent_id TEXT NULL,
  drive_name TEXT NOT NULL,
  mime_type TEXT NULL,
  web_view_url TEXT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create Activity Generations Table
CREATE TABLE IF NOT EXISTS public.activity_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  generation_number INT NOT NULL DEFAULT 1,
  pdf_drive_file_id TEXT NULL,
  status generation_status NOT NULL DEFAULT 'PROCESSING',
  content_hash TEXT NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_generation_idempotency
ON public.activity_generations (activity_id, idempotency_key);

-- 9. Create Activity Audit Log Table
CREATE TABLE IF NOT EXISTS public.activity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
CREATE POLICY "Users access own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users access own activities" ON public.activities;
CREATE POLICY "Users access own activities" ON public.activities
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own activity people" ON public.activity_people;
CREATE POLICY "Users access own activity people" ON public.activity_people
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_people.activity_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users access own activity documents" ON public.activity_documents;
CREATE POLICY "Users access own activity documents" ON public.activity_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_documents.activity_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users access own drive connections" ON public.drive_connections;
CREATE POLICY "Users access own drive connections" ON public.drive_connections
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own drive resources" ON public.drive_resources;
CREATE POLICY "Users access own drive resources" ON public.drive_resources
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own generations" ON public.activity_generations;
CREATE POLICY "Users access own generations" ON public.activity_generations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_generations.activity_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users access own audit log" ON public.activity_audit_log;
CREATE POLICY "Users access own audit log" ON public.activity_audit_log
  FOR ALL USING (auth.uid() = user_id);
