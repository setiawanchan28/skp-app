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

  let paragraphTarget = '1 hingga 3 paragraf naratif komprehensif';
  if (jumlahParagraf === '1') {
    paragraphTarget = 'TEPAT 1 PARAGRAF UTUH';
  } else if (jumlahParagraf === '2') {
    paragraphTarget = 'TEPAT 2 PARAGRAF';
  } else if (jumlahParagraf === '3') {
    paragraphTarget = 'TEPAT 3 PARAGRAF COMPREHENSIVE (dipisahkan oleh dua kali perpindahan baris)';
  }

  const prompt = `Anda adalah asisten penulis laporan kegiatan kedinasan Badan Pusat Statistik (BPS) yang sangat profesional. Tugas Anda adalah menyusun ulang catatan/poin kasar dari pengguna menjadi sebuah narasi laporan kegiatan yang ALAMI, ELEGAN, LUGAS, BERSIH DARI KALIMAT KAKU/BOT, dan SANGAT AKURAT.

CONTOH NARASI LUGAS DAN BAGUS (STANDAR GOLDEN BPS):
---
Contoh Input:
Nama Kegiatan: supervisi pelaksanaan Sensus Ekonomi 2026 ke kecamatan kalanganyar
Catatan Input: Desa Cilangkap, ketemu PML Dian Lidiawati & PPL Srirahayu. Memonitor capaian pendataan & evaluasi kendala. Fokus penelusuran kembali usaha pertanian tidak ditemukan. Evaluasi progres & kendala usaha lain. Arahan tindak lanjut hasil penelusuran & kunjungan ulang. Pendampingan PML ke PPL jaga kualitas data.

Contoh Hasil Terbaik yang Diharapkan:
Kegiatan supervisi pelaksanaan Sensus Ekonomi 2026 dilaksanakan di Desa Cilangkap, Kecamatan Kalanganyar, dengan bertemu Petugas Pemeriksa Lapangan (PML) Dian Lidiawati dan Petugas Pencacah Lapangan (PPL) Srirahayu. Supervisi dilakukan untuk memonitor perkembangan capaian pendataan, mengevaluasi pelaksanaan di lapangan, serta mengidentifikasi berbagai kendala yang masih dihadapi petugas dalam menyelesaikan target pendataan.

Salah satu fokus kegiatan adalah melakukan penelusuran kembali terhadap usaha pertanian yang sebelumnya berstatus tidak ditemukan. Penelusuran dilakukan untuk memastikan keberadaan usaha tersebut di lapangan dan mengupayakan agar usaha pertanian yang masih menjadi cakupan pendataan dapat ditemukan dan didata sesuai kondisi sebenarnya. Selain itu, dilakukan evaluasi terhadap progres pendataan usaha lainnya serta pembahasan kendala yang menyebabkan beberapa usaha belum dapat diselesaikan.

Dari hasil supervisi, PML dan PPL diarahkan untuk segera menindaklanjuti hasil penelusuran, meningkatkan koordinasi, serta melakukan kunjungan ulang terhadap usaha yang belum berhasil ditemui. Berbagai kendala yang ditemukan dibahas bersama untuk mendapatkan solusi yang dapat diterapkan di lapangan. PML diharapkan terus memberikan pendampingan kepada PPL agar proses pendataan dapat dipercepat, seluruh usaha dalam cakupan dapat ditemukan, dan target Sensus Ekonomi 2026 dapat tercapai dengan tetap menjaga kualitas data.
---

ATURAN WAJIB PENULISAN:
1. ATURAN UTAMA - TANPA MENGARANG (DILARANG HALUSINASI): Gunakan HANYA fakta & rincian yang ada pada catatan input pengguna. Jika input pendek/sederhana (misal: "mencetak peta wilkerstat untuk susenas 2026"), buatlah narasi yang ringkas dan padat fokus pada pencetakan peta tersebut tanpa menambah-nambah kegiatan lain (seperti kuesioner/lapangan) yang tidak ada di input!
2. GAYA BAHASA ALAMI & BERKELAS: Ikuti gaya bahasa pada Contoh Standar Golden di atas. BEBAS dari pembukaan robotik klise (misal DILARANG: "Dalam rangka mendukung keandalan pelaksanaan tugas kedinasan...").
3. KATA BAKU & PERBAIKAN EYD: Ubah kata non-formal/singkatan (misal: "yg", "dgn", "utk", "bikin", "ngecek") menjadi kata baku Bahasa Indonesia (EYD/PUEBI). Pertahankan singkatan resmi BPS seperti BPS, PML, PPL, Wilkerstat, Susenas, SE2026, dll.
4. STRUKTUR: Tuliskan dalam ${paragraphTarget} secara rapi tanpa tanda bintang (*) atau format list.
5. HASIL LANGSUNG: DILARANG memberikan kata pembuka/penutup seperti "Berikut hasilnya:". Langsung berikan teks narasi siap pakai.

INPUT PENGGUNA UNTUK DISUSUN:
Nama Kegiatan: ${cleanNamaKegiatan}
Rincian Catatan Input:
${cleanDeskripsiKegiatan || cleanNamaKegiatan}`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeCustomParagraphNarrative(cleanNamaKegiatan, cleanDeskripsiKegiatan, jumlahParagraf, modePanjang);
    }

    // Fast Direct REST API with 6s Timeout to guarantee instant response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
        if (rawText && rawText.trim().length > 10) {
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

      if (text && text.trim().length > 10) {
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
  const cleanDeskripsi = normalizeNonBakuToBaku(deskripsiKegiatan).trim();
  const cleanNama = normalizeNonBakuToBaku(namaKegiatan).trim();

  const lines = cleanDeskripsi
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 0);

  if (lines.length > 1) {
    const p1 = `Kegiatan ${cleanNama} telah dilaksanakan di lokasi target. Rangkaian pelaksanaan diawali dengan ${lines[0]}.`;
    const p2 = lines.slice(1).map((l) => `Selanjutnya, ${l.charAt(0).toLowerCase() + l.slice(1)}.`).join(' ');
    const p3 = `Seluruh hasil kegiatan diselesaikan secara cermat dan dilaporkan secara berkala guna mendukung keandalan data statistik Badan Pusat Statistik Kabupaten Lebak.`;
    return `${p1}\n\n${p2}\n\n${p3}`;
  }

  let detail = cleanDeskripsi || cleanNama;
  if (detail.toLowerCase().startsWith('mencetak')) {
    detail = `pelaksanaan ` + detail.charAt(0).toLowerCase() + detail.slice(1);
  }

  let text = `Kegiatan ${cleanNama} telah dilaksanakan dengan baik. Fokus utama pelaksanaan meliputi ${detail}. Seluruh tahapan pekerjaan diselesaikan secara tertib dan tepat waktu sesuai standar operasional yang berlaku di Badan Pusat Statistik Kabupaten Lebak.`;

  return normalizeNonBakuToBaku(text).replace(/\*/g, '').replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
}
