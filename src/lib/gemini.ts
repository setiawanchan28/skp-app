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

  const prompt = `Anda adalah asisten penulis laporan profesional. Tugas Anda adalah menyusun ulang catatan perjalanan dinas / kegiatan kedinasan menjadi sebuah narasi resume (laporan) yang komprehensif, terstruktur, mengalir alami (tidak kaku), dan profesional.

Berikut adalah aturan wajib dalam penulisan narasi:
1. PENGGUNAAN BAHASA: Gunakan Bahasa Indonesia yang baku, baik, dan benar (sesuai kaidah PUEBI/EYD). 
2. FORMALISASI: Ubah semua kata ganti santai, bahasa sehari-hari (slang), dan istilah non-formal menjadi bahasa resmi instansi/pemerintahan.
3. PENJABARAN SINGKATAN: Perluas dan perjelas semua singkatan menjadi kata utuh (misalnya: "yg" menjadi "yang", "kordinasi" menjadi "koordinasi", "rapat dgn kades" menjadi "melaksanakan rapat bersama Kepala Desa"). Pertahankan istilah resmi BPS seperti BPS, PML, PPL, SLS, SE2026.
4. KEDETAILAN PARAGRAF: Tulis narasi ini dalam ${paragraphTarget}. Kembangkan setiap paragraf menjadi narasi yang panjang, padat informasi, mendetail, dan mengalir luas (minimal 4-6 kalimat kaya per paragraf). Gabungkan poin-poin kegiatan menjadi kalimat majemuk yang mengalir secara alami dengan transisi yang logis (jangan kaku, jangan menggunakan format list/bullet point, wajib berbentuk paragraf cerita/naratif).
5. TANPA MENGARANG (DILARANG HALUSINASI): Gunakan hanya informasi dasar yang terdapat pada catatan input, namun kembangkan struktur kalimatnya secara naratif, mengalir, dan rinci tanpa menambah fakta palsu.
6. HASIL LANGSUNG: DILARANG memberikan kata pembuka/penutup seperti "Berikut hasilnya:", "Sebagai AI...", atau menggunakan tanda bintang (*). Langsung hasilkan teks narasi siap pakai yang dapat langsung ditempel ke dokumen laporan kedinasan.

Berikut adalah catatan kasar perjalanan dinas yang perlu Anda susun ulang:
"""
Nama Kegiatan: ${cleanNamaKegiatan}
Catatan Poin Kegiatan:
${cleanDeskripsiKegiatan}
"""`;

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
    return `Dalam rangka pelaksanaan tugas kedinasan, kegiatan ${namaKegiatan} telah dilaksanakan dengan komprehensif sesuai petunjuk teknis dan standar operasional prosedur yang berlaku di lingkungan Badan Pusat Statistik Kabupaten Lebak. Seluruh alur pelaksanaan dikawal secara cermat untuk memastikan efektivitas kegiatan dan penjaminan kualitas data di lapangan.`;
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

  let p1 = `Dalam rangka mendukung keandalan pelaksanaan tugas kedinasan, kegiatan ${namaKegiatan} telah dilaksanakan secara tertib dan terstruktur.`;
  if (locations.length > 0) p1 += ` Pelaksanaan kegiatan bertempat di lokasi ${locations.join(', ')}`;
  if (personnel.length > 0) p1 += ` dengan melibatkan tim kerja yang terdiri atas ${personnel.join(' serta ')}`;
  p1 += `. `;

  if (cleanActions.length > 0) {
    const formatted = cleanActions.map((a) => a.charAt(0).toLowerCase() + a.slice(1));
    p1 += `Rangkaian pelaksanaan tugas diawali dengan koordinasi awal dan dilanjutkan pada fokus utama kegiatan yaitu ${formatted.join(', ')}.`;
  } else {
    p1 += `Pelaksanaan tugas diawali dengan persiapan instrumen serta berfokus pada verifikasi isian kuesioner dan pemantauan kualitas data secara mendalam di lapangan.`;
  }

  p1 += ` Setiap tahap pelaksanaan dikawal dengan ketat guna memastikan kesesuaian prosedur serta ketepatan alur kerja sesuai petunjuk teknis yang ditetapkan oleh Badan Pusat Statistik.`;

  let resultText = p1;

  if (jumlahParagraf === '2' || (jumlahParagraf === 'auto' && modePanjang === 'panjang')) {
    const p2 = `Melalui pelaksanaan kegiatan ini, koordinasi teknis serta verifikasi konsistensi data statistik terus ditingkatkan secara menyeluruh dan berkesinambungan. Langkah ini diambil untuk mengidentifikasi serta meminimalkan anomali atau kesalahan pendataan sejak awal, sehingga dapat memberikan jaminan mutu terhadap akurasi dan integritas data statistik yang dihasilkan oleh Badan Pusat Statistik Kabupaten Lebak secara tuntas.`;
    resultText = `${p1}\n\n${p2}`;
  } else if (jumlahParagraf === '3') {
    const p2 = `Selama pelaksanaan di lapangan, verifikasi dilakukan secara mendalam dan berjenjang guna memastikan keabsahan isian kuesioner serta mendeteksi potensi nonsampling error secara dini bersama para petugas. Rangkaian evaluasi ini mencakup pengecekan kelengkapan variabel utama, uji konsistensi antar-blok pertanyaan, hingga penyesuaian terhadap dinamika kondisi lapangan secara langsung.`;
    const p3 = `Langkah komprehensif tersebut memberikan kontribusi nyata dalam menjaga kualitas dan keandalan data statistik instansi. Dengan terselesaikannya seluruh tahapan kerja secara tuntas, hasil dari kegiatan ini diharapkan mampu menjadi dasar bahan penentuan kebijakan serta pemenuhan capaian kinerja organisasi Badan Pusat Statistik Kabupaten Lebak secara optimal.`;
    resultText = `${p1}\n\n${p2}\n\n${p3}`;
  }

  // Strip accidental asterisks, double punctuation, and cleanup
  let finalResult = normalizeNonBakuToBaku(resultText).replace(/\*/g, '');
  finalResult = finalResult.replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
  return finalResult;
}
