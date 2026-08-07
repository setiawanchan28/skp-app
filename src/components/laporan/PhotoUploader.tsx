'use client';

import React, { useState } from 'react';
import { Upload, Trash2, Maximize2, Minimize2, AlertCircle, Calendar } from 'lucide-react';
import { compressImage } from '@/lib/image';

export interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  existingUrl?: string;
  fitMode?: 'contain' | 'cover';
  tanggal_foto?: string;
}

export interface DateGroupOption {
  dateStr: string;
  formattedLabel: string;
}

interface PhotoUploaderProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
  dateList?: DateGroupOption[];
  isRangeDate?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  maxPhotos = 6,
  maxSizeMB = 10,
  dateList = [],
  isRangeDate = false,
}) => {
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFilesForDate = async (files: FileList | File[], targetDateStr?: string) => {
    setError(null);
    const validFiles: PhotoItem[] = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (validFiles.length >= maxPhotos) {
        setError(`Maksimal ${maxPhotos} foto dokumentasi secara keseluruhan`);
        break;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`File ${file.name} harus berformat JPG, PNG, atau WEBP`);
        continue;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Ukuran file ${file.name} melebihi ${maxSizeMB} MB`);
        continue;
      }

      try {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);

        validFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file: compressed,
          previewUrl,
          name: compressed.name,
          fitMode: 'contain',
          tanggal_foto: targetDateStr || (dateList.length > 0 ? dateList[0].dateStr : undefined),
        });
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }

    onChange(validFiles);
  };

  const handleRemove = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    onChange(updated);
  };

  const toggleFitMode = (id: string) => {
    const updated = photos.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          fitMode: (p.fitMode === 'cover' ? 'contain' : 'cover') as 'contain' | 'cover',
        };
      }
      return p;
    });
    onChange(updated);
  };

  // If Range Date is active with multiple dates
  if (isRangeDate && dateList.length > 1) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dokumentasi Foto Per Tanggal Pelaksanaan
            </label>
            <p className="text-xs text-slate-500">
              Unggah foto dokumentasi khusus untuk masing-masing tanggal (dapat dicicil hari demi hari)
            </p>
          </div>
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
            Total {photos.length} / {maxPhotos} Foto
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {dateList.map((dItem) => {
            const datePhotos = photos.filter(
              (p) => p.tanggal_foto === dItem.dateStr || (!p.tanggal_foto && dateList[0].dateStr === dItem.dateStr)
            );

            return (
              <div
                key={dItem.dateStr}
                className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase">
                      Dokumentasi Tanggal: {dItem.formattedLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {datePhotos.length} Foto
                  </span>
                </div>

                {/* Upload Box for this date */}
                <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-4 text-center bg-white transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    id={`photo-input-${dItem.dateStr}`}
                    className="hidden"
                    onChange={(e) => e.target.files && processFilesForDate(e.target.files, dItem.dateStr)}
                  />
                  <label
                    htmlFor={`photo-input-${dItem.dateStr}`}
                    className="cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-700"
                  >
                    <Upload className="w-4 h-4" />
                    <span>+ Tambah Foto Dokumentasi ({dItem.formattedLabel})</span>
                  </label>
                </div>

                {/* Photos Grid for this date with WHITE canvas background */}
                {datePhotos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {datePhotos.map((item) => {
                      const fit = item.fitMode || 'contain';
                      return (
                        <div
                          key={item.id}
                          className="relative group rounded-xl overflow-hidden border border-slate-300 bg-white h-44 flex items-center justify-center p-1 shadow-2xs"
                        >
                          <img
                            src={item.previewUrl || item.existingUrl}
                            alt={item.name}
                            className={`w-full h-full transition-all duration-300 ${
                              fit === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                          />
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                            <button
                              type="button"
                              onClick={() => toggleFitMode(item.id)}
                              className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-sm text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm"
                            >
                              {fit === 'contain' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.id)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Single Date Upload View with WHITE canvas background
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Dokumentasi Kegiatan (Maksimal {maxPhotos} Foto) *
          </label>
          <p className="text-xs text-slate-500">
            Format: JPG, PNG, WEBP. Foto Portrait & Landscape otomatis ditampilkan 100% utuh dengan latar putih.
          </p>
        </div>
        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
          {photos.length} / {maxPhotos} Foto
        </span>
      </div>

      {photos.length < maxPhotos && (
        <div
          onDragEnter={() => setDragActive('single')}
          onDragLeave={() => setDragActive(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(null);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              processFilesForDate(e.dataTransfer.files);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            dragActive === 'single'
              ? 'border-sky-500 bg-sky-50/80 scale-[0.99]'
              : 'border-slate-300 hover:border-sky-500 bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            id="photo-input-single"
            className="hidden"
            onChange={(e) => e.target.files && processFilesForDate(e.target.files)}
          />
          <label htmlFor="photo-input-single" className="cursor-pointer flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Tarik & Lepas foto dokumentasi ke sini, atau <span className="text-sky-600">Pilih File</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Foto diunggah secara otomatis ke Google Drive
              </p>
            </div>
          </label>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((item) => {
            const fit = item.fitMode || 'contain';
            return (
              <div
                key={item.id}
                className="relative group rounded-2xl overflow-hidden border border-slate-300 bg-white min-h-[220px] max-h-[300px] flex items-center justify-center shadow-xs p-2 transition-all"
              >
                <img
                  src={item.previewUrl || item.existingUrl}
                  alt={item.name}
                  className={`w-full h-full transition-all duration-300 ${
                    fit === 'contain' ? 'object-contain max-h-[280px]' : 'object-cover'
                  }`}
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={() => toggleFitMode(item.id)}
                    className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-sm text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm"
                  >
                    {fit === 'contain' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
