import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): Promise<string> {
  const prompt = `Anda adalah seorang Penulis Laporan Resmi dan Statistisi Senior di Badan Pusat Statistik (BPS) Kabupaten Lebak.
Tugas Anda adalah mengubah poin-poin atau deskripsi singkat kegiatan menjadi **PARAGRAF NARRATIF FORMAL (GAYA BAHASA LAPORAN BUKTI DUKUNG BPS)**.

Informasi Input:
- Nama Kegiatan: ${namaKegiatan}
- Poin-Poin / Catatan Kegiatan:
${deskripsiKegiatan}

Instruksi Penulisan Paragraf Ringkasan BPS:
1. TULIS DALAM PARAGRAF UTUH (bukan berupa daftar poin atau sekadar menggabungkan kalimat dengan koma).
2. Susun narasi secara mengalir dan sistematis. Gunakan kata penghubung formal seperti: "Kegiatan diawali dengan...", "kemudian dilanjutkan dengan...", "selain itu disampaikan...", "serta merumuskan solusi dan langkah-langkah...".
3. Gunakan Bahasa Indonesia baku resmi (EYD/EBI) dengan kata kerja aktif berimbuhan me- (Melaksanakan, Mengikuti, Menyusun, Melakukan, Merumuskan, Mengolah).
4. Contoh Gaya Bahasa BPS Resmi yang diharapkan:
   "${namaKegiatan} yang dilaksanakan secara tatap muka/daring diikuti oleh seluruh tim kerja. Kegiatan diawali dengan pembukaan dan arahan terkait target kinerja, kemudian dilanjutkan dengan pembahasan progres capaian pendataan di masing-masing wilayah. Selain itu, peserta menyampaikan berbagai kendala yang dihadapi selama di lapangan serta mendiskusikan solusi dan langkah-langkah yang perlu dilakukan untuk menjaga kualitas data."
5. DILARANG menambahkan teks pembuka seperti "Berikut adalah ringkasannya:" atau tanda petik. LANGSUNG ke isi paragraf laporan.`;

  try {
    if (!apiKey || apiKey.includes('DummyKey') || apiKey.includes('AIzaSyDummy')) {
      return composeSmartBpsNarrative(namaKegiatan, deskripsiKegiatan);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text && text.trim().length > 20) {
      return text.trim();
    }
    return composeSmartBpsNarrative(namaKegiatan, deskripsiKegiatan);
  } catch (error) {
    console.warn('Gemini API call warning, using smart narrative composer:', error);
    return composeSmartBpsNarrative(namaKegiatan, deskripsiKegiatan);
  }
}

/**
 * Smart Offline/Fallback Narrative Composer for Official BPS Report Style
 */
function composeSmartBpsNarrative(namaKegiatan: string, deskripsiKegiatan: string): string {
  const points = deskripsiKegiatan
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (points.length === 0) {
    return `${namaKegiatan} yang dilaksanakan oleh Tim Kerja BPS Kabupaten Lebak berjalan dengan lancar sesuai Standar Operasional Prosedur (SOP) dan petunjuk teknis yang berlaku guna mendukung penyediaan data statistik yang berkualitas.`;
  }

  let paragraph = `${namaKegiatan} yang dilaksanakan oleh jajaran BPS Kabupaten Lebak berjalan secara tertib dan lancar. `;

  if (points.length === 1) {
    paragraph += `Kegiatan ini berfokus pada ${points[0].toLowerCase()} guna memastikan kelancaran pelaksanaan tugas dan ketercapaian target yang telah ditetapkan.`;
  } else if (points.length === 2) {
    paragraph += `Tahapan kegiatan diawali dengan ${points[0].toLowerCase()}, kemudian dilanjutkan dengan ${points[1].toLowerCase()} untuk menjaga kualitas hasil pelaksanaan kerja.`;
  } else {
    const first = points[0].toLowerCase();
    const second = points[1].toLowerCase();
    const rest = points.slice(2).map((p) => p.toLowerCase()).join(' serta ');

    paragraph += `Kegiatan diawali dengan ${first}, kemudian dilanjutkan dengan ${second}. Selain itu, peserta juga melakukan ${rest} guna mempercepat pencapaian target dan menjaga mutu data statistik BPS Kabupaten Lebak.`;
  }

  return paragraph;
}
