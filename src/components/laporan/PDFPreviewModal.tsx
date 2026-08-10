'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Laporan, LaporanFoto } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG, BULAN_INDONESIA } from '@/constants/bpsConfig';
import { ExternalLink, FileText } from 'lucide-react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  laporan: Laporan | null;
}

function generateDateList(startDateStr: string, endDateStr?: string): { dateStr: string; label: string }[] {
  if (!endDateStr || startDateStr === endDateStr) {
    return [{ dateStr: startDateStr, label: formatDateIndonesian(startDateStr) }];
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return [{ dateStr: startDateStr, label: formatDateIndonesian(startDateStr) }];
  }

  const list: { dateStr: string; label: string }[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const label = `${curr.getDate()} ${BULAN_INDONESIA[curr.getMonth()]} ${yyyy}`;
    list.push({ dateStr: iso, label });
    curr.setDate(curr.getDate() + 1);
  }
  return list;
}

function extractDriveFileId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];
  return null;
}

function getDirectImageUrl(foto: LaporanFoto): string {
  if (foto.previewUrl && foto.previewUrl.startsWith('data:image')) {
    return foto.previewUrl;
  }
  if (foto.previewUrl && foto.previewUrl.startsWith('http')) {
    return foto.previewUrl;
  }
  const fileId = foto.drive_file_id || extractDriveFileId(foto.drive_file_url);
  if (fileId && !fileId.startsWith('preview_')) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return foto.drive_file_url || foto.previewUrl || '';
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  laporan,
}) => {
  const [hasCustomLogo, setHasCustomLogo] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = BPS_CONFIG.logoPath;
    img.onload = () => setHasCustomLogo(true);
    img.onerror = () => setHasCustomLogo(false);
  }, []);

  if (!laporan) return null;

  const dateYear = new Date(laporan.tanggal || Date.now()).getFullYear();
  const isPenugasan = laporan.jenis_laporan === 'penugasan';
  const allPhotos = laporan.fotos || [];
  const petugasList = laporan.petugas_ditemui || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isPenugasan ? 'Preview Laporan Penugasan BPS' : 'Preview Bukti Dukung BPS'} maxWidth="4xl">
      <div className="space-y-4 sm:space-y-6">
        {/* Responsive Document Scroll Wrapper */}
        <div className="overflow-x-auto pb-2 -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="bg-white border border-slate-300 shadow-xl rounded-sm p-4 sm:p-8 min-w-[320px] max-w-2xl mx-auto space-y-5 sm:space-y-6 font-sans text-black">
            {/* Header Logo & Titles */}
            <div className="text-center space-y-2 sm:space-y-3">
              <div className="flex justify-center mb-2 sm:mb-3 pb-1">
                {hasCustomLogo ? (
                  <img
                    src={BPS_CONFIG.logoPath}
                    alt="Logo BPS"
                    className="h-12 sm:h-16 w-auto object-contain mx-auto"
                  />
                ) : (
                  <div className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-4 h-3.5 bg-sky-500 rounded-2xs inline-block" />
                        <span className="w-4 h-3.5 bg-orange-500 rounded-2xs inline-block" />
                      </div>
                      <span className="w-4 h-3.5 bg-emerald-500 rounded-2xs inline-block" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-1 space-y-0.5">
                <h1 className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                  {isPenugasan ? 'LAPORAN PENUGASAN BADAN PUSAT STATISTIK KABUPATEN LEBAK' : BPS_CONFIG.judulLaporan}
                </h1>
                <h2 className="text-[10px] sm:text-xs font-extrabold tracking-wide uppercase">
                  TAHUN {dateYear}
                </h2>
              </div>
            </div>

            {isPenugasan ? (
              /* EXACT PENUGASAN DOCUMENT FORMAT MATCHING LAMPIRAN USER */
              <div className="space-y-4 text-xs">
                {/* I. KETERANGAN PELAKSANA PERJALANAN DINAS */}
                <div className="border border-slate-300 overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                    I. KETERANGAN PELAKSANA PERJALANAN DINAS
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200"><td className="w-1/3 p-2 font-medium">Nama</td><td className="p-2 font-bold">{laporan.nama_pegawai}</td></tr>
                      <tr className="border-b border-slate-200"><td className="p-2 font-medium">Jabatan</td><td className="p-2 font-semibold">{laporan.jabatan}</td></tr>
                      <tr><td className="p-2 font-medium">NIP</td><td className="p-2 font-mono">{laporan.nip}</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* II. KETERANGAN PERJALANAN DINAS (SEPARATE INDIVIDUAL ROWS) */}
                <div className="border border-slate-300 overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                    II. KETERANGAN PERJALANAN DINAS
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/3 p-2 font-medium">Nama Kegiatan</td>
                        <td className="p-2 font-semibold">{laporan.nama_kegiatan}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Tanggal Perjadin</td>
                        <td className="p-2 font-medium">{formatDateIndonesian(laporan.tanggal, laporan.tanggal_selesai)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Tempat Tujuan</td>
                        <td className="p-2 font-semibold">{laporan.tempat_tujuan || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Nomor Surat</td>
                        <td className="p-2 font-mono">{laporan.nomor_surat || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Nomor SPD</td>
                        <td className="p-2 font-mono">{laporan.nomor_spd || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* III. DAFTAR PETUGAS YANG DITEMUI */}
                <div className="border border-slate-300 overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                    III. DAFTAR PETUGAS YANG DITEMUI
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-center">
                        <th className="w-12 p-2 border-r border-slate-300">No</th>
                        <th className="p-2 border-r border-slate-300">Nama</th>
                        <th className="p-2">Jabatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {petugasList.length === 0 ? (
                        <tr className="border-b border-slate-200 text-center">
                          <td className="p-2 border-r border-slate-200">1</td>
                          <td className="p-2 border-r border-slate-200">-</td>
                          <td className="p-2">-</td>
                        </tr>
                      ) : (
                        petugasList.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-2 text-center border-r border-slate-200 font-semibold">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-200 font-semibold">{p.nama}</td>
                            <td className="p-2 font-medium">{p.jabatan}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* IV. RESUME PERJALANAN DINAS */}
                <div className="border border-slate-300 overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                    IV. RESUME PERJALANAN DINAS
                  </div>
                  <div className="p-3 leading-relaxed whitespace-pre-line text-slate-800 text-justify">
                    {laporan.ringkasan_kegiatan}
                  </div>
                </div>

                {/* V. DOKUMENTASI */}
                {allPhotos.length > 0 && (
                  <div className="border border-slate-300 overflow-hidden">
                    <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                      V. DOKUMENTASI
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white">
                      {allPhotos.map((foto, idx) => (
                        <div key={idx} className="border border-slate-200 p-2 text-center rounded bg-white">
                          <img src={getDirectImageUrl(foto)} alt={foto.file_name} className="h-32 w-full object-contain mx-auto rounded" />
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">{foto.file_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LAPORAN HARIAN FORMAT */
              <>
                <div className="border border-black overflow-hidden">
                  <div className="bg-[#F8C48C] border-b border-black py-1.5 text-center font-bold text-[11px] sm:text-xs text-black uppercase tracking-wider">
                    I. KETERANGAN PELAKSANA
                  </div>
                  <table className="w-full text-[11px] sm:text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="w-6 sm:w-8 p-1.5 sm:p-2 text-center border-r border-black font-semibold">1.</td>
                        <td className="w-24 sm:w-32 p-1.5 sm:p-2 border-r border-black font-bold uppercase">NAMA</td>
                        <td className="w-3 sm:w-4 p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{laporan.nama_pegawai}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">2.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">JABATAN</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{laporan.jabatan}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">3.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">NIP</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium font-mono">{laporan.nip}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">4.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">KEGIATAN</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{laporan.nama_kegiatan}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">5.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">TANGGAL</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{formatDateIndonesian(laporan.tanggal, laporan.tanggal_selesai)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">6.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">RINGKASAN</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-normal leading-relaxed whitespace-pre-line text-justify">{laporan.ringkasan_kegiatan}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border border-black overflow-hidden">
                  <div className="bg-[#F8C48C] border-b border-black py-1.5 text-center font-bold text-[11px] sm:text-xs text-black uppercase tracking-wider">
                    II. DOKUMENTASI
                  </div>
                  <div className="p-2 sm:p-4">
                    {allPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-black">
                        {allPhotos.map((foto, idx) => (
                          <div key={idx} className="border border-slate-300 p-2 text-center bg-white">
                            <img src={getDirectImageUrl(foto)} alt={foto.file_name} className="h-32 w-full object-contain mx-auto" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        [ Tidak Ada Foto Dokumentasi Terlampir ]
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Drive Action Link */}
        {laporan.drive_pdf_url && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Berkas PDF resmi tersimpan di Google Drive BPS</span>
            <a
              href={laporan.drive_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Google Drive PDF</span>
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};
