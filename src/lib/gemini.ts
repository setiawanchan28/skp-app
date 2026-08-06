import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): Promise<string> {
  const prompt = `Anda adalah asisten kecerdasan buatan resmi untuk penyusunan Laporan Harian Kerja Badan Pusat Statistik (BPS).
Tugas Anda adalah merangkum deskripsi kegiatan harian pegawai BPS menjadi ringkasan kegiatan formal, profesional, dan ringkas dalam Bahasa Indonesia baku resmi (gaya bahasa Laporan Bukti Dukung Kegiatan BPS).

Informasi Kegiatan:
- Nama Kegiatan: ${namaKegiatan}
- Catatan / Deskripsi Kegiatan:
${deskripsiKegiatan}

Aturan Penulisan:
1. Gunakan Bahasa Indonesia formal (EYD / EBI) sesuai standar laporan resmi instansi BPS.
2. Gunakan kata kerja berimbuhan me- (seperti Melaksanakan, Mengikuti, Menyusun, Melakukan, Merumuskan, Mengolah).
3. Buat dalam 1-2 kalimat (sekitar 30 - 60 kata) yang padat, jelas, dan menggambarkan hasil/tujuan kegiatan.
4. Jangan menambahkan kalimat pembuka atau penutup seperti "Berikut ringkasannya:" atau tanda petik. Langsung ke isi ringkasan.`;

  try {
    if (!apiKey || apiKey.includes('DummyKey')) {
      // Fallback generator when API key is default/demo
      return mockBpsSummary(namaKegiatan, deskripsiKegiatan);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim() || mockBpsSummary(namaKegiatan, deskripsiKegiatan);
  } catch (error) {
    console.warn('Gemini API call warning, using fallback synthesizer:', error);
    return mockBpsSummary(namaKegiatan, deskripsiKegiatan);
  }
}

function mockBpsSummary(namaKegiatan: string, deskripsiKegiatan: string): string {
  const cleanDesk = deskripsiKegiatan.replace(/[-*•]/g, '').trim().split('\n').filter(Boolean).join(', ');
  return `Melaksanakan kegiatan ${namaKegiatan} dengan ${cleanDesk || 'menuntaskan seluruh tahapan sesuai petunjuk teknis dan standar operasional prosedur BPS Kab. Lebak'}.`;
}
