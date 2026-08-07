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
  const formattedDateRange = formatDateIndonesian(laporan.tanggal, laporan.tanggal_selesai);
  const dates = generateDateList(laporan.tanggal, laporan.tanggal_selesai);
  const allPhotos = laporan.fotos || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preview Bukti Dukung BPS" maxWidth="4xl">
      <div className="space-y-6">
        {/* PDF Document Render Preview */}
        <div className="bg-white border border-slate-400 shadow-2xl rounded-sm p-8 max-w-2xl mx-auto space-y-6 font-sans text-black">
          {/* Header Logo & Titles */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-3 pb-1">
              {hasCustomLogo ? (
                <img
                  src={BPS_CONFIG.logoPath}
                  alt="Logo BPS"
                  className="h-16 w-auto object-contain mx-auto"
                />
              ) : (
                <div className="text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="w-5 h-4 bg-sky-500 rounded-2xs inline-block" />
                      <span className="w-5 h-4 bg-orange-500 rounded-2xs inline-block" />
                    </div>
                    <span className="w-5 h-4 bg-emerald-500 rounded-2xs inline-block" />
                  </div>
                  <h2 className="text-xs font-extrabold text-black tracking-tight mt-1 uppercase">
                    {BPS_CONFIG.instansi}
                  </h2>
                </div>
              )}
            </div>

            <div className="pt-1 space-y-0.5">
              <h1 className="text-sm font-extrabold tracking-wide uppercase">
                {BPS_CONFIG.judulLaporan}
              </h1>
              <h2 className="text-xs font-extrabold tracking-wide uppercase">
                BADAN PUSAT STATISTIK KABUPATEN LEBAK TAHUN {dateYear}
              </h2>
            </div>
          </div>

          {/* Bagian I Table */}
          <div className="border border-black">
            <div className="bg-[#F8C48C] border-b border-black py-1.5 text-center font-bold text-xs text-black uppercase tracking-wider">
              I. KETERANGAN PELAKSANA
            </div>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-black">
                  <td className="w-8 p-2 text-center border-r border-black font-semibold">1.</td>
                  <td className="w-32 p-2 border-r border-black font-bold uppercase">NAMA</td>
                  <td className="w-4 p-2 text-center border-r border-black font-bold">:</td>
                  <td className="p-2 font-medium">{laporan.nama_pegawai}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 text-center border-r border-black font-semibold">2.</td>
                  <td className="p-2 border-r border-black font-bold uppercase">JABATAN</td>
                  <td className="p-2 text-center border-r border-black font-bold">:</td>
                  <td className="p-2 font-medium">{laporan.jabatan}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 text-center border-r border-black font-semibold">3.</td>
                  <td className="p-2 border-r border-black font-bold uppercase">NIP</td>
                  <td className="p-2 text-center border-r border-black font-bold">:</td>
                  <td className="p-2 font-mono font-medium">{laporan.nip}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 text-center border-r border-black font-semibold">4.</td>
                  <td className="p-2 border-r border-black font-bold uppercase">KEGIATAN</td>
                  <td className="p-2 text-center border-r border-black font-bold">:</td>
                  <td className="p-2 font-bold">{laporan.nama_kegiatan}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 text-center border-r border-black font-semibold">5.</td>
                  <td className="p-2 border-r border-black font-bold uppercase">TANGGAL</td>
                  <td className="p-2 text-center border-r border-black font-bold">:</td>
                  <td className="p-2 font-semibold text-slate-800">{formattedDateRange}</td>
                </tr>
                <tr>
                  <td className="p-2 text-center border-r border-black font-semibold">6.</td>
                  <td className="p-2 border-r border-black font-bold uppercase">RINGKASAN</td>
                  <td className="p-2 text-center border-r border-black font-bold">:</td>
                  <td className="p-2 leading-relaxed text-justify whitespace-pre-wrap">
                    {laporan.ringkasan_kegiatan}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bagian II Dokumentasi Tables */}
          <div className="space-y-6">
            {dates.map((dItem, dIdx) => {
              const isMultiDate = dates.length > 1;
              let datePhotos: LaporanFoto[] = [];

              if (isMultiDate) {
                datePhotos = allPhotos.filter((p) => p.tanggal_foto === dItem.dateStr);
                if (datePhotos.length === 0) {
                  const photosPerDay = Math.ceil(allPhotos.length / dates.length);
                  const startIdx = dIdx * photosPerDay;
                  datePhotos = allPhotos.slice(startIdx, startIdx + photosPerDay);
                }
              } else {
                datePhotos = allPhotos;
              }

              const secHeaderTitle = isMultiDate
                ? `II. DOKUMENTASI (${dItem.label.toUpperCase()})`
                : 'II. DOKUMENTASI';

              return (
                <div key={dItem.dateStr} className="border border-black">
                  <div className="bg-[#F8C48C] border-b border-black py-1.5 text-center font-bold text-xs text-black uppercase tracking-wider">
                    {secHeaderTitle}
                  </div>

                  <div className="p-3">
                    {datePhotos.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs italic">
                        Tidak ada foto dokumentasi terlampir
                      </div>
                    ) : datePhotos.length === 1 ? (
                      <div className="flex flex-col items-center justify-center p-2">
                        <div className="border border-slate-300 rounded overflow-hidden max-w-sm h-56 bg-white flex items-center justify-center p-1 w-full">
                          <img
                            src={getDirectImageUrl(datePhotos[0])}
                            alt="Dokumentasi"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {datePhotos.map((foto, idx) => {
                          const imgSrc = getDirectImageUrl(foto);
                          return (
                            <div
                              key={idx}
                              className="border border-slate-300 rounded overflow-hidden h-44 bg-white flex items-center justify-center p-1"
                            >
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={`Dokumentasi #${idx + 1}`}
                                  className="max-w-full max-h-full object-contain"
                                />
                              ) : (
                                <FileText className="w-8 h-8 text-slate-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-2 text-center text-xs space-y-0.5 border-t border-black bg-slate-50">
                    <p className="font-bold text-black">{laporan.nama_kegiatan}</p>
                    <p className="text-slate-700 text-[11px]">{dItem.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Address */}
          <div className="pt-4 text-center text-[10px] text-slate-700 space-y-0.5">
            <p>{BPS_CONFIG.alamatFooter}</p>
            <p>{BPS_CONFIG.contactFooter}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {laporan.drive_pdf_url && (
            <a
              href={laporan.drive_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 hover:text-sky-700 underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka File di Google Drive</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </Modal>
  );
};
