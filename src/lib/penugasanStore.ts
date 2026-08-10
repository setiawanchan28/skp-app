import fs from 'fs';
import path from 'path';
import { LaporanPenugasan } from '@/types/penugasan';

const STORE_PATH = path.join(process.cwd(), 'public', 'penugasan_store.json');

export function getStoredPenugasanList(): LaporanPenugasan[] {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {}
  }
  return [];
}

export function saveStoredPenugasanList(list: LaporanPenugasan[]) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write penugasan_store.json:', e);
  }
}
