'use client';

import React, { useState } from 'react';
import { Upload, Trash2, AlertCircle, Calendar, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '@/lib/image';

export interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  existingUrl?: string;
  tanggal_foto?: string;
  drive_file_id?: string;
  drive_file_url?: string;
}

export interface DateGroupOption {
  dateStr: string;
  formattedLabel: string;
}

interface PhotoUploaderProps {
  startDate: string;
  endDate: string;
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  startDate,
  endDate,
  photos,
  onChange,
}) => {
  const [error, setError] = useState<string | null>(null);

  const processFiles = async (files: FileList | File[], selectedDate?: string) => {
    setError(null);
    const targetDate = selectedDate || startDate || new Date().toISOString().split('T')[0];

    // Calculate photos count for the target documentation date
    const photosOnDate = photos.filter((p) => (p.tanggal_foto || startDate) === targetDate);
    
    if (photosOnDate.length >= 6) {
      setError('Maksimal 6 foto untuk satu kegiatan pada tanggal yang sama.');
      return;
    }

    const updatedPhotos = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const currentCount = updatedPhotos.filter((p) => (p.tanggal_foto || startDate) === targetDate).length;
      if (currentCount >= 6) {
        setError('Maksimal 6 foto untuk satu kegiatan pada tanggal yang sama.');
        break;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`File ${file.name} harus berformat JPG, PNG, atau WEBP`);
        continue;
      }

      try {
        const compressed = await compressImage(file, 1600, 0.8);
        const previewUrl = URL.createObjectURL(compressed);

        updatedPhotos.push({
          id: Math.random().toString(36).substring(2, 9),
          file: compressed,
          previewUrl,
          name: compressed.name,
          tanggal_foto: targetDate,
        });
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }

    onChange(updatedPhotos);
  };

  const handleRemove = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  const handleDateChange = (id: string, newDate: string) => {
    setError(null);
    const photosOnNewDate = photos.filter((p) => p.id !== id && (p.tanggal_foto || startDate) === newDate);
    if (photosOnNewDate.length >= 6) {
      setError('Maksimal 6 foto untuk satu kegiatan pada tanggal yang sama.');
      return;
    }

    const updated = photos.map((p) => (p.id === id ? { ...p, tanggal_foto: newDate } : p));
    onChange(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-sky-500" /> Dokumentasi Foto Kegiatan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unggah foto dokumentasi per tanggal kegiatan. Maksimal 6 foto per hari.
          </p>
        </div>
        <span className="text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-3 py-1.5 rounded-full border border-sky-200 dark:border-sky-800">
          Total Foto: {photos.length}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone Area */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/40 transition-all">
        <Upload className="w-8 h-8 text-sky-500 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Tarik & lepas foto di sini, atau klik untuk memilih file
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Format: JPG, PNG, WEBP (Otomatis didownscale untuk PDF & Drive)</p>

        <label className="inline-block mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-sky-600/20 transition-all">
          Pilih File Foto
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
        </label>
      </div>

      {/* Photos Grid List */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                <img src={photo.previewUrl} alt={photo.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove(photo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{photo.name}</div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-sky-500 shrink-0" />
                  <input
                    type="date"
                    value={photo.tanggal_foto || startDate}
                    min={startDate}
                    max={endDate}
                    onChange={(e) => handleDateChange(photo.id, e.target.value)}
                    className="w-full text-[10px] font-medium bg-transparent border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
