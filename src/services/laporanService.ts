import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { Activity, ActivityPerson, ActivityDocument, ActivityStatus } from '@/types/laporan';
import { normalizeActivityName } from '@/utils/sanitizeFilename';

const LOCAL_STORAGE_LAPORAN = 'bps_laporan_data';

/**
 * Check case-insensitive activity name collision per user
 */
export async function checkActivityNameCollision(
  userId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const normalized = normalizeActivityName(name);

  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin
        .from('activities')
        .select('id')
        .eq('user_id', userId)
        .eq('normalized_name', normalized)
        .is('deleted_at', null);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return true; // Collision detected
      }
    } catch (err) {
      console.warn('Supabase name collision check exception:', err);
    }
  }

  // Local storage check
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        const list: Activity[] = JSON.parse(local);
        const match = list.find(
          (a) =>
            a.id !== excludeId &&
            a.deleted_at == null &&
            normalizeActivityName(a.name) === normalized
        );
        if (match) return true;
      } catch (e) {}
    }
  }

  return false;
}

/**
 * Fetch all active (non-trashed) activities for current user
 */
export async function fetchLaporanList(includeTrashed: boolean = false): Promise<Activity[]> {
  let supabaseData: Activity[] = [];

  if (isSupabaseConfigured()) {
    try {
      const client = typeof window === 'undefined' ? supabaseAdmin : supabase;
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
        supabaseData = data.map((item: any) => ({
          ...item,
          fotos: item.documents || [],
          petugas_ditemui: item.people?.map((p: any) => ({ nama: p.person_name, jabatan: p.position })) || [],
          tanggal: item.start_date,
          tanggal_selesai: item.end_date,
          nama_kegiatan: item.name,
          deskripsi_kegiatan: item.description || '',
          ringkasan_kegiatan: item.description || '',
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch activities exception:', err);
    }
  }

  // Fallback / merge LocalStorage
  let localData: Activity[] = [];
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        localData = JSON.parse(local);
      } catch (e) {}
    }
  }

  const mergedMap = new Map<string, Activity>();
  localData.forEach((item) => {
    if (item && item.id) {
      if (includeTrashed || !item.deleted_at) {
        mergedMap.set(item.id, item);
      }
    }
  });

  supabaseData.forEach((item) => {
    if (item && item.id) {
      mergedMap.set(item.id, item);
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
  const list = await fetchLaporanList(true);
  return list.find((item) => item.id === id) || null;
}

/**
 * Save / Create Activity Record with photo limit check and identity locking check
 */
export async function saveLaporanRecord(
  activityData: Partial<Activity>,
  peopleData?: { person_name: string; position: string }[],
  photosData?: any[]
): Promise<Activity> {
  const newId = activityData.id || `act_${Date.now()}`;
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
  const actType = activityData.activity_type || (activityData.spd_number ? 'PERJALANAN_DINAS' : 'NON_PERJALANAN_DINAS');
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
            original_filename: p.original_filename || p.file_name || `foto_${idx + 1}.jpg`,
            mime_type: p.mime_type || 'image/jpeg',
            file_size_bytes: p.file_size_bytes || 0,
            kind: p.kind || 'PHOTO',
            drive_file_id: p.drive_file_id || '',
            drive_name: p.drive_name || p.file_name || `foto_${idx + 1}.jpg`,
            sort_order: idx + 1,
          }));
          await supabaseAdmin.from('activity_documents').insert(docRows);
        }
      }
    } catch (e) {
      console.warn('Supabase save activity exception:', e);
    }
  }

  // 2. Save to LocalStorage fallback
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
export async function trashLaporanRecord(id: string): Promise<boolean> {
  const item = await fetchLaporanById(id);
  if (!item) return false;

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin
        .from('activities')
        .update({
          status: 'TRASHED',
          previous_status: item.status,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        let list: Activity[] = JSON.parse(local);
        list = list.map((l) =>
          l.id === id
            ? {
                ...l,
                status: 'TRASHED',
                previous_status: l.status,
                deleted_at: new Date().toISOString(),
              }
            : l
        );
        localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
      } catch (e) {}
    }
  }

  return true;
}

/**
 * Restore an activity from TRASHED
 */
export async function restoreLaporanRecord(id: string): Promise<boolean> {
  const item = await fetchLaporanById(id);
  if (!item) return false;

  const restoreStatus = item.previous_status || 'DRAFT';

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin
        .from('activities')
        .update({
          status: restoreStatus,
          previous_status: null,
          deleted_at: null,
        })
        .eq('id', id);
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        let list: Activity[] = JSON.parse(local);
        list = list.map((l) =>
          l.id === id
            ? {
                ...l,
                status: restoreStatus,
                previous_status: undefined,
                deleted_at: undefined,
              }
            : l
        );
        localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
      } catch (e) {}
    }
  }

  return true;
}

/**
 * Permanent delete activity
 */
export async function permanentDeleteLaporanRecord(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from('activities').delete().eq('id', id);
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        let list: Activity[] = JSON.parse(local);
        list = list.filter((l) => l.id !== id);
        localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(list));
      } catch (e) {}
    }
  }

  return true;
}

// Backward compatibility function alias
export async function deleteLaporanRecord(id: string): Promise<boolean> {
  return await trashLaporanRecord(id);
}
