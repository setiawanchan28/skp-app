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
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .order('nama', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch error, fallback to local storage:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PEGAWAI));
  }
  return DEFAULT_PEGAWAI;
}

export async function createPegawai(input: PegawaiInput): Promise<Pegawai> {
  const newPegawai: Pegawai = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `peg_${Date.now()}`,
    ...input,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('pegawai').insert(input).select().single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase insert pegawai error:', err);
    }
  }

  // Save to local storage
  if (typeof window !== 'undefined') {
    const list = await fetchPegawaiList();
    const updated = [newPegawai, ...list];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  return newPegawai;
}

export async function updatePegawai(id: string, input: PegawaiInput): Promise<Pegawai> {
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

  // Update local storage
  if (typeof window !== 'undefined') {
    const list = await fetchPegawaiList();
    const updated = list.map((p) => (p.id === id ? { ...p, ...input } : p));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  return { id, ...input };
}

export async function deletePegawai(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('pegawai').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete pegawai error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const list = await fetchPegawaiList();
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
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
