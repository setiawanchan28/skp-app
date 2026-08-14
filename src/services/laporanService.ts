import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { Activity, ActivityPerson, ActivityDocument, ActivityStatus } from '@/types/laporan';
import { normalizeActivityName } from '@/utils/sanitizeFilename';
import { getStoredLaporanListServer, saveStoredLaporanListServer } from '@/lib/laporanStoreServer';
import { getStoredPenugasanList, saveStoredPenugasanList } from '@/lib/penugasanStore';
import { LaporanPenugasan } from '@/types/penugasan';

export function mapPenugasanToActivity(p: LaporanPenugasan): Activity {
  const docs = (p.fotos || []).map((f: any) => ({
    id: f.id || f.drive_file_id || Math.random().toString(36).slice(2),
    name: f.file_name || f.name || 'Foto.jpg',
    file_name: f.file_name || f.name || 'Foto.jpg',
    previewUrl: f.web_view_url || f.preview_url || f.previewUrl || (f.drive_file_id ? `https://drive.google.com/thumbnail?id=${f.drive_file_id}&sz=w1000` : ''),
    web_view_url: f.web_view_url || f.preview_url || f.previewUrl || '',
    drive_file_id: f.drive_file_id || '',
    tanggal_foto: f.tanggal_foto || f.documentation_date || p.tanggal_perjadin,
  }));

  const people = (p.petugas_ditemui || []).map((pt: any) => ({
    person_name: pt.nama,
    position: pt.jabatan,
  }));

  return {
    id: p.id,
    user_id: '00000000-0000-0000-0000-000000000000',
    activity_type: 'PERJALANAN_DINAS',
    name: p.nama_kegiatan,
    normalized_name: (p.nama_kegiatan || '').toLowerCase(),
    start_date: p.tanggal_perjadin,
    end_date: p.tanggal_selesai_perjadin || p.tanggal_perjadin,
    start_time: '08:00',
    end_time: '16:00',
    destination: p.tempat_tujuan,
    letter_number: p.nomor_surat,
    spd_number: p.nomor_spd,
    description: p.resume_kegiatan,
    status: p.drive_pdf_url ? 'GENERATED' : 'DRAFT',
    drive_pdf_url: p.drive_pdf_url,
    drive_pdf_file_id: p.drive_pdf_file_id,
    drive_folder_id: p.drive_folder_id,
    people: people,
    petugas_ditemui: p.petugas_ditemui,
    documents: docs,
    fotos: docs,
    created_at: p.created_at || new Date().toISOString(),
    updated_at: p.updated_at || new Date().toISOString(),
    nama_pegawai: p.nama_pegawai,
    nip: p.nip,
    jabatan: p.jabatan,
  };
}

const LOCAL_STORAGE_LAPORAN = 'bps_laporan_data';

/**
 * Check case-insensitive activity name collision per user
 */
export async function checkActivityNameCollision(
  userId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  // Allow duplicate activity names for reports on different dates / contexts
  return false;
}

/**
 * Fetch all active (non-trashed) activities for current user
 */
export async function fetchLaporanList(includeTrashed: boolean = false): Promise<Activity[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/activities?trashed=${includeTrashed}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        if (!includeTrashed) {
          const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
          let localItems: Activity[] = [];
          if (local) {
            try {
              localItems = JSON.parse(local);
            } catch (e) {}
          }
          const map = new Map<string, Activity>();
          localItems.forEach((item) => {
            if (item && item.id) map.set(item.id, item);
          });
          json.data.forEach((item: Activity) => {
            if (item && item.id) {
              const existing = map.get(item.id);
              map.set(item.id, { ...existing, ...item });
            }
          });
          const merged = Array.from(map.values())
            .filter((a) => a.status !== 'TRASHED' && !a.deleted_at)
            .sort(
              (a, b) =>
                new Date(b.start_date || b.created_at || Date.now()).getTime() -
                new Date(a.start_date || a.created_at || Date.now()).getTime()
            );
          localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(merged));
          return merged;
        }
        return json.data;
      }
    } catch (e) {
      console.warn('Failed to fetch /api/activities from client:', e);
    }
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: any) => includeTrashed || (a.status !== 'TRASHED' && !a.deleted_at));
        }
      } catch (e) {}
    }
    return [];
  }

  let supabaseData: Activity[] = [];

  if (isSupabaseConfigured()) {
    try {
      const client = supabaseAdmin;
      let query = client
        .from('activities')
        .select(`
          *,
          people:activity_people(*),
          documents:activity_documents(*)
        `)
        .order('start_date', { ascending: false });

      if (!includeTrashed) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;
      if (!error && data) {
        supabaseData = data.map((item: any) => {
          const docs = (item.documents || []).map((d: any) => ({
            id: d.id,
            name: d.original_filename || d.file_name || d.name || 'Foto.jpg',
            file_name: d.original_filename || d.file_name || d.name || 'Foto.jpg',
            previewUrl: d.web_view_url || d.preview_url || d.previewUrl || (d.drive_file_id ? `https://drive.google.com/thumbnail?id=${d.drive_file_id}&sz=w1000` : ''),
            web_view_url: d.web_view_url || d.preview_url || d.previewUrl || '',
            drive_file_id: d.drive_file_id || '',
            tanggal_foto: d.documentation_date || d.tanggal_foto || item.start_date,
          }));

          return {
            ...item,
            nama_kegiatan: item.name || item.nama_kegiatan,
            deskripsi_kegiatan: item.description || item.deskripsi_kegiatan || '',
            ringkasan_kegiatan: item.description || item.ringkasan_kegiatan || '',
            nama_pegawai: item.nama_pegawai || '',
            nip: item.nip || '',
            jabatan: item.jabatan || '',
            tanggal: item.start_date,
            tanggal_selesai: item.end_date,
            documents: docs,
            fotos: docs,
            people: item.people || [],
            petugas_ditemui: item.people?.map((p: any) => ({ nama: p.person_name, jabatan: p.position })) || [],
          };
        });
      }

      try {
        const { data: penugasanData } = await client
          .from('laporan_penugasan')
          .select(`
            *,
            petugas_ditemui:penugasan_petugas_ditemui(*),
            fotos:penugasan_foto(*)
          `)
          .order('tanggal_perjadin', { ascending: false });

        if (penugasanData) {
          penugasanData.forEach((p: any) => {
            const mapped = mapPenugasanToActivity(p);
            supabaseData.push(mapped);
          });
        }
      } catch (e) {}
    } catch (err) {
      console.warn('Supabase fetch activities exception:', err);
    }
  }

  const mergedMap = new Map<string, Activity>();

  try {
    const serverStoreList = getStoredLaporanListServer();
    serverStoreList.forEach((item: any) => {
      if (item && item.id) {
        const isTrashed = Boolean(item.deleted_at || item.status === 'TRASHED');
        if (includeTrashed || !isTrashed) {
          mergedMap.set(item.id, item as Activity);
        }
      }
    });
  } catch (e) {}

  try {
    const penugasanStoreList = getStoredPenugasanList();
    penugasanStoreList.forEach((p: any) => {
      if (p && p.id) {
        const mapped = mapPenugasanToActivity(p);
        const isTrashed = Boolean(mapped.deleted_at || mapped.status === 'TRASHED');
        if (includeTrashed || !isTrashed) {
          mergedMap.set(mapped.id, mapped);
        }
      }
    });
  } catch (e) {}

  supabaseData.forEach((item) => {
    if (item && item.id) {
      const isTrashed = Boolean(item.deleted_at || item.status === 'TRASHED');
      if (includeTrashed || !isTrashed) {
        const existing = mergedMap.get(item.id);
        const docs = item.documents?.length ? item.documents : existing?.documents || (existing as any)?.fotos || [];
        const people = item.people?.length ? item.people : existing?.people || (existing as any)?.petugas_ditemui || [];
        mergedMap.set(item.id, {
          ...existing,
          ...item,
          documents: docs,
          fotos: docs,
          people: people,
        });
      }
    }
  });

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.start_date || b.created_at || Date.now()).getTime() - new Date(a.start_date || a.created_at || Date.now()).getTime()
  );
}

/**
 * Fetch activity by ID
 */
export async function fetchLaporanById(id: string): Promise<Activity | null> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const foundLocal = parsed.find((a: any) => a.id === id);
          if (foundLocal) return foundLocal;
        }
      }
    } catch (e) {}
  }

  const list = await fetchLaporanList(true);
  const found = list.find((a) => a.id === id);
  if (found) return found;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('activities')
        .select(`
          *,
          people:activity_people(*),
          documents:activity_documents(*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        const docs = (data.documents || []).map((d: any) => ({
          id: d.id,
          name: d.original_filename || d.file_name || d.name || 'Foto.jpg',
          file_name: d.original_filename || d.file_name || d.name || 'Foto.jpg',
          previewUrl: d.web_view_url || d.preview_url || d.previewUrl || (d.drive_file_id ? `https://drive.google.com/thumbnail?id=${d.drive_file_id}&sz=w1000` : ''),
          web_view_url: d.web_view_url || d.preview_url || d.previewUrl || '',
          drive_file_id: d.drive_file_id || '',
          tanggal_foto: d.documentation_date || d.tanggal_foto || data.start_date,
        }));

        return {
          ...data,
          nama_kegiatan: data.name,
          deskripsi_kegiatan: data.description || '',
          ringkasan_kegiatan: data.description || '',
          tanggal: data.start_date,
          tanggal_selesai: data.end_date,
          documents: docs,
          fotos: docs,
          people: data.people || [],
          petugas_ditemui: data.people?.map((p: any) => ({ nama: p.person_name, jabatan: p.position })) || [],
        };
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Create or update an activity record
 */
export async function saveLaporanRecord(
  activityData: Partial<Activity>,
  peopleData?: { person_name: string; position: string }[],
  photosData?: any[]
): Promise<Activity> {
  const newId =
    activityData.id ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const userId = activityData.user_id || '00000000-0000-0000-0000-000000000000';
  const name = activityData.name || activityData.nama_kegiatan || 'Kegiatan Tanpa Nama';
  const normalized = normalizeActivityName(name);

  // Check collision for new or updated activity name
  const isCollision = await checkActivityNameCollision(userId, name, activityData.id);
  if (isCollision && !activityData.id) {
    throw new Error('Kegiatan dengan nama tersebut sudah ada. Silakan gunakan nama kegiatan yang berbeda.');
  }

  // Enforce photo limit: Max 6 photos per activity per date
  if (photosData && photosData.length > 0) {
    const dateCounts = new Map<string, number>();
    for (const p of photosData) {
      const pDate = p.documentation_date || p.tanggal_foto || activityData.start_date || new Date().toISOString().split('T')[0];
      const count = (dateCounts.get(pDate) || 0) + 1;
      if (count > 6) {
        throw new Error('Maksimal 6 foto untuk satu kegiatan pada tanggal yang sama.');
      }
      dateCounts.set(pDate, count);
    }
  }

  const existingRecord = activityData.id ? await fetchLaporanById(activityData.id) : null;
  
  // Enforce locking rule: Server/Service rejection if generated and attempting identity change without Force Change
  if (existingRecord && existingRecord.status === 'GENERATED') {
    const nameChanged = existingRecord.name !== name;
    const startDateChanged = existingRecord.start_date !== (activityData.start_date || activityData.tanggal);
    const endDateChanged = existingRecord.end_date !== (activityData.end_date || activityData.tanggal_selesai);
    const spdChanged = existingRecord.spd_number !== activityData.spd_number;

    if (nameChanged || startDateChanged || endDateChanged || spdChanged) {
      throw new Error('Identitas kegiatan telah terkunci karena PDF telah ter-generate. Gunakan opsi "Ganti Paksa" untuk mengubah identitas.');
    }
  }

  const startDate = activityData.start_date || activityData.tanggal || new Date().toISOString().split('T')[0];
  const endDate = activityData.end_date || activityData.tanggal_selesai || startDate;
  const startTime = activityData.start_time || '08:00';
  const endTime = activityData.end_time || '16:00';
  let actType: any = activityData.activity_type;
  if (actType === 'penugasan' || actType === 'PERJALANAN_DINAS' || activityData.spd_number || (activityData as any).nomor_spd) {
    actType = 'PERJALANAN_DINAS';
  } else if (actType === 'harian' || actType === 'NON_PERJALANAN_DINAS') {
    actType = 'NON_PERJALANAN_DINAS';
  } else {
    actType = 'NON_PERJALANAN_DINAS';
  }
  const status: ActivityStatus = activityData.status || (existingRecord ? existingRecord.status : 'DRAFT');

  const fullRecord: Activity = {
    id: newId,
    user_id: userId,
    activity_type: actType,
    name: name,
    normalized_name: normalized,
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    destination: activityData.destination || activityData.tempat_tujuan,
    letter_number: activityData.letter_number || activityData.nomor_surat,
    spd_number: activityData.spd_number || activityData.nomor_spd,
    description: activityData.description || activityData.deskripsi_kegiatan || activityData.ringkasan_kegiatan || '',
    status: status,
    generated_at: activityData.generated_at || existingRecord?.generated_at,
    drive_pdf_url: activityData.drive_pdf_url || existingRecord?.drive_pdf_url,
    drive_pdf_file_id: activityData.drive_pdf_file_id || existingRecord?.drive_pdf_file_id,
    drive_folder_id: activityData.drive_folder_id || existingRecord?.drive_folder_id,
    people: peopleData || existingRecord?.people || [],
    documents: photosData || existingRecord?.documents || [],
    created_at: activityData.created_at || existingRecord?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Backward compatibility props
    nama_pegawai: activityData.nama_pegawai,
    nip: activityData.nip,
    jabatan: activityData.jabatan,
  };

  // 1. Save to Supabase DB if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: dbData, error } = await supabaseAdmin
        .from('activities')
        .upsert(
          {
            id: fullRecord.id,
            user_id: fullRecord.user_id,
            activity_type: fullRecord.activity_type,
            name: fullRecord.name,
            normalized_name: fullRecord.normalized_name,
            start_date: fullRecord.start_date,
            end_date: fullRecord.end_date,
            start_time: fullRecord.start_time,
            end_time: fullRecord.end_time,
            destination: fullRecord.destination,
            letter_number: fullRecord.letter_number,
            spd_number: fullRecord.spd_number,
            description: fullRecord.description,
            nama_pegawai: fullRecord.nama_pegawai,
            nip: fullRecord.nip,
            jabatan: fullRecord.jabatan,
            status: fullRecord.status,
            generated_at: fullRecord.generated_at,
            drive_pdf_url: fullRecord.drive_pdf_url,
            drive_pdf_file_id: fullRecord.drive_pdf_file_id,
            drive_folder_id: fullRecord.drive_folder_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (!error && dbData) {
        // Save People
        if (peopleData && peopleData.length > 0) {
          await supabaseAdmin.from('activity_people').delete().eq('activity_id', dbData.id);
          const peopleRows = peopleData.map((p, idx) => ({
            activity_id: dbData.id,
            person_name: p.person_name,
            position: p.position,
            sort_order: idx + 1,
          }));
          await supabaseAdmin.from('activity_people').insert(peopleRows);
        }

        // Save Documents
        if (photosData && photosData.length > 0) {
          await supabaseAdmin.from('activity_documents').delete().eq('activity_id', dbData.id);
          const docRows = photosData.map((p, idx) => ({
            activity_id: dbData.id,
            documentation_date: p.documentation_date || p.tanggal_foto || startDate,
            original_filename: p.original_filename || p.file_name || p.name || `foto_${idx + 1}.jpg`,
            mime_type: p.mime_type || 'image/jpeg',
            file_size_bytes: p.file_size_bytes || 0,
            kind: p.kind || 'PHOTO',
            drive_file_id: p.drive_file_id || '',
            web_view_url: p.web_view_url || p.previewUrl || p.drive_file_url || '',
            sort_order: idx + 1,
          }));
          await supabaseAdmin.from('activity_documents').insert(docRows);
        }
      }
    } catch (e) {
      console.warn('Supabase save activity exception:', e);
    }
  }

  // 2. Save to Server-side JSON Store
  try {
    const serverList = getStoredLaporanListServer();
    const existingIndex = serverList.findIndex((l: any) => l.id === fullRecord.id);
    let updatedServerList;
    if (existingIndex >= 0) {
      updatedServerList = [...serverList];
      updatedServerList[existingIndex] = fullRecord as any;
    } else {
      updatedServerList = [fullRecord as any, ...serverList];
    }
    saveStoredLaporanListServer(updatedServerList);
  } catch (e) {
    console.warn('Failed to save to server json store:', e);
  }

  // 3. Save to LocalStorage fallback
  if (typeof window !== 'undefined') {
    let list: Activity[] = [];
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        list = JSON.parse(local);
      } catch (e) {}
    }
    const idx = list.findIndex((l) => l.id === fullRecord.id);
    if (idx >= 0) list[idx] = fullRecord;
    else list.unshift(fullRecord);
    localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
  }

  return fullRecord;
}

/**
 * Copy an existing activity (SRS Section 7)
 * Does NOT copy dates, times, documentation, generated PDF, or Drive IDs.
 */
export async function copyActivityRecord(sourceId: string): Promise<Activity> {
  const source = await fetchLaporanById(sourceId);
  if (!source) {
    throw new Error('Kegiatan asal tidak ditemukan!');
  }

  const copyName = `${source.name} (Salinan)`;
  const copiedRecord: Partial<Activity> = {
    user_id: source.user_id,
    activity_type: source.activity_type,
    name: copyName,
    destination: source.destination,
    letter_number: source.letter_number,
    spd_number: source.spd_number ? `${source.spd_number}-COPY` : undefined,
    description: source.description,
    status: 'DRAFT',
    people: source.people ? [...source.people] : [],
    // Blank out dates, times, documents, PDF IDs as per SRS COPY-003
    start_date: '',
    end_date: '',
    start_time: '08:00',
    end_time: '16:00',
    documents: [],
    drive_pdf_url: undefined,
    drive_pdf_file_id: undefined,
    drive_folder_id: undefined,
  };

  return await saveLaporanRecord(copiedRecord, source.people);
}

/**
 * Soft delete an activity (Move to TRASHED)
 */
/**
 * Soft delete an activity (Move to TRASHED)
 */
export async function trashLaporanRecord(id: string): Promise<boolean> {
  const nowIso = new Date().toISOString();

  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
      if (local) {
        let list: Activity[] = JSON.parse(local);
        list = list.map((l) =>
          l.id === id
            ? {
                ...l,
                status: 'TRASHED',
                previous_status: l.status || 'DRAFT',
                deleted_at: nowIso,
              }
            : l
        );
        localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
      }
    } catch (e) {}

    try {
      await fetch(`/api/activities/${id}/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trash' }),
      });
    } catch (e) {}

    return true;
  }

  // Server-side
  try {
    const serverList = getStoredLaporanListServer();
    const idx = serverList.findIndex((l: any) => l.id === id);
    if (idx >= 0) {
      serverList[idx] = {
        ...serverList[idx],
        status: 'TRASHED' as any,
        previous_status: serverList[idx].status || 'DRAFT',
        deleted_at: nowIso,
      } as any;
      saveStoredLaporanListServer(serverList);
    }
  } catch (e) {}

  try {
    const penugasanList = getStoredPenugasanList();
    const idx = penugasanList.findIndex((p: any) => p.id === id);
    if (idx >= 0) {
      penugasanList[idx] = {
        ...penugasanList[idx],
        deleted_at: nowIso,
      } as any;
      saveStoredPenugasanList(penugasanList);
    }
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin
        .from('activities')
        .update({
          status: 'TRASHED',
          deleted_at: nowIso,
        })
        .eq('id', id);

      await supabaseAdmin
        .from('laporan_penugasan')
        .update({
          deleted_at: nowIso,
        })
        .eq('id', id);
    } catch (e) {}
  }

  return true;
}

/**
 * Restore an activity from TRASHED
 */
export async function restoreLaporanRecord(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
      if (local) {
        let list: Activity[] = JSON.parse(local);
        list = list.map((l) =>
          l.id === id
            ? {
                ...l,
                status: (l.previous_status as ActivityStatus) || 'DRAFT',
                previous_status: undefined,
                deleted_at: undefined,
              }
            : l
        );
        localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
      }
    } catch (e) {}

    try {
      await fetch(`/api/activities/${id}/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
    } catch (e) {}

    return true;
  }

  // Server-side
  try {
    const serverList = getStoredLaporanListServer();
    const idx = serverList.findIndex((l: any) => l.id === id);
    if (idx >= 0) {
      serverList[idx] = {
        ...serverList[idx],
        status: (serverList[idx].previous_status as any) || 'DRAFT',
        previous_status: undefined,
        deleted_at: undefined,
      } as any;
      saveStoredLaporanListServer(serverList);
    }
  } catch (e) {}

  try {
    const penugasanList = getStoredPenugasanList();
    const idx = penugasanList.findIndex((p: any) => p.id === id);
    if (idx >= 0) {
      penugasanList[idx] = {
        ...penugasanList[idx],
        deleted_at: undefined,
      } as any;
      saveStoredPenugasanList(penugasanList);
    }
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin
        .from('activities')
        .update({
          status: 'DRAFT',
          previous_status: null,
          deleted_at: null,
        })
        .eq('id', id);

      await supabaseAdmin
        .from('laporan_penugasan')
        .update({
          deleted_at: null,
        })
        .eq('id', id);
    } catch (e) {}
  }

  return true;
}

/**
 * Permanent delete activity
 */
export async function permanentDeleteLaporanRecord(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
      if (local) {
        let list: Activity[] = JSON.parse(local);
        list = list.filter((l) => l.id !== id);
        localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
      }
    } catch (e) {}

    try {
      await fetch(`/api/activities/${id}/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'permanent' }),
      });
    } catch (e) {}

    return true;
  }

  // Server-side
  try {
    const serverList = getStoredLaporanListServer();
    const filtered = serverList.filter((l: any) => l.id !== id);
    saveStoredLaporanListServer(filtered);
  } catch (e) {}

  try {
    const penugasanList = getStoredPenugasanList();
    const filtered = penugasanList.filter((p: any) => p.id !== id);
    saveStoredPenugasanList(filtered);
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from('activity_documents').delete().eq('activity_id', id);
      await supabaseAdmin.from('activity_people').delete().eq('activity_id', id);
      await supabaseAdmin.from('activities').delete().eq('id', id);

      await supabaseAdmin.from('penugasan_foto').delete().eq('penugasan_id', id);
      await supabaseAdmin.from('penugasan_petugas_ditemui').delete().eq('penugasan_id', id);
      await supabaseAdmin.from('laporan_penugasan').delete().eq('id', id);
    } catch (e) {}
  }

  return true;
}

// Backward compatibility function alias
export async function deleteLaporanRecord(id: string): Promise<boolean> {
  return await trashLaporanRecord(id);
}
