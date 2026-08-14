# Technical Audit: Existing System Documentation

**Aplikasi:** System Bukti Dukung BPS (skp-app)\
**Status Document:** Comprehensive Baseline Audit (Step 4)\
**Audit Target:** Existing Codebase vs PRD.md, SRS.md, DATABASE.md\
**Strict Audit Tagging:** Every finding is categorized as **[CONFIRMED]** (empirically verified in code/file), **[INFERRED]** (logical deduction from existing code structure), or **[UNKNOWN]** (unclear/missing implementation).

---

## 1. Executive Summary & Overview

Existing codebase merupakan aplikasi Next.js (App Router v15.2.0) yang awalnya dikembangkan sebagai "Sistem Bukti Dukung BPS" untuk pengelolaan Laporan Harian Kerja dan Laporan Penugasan/Perjadin BPS. Sistem saat ini memiliki integrasi parsial ke Supabase, Google Drive, Gemini API, serta PDF/Docx generation.

---

## 2. Arsitektur Sistem (System Architecture)

- **[CONFIRMED]** Framework: Next.js 15.2.0 (React 19, TypeScript, App Router).
- **[CONFIRMED]** Client-side State Management: React useState, local state, serta Fallback Hybrid `localStorage` + Supabase DB + Server API Endpoint.
- **[CONFIRMED]** Primary File Storage (Existing): Google Drive (Service Account JWT atau OAuth2 Client ID global dengan fixed Refresh Token).
- **[CONFIRMED]** Secondary Storage / DB (Existing): Supabase PostgreSQL (`public.laporan`, `public.laporan_foto`, `public.laporan_penugasan`, `public.penugasan_petugas_ditemui`, `public.penugasan_foto`, `public.pegawai`, `public.monitoring_181`).
- **[INFERRED]** Arsitektur saat ini dirancang dengan gaya *hybrid-fallback*: Jika Supabase / Drive tidak dikonfigurasi, sistem berpindah secara otomatis ke `localStorage` / mock data tanpa menghentikan aplikasi.
- **[CONFIRMED]** Deployment Target: Vercel / Node server.

---

## 3. Frontend Architecture & Routing

- **[CONFIRMED]** Router Layout: Next.js App Router dengan Route Groups `(auth)` dan `(dashboard)`.
- **[CONFIRMED]** Pages Available:
  - `(auth)/login`: Form login NIP/Email + Password & Quick Demo Access.
  - `(dashboard)/page.tsx`: Dashboard Overview (Statistik Laporan, Quick Links).
  - `(dashboard)/laporan`: Halaman utama pengelolaan Laporan Harian.
  - `(dashboard)/penugasan`: Halaman pengelolaan Laporan Perjalanan Dinas / Penugasan.
  - `(dashboard)/kalender`: Tampilan Kalender kegiatan.
  - `(dashboard)/pegawai`: Master data Pegawai BPS.
  - `(dashboard)/pengaturan`: Profil pengguna & Pengaturan Aplikasi.
  - `(dashboard)/monitoring-181`: Halaman monitoring PPL & PML (Mon181).
- **[CONFIRMED]** Styling: Tailwind CSS v4.0.5 (`@tailwindcss/postcss`).
- **[CONFIRMED]** Icons: `lucide-react`.

---

## 4. Backend & API Routes

Semua API route bertempat di `src/app/api/`:
- **[CONFIRMED]** `api/gemini/generate/route.ts`: Endpoint POST untuk memanggil Gemini AI API guna merapikan poin kegiatan menjadi narasi formal BPS.
- **[CONFIRMED]** `api/pdf/generate/route.ts`: Endpoint POST untuk merender PDF (menggunakan `pdf-lib` / `docx` conversion) dan langsung mengupload hasilnya ke Google Drive.
- **[CONFIRMED]** `api/laporan/list/route.ts`: Endpoint GET mengambil data laporan.
- **[CONFIRMED]** `api/laporan/save-complete/route.ts`: Endpoint POST menyimpan laporan harian + foto.
- **[CONFIRMED]** `api/laporan/delete/route.ts`: Endpoint POST menghapus laporan harian + file terkait di Google Drive.
- **[CONFIRMED]** `api/penugasan/list/route.ts`, `save-complete/route.ts`, `delete/route.ts`: Endpoint CRUD untuk laporan perjalanan dinas.
- **[CONFIRMED]** `api/pegawai/list/route.ts`, `save/route.ts`: Endpoint CRUD master pegawai.
- **[CONFIRMED]** `api/status/route.ts`: Endpoint GET mengecek status koneksi Supabase & Google Drive.
- **[CONFIRMED]** `api/supabase-sync/route.ts`: Endpoint GET/POST untuk sinkronisasi data Supabase.
- **[CONFIRMED]** `api/monitoring-181/route.ts`: Endpoint upload dan parse file Excel monitoring.

---

## 5. Database Schema (Existing Supabase SQL)

- **[CONFIRMED]** Tabel Terdeteksi di `supabase/schema.sql`:
  - `public.pegawai`: (`id`, `user_id`, `nama`, `nip`, `jabatan`, `email`, `created_at`, `updated_at`).
  - `public.laporan`: (`id`, `user_id`, `pegawai_id`, `nama_pegawai`, `nip`, `jabatan`, `tanggal`, `tanggal_selesai`, `nama_kegiatan`, `deskripsi_kegiatan`, `ringkasan_kegiatan`, `kategori`, `drive_pdf_url`, `drive_pdf_file_id`, `drive_folder_id`, `created_at`, `updated_at`).
  - `public.laporan_foto`: (`id`, `laporan_id`, `drive_file_id`, `drive_file_url`, `file_name`, `tanggal_foto`, `created_at`).
  - `public.laporan_penugasan`: (`id`, `user_id`, `nama_pegawai`, `nip`, `jabatan`, `nama_kegiatan`, `tanggal_perjadin`, `tanggal_selesai_perjadin`, `tempat_tujuan`, `nomor_surat`, `nomor_spd`, `resume_kegiatan`, `drive_pdf_url`, `drive_pdf_file_id`, `drive_folder_id`, `created_at`, `updated_at`).
  - `public.penugasan_petugas_ditemui`: (`id`, `penugasan_id`, `no`, `nama`, `jabatan`, `created_at`).
  - `public.penugasan_foto`: (`id`, `penugasan_id`, `drive_file_id`, `drive_file_url`, `file_name`, `tanggal_foto`, `created_at`).
- **[CONFIRMED]** Tabel Terdeteksi di `supabase/monitoring_schema.sql`:
  - `public.monitoring_181`: (`id`, `type`, `file_name`, `total_rows`, `total_target`, `total_realisasi`, `overall_progres`, `parsed_data`, `uploaded_at`).

---

## 6. Autentikasi & Manajemen Sesi (Authentication & Session)

- **[CONFIRMED]** Autentikasi saat ini: Form login tradisional dengan email/NIP + password.
- **[CONFIRMED]** Jika Supabase Auth aktif dan input bertanda `@`, panggilan `supabase.auth.signInWithPassword` dilakukan.
- **[CONFIRMED]** Jika tidak, aplikasi mencocokkan NIP/Email dengan tabel master pegawai (`public.pegawai`) atau `localStorage.getItem('bps_saved_profile')`.
- **[CONFIRMED]** Sesi disimpan di `localStorage` dengan key `bps_auth_user` dan `bps_saved_profile`.
- **[CONFIRMED]** Belum ada integrasi Google OAuth per-user untuk Sign In (Google Account SSO) maupun untuk scope Google Drive per-user.

---

## 7. Integrasi Supabase

- **[CONFIRMED]** File konfigurasi: `src/lib/supabase.ts`.
- **[CONFIRMED]** Klien anonim (`supabase`) dan Klien Service Role (`supabaseAdmin`) diexpose.
- **[CONFIRMED]** Fungsi `isSupabaseConfigured()` memeriksa variabel lingkungan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **[CONFIRMED]** Aplikasi menggunakan `supabaseAdmin` di beberapa service/API route server-side untuk bypass RLS secara langsung.

---

## 8. Integrasi Google Drive

- **[CONFIRMED]** File integrasi: `src/lib/drive.ts`.
- **[CONFIRMED]** Menggunakan library `googleapis` (Drive v3).
- **[CONFIRMED]** Metode Otentikasi Drive saat ini:
  1. OAuth2 Client ID + Secret + Refresh Token global dari `.env` (`GOOGLE_REFRESH_TOKEN`).
  2. Fallback ke Service Account JWT (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`).
- **[CONFIRMED]** Struktur Folder Google Drive saat ini:
  `[GOOGLE_DRIVE_FOLDER_ID] / YYYY / Nama Bulan / Dokumentasi & PDF`
- **[CONFIRMED]** Izin Berbagi: `drive.permissions.create` dipanggil untuk setiap file upload dengan role `reader`, type `anyone`.
- **[CONFIRMED]** Terdapat modul sync cadangan: `bps_laporan_db.json` disimpan di root Google Drive jika Supabase/local gagal.

---

## 9. Generasi PDF & Penanganan Gambar

- **[CONFIRMED]** File PDF Generator: `src/lib/pdf.ts` (menggunakan `pdf-lib`) dan `src/lib/pdfPenugasan.ts`.
- **[CONFIRMED]** File Image Processing: `src/lib/image.ts` menggunakan HTML Canvas client-side untuk kompresi/resize gambar dasar.
- **[CONFIRMED]** Dependency server: `sharp` dan `browser-image-compression` terpasang di `package.json`.
- **[CONFIRMED]** Alur PDF Existing: PDF digenerate di server (`/api/pdf/generate`), di-convert dari HTML/Canvas atau dibangun dengan `pdf-lib`, lalu langsung di-upload ke folder PDF di Google Drive.

---

## 10. Logika Kegiatan / Laporan (Activity & Report Logic)

- **[CONFIRMED]** Sistem memisahkan dua entitas independen di database & UI:
  1. `Laporan Harian` (`laporan` & `laporan_foto`)
  2. `Laporan Penugasan / Perjadin` (`laporan_penugasan`, `penugasan_petugas_ditemui`, `penugasan_foto`)
- **[CONFIRMED]** Service `src/services/laporanService.ts` melakukan merge manual antara Laporan Harian dan Laporan Penugasan menjadi satu array saat `fetchLaporanList()` dipanggil.
- **[CONFIRMED]** Belum ada status lifecycle `DRAFT`, `READY`, `GENERATED`, `TRASHED` (hanya ada tanggal buat dan `drive_pdf_url`).
- **[CONFIRMED]** Belum ada penguncian field identitas (Locking identity fields) setelah generate PDF pertama.
- **[CONFIRMED]** Belum ada fitur "Copy Kegiatan" atau "Ganti Paksa (Force Change)".
- **[CONFIRMED]** Belum ada aturan pembatasan foto 6 foto/hari/kegiatan (foto diunggah tanpa batasan tanggal per foto yang ketat).
- **[CONFIRMED]** Belum ada pemeriksaan case-insensitive collision nama kegiatan per pengguna.

---

## 11. Keamanan & Row Level Security (RLS)

- **[CONFIRMED]** Pada `supabase/schema.sql`, RLS diaktifkan (`ENABLE ROW LEVEL SECURITY`) untuk 6 tabel utama.
- **[CONFIRMED]** Namun, **TIDAK ADA POLICY RLS** yang didefinisikan di `schema.sql` (hanya `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- **[CONFIRMED]** Sebaliknya, di `supabase/monitoring_schema.sql`, policy RLS `Allow public select/insert/delete` menggunakan `USING (true)` / `WITH CHECK (true)`.
- **[INFERRED]** Karena RLS diaktifkan tanpa Policy pada tabel `laporan` & `pegawai`, akses via Anon Key client-side akan terblokir total, sehingga aplikasi mengandalkan `supabaseAdmin` (Service Role Key) di API routes server-side.
- **[CONFIRMED]** Tidak ada isolasi data berbasis `auth.uid() = user_id` yang aktif di database RLS saat ini.

---

## 12. Reusable Components & Utilities

- **[CONFIRMED]** Components:
  - `src/components/layout/Navbar.tsx`, `Sidebar.tsx`, `MobileNav.tsx`: Layout navigasi utama.
  - `src/components/laporan/ReportForm.tsx`: Form input laporan harian + Speech-to-Text + Gemini AI call.
  - `src/components/penugasan/PenugasanForm.tsx`: Form input perjalanan dinas + Petugas ditemui.
  - `src/components/laporan/PhotoUploader.tsx`: Upload & preview foto dokumentasi.
  - `src/components/laporan/PDFPreviewModal.tsx`: Preview & cetak PDF modal.
  - `src/components/laporan/TemplateSelector.tsx`: Selector gaya template.
- **[CONFIRMED]** Utilities:
  - `src/utils/formatters.ts`: Formatter tanggal Indonesia & penanggalan BPS.
  - `src/utils/sanitizeFilename.ts`: Pembersihan nama file.
  - `src/utils/mon181Parser.ts`: Excel parser untuk monitoring 181.

---

## 13. File Penting & Fungsinya (File Inventory)

| Path File | Fungsi Utama | Status Existing |
|---|---|---|
| `docs/PRD.md` | Product Requirements Document (Target Spec) | Target Requirement |
| `docs/SRS.md` | Software Requirements Specification (Target Spec) | Target Requirement |
| `docs/DATABASE.md` | Database Schema Specification (Target Spec) | Target Requirement |
| `supabase/schema.sql` | Schema SQL Supabase lama (Terpisah 2 jenis laporan) | Existing Database |
| `src/lib/drive.ts` | Operasi Google Drive v3 (Service Account / Refresh Token global) | Existing Integration |
| `src/lib/gemini.ts` | Integrasi Gemini AI (`@google/generative-ai`) | Existing AI |
| `src/lib/pdf.ts` & `pdfPenugasan.ts` | Modul Pembuatan PDF (`pdf-lib`) | Existing PDF Engine |
| `src/lib/supabase.ts` | Inisialisasi Supabase Client & Admin Client | Existing Client |
| `src/services/laporanService.ts` | Fetch, Save, Delete Laporan Harian + Merge Penugasan | Existing Service |
| `src/services/penugasanService.ts` | Fetch, Save, Delete Penugasan/Perjadin | Existing Service |
| `src/services/pegawaiService.ts` | Management Master Pegawai | Existing Service |
| `src/components/laporan/ReportForm.tsx` | Form Laporan Harian & Integrasi Speech/Gemini | Existing Component |
| `src/components/penugasan/PenugasanForm.tsx` | Form Penugasan / Perjadin | Existing Component |
| `src/app/(auth)/login/page.tsx` | Halaman Login NIP/Email + Password | Existing Auth Page |
| `src/app/api/laporan/save-complete/route.ts` | Route handler simpan laporan harian + foto + drive | Existing API Route |

---

## 14. Konflik dengan Requirement Baru (PRD / SRS / DATABASE)

Below are the identified structural conflicts between the existing system and the target requirements:

1. **[CONFIRMED] Pemisahan Tabel vs Unified Model:**
   - *Existing:* Memisahkan `laporan` (Harian) dan `laporan_penugasan` (Perjadin) ke dalam tabel terpisah yang berbeda struktur.
   - *Requirement (DATABASE.md):* Menggunakan 1 tabel terpusat `activities` dengan ENUM `activity_type` (`PERJALANAN_DINAS` | `NON_PERJALANAN_DINAS`).

2. **[CONFIRMED] Struktur Storage Google Drive & Naming:**
   - *Existing:* `Root / YYYY / Nama Bulan / Dokumentasi & PDF` (misal `2026/Agustus/PDF/report.pdf`).
   - *Requirement (PRD/SRS):* `Laporan Kegiatan / YYYY / MM / YYMMDD - Nama Kegiatan / YYMMDD - Nama Kegiatan.pdf` dan `YYMMDD - Nama Kegiatan - NamaAsliFile.ext`.

3. **[CONFIRMED] Skema Autentikasi & Ownership:**
   - *Existing:* Custom Login NIP/Email + Password disimpan di `localStorage` `bps_auth_user`, Drive menggunakan 1 Google Refresh Token / Service Account terpusat milik admin.
   - *Requirement (PRD/SRS):* Autentikasi Google Account (Google OAuth SSO). File disimpan di **Google Drive milik masing-masing pengguna**, bukan Drive admin.

4. **[CONFIRMED] RLS & Keamanan Data:**
   - *Existing:* RLS di-enable di SQL tanpa policy (atau public `USING (true)`), bypass RLS menggunakan `supabaseAdmin` (Service Role Key).
   - *Requirement (DATABASE.md/SRS):* Strict RLS berbasis `auth.uid() = user_id` di semua tabel pengguna. Admin dilarang bypass privacy boundary untuk melihat isi laporan.

5. **[CONFIRMED] Batasan Foto (Photo Limits):**
   - *Existing:* Tidak ada pembatasan foto per hari (diunggah bebas).
   - *Requirement (PRD/SRS/DATABASE.md):* Maksimal **6 foto per kegiatan per tanggal dokumentasi**, divalidasi client, server, dan trigger database.

6. **[CONFIRMED] Multi-day Activity & Date Model:**
   - *Existing:* Laporan harian mayoritas 1 tanggal tunggal (`tanggal`), penugasan memiliki `tanggal_perjadin` dan `tanggal_selesai_perjadin`.
   - *Requirement:* `start_date`, `end_date`, `start_time`, `end_time` wajib ada pada setiap kegiatan.

7. **[CONFIRMED] System Features (Mon181 & Master Pegawai):**
   - *Existing:* Memiliki halaman `monitoring-181` dan `pegawai` (master pegawai).
   - *Requirement:* PRD/SRS memfokuskan aplikasi pada Laporan Kegiatan Pegawai (PD & Non-PD) dengan tabel `profiles` 1-to-1 dengan `auth.users`.

---

## 15. Kemampuan yang Belum Tersedia (Gaps Analysis)

- **[CONFIRMED]** Fitur **Copy Kegiatan**: Belum ada endpoint & UI untuk menduplikasi kegiatan dengan mengosongkan tanggal/waktu/dokumentasi.
- **[CONFIRMED]** Fitur **Force Change (Ganti Paksa)**: Belum ada mekanisme peringatan, validasi collision ulang, dan rename otomatis resource Google Drive setelah PDF ter-generate.
- **[CONFIRMED]** Status Lifecycle & Locking: Belum ada ENUM status `DRAFT`, `READY`, `GENERATED`, `TRASHED` serta penguncian field identitas pasca-generate pertama.
- **[CONFIRMED]** Fitur **Soft Delete & Restore**: Deletion saat ini menghapus permanent / mentrashed record tanpa tabel/state trash yang terstruktur dan fitur restore.
- **[CONFIRMED]** Case-insensitive Collision Check: Belum ada `normalized_name` dan partial unique index `uq_active_activity_name` di database.
- **[CONFIRMED]** Google Drive OAuth Per-User & Re-authorization handling: Belum ada tabel `drive_connections` & `drive_resources` untuk mencatat otorisasi dan ID file Drive pengguna secara terisolasi.
- **[CONFIRMED]** Single Master PDF Template: Existing system merender 2 gaya PDF berbeda. Requirement menentukan template Perjalanan Dinas sebagai master visual layout untuk seluruh jenis kegiatan.
- **[CONFIRMED]** Table `activity_generations` & Idempotency Key: Belum ada pelacakan riwayat dan pencegahan generasi PDF ganda.

---

*Audit dikirim dan didokumentasikan di `docs/EXISTING-SYSTEM.md` tanpa melakukan perubahan kode.*
