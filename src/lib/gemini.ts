import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  namaPegawai?: string,
  jumlahParagraf: string = 'auto'
): Promise<string> {
  let paragraphInstruction = 'Tulis ringkasan naratif secara proporsional (1-3 paragraf jika materi cukup panjang).';
  if (jumlahParagraf === '1') {
    paragraphInstruction = 'Wajib tuliskan ringkasan naratif dalam TEPAT 1 PARAGRAF UTUH.';
  } else if (jumlahParagraf === '2') {
    paragraphInstruction = 'Wajib bagi ringkasan naratif menjadi TEPAT 2 PARAGRAF RAPI yang terpisah oleh dua kali perpindahan baris (line break).';
  } else if (jumlahParagraf === '3') {
    paragraphInstruction = 'Wajib bagi ringkasan naratif menjadi TEPAT 3 PARAGRAF RAPI yang terpisah oleh dua kali perpindahan baris (line break).';
  }

  const prompt = `Anda adalah asisten penyusunan ringkasan Bukti Dukung Kegiatan Harian Pegawai BPS.
Tugas Anda adalah merangkai poin-poin kegiatan mentah menjadi **NARASI RESMI BPS YANG MENGALIR DAN PROFESIONAL**.

Informasi Input:
- Nama Kegiatan: ${namaKegiatan}
- Catatan Poin Kegiatan:
${deskripsiKegiatan}

Instruksi Penulisan Penting:
1. INSTRUKSI PARAGRAF: ${paragraphInstruction}
2. LANGSUNG KE INTI KEGIATAN: DILARANG menyebut nama instansi ("BPS Kabupaten Lebak...") dan DILARANG menyebut nama pegawai di awal kalimat. LANGSUNG awali dengan KATA KERJA AKTIF (seperti "Melaksanakan...", "Mengikuti...", "Melakukan...", "Mengolah...").
3. CONTOH GAYA BAHASA RESMI BPS:
   "Melaksanakan kegiatan ${namaKegiatan} di Desa Aweh bersama PML Sundari dan PPL Fahmi. Rangkaian kegiatan berfokus pada pendampingan langsung di wilayah sampel, validasi kelengkapan serta konsistensi isian kuesioner digital maupun fisik, sekaligus menyampaikan arahan teknis mengenai perbaikan anomali data demi menjaga mutu dan akurasi data hasil lapangan."
4. DILARANG menggunakan frasa seremonial kaku seperti "berjalan tertib dan lancar".
5. DILARANG menambahkan kata pembuka seperti "Berikut ringkasan:". LANGSUNG ke isi paragraf narasi.`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeCustomParagraphNarrative(namaKegiatan, deskripsiKegiatan, jumlahParagraf);
    }

    // 1. Try Official SDK with Updated Gemini Models
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        if (text && text.trim().length > 20) {
          text = text.replace(/^(berikut adalah|berikut ringkasan|berikut narasi)[^:\n]*[:\n]\s*/i, '').trim();
          text = text.replace(/^"|"$/g, '').trim();
          return text;
        }
      } catch (modelErr) {
        console.warn(`Model ${modelName} call failed, trying next...`);
      }
    }

    // 2. Direct REST API Call Fallback
    try {
      const restRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (restRes.ok) {
        const json = await restRes.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && rawText.trim().length > 20) {
          let clean = rawText.replace(/^(berikut adalah|berikut ringkasan|berikut narasi)[^:\n]*[:\n]\s*/i, '').trim();
          clean = clean.replace(/^"|"$/g, '').trim();
          return clean;
        }
      }
    } catch (e) {}

    return composeCustomParagraphNarrative(namaKegiatan, deskripsiKegiatan, jumlahParagraf);
  } catch (error) {
    console.warn('Gemini API error, using custom narrative composer:', error);
    return composeCustomParagraphNarrative(namaKegiatan, deskripsiKegiatan, jumlahParagraf);
  }
}

/**
 * Custom Paragraph Offline Narrative Composer
 */
function composeCustomParagraphNarrative(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  jumlahParagraf: string
): string {
  const lines = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return `Melaksanakan kegiatan ${namaKegiatan} sesuai petunjuk teknis dan standar operasional prosedur yang berlaku.`;
  }

  let locations: string[] = [];
  let personnel: string[] = [];
  let actions: string[] = [];

  const datePattern = /(\d{1,2}\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|\d{1,2})\s+\d{2,4})|(\d{4}-\d{2}-\d{2})/i;

  for (const line of lines) {
    if (datePattern.test(line)) continue;
    const lower = line.toLowerCase();
    const isActionVerb = /^(mendampingi|melakukan|memastikan|menyampaikan|memeriksa|membahas|mengikuti|menyusun|mengolah|memandu|melaksanakan|mengevaluasi)/i.test(line);

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

  let p1 = `Melaksanakan kegiatan ${namaKegiatan}`;
  if (locations.length > 0) p1 += ` di ${locations.join(', ')}`;
  if (personnel.length > 0) p1 += ` bersama ${personnel.join(' serta ')}`;
  p1 += `. `;

  if (actions.length > 0) {
    const formatted = actions.map((a) => a.charAt(0).toLowerCase() + a.slice(1));
    p1 += `Rangkaian kegiatan meliputi ${formatted.join(', ')}.`;
  }

  if (jumlahParagraf === '2') {
    const p2 = `Melalui kegiatan ini, koordinasi teknis dan verifikasi data di lapangan ditingkatkan guna menjamin kelengkapan serta keakuratan informasi statistik yang dihasilkan.`;
    return `${p1}\n\n${p2}`;
  }

  if (jumlahParagraf === '3') {
    const p2 = `Selama pelaksanaan di lapangan, verifikasi dilakukan secara mendalam pada setiap dokumen kuesioner untuk mengidentifikasi serta memperbaiki anomali data secara langsung.`;
    const p3 = `Langkah ini diambil demi menjaga integritas data dan memastikan seluruh prosedur pendataan telah memenuhi standar metodologi statistik BPS.`;
    return `${p1}\n\n${p2}\n\n${p3}`;
  }

  return p1;
}
