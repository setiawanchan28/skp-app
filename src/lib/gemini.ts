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

  const prompt = `Anda adalah asisten penulis laporan kegiatan kedinasan BPS yang profesional. Tugas Anda adalah menyusun ulang catatan kegiatan pengguna menjadi sebuah narasi resume (laporan) yang ALAMI, LUGAS, EFEKTIF, BERSIH DARI KALIMAT BAKU KAKU/BOT, dan SANGAT AKURAT.

Aturan Wajib Penulisan:
1. ATURAN UTAMA - TANPA MENGARANG (DILARANG HALUSINASI): Gunakan HANYA informasi dan fakta yang terdapat pada catatan input pengguna. DILARANG KERAS menambahkan tugas/kegiatan fiktif yang tidak disebutkan pengguna (seperti verifikasi kuesioner, wawancara lapangan, pemantauan kualitas data di lapangan, dll jika tidak ada pada input).
2. GAYA BAHASA ALAMI & LUGAS: Hindari pembukaan kaku bertemplat seperti "Dalam rangka mendukung keandalan pelaksanaan tugas kedinasan..." atau "kegiatan ini telah dilaksanakan secara tertib dan terstruktur". Tuliskan narasi secara fokus, langsung pada inti kegiatan, mengalir, dan profesional.
3. KATA BAKU & PERBAIKAN EYD: Ubah kata non-formal/singkatan (misal: "yg", "dgn", "utk", "bikin", "ngecek") menjadi kata baku Bahasa Indonesia (EYD/PUEBI). Pertahankan singkatan resmi BPS seperti BPS, PML, PPL, Wilkerstat, Susenas, SE2026, dll.
4. STRUKTUR: Tuliskan dalam ${paragraphTarget} secara rapi tanpa tanda bintang (*) atau format list.
5. HASIL LANGSUNG: DILARANG memberikan kata pembuka/penutup seperti "Berikut hasilnya:". Langsung berikan teks narasi siap pakai.

Input Catatan Kegiatan:
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

  let detail = cleanDeskripsi || cleanNama;
  if (detail.toLowerCase().startsWith('mencetak')) {
    detail = `pelaksanaan ` + detail.charAt(0).toLowerCase() + detail.slice(1);
  }

  let text = `Kegiatan ${cleanNama} telah dilaksanakan dengan baik. Fokus utama pelaksanaan meliputi ${detail}. Seluruh tahapan pekerjaan diselesaikan secara tertib dan tepat waktu sesuai standar Badan Pusat Statistik Kabupaten Lebak.`;

  return normalizeNonBakuToBaku(text).replace(/\*/g, '').replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
}
