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
    paragraphTarget = 'TEPAT 1 PARAGRAF UTUH DAN MENGALIR';
  } else if (jumlahParagraf === '2') {
    paragraphTarget = 'TEPAT 2 PARAGRAF LUGAS DAN HARMONIS';
  } else if (jumlahParagraf === '3') {
    paragraphTarget = 'TEPAT 3 PARAGRAF KOMPREHENSIVE (dipisahkan oleh dua kali perpindahan baris)';
  }

  const prompt = `Anda adalah penulis laporan kedinasan Badan Pusat Statistik (BPS) yang handal, profesional, dan berpengalaman. Tugas Anda adalah mengolah catatan/poin kasar dari pengguna menjadi narasi laporan kegiatan yang FLUID, ALAMI, BERKELAS, LUGAS, BERVARIASI, SERTA BEBAS DARI KALIMAT KAKU / FORMULAIC BOT.

TEMA DAN VARIASI CONTOH NARASI TERBAIK BPS:

[CONTOH 1: KEGIATAN LAPANGAN / SUPERVISI / MONITORING]
Input:
Nama Kegiatan: Supervisi Lapangan Pendataan Sakernas 2026 di Kecamatan Rangkasbitung
Catatan Input: Desa Muara Ciujung Timur, mendampingi PPL Budi Santoso. Sampel 10 ruta. Pengecekan konsistensi blok V dan VI. Menemui kendala responden sulit ditemui malam hari. Arahan perjanjian ulang waktu wawancara.

Hasil Terbaik (Alami & Berkelas):
Pelaksanaan supervisi pendataan Sakernas 2026 berlangsung di Desa Muara Ciujung Timur, Kecamatan Rangkasbitung, melalui pendampingan langsung terhadap Petugas Pencacah Lapangan (PPL) Budi Santoso. Fokus kegiatan ini mencakup pemantauan proses pencacahan pada 10 rumah tangga sampel serta pemeriksaan ketelitian pengisian kuesioner, khususnya pada keselarasan data antar-blok (Blok V dan VI).

Dalam pelaksanaan di lapangan, teridentifikasi kendala berupa keterbatasan waktu responden yang sebagian besar hanya dapat ditemui pada malam hari. Menyikapi hal tersebut, PPL diarahkan untuk menyusun jadwal perjanjian ulang secara proaktif dan fleksibel agar seluruh rumah tangga sampel tetap terjangkau tanpa mengurangi kualitas isian data.

[CONTOH 2: KEGIATAN TEKNIS / PENGOLAHAN / DOKUMENTASI]
Input:
Nama Kegiatan: Entri dan Validasi Data Hasil Pendataan Desa Cantik
Catatan Input: Memeriksa 45 kuesioner dari desa sampel. Melakukan pembersihan data error di aplikasi FASIH. Mengirimkan perbaikan ke server pusat.

Hasil Terbaik (Alami & Berkelas):
Kegiatan entri dan validasi data Desa Cantik diawali dengan pemeriksaan kelengkapan 45 kuesioner hasil pencacahan lapangan. Selanjutnya, pembersihan data (data cleaning) dilakukan melalui aplikasi FASIH guna memperbaiki entri yang terdeteksi anomali atau tidak konsisten. Setelah seluruh dokumen dipastikan valid, hasil perbaikan diunggah secara bertahap ke server pusat untuk proses pengolahan lebih lanjut.

[CONTOH 3: KEGIATAN SEPERTI PENCETAKAN / LOGISTIK / SEDERHANA]
Input:
Nama Kegiatan: Pencetakan Peta Wilkerstat untuk Susenas 2026
Catatan Input: Mencetak 30 lembar peta Blok Sensus di ruang pengolahan. Memeriksa kejelasan peta dan pengarsipan per kecamatan.

Hasil Terbaik (Alami & Berkelas):
Proses pencetakan peta Wilkerstat untuk persiapan Susenas 2026 dilaksanakan di ruang pengolahan dengan mencetak sebanyak 30 lembar peta Blok Sensus. Setiap lembar peta yang dicetak diperiksa tingkat kejelasan garis batas wilayahnya sebelum dikelompokkan dan diarsipkan secara rapi berdasarkan kecamatan target.

---
ATURAN WAJIB PENULISAN (SERIUS & HARUS DITURUTI):
1. ANTIMONOTON & VARIATIF: DILARANG keras mengulang klausa pembuka kaku seperti "Dalam rangka...", "Kegiatan ini dilaksanakan untuk...", atau "Seluruh hasil kegiatan diselesaikan...". Variasikan struktur kalimat (kalimat aktif, kalimat pasif, serta alur kronologis yang alami).
2. TANPA HALUSINASI: Gunakan HANYA fakta & rincian dari catatan input pengguna. Jangan menambah-nambah kegiatan atau lokasi yang tidak tertulis! Jika input singkat, tulis narasi yang padat dan efisien tanpa dipanjang-panjangkan dengan kata-kata hampa.
3. BAHASA BAKU & EYD: Perbaiki kata informal/singkatan non-resmi (misal: "yg", "dgn", "bikin", "ngecek") menjadi Bahasa Indonesia formal. Tetap pertahankan akronim resmi BPS (BPS, PML, PPL, Wilkerstat, Susenas, Sakernas, FASIH, SE2026, dll.).
4. STRUKTUR TEKS: Susun dalam ${paragraphTarget}. Jangan gunakan bullet points (* atau -) maupun tebal/miring bertumpuk.
5. HASIL LANGSUNG: Berikan HANYA teks narasi akhir tanpa pengantar ("Berikut narasinya:") atau penutup AI.

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

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash'];
    for (const modelName of modelsToTry) {
      try {
        const restRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
            signal: controller.signal,
          }
        );

        if (restRes.ok) {
          clearTimeout(timeoutId);
          const json = await restRes.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText && rawText.trim().length > 10) {
            let clean = rawText.replace(/^(berikut adalah|berikut ringkasan|berikut narasi|berikut hasilnya|sebagai ai)[^:\n]*[:\n]\s*/i, '').trim();
            clean = clean.replace(/^"|"$/g, '').trim();
            clean = clean.replace(/\*/g, '').trim();
            return clean;
          }
        }
      } catch (e) {
        // Try next model if any
      }
    }
    clearTimeout(timeoutId);

    // SDK Fallback
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
 * Custom Paragraph Offline Narrative Composer (Dynamic, Context-Aware & Non-monotonous)
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

  // Capitalize first letter helper
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

  // Detect category based on activity name / description
  const combined = (cleanNama + ' ' + cleanDeskripsi).toLowerCase();
  const isLapangan = combined.includes('supervisi') || combined.includes('pendataan') || combined.includes('lapangan') || combined.includes('monitoring') || combined.includes('pencacahan');
  const isRapat = combined.includes('rapat') || combined.includes('bintek') || combined.includes('pelatihan') || combined.includes('sosialisasi') || combined.includes('koordinasi');
  const isPengolahan = combined.includes('entri') || combined.includes('validasi') || combined.includes('olah') || combined.includes('peta') || combined.includes('cetak') || combined.includes('fasih');

  if (lines.length >= 2) {
    let p1 = '';
    let p2 = '';
    let p3 = '';

    if (isLapangan) {
      p1 = `Pelaksanaan ${cleanNama} diawali dengan ${lowerFirst(lines[0])}. Langkah ini dilakukan guna memastikan kesiapan operasional dan kualitas pencacahan di lokasi target.`;
      p2 = lines.slice(1, -1).length > 0
        ? lines.slice(1, -1).map((l) => `Selanjutnya, ${lowerFirst(l)}.`).join(' ')
        : `Tahapan berikutnya mencakup ${lowerFirst(lines[lines.length - 1])}.`;
      if (lines.length > 2) {
        p3 = `Sebagai penutup rangkaian kegiatan, ${lowerFirst(lines[lines.length - 1])} untuk menjaga kelancaran dan ketepatan target pendataan.`;
      }
    } else if (isRapat) {
      p1 = `Dalam kegiatan ${cleanNama}, agenda berfokus pada ${lowerFirst(lines[0])}. Diskusi berlangsung secara aktif untuk menyelaraskan pemahaman teknis antarpeserta.`;
      p2 = lines.slice(1).map((l) => `Selain itu, ${lowerFirst(l)}.`).join(' ');
    } else if (isPengolahan) {
      p1 = `Proses ${cleanNama} dilaksanakan secara bertahap, dimulai dari ${lowerFirst(lines[0])}.`;
      p2 = lines.slice(1).map((l) => `Tahap berikutnya meliputi ${lowerFirst(l)}.`).join(' ');
    } else {
      p1 = `Rangkaian kegiatan ${cleanNama} berfokus pada ${lowerFirst(lines[0])}.`;
      p2 = lines.slice(1).map((l) => `Adapun tahapan selanjutnya adalah ${lowerFirst(l)}.`).join(' ');
    }

    if (jumlahParagraf === '1') {
      return normalizeNonBakuToBaku(`${p1} ${p2}`).replace(/\.{2,}/g, '.');
    }
    return normalizeNonBakuToBaku(p3 ? `${p1}\n\n${p2}\n\n${p3}` : `${p1}\n\n${p2}`).replace(/\.{2,}/g, '.');
  }

  // Single line / brief input case
  let detail = cleanDeskripsi || cleanNama;
  let text = '';

  if (isLapangan) {
    text = `Pelaksanaan ${cleanNama} berfokus pada ${lowerFirst(detail)}. Seluruh rangkaian pemantauan dilakukan secara cermat guna menjamin kualitas data di lapangan.`;
  } else if (isRapat) {
    text = `Kegiatan ${cleanNama} diisi dengan pembahasan mengenai ${lowerFirst(detail)} demi tercapainya kesepahaman teknis pelaksanaan tugas kedinasan.`;
  } else if (isPengolahan) {
    text = `Pelaksanaan ${cleanNama} mencakup ${lowerFirst(detail)} yang diselesaikan secara teliti sesuai prosedur operasional standar.`;
  } else {
    text = `Kegiatan ${cleanNama} mencakup ${lowerFirst(detail)}, yang dilaksanakan dengan tertib dan tepat waktu.`;
  }

  return normalizeNonBakuToBaku(text).replace(/\*/g, '').replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
}
