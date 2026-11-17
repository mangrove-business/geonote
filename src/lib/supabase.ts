import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Client singleton. Null when the build has no Supabase env vars, so a fresh
 * deploy (M0/M1) still renders the map instead of crashing.
 * The publishable/anon key is safe in the browser only because RLS is enabled.
 */
export const supabase: SupabaseClient | null = HAS_BACKEND
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Backend is not configured');
  return supabase;
}
