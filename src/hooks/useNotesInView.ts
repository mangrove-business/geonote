import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { BBOX_PAD, NOTES_CAP } from '../lib/config';
import { bboxContains, padBbox, splitAntimeridian, zoomBucket } from '../lib/geo';
import { requireSupabase, supabase } from '../lib/supabase';
import type { Bbox, Note, ViewState } from '../types';

export interface NotesResult {
  notes: Note[];
  capped: boolean;
}

interface Region {
  bbox: Bbox;
  zoom: number;
}

async function fetchNotes(region: Region): Promise<NotesResult> {
  const client = requireSupabase();
  const parts = splitAntimeridian(region.bbox);
  const results = await Promise.all(
    parts.map(async (b) => {
      const { data, error } = await client.rpc('notes_in_view', {
        min_lng: b.west,
        min_lat: b.south,
        max_lng: b.east,
        max_lat: b.north,
        view_zoom: region.zoom,
      });
      if (error) throw error;
      return (data ?? []) as Note[];
    }),
  );

  const seen = new Map<string, Note>();
  for (const list of results) for (const n of list) seen.set(n.id, n);
  return {
    notes: [...seen.values()],
    capped: results.some((list) => list.length >= NOTES_CAP),
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Viewport -> padded region -> TanStack Query.
 * Region only changes when the view leaves the last fetched box or the integer
 * zoom bucket changes, so small pans never refetch.
 */
export function useNotesInView(view: ViewState | null) {
  const [region, setRegion] = useState<Region | null>(null);
  const regionRef = useRef<Region | null>(null);

  useEffect(() => {
    if (!view) return;
    const bucket = zoomBucket(view.zoom);
    const last = regionRef.current;
    if (last && last.zoom === bucket && bboxContains(last.bbox, view.bbox)) return;
    const next = { bbox: padBbox(view.bbox, BBOX_PAD), zoom: bucket };
    regionRef.current = next;
    setRegion(next);
  }, [view]);

  const query = useQuery({
    queryKey: [
      'notes',
      region?.zoom,
      region && [
        round(region.bbox.west),
        round(region.bbox.south),
        round(region.bbox.east),
        round(region.bbox.north),
      ],
    ],
    queryFn: () => fetchNotes(region as Region),
    enabled: Boolean(supabase && region),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  return {
    notes: query.data?.notes,
    capped: query.data?.capped ?? false,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasRegion: region !== null,
  };
}
