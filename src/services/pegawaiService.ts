import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Pegawai, PegawaiInput } from '@/types/pegawai';

const LOCAL_STORAGE_KEY = 'bps_pegawai_data';

const DEFAULT_PEGAWAI: Pegawai[] = [
  {
    id: 'peg-1',
    nama: 'Dede Supriatna, S.Si., M.Stat.',
    nip: '198805122010121002',
    jabatan: 'Statistisi Ahli Muda',
    created_at: new Date().toISOString(),
  },
  {
    id: 'peg-2',
    nama: 'Ahmad Fauzi, S.ST.',
    nip: '199203152014021001',
    jabatan: 'Statistisi Ahli Pertama',
    created_at: new Date().toISOString(),
  },
  {
    id: 'peg-3',
    nama: 'Siti Rahmawati, A.Md.',
    nip: '199508202018012003',
    jabatan: 'Pranata Komputer Mahir',
    created_at: new Date().toISOString(),
  },
];

export async function fetchPegawaiList(): Promise<Pegawai[]> {
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
      console.warn('Supabase fetch error, fallback to local storage:', err);
    }
  }

  // Local storage fallback
  let localData: Pegawai[] = [];
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        localData = JSON.parse(local);
      } catch (e) {}
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PEGAWAI));
      localData = DEFAULT_PEGAWAI;
    }
  }

  const mergedMap = new Map<string, Pegawai>();
  localData.forEach((p) => mergedMap.set(p.id, p));
  supabaseData.forEach((p) => mergedMap.set(p.id, p));

  const list = Array.from(mergedMap.values());
  return list.length > 0 ? list : DEFAULT_PEGAWAI;
}

export async function createPegawai(input: PegawaiInput): Promise<Pegawai> {
  const newPegawai: Pegawai = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `peg_${Date.now()}`,
    ...input,
    created_at: new Date().toISOString(),
  };

  // Save to local storage
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
