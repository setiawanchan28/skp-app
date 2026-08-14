# Product Requirements Document (PRD)

# Mamang Racing --- Pikiran Ngebut, Laporan Tetap Rapi.

**Dokumen:** Product Requirements Document\
**Status:** Baseline v1.0\
**Produk:** Mamang Racing\
**Target:** Pegawai BPS\
**Platform:** Progressive Web App (PWA)\
**Primary storage:** Google Drive milik masing-masing pengguna\
**Backend/data:** Supabase (metadata dan application state)\
**Deployment candidate:** Vercel\
**AI:** Gemini\
**Authentication:** Google Account

------------------------------------------------------------------------

## 1. Ringkasan Produk

Mamang Racing adalah aplikasi PWA untuk membantu pegawai BPS membuat
laporan kegiatan secara cepat, terstruktur, formal, dan terdokumentasi.

Konsep utamanya adalah menangkap aktivitas pengguna sedekat mungkin
dengan saat kegiatan terjadi. Pengguna dapat mengetik atau menggunakan
speech input untuk menceritakan kegiatan. Input tersebut dapat diperiksa
dan diedit terlebih dahulu, kemudian pengguna dapat meminta AI merapikan
deskripsi kegiatan menjadi narasi formal.

Aplikasi tidak menyerahkan pembuatan laporan kepada AI. AI hanya
membantu memahami dan merapikan input pengguna. Struktur, format, dan
pembuatan PDF dikendalikan oleh aplikasi berdasarkan template laporan
resmi.

File laporan dan dokumentasi disimpan pada Google Drive pengguna.
Supabase menyimpan metadata, state, dan referensi file, bukan menjadi
tempat utama penyimpanan file pengguna.

------------------------------------------------------------------------

## 2. Tujuan

### 2.1 Tujuan utama

1.  Mempercepat pembuatan laporan kegiatan.
2.  Mengurangi pekerjaan mengetik ulang narasi kegiatan.
3.  Mengubah catatan atau ucapan singkat menjadi deskripsi formal dan
    runtut.
4.  Menyatukan laporan dan dokumentasi dalam struktur Google Drive yang
    konsisten.
5.  Memungkinkan pengguna menghasilkan PDF resmi berdasarkan jenis
    kegiatan.
6.  Menjaga kepemilikan file tetap berada pada Google Drive pengguna.
7.  Menyediakan dashboard dan kalender untuk mengelola kegiatan pribadi.

### 2.2 Bukan tujuan

Mamang Racing bukan:

-   sistem manajemen kegiatan organisasi;
-   platform berbagi laporan antarpegawai;
-   repository file milik BPS;
-   sistem yang memungkinkan admin membaca laporan pribadi pengguna;
-   generator laporan bebas yang membiarkan AI menentukan format
    dokumen.

------------------------------------------------------------------------

## 3. Target Pengguna

### 3.1 Pengguna umum

Semua pegawai yang memiliki akun Google dan ingin menggunakan aplikasi
untuk membuat laporan kegiatan.

### 3.2 Admin

Admin hanya memiliki akses terhadap:

-   daftar/statistik pengguna;
-   statistik penggunaan aplikasi;
-   informasi operasional yang diperlukan untuk administrasi aplikasi.

Admin **tidak boleh** membaca isi laporan, dokumentasi, atau menghapus
file Google Drive milik pengguna.

------------------------------------------------------------------------

## 4. Prinsip Produk

1.  **User owns the files.** File laporan dan dokumentasi berada di
    Google Drive pengguna.
2.  **Database stores metadata, not user files.**
3.  **AI assists, user decides.**
4.  **Generate is explicit.** PDF dibuat ketika pengguna meminta.
5.  **Identity locks after first generation.**
6.  **Validation must be consistent.** Validasi client hanya untuk UX;
    server/database adalah enforcement.
7.  **Existing data must not be silently changed.**
8.  **Google Drive is the source of truth for generated files.**
9.  **No cross-user activity access.**
10. **Normal workflow favors delete-and-recreate over mass renaming.**

------------------------------------------------------------------------

## 5. Jenis Kegiatan

Setiap kegiatan memiliki tepat satu jenis:

1.  **Perjalanan Dinas (PD)**
2.  **Non-Perjalanan Dinas (Non-PD)**

Struktur laporan berbeda menurut jenis kegiatan, tetapi layout visual
mengikuti gaya laporan perjalanan dinas sebagai master.

### 5.1 Perjalanan Dinas

Contoh laporan menunjukkan bagian:

1.  Keterangan Pelaksana Perjalanan Dinas
2.  Keterangan Perjalanan Dinas
3.  Daftar Petugas yang Ditemui
4.  Resume Perjalanan Dinas
5.  Dokumentasi

Contoh sumber menunjukkan field Nama, Jabatan, NIP, Nama Kegiatan,
Tanggal Perjadin, Tempat Tujuan, Nomor Surat, dan Nomor SPD.
fileciteturn4file1L42-L75 Daftar orang yang ditemui menggunakan Nama
dan Jabatan. fileciteturn4file1L79-L92

### 5.2 Non-Perjalanan Dinas

Contoh laporan menunjukkan bagian identitas pegawai, keterangan
kegiatan, resume kegiatan, dan dokumentasi. Contoh juga menunjukkan
tanggal kegiatan dapat berupa rentang, misalnya 11--13 Juni 2026.
fileciteturn4file3L158-L182

Contoh lain menunjukkan resume dapat menampilkan jam mulai, jam selesai,
dan deskripsi kegiatan. fileciteturn4file5L221-L250

### 5.3 Dokumentasi

Dokumentasi merupakan section terakhir dalam laporan.
fileciteturn4file4L207-L210

------------------------------------------------------------------------

## 6. Model Kegiatan

Kegiatan bukan "resume harian". Satu record merepresentasikan **satu
kegiatan**.

Satu kegiatan dapat:

-   berlangsung satu hari;
-   berlangsung lebih dari satu hari;
-   memiliki beberapa dokumentasi;
-   memiliki dokumentasi pada tanggal berbeda;
-   memiliki lebih dari satu orang yang ditemui;
-   untuk PD, memiliki satu nomor SPD.

Contoh:

``` text
Kegiatan: Pelatihan Petugas
Tanggal: 11–13 Juni 2026

Dokumentasi:
11 Juni -> foto 1, 2
12 Juni -> foto 3, 4, 5
13 Juni -> foto 6
```

------------------------------------------------------------------------

## 7. Lifecycle Kegiatan

``` text
DRAFT
  |
  | user melengkapi data
  v
READY
  |
  | Generate PDF
  v
GENERATED
```

### DRAFT

Pengguna bebas mengubah seluruh field yang tersedia.

### READY

Data minimum terpenuhi dan kegiatan siap dibuatkan laporan.

### GENERATED

PDF pertama berhasil dibuat.

Setelah GENERATED:

**Locked:** - nama kegiatan; - tanggal mulai; - tanggal selesai; - waktu
mulai; - waktu selesai; - untuk PD: nomor SPD.

Field isi laporan tetap dapat diedit sesuai aturan.

------------------------------------------------------------------------

## 8. Pembuatan Kegiatan

Saat pengguna memilih "Buat Kegiatan":

1.  Pilih jenis kegiatan:
    -   Perjalanan Dinas
    -   Non-Perjalanan Dinas
2.  Sistem menampilkan form sesuai jenis.
3.  Pengguna mengisi data.
4.  Sistem melakukan validasi collision.
5.  Jika valid, kegiatan disimpan sebagai DRAFT.
6.  Pengguna dapat mengedit sebelum generate.

Saat pengguna memilih kegiatan yang sudah ada, sistem membuka mode edit.

------------------------------------------------------------------------

## 9. Copy Kegiatan

Fitur "Copy Kegiatan" tersedia untuk mempercepat pembuatan kegiatan
baru.

Data yang disalin:

-   jenis kegiatan;
-   field isi yang relevan;
-   orang yang ditemui;
-   struktur/resume yang dapat digunakan kembali.

Data yang **tidak disalin**:

-   dokumentasi;
-   tanggal;
-   waktu.

Tanggal dan waktu sengaja dikosongkan untuk memaksa pengguna memasukkan
identitas waktu kegiatan baru.

Nama kegiatan hasil copy tetap harus melalui validasi collision.

------------------------------------------------------------------------

## 10. Collision

Nama kegiatan tidak case-sensitive.

Contoh:

``` text
Rapat Koordinasi
rapat koordinasi
RAPAT KOORDINASI
```

dianggap collision untuk user yang sama pada konteks yang sama.

Jika collision terjadi:

> "Kegiatan dengan nama tersebut sudah ada. Silakan gunakan nama
> kegiatan yang berbeda."

Sistem menolak penyimpanan kegiatan baru sampai nama diperbaiki.

Untuk PD, nomor SPD adalah identifier penting dan satu nomor SPD hanya
mewakili satu tujuan/kegiatan pada satu record. Detail hubungan
antarpegawai dapat ditangani sesuai struktur existing system ketika
diintegrasikan.

------------------------------------------------------------------------

## 11. Multi-day Activity

Kegiatan dapat berlangsung lebih dari satu hari.

Field:

``` text
start_date
end_date
```

dengan rule:

``` text
end_date >= start_date
```

Jika hanya satu hari:

``` text
start_date = end_date
```

### Penamaan multi-day

Tanggal kegiatan untuk nama folder dan PDF menggunakan **hari pertama
kegiatan**.

Contoh:

``` text
11–13 Juni 2026
```

menjadi:

``` text
260611 - Pelatihan Petugas
```

Dokumentasi menggunakan tanggal sebenarnya ketika foto diambil.

------------------------------------------------------------------------

## 12. Dokumentasi

Tidak ada batas jumlah dokumentasi non-foto yang dipaksakan oleh produk,
selama masih memenuhi batas teknis Google Drive/API dan validasi
keamanan aplikasi.

Untuk **foto**, hard limit:

> **Maksimal 6 foto per kegiatan per hari.**

Empat foto per kegiatan per hari direkomendasikan sebagai jumlah optimal
untuk layout laporan, tetapi 6 adalah batas sistem.

Contoh kegiatan tiga hari:

``` text
11 Juni: maksimal 6 foto
12 Juni: maksimal 6 foto
13 Juni: maksimal 6 foto
```

------------------------------------------------------------------------

## 13. Image Processing

Foto pengguna tidak diasumsikan memiliki ukuran, orientasi, atau aspect
ratio yang seragam.

Sistem harus:

1.  membaca dimensi/orientasi;
2.  mempertahankan aspect ratio;
3.  melakukan resize/downscale jika diperlukan untuk layout PDF;
4.  tidak melakukan stretching;
5.  menangani portrait dan landscape;
6.  melakukan kompresi yang wajar untuk PDF;
7.  mempertahankan file asli di Google Drive jika diperlukan oleh
    workflow penyimpanan;
8.  menggunakan versi yang telah diproses hanya untuk rendering PDF bila
    arsitektur akhirnya memisahkan original dan derived asset.

Layout dokumentasi harus mampu menempatkan foto dengan ukuran yang
konsisten tanpa merusak proporsi.

------------------------------------------------------------------------

## 14. Google Drive

Aplikasi menggunakan Google Drive pengguna sebagai storage utama.

Aplikasi hanya boleh mengelola folder aplikasi.

Root folder:

``` text
Laporan Kegiatan
```

Struktur:

``` text
Laporan Kegiatan/
└── YYYY/
    └── MM/
        └── YYMMDD - Nama Kegiatan/
            ├── YYMMDD - Nama Kegiatan.pdf
            ├── YYMMDD - Nama Kegiatan - foto1.jpg
            ├── YYMMDD - Nama Kegiatan - foto2.jpg
            └── ...
```

Nama folder aplikasi dapat dikonfigurasi sebagai constant produk, tetapi
harus memiliki satu kesepakatan global.

Jika folder aplikasi belum ada:

> aplikasi membuatnya.

Aplikasi tidak boleh meminta akses ke seluruh isi Drive sebagai tujuan
normal. Scope akses harus dibatasi seminimal mungkin sesuai kemampuan
Google Drive API.

------------------------------------------------------------------------

## 15. Naming Convention

### Folder

``` text
YYMMDD - Nama Kegiatan
```

Tanggal adalah tanggal pertama kegiatan.

### PDF

``` text
YYMMDD - Nama Kegiatan.pdf
```

### Dokumentasi

``` text
YYMMDD - Nama Kegiatan - NamaAsliFile.ext
```

Tanggal dokumentasi mengikuti tanggal dokumentasi sebenarnya.

Nama asli file dipertahankan setelah prefix.

Karakter yang tidak aman untuk nama file harus dinormalisasi tanpa
menghilangkan informasi penting.

------------------------------------------------------------------------

## 16. Generate PDF

Generate PDF dilakukan **by request**.

Flow:

``` text
User klik Generate
        ↓
Validasi
        ↓
Render PDF
        ↓
Create/update PDF di Drive
        ↓
Set permission
        ↓
Return link
```

Generate pertama kali mengunci identity fields.

Generate berikutnya memperbarui file PDF yang sama, bukan membuat versi
baru.

Tidak dibuat:

``` text
report-v1.pdf
report-v2.pdf
report-final.pdf
```

------------------------------------------------------------------------

## 17. Permission PDF

Setelah PDF berhasil dibuat, sistem memberikan opsi:

-   Copy Link
-   Print

PDF laporan diatur:

> **Anyone with the link --- Viewer**

Tujuannya agar penerima link dapat membuka dan mencetak laporan.

Dokumentasi foto tidak otomatis dipublikasikan dengan permission
tersebut.

------------------------------------------------------------------------

## 18. Force Change

Setelah generate pertama:

normal edit tidak boleh mengubah identity fields.

Namun user dapat memilih:

> **Ganti Paksa**

Sistem menampilkan warning.

Normal recommendation:

> hapus kegiatan → buat kegiatan baru.

Jika user tetap memilih Ganti Paksa:

1.  validasi perubahan;
2.  cek collision;
3.  update metadata;
4.  rename resource Google Drive yang terdampak;
5.  update referensi Drive;
6.  verifikasi hasil;
7.  tampilkan status.

Ganti Paksa adalah **last resort**, bukan workflow utama.

------------------------------------------------------------------------

## 19. Delete / Restore

Delete kegiatan menggunakan soft delete.

Model:

``` text
ACTIVE
  ↓
TRASHED
```

Folder kegiatan dipindahkan ke folder sampah/arsip yang ditentukan
sistem, bukan langsung dihapus.

User memiliki opsi:

-   Restore
-   Delete Permanently

Tidak ada fitur memindahkan kegiatan secara manual ke folder lain.

Jika file PDF/dokumentasi ternyata tidak ditemukan di Drive:

> "File tidak ditemukan di Google Drive."

Sistem tidak membuat ulang file secara diam-diam.

Jika akses Drive hilang:

> "Aplikasi kehilangan akses ke Google Drive. Silakan autentikasi
> ulang."

------------------------------------------------------------------------

## 20. Dashboard

Pengguna dapat melihat kegiatan dalam dua mode:

### List / Dashboard

Menampilkan:

-   nama kegiatan;
-   jenis;
-   tanggal;
-   status;
-   status PDF;
-   indikator dokumentasi.

### Calendar

Menampilkan kegiatan berdasarkan rentang tanggal.

Satu kegiatan multi-day tampil pada rentang yang sesuai.

------------------------------------------------------------------------

## 21. Speech Input

Speech input adalah alat bantu, bukan sumber final data.

Flow:

``` text
User bicara
   ↓
Transcript
   ↓
User review/edit
   ↓
User memilih "Rapikan dengan AI"
   ↓
Gemini
   ↓
Draft narasi
   ↓
User review/edit
   ↓
Save
```

AI tidak langsung menyimpan hasil tanpa review pengguna.

------------------------------------------------------------------------

## 22. AI Rules

AI boleh:

-   memperbaiki tata bahasa;
-   menyusun kronologi;
-   menghilangkan pengulangan;
-   membuat bahasa formal;
-   memperjelas hubungan antaraktivitas;
-   menambahkan ungkapan normatif yang wajar bila konteks mendukung.

AI tidak boleh:

-   menciptakan fakta spesifik yang tidak diberikan;
-   mengarang nama orang;
-   mengarang jabatan;
-   mengarang waktu;
-   mengarang lokasi;
-   mengarang hasil kegiatan;
-   mengubah fakta pengguna secara diam-diam.

Prinsip:

> **AI may improve expression, but must not fabricate facts.**

AI hanya membantu mengisi **deskripsi/resume kegiatan**. AI tidak
menentukan layout atau menghasilkan PDF.

------------------------------------------------------------------------

## 23. Profil

Pada login pertama:

``` text
Nama Lengkap *
Jabatan *
NIP *
```

User wajib melengkapi data sebelum dapat menggunakan fitur laporan.

Profil dapat diedit melalui Profile Settings.

Akun Google tetap menjadi identitas autentikasi.

SSO BPS tidak digunakan karena tidak tersedia.

------------------------------------------------------------------------

## 24. Session

Continuous session digunakan selama sesi autentikasi masih valid.

Google Drive authorization dapat memiliki lifecycle berbeda dari session
aplikasi.

Jika authorization Drive kedaluwarsa/revoked:

-   jangan membuat storage baru;
-   minta user melakukan auth ulang;
-   setelah berhasil, lanjutkan operasi.

------------------------------------------------------------------------

## 25. Admin

Admin tidak memiliki kemampuan untuk:

-   membaca laporan pengguna;
-   membaca isi dokumentasi;
-   menghapus laporan;
-   menghapus file Drive pengguna.

Admin hanya melihat:

-   jumlah pengguna;
-   statistik penggunaan;
-   statistik kegiatan;
-   status operasional yang tidak mengungkap isi privat.

------------------------------------------------------------------------

## 26. PWA

Produk diimplementasikan sebagai PWA.

PWA dipilih karena:

-   dapat dibuka dari desktop maupun mobile;
-   mendukung pengalaman seperti aplikasi;
-   cocok untuk input kegiatan cepat;
-   mendukung speech input pada browser yang kompatibel;
-   dapat menyediakan caching UI dan shell aplikasi.

PWA tidak boleh dianggap sebagai offline-first penuh. Data yang
membutuhkan database, AI, Google Drive, dan PDF generation memerlukan
koneksi.

------------------------------------------------------------------------

## 27. Security Requirements

1.  Google OAuth token tidak boleh dikirim ke client selain token yang
    memang diperlukan oleh library resmi.
2.  Gemini API key tidak boleh berada di client.
3.  Semua authorization harus diverifikasi server-side.
4.  RLS Supabase harus aktif.
5.  User hanya boleh membaca/mengubah data miliknya.
6.  Admin tidak boleh bypass privacy boundary untuk membaca laporan.
7.  File ID Google Drive tidak boleh dianggap sebagai authorization.
8.  Semua input user harus divalidasi.
9.  Nama file/folder harus disanitasi.
10. Upload harus memvalidasi MIME type dan ukuran sesuai batas keamanan
    yang ditetapkan implementasi.
11. OAuth scope harus minimum.
12. Secret dan token tidak boleh masuk log.
13. Operasi Drive harus idempotent jika memungkinkan.
14. Generate PDF tidak boleh menghasilkan duplikasi karena retry.
15. Semua operasi sensitif harus memiliki audit timestamp.

------------------------------------------------------------------------

## 28. Success Criteria

Mamang Racing dianggap berhasil apabila:

-   user dapat login dengan Google;
-   user pertama kali melengkapi profil;
-   user dapat membuat PD dan Non-PD;
-   user dapat membuat kegiatan multi-day;
-   user dapat memasukkan dokumentasi per hari;
-   maksimal 6 foto/hari diterapkan;
-   user dapat speech input;
-   user dapat meminta AI merapikan deskripsi;
-   user dapat mengedit hasil AI;
-   PDF sesuai template;
-   PDF tersimpan di Google Drive user;
-   PDF dapat diperbarui tanpa membuat duplikat;
-   link PDF dapat dicopy;
-   PDF dapat dibuka oleh anyone with the link;
-   identity fields terkunci setelah generate;
-   Force Change berjalan dengan validasi;
-   kegiatan dapat soft delete/restore;
-   user tidak dapat melihat data user lain;
-   admin tidak dapat membaca laporan user;
-   aplikasi dapat digunakan sebagai PWA.

------------------------------------------------------------------------

## 29. Open Items untuk Tahap Engineering

Hal berikut tidak boleh ditebak dari PRD dan akan ditentukan pada
SRS/DESIGN atau saat audit existing system:

-   detail template PDF final;
-   PDF engine;
-   detail Google OAuth scopes;
-   mekanisme penyimpanan secret OAuth;
-   detail image processing library;
-   detail API endpoint;
-   detail existing-system integration;
-   detail migration dari existing database;
-   deployment configuration.
