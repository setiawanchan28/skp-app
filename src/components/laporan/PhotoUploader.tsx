'use client';

import React, { useState } from 'react';
import { Upload, Trash2, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { compressImage } from '@/lib/image';

export interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  existingUrl?: string;
  fitMode?: 'contain' | 'cover';
}

interface PhotoUploaderProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  maxPhotos = 6,
  maxSizeMB = 10,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    const validFiles: PhotoItem[] = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (validFiles.length >= maxPhotos) {
        setError(`Maksimal ${maxPhotos} foto dokumentasi`);
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
          fitMode: 'contain', // Default to 100% full uncropped image
        });
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }

    onChange(validFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Dokumentasi Kegiatan (Maksimal {maxPhotos} Foto) *
          </label>
          <p className="text-xs text-slate-500">
            Format: JPG, PNG, WEBP. Foto Portrait & Landscape otomatis ditampilkan 100% utuh tanpa terpotong.
          </p>
        </div>
        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
          {photos.length} / {maxPhotos} Foto
        </span>
      </div>

      {/* Upload Drag & Drop Zone */}
      {photos.length < maxPhotos && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            dragActive
              ? 'border-sky-500 bg-sky-50/80 scale-[0.99]'
              : 'border-slate-300 hover:border-sky-500 bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            id="photo-input"
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
          <label htmlFor="photo-input" className="cursor-pointer flex flex-col items-center gap-2">
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

      {/* Photo Previews Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((item, index) => {
            const fit = item.fitMode || 'contain';
            return (
              <div
                key={item.id}
                className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 min-h-[220px] max-h-[300px] flex items-center justify-center shadow-sm p-2 transition-all"
              >
                <img
                  src={item.previewUrl || item.existingUrl}
                  alt={item.name}
                  className={`w-full h-full transition-all duration-300 ${
                    fit === 'contain' ? 'object-contain max-h-[280px]' : 'object-cover'
                  }`}
                />

                {/* Top Action Controls */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={() => toggleFitMode(item.id)}
                    className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-sm text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm"
                    title={fit === 'contain' ? 'Mode Penuh Kotak (Crop)' : 'Mode Tampilkan Utuh (Fit)'}
                  >
                    {fit === 'contain' ? (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Fit Utuh</span>
                      </>
                    ) : (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Crop</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm"
                    title="Hapus Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Label Badge */}
                <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm p-2 rounded-xl text-white text-[11px] font-medium flex items-center justify-between pointer-events-none">
                  <span className="truncate">Foto #{index + 1}</span>
                  <span className="text-[10px] font-bold text-sky-400 uppercase">
                    {fit === 'contain' ? '100% Utuh' : 'Crop'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
