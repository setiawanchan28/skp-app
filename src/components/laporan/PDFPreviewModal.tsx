'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Laporan } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG } from '@/constants/bpsConfig';
import { ExternalLink, Download, FileText } from 'lucide-react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  laporan: Laporan | null;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  laporan,
}) => {
  if (!laporan) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preview Bukti Dukung BPS" maxWidth="4xl">
      <div className="space-y-6">
        {/* PDF Document Render Preview */}
        <div className="bg-white border border-slate-300 shadow-xl rounded-xl p-8 max-w-2xl mx-auto space-y-6 font-sans text-slate-800">
          {/* Header */}
          <div className="border-b-2 border-sky-600 pb-4 text-center space-y-1">
            <h2 className="text-sm font-extrabold text-sky-800 uppercase tracking-wide">
              {BPS_CONFIG.instansi}
            </h2>
            <p className="text-[11px] text-slate-500">{BPS_CONFIG.alamat}</p>
            <div className="pt-3">
              <h1 className="text-base font-extrabold text-slate-900 border-b border-slate-800 inline-block px-2">
                {BPS_CONFIG.judulLaporan}
              </h1>
            </div>
          </div>

          {/* Bagian I Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider">
              Bagian I: Keterangan Pelaksana
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody>
                <tr>
                  <td className="w-1/3 bg-slate-50 p-2 font-bold border border-slate-300">
                    Nama Pegawai
                  </td>
                  <td className="p-2 border border-slate-300 font-semibold">{laporan.nama_pegawai}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 p-2 font-bold border border-slate-300">NIP</td>
                  <td className="p-2 border border-slate-300 font-mono">{laporan.nip}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 p-2 font-bold border border-slate-300">Jabatan</td>
                  <td className="p-2 border border-slate-300">{laporan.jabatan}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 p-2 font-bold border border-slate-300">
                    Tanggal Kegiatan
                  </td>
                  <td className="p-2 border border-slate-300 font-medium">
                    {formatDateIndonesian(laporan.tanggal)}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 p-2 font-bold border border-slate-300">
                    Nama Kegiatan
                  </td>
                  <td className="p-2 border border-slate-300 font-bold text-sky-900">
                    {laporan.nama_kegiatan}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 p-2 font-bold border border-slate-300">
                    Ringkasan Kegiatan
                  </td>
                  <td className="p-2 border border-slate-300 leading-relaxed">
                    {laporan.ringkasan_kegiatan}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bagian II Dokumentasi */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider">
              Bagian II: Dokumentasi Kegiatan
            </h3>
            {laporan.fotos && laporan.fotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {laporan.fotos.map((foto, idx) => (
                  <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 aspect-video flex items-center justify-center text-slate-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px]">
                      <p className="font-bold truncate">{laporan.nama_kegiatan}</p>
                      <p className="text-slate-500">{formatDateIndonesian(laporan.tanggal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400">Tidak ada foto dokumentasi.</p>
            )}
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
