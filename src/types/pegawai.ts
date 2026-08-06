export interface Pegawai {
  id: string;
  user_id?: string;
  nama: string;
  nip: string;
  jabatan: string;
  created_at?: string;
  updated_at?: string;
}

export type PegawaiInput = Omit<Pegawai, 'id' | 'created_at' | 'updated_at'>;
