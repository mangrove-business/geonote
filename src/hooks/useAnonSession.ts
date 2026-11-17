import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SessionStatus } from '../types';

/** Resolves an existing session or silently signs in anonymously. */
export async function ensureSession() {
  if (!supabase) throw new Error('Backend is not configured');
  const { data: current } = await supabase.auth.getSession();
  if (current.session) return current.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) throw new Error('Anonymous sign-in returned no session');
  return data.session;
}

/**
 * Boots the anonymous session without blocking the map.
 * Failure => 'failed' (read-only mode), never a broken app.
 */
export function useAnonSession() {
  const [status, setStatus] = useState<SessionStatus>(supabase ? 'pending' : 'unconfigured');

  const start = useCallback(() => {
    if (!supabase) return;
    setStatus('pending');
    ensureSession()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('failed'));
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  return { status, retry: start };
}
