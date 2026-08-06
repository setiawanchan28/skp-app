import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  namaPegawai?: string
): Promise<string> {
  const pelaksana = namaPegawai ? namaPegawai.trim() : '';

  const prompt = `Anda adalah asisten pembuatan Laporan Harian Kerja PRIBADI pegawai BPS.
Tugas Anda adalah merangkai poin-poin kegiatan mentah menjadi **SATU PARAGRAF NARASI RESMI LAPORAN PRIBADI PEGAWAI**.

Informasi Input:
- Pelaksana / Nama Pegawai: ${pelaksana || 'Pegawai'}
- Nama Kegiatan: ${namaKegiatan}
- Catatan Poin Kegiatan:
${deskripsiKegiatan}

Instruksi Penulisan Penting:
1. SUDUT PANDANG PRIBADI: Ini adalah Laporan Harian PRIBADI. JANGAN menyebut "BPS Kabupaten Lebak melaksanakan...". Sebutkan nama pelaksana (${pelaksana || 'pegawai'}) atau langsung gunakan kata kerja "Melaksanakan...".
2. CONTOH HASIL YANG DIHARAPKAN:
   "Dalam upaya menjamin mutu dan akurasi data hasil lapangan, ${pelaksana || 'Pelaksana'} melaksanakan kegiatan ${namaKegiatan} di Desa Aweh bersama PML Sundari dan PPL Fahmi. Kegiatan berfokus pada pendampingan langsung di wilayah sampel, validasi kelengkapan serta konsistensi isian kuesioner digital maupun fisik, sekaligus menyampaikan arahan teknis mengenai perbaikan anomali data demi menjaga integritas data yang dihasilkan."
3. DILARANG menggunakan kata seremonial kaku "berjalan tertib dan lancar".
4. DILARANG menambahkan kata pembuka seperti "Berikut narasi laporan:". LANGSUNG ke isi paragraf.`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composePersonalBpsNarrative(namaKegiatan, deskripsiKegiatan, pelaksana);
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

    return composePersonalBpsNarrative(namaKegiatan, deskripsiKegiatan, pelaksana);
  } catch (error) {
    console.warn('Gemini API error, using personal narrative composer:', error);
    return composePersonalBpsNarrative(namaKegiatan, deskripsiKegiatan, pelaksana);
  }
}

/**
 * Clean Personal Narrative Composer for Offline Mode
 */
function composePersonalBpsNarrative(
  namaKegiatan: string,
  deskripsiKegiatan: string,
  namaPegawai: string
): string {
  const lines = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  const subject = namaPegawai ? namaPegawai : 'Pelaksana';

  if (lines.length === 0) {
    return `${subject} melaksanakan kegiatan ${namaKegiatan} sesuai petunjuk teknis dan standar operasional prosedur yang berlaku.`;
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

  let narrative = `Dalam upaya menjaga kualitas data, ${subject} melaksanakan kegiatan ${namaKegiatan}`;

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
      narrative += `Rangkaian kegiatan berfokus pada ${formattedActions.join(', ')}, serta ${lastAction}.`;
    }
  }

  return narrative;
}
