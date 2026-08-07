import { createClient } from '@supabase/supabase-js';

function cleanUrl(url?: string): string {
  if (!url) return 'https://xyz.supabase.co';
  const cleaned = url.trim().replace(/^["']|["']$/g, '');
  try {
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch (e) {
    return cleaned.replace(/\/+$/, '');
  }
}

function cleanKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
const supabaseServiceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client using service role key (bypasses RLS on server for 100% reliable writes)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : supabase;

// Helper to check if Supabase has real configured credentials
export const isSupabaseConfigured = () => {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !supabaseUrl.includes('xyz.supabase.co') &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !supabaseAnonKey.includes('dummy')
  );
};
