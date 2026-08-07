import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Pegawai, PegawaiInput } from '@/types/pegawai';

const LOCAL_STORAGE_KEY = 'bps_pegawai_data';

const DEFAULT_PEGAWAI: Pegawai[] = [
  {
    id: 'peg-default-1',
    nama: 'Dede Setiawan, S.Tr.Stat.',
    nip: '199502282024211021',
    jabatan: 'Pranata Komputer Ahli Pertama',
    email: 'ddsetiawan28@gmail.com',
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
    }
  }

  // Filter out legacy dummy sample items (peg-1, peg-2, peg-3)
  const isLegacyDummy = (id: string) => id === 'peg-1' || id === 'peg-2' || id === 'peg-3';
  localData = localData.filter((p) => !isLegacyDummy(p.id));
  supabaseData = supabaseData.filter((p) => !isLegacyDummy(p.id));

  const mergedMap = new Map<string, Pegawai>();
  localData.forEach((p) => {
    if (p && p.id) mergedMap.set(p.id, p);
  });
  supabaseData.forEach((p) => {
    if (p && p.id) mergedMap.set(p.id, p);
  });

  let finalResult = Array.from(mergedMap.values());
  if (finalResult.length === 0) {
    finalResult = DEFAULT_PEGAWAI;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PEGAWAI));
    }
  }

  return finalResult;
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
