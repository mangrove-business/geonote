import { X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import {
  COLOR_ORDER,
  COUNTER_VISIBLE_AT,
  INK,
  NOTE_COLORS,
  NOTE_MAX_LENGTH,
  SCOPES,
  SCOPE_ORDER,
} from '../lib/config';
import { defaultScopeForZoom, formatCoords } from '../lib/geo';
import { useI18n } from '../lib/i18n';
import { friendlyError } from '../lib/errors';
import type { NoteColor, NoteDraft, NoteScope, PickedPoint, SessionStatus } from '../types';
import { Sheet } from './Sheet';

interface Props {
  point: PickedPoint;
  sessionStatus: SessionStatus;
  onRetrySession: () => void;
  onClose: () => void;
  /** Resolves when the note is saved; the parent then closes the composer. */
  onSubmit: (draft: NoteDraft) => Promise<void>;
}

export function NoteComposer({ point, sessionStatus, onRetrySession, onClose, onSubmit }: Props) {
  const titleId = useId();
  const { t } = useI18n();
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [scope, setScope] = useState<NoteScope>(() => defaultScopeForZoom(point.zoom));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const blocked = sessionStatus === 'failed' || sessionStatus === 'unconfigured';
  const trimmed = body.trim();
  const canPost = trimmed.length > 0 && !submitting && !blocked;

  const requestClose = () => {
    if (submitting) return;
    if (body.trim() && !confirming) setConfirming(true);
    else onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        body: trimmed,
        color,
        scope,
        lat: point.lat,
        lng: point.lng,
        place_name: point.placeName,
        place_kind: point.placeKind,
      });
    } catch (err) {
      // Never lose the draft: keep the text, show the error inline.
      setError(friendlyError(err));
      setSubmitting(false);
    }
  };

  return (
    <Sheet labelledBy={titleId} onClose={requestClose} autoFocus={false}>
      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-tight">
              {t('leaveNote')}
            </h2>
            <p className="truncate text-sm text-[#6B665C]">
              {point.placeName ? `on ${point.placeName}` : `${t('at')} ${formatCoords(point.lat, point.lng)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('close')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {blocked && (
          <div role="alert" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-950">
            {sessionStatus === 'failed'
              ? 'Posting is unavailable right now (anonymous sign-in failed). You can still read notes.'
              : 'This build isn’t connected to a notes backend, so posting is disabled.'}
            {sessionStatus === 'failed' && (
              <button
                type="button"
                onClick={onRetrySession}
                className="mt-2 block font-semibold underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t('noteAbout')}</legend>
          <div role="radiogroup" aria-label={t('scope')} className="grid grid-cols-3 gap-2">
            {SCOPE_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={scope === s}
                onClick={() => setScope(s)}
                className={`min-h-11 rounded-xl border px-2 py-1.5 text-left transition-colors ${
                  scope === s
                    ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                    : 'border-[#E0D8C3] bg-white hover:bg-[#F6F0DE]'
                }`}
              >
                <span className="block text-sm font-semibold">{t(s)}</span>
                <span className="block text-[11px] leading-tight opacity-80">{t(`${s}Hint`)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t('color')}</legend>
          <div role="radiogroup" aria-label={t('color')} className="flex gap-2">
            {COLOR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: NOTE_COLORS[c], borderColor: INK }}
                className={`h-11 w-11 rounded-lg border-2 transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-[#2B2A28] ring-offset-2' : 'opacity-90'
                }`}
              />
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${titleId}-body`} className="sr-only">
            Note text
          </label>
          <textarea
            id={`${titleId}-body`}
            autoFocus
            rows={4}
            maxLength={NOTE_MAX_LENGTH}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('placeholder')}
            style={{ backgroundColor: NOTE_COLORS[color], color: INK }}
            className="w-full resize-none rounded-xl border border-[#2B2A28]/40 p-3 text-base leading-snug placeholder:text-[#2B2A28]/55"
          />
          {body.length >= COUNTER_VISIBLE_AT && (
            <p
              className={`mt-1 text-right text-xs ${
                body.length >= NOTE_MAX_LENGTH ? 'font-semibold text-red-700' : 'text-[#6B665C]'
              }`}
            >
              {body.length}/{NOTE_MAX_LENGTH}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-xl bg-[#F6F0DE] p-3">
            <p className="text-sm font-medium">{t('discardQuestion')}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setConfirming(false)}>
                Keep writing
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={onClose}>
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!canPost}>
              {submitting ? t('posting') : t('postNote')}
            </button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
