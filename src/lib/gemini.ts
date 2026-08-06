import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): Promise<string> {
  const prompt = `Anda adalah Penyusun Laporan Resmi Badan Pusat Statistik (BPS) Kabupaten Lebak.
Tugas Anda adalah merangkai poin-poin kegiatan (aksi, lokasi/desa, serta PML/PPL/petugas) menjadi **SATU PARAGRAF NARRATIF FORMAL REKAPITULASI BPS**.

Informasi Input:
- Nama Kegiatan: ${namaKegiatan}
- Catatan / Poin Kegiatan:
${deskripsiKegiatan}

Instruksi Penulisan:
1. LANGSUNG KE INTI NARASI (DILARANG menggunakan frasa seremonial seperti "berjalan tertib dan lancar", "berjalan dengan baik", atau pembuka berlebihan).
2. Tulis secara mengalir, ringkas, lugas, dan profesional.
3. Integrasikan Lokasi/Desa dan Personil/PML/PPL secara alami di dalam narasi.
4. Rangkai tindakan/kegiatan secara logis (misal: "Kegiatan ${namaKegiatan} berlokasi di Desa Aweh bersama PML Bu Sundari dan PPL Fahmi. Pelaksanaan diawali dengan mendampingi petugas pencacah di wilayah sampel, dilanjutkan dengan melakukan validasi isian kuesioner digital/fisik, serta memastikan kewilayahan pencacahan sesuai batas blok sensus...").
5. Gunakan Bahasa Indonesia baku resmi BPS (EYD/EBI).
6. DILARANG menggunakan kata pembuka seperti "Berikut ringkasannya:".`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeNaturalBpsNarrative(namaKegiatan, deskripsiKegiatan);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text && text.trim().length > 20) {
      return text.trim();
    }
    return composeNaturalBpsNarrative(namaKegiatan, deskripsiKegiatan);
  } catch (error) {
    console.warn('Gemini API call warning, using natural narrative composer:', error);
    return composeNaturalBpsNarrative(namaKegiatan, deskripsiKegiatan);
  }
}

/**
 * Clean & Direct Narrative Composer for Official BPS Reports (No Fluff)
 */
function composeNaturalBpsNarrative(namaKegiatan: string, deskripsiKegiatan: string): string {
  const lines = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return `Pelaksanaan kegiatan ${namaKegiatan} sesuai dengan petunjuk teknis dan standar operasional prosedur BPS Kabupaten Lebak.`;
  }

  // Categorize inputs
  let locations: string[] = [];
  let personnel: string[] = [];
  let actions: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('desa ') || lower.startsWith('kecamatan ') || lower.startsWith('wilayah ') || lower.includes('lokasi ')) {
      locations.push(line);
    } else if (lower.includes('pml') || lower.includes('ppl') || lower.includes('petugas') || lower.includes('tim ')) {
      personnel.push(line);
    } else {
      actions.push(line);
    }
  }

  // Build direct narrative
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

  // Add actions direct and clean
  if (actions.length === 1) {
    const act = cleanActionText(actions[0]);
    narrative += `Pelaksanaan kegiatan meliputi ${act} guna mendukung penyediaan data statistik BPS.`;
  } else if (actions.length === 2) {
    const act1 = cleanActionText(actions[0]);
    const act2 = cleanActionText(actions[1]);
    narrative += `Pelaksanaan diawali dengan ${act1}, kemudian dilanjutkan dengan ${act2}.`;
  } else if (actions.length >= 3) {
    const act1 = cleanActionText(actions[0]);
    const act2 = cleanActionText(actions[1]);
    const actRest = actions.slice(2).map(cleanActionText).join(', serta ');
    narrative += `Pelaksanaan diawali dengan ${act1}, dilanjutkan dengan ${act2}, serta ${actRest}.`;
  }

  return narrative;
}

function cleanActionText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }
  return cleaned;
}
