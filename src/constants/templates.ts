export interface ActivityTemplate {
  id: string;
  nama: string;
  kategori: string;
  deskripsiPlaceholder: string;
  ringkasanTemplate: string;
}

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    id: 'pelatihan',
    nama: 'Pelatihan Petugas Sakernas / Susenas',
    kategori: 'Pelatihan',
    deskripsiPlaceholder: '- Mengikuti briefing pelaksanaan pelatihan\n- Menyimak paparan materi konsep dan definisi\n- Mempraktikkan pengisian kuesioner\n- Melakukan evaluasi pemahaman materi',
    ringkasanTemplate: 'Melaksanakan pelatihan petugas survei dengan mempelajari konsep definisi, mekanisme tata cara pendataan lapangan, serta simulasi pengisian kuesioner guna menjamin kualitas data yang dihasilkan.',
  },
  {
    id: 'rapat',
    nama: 'Rapat Koordinasi Pembinaan Statistik Sektoral',
    kategori: 'Rapat',
    deskripsiPlaceholder: '- Pembukaan rapat oleh Kepala BPS\n- Pembahasan target indikator pembangunan daerah\n- Menyusun jadwal pelaksanaan bimbingan teknis\n- Merumuskan rekomendasi tindak lanjut',
    ringkasanTemplate: 'Mengikuti rapat koordinasi penyelenggaraan statistik sektoral bersama Organisasi Perangkat Daerah (OPD) untuk menyelaraskan metodologi, standar data, dan metadata statistik.',
  },
  {
    id: 'monitoring',
    nama: 'Monitoring Kualitas Pendataan Lapangan',
    kategori: 'Monitoring',
    deskripsiPlaceholder: '- Melakukan uji petik (re-interview) ke rumah tangga sampel\n- Mengidentifikasi kendala responden di lapangan\n- Memberikan arahan penyelesaian masalah teknis kepada petugas',
    ringkasanTemplate: 'Melaksanakan kegiatan monitoring dan pengawasan pendataan di lapangan untuk memastikan pelaksanaan pencacahan sesuai dengan Standar Operasional Prosedur (SOP) BPS.',
  },
  {
    id: 'supervisi',
    nama: 'Supervisi Lapangan Pendataan Survei',
    kategori: 'Supervisi',
    deskripsiPlaceholder: '- Mendampingi petugas pencacah di wilayah sampel\n- Melakukan validasi isian kuesioner digital/fisik\n- Memastikan kewilayahan pencacahan sesuai batas blok sensus',
    ringkasanTemplate: 'Melakukan supervisi langsung kepada petugas pencacah di lapangan untuk meminimalisir kesalahan non-sampling error dan menjaga ketepatan waktu pengumpulan data.',
  },
  {
    id: 'sosialisasi',
    nama: 'Sosialisasi Sensus / Survei BPS',
    kategori: 'Sosialisasi',
    deskripsiPlaceholder: '- Menyampaikan materi sosialisasi kepada jajaran Pemda / Kecamatan\n- Menjelaskan urgensi dan manfaat data bagi perencanaan pembangunan\n- Membuka sesi tanya jawab dan dukungan instansi terkait',
    ringkasanTemplate: 'Menyelenggarakan kegiatan sosialisasi survei/sensus BPS kepada jajaran stakeholder wilayah guna membangun komitmen dan koordinasi kelancaran pendataan.',
  },
  {
    id: 'evaluasi',
    nama: 'Evaluasi Pasca Pendataan Lapangan',
    kategori: 'Evaluasi',
    deskripsiPlaceholder: '- Mengompilasi laporan capaian progress pendataan\n- Menganalisis permasalahan teknis dan kendala lapangan\n- Menyusun rekomendasi perbaikan untuk tahapan/survei berikutnya',
    ringkasanTemplate: 'Mengikuti evaluasi pelaksanaan pendataan lapangan untuk menginventarisasi permasalahan teknis dan merumuskan langkah mitigasi peningkatan kualitas survei mendatang.',
  },
  {
    id: 'pengolahan',
    nama: 'Pengolahan dan Editing-Coding Kuesioner',
    kategori: 'Pengolahan Data',
    deskripsiPlaceholder: '- Memeriksa kelengkapan fisik kuesioner\n- Melakukan entri data pada aplikasi FASIH / web-entry\n- Melakukan verifikasi error list dan konsistensi antar variabel',
    ringkasanTemplate: 'Melakukan pengolahan data kuesioner survei melalui tahapan editing-coding dan verifikasi konsistensi isian untuk menghasilkan basis data siap analisis.',
  },
];
