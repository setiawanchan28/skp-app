# System Architecture & Technical Design Document (DESIGN.md)

**Produk:** Mamang Racing --- Pikiran Ngebut, Laporan Tetap Rapi.\
**Status:** Approved Target System Design (Step 6)\
**Referensi Utama:** `docs/PRD.md`, `docs/SRS.md`, `docs/DATABASE.md`, `docs/EXISTING-SYSTEM.md`, `docs/CHANGE-SPEC.md`

---

## 1. Arsitektur Target Sistem (Target System Architecture)

```
[ PWA Client (Next.js 15 App Router) ]
         │
         ├──► Auth: Supabase Auth (Google OAuth SSO)
         │
         ├──► Application State / Metadata: Supabase PostgreSQL (RLS Enforced)
         │
         ├──► File Storage: User's Google Drive (via OAuth2 User Access/Refresh Tokens)
         │
         ├──► AI Narrative Assistant: Server-side Gemini 2.0 / Flash API (API Key Secured)
         │
         └──► PDF Engine: Server-side PDF Generator (pdf-lib / sharp image downscaler)
```

### Prinsip Utama Arsitektur Target:
1. **User Ownership:** File PDF dan foto dokumentasi disimpan secara eksklusif di Google Drive milik pengguna.
2. **Metadata-only Database:** Supabase hanya menyimpan state aplikasi, metadata, dan referensi ID file Drive.
3. **AI Assistance Boundary:** AI hanya membantu merapikan narasi deskripsi kegiatan; AI tidak menentukan format/layout PDF dan tidak menyimpan data.
4. **Server-side Enforcement:** Keamanan (RLS), locking field identitas, dan kuota foto ditegakkan di server & database PostgreSQL.

---

## 2. Arsitektur Database & Skema DDL Final

### 2.1 Enumerasi (ENUM Types)

```sql
CREATE TYPE activity_type AS ENUM (
  'PERJALANAN_DINAS',
  'NON_PERJALANAN_DINAS'
);

CREATE TYPE activity_status AS ENUM (
  'DRAFT',
  'READY',
  'GENERATED',
  'TRASHED'
);

CREATE TYPE documentation_kind AS ENUM (
  'PHOTO',
  'DOCUMENT',
  'OTHER'
);

CREATE TYPE drive_connection_status AS ENUM (
  'ACTIVE',
  'REAUTH_REQUIRED',
  'REVOKED'
);

CREATE TYPE drive_resource_type AS ENUM (
  'ROOT',
  'YEAR',
  'MONTH',
  'ACTIVITY',
  'PDF',
  'DOCUMENTATION',
  'TRASH'
);

CREATE TYPE generation_status AS ENUM (
  'PROCESSING',
  'SUCCESS',
  'FAILED'
);
```

### 2.2 Tabel Data Utama

```sql
-- 1. Profiles (1-to-1 dengan auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  nip VARCHAR(18) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Activities (Unified Model untuk PD & Non-PD)
CREATE TABLE public.activities (
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

-- Index Keunikan Nama Kegiatan per Pengguna
CREATE UNIQUE INDEX uq_active_activity_name
ON public.activities (user_id, normalized_name)
WHERE deleted_at IS NULL;

-- 3. Activity People (Orang yang Ditemui)
CREATE TABLE public.activity_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  position TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Activity Documents (Metadata Dokumentasi Foto/File)
CREATE TABLE public.activity_documents (
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

-- Trigger Function: Enforce Photo Limit (Max 6 Photos Per Activity Per Date)
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

CREATE TRIGGER trg_photo_limit
BEFORE INSERT OR UPDATE ON public.activity_documents
FOR EACH ROW EXECUTE FUNCTION enforce_photo_limit();

-- 5. Drive Connections (Token Otorisasi Per-User)
CREATE TABLE public.drive_connections (
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

-- 6. Drive Resources (Hirarki Folder & File Google Drive)
CREATE TABLE public.drive_resources (
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

-- 7. Activity Generations (Idempotency PDF)
CREATE TABLE public.activity_generations (
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

CREATE UNIQUE INDEX uq_generation_idempotency
ON public.activity_generations (activity_id, idempotency_key);

-- 8. Activity Audit Log
CREATE TABLE public.activity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Row Level Security (RLS) & Privacy Boundary

Semua tabel diaktifkan RLS dengan kebijakan isolasi ketat:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy Profiles
CREATE POLICY "Users access own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Policy Activities
CREATE POLICY "Users access own activities" ON public.activities
  FOR ALL USING (auth.uid() = user_id);

-- Policy Activity People (Child of Activities)
CREATE POLICY "Users access own activity people" ON public.activity_people
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_people.activity_id AND a.user_id = auth.uid()
    )
  );

-- Policy Activity Documents (Child of Activities)
CREATE POLICY "Users access own activity documents" ON public.activity_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_documents.activity_id AND a.user_id = auth.uid()
    )
  );

-- Policy Drive Connections & Resources
CREATE POLICY "Users access own drive connections" ON public.drive_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own drive resources" ON public.drive_resources
  FOR ALL USING (auth.uid() = user_id);

-- Policy Activity Generations
CREATE POLICY "Users access own generations" ON public.activity_generations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_generations.activity_id AND a.user_id = auth.uid()
    )
  );

-- Policy Audit Log
CREATE POLICY "Users access own audit log" ON public.activity_audit_log
  FOR ALL USING (auth.uid() = user_id);
```

> **Aturan Privasi Admin:** Tidak ada policy RLS yang mengizinkan role `admin` membaca data `activities`, `activity_documents`, atau isi laporan pengguna. Statistik admin hanya membaca agregat anonim via Database Function terisolasi.

---

## 4. Desain Integrasi Google Drive

### 4.1 Modul Otentikasi & Scope Minim
- Scope yang diminta: `https://www.googleapis.com/auth/drive.file` (Hanya dapat mengakses folder & file yang dibuat oleh aplikasi Mamang Racing).
- Access Token & Refresh Token disimpan terenkripsi menggunakan AES-256-GCM. Kunci enkripsi diambil dari environment variable server (`DRIVE_ENCRYPTION_KEY`).

### 4.2 Struktur Hirarki Folder Standard
```
Laporan Kegiatan /
└── YYYY /
    └── MM /
        └── YYMMDD - Nama Kegiatan /
            ├── YYMMDD - Nama Kegiatan.pdf
            ├── YYMMDD - Nama Kegiatan - FotoAsli1.jpg
            └── YYMMDD - Nama Kegiatan - FotoAsli2.jpg
```
- **Tanggal Folder & PDF:** Menggunakan `start_date` kegiatan.
- **Tanggal Foto:** Menggunakan `documentation_date` asli foto tersebut.

### 4.3 Izin Akses File (Sharing)
- File PDF yang digenerate diatur izinnya menjadi: `Anyone with the link --- Viewer` via Drive Permissions API.
- File foto dokumentasi **TIDAK** otomatis dipublikasikan.

---

## 5. Desain Integrasi Gemini AI

### 5.1 Isolasi Server-Side
- Panggilan API Gemini dilakukan secara eksklusif di Next.js Server API route (`/api/gemini/generate`). `GEMINI_API_KEY` tidak pernah exposed ke browser client.

### 5.2 System Prompt & Safe Guard Logic
```typescript
const systemPrompt = `
Anda adalah asisten perapi narasi Bukti Dukung Kegiatan Pegawai BPS.
Tugas Anda: Merapikan input catatan atau ucapan pengguna menjadi deskripsi kegiatan formal, kronologis, dan berstandar Bahasa Indonesia BPS.

ATURAN KETAT:
1. DILARANG MEREKAYASA FAKTA (nama orang, NIP, jabatan, tanggal, lokasi, nomor SPD, hasil kegiatan yang tidak ada di input).
2. Tuliskan dalam kata kerja aktif formal ("Melaksanakan...", "Melakukan...", "Menguji...").
3. Berikan output langsung narasi tanpa salam pembuka atau penutup.
`;
```

---

## 6. Arsitektur PDF Generation & Pemrosesan Gambar

### 6.1 Master Layout Visual PDF
- Menggunakan visual layout Laporan Perjalanan Dinas sebagai master style global (header logo BPS, tabel pelaksana, seksi deskripsi/resume, dan lampiran dokumentasi di bagian akhir).
- **Engine:** Server-side Node.js rendering menggunakan `pdf-lib` + `sharp`.

### 6.2 Image Processing Pipeline
1. Membaca dimensi & Exif orientation dari foto yang diunggah.
2. Mempertahankan aspect ratio asli (landscape/portrait). Dilarang melakukan stretching.
3. Downscaling jika dimensi melebihi resolusi maksimum yang aman untuk PDF (maksimal 1600px pada sisi terpanjang) dengan kualitas kompresi JPEG 80%.
4. File asli foto di Google Drive tidak ditimpa oleh file hasil downscaling.

---

## 7. Desain API Routes Target

| Route Handler | Method | Deskripsi & Validasi |
|---|---|---|
| `/api/auth/profile` | GET / POST | Mengambil & menyimpan profil `full_name`, `position`, `nip`. |
| `/api/auth/drive/connect` | GET | Menangani OAuth redirect Google Drive per-user. |
| `/api/activities` | GET / POST | Ambil daftar kegiatan & buat kegiatan baru (`DRAFT`). Cek collision `normalized_name`. |
| `/api/activities/[id]` | GET / PUT | Detail & Update kegiatan. Tolak ubah identitas jika status `GENERATED`. |
| `/api/activities/[id]/copy` | POST | Salin kegiatan (kosongkan tanggal, waktu, dokumentasi, PDF ID). |
| `/api/activities/[id]/force-change` | POST | Ganti Paksa identitas + rename folder/file di Drive + audit log. |
| `/api/activities/[id]/generate-pdf` | POST | Render PDF, upload ke Drive, set permission public link, ubah status ke `GENERATED`. Idempotent via `idempotency_key`. |
| `/api/activities/[id]/trash` | POST | Soft delete kegiatan (`status = TRASHED`, `deleted_at = NOW()`). |
| `/api/activities/[id]/restore` | POST | Restore kegiatan dari trash. |
| `/api/gemini/generate` | POST | AI narasi refiner dengan validasi server-side. |

---

## 8. Progressive Web App (PWA) & Offline Shell

- Service Worker meng-cache UI Shell (HTML, CSS, Static JS, Icons).
- Web Speech API digunakan untuk Speech-to-Text client-side.
- Jika jaringan offline, aplikasi menampilkan indikator "Offline Mode" dan menyimpan draft sementara di IndexedDB hingga koneksi pulih.

---

## 9. Alur Kerja Utama (Workflows)

```
[Buat Kegiatan] ──► Select Type (PD/Non-PD) ──► Fill Form ──► Check Collision ──► Status: DRAFT
                                                                                         │
[Tambahkan Dokumentasi] ◄── Speech / AI Refine ◄── Edit Description ◄────────────────────┘
          │
          ├──► Upload Foto (Maks 6/hari/kegiatan)
          │
          ▼
[Generate PDF] ──► Check Required Fields ──► Render PDF ──► Save to Drive ──► Set Public Link ──► Status: GENERATED (Fields Locked)
                                                                                                        │
                                                   ┌────────────────────────────────────────────────────┴──────────────────────────┐
                                                   ▼                                                                               ▼
                                         [Normal Edit: Isi Laporan]                                                      [Ganti Paksa / Force Change]
                                        (Locked: Name, Date, SPD)                                                        (Warning -> Collision Check ->
                                                                                                                          Rename Drive Folder/Files)
```

---

## 10. Strategi Migrasi Data dari System Existing

1. **Script SQL Migration:**
   - Memindahkan data dari `public.laporan` (Harian) ke `public.activities` dengan `activity_type = 'NON_PERJALANAN_DINAS'`.
   - Memindahkan data dari `public.laporan_penugasan` ke `public.activities` dengan `activity_type = 'PERJALANAN_DINAS'`.
   - Memindahkan foto dari `laporan_foto` dan `penugasan_foto` ke `activity_documents`.
2. **Backward Compatibility:**
   - Menyediakan fallback data mapper selama transisi tanpa merusak data historis pengguna.

---

*DESIGN.md telah selesai disusun dan siap untuk disetujui.*
