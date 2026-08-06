import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): Promise<string> {
  const prompt = `Anda adalah Penulis Laporan Resmi Badan Pusat Statistik (BPS) Kabupaten Lebak.
Tugas Anda adalah merangkai poin-poin mentah kegiatan (termasuk aksi, lokasi desa, petugas PML/PPL, dan perbaikan anomali data) menjadi **SATU PARAGRAF RESMI LAPORAN BPS (NARRATIF, MENGALIR, DAN SANGAT PROFESIONAL)**.

Informasi Input:
- Nama Kegiatan: ${namaKegiatan}
- Catatan Poin:
${deskripsiKegiatan}

Instruksi Penulisan:
1. Rangkai menjadi 1 paragraf naratif resmi BPS yang elegan, padat, dan mengalir.
2. DILARANG menggunakan kata-kata pembuka seperti "Berikut adalah narasi...", "Berikut ringkasannya:", atau tanda petik. LANGSUNG ke kalimat awal paragraf laporan.
3. DILARANG menggunakan kata seremonial kaku seperti "berjalan tertib dan lancar".
4. Hubungkan nama lokasi, PML/PPL, dan aksi kegiatan secara natural dan tepat tata bahasanya.`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeNaturalBpsNarrative(namaKegiatan, deskripsiKegiatan);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use working model aliases for Gemini API
    const modelCandidates = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    
    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        if (text && text.trim().length > 20) {
          // Clean intro phrases if any
          text = text.replace(/^(berikut adalah|berikut ringkasan|berikut narasi)[^:\n]*[:\n]\s*/i, '').trim();
          text = text.replace(/^"|"$/g, '').trim();
          return text;
        }
      } catch (modelErr) {
        console.warn(`Model ${modelName} call failed, trying next candidate...`);
      }
    }

    return composeNaturalBpsNarrative(namaKegiatan, deskripsiKegiatan);
  } catch (error) {
    console.warn('Gemini API call error, using natural narrative composer:', error);
    return composeNaturalBpsNarrative(namaKegiatan, deskripsiKegiatan);
  }
}

/**
 * Clean & Direct Narrative Composer for Offline Mode
 */
function composeNaturalBpsNarrative(namaKegiatan: string, deskripsiKegiatan: string): string {
  const lines = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return `Pelaksanaan kegiatan ${namaKegiatan} sesuai petunjuk teknis dan standar operasional prosedur BPS Kabupaten Lebak.`;
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

  let narrative = `Kegiatan ${namaKegiatan}`;

  if (locations.length > 0) {
    narrative += ` dilaksanakan di ${locations.join(', ')}`;
  } else {
    narrative += ` dilaksanakan oleh jajaran BPS Kabupaten Lebak`;
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
      narrative += `Kegiatan meliputi ${formattedActions[0]}.`;
    } else if (formattedActions.length === 2) {
      narrative += `Kegiatan meliputi ${formattedActions[0]} serta ${formattedActions[1]}.`;
    } else {
      const lastAction = formattedActions.pop();
      narrative += `Rangkaian kegiatan meliputi ${formattedActions.join(', ')}, serta ${lastAction}.`;
    }
  }

  return narrative;
}
