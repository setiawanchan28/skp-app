import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

/**
 * Normalizes informal / non-baku everyday Indonesian words, abbreviations, and common typos
 * into formal Baku Indonesian words suitable for BPS official government documents.
 */
function normalizeNonBakuToBaku(text: string): string {
  if (!text) return '';

  const dict: [RegExp, string][] = [
    // Proper Capitalization for Official Terms & Akronim BPS
    [/\bmaganghub\b/gi, 'MagangHub'],
    [/\bkcda\b/gi, 'KCDA'],
    [/\bse2026\b|\bse 2026\b/gi, 'SE2026'],
    [/\bsusenas\b/gi, 'Susenas'],
    [/\bsakernas\b/gi, 'Sakernas'],
    [/\bwilkerstat\b/gi, 'Wilkerstat'],
    [/\bfasih\b/gi, 'FASIH'],
    [/\bppl\b/gi, 'PPL'],
    [/\bpml\b/gi, 'PML'],
    [/\bbps\b/gi, 'BPS'],
    [/\bhumas\b/gi, 'Humas'],
    [/\bdiseminasi\b/gi, 'Diseminasi'],

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

  // Clean up broken double punctuation or trailing comma-dots
  result = result
    .replace(/,\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.');

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

  let paragraphTarget = 'secara proporsional (1 hingga 3 paragraf sesuai kepadatan rincian input)';
  if (jumlahParagraf === '1') {
    paragraphTarget = 'TEPAT 1 PARAGRAF UTUH DAN MENGALIR';
  } else if (jumlahParagraf === '2') {
    paragraphTarget = 'TEPAT 2 PARAGRAF LUGAS DAN HARMONIS';
  } else if (jumlahParagraf === '3') {
    paragraphTarget = 'TEPAT 3 PARAGRAF KOMPREHENSIF DENGAN 3 PARAGRAF TERPISAH (HANYA JIKA INPUT MENDUKUNG. JIKA INPUT SINGKAT, SUSUN TEKS DENGAN PARAGRAF YANG TIDAK MENGULANG KALIMAT)';
  }

  const prompt = `Anda adalah penulis laporan kedinasan Badan Pusat Statistik (BPS) yang handal, profesional, dan berpengalaman. Tugas Anda adalah mengolah catatan/poin kasar dari pengguna menjadi narasi laporan kegiatan yang FLUID, ALAMI, BERKELAS, LUGAS, BERVARIASI, SERTA BEBAS DARI KALIMAT KAKU / FORMULAIC BOT.

TEMA DAN VARIASI CONTOH NARASI TERBAIK BPS:

[CONTOH 1: KEGIATAN RAPAT / DINAS / PERTEMUAN]
Input:
Nama Kegiatan: Rapat Tim Humas
Catatan Input:
- perkenalan tim humas dari maganghub,
- menyampaikan rencana kerja ke depan,
- perencanaan pembuatan konten setiap kegiatan dan data statistik rutin,
- membantu tim diseminasi menyusun KCDA 2026

Hasil Terbaik (Alami & Berkelas):
Dalam kegiatan Rapat Tim Humas, agenda diawali dengan perkenalan Tim Humas MagangHub serta penyampaian rencana kerja ke depan. Diskusi kemudian dilanjutkan dengan perencanaan pembuatan konten untuk setiap kegiatan dan publikasi data statistik rutin. Sebagai bentuk kolaborasi teknis, kegiatan ditutup dengan pendampingan kepada Tim Diseminasi dalam penyusunan KCDA 2026 guna mendukung keandalan publikasi data statistik.

[CONTOH 2: KEGIATAN LAPANGAN / SUPERVISI / MONITORING]
Input:
Nama Kegiatan: Supervisi Lapangan Pendataan Sakernas 2026 di Kecamatan Rangkasbitung
Catatan Input: Desa Muara Ciujung Timur, mendampingi PPL Budi Santoso. Sampel 10 ruta. Pengecekan konsistensi blok V dan VI. Menemui kendala responden sulit ditemui malam hari. Arahan perjanjian ulang waktu wawancara.

Hasil Terbaik (Alami & Berkelas):
Pelaksanaan supervisi pendataan Sakernas 2026 berlangsung di Desa Muara Ciujung Timur, Kecamatan Rangkasbitung, melalui pendampingan langsung terhadap Petugas Pencacah Lapangan (PPL) Budi Santoso. Fokus kegiatan ini mencakup pemantauan proses pencacahan pada 10 rumah tangga sampel serta pemeriksaan ketelitian pengisian kuesioner, khususnya pada keselarasan data antar-blok (Blok V dan VI).

Dalam pelaksanaan di lapangan, teridentifikasi kendala berupa keterbatasan waktu responden yang sebagian besar hanya dapat ditemui pada malam hari. Menyikapi hal tersebut, PPL diarahkan untuk menyusun jadwal perjanjian ulang secara proaktif dan fleksibel agar seluruh rumah tangga sampel tetap terjangkau tanpa mengurangi kualitas isian data.

---
ATURAN WAJIB PENULISAN (SERIUS & HARUS DITURUTI):
1. DILARANG KERAS MENGULANG KALIMAT ATAU KLAUSA: Dilarang menduplikasi klausa berulang seperti "Selain itu, pembahasan mencakup...". Sambungkan poin-poin input dengan kata penghubung alami (misal: "agenda diawali dengan...", "selanjutnya...", "di samping itu...", "kegiatan ditutup dengan...").
2. KAPITALISASI & EYD: Gunakan kapitalisasi yang tepat untuk nama instansi/istilah (misal: MagangHub, KCDA 2026, BPS, Tim Humas, Tim Diseminasi, Wilkerstat, Susenas). Perbaiki tanda baca agar tidak ada koma ganda atau koma sebelum titik.
3. BENTUK KATA KERJA HARMONIS: Ubah kata kerja mentah menjadi bentuk substantif alami jika ditempatkan setelah kata depan (misal: "menyampaikan" -> "penyampaian", "membantu" -> "pendampingan", "menyusun" -> "penyusunan").
4. STRUKTUR TEKS: Susun dalam ${paragraphTarget}. Jangan gunakan bullet points (* atau -).
5. HASIL LANGSUNG: Berikan HANYA teks narasi akhir siap pakai tanpa pengantar AI.

INPUT PENGGUNA UNTUK DISUSUN:
Nama Kegiatan: ${cleanNamaKegiatan}
Rincian Catatan Input:
${cleanDeskripsiKegiatan || cleanNamaKegiatan}`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy') || !apiKey.startsWith('AIzaSy')) {
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

  // Helper to convert raw bullet line into clean substantive noun phrase
  const transformToSubstantive = (str: string) => {
    let s = str
      .replace(/^[-*•\d.]+\s*/, '')
      .replace(/[,;\.]+\s*$/, '')
      .trim();

    s = s.replace(/^(mengikuti|melakukan|melaksanakan|mengadakan|menyelenggarakan)\s+/gi, '');
    s = s.replace(/\bmenyampaikan\b/gi, 'penyampaian');
    s = s.replace(/\bmenyusun\b/gi, 'penyusunan');
    s = s.replace(/\bmembantu\b/gi, 'pendampingan kepada');
    s = s.replace(/\bmembuat\b|\bmembikin\b/gi, 'pembuatan');
    s = s.replace(/\bmemeriksa\b|\bmengecek\b/gi, 'pemeriksaan');
    s = s.replace(/\bmengolah\b/gi, 'pengolahan');
    s = s.replace(/\bmengisi\b/gi, 'pengisian');
    s = s.replace(/\bmengumpulkan\b/gi, 'pengumpulan');
    s = s.replace(/\bmengawasi\b/gi, 'pengawasan');
    s = s.replace(/\bmengarahkan\b/gi, 'pengarahan');
    s = s.replace(/\bmenyiapkan\b/gi, 'penyiapan');

    return s;
  };

  const lines = cleanDeskripsi
    .split('\n')
    .map((l) => transformToSubstantive(l))
    .filter((l) => l.length > 0);

  const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

  // Detect category with proper priority (Rapat/Pertemuan > Pengolahan > Lapangan)
  const namaLower = cleanNama.toLowerCase();
  const descLower = cleanDeskripsi.toLowerCase();
  const combined = (namaLower + ' ' + descLower);

  const isRapat = namaLower.includes('rapat') || namaLower.includes('dinas') || namaLower.includes('bintek') || namaLower.includes('sosialisasi') || namaLower.includes('pelatihan') || descLower.includes('mengikuti rapat') || descLower.includes('rapat pembahasan') || descLower.includes('tim humas');
  const isPengolahan = combined.includes('entri') || combined.includes('validasi') || combined.includes('olah') || combined.includes('peta') || combined.includes('cetak') || combined.includes('fasih');
  const isLapangan = !isRapat && (combined.includes('supervisi') || combined.includes('pendataan') || combined.includes('lapangan') || combined.includes('monitoring') || combined.includes('pencacahan'));

  // Determine target paragraph count
  let targetCount = 1;
  if (jumlahParagraf === '2') targetCount = 2;
  if (jumlahParagraf === '3') targetCount = 3;
  if (jumlahParagraf === 'auto') {
    targetCount = lines.length >= 4 ? 3 : lines.length >= 2 ? 2 : 1;
  }

  const pList: string[] = [];

  if (lines.length >= 2) {
    if (targetCount === 1) {
      if (isRapat) {
        const item1 = lowerFirst(lines[0]);
        const itemMid = lines.slice(1, -1).map((l) => lowerFirst(l)).join(', serta ');
        const itemLast = lowerFirst(lines[lines.length - 1]);

        if (lines.length === 2) {
          pList.push(`Dalam kegiatan ${cleanNama}, agenda diawali dengan ${item1} serta ${itemLast}. Rangkaian pertemuan berlangsung secara interaktif demi kelancaran koordinasi.`);
        } else {
          pList.push(`Dalam kegiatan ${cleanNama}, agenda diawali dengan ${item1}. Diskusi dilanjutkan dengan ${itemMid}, dan ditutup dengan ${itemLast}.`);
        }
      } else if (isPengolahan) {
        const item1 = lowerFirst(lines[0]);
        const itemRest = lines.slice(1).map((l) => lowerFirst(l)).join(' serta ');
        pList.push(`Proses ${cleanNama} dilaksanakan secara bertahap, dimulai dari ${item1}. Selanjutnya, tahapan pekerjaan mencakup ${itemRest}.`);
      } else {
        const item1 = lowerFirst(lines[0]);
        const itemRest = lines.slice(1).map((l) => lowerFirst(l)).join(', ');
        pList.push(`Pelaksanaan ${cleanNama} diawali dengan ${item1}. Langkah ini kemudian dilanjutkan dengan ${itemRest} untuk memastikan ketercapaian target.`);
      }
    } else if (targetCount === 2) {
      const half = Math.ceil(lines.length / 2);
      const group1 = lines.slice(0, half).map((l) => lowerFirst(l)).join(' serta ');
      const group2 = lines.slice(half).map((l) => lowerFirst(l)).join(' serta ');

      if (isRapat) {
        pList.push(`Dalam kegiatan ${cleanNama}, agenda utama berfokus pada ${group1}. Diskusi berlangsung secara aktif untuk menyelaraskan persepsi antarpeserta.`);
        pList.push(`Selain itu, pembahasan turut mencakup ${group2} guna mendukung kelancaran pelaksanaan tugas kedinasan.`);
      } else if (isPengolahan) {
        pList.push(`Proses ${cleanNama} diawali dengan ${group1} secara teliti.`);
        pList.push(`Tahap berikutnya dilanjutkan dengan ${group2} untuk memastikan kualitas dan keandalan data.`);
      } else {
        pList.push(`Pelaksanaan ${cleanNama} diawali dengan ${group1}.`);
        pList.push(`Tahapan selanjutnya mencakup ${group2} guna memastikan ketercapaian target secara optimal.`);
      }
    } else {
      // 3 Paragraphs for multi-line
      const p1Items = lines.slice(0, 1).map((l) => lowerFirst(l)).join(' ');
      const p2Items = lines.slice(1, -1).length > 0
        ? lines.slice(1, -1).map((l) => lowerFirst(l)).join(' serta ')
        : lowerFirst(lines[lines.length - 1]);
      const p3Items = lowerFirst(lines[lines.length - 1]);

      if (isRapat) {
        pList.push(`Pelaksanaan ${cleanNama} diawali dengan agenda ${p1Items}. Pertemuan ini diselenggarakan untuk menyelaraskan koordinasi awal antarpeserta.`);
        pList.push(`Dalam sesi diskusi teknis, pembahasan dilanjutkan dengan ${p2Items}.`);
        pList.push(`Sebagai bentuk komitmen bersama, kegiatan ditutup dengan ${p3Items} guna menjamin ketercapaian target.`);
      } else if (isPengolahan) {
        pList.push(`Kegiatan ${cleanNama} dimulai dengan tahap pencermatan awal berupa ${p1Items}.`);
        pList.push(`Tahap pengolahan dilanjutkan dengan ${p2Items} secara cermat.`);
        pList.push(`Sebagai tahap akhir, dilakukan ${p3Items} untuk memastikan ketelitian hasil pengolahan data.`);
      } else {
        pList.push(`Pelaksanaan ${cleanNama} diawali dengan ${p1Items} di lokasi sasaran.`);
        pList.push(`Rangkaian pemantauan kemudian mencakup ${p2Items}.`);
        pList.push(`Seluruh kegiatan ditutup dengan ${p3Items} untuk memastikan seluruh proses berjalan sesuai standar.`);
      }
    }
  } else {
    // Single line / brief input case
    const itemClean = lowerFirst(transformToSubstantive(cleanDeskripsi || cleanNama));

    if (targetCount === 1) {
      if (isRapat) {
        pList.push(`Pelaksanaan ${cleanNama} berfokus pada ${itemClean}, guna menyelaraskan pemahaman teknis serta merumuskan langkah operasional.`);
      } else if (isPengolahan) {
        pList.push(`Kegiatan ${cleanNama} mencakup ${itemClean}, yang diselesaikan secara teliti dan terstruktur sesuai standar operasional.`);
      } else {
        pList.push(`Pelaksanaan ${cleanNama} difokuskan pada ${itemClean} guna memastikan ketercapaian target dan kualitas hasil pelaksanaan.`);
      }
    } else if (targetCount === 2) {
      pList.push(`Pelaksanaan ${cleanNama} diselenggarakan untuk mengulas secara mendalam mengenai ${itemClean}. Pertemuan ini menjadi wadah koordinasi dalam mengidentifikasi perkembangan teknis.`);
      pList.push(`Dalam pembahasan tersebut, dirumuskan langkah-langkah tindak lanjut yang konkret agar pelaksanaan kegiatan dapat berjalan efektif dan tepat sasaran.`);
    } else {
      pList.push(`Pelaksanaan ${cleanNama} diselenggarakan sebagai bentuk koordinasi teknis, dengan agenda utama pembahasan mengenai ${itemClean}.`);
      pList.push(`Dalam sesi diskusi, dilakukan penelaahan terhadap perkembangan pencapaian, evaluasi kendala operasional, serta pembahasan opsi solusi yang efisien.`);
      pList.push(`Hasil pertemuan merumuskan rencana tindak lanjut dan pembagian peran kerja agar implementasi kegiatan berjalan terarah dan sesuai target.`);
    }
  }

  const resultStr = pList.join('\n\n');
  return normalizeNonBakuToBaku(resultStr);
}
