import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requireSupabase } from '../lib/supabase';
import type { Note, NoteDraft, ReportReason } from '../types';
import { ensureSession } from './useAnonSession';
import type { NotesResult } from './useNotesInView';

const NOTE_COLUMNS =
  'id, body, color, scope, lat, lng, place_name, place_kind, created_at, author_id';

export type ReportOutcome = 'reported' | 'duplicate';

export function useNoteMutations() {
  const queryClient = useQueryClient();

  const patchCache = (fn: (data: NotesResult) => NotesResult) => {
    queryClient.setQueriesData<NotesResult>({ queryKey: ['notes'] }, (old) =>
      old ? fn(old) : old,
    );
  };

  const create = useMutation({
    mutationFn: async (draft: NoteDraft): Promise<Note> => {
      // Retry the silent sign-in here so a transient boot failure can recover.
      await ensureSession();
      const { data, error } = await requireSupabase()
        .from('notes')
        .insert({
          body: draft.body,
          color: draft.color,
          scope: draft.scope,
          lat: draft.lat,
          lng: draft.lng,
          // The DB rejects empty strings, so send null when no label was found.
          place_name: draft.place_name || null,
          place_kind: draft.place_kind || null,
        })
        .select(NOTE_COLUMNS)
        .single();
      if (error) throw error;
      const { author_id: _author, ...rest } = data as Note & { author_id: string };
      return { ...rest, is_mine: true };
    },
    onSuccess: (note) => {
      patchCache((d) => ({ ...d, notes: [note, ...d.notes.filter((n) => n.id !== note.id)] }));
    },
  });

  const remove = useMutation({
    mutationFn: async (noteId: string): Promise<string> => {
      const { data, error } = await requireSupabase()
        .from('notes')
        .delete()
        .eq('id', noteId)
        .select('id');
      if (error) throw error;
      // RLS hides rows that aren't yours; an empty result means nothing was deleted.
      if (!data || data.length === 0) throw new Error('You can only delete your own notes.');
      return noteId;
    },
    onSuccess: (noteId) => {
      patchCache((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== noteId) }));
    },
  });

  const report = useMutation({
    mutationFn: async (args: { noteId: string; reason: ReportReason }): Promise<ReportOutcome> => {
      await ensureSession();
      const { error } = await requireSupabase()
        .from('note_reports')
        .insert({ note_id: args.noteId, reason: args.reason });
      // unique(note_id, reporter_id): a second report from the same user is a no-op.
      if (error?.code === '23505') return 'duplicate';
      if (error) throw error;
      return 'reported';
    },
  });

  return { create, remove, report };
}
