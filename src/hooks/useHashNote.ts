import { useEffect, useRef } from 'react';
import { requireSupabase, supabase } from '../lib/supabase';
import type { Note } from '../types';

const HASH_RE = /^#\/n\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function parseNoteHash(hash: string): string | null {
  const m = HASH_RE.exec(hash);
  return m ? m[1].toLowerCase() : null;
}

export function noteShareUrl(id: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/n/${id}`;
}

interface Handlers {
  onFound: (note: Note) => void;
  onMissing: () => void;
}

/**
 * Deep links: #/n/<uuid>. Runs on boot and on hashchange.
 * Tapping notes never writes the hash; the URL is for sharing only.
 */
export function useHashNote(handlers: Handlers, ready: boolean) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // Wait for the session to settle so `is_mine` is correct (Delete on your own link).
    if (!ready) return;
    let cancelled = false;

    const run = async () => {
      const id = parseNoteHash(window.location.hash);
      if (!id) return;
      if (!supabase) {
        handlersRef.current.onMissing();
        return;
      }
      try {
        const { data, error } = await requireSupabase()
          .rpc('note_by_id', { note_id: id })
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
          handlersRef.current.onMissing();
          return;
        }
        handlersRef.current.onFound(data as Note);
      } catch {
        if (!cancelled) handlersRef.current.onMissing();
      }
    };

    void run();
    window.addEventListener('hashchange', run);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', run);
    };
  }, [ready]);
}
