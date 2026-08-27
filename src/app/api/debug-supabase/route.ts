import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const isConfigured = isSupabaseConfigured();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NONE';
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let testInsertResult: any = null;
  let testInsertError: any = null;

  if (isConfigured) {
    try {
      const testId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '99999999-9999-9999-9999-999999999999';
      
      // Get first user from auth.users or fallback
      let targetUserId = '00000000-0000-0000-0000-000000000000';
      try {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        if (users?.users && users.users.length > 0) {
          targetUserId = users.users[0].id;
        }
      } catch (e) {}

      const { data, error } = await supabaseAdmin
        .from('activities')
        .upsert(
          {
            id: testId,
            user_id: targetUserId,
            activity_type: 'NON_PERJALANAN_DINAS',
            name: 'Debug Test Activity ' + new Date().toISOString(),
            normalized_name: 'debug test activity',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '16:00',
            status: 'DRAFT',
            description: 'Debug record to check write access',
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      testInsertResult = data;
      testInsertError = error;
    } catch (e: any) {
      testInsertError = { message: e.message, stack: e.stack };
    }
  }

  return NextResponse.json({
    isConfigured,
    supabaseUrl,
    hasAnonKey,
    hasServiceKey,
    testInsertResult,
    testInsertError,
  });
}
