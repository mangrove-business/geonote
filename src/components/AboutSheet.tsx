import { X } from 'lucide-react';
import { useId } from 'react';
import { Sheet } from './Sheet';

interface Props {
  onClose: () => void;
}

const link = 'font-medium underline underline-offset-2';

export function AboutSheet({ onClose }: Props) {
  const titleId = useId();
  return (
    <Sheet variant="modal" labelledBy={titleId} onClose={onClose}>
      <div className="flex flex-col gap-4 p-4 text-sm leading-relaxed">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-hand text-3xl font-bold leading-none">
            About GeoNote
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <p>
          A shared map of post-it notes. Tap anywhere, leave a note of up to 280 characters, and
          everyone who opens the map can read it. No sign-up, ever.
        </p>

        <section>
          <h3 className="font-semibold">Spot, street, or area?</h3>
          <p>
            Pick how big your note’s place is. <b>Spot</b> notes (a bench, a shop) appear when you’re
            zoomed in close. <b>Street</b> notes appear from city view. <b>Area</b> notes (a
            neighborhood, a lake) show from anywhere.
          </p>
        </section>

        <section>
          <h3 className="font-semibold">House rules</h3>
          <ul className="list-disc pl-5">
            <li>Be kind. No harassment, hate, threats, or spam.</li>
            <li>Don’t post private information about anyone: addresses, phone numbers, names.</li>
            <li>Notes are public, anonymous, and can’t be edited. You can delete your own.</li>
            <li>Use Report on any note that breaks these rules. Reported notes are reviewed.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold">Privacy</h3>
          <p>
            Your browser gets an anonymous ID so you can delete your own notes. Clearing site data
            creates a new identity, and older notes can then no longer be deleted from that browser.
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
