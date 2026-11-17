import { X } from 'lucide-react';

export function IntroHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="pill pointer-events-auto flex items-center gap-1 py-1 pl-4 pr-1">
      <span>Tap anywhere on the map to leave a note.</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/10"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
