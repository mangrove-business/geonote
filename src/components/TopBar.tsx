import { Info } from 'lucide-react';

interface Props {
  readOnlyReason: 'failed' | 'unconfigured' | null;
  offline: boolean;
  onAbout: () => void;
}

export function PostItGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M10 8h44a2 2 0 0 1 2 2v32L42 56H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="#FFE27A"
        stroke="#2B2A28"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M56 42H44a2 2 0 0 0-2 2v12z" fill="#E8C24A" stroke="#2B2A28" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function TopBar({ readOnlyReason, offline, onAbout }: Props) {
  return (
    <div className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex max-w-[calc(100%-6rem)] flex-col items-start gap-2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#E9E1CC] bg-[#FFFDF7]/95 py-1 pl-3 pr-1 shadow-md backdrop-blur">
        <PostItGlyph />
        <h1 className="font-hand text-2xl font-bold leading-none">GeoNote</h1>
        <button
          type="button"
          onClick={onAbout}
          aria-label="About GeoNote"
          className="ml-1 grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
        >
          <Info size={20} aria-hidden="true" />
        </button>
      </div>

      {readOnlyReason && (
        <div
          role="status"
          className="pointer-events-auto rounded-full bg-[#2B2A28] px-3 py-1 text-xs font-medium text-white shadow"
        >
          {readOnlyReason === 'failed'
            ? 'Read-only · posting unavailable'
            : 'Read-only · no backend configured'}
        </div>
      )}

      {offline && (
        <div
          role="status"
          className="pointer-events-auto rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-950 shadow"
        >
          You’re offline. Showing notes that were already loaded.
        </div>
      )}
    </div>
  );
}
