import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Pegawai, PegawaiInput } from '@/types/pegawai';

const LOCAL_STORAGE_KEY = 'bps_pegawai_data';

const DEFAULT_PEGAWAI: Pegawai[] = [
  {
    id: 'peg-main',
    nama: 'Dede Setiawan, S.Tr.Stat.',
    nip: '199502282024211021',
    jabatan: 'Pranata Komputer Ahli Pertama',
    email: 'ddsetiawan28@gmail.com',
    created_at: new Date().toISOString(),
  },
];

export async function fetchPegawaiList(): Promise<Pegawai[]> {
  let serverData: Pegawai[] = [];

  // 1. Fetch from server API store first (guarantees cross-browser persistence)
  try {
    const res = await fetch('/api/pegawai/save', { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        serverData = result.data;
      }
    }
  } catch (err) {
    console.warn('API fetch pegawai notice:', err);
  }

  // 2. Fetch from Supabase DB if configured
  let supabaseData: Pegawai[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .order('nama', { ascending: true });

      if (!error && data) {
        supabaseData = data;
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  // 3. Local storage fallback
  let localData: Pegawai[] = [];
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        localData = JSON.parse(local);
      } catch (e) {}
    }
  }

  const isLegacyDummy = (id: string) => id === 'peg-1' || id === 'peg-2' || id === 'peg-3';
  localData = localData.filter((p) => !isLegacyDummy(p.id));
  supabaseData = supabaseData.filter((p) => !isLegacyDummy(p.id));
  serverData = serverData.filter((p) => !isLegacyDummy(p.id));

  const mergedMap = new Map<string, Pegawai>();
  serverData.forEach((p) => { if (p && p.id) mergedMap.set(p.id, p); });
  localData.forEach((p) => { if (p && p.id) mergedMap.set(p.id, p); });
  supabaseData.forEach((p) => { if (p && p.id) mergedMap.set(p.id, p); });

  let finalResult = Array.from(mergedMap.values());
  if (finalResult.length === 0) {
    finalResult = DEFAULT_PEGAWAI;
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalResult));
  }

  return finalResult;
}

export async function savePegawaiOnline(input: { id?: string; nama: string; nip: string; jabatan?: string; email?: string }): Promise<Pegawai> {
  const payload = {
    id: input.id || 'peg-main',
    nama: input.nama,
    nip: input.nip,
    jabatan: input.jabatan || 'Pranata Komputer Ahli Pertama',
    email: input.email || 'ddsetiawan28@gmail.com',
  };

  try {
    const res = await fetch('/api/pegawai/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bps_auth_user', JSON.stringify(result.data));
          localStorage.setItem('bps_saved_profile', JSON.stringify(result.data));
        }
        return result.data;
      }
    }
  } catch (err) {
    console.warn('API save pegawai notice:', err);
  }

  return createPegawai(payload);
}

export async function createPegawai(input: PegawaiInput): Promise<Pegawai> {
  const newPegawai: Pegawai = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `peg_${Date.now()}`,
    ...input,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const list = await fetchPegawaiList();
    const updated = [newPegawai, ...list];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('pegawai').insert(input).select().single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase insert pegawai error:', err);
    }
  }

  return newPegawai;
}

export async function updatePegawai(id: string, input: PegawaiInput): Promise<Pegawai> {
  if (typeof window !== 'undefined') {
    const list = await fetchPegawaiList();
    const updated = list.map((p) => (p.id === id ? { ...p, ...input } : p));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('pegawai')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase update pegawai error:', err);
    }
  }

  return { id, ...input };
}

export async function deletePegawai(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const list = await fetchPegawaiList();
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('pegawai').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete pegawai error:', err);
    }
  }

  return true;
}

export async function importPegawaiBulk(inputs: PegawaiInput[]): Promise<Pegawai[]> {
  const created: Pegawai[] = [];
  for (const input of inputs) {
    const item = await createPegawai(input);
    created.push(item);
  }
  return created;
}
