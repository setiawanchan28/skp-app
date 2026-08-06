import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  namaPegawai?: string
): Promise<string> {
  const prompt = `Anda adalah asisten penyusunan ringkasan Bukti Dukung Kegiatan Harian Pegawai BPS.
Tugas Anda adalah merangkai poin-poin kegiatan mentah menjadi **SATU PARAGRAF NARASI RESMI DENGAN LANGSUNG KE INTI KEGIATAN**.

Informasi Input:
- Nama Kegiatan: ${namaKegiatan}
- Catatan Poin Kegiatan:
${deskripsiKegiatan}

Instruksi Penulisan Penting:
1. LANGSUNG KE INTI KEGIATAN: DILARANG menyebut nama instansi ("BPS Kabupaten Lebak...") dan DILARANG menyebut nama pegawai/orang di awal kalimat. LANGSUNG awali paragraf dengan KATA KERJA AKTIF (seperti "Melaksanakan...", "Mengikuti...", "Melakukan...", "Mengolah...").
2. CONTOH HASIL YANG DIHARAPKAN:
   "Melaksanakan kegiatan ${namaKegiatan} di Desa Aweh bersama PML Sundari dan PPL Fahmi. Rangkaian kegiatan berfokus pada pendampingan langsung di wilayah sampel, validasi kelengkapan serta konsistensi isian kuesioner digital maupun fisik, sekaligus menyampaikan arahan teknis mengenai perbaikan anomali data demi menjaga mutu dan akurasi data hasil lapangan."
3. DILARANG menggunakan frasa seremonial kaku seperti "berjalan tertib dan lancar".
4. DILARANG menambahkan kata pembuka seperti "Berikut ringkasan:". LANGSUNG ke isi paragraf ringkasan.`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeDirectActionNarrative(namaKegiatan, deskripsiKegiatan);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

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

    return composeDirectActionNarrative(namaKegiatan, deskripsiKegiatan);
  } catch (error) {
    console.warn('Gemini API error, using direct action narrative composer:', error);
    return composeDirectActionNarrative(namaKegiatan, deskripsiKegiatan);
  }
}

/**
 * Direct Action Verb Narrative Composer for Offline Mode
 */
function composeDirectActionNarrative(
  namaKegiatan: string,
  deskripsiKegiatan: string
): string {
  const lines = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return `Melaksanakan kegiatan ${namaKegiatan} sesuai dengan petunjuk teknis dan standar operasional prosedur yang berlaku.`;
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

  let narrative = `Melaksanakan kegiatan ${namaKegiatan}`;

  if (locations.length > 0) {
    narrative += ` di ${locations.join(', ')}`;
  }

  if (personnel.length > 0) {
    narrative += ` bersama ${personnel.join(' serta ')}`;
  }

  narrative += `. `;

  if (actions.length > 0) {
    const formattedActions = actions.map((act) => {
      let clean = act.trim();
      if (clean.length > 0) {
        clean = clean.charAt(0).toLowerCase() + clean.slice(1);
      }
      return clean;
    });

    if (formattedActions.length === 1) {
      narrative += `Kegiatan berfokus pada ${formattedActions[0]}.`;
    } else if (formattedActions.length === 2) {
      narrative += `Kegiatan berfokus pada ${formattedActions[0]} serta ${formattedActions[1]}.`;
    } else {
      const lastAction = formattedActions.pop();
      narrative += `Rangkaian kegiatan meliputi ${formattedActions.join(', ')}, serta ${lastAction}.`;
    }
  }

  return narrative;
}
