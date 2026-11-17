import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function IntroHint({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="pill pointer-events-auto flex items-center gap-1 py-1 pl-4 pr-1">
      <span>{t('tapToLeave')}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('close')}
        className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/10"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
