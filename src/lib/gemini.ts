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

  let paragraphTarget = 'secara proporsional (1 hingga 3 paragraf sesuai kepadatan rincian input)';
  if (jumlahParagraf === '1') {
    paragraphTarget = 'TEPAT 1 PARAGRAF UTUH DAN MENGALIR';
  } else if (jumlahParagraf === '2') {
    paragraphTarget = 'TEPAT 2 PARAGRAF LUGAS DAN HARMONIS';
  } else if (jumlahParagraf === '3') {
    paragraphTarget = '3 PARAGRAF COMPREHENSIVE (JIKA FAKTA INPUT PANJANG. JIKA INPUT SINGKAT, CUKUP BUAT 1 PARAGRAF UTUH DAN DILARANG KERAS MENGULANG KALIMAT)';
  }

  const prompt = `Anda adalah penulis laporan kedinasan Badan Pusat Statistik (BPS) yang handal, profesional, dan berpengalaman. Tugas Anda adalah mengolah catatan/poin kasar dari pengguna menjadi narasi laporan kegiatan yang FLUID, ALAMI, BERKELAS, LUGAS, BERVARIASI, SERTA BEBAS DARI KALIMAT KAKU / FORMULAIC BOT.

TEMA DAN VARIASI CONTOH NARASI TERBAIK BPS:

[CONTOH 1: KEGIATAN RAPAT / DINAS / PERTEMUAN]
Input:
Nama Kegiatan: Rapat Dinas Rutin
Catatan Input: Mengikuti rapat pembahasan monitoring dan evaluasi pendataan sensus ekonomi 2026

Hasil Terbaik (Alami & Berkelas):
Kegiatan Rapat Dinas Rutin dilaksanakan dalam rangka pembahasan monitoring dan evaluasi pendataan Sensus Ekonomi 2026. Pertemuan ini difokuskan pada penelaahan perkembangan capaian pendataan di lapangan serta perumusan solusi atas berbagai kendala teknis yang dihadapi petugas.

[CONTOH 2: KEGIATAN LAPANGAN / SUPERVISI / MONITORING]
Input:
Nama Kegiatan: Supervisi Lapangan Pendataan Sakernas 2026 di Kecamatan Rangkasbitung
Catatan Input: Desa Muara Ciujung Timur, mendampingi PPL Budi Santoso. Sampel 10 ruta. Pengecekan konsistensi blok V dan VI. Menemui kendala responden sulit ditemui malam hari. Arahan perjanjian ulang waktu wawancara.

Hasil Terbaik (Alami & Berkelas):
Pelaksanaan supervisi pendataan Sakernas 2026 berlangsung di Desa Muara Ciujung Timur, Kecamatan Rangkasbitung, melalui pendampingan langsung terhadap Petugas Pencacah Lapangan (PPL) Budi Santoso. Fokus kegiatan ini mencakup pemantauan proses pencacahan pada 10 rumah tangga sampel serta pemeriksaan ketelitian pengisian kuesioner, khususnya pada keselarasan data antar-blok (Blok V dan VI).

Dalam pelaksanaan di lapangan, teridentifikasi kendala berupa keterbatasan waktu responden yang sebagian besar hanya dapat ditemui pada malam hari. Menyikapi hal tersebut, PPL diarahkan untuk menyusun jadwal perjanjian ulang secara proaktif dan fleksibel agar seluruh rumah tangga sampel tetap terjangkau tanpa mengurangi kualitas isian data.

[CONTOH 3: KEGIATAN TEKNIS / PENGOLAHAN / DOKUMENTASI]
Input:
Nama Kegiatan: Entri dan Validasi Data Hasil Pendataan Desa Cantik
Catatan Input: Memeriksa 45 kuesioner dari desa sampel. Melakukan pembersihan data error di aplikasi FASIH. Mengirimkan perbaikan ke server pusat.

Hasil Terbaik (Alami & Berkelas):
Kegiatan entri dan validasi data Desa Cantik diawali dengan pemeriksaan kelengkapan 45 kuesioner hasil pencacahan lapangan. Selanjutnya, pembersihan data (data cleaning) dilakukan melalui aplikasi FASIH guna memperbaiki entri yang terdeteksi anomali atau tidak konsisten. Setelah seluruh dokumen dipastikan valid, hasil perbaikan diunggah secara bertahap ke server pusat untuk proses pengolahan lebih lanjut.

---
ATURAN WAJIB PENULISAN (SERIUS & HARUS DITURUTI):
1. DILARANG KERAS MENGULANG KALIMAT ATAU PARAGRAF: Dilarang menduplikasi kalimat/paragraf yang sama! Jika fakta input hanya 1-2 kalimat, tuliskan narasi 1 paragraf yang padat, berkelas, dan langsung pada substansi tanpa mengulang kata.
2. ANTIMONOTON & VARIATIF: DILARANG keras mengulang klausa pembuka kaku. Variasikan struktur kalimat secara alami (kalimat aktif, kalimat pasif, serta alur kronologis yang mengalir).
3. TANPA HALUSINASI: Gunakan HANYA fakta & rincian dari catatan input pengguna. Jangan menambah-nambah kegiatan atau lokasi yang tidak tertulis!
4. BAHASA BAKU & EYD: Perbaiki kata informal/singkatan non-resmi menjadi Bahasa Indonesia formal. Tetap pertahankan akronim resmi BPS (BPS, PML, PPL, Wilkerstat, Susenas, Sakernas, FASIH, SE2026, dll.).
5. STRUKTUR TEKS: Susun dalam ${paragraphTarget}. Jangan gunakan bullet points (* atau -).
6. HASIL LANGSUNG: Berikan HANYA teks narasi akhir siap pakai tanpa kata pengantar atau penutup AI.

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

  // Helper to clean leading redundant verbs from detail strings
  const cleanLeadingVerb = (str: string) => {
    return str
      .replace(/^(mengikuti|melakukan|melaksanakan|mengadakan|menyelenggarakan)\s+/gi, '')
      .trim();
  };

  const lines = cleanDeskripsi
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 0);

  const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

  // Detect category with proper priority (Rapat/Pertemuan > Pengolahan > Lapangan)
  const namaLower = cleanNama.toLowerCase();
  const descLower = cleanDeskripsi.toLowerCase();
  const combined = (namaLower + ' ' + descLower);

  const isRapat = namaLower.includes('rapat') || namaLower.includes('dinas') || namaLower.includes('bintek') || namaLower.includes('sosialisasi') || namaLower.includes('pelatihan') || descLower.includes('mengikuti rapat') || descLower.includes('rapat pembahasan');
  const isPengolahan = combined.includes('entri') || combined.includes('validasi') || combined.includes('olah') || combined.includes('peta') || combined.includes('cetak') || combined.includes('fasih');
  const isLapangan = !isRapat && (combined.includes('supervisi') || combined.includes('pendataan') || combined.includes('lapangan') || combined.includes('monitoring') || combined.includes('pencacahan'));

  const detailRaw = cleanDeskripsi || cleanNama;
  const detailClean = lowerFirst(cleanLeadingVerb(detailRaw));

  // Determine target paragraph count (default: 1 for short input, else match user selection)
  let targetCount = 1;
  if (jumlahParagraf === '2') targetCount = 2;
  if (jumlahParagraf === '3') targetCount = 3;
  if (jumlahParagraf === 'auto') {
    targetCount = lines.length >= 3 ? 3 : lines.length === 2 ? 2 : 1;
  }

  const pList: string[] = [];

  if (lines.length >= 2 && targetCount > 1) {
    // Multi-line detailed input handling
    if (isRapat) {
      pList.push(`Dalam kegiatan ${cleanNama}, agenda diawali dengan ${lowerFirst(cleanLeadingVerb(lines[0]))}. Diskusi berlangsung secara interaktif untuk menyelaraskan pemahaman teknis antarpeserta.`);
      pList.push(lines.slice(1).map((l) => `Selain itu, pembahasan mencakup ${lowerFirst(cleanLeadingVerb(l))}.`).join(' '));
      if (targetCount === 3 && lines.length >= 3) {
        pList.push(`Seluruh hasil pembahasan dirumuskan sebagai langkah tindak lanjut bersama guna mendukung kelancaran pelaksanaan tugas.`);
      }
    } else if (isPengolahan) {
      pList.push(`Proses ${cleanNama} dilaksanakan secara bertahap, dimulai dari ${lowerFirst(cleanLeadingVerb(lines[0]))}.`);
      pList.push(lines.slice(1).map((l) => `Tahap berikutnya meliputi ${lowerFirst(cleanLeadingVerb(l))}.`).join(' '));
      if (targetCount === 3 && lines.length >= 3) {
        pList.push(`Hasil pengolahan akhir diverifikasi kembali untuk memastikan kualitas dan ketepatan data.`);
      }
    } else {
      pList.push(`Pelaksanaan ${cleanNama} diawali dengan ${lowerFirst(cleanLeadingVerb(lines[0]))}.`);
      pList.push(lines.slice(1).map((l) => `Tahapan selanjutnya mencakup ${lowerFirst(cleanLeadingVerb(l))}.`).join(' '));
      if (targetCount === 3 && lines.length >= 3) {
        pList.push(`Seluruh tahapan kegiatan diselesaikan secara terstruktur sesuai target yang telah ditetapkan.`);
      }
    }
  } else {
    // Single line / brief input - dynamically generated based on targetCount
    if (targetCount === 1) {
      if (isRapat) {
        pList.push(`Pelaksanaan ${cleanNama} berfokus pada ${detailClean}, guna menyelaraskan pemahaman teknis serta merumuskan langkah operasional.`);
      } else if (isPengolahan) {
        pList.push(`Kegiatan ${cleanNama} mencakup ${detailClean}, yang diselesaikan secara teliti dan terstruktur sesuai standar operasional.`);
      } else if (isLapangan) {
        pList.push(`Pelaksanaan ${cleanNama} difokuskan pada ${detailClean} guna memastikan ketercapaian target dan kualitas hasil pelaksanaan di lokasi sasaran.`);
      } else {
        pList.push(`Kegiatan ${cleanNama} dilaksanakan dengan fokus utama pada ${detailClean}, guna mendukung kelancaran pelaksanaan tugas.`);
      }
    } else if (targetCount === 2) {
      if (isRapat) {
        pList.push(`Pelaksanaan ${cleanNama} diselenggarakan untuk mengulas secara mendalam mengenai ${detailClean}. Pertemuan ini menjadi wadah koordinasi dalam mengidentifikasi perkembangan serta kebutuhan teknis.`);
        pList.push(`Dalam pembahasan tersebut, dirumuskan langkah-langkah tindak lanjut yang konkret agar pelaksanaan kegiatan dapat berjalan efektif dan tepat sasaran.`);
      } else if (isPengolahan) {
        pList.push(`Proses ${cleanNama} diawali dengan persiapan dan pencermatan terhadap ${detailClean}.`);
        pList.push(`Tahap selanjutnya difokuskan pada verifikasi dan pengolahan data guna memastikan ketelitian hasil sebelum difinalisasi.`);
      } else if (isLapangan) {
        pList.push(`Pelaksanaan ${cleanNama} diawali dengan peninjauan di lokasi sasaran yang berfokus pada ${detailClean}.`);
        pList.push(`Selama kegiatan berlangsung, dilakukan evaluasi serta pendampingan teknis guna memastikan seluruh proses berjalan sesuai petunjuk teknis.`);
      } else {
        pList.push(`Kegiatan ${cleanNama} dilaksanakan dengan mengacu pada rincian ${detailClean}.`);
        pList.push(`Seluruh tahapan pekerjaan diselesaikan secara sistematis untuk memastikan hasil yang optimal dan tepat waktu.`);
      }
    } else {
      // 3 Paragraphs
      if (isRapat) {
        pList.push(`Pelaksanaan ${cleanNama} diselenggarakan sebagai bentuk koordinasi teknis, dengan agenda utama pembahasan mengenai ${detailClean}.`);
        pList.push(`Dalam sesi diskusi, dilakukan penelaahan terhadap perkembangan pencapaian, evaluasi kendala operasional, serta pembahasan opsi solusi yang efisien.`);
        pList.push(`Hasil pertemuan merumuskan rencana tindak lanjut dan pembagian peran kerja agar implementasi kegiatan berjalan terarah dan sesuai target.`);
      } else if (isPengolahan) {
        pList.push(`Kegiatan ${cleanNama} dimulai dengan pencermatan berkas pendukung terkait ${detailClean}.`);
        pList.push(`Tahap pengolahan dilanjutkan dengan validasi serta pemeriksaan konsistensi data untuk meminimalisasi potensi kesalahan.`);
        pList.push(`Sebagai tahap akhir, data yang telah diverifikasi disimpan ke dalam sistem untuk mendukung kebutuhan penyusunan laporan.`);
      } else if (isLapangan) {
        pList.push(`Pelaksanaan ${cleanNama} berlangsung di lokasi sasaran dengan fokus utama pada ${detailClean}.`);
        pList.push(`Rangkaian kegiatan mencakup pemeriksaan kualitas pelaksanaan, pendampingan petugas, serta pencatatan kendala di lapangan.`);
        pList.push(`Hasil pemantauan ditindaklanjuti dengan pengarahan teknis agar target pelaksanaan dapat diselesaikan tepat waktu.`);
      } else {
        pList.push(`Rangkaian kegiatan ${cleanNama} diawali dengan tahap persiapan dan pencermatan terhadap ${detailClean}.`);
        pList.push(`Selanjutnya, pelaksanaan tugas dilakukan secara bertahap dengan memperhatikan kecermatan pada setiap proses.`);
        pList.push(`Seluruh rangkaian pekerjaan ditutup dengan penyusunan pelaporan hasil kegiatan.`);
      }
    }
  }

  const resultStr = pList.join('\n\n');
  return normalizeNonBakuToBaku(resultStr).replace(/\*/g, '').replace(/\.{2,}/g, '.').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
}
