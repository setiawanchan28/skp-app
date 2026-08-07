import { createClient } from '@supabase/supabase-js';

function cleanUrl(url?: string): string {
  if (!url) return 'https://xyz.supabase.co';
  return url.trim().replace(/\/+$/, '').replace(/^["']|["']$/g, '');
}

function cleanKey(key?: string): string {
  if (!key) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
  return key.trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase has real configured credentials
export const isSupabaseConfigured = () => {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !supabaseUrl.includes('xyz.supabase.co') &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !supabaseAnonKey.includes('dummy')
  );
};
