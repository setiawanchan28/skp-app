'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Pegawai, PegawaiInput } from '@/types/pegawai';
import { Loader2 } from 'lucide-react';

const pegawaiSchema = z.object({
  nama: z.string().min(3, 'Nama pegawai minimal 3 karakter'),
  nip: z
    .string()
    .min(18, 'NIP harus 18 digit angka')
    .max(18, 'NIP harus 18 digit angka')
    .regex(/^\d+$/, 'NIP hanya boleh berupa angka'),
  jabatan: z.string().min(3, 'Jabatan minimal 3 karakter'),
});

interface PegawaiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PegawaiInput) => Promise<void>;
  initialData?: Pegawai | null;
  isLoading?: boolean;
}

export const PegawaiFormModal: React.FC<PegawaiFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PegawaiInput>({
    resolver: zodResolver(pegawaiSchema),
    defaultValues: {
      nama: initialData?.nama || '',
      nip: initialData?.nip || '',
      jabatan: initialData?.jabatan || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        nama: initialData.nama,
        nip: initialData.nip,
        jabatan: initialData.jabatan,
      });
    } else {
      reset({ nama: '', nip: '', jabatan: '' });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (values: PegawaiInput) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Nama Lengkap & Gelar *
          </label>
          <input
            {...register('nama')}
            placeholder="Contoh: Dede Supriatna, S.Si., M.Stat."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
          />
          {errors.nama && (
            <p className="text-xs text-rose-500 mt-1">{errors.nama.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            NIP (18 Digit) *
          </label>
          <input
            {...register('nip')}
            maxLength={18}
            placeholder="Contoh: 198805122010121002"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
          />
          {errors.nip && (
            <p className="text-xs text-rose-500 mt-1">{errors.nip.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Jabatan *
          </label>
          <input
            {...register('jabatan')}
            placeholder="Contoh: Statistisi Ahli Muda"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
          />
          {errors.jabatan && (
            <p className="text-xs text-rose-500 mt-1">{errors.jabatan.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Data'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
