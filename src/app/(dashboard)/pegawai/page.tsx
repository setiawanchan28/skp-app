'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  fetchPegawaiList,
  createPegawai,
  updatePegawai,
  deletePegawai,
  importPegawaiBulk,
} from '@/services/pegawaiService';
import { Pegawai, PegawaiInput } from '@/types/pegawai';
import { PegawaiFormModal } from '@/components/pegawai/PegawaiFormModal';
import { ExcelImportModal } from '@/components/pegawai/ExcelImportModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { exportPegawaiToExcel } from '@/lib/excel';
import { useToast } from '@/components/ui/Toast';
import { formatNIP } from '@/utils/formatters';

export default function MasterPegawaiPage() {
  const { showToast } = useToast();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPegawai, setEditingPegawai] = useState<Pegawai | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPegawaiList();
    setPegawaiList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Pegawai
  const filteredPegawai = pegawaiList.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.nip.includes(search) ||
      p.jabatan.toLowerCase().includes(search.toLowerCase())
  );

  // Save / Update Pegawai
  const handleSavePegawai = async (input: PegawaiInput) => {
    if (editingPegawai) {
      await updatePegawai(editingPegawai.id, input);
      showToast('Data pegawai berhasil diperbarui!', 'success');
    } else {
      await createPegawai(input);
      showToast('Pegawai baru berhasil ditambahkan!', 'success');
    }
    loadData();
  };

  // Delete Pegawai
  const handleConfirmDelete = async () => {
    if (deletingId) {
      await deletePegawai(deletingId);
      showToast('Data pegawai berhasil dihapus', 'info');
      setDeletingId(null);
      loadData();
    }
  };

  // Bulk Import Excel
  const handleImportExcel = async (items: PegawaiInput[]) => {
    await importPegawaiBulk(items);
    showToast(`Berhasil mengimpor ${items.length} data pegawai dari Excel!`, 'success');
    loadData();
  };

  // Export Excel
  const handleExportExcel = () => {
    if (pegawaiList.length === 0) {
      showToast('Tidak ada data pegawai untuk diexport', 'error');
      return;
    }
    exportPegawaiToExcel(pegawaiList);
    showToast('Data pegawai berhasil diexport ke Excel!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>Master Data Pegawai</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data pegawai BPS Kabupaten Lebak untuk pengisian otomatis laporan kegiatan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>
          <button
            onClick={() => {
              setEditingPegawai(null);
              setIsFormOpen(true);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pegawai</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, NIP, atau jabatan..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Memuat data pegawai...
          </div>
        ) : filteredPegawai.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada pegawai ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                  <th className="py-3 px-4">NIP (18 Digit)</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPegawai.map((peg, idx) => (
                  <tr key={peg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{peg.nama}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                      {formatNIP(peg.nip)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{peg.jabatan}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingPegawai(peg);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Edit Pegawai"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(peg.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Pegawai"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <PegawaiFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSavePegawai}
        initialData={editingPegawai}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportExcel}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Pegawai?"
        message="Apakah Anda yakin ingin menghapus data pegawai ini? Data yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus Pegawai"
        isDangerous
      />
    </div>
  );
}
