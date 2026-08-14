import { LaporanPenugasan } from '@/types/penugasan';

export function getStoredPenugasanList(): LaporanPenugasan[] {
  if (typeof window !== 'undefined') return [];
  try {
    const fs = eval('require')('fs');
    const path = eval('require')('path');
    const storePath = path.join(process.cwd(), 'public', 'penugasan_store.json');
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return [];
}

export function saveStoredPenugasanList(list: LaporanPenugasan[]) {
  if (typeof window !== 'undefined') return;
  try {
    const fs = eval('require')('fs');
    const path = eval('require')('path');
    const storePath = path.join(process.cwd(), 'public', 'penugasan_store.json');
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write penugasan_store.json:', e);
  }
}
