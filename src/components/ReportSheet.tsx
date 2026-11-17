import { useId, useState } from 'react';
import { friendlyError } from '../lib/errors';
import type { ReportReason } from '../types';
import { useI18n } from '../lib/i18n';
import { Sheet } from './Sheet';

interface Props {
  onClose: () => void;
  onSubmit: (reason: ReportReason) => Promise<void>;
}

const REASONS: { value: ReportReason; labelKey: string; hintKey: string }[] = [
  { value: 'spam', labelKey: 'spam', hintKey: 'spamHint' },
  { value: 'abuse', labelKey: 'abuse', hintKey: 'abuseHint' },
  { value: 'other', labelKey: 'other', hintKey: 'otherHint' },
];

export function ReportSheet({ onClose, onSubmit }: Props) {
  const titleId = useId();
  const { t } = useI18n();
  const [busy, setBusy] = useState<ReportReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (reason: ReportReason) => {
    setBusy(reason);
    setError(null);
    try {
      await onSubmit(reason);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(null);
    }
  };

  return (
    <Sheet variant="modal" labelledBy={titleId} onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <h2 id={titleId} className="text-lg font-semibold">
          {t('reportTitle')}
        </h2>
        <p className="text-sm text-[#6B665C]">{t('reportWhy')}</p>
        <div className="flex flex-col gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              disabled={busy !== null}
              onClick={() => pick(r.value)}
              className="min-h-11 rounded-xl border border-[#E0D8C3] bg-white px-3 py-2 text-left hover:bg-[#F6F0DE] disabled:opacity-60"
            >
              <span className="block text-sm font-semibold">
                {busy === r.value ? t('sending') : t(r.labelKey)}
              </span>
              <span className="block text-xs text-[#6B665C]">{t(r.hintKey)}</span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy !== null}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
