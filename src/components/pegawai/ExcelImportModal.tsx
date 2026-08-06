'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { importPegawaiFromExcel } from '@/lib/excel';
import { PegawaiInput } from '@/types/pegawai';
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: PegawaiInput[]) => Promise<void>;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcessImport = async () => {
    if (!file) {
      setError('Silakan pilih file Excel terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      const parsedData = await importPegawaiFromExcel(file);
      if (parsedData.length === 0) {
        setError('Tidak ada data pegawai valid yang ditemukan di file Excel. Pastikan terdapat kolom Nama, NIP, dan Jabatan.');
        setLoading(false);
        return;
      }

      await onImport(parsedData);
      setLoading(false);
      setFile(null);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Gagal membaca file Excel. Pastikan format file .xlsx atau .xls');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Data Pegawai dari Excel">
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          Upload file Excel (.xlsx / .xls) yang berisi data pegawai dengan kolom header:
          <strong className="text-slate-800"> Nama</strong>, <strong className="text-slate-800">NIP</strong>, dan{' '}
          <strong className="text-slate-800">Jabatan</strong>.
        </p>

        <div className="border-2 border-dashed border-slate-200 hover:border-sky-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
            id="excel-file-input"
          />
          <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            {file ? (
              <div>
                <p className="text-sm font-bold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Klik untuk unggah file Excel
                </p>
                <p className="text-xs text-slate-400">Format .xlsx atau .xls</p>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleProcessImport}
            disabled={loading || !file}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proses Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
