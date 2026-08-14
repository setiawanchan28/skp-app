import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

/**
 * Normalizes informal / non-baku everyday Indonesian words, abbreviations, and common typos
 * into formal Baku Indonesian words suitable for BPS official government documents.
 */
function normalizeNonBakuToBaku(text: string): string {
  if (!text) return '';

  const dict: [RegExp, string][] = [
    // Common Informal Words & Verbs
    [/\bbikin\b/gi, 'membuat'],
    [/\bngelakuin\b/gi, 'melaksanakan'],
    [/\bngelakuinnya\b/gi, 'pelaksanaannya'],
    [/\bnemuin\b/gi, 'menemui'],
    [/\bnemuinnya\b/gi, 'pertemuannya'],
    [/\bketemu\b/gi, 'menemui'],
    [/\bmeriksa\b/gi, 'memeriksa'],
    [/\bngecek\b/gi, 'memeriksa'],
    [/\bcek\b/gi, 'memeriksa'],
    [/\bngerjain\b/gi, 'mengerjakan'],
    [/\bngerjainnya\b/gi, 'pengerjaannya'],
    [/\bngabisin\b/gi, 'menyelesaikan'],
    [/\bngolah\b/gi, 'mengolah'],
    [/\bngisi\b/gi, 'mengisi'],
    [/\bngumpulin\b/gi, 'mengumpulkan'],
    [/\bngatur\b/gi, 'mengatur'],
    [/\bngawasin\b/gi, 'mengawasi'],
    [/\bngarahin\b/gi, 'mengarahkan'],
    [/\bnyusun\b/gi, 'menyusun'],
    [/\bnyiapin\b/gi, 'menyiapkan'],
    [/\bnyelesaiin\b/gi, 'menyelesaikan'],
    [/\bnyampe\b/gi, 'sampai'],
    [/\bngobrol sama\b/gi, 'berkoordinasi dengan'],
    [/\bngobrol dgn\b/gi, 'berkoordinasi dengan'],
    [/\bturun lapangan\b/gi, 'melaksanakan monitoring lapangan'],
    [/\brapat via zoom\b/gi, 'mengikuti rapat secara daring melalui Zoom'],
    [/\brapat zoom\b/gi, 'mengikuti rapat secara daring melalui Zoom'],

    // Informal Abbreviations
    [/\byg\b/gi, 'yang'],
    [/\bdgn\b/gi, 'dengan'],
    [/\butk\b/gi, 'untuk'],
    [/\bblm\b/gi, 'belum'],
    [/\bsbg\b/gi, 'sebagai'],
    [/\bkrn\b/gi, 'karena'],
    [/\btdk\b/gi, 'tidak'],
    [/\bdr\b/gi, 'dari'],
    [/\bsampe\b/gi, 'hingga'],
    [/\bbiar\b/gi, 'agar'],
    [/\bbuat\b/gi, 'untuk'],
    [/\blagi\b/gi, 'sedang'],
    [/\budah\b/gi, 'telah'],
    [/\btiap\b/gi, 'setiap'],
    [/\bgimana\b/gi, 'bagaimana'],
    [/\bkenapa\b/gi, 'mengapa'],
    [/\benggak\b|\bnggak\b|\bgak\b/gi, 'tidak'],
    [/\bbanget\b/gi, 'sangat'],
    [/\bcuma\b/gi, 'hanya'],
    [/\bkalo\b|\bkalau\b/gi, 'apabila'],
    [/\bcoba\b/gi, 'upaya'],
    [/\bsemua\b/gi, 'seluruh'],
    [/\borang\b/gi, 'petugas'],

    // Spacing & Prefix Correction Rules
    [/\bdi data\b/gi, 'didata'],
    [/\bdi lakukan\b/gi, 'dilakukan'],
    [/\bmeng koordinasikan\b/gi, 'mengoordinasikan'],
    [/\bmonitoring evaluasi\b/gi, 'monitoring dan evaluasi'],
  ];

  let result = text;
  for (const [regex, replacement] of dict) {
    result = result.replace(regex, replacement);
  }

  // Clean up any double dots or broken punctuation resulting from replacements
  result = result.replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
  return result;
}

export async function generateBpsSummary(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  namaPegawai?: string,
  jumlahParagraf: string = 'auto',
  modePanjang: string = 'panjang'
): Promise<string> {
  const cleanNamaKegiatan = normalizeNonBakuToBaku(namaKegiatan);
  const cleanDeskripsiKegiatan = normalizeNonBakuToBaku(deskripsiKegiatan);

  let paragraphInstruction = 'Tulis ringkasan naratif secara proporsional (1-3 paragraf jika materi cukup panjang).';
  if (jumlahParagraf === '1') {
    paragraphInstruction = 'Wajib tuliskan ringkasan naratif dalam TEPAT 1 PARAGRAF UTUH.';
  } else if (jumlahParagraf === '2') {
    paragraphInstruction = 'Wajib bagi ringkasan naratif menjadi TEPAT 2 PARAGRAF RAPI yang terpisah oleh dua kali perpindahan baris (line break).';
  } else if (jumlahParagraf === '3') {
    paragraphInstruction = `WAJIB SUSUN DALAM TEPAT 3 PARAGRAF COMPREHENSIVE, DETAIL, DAN PANJANG (minimal 4-6 kalimat kaya per paragraf). 
Pembagian isi 3 paragraf:
- PARAGRAF 1: Penjelasan rinci latar belakang, maksud & tujuan kegiatan, lokasi pendataan (Desa/Kecamatan/Blok Sensus), koordinasi awal, serta komposisi tim/petugas yang terlibat.
- PARAGRAF 2: Uraian mendalam alur teknis verifikasi kuesioner digital/fisik, pengawasan pencacahan, pendampingan sampel, evaluasi anomali data di lapangan, dan pencapaian target harian.
- PARAGRAF 3: Tindakan korektif yang diambil, rekomendasi perbaikan kualitas data, dampaknya terhadap keakuratan statistik BPS Kabupaten Lebak, serta penyelesaian kegiatan secara tuntas.`;
  }

  let lengthInstruction = 'Tuliskan deskripsi narasi yang SANGAT DETAIL, LENGKAP, TERDOKUMENTASI DENGAN BAIK, DAN PANJANG (uraikan setiap poin kegiatan secara mendalam mulai dari persiapan, proses verifikasi, koordinasi lapangan, hingga jaminan mutu statistik).';
  if (modePanjang === 'pendek') {
    lengthInstruction = 'Tuliskan deskripsi narasi yang RINGKAS, PADAT, DAN STRUKTURAL (1-2 kalimat fokus pada inti hasil kegiatan).';
  }

  const prompt = `Anda adalah "Editor Bahasa Indonesia untuk Dokumen Kedinasan" pada Badan Pusat Statistik (BPS).
Tugas utama Anda adalah **MENYUSUN DAN MEMPARAFRASEKAN CATATAN KEGIATAN MENJADI NARASI LAPORAN KEDINASAN RESMI BERBAHASA INDONESIA BAKU, FORMAL, PROFESIONAL, OBJEKTIF, DAN EFEKTIF**.

INFORMASI INPUT PENGGUNA:
- Nama Kegiatan: ${cleanNamaKegiatan}
- Catatan Poin Kegiatan Input:
${cleanDeskripsiKegiatan}

PANDUAN & ATURAN PENULISAN KEDINASAN (STRICT RULES):
1. BAHASA BAKU & FORMAL: Secara otomatis ubah bahasa percakapan, kata tidak baku, singkatan informal (yg, dgn, utk, blm, sbg, krn, tdk, dr, gak, udah), atau kalimat tidak lengkap menjadi Bahasa Indonesia yang baku, formal, dan sesuai Pedoman Umum Ejaan Bahasa Indonesia (PUEBI).
2. DILARANG KERAS MENGULANG-ULANG KALIMAT ATAU NAMA KEGIATAN (NO REPETITIVE SENTENCES / NO DUPLICATION). Tuliskan setiap informasi HANYA SATU KALI dengan alur cerita yang logis dan mengalir.
3. PERTAHANKAN SINGKATAN RESMI BPS:
   - BPS = Badan Pusat Statistik
   - PML = Pengawas Lapangan
   - PPL = Petugas Pendataan Lapangan
   - SE2026 = Sensus Ekonomi 2026
   - SLS = Satuan Lingkungan Setempat
   Pertahankan istilah resmi dan jangan mengubah singkatan resmi yang sudah umum secara tidak perlu.
4. KAPITALISASI & EJAAN PUEBI: Gunakan huruf kapital untuk nama instansi, wilayah (Desa/Kecamatan/Kabupaten), nama orang, nama program, dan singkatan resmi (Contoh: "Badan Pusat Statistik Kabupaten Lebak", "Desa Cilangkap", "Kecamatan Kalanganyar").
5. JANGAN MENGARANG (DILARANG HALUSINASI): HANYA gunakan informasi yang diberikan oleh pengguna. DILARANG KERAS mengarang nama orang, tanggal, lokasi, angka, hasil kegiatan, atau kesimpulan yang tidak terdapat pada input.
6. GAYA HASIL & KATA KERJA AKTIF: Awali paragraf dengan Kata Kerja Aktif Formal (seperti "Melaksanakan...", "Mengikuti...", "Melakukan...", "Mengolah...", "Menyusun...", "Memeriksa...", "Mengoordinasikan...", "Mendampingi...").
7. DILARANG MENGGUNAKAN SIMBOL BINTANG (*) ATAU MARKDOWN BOLD/ITALIC. Tuliskan istilah asing secara polos tanpa tanda bintang (Contoh: tulis Coverage, BUKAN *Coverage*).
8. HASIL LANGSUNG: DILARANG memberikan kata pembuka/penutup seperti "Berikut hasilnya:", "Sebagai AI...", "Berikut narasi...". Langsung hasilkan teks narasi siap pakai yang dapat langsung ditempel ke dokumen laporan kedinasan.
9. PANJANG & PARAGRAF: ${lengthInstruction} ${paragraphInstruction}`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeCustomParagraphNarrative(cleanNamaKegiatan, cleanDeskripsiKegiatan, jumlahParagraf, modePanjang);
    }

    // Fast Direct REST API with 5s Timeout to guarantee instant response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const restRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (restRes.ok) {
        const json = await restRes.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && rawText.trim().length > 20) {
          let clean = rawText.replace(/^(berikut adalah|berikut ringkasan|berikut narasi|berikut hasilnya|sebagai ai)[^:\n]*[:\n]\s*/i, '').trim();
          clean = clean.replace(/^"|"$/g, '').trim();
          clean = clean.replace(/\*/g, '').trim();
          return clean;
        }
      }
    } catch (restErr) {
      clearTimeout(timeoutId);
    }

    // SDK Fallback with fast single call
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      if (text && text.trim().length > 20) {
        text = text.replace(/^(berikut adalah|berikut ringkasan|berikut narasi|berikut hasilnya|sebagai ai)[^:\n]*[:\n]\s*/i, '').trim();
        text = text.replace(/^"|"$/g, '').trim();
        text = text.replace(/\*/g, '').trim();
        return text;
      }
    } catch (e) {}

    return composeCustomParagraphNarrative(cleanNamaKegiatan, cleanDeskripsiKegiatan, jumlahParagraf, modePanjang);
  } catch (error) {
    console.warn('Gemini API error, using custom narrative composer:', error);
    return composeCustomParagraphNarrative(cleanNamaKegiatan, cleanDeskripsiKegiatan, jumlahParagraf, modePanjang);
  }
}

/**
 * Custom Paragraph Offline Narrative Composer (Fast, Clean & Non-repetitive)
 */
function composeCustomParagraphNarrative(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  jumlahParagraf: string,
  modePanjang: string = 'panjang'
): string {
  const cleanDeskripsi = normalizeNonBakuToBaku(deskripsiKegiatan);
  const rawLines = cleanDeskripsi
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  // Remove duplicate lines or lines that just duplicate the activity title
  const lines = Array.from(
    new Set(
      rawLines.filter((line) => {
        const lowerLine = line.toLowerCase().trim();
        const lowerName = namaKegiatan.toLowerCase().trim();
        if (lowerLine === lowerName) return false;
        if (lowerLine.startsWith('melaksanakan kegiatan') && lowerLine.includes(lowerName)) return false;
        return true;
      })
    )
  );

  if (lines.length === 0) {
    return `Melaksanakan kegiatan ${namaKegiatan} sesuai petunjuk teknis dan standar operasional prosedur yang berlaku di lingkungan Badan Pusat Statistik Kabupaten Lebak.`;
  }

  let locations: string[] = [];
  let personnel: string[] = [];
  let actions: string[] = [];

  const datePattern = /(\d{1,2}\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|\d{1,2})\s+\d{2,4})|(\d{4}-\d{2}-\d{2})/i;

  for (const line of lines) {
    if (datePattern.test(line)) continue;
    const lower = line.toLowerCase();
    const isActionVerb = /^(mendampingi|melakukan|memastikan|menyampaikan|memeriksa|membahas|mengikuti|menyusun|mengolah|memandu|melaksanakan|mengevaluasi|mengoordinasikan)/i.test(line);

    if (isActionVerb) {
      actions.push(line);
    } else if (lower.startsWith('desa ') || lower.startsWith('kecamatan ') || lower.startsWith('kelurahan ') || lower.startsWith('blok sensus') || lower.startsWith('bs ') || lower.startsWith('wilayah ')) {
      locations.push(line);
    } else if (lower.startsWith('pml') || lower.startsWith('ppl') || lower.startsWith('koordinator') || lower.startsWith('tim ') || lower.startsWith('oleh ')) {
      personnel.push(line);
    } else {
      actions.push(line);
    }
  }

  // Deduplicate items
  locations = Array.from(new Set(locations));
  personnel = Array.from(new Set(personnel));

  // Filter actions so they don't repeat the activity title
  const cleanActions = Array.from(
    new Set(
      actions.filter((a) => {
        const lowerA = a.toLowerCase();
        const lowerName = namaKegiatan.toLowerCase();
        if (lowerA.includes(lowerName)) return false;
        return true;
      })
    )
  );

  let p1 = `Melaksanakan kegiatan ${namaKegiatan}`;
  if (locations.length > 0) p1 += ` di lokasi ${locations.join(', ')}`;
  if (personnel.length > 0) p1 += ` bersama ${personnel.join(' serta ')}`;
  p1 += `. `;

  if (cleanActions.length > 0) {
    const formatted = cleanActions.map((a) => a.charAt(0).toLowerCase() + a.slice(1));
    p1 += `Rangkaian pelaksanaan tugas berfokus pada ${formatted.join(', ')}.`;
  } else {
    p1 += `Pelaksanaan tugas berfokus pada verifikasi isian kuesioner dan pemantauan kualitas data di lapangan.`;
  }

  if (modePanjang === 'panjang' || jumlahParagraf === '3') {
    p1 += ` Kegiatan diawali dengan pengarahan teknis bersama tim kerja guna menyamakan persepsi operasional dan memastikan kelengkapan seluruh instrumen pendataan sesuai standar operasional Badan Pusat Statistik.`;
  }

  let resultText = p1;

  if (jumlahParagraf === '2' || (jumlahParagraf === 'auto' && modePanjang === 'panjang')) {
    const p2 = `Melalui kegiatan ini, koordinasi teknis serta pemeriksaan konsistensi data statistik terus ditingkatkan secara intensif. Hal ini dilakukan guna mengidentifikasi dan meminimalkan error pendataan sejak dini, sehingga menjamin keakuratan serta mutu data statistik yang dihasilkan secara berkelanjutan di Kabupaten Lebak.`;
    resultText = `${p1}\n\n${p2}`;
  } else if (jumlahParagraf === '3') {
    const p2 = `Selama pelaksanaan di lapangan, pemeriksaan dilakukan secara mendalam dan sistematis guna memverifikasi keabsahan isian serta mendeteksi anomali data secara langsung bersama petugas pencacah. Rangkaian validasi ini mencakup pengecekan kelengkapan variabel utama, konsistensi antar-blok pertanyaan, hingga kepatuhan terhadap SOP pendataan yang berlaku di wilayah sampel.`;
    const p3 = `Langkah konkret tersebut diambil guna meminimalkan nonsampling error, menjaga tingkat integritas data statistik, serta memastikan seluruh alur operasional kegiatan harian di wilayah Badan Pusat Statistik Kabupaten Lebak memenuhi indikator kinerja utama yang telah ditetapkan secara tuntas dan proporsional.`;
    resultText = `${p1}\n\n${p2}\n\n${p3}`;
  }

  // Strip accidental asterisks, double punctuation, and cleanup
  let finalResult = normalizeNonBakuToBaku(resultText).replace(/\*/g, '');
  finalResult = finalResult.replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
  return finalResult;
}
