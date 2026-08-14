# Change Specification Document (CHANGE-SPEC)

**Aplikasi:** Mamang Racing (skp-app)\
**Status:** Ready for Design & Implementation Planning (Step 5)\
**Referensi Utama:** `docs/PRD.md`, `docs/SRS.md`, `docs/DATABASE.md`, `docs/EXISTING-SYSTEM.md`

---

## 1. Summary of Strategy

Tujuan dari Change Specification ini adalah memetakan perbedaan antara **Existing System** (`docs/EXISTING-SYSTEM.md`) dan **Target Specification** (`PRD.md`, `SRS.md`, `DATABASE.md`) tanpa mengubah kode aplikasi terlebih dahulu.

Setiap modul, requirement, dan file diklasifikasikan menjadi:
- **REUSE**: Digunakan kembali tanpa perubahan signifikan.
- **MODIFY**: Diubah atau disesuaikan untuk memenuhi requirement baru.
- **REPLACE**: Diganti total dengan pendekatan/arsitektur baru.
- **NEW**: Komponen, tabel, atau fitur baru yang belum ada di existing system.
- **REMOVE**: Komponen atau fitur existing yang tidak relevan/out of scope.

---

## 2. Matrix Klasifikasi Perubahan

### 2.1 Autentikasi & Profil Pengguna

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| AUTH-001 | Google Account OAuth Login | **REPLACE** | `src/app/(auth)/login/page.tsx` | **Tinggi:** Mengganti NIP/Password login dengan Google OAuth. *Mitigasi:* Gunakan Supabase Auth Google Provider & Next.js middleware. |
| AUTH-002 | First Login Profile Complete | **NEW** | `src/app/(dashboard)/pengaturan/page.tsx` | **Sedang:** Pengguna wajib melengkapi `full_name`, `position`, `nip` saat pertama kali login. *Mitigasi:* Onboarding modal / redirect guard. |
| AUTH-003 | Profile Update | **MODIFY** | `src/app/(dashboard)/pengaturan/page.tsx`, `src/services/pegawaiService.ts` | **Rendah:** Mengubah target simpan dari local profile ke tabel `profiles` Supabase. |
| AUTH-004 | Continuous Session Management | **MODIFY** | `src/context/ThemeContext.tsx`, Supabase Auth Listener | **Rendah:** Menggunakan Supabase session listener secara native. |
| AUTH-005 | Google Drive Authorization per-User | **NEW** | `src/lib/drive.ts`, `src/app/api/auth/drive/route.ts` | **Tinggi:** Mengganti 1 refresh token global dengan otorisasi Drive per pengguna. *Mitigasi:* Simpan token terenkripsi di `drive_connections`. |

---

### 2.2 Model & Lifecycle Kegiatan (Activity Core)

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| ACT-001 | Unified Activity Type (`PERJALANAN_DINAS` & `NON_PERJALANAN_DINAS`) | **REPLACE** | `src/types/laporan.ts`, `src/types/penugasan.ts`, `src/services/laporanService.ts` | **Tinggi:** Menyatukan 2 entitas terpisah (`laporan` & `laporan_penugasan`) ke 1 model `activities`. *Mitigasi:* Skema database baru `activities` dengan ENUM `activity_type`. |
| ACT-002 | Required Name | **REUSE** | `src/components/laporan/ReportForm.tsx` | **Sangat Rendah:** Validasi nama kegiatan wajib diisi. |
| ACT-003 | Case-insensitive Name Collision | **NEW** | `supabase/schema.sql`, `src/services/laporanService.ts` | **Sedang:** Menambahkan kolom `normalized_name` dan partial unique index `uq_active_activity_name`. |
| ACT-004 | Date Range (`start_date`, `end_date`) | **MODIFY** | `src/components/laporan/ReportForm.tsx`, `src/types/laporan.ts` | **Rendah:** Mengubah `tanggal` & `tanggal_selesai` menjadi `start_date` dan `end_date` konsisten. |
| ACT-005 | Time Range (`start_time`, `end_time`) | **NEW** | `src/components/laporan/ReportForm.tsx`, `src/types/laporan.ts` | **Rendah:** Field jam mulai dan jam selesai untuk pen konteks waktu kegiatan. |
| ACT-006 - 008 | Lifecycle Status (`DRAFT`, `READY`, `GENERATED`, `TRASHED`) | **NEW** | `src/types/laporan.ts`, DB ENUM `activity_status` | **Sedang:** Pelacakan lifecycle status kegiatan. |

---

### 2.3 Perjalanan Dinas (PD) & Non-Perjalanan Dinas (Non-PD)

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| PD-001 - 006 | Perjadin Fields, Petugas Ditemui, Unique SPD | **MODIFY** | `src/components/penugasan/PenugasanForm.tsx`, `supabase/schema.sql` | **Sedang:** Memindahkan field perjadin (`destination`, `letter_number`, `spd_number`) dan tabel relasi `activity_people` ke model `activities`. |
| NPD-001 - 002 | Non-PD Multi-day Activity | **MODIFY** | `src/components/laporan/ReportForm.tsx` | **Rendah:** Mendukung kegiatan non-PD yang berlangsung lebih dari 1 hari. |

---

### 2.4 Fitur Kegiatan Spesial (Copy, Force Change, Soft Delete)

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| COPY-001 - 006 | Copy Kegiatan | **NEW** | `src/services/laporanService.ts`, UI Dashboard Action | **Rendah:** Menyalin data kegiatan tanpa menyalin tanggal, waktu, dokumentasi, dan PDF ID. |
| LOCK-001 - 004 | Identity Locking after First Generation | **NEW** | `src/components/laporan/ReportForm.tsx`, Server API Validation | **Sedang:** Mencegah pengubahan nama/tanggal/SPD setelah status `GENERATED` di server dan UI. |
| FORCE-001 - 008 | Ganti Paksa (Force Change) Workflow | **NEW** | `src/app/api/laporan/force-change/route.ts`, Modal Warning | **Tinggi:** Operasi khusus renaming folder/file Google Drive jika pengguna memaksakan ubah identitas. *Mitigasi:* Audit timestamp & validasi collision sebelum rename. |
| DEL-001 - 007 | Soft Delete, Restore & Permanent Delete | **NEW** | `src/services/laporanService.ts`, Trash View | **Sedang:** Memindahkan kegiatan ke status `TRASHED` (`deleted_at = NOW()`) tanpa langsung menghapus file di Drive. |

---

### 2.5 Dokumentasi & Image Processing

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| DOC-001 - 008 | Documentation Management | **MODIFY** | `src/components/laporan/PhotoUploader.tsx`, `src/services/laporanService.ts` | **Sedang:** Dokumentasi memiliki `documentation_date` independen. |
| DOC-004 - 006 | Photo Limit (Max 6 photos per activity per date) | **NEW** | `src/components/laporan/PhotoUploader.tsx`, DB Trigger `enforce_photo_limit()` | **Sedang:** Divalidasi di UI, Server API, dan PostgreSQL Trigger. |
| IMG-001 - 007 | Image Downscaling & Aspect Ratio Preserving | **MODIFY** | `src/lib/image.ts`, `src/lib/pdf.ts` | **Rendah:** Memastikan gambar tidak tersnap/stretched saat dirender ke PDF dan menggunakan resolusi aman. `sharp` digunakan di server. |

---

### 2.6 AI Assistant & Speech Input

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| AI-001 - 008 | Gemini AI Speech/Draft Refinement | **REUSE & MODIFY** | `src/lib/gemini.ts`, `src/app/api/gemini/generate/route.ts` | **Rendah:** Mempertahankan modul Gemini AI yang sudah ada. AI dilarang merekayasa fakta (nama, tanggal, tempat). |
| SPEECH-001 - 005 | Speech Input (Web Speech API) | **REUSE** | `src/components/laporan/ReportForm.tsx` | **Sangat Rendah:** Mempertahankan komponen Speech Input client-side existing. |

---

### 2.7 PDF Generation & Google Drive Storage

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| DRIVE-001 - 014 | Standard Drive Folder Structure | **REPLACE** | `src/lib/drive.ts` | **Tinggi:** Mengubah hirarki folder Drive dari `YYYY/Bulan/PDF` menjadi `Laporan Kegiatan / YYYY / MM / YYMMDD - Nama Kegiatan /`. |
| PDF-001 - 011 | PDF Master Layout (Perjadin style master) | **MODIFY** | `src/lib/pdf.ts`, `src/lib/pdfPenugasan.ts` | **Sedang:** Menggabungkan 2 engine PDF menjadi 1 engine PDF berbasis master style perjalanan dinas. |
| SHARE-001 - 003 | Public Link PDF ("Anyone with the link - Viewer") | **REUSE & MODIFY** | `src/lib/drive.ts` | **Rendah:** Memastikan link PDF dapat dibuka siapapun yang menerima link, sementara foto tetap privat. |

---

### 2.8 Database Schema & Security (RLS)

| Requirement ID | Deskripsi | Klasifikasi | File Existing Terdampak | Risk & Mitigation |
|---|---|---|---|---|
| DB-TABLES | Comprehensive Database Tables | **REPLACE** | `supabase/schema.sql` | **Tinggi:** Mengganti schema lama dengan 8 tabel standar (`profiles`, `activities`, `activity_people`, `activity_documents`, `drive_connections`, `drive_resources`, `activity_generations`, `activity_audit_log`). |
| PRIV-001 - 005 | Row Level Security (RLS) & User Isolation | **REPLACE** | `supabase/schema.sql` | **Tinggi:** Menerapkan RLS policy berbasis `auth.uid() = user_id` untuk isolasi total antar pengguna. Admin tidak bisa membaca isi laporan. |

---

### 2.9 Komponen & Fitur yang Dihapus (REMOVE)

| Komponen / Feature | Status | Alasan Penghapusan |
|---|---|---|
| `public.monitoring_181` & `/monitoring-181` | **REMOVE** | Fitur Monitoring Mon181 berada di luar scope PRD/SRS Mamang Racing. |
| `public.pegawai` (Master Pegawai Admin) | **REMOVE** | Digantikan oleh tabel `profiles` 1-to-1 dengan Google Auth (`auth.users`). |
| LocalStorage DB Sync Fallback (`bps_laporan_db.json`) | **REMOVE** | Keamanan dan konsistensi data mengharuskan Supabase + Google Drive user sebagai storage utama. |

---

## 3. Matriks Risiko Perubahan & Mitigasi Utama

1. **Risiko Otorisasi Google Drive Per-User:**
   - *Risiko:* Sesi Google Refresh Token kedaluwarsa atau di-revoke oleh pengguna.
   - *Mitigasi:* Implementasikan status `REAUTH_REQUIRED` pada `drive_connections`. Tampilkan pemberitahuan ramah pengguna tanpa membuat tree folder baru secara diam-diam.
2. **Risiko Migrasi Data Existing:**
   - *Risiko:* Format tabel lama (`laporan` & `laporan_penugasan`) terpisah.
   - *Mitigasi:* Buat script migrasi SQL untuk memindahkan data dari tabel lama ke tabel `activities` terpadu jika diperlukan.
3. **Risiko Perubahan Nama Folder Google Drive (Force Change):**
   - *Risiko:* Perubahan nama kegiatan pada status `GENERATED` dapat memutuskan tautan Drive.
   - *Mitigasi:* Validasi collision dan lakukan rename atomik di server side + catat di `activity_audit_log`.

---

*CHANGE-SPEC.md telah dibuat dan siap untuk direview sebelum melanjutkan ke tahap DESIGN.md.*
