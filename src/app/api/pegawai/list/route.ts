import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { Pegawai } from '@/types/pegawai';

const STORE_PATH = path.join(process.cwd(), 'public', 'pegawai_store.json');

function getStoredPegawai(): Pegawai[] {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {}
  }
  return [];
}

export async function GET() {
  let supabaseData: Pegawai[] = [];

  // Query Supabase DB directly using supabaseAdmin on server
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pegawai')
        .select('*')
        .order('nama', { ascending: true });

      if (!error && data) {
        supabaseData = data;
      } else if (error) {
        console.error('Supabase fetch pegawai error in /api/pegawai/list:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch pegawai exception:', err);
    }
  }

  const serverData = getStoredPegawai();

  // Merge server JSON store and Supabase DB
  const mergedMap = new Map<string, Pegawai>();
  serverData.forEach((p) => { if (p && p.id) mergedMap.set(p.id, p); });
  supabaseData.forEach((p) => { if (p && p.id) mergedMap.set(p.id, p); });

  const finalResult = Array.from(mergedMap.values()).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  return NextResponse.json({ success: true, data: finalResult });
}
