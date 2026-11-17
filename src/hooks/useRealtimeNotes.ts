import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Realtime only makes the app feel alive. Correctness comes from refetching,
 * so every event just invalidates the notes cache (debounced ~1s), and the tab
 * regaining focus does the same.
 */
export function useRealtimeNotes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['notes'] });
      }, 1000);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', onVisible);

    const client = supabase;
    const channel = client
      ?.channel('notes-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes' }, invalidate)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notes' }, invalidate)
      .subscribe();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [queryClient]);
}
