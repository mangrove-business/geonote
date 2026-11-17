import { Globe2, Info, Shuffle } from 'lucide-react';
import { LOCALE_META, LOCALES, useI18n } from '../lib/i18n';

interface Props {
  readOnlyReason: 'failed' | 'unconfigured' | null;
  offline: boolean;
  satellite: boolean;
  onSatellite: () => void;
  onRandom: () => void;
  onAbout: () => void;
}

export function PostItGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 8h44a2 2 0 0 1 2 2v32L42 56H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#FFE27A" stroke="#2B2A28" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M56 42H44a2 2 0 0 0-2 2v12z" fill="#E8C24A" stroke="#2B2A28" strokeWidth="4" strokeLinejoin="round"/>
    </svg>
  );
}

export function TopBar({ readOnlyReason, offline, satellite, onSatellite, onRandom, onAbout }: Props) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl border border-[#E9E1CC] bg-[#FFFDF7]/95 p-1.5 shadow-md backdrop-blur">
        <div className="flex items-center gap-1 pl-2 pr-1">
          <PostItGlyph />
          <h1 className="font-hand text-2xl font-bold leading-none">GeoNote</h1>
        </div>
        <button type="button" onClick={onRandom} aria-label={t('random')} title={t('random')} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-black/5">
          <Shuffle size={19} aria-hidden="true" />
        </button>
        <button type="button" onClick={onSatellite} aria-pressed={satellite} aria-label={satellite ? t('map') : t('satellite')} title={satellite ? t('map') : t('satellite')} className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${satellite ? 'bg-[#2B2A28] text-white' : 'hover:bg-black/5'}`}>
          {satellite ? t('map') : t('satellite')}
        </button>
        <label className="flex h-10 items-center gap-1 rounded-xl px-2 hover:bg-black/5" title={t('language')}>
          <Globe2 size={17} aria-hidden="true" />
          <select aria-label={t('language')} value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} className="max-w-[7rem] bg-transparent text-xs font-semibold outline-none">
            {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_META[l].native}</option>)}
          </select>
        </label>
        <button type="button" onClick={onAbout} aria-label={t('about')} title={t('about')} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-black/5">
          <Info size={20} aria-hidden="true" />
        </button>
      </div>
      {readOnlyReason && <div role="status" className="pointer-events-auto rounded-full bg-[#2B2A28] px-3 py-1 text-xs font-medium text-white shadow">{readOnlyReason === 'failed' ? t('readOnlyPosting') : t('readOnlyBackend')}</div>}
      {offline && <div role="status" className="pointer-events-auto rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-950 shadow">{t('offline')}</div>}
    </div>
  );
}
