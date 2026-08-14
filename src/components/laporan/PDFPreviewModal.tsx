'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Laporan, LaporanFoto } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG, BULAN_INDONESIA, BPS_LOGO_SVG } from '@/constants/bpsConfig';
import { ExternalLink, FileText } from 'lucide-react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  laporan?: Laporan | null;
  laporanData?: any;
}

function extractDriveFileId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];
  return null;
}

function getDirectImageUrl(foto: any): string {
  if (!foto) return '';
  if (typeof foto === 'string') return foto;
  const src = foto.previewUrl || foto.drive_file_url || foto.web_view_url || foto.url || foto.existingUrl || '';
  if (src && (src.startsWith('data:image') || src.startsWith('blob:') || src.startsWith('http'))) {
    return src;
  }
  const fileId = foto.drive_file_id || extractDriveFileId(src);
  if (fileId && !fileId.startsWith('preview_') && !fileId.startsWith('prev_')) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return src;
}

function groupPhotosByDate(photos: any[], startDate: string): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  if (!photos || photos.length === 0) return groups;

  photos.forEach((foto) => {
    const dateKey = foto.tanggal_foto || foto.documentation_date || startDate;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(foto);
  });

  return groups;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  laporan,
  laporanData,
}) => {
  const [hasCustomLogo, setHasCustomLogo] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = BPS_CONFIG.logoPath;
    img.onload = () => setHasCustomLogo(true);
    img.onerror = () => setHasCustomLogo(false);
  }, []);

  const activeLaporan = laporanData || laporan;

  if (!activeLaporan) return null;

  const startDate = activeLaporan.tanggal || activeLaporan.start_date || new Date().toISOString().split('T')[0];
  const endDate = activeLaporan.tanggal_selesai || activeLaporan.end_date || startDate;
  const isDateRange = startDate !== endDate;

  const dateYear = new Date(startDate).getFullYear();
  const isPenugasan = activeLaporan.jenis_laporan === 'penugasan' || activeLaporan.activity_type === 'PERJALANAN_DINAS';
  const allPhotos = activeLaporan.fotos || activeLaporan.documents || [];
  const petugasList = activeLaporan.petugas_ditemui || activeLaporan.people?.map((p: any) => ({ nama: p.person_name, jabatan: p.position })) || [];

  const photoGroups = groupPhotosByDate(allPhotos, startDate);
  const dateKeys = Object.keys(photoGroups).sort();

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
                    className="h-14 sm:h-20 w-auto object-contain mx-auto"
                    onError={() => setHasCustomLogo(false)}
                  />
                ) : (
                  <div
                    className="flex justify-center"
                    dangerouslySetInnerHTML={{ __html: BPS_LOGO_SVG }}
                  />
                )}
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-lg tracking-wide uppercase">
                  {isPenugasan ? 'LAPORAN HASIL PERJALANAN DINAS' : 'BUKTI DUKUNG KEGIATAN HARIAN'}
                </h2>
                <p className="font-bold text-xs sm:text-sm tracking-normal uppercase text-slate-800">
                  BADAN PUSAT STATISTIK KABUPATEN LEBAK TAHUN {dateYear}
                </p>
              </div>
            </div>

            {/* Document Content Sections */}
            {isPenugasan ? (
              /* LAPORAN PERJALANAN DINAS FORMAT */
              <div className="space-y-5 text-xs">
                {/* I. KETERANGAN PELAKSANA PERJALANAN DINAS */}
                <div className="border border-slate-300 overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                    I. KETERANGAN PELAKSANA PERJALANAN DINAS
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200"><td className="w-1/3 p-2 font-medium">Nama</td><td className="p-2 font-bold">{activeLaporan.nama_pegawai}</td></tr>
                      <tr className="border-b border-slate-200"><td className="p-2 font-medium">Jabatan</td><td className="p-2 font-semibold">{activeLaporan.jabatan}</td></tr>
                      <tr><td className="p-2 font-medium">NIP</td><td className="p-2 font-mono">{activeLaporan.nip}</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* II. KETERANGAN PERJALANAN DINAS */}
                <div className="border border-slate-300 overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                    II. KETERANGAN PERJALANAN DINAS
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/3 p-2 font-medium">Nama Kegiatan</td>
                        <td className="p-2 font-semibold">{activeLaporan.name || activeLaporan.nama_kegiatan}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Tanggal Perjadin</td>
                        <td className="p-2 font-medium">{formatDateIndonesian(startDate, endDate)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/3 p-2 font-medium">Tempat Tujuan</td>
                        <td className="p-2 font-semibold">{activeLaporan.destination || activeLaporan.tempat_tujuan || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Nomor Surat</td>
                        <td className="p-2 font-mono">{activeLaporan.letter_number || activeLaporan.nomor_surat || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Nomor SPD</td>
                        <td className="p-2 font-mono">{activeLaporan.spd_number || activeLaporan.nomor_spd || '-'}</td>
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
                        petugasList.map((p: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-2 text-center border-r border-slate-200 font-semibold">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-200 font-semibold">{p.nama || p.person_name}</td>
                            <td className="p-2 font-medium">{p.jabatan || p.position}</td>
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
                    {activeLaporan.description || activeLaporan.ringkasan_kegiatan}
                  </div>
                </div>

                {/* V. DOKUMENTASI PERJALANAN DINAS (Clean layout matching Non-PD) */}
                {allPhotos.length > 0 && (
                  <div className="border border-slate-300 overflow-hidden">
                    <div className="bg-slate-100 p-2 font-bold uppercase border-b border-slate-300">
                      V. DOKUMENTASI
                    </div>

                    {isDateRange && dateKeys.length > 1 ? (
                      <div className="space-y-3 p-3 bg-white">
                        {dateKeys.map((dateKey) => {
                          const datePhotosList = photoGroups[dateKey] || [];
                          return (
                            <div key={dateKey} className="border border-slate-200 rounded overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 py-1 px-3 font-bold text-[11px] text-slate-700 uppercase tracking-wide">
                                Dokumentasi Tanggal: {formatDateIndonesian(dateKey)}
                              </div>
                              <div className="grid grid-cols-2 gap-3 p-2 bg-white">
                                {datePhotosList.map((foto: any, idx: number) => {
                                  const isLastOdd = (datePhotosList.length % 2 !== 0) && (idx === datePhotosList.length - 1);
                                  const imgSrc = getDirectImageUrl(foto);
                                  return (
                                    <div
                                      key={idx}
                                      className={`border border-slate-200 p-2 text-center bg-white ${
                                        isLastOdd ? 'col-span-2 w-full max-w-sm mx-auto' : ''
                                      }`}
                                    >
                                      {imgSrc ? (
                                        <img src={imgSrc} alt="Foto Dokumentasi" className="h-40 w-full object-contain mx-auto rounded" />
                                      ) : (
                                        <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400 italic">
                                          [ Pratinjau Foto ]
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-white">
                        {allPhotos.map((foto: any, idx: number) => {
                          const isLastOdd = (allPhotos.length % 2 !== 0) && (idx === allPhotos.length - 1);
                          const imgSrc = getDirectImageUrl(foto);
                          return (
                            <div
                              key={idx}
                              className={`border border-slate-200 p-2 text-center rounded bg-white ${
                                isLastOdd ? 'col-span-2 w-full max-w-sm mx-auto' : ''
                              }`}
                            >
                              {imgSrc ? (
                                <img src={imgSrc} alt="Foto Dokumentasi" className="h-40 w-full object-contain mx-auto rounded" />
                              ) : (
                                <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400 italic">
                                  [ Pratinjau Foto ]
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                        <td className="p-1.5 sm:p-2 font-medium">{activeLaporan.nama_pegawai}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">2.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">JABATAN</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{activeLaporan.jabatan}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">3.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">NIP</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium font-mono">{activeLaporan.nip}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">4.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">KEGIATAN</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{activeLaporan.name || activeLaporan.nama_kegiatan}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">5.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">TANGGAL</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-medium">{formatDateIndonesian(startDate, endDate)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-semibold">6.</td>
                        <td className="p-1.5 sm:p-2 border-r border-black font-bold uppercase">RINGKASAN</td>
                        <td className="p-1.5 sm:p-2 text-center border-r border-black font-bold">:</td>
                        <td className="p-1.5 sm:p-2 font-normal leading-relaxed whitespace-pre-line text-justify">{activeLaporan.description || activeLaporan.ringkasan_kegiatan}</td>
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
                      isDateRange && dateKeys.length > 1 ? (
                        <div className="space-y-4">
                          {dateKeys.map((dateKey) => {
                            const datePhotosList = photoGroups[dateKey] || [];
                            return (
                              <div key={dateKey} className="border border-black overflow-hidden">
                                <div className="bg-[#F8C48C] border-b border-black py-1 px-3 text-center font-bold text-[11px] sm:text-xs text-black uppercase tracking-wide">
                                  Dokumentasi Tanggal: {formatDateIndonesian(dateKey)}
                                </div>
                                <div className="grid grid-cols-2 gap-3 p-3 bg-white">
                                  {datePhotosList.map((foto: any, idx: number) => {
                                    const isLastOdd = (datePhotosList.length % 2 !== 0) && (idx === datePhotosList.length - 1);
                                    const imgSrc = getDirectImageUrl(foto);
                                    return (
                                      <div
                                        key={idx}
                                        className={`border border-slate-300 p-2 text-center bg-white ${
                                          isLastOdd ? 'col-span-2 w-full max-w-sm mx-auto' : ''
                                        }`}
                                      >
                                        {imgSrc ? (
                                          <img src={imgSrc} alt="Foto Dokumentasi" className="h-40 w-full object-contain mx-auto" />
                                        ) : (
                                          <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400 italic">
                                            [ Pratinjau Foto ]
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-black">
                          {allPhotos.map((foto: any, idx: number) => {
                            const isLastOdd = (allPhotos.length % 2 !== 0) && (idx === allPhotos.length - 1);
                            const imgSrc = getDirectImageUrl(foto);
                            return (
                              <div
                                key={idx}
                                className={`border border-slate-300 p-2 text-center bg-white ${
                                  isLastOdd ? 'col-span-2 w-full max-w-sm mx-auto' : ''
                                }`}
                              >
                                {imgSrc ? (
                                  <img src={imgSrc} alt="Foto Dokumentasi" className="h-40 w-full object-contain mx-auto" />
                                ) : (
                                  <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400 italic">
                                    [ Pratinjau Foto ]
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
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
        {activeLaporan.drive_pdf_url && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Berkas PDF resmi tersimpan di Google Drive BPS</span>
            <a
              href={activeLaporan.drive_pdf_url}
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
