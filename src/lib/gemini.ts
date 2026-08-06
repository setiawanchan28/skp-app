import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): Promise<string> {
  const prompt = `Anda adalah Penyusun Laporan Resmi Badan Pusat Statistik (BPS) Kabupaten Lebak yang sangat berpengalaman.
Tugas Anda adalah merangkai poin-poin mentah (yang berisi aksi kegiatan, lokasi/desa, serta nama PML/PPL/petugas) menjadi **SATU PARAGRAF NARRATIF FORMAL BERGAYA BPS RESMI**.

Informasi Input:
- Nama Kegiatan: ${namaKegiatan}
- Catatan / Poin Kegiatan:
${deskripsiKegiatan}

Instruksi Penting Penulisan:
1. OLOSH DAN RANGKAI MENJADI PARAGRAF UTUH YANG SANGAT MENGALIR DAN NATURAL (JANGAN sekadar menempelkan kata "serta" atau mentranskrip poin secara kaku).
2. Jika ada informasi Lokasi/Desa/Kecamatan, integrasikan dengan alami (misal: "bertempat di Desa Aweh", "berlokasi di wilayah Blok Sensus Desa...").
3. Jika ada nama petugas/PML/PPL, integrasikan dengan alami (misal: "didampingi oleh PML Ibu Sundari dan PPL Fahmi", "bersama tim pencacah...").
4. Hubungkan aksi kegiatan secara logis (misal: "Supervisi diawali dengan mendampingi petugas di lapangan guna memastikan batas wilayah blok sensus, kemudian dilanjutkan dengan memvalidasi isian kuesioner...").
5. Gunakan Bahasa Indonesia baku resmi BPS (EYD/EBI).
6. LANGSUNG tulis isi paragraf ringkasan tanpa kata pembuka seperti "Berikut ringkasannya:".`;

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
 * Intelligent Natural Narrative Composer for Official BPS Reports
 * Automatically categorizes actions, location (Desa/Kec), and personnel (PML/PPL)
 */
function composeNaturalBpsNarrative(namaKegiatan: string, deskripsiKegiatan: string): string {
  const lines = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return `Melaksanakan kegiatan ${namaKegiatan} sesuai dengan standar operasional prosedur BPS Kabupaten Lebak guna menjamin kualitas data statistik yang dihasilkan.`;
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

  // Build fluid narrative
  let narrative = `Kegiatan ${namaKegiatan}`;

  // Add location if present
  if (locations.length > 0) {
    const locText = locations.join(', ');
    narrative += ` yang dilaksanakan di ${locText}`;
  } else {
    narrative += ` yang dilaksanakan oleh jajaran BPS Kabupaten Lebak`;
  }

  // Add personnel if present
  if (personnel.length > 0) {
    const persText = personnel.join(' serta ');
    narrative += ` bersama ${persText}`;
  }

  narrative += ` berjalan dengan tertib dan lancar. `;

  // Add actions gracefully
  if (actions.length === 1) {
    const act = cleanActionText(actions[0]);
    narrative += `Fokus utama kegiatan ini meliputi ${act} untuk memastikan kelancaran pencacahan di lapangan.`;
  } else if (actions.length === 2) {
    const act1 = cleanActionText(actions[0]);
    const act2 = cleanActionText(actions[1]);
    narrative += `Pelaksanaan diawali dengan ${act1}, kemudian dilanjutkan dengan ${act2} guna menjaga keakuratan data.`;
  } else if (actions.length >= 3) {
    const act1 = cleanActionText(actions[0]);
    const act2 = cleanActionText(actions[1]);
    const actRest = actions.slice(2).map(cleanActionText).join(', serta ');
    narrative += `Pelaksanaan diawali dengan ${act1}, dilanjutkan dengan ${act2}, serta ${actRest} untuk memastikan seluruh tahapan sesuai dengan SOP BPS.`;
  }

  return narrative;
}

function cleanActionText(text: string): string {
  let cleaned = text.trim();
  // Lowercase first letter if starting with capital action verb
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }
  return cleaned;
}
