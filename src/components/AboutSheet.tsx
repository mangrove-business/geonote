import { X } from 'lucide-react';
import { useId } from 'react';
import { Sheet } from './Sheet';
import { useI18n } from '../lib/i18n';

interface Props {
  onClose: () => void;
}

const link = 'font-medium underline underline-offset-2';

export function AboutSheet({ onClose }: Props) {
  const titleId = useId();
  const { t } = useI18n();
  return (
    <Sheet variant="modal" labelledBy={titleId} onClose={onClose}>
      <div className="flex flex-col gap-4 p-4 text-sm leading-relaxed">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-hand text-3xl font-bold leading-none">
            {t('about')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <p>
          {t('aboutText')}
        </p>

        <section>
          <h3 className="font-semibold">{t('spotStreetAreaTitle')}</h3>
          <p>
            Pick how big your note’s place is. <b>Spot</b> notes (a bench, a shop) appear when you’re
            zoomed in close. <b>Street</b> notes appear from city view. <b>Area</b> notes (a
            neighborhood, a lake) show from anywhere.
          </p>
        </section>

        <section>
          <h3 className="font-semibold">{t('rulesTitle')}</h3>
          <ul className="list-disc pl-5">
            <li>{t('rules1')}</li>
            <li>{t('rules2')}</li>
            <li>{t('rules3')}</li>
            <li>{t('rules4')}</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold">{t('privacyTitle')}</h3>
          <p>
            {t('privacyText')}
          </p>
        </section>

        <p className="text-xs text-[#6B665C]">
          Map data ©{' '}
          <a className={link} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap contributors
          </a>
          . Tiles by{' '}
          <a className={link} href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
            OpenFreeMap
          </a>{' '}
          ©{' '}
          <a className={link} href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">
            OpenMapTiles
          </a>
          .
        </p>
      </div>
    </Sheet>
  );
}
