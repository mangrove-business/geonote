import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AboutSheet } from './components/AboutSheet';
import { IntroHint } from './components/IntroHint';
import { MapView, type MapHandle, type MapHighlight } from './components/MapView';
import { NoteCard } from './components/NoteCard';
import { NoteComposer } from './components/NoteComposer';
import { ReportSheet } from './components/ReportSheet';
import { TopBar } from './components/TopBar';
import { Toasts, type Toast } from './components/Toasts';
import { useAnonSession } from './hooks/useAnonSession';
import { useDelayedFlag } from './hooks/useDelayedFlag';
import { noteShareUrl, useHashNote } from './hooks/useHashNote';
import { useNoteMutations } from './hooks/useNoteMutations';
import { useNotesInView } from './hooks/useNotesInView';
import { useOnline } from './hooks/useOnline';
import { useRealtimeNotes } from './hooks/useRealtimeNotes';
import { copyText } from './lib/clipboard';
import { INTRO_STORAGE_KEY, NOTES_CAP, SCOPES } from './lib/config';
import { useI18n } from './lib/i18n';
import type { Note, NoteDraft, PickedPoint, ReportReason, ViewState } from './types';

function introAlreadyDismissed(): boolean {
  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const mapRef = useRef<MapHandle>(null);

  const [view, setView] = useState<ViewState | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const [composerPoint, setComposerPoint] = useState<PickedPoint | null>(null);
  const [reportFor, setReportFor] = useState<Note | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => !introAlreadyDismissed());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const online = useOnline();
  const session = useAnonSession();
  const notesQuery = useNotesInView(view);
  const { create, remove, report } = useNoteMutations();
  useRealtimeNotes();

  // ---- toasts ----
  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, action?: Toast['action']) => {
      const id = ++toastId.current;
      setToasts((list) => [...list.slice(-2), { id, message, action }]);
      setTimeout(() => dismissToast(id), action ? 8000 : 4000);
    },
    [dismissToast],
  );

  const dismissIntro = useCallback(() => {
    setIntroVisible(false);
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      // private mode etc.: the pill just shows again next visit
    }
  }, []);

  // ---- session + data side effects ----
  // Notes fetched before sign-in finished have is_mine = false; refetch once we have a session.
  useEffect(() => {
    if (session.status === 'ready') void queryClient.invalidateQueries({ queryKey: ['notes'] });
  }, [session.status, queryClient]);

  const wasError = useRef(false);
  useEffect(() => {
    if (notesQuery.isError && !wasError.current && online) {
      push(t('unavailable'), {
        label: 'Retry',
        onClick: () => void notesQuery.refetch(),
      });
    }
    wasError.current = notesQuery.isError;
  }, [notesQuery.isError, notesQuery.refetch, online, push]);

  // ---- deep links (#/n/<uuid>) ----
  useHashNote(
    {
      onFound: (note) => {
        setComposerPoint(null);
        setSelected(note);
        mapRef.current?.flyTo(note.lng, note.lat, SCOPES[note.scope].shareZoom);
      },
      onMissing: () => push(t('removed')),
    },
    session.status !== 'pending',
  );

  // ---- map events ----
  const handleMapClick = useCallback(
    (point: PickedPoint) => {
      if (composerPoint) return; // a sheet is focused: ignore stray taps
      if (selected) {
        setSelected(null); // tapping the map is the "backdrop click" for the card
        return;
      }
      dismissIntro();
      setComposerPoint(point);
      mapRef.current?.ensureVisible(point.lng, point.lat);
    },
    [composerPoint, selected, dismissIntro],
  );

  const handleNoteClick = useCallback(
    (id: string) => {
      const note = notesQuery.notes?.find((n) => n.id === id);
      if (!note) return;
      if (composerPoint) return;
      setSelected(note);
    },
    [notesQuery.notes, composerPoint],
  );

  // ---- actions ----
  const submitNote = async (draft: NoteDraft) => {
    const note = await create.mutateAsync(draft);
    setComposerPoint(null);
    setSelected(note);
    mapRef.current?.flyTo(note.lng, note.lat, SCOPES[note.scope].shareZoom);
    push(t('posted'));
  };

  const deleteNote = async (note: Note) => {
    await remove.mutateAsync(note.id);
    setSelected(null);
    push(t('deleted'));
  };

  const reportNote = async (reason: ReportReason) => {
    if (!reportFor) return;
    const outcome = await report.mutateAsync({ noteId: reportFor.id, reason });
    setReportFor(null);
    push(outcome === 'duplicate' ? 'You already reported this note.' : 'Thanks, we’ll take a look.');
    // A 5th report auto-hides the note server-side; refetch so it disappears.
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  const randomNote = useCallback(() => {
    const notes = notesQuery.notes ?? [];
    if (!notes.length) {
      push(t('randomEmpty'));
      return;
    }
    const note = notes[Math.floor(Math.random() * notes.length)];
    setComposerPoint(null);
    setSelected(note);
    mapRef.current?.flyTo(note.lng, note.lat, SCOPES[note.scope].shareZoom);
  }, [notesQuery.notes, push, t]);

  const shareNote = async (note: Note) => {
    const url = noteShareUrl(note.id);
    const ok = await copyText(url);
    push(ok ? t('copied') : `Couldn’t copy automatically. Link: ${url}`);
  };

  // ---- derived UI state ----
  const loadingPill = useDelayedFlag(notesQuery.isFetching && online, 400);
  const sheetOpen = composerPoint !== null || selected !== null;
  const highlight = useMemo<MapHighlight | null>(() => {
    if (composerPoint) return { lat: composerPoint.lat, lng: composerPoint.lng, kind: 'draft' };
    if (selected) return { lat: selected.lat, lng: selected.lng, kind: 'selected' };
    return null;
  }, [composerPoint, selected]);

  const readOnlyReason =
    session.status === 'failed' ? 'failed' : session.status === 'unconfigured' ? 'unconfigured' : null;

  const showEmpty =
    session.status !== 'unconfigured' &&
    view !== null &&
    view.zoom >= 14 &&
    notesQuery.notes?.length === 0 &&
    !notesQuery.isFetching &&
    !notesQuery.isError;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MapView
        ref={mapRef}
        notes={notesQuery.notes}
        highlight={highlight}
        onViewChange={setView}
        onMapClick={handleMapClick}
        onNoteClick={handleNoteClick}
        onLoaded={() => setMapLoaded(true)}
        onLoadError={() => push(t('mapError'))}
        onLocateError={(message) => push(message)}
      />

      {!mapLoaded && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden" role="progressbar" aria-label="Loading map">
          <div className="progress-bar" />
        </div>
      )}

      <TopBar readOnlyReason={readOnlyReason} offline={!online} satellite={satellite} onSatellite={() => { mapRef.current?.toggleSatellite(); setSatellite((v) => !v); }} onRandom={randomNote} onAbout={() => setAboutOpen(true)} />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] ${
          sheetOpen ? 'max-md:hidden' : ''
        }`}
      >
        {introVisible && !composerPoint && <IntroHint onDismiss={dismissIntro} />}
        {loadingPill && <div className="pill" role="status">{t('loading')}</div>}
        {showEmpty && <div className="pill">{t('noNotes')}</div>}
        {notesQuery.capped && (
          <div className="pill">
            {t('zoomNotes', { count: NOTES_CAP.toLocaleString() })}
          </div>
        )}
      </div>

      {composerPoint && (
        <NoteComposer
          point={composerPoint}
          sessionStatus={session.status}
          onRetrySession={session.retry}
          onClose={() => setComposerPoint(null)}
          onSubmit={submitNote}
        />
      )}

      {selected && !composerPoint && (
        <NoteCard
          note={selected}
          onClose={() => setSelected(null)}
          onShare={shareNote}
          onReport={(n) => setReportFor(n)}
          onDelete={deleteNote}
        />
      )}

      {reportFor && <ReportSheet onClose={() => setReportFor(null)} onSubmit={reportNote} />}
      {aboutOpen && <AboutSheet onClose={() => setAboutOpen(false)} />}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
