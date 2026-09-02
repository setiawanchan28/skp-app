'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  Eye,
  Edit2,
  Trash2,
  FilePlus,
  Copy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Link2,
  Printer,
  Calendar,
  Clock,
  Lock,
  Loader2,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  MoreVertical,
  X,
} from 'lucide-react';
import { fetchLaporanList, trashLaporanRecord, copyActivityRecord } from '@/services/laporanService';
import { Activity } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';
import { PDFPreviewModal } from '@/components/laporan/PDFPreviewModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { BULAN_INDONESIA } from '@/constants/bpsConfig';
import { compressBase64Image } from '@/lib/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ReauthModal } from '@/components/ui/ReauthModal';
import { LoadingModal } from '@/components/ui/LoadingModal';

function getDrivePdfUrl(act?: Partial<Activity> | null): string | undefined {
  if (!act) return undefined;
  if (act.drive_pdf_url && typeof act.drive_pdf_url === 'string' && act.drive_pdf_url.trim()) {
    return act.drive_pdf_url.trim();
  }
  const anyAct = act as any;
  if (anyAct.pdf_url && typeof anyAct.pdf_url === 'string' && anyAct.pdf_url.trim()) {
    return anyAct.pdf_url.trim();
  }
  if (anyAct.drive_file_url && typeof anyAct.drive_file_url === 'string' && anyAct.drive_file_url.trim()) {
    return anyAct.drive_file_url.trim();
  }
  const driveId = anyAct.drive_pdf_file_id || anyAct.drive_file_id;
  if (driveId && typeof driveId === 'string' && driveId.trim()) {
    return `https://drive.google.com/file/d/${driveId.trim()}/view?usp=sharing`;
  }
  return undefined;
}

const ActionDropdownMenu = ({
  act,
  isGen,
  isGenerating,
  onPreview,
  onCopyActivity,
  onGeneratePdf,
  onDelete,
}: {
  act: Activity;
  isGen: boolean;
  isGenerating: boolean;
  onPreview: () => void;
  onCopyActivity: () => void;
  onGeneratePdf: () => void;
  onDelete: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 208; // 52 * 4 = 208px
    const menuHeight = 220;

    let leftPos = rect.right - menuWidth;
    if (leftPos < 8) leftPos = 8;
    if (leftPos + menuWidth > window.innerWidth - 8) {
      leftPos = window.innerWidth - menuWidth - 8;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    let topPos = rect.bottom + 6;
    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      topPos = rect.top - menuHeight - 6;
    }

    setPosition({
      top: topPos,
      left: leftPos,
    });
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const dropdownContent = (
    <>
      {/* MOBILE BOTTOM SHEET MODAL (HP View < 640px) */}
      <div
        className="fixed inset-0 z-[9999] sm:hidden bg-slate-900/60 backdrop-blur-xs flex items-end justify-center p-0 animate-fadeIn"
        onClick={() => setIsOpen(false)}
      >
        <div
          ref={dropdownRef}
          className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl w-full p-5 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MoreVertical className="w-5 h-5 text-sky-600 shrink-0" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-[240px]">
                {act.name}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => { setIsOpen(false); onPreview(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-2xl flex items-center gap-3 transition-colors"
            >
              <Eye className="w-4.5 h-4.5 text-sky-500 shrink-0" />
              <span>Pratinjau PDF</span>
            </button>

            <Link
              href={`/laporan/edit/${act.id}`}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl flex items-center gap-3 transition-colors"
            >
              <Edit2 className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              <span>Edit Laporan</span>
            </Link>

            <button
              onClick={() => { setIsOpen(false); onCopyActivity(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-2xl flex items-center gap-3 transition-colors"
            >
              <Copy className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>Duplikat Kegiatan</span>
            </button>

            <button
              onClick={() => { setIsOpen(false); onGeneratePdf(); }}
              disabled={isGenerating}
              className="w-full text-left px-4 py-3 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-2xl flex items-center gap-3 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin text-sky-500 shrink-0" />
              ) : (
                <Sparkles className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              )}
              <span>{isGen ? 'Regenerate PDF' : 'Cetak / Generate PDF'}</span>
            </button>

            <button
              onClick={() => { setIsOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl flex items-center gap-3 transition-colors"
            >
              <Trash2 className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span>Pindahkan ke Sampah</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP DROPDOWN MENU (PC View >= 640px) */}
      <div
        ref={dropdownRef}
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        className="hidden sm:block fixed z-[9999] w-52 rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 focus:outline-none divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="py-1">
          <button
            onClick={() => { setIsOpen(false); onPreview(); }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:text-sky-600 flex items-center gap-2.5 transition-colors"
          >
            <Eye className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Pratinjau PDF</span>
          </button>

          <Link
            href={`/laporan/edit/${act.id}`}
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 flex items-center gap-2.5 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Edit Laporan</span>
          </Link>

          <button
            onClick={() => { setIsOpen(false); onCopyActivity(); }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 flex items-center gap-2.5 transition-colors"
          >
            <Copy className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Duplikat Kegiatan</span>
          </button>
        </div>

        <div className="py-1">
          <button
            onClick={() => { setIsOpen(false); onGeneratePdf(); }}
            disabled={isGenerating}
            className="w-full text-left px-3.5 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 flex items-center gap-2.5 transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-500 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{isGen ? 'Regenerate PDF' : 'Cetak / Generate PDF'}</span>
          </button>
        </div>

        <div className="py-1">
          <button
            onClick={() => { setIsOpen(false); onDelete(); }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Pindahkan ke Sampah</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1 shadow-2xs"
        title="Menu Aksi"
      >
        <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default function RiwayatLaporanPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode & Filters
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERJALANAN_DINAS' | 'NON_PERJALANAN_DINAS'>('ALL');
  const [filterBulan, setFilterBulan] = useState<string>('ALL');
  const [filterTahun, setFilterTahun] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'NAME_ASC'>('NEWEST');
  // Pagination State (Opsi: 10, 20, 30, 50, Semua)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'ALL'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Re-Authentication Required Modal State
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [reauthMessage, setReauthMessage] = useState<string>('');

  const [savedProfile, setSavedProfile] = useState<{ nama?: string; nip?: string; jabatan?: string }>({});

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, filterBulan, filterTahun, sortOrder, itemsPerPage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localUser = localStorage.getItem('bps_auth_user') || localStorage.getItem('bps_saved_profile');
      if (localUser) {
        try {
          setSavedProfile(JSON.parse(localUser));
        } catch (e) {}
      }
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    let localList: Activity[] = [];
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('bps_laporan_data');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localList = parsed.filter((a: any) => a.status !== 'TRASHED' && !a.deleted_at);
            setActivities(localList);
          }
        } catch (e) {}
      }
    }

    try {
      const remoteData = await fetchLaporanList();
      if (Array.isArray(remoteData)) {
        const mergedList = remoteData
          .filter((a) => a.status !== 'TRASHED' && !a.deleted_at)
          .map((remoteAct) => {
            const localAct = localList.find((l) => l.id === remoteAct.id);
            if (!localAct) return remoteAct;

            const localDocs = localAct.documents || (localAct as any).fotos || [];
            const remoteDocs = remoteAct.documents || (remoteAct as any).fotos || [];

            const targetDocs = remoteDocs.length > 0 ? remoteDocs : localDocs;
            const mergedDocs = targetDocs.map((rDoc: any, idx: number) => {
              const lDoc = localDocs[idx] || {};
              const driveId = rDoc.drive_file_id || lDoc.drive_file_id || '';
              const driveThumb = driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000` : '';
              const prevUrl = rDoc.previewUrl || driveThumb || lDoc.previewUrl || lDoc.base64 || lDoc.existingUrl || '';
              const b64 = rDoc.base64 || lDoc.base64 || (prevUrl.startsWith('data:image/') ? prevUrl : '');

              return {
                ...lDoc,
                ...rDoc,
                drive_file_id: driveId,
                previewUrl: prevUrl,
                base64: b64,
                existingUrl: prevUrl,
              };
            });

            return {
              ...localAct,
              ...remoteAct,
              documents: mergedDocs,
              fotos: mergedDocs,
            };
          })
          .sort(
            (a, b) =>
              new Date(b.start_date || b.tanggal || b.created_at || Date.now()).getTime() -
              new Date(a.start_date || a.tanggal || a.created_at || Date.now()).getTime()
          );

        setActivities(mergedList);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bps_laporan_data', JSON.stringify(mergedList));
        }
      }
    } catch (e) {
      console.warn('Failed to load remote laporan list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleUpdate);
      window.addEventListener('storage', handleUpdate);
      window.addEventListener('bps_laporan_updated', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
        window.removeEventListener('bps_laporan_updated', handleUpdate);
      }
    };
  }, []);

  // Filter & Sort Logic
  const filteredList = activities
    .filter((act) => {
      if (act.status === 'TRASHED' || act.deleted_at) return false;

      const actDateStr = act.start_date || act.tanggal || (act as any).tanggal_perjadin || act.created_at || '';
      let y = '';
      let m = '';
      if (actDateStr) {
        const isoMatch = String(actDateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
          y = isoMatch[1];
          m = isoMatch[2].padStart(2, '0');
        } else {
          const parsedDate = new Date(actDateStr);
          if (!isNaN(parsedDate.getTime())) {
            y = String(parsedDate.getFullYear());
            m = String(parsedDate.getMonth() + 1).padStart(2, '0');
          }
        }
      }

      if (y && m) {
        if (filterTahun !== 'ALL' && y !== filterTahun) return false;
        if (filterBulan !== 'ALL' && m !== filterBulan) return false;
      }

      const actName = act.name || act.nama_kegiatan || '';
      const actDesc = act.description || act.deskripsi_kegiatan || act.ringkasan_kegiatan || '';
      const actDest = act.destination || act.tempat_tujuan || '';
      const actPeg = act.nama_pegawai || '';

      const matchesSearch =
        !search ||
        actName.toLowerCase().includes(search.toLowerCase()) ||
        actDesc.toLowerCase().includes(search.toLowerCase()) ||
        actDest.toLowerCase().includes(search.toLowerCase()) ||
        actPeg.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const isPerjadin =
        act.activity_type === 'PERJALANAN_DINAS' ||
        (act as any).activity_type === 'penugasan' ||
        Boolean(act.spd_number || (act as any).nomor_spd);

      if (typeFilter === 'PERJALANAN_DINAS' && !isPerjadin) return false;
      if (typeFilter === 'NON_PERJALANAN_DINAS' && isPerjadin) return false;

      return true;
    })
    .sort((a, b) => {
      const nameA = a.name || a.nama_kegiatan || '';
      const nameB = b.name || b.nama_kegiatan || '';
      if (sortOrder === 'NAME_ASC') {
        return nameA.localeCompare(nameB);
      }
      const timeA = new Date(a.start_date || a.tanggal || a.created_at || 0).getTime();
      const timeB = new Date(b.start_date || b.tanggal || b.created_at || 0).getTime();
      if (sortOrder === 'OLDEST') return timeA - timeB;
      return timeB - timeA; // NEWEST
    });

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, filterBulan, filterTahun, sortOrder, itemsPerPage]);

  const totalItems = filteredList.length;
  const totalPages = itemsPerPage === 'ALL' ? 1 : Math.max(1, Math.ceil(totalItems / (itemsPerPage as number)));
  const validPage = Math.min(currentPage, totalPages);

  const startIndex = itemsPerPage === 'ALL' ? 0 : (validPage - 1) * (itemsPerPage as number);
  const endIndex = itemsPerPage === 'ALL' ? totalItems : Math.min(startIndex + (itemsPerPage as number), totalItems);

  const paginatedList = filteredList.slice(startIndex, endIndex);

  const handleGeneratePdf = async (act: Activity) => {
    setGeneratingPdfId(act.id);
    try {
      let googleToken =
        (typeof window !== 'undefined' && localStorage.getItem('google_provider_token')) ||
        (savedProfile as any)?.provider_token ||
        '';

      if (!googleToken && isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.provider_token) {
            googleToken = data.session.provider_token;
            if (typeof window !== 'undefined') {
              localStorage.setItem('google_provider_token', googleToken);
            }
          }
        } catch (e) {}
      }

      const cleanDocs = await Promise.all(
        (act.documents || (act as any).fotos || []).map(async (doc: any) => {
          const rawUrl =
            doc.previewUrl ||
            doc.existingUrl ||
            doc.base64 ||
            doc.url ||
            (doc.drive_file_id ? `https://drive.google.com/thumbnail?id=${doc.drive_file_id}&sz=w1000` : '');
          const compressedUrl = rawUrl.startsWith('data:image/')
            ? await compressBase64Image(rawUrl, 1000, 0.7)
            : rawUrl;
          return {
            ...doc,
            id: doc.id,
            name: doc.name || doc.file_name || doc.original_filename || 'Foto.jpg',
            file_name: doc.file_name || doc.original_filename || doc.name || 'Foto.jpg',
            original_filename: doc.original_filename || doc.file_name || doc.name || 'Foto.jpg',
            previewUrl: compressedUrl,
            existingUrl: compressedUrl,
            base64: compressedUrl,
            drive_file_id: doc.drive_file_id || '',
            tanggal_foto: doc.tanggal_foto || doc.documentation_date || act.start_date,
          };
        })
      );

      const payloadActivityData = {
        ...act,
        documents: cleanDocs,
        fotos: cleanDocs,
        provider_token: googleToken,
      };

      const res = await fetch(`/api/activities/${act.id}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-google-token': googleToken,
        },
        body: JSON.stringify({
          idempotency_key: `gen_${act.id}_${Date.now()}`,
          user_drive_token: googleToken,
          activityData: payloadActivityData,
        }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        if (res.status === 413) {
          throw new Error('Ukuran data / foto dokumentasi terlalu besar (413 Payload Too Large). Harap kompres foto atau gunakan foto beresolusi lebih kecil.');
        }
        throw new Error(`Gagal Generate PDF (Server Error ${res.status}): ${responseText.slice(0, 100)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal generate PDF');
      }

      const rawActivity = data.data?.activity || {};
      const updatedAct = {
        ...act,
        ...rawActivity,
        status: 'GENERATED',
        drive_pdf_url: data.data?.pdf_url || rawActivity.drive_pdf_url || act.drive_pdf_url,
        documents: rawActivity.documents?.length ? rawActivity.documents : act.documents || (act as any).fotos || [],
        fotos: rawActivity.fotos?.length ? rawActivity.fotos : (act as any).fotos || act.documents || [],
      };

      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('bps_laporan_data');
          let list = local ? JSON.parse(local) : [];
          const idx = list.findIndex((l: any) => l.id === act.id);
          if (idx >= 0) list[idx] = updatedAct;
          else list.unshift(updatedAct);
          localStorage.setItem('bps_laporan_data', JSON.stringify(list));
        } catch (e) {}
      }

      setActivities((prev) =>
        prev.map((item) => (item.id === act.id ? updatedAct : item))
      );

      showToast('PDF berhasil dibuat!', 'success');
      loadData();
    } catch (err: any) {
      const errMsg = err.message || '';
      showToast(`Gagal membuat PDF: ${errMsg}`, 'error');

      const isAuthError = /token|kredensial|login|logout|401|403|google|oauth|permission|unauthorized|drive/i.test(errMsg);
      if (isAuthError) {
        setReauthMessage(errMsg);
        setIsReauthOpen(true);
      }
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleCopyActivity = async (id: string) => {
    try {
      await copyActivityRecord(id);
      showToast('Kegiatan berhasil disalin!', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyalin kegiatan', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await trashLaporanRecord(deletingId);
      showToast('Kegiatan berhasil dipindahkan ke Sampah', 'info');
      setDeletingId(null);
      loadData();
    }
  };

  const handleCopyPdfUrl = (url?: string, id?: string) => {
    if (!url) {
      showToast('Link PDF belum tersedia!', 'error');
      return;
    }
    let viewOnlyUrl = url;
    if (viewOnlyUrl.includes('/edit')) {
      viewOnlyUrl = viewOnlyUrl.replace(/\/edit.*$/, '/view?usp=sharing');
    } else if (!viewOnlyUrl.includes('/view')) {
      viewOnlyUrl = `${viewOnlyUrl.replace(/\/+$/, '')}/view?usp=sharing`;
    }
    navigator.clipboard.writeText(viewOnlyUrl);
    setCopiedId(id || null);
    showToast('Link PDF berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-500" />
            <span>Riwayat Laporan & Kegiatan</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            BPS Kabupaten Lebak — Pengelolaan laporan kegiatan Perjalanan Dinas (PD) & Non-PD
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/laporan/tambah"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" />
            <span>Buat Laporan</span>
          </Link>
        </div>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kegiatan atau pelaksana..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Filter Dropdowns (Bulan, Tahun, Urutan) */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Filter Jenis */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {(['ALL', 'PERJALANAN_DINAS', 'NON_PERJALANAN_DINAS'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === t
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t === 'ALL' ? 'Semua' : t === 'PERJALANAN_DINAS' ? 'Perjadin' : 'Non-PD'}
                </button>
              ))}
            </div>

            {/* Filter Bulan */}
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Bulan</option>
              {BULAN_INDONESIA.map((b, idx) => (
                <option key={idx} value={String(idx + 1).padStart(2, '0')}>
                  {b}
                </option>
              ))}
            </select>

            {/* Filter Tahun */}
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer"
            >
              <option value="NEWEST">Terbaru</option>
              <option value="OLDEST">Terlama</option>
              <option value="NAME_ASC">Nama (A-Z)</option>
            </select>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ml-auto lg:ml-0">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'TABLE' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Tabel Baris"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'GRID' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main List Rendering */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-sky-500" /> Memuat daftar kegiatan...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Kegiatan</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Klik tombol "Buat Laporan" di atas untuk menambahkan kegiatan baru.
          </p>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* TABLE ROW VIEW FORMAT */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-extrabold text-[11px] text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 w-40">Tanggal & Jam</th>
                  <th className="py-2.5 px-3">Nama Kegiatan & Jenis</th>
                  <th className="py-2.5 px-3 w-20 text-center">Foto</th>
                  <th className="py-2.5 px-3 w-24 text-center">Status</th>
                  <th className="py-2.5 px-3 w-36 text-center">Link Drive PDF</th>
                  <th className="py-2.5 px-3 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedList.map((act, index) => {
                  const isGen = act.status === 'GENERATED';
                  const driveUrl = getDrivePdfUrl(act);
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-xs">{startIndex + index + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                        <div>{formatDateIndonesian(act.start_date)}</div>
                        {act.end_date && act.end_date !== act.start_date ? (
                          <div className="text-[10px] text-slate-400 font-normal">s.d. {formatDateIndonesian(act.end_date)}</div>
                        ) : null}
                        {(act.start_time || (act as any).jam_mulai) && (
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-bold mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>{act.start_time || (act as any).jam_mulai} - {act.end_time || (act as any).jam_selesai || '16:00'} WIB</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-snug">{act.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              act.activity_type === 'PERJALANAN_DINAS'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                            }`}
                          >
                            {act.activity_type === 'PERJALANAN_DINAS' ? 'Perjadin' : 'Non-PD'}
                          </span>
                          {act.destination && (
                            <span className="text-[10px] text-slate-500 truncate max-w-xs">📍 {act.destination}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 text-xs">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {act.documents?.length || act.fotos?.length || 0}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            isGen
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {isGen && <Lock className="w-2.5 h-2.5 text-emerald-600" />}
                          {act.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {driveUrl ? (
                          <button
                            onClick={() => handleCopyPdfUrl(driveUrl, act.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-extrabold transition-all shadow-2xs"
                            title="Salin Link Google Drive PDF"
                          >
                            <Link2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{copiedId === act.id ? 'Tersalin! ✓' : 'Salin Link'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <ActionDropdownMenu
                          act={act}
                          isGen={isGen}
                          isGenerating={generatingPdfId === act.id}
                          onPreview={() => setPreviewActivity(act)}
                          onCopyActivity={() => handleCopyActivity(act.id)}
                          onGeneratePdf={() => handleGeneratePdf(act)}
                          onDelete={() => setDeletingId(act.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW FORMAT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedList.map((act) => {
            const isGen = act.status === 'GENERATED';
            const driveUrl = getDrivePdfUrl(act);
            return (
              <div
                key={act.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Status & Type Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        act.activity_type === 'PERJALANAN_DINAS'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {act.activity_type === 'PERJALANAN_DINAS' ? 'Perjalanan Dinas' : 'Non-PD'}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isGen
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {isGen && <Lock className="w-3 h-3 text-emerald-600" />}
                      {act.status}
                    </span>
                  </div>

                  {/* Title & Dates */}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
                      {act.name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>
                          {formatDateIndonesian(act.start_date)}
                          {act.end_date && act.end_date !== act.start_date ? ` – ${formatDateIndonesian(act.end_date)}` : ''}
                        </span>
                      </div>
                      {(act.start_time || (act as any).jam_mulai) && (
                        <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-mono font-bold text-[11px]">
                          <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                          <span>{act.start_time || (act as any).jam_mulai} - {act.end_time || (act as any).jam_selesai || '16:00'} WIB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {act.description || 'Belum ada deskripsi narasi kegiatan.'}
                  </p>

                  {/* Indicators (Photos / Drive PDF) */}
                  <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1 font-medium">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                      {act.documents?.length || act.fotos?.length || 0} Foto
                    </span>

                    {driveUrl && (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PDF Drive Valid
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGeneratePdf(act)}
                      disabled={generatingPdfId === act.id}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      {generatingPdfId === act.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>{isGen ? 'Regenerate' : 'Cetak PDF'}</span>
                    </button>

                    {driveUrl && (
                      <button
                        onClick={() => handleCopyPdfUrl(driveUrl, act.id)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Salin Link Google Drive PDF"
                      >
                        <Link2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{copiedId === act.id ? 'Tersalin! ✓' : 'Salin Link'}</span>
                      </button>
                    )}
                  </div>

                  <ActionDropdownMenu
                    act={act}
                    isGen={isGen}
                    isGenerating={generatingPdfId === act.id}
                    onPreview={() => setPreviewActivity(act)}
                    onCopyActivity={() => handleCopyActivity(act.id)}
                    onGeneratePdf={() => handleGeneratePdf(act)}
                    onDelete={() => setDeletingId(act.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-2xs">
          <div className="flex items-center gap-2">
            <span>Menampilkan</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {totalItems === 0 ? 0 : startIndex + 1} – {endIndex}
            </span>
            <span>dari</span>
            <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span>
            <span>kegiatan</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per Halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const val = e.target.value;
                  setItemsPerPage(val === 'ALL' ? 'ALL' : Number(val));
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value="ALL">Semua</option>
              </select>
            </div>

            {itemsPerPage !== 'ALL' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Sebelumnya
                </button>

                <div className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-xl font-bold text-sky-700 dark:text-sky-300">
                  Halaman {validPage} dari {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <ConfirmModal
          isOpen={Boolean(deletingId)}
          title="Pindahkan ke Sampah?"
          message="Kegiatan ini akan dipindahkan ke folder Sampah (Soft Delete). Anda dapat memulihkannya kembali dari halaman sampah."
          confirmText="Ya, Pindahkan ke Sampah"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingId(null)}
        />
      )}

      {/* PDF Preview Modal */}
      {previewActivity && (
        <PDFPreviewModal
          isOpen={Boolean(previewActivity)}
          onClose={() => setPreviewActivity(null)}
          laporanData={{
            id: previewActivity.id,
            name: previewActivity.name || previewActivity.nama_kegiatan,
            namaKegiatan: previewActivity.name || previewActivity.nama_kegiatan,
            nama_kegiatan: previewActivity.name || previewActivity.nama_kegiatan,
            start_date: previewActivity.start_date || previewActivity.tanggal,
            end_date: previewActivity.end_date || previewActivity.tanggal_selesai,
            tanggal: previewActivity.start_date || previewActivity.tanggal,
            tanggalSelesai: previewActivity.end_date || previewActivity.tanggal_selesai,
            tanggal_selesai: previewActivity.end_date || previewActivity.tanggal_selesai,
            jamMulai: previewActivity.start_time,
            jamSelesai: previewActivity.end_time,
            description: previewActivity.description || (previewActivity as any).deskripsi_kegiatan || (previewActivity as any).ringkasan_kegiatan || '',
            deskripsiKegiatan: previewActivity.description || (previewActivity as any).deskripsi_kegiatan || (previewActivity as any).ringkasan_kegiatan || '',
            ringkasanKegiatan: previewActivity.description || (previewActivity as any).ringkasan_kegiatan || (previewActivity as any).deskripsi_kegiatan || '',
            ringkasan_kegiatan: previewActivity.description || (previewActivity as any).ringkasan_kegiatan || (previewActivity as any).deskripsi_kegiatan || '',
            activity_type: previewActivity.activity_type,
            jenisLaporan: previewActivity.activity_type === 'PERJALANAN_DINAS' ? 'penugasan' : 'harian',
            destination: previewActivity.destination || (previewActivity as any).tempat_tujuan,
            tempatTujuan: previewActivity.destination || (previewActivity as any).tempat_tujuan,
            letter_number: previewActivity.letter_number || (previewActivity as any).nomor_surat,
            nomorSurat: previewActivity.letter_number || (previewActivity as any).nomor_surat,
            spd_number: previewActivity.spd_number || (previewActivity as any).nomor_spd,
            nomorSpd: previewActivity.spd_number || (previewActivity as any).nomor_spd,
            people: previewActivity.people || [],
            petugasDitemui: previewActivity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || (previewActivity as any).petugas_ditemui || [],
            petugas_ditemui: previewActivity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || (previewActivity as any).petugas_ditemui || [],
            namaPegawai: previewActivity.nama_pegawai || savedProfile.nama || 'Pegawai BPS',
            nama_pegawai: previewActivity.nama_pegawai || savedProfile.nama || 'Pegawai BPS',
            nip: previewActivity.nip || savedProfile.nip || '',
            jabatan: previewActivity.jabatan || savedProfile.jabatan || 'Pegawai BPS',
            documents: (previewActivity.documents && previewActivity.documents.length > 0) ? previewActivity.documents : (previewActivity as any).fotos || [],
            fotos: (previewActivity.fotos && previewActivity.fotos.length > 0) ? previewActivity.fotos : previewActivity.documents || [],
          }}
        />
      )}

      {/* Re-Login Required Modal */}
      <ReauthModal
        isOpen={isReauthOpen}
        onClose={() => setIsReauthOpen(false)}
        message={reauthMessage}
      />

      {/* PDF Generation Loading Modal */}
      <LoadingModal
        isOpen={!!generatingPdfId}
        type="pdf"
        title="Sedang Memproses & Mencetak PDF..."
        message="Mohon tunggu sejenak, dokumen PDF resmi BPS sedang di-generate dan diunggah ke Google Drive..."
      />
    </div>
  );
}
