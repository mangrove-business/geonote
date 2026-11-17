import { Flag, MapPin, Share2, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';
import { INK, NOTE_COLORS, SCOPES } from '../lib/config';
import { friendlyError } from '../lib/errors';
import { relativeTime } from '../lib/time';
import type { Note } from '../types';
import { Sheet } from './Sheet';

interface Props {
  note: Note;
  onClose: () => void;
  onShare: (note: Note) => void;
  onReport: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
}

export function NoteCard({ note, onClose, onShare, onReport, onDelete }: Props) {
  const titleId = useId();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const color = NOTE_COLORS[note.color];

  const doDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(note);
    } catch (err) {
      setError(friendlyError(err));
      setDeleting(false);
    }
  };

  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <div className="h-2 w-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="flex items-center gap-1.5 text-sm font-semibold">
              {note.place_name ? (
                <>
                  <MapPin size={16} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{note.place_name}</span>
                </>
              ) : (
                <span>Note</span>
              )}
            </h2>
            <p className="text-xs text-[#6B665C]">
              {SCOPES[note.scope].label} · {relativeTime(note.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close note"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Plain text only: React escapes it, no HTML, no linkification. */}
        <p
          className="whitespace-pre-wrap break-words rounded-xl border border-[#2B2A28]/30 p-4 text-base leading-snug shadow-inner"
          style={{ backgroundColor: color, color: INK }}
        >
          {note.body}
        </p>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {confirmDelete ? (
          <div className="flex flex-col gap-2 rounded-xl bg-[#F6F0DE] p-3">
            <p className="text-sm font-medium">Delete this note? This can’t be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger flex-1"
                onClick={doDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => onShare(note)}>
              <Share2 size={18} aria-hidden="true" /> Share
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onReport(note)}>
              <Flag size={18} aria-hidden="true" /> Report
            </button>
            {note.is_mine && (
              <button
                type="button"
                className="btn btn-ghost text-red-800"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={18} aria-hidden="true" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
