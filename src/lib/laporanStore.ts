import { Laporan } from '@/types/laporan';

export function getStoredLaporanList(): Laporan[] {
  if (typeof window === 'undefined') {
    try {
      const serverMod = eval('require')('./laporanStoreServer');
      return serverMod.getStoredLaporanListServer();
    } catch (e) {}
  }
  return [];
}

export function saveStoredLaporanList(list: Laporan[]) {
  if (typeof window === 'undefined') {
    try {
      const serverMod = eval('require')('./laporanStoreServer');
      serverMod.saveStoredLaporanListServer(list);
    } catch (e) {}
  }
}
