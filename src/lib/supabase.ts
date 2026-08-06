import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase has real configured credentials
export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xyz.supabase.co') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy')
  );
};
