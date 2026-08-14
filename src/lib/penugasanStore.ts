import { LaporanPenugasan } from '@/types/penugasan';

export function getStoredPenugasanList(): LaporanPenugasan[] {
  if (typeof window !== 'undefined') return [];
  try {
    const fsModule = eval('require')('fs');
    const pathModule = eval('require')('path');
    const storePath = pathModule.join(process.cwd(), 'public', 'penugasan_store.json');
    if (fsModule.existsSync(storePath)) {
      const data = fsModule.readFileSync(storePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return [];
}

export function saveStoredPenugasanList(list: LaporanPenugasan[]) {
  if (typeof window !== 'undefined') return;
  try {
    const fsModule = eval('require')('fs');
    const pathModule = eval('require')('path');
    const storePath = pathModule.join(process.cwd(), 'public', 'penugasan_store.json');
    const dir = pathModule.dirname(storePath);
    if (!fsModule.existsSync(dir)) fsModule.mkdirSync(dir, { recursive: true });
    fsModule.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write penugasan_store.json:', e);
  }
}
