import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): Promise<string> {
  const prompt = `Anda adalah editor laporan resmi Badan Pusat Statistik (BPS) Kabupaten Lebak.
Tugas Anda adalah merangkai poin-poin kegiatan mentah (aksi, lokasi, petugas, tanggal) menjadi **SATU PARAGRAF NARRATIF RESMI BPS YANG ALAMI DAN SANGAT TEPAT TATA BAHASANYA**.

Input Data:
- Nama Kegiatan: ${namaKegiatan}
- Catatan Poin-Poin:
${deskripsiKegiatan}

Instruksi Penulisan:
1. Pisahkan secara cerdas antara:
   - Aksi / Kegiatan (misal: mendampingi petugas, melakukan validasi, menyampaikan perbaikan data)
   - Lokasi (misal: Desa Aweh)
   - Petugas / Personil (misal: PML Bu Sundari dan PPL Fahmi)
   - Keterangan Waktu/Tanggal (abaikan atau padukan secara alami)
2. Rangkai menjadi paragraf naratif utuh yang logis dan enak dibaca.
3. CONTOH HASIL YANG DIHARAPKAN:
   "${namaKegiatan} dilaksanakan di Desa Aweh bersama PML Bu Sundari dan PPL Fahmi. Rangkaian kegiatan meliputi mendampingi petugas pencacah di wilayah sampel, melakukan validasi isian kuesioner digital/fisik, memastikan kewilayahan pencacahan sesuai batas blok sensus, serta menyampaikan perbaikan anomali data."
4. DILARANG menggunakan kata seremonial seperti "berjalan tertib dan lancar".
5. DILARANG salah mengelompokkan kata (misal: kata "mendampingi petugas" ADALAH AKSI, BUKAN NAMA PERSONIL).
6. LANGSUNG tuliskan kalimat ringkasan tanpa pembuka seperti "Berikut ringkasannya:".`;

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
 * Robust Smart Categorizer & Narrative Composer
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
    // 1. Check if date line (e.g. "6 agustus 2026")
    if (datePattern.test(line)) {
      continue; // Skip date line as it's already in the date field
    }

    const lower = line.toLowerCase();

    // 2. Check if action verb (mendampingi, melakukan, memastikan, menyampaikan, memeriksa, membahas, mengikuti, dll)
    const isActionVerb = /^(mendampingi|melakukan|memastikan|menyampaikan|memeriksa|membahas|mengikuti|menyusun|mengolah|memandu|melaksanakan|mengevaluasi)/i.test(line);

    if (isActionVerb) {
      actions.push(line);
      continue;
    }

    // 3. Check if location line (Desa, Kecamatan, Blok Sensus, BS, Kelurahan, dll)
    if (lower.startsWith('desa ') || lower.startsWith('kecamatan ') || lower.startsWith('kelurahan ') || lower.startsWith('blok sensus') || lower.startsWith('bs ') || lower.startsWith('wilayah ')) {
      locations.push(line);
      continue;
    }

    // 4. Check if personnel line (PML, PPL, Koordinator, Tim, dll)
    if (lower.startsWith('pml') || lower.startsWith('ppl') || lower.startsWith('koordinator') || lower.startsWith('tim ') || lower.startsWith('oleh ')) {
      personnel.push(line);
      continue;
    }

    // Default to action
    actions.push(line);
  }

  // Build fluid BPS Narrative
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

  // Process Action Points cleanly
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
