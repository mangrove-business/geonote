import { useRef, type ReactNode } from 'react';
import { useDialog } from '../hooks/useDialog';

interface Props {
  /** `side`: bottom sheet on mobile, right-hand floating card on desktop (map stays usable).
   *  `modal`: dimmed backdrop; clicking it closes. */
  variant?: 'side' | 'modal';
  labelledBy: string;
  onClose: () => void;
  /** Set false when a child (e.g. an autofocus textarea) places focus itself. */
  autoFocus?: boolean;
  children: ReactNode;
}

export function Sheet({ variant = 'side', labelledBy, onClose, autoFocus, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onClose, { autoFocus });

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 md:items-center md:p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className="sheet sheet-enter max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl md:rounded-2xl"
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className="sheet sheet-enter fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] overflow-y-auto rounded-t-2xl md:inset-x-auto md:right-4 md:bottom-auto md:top-[9rem] md:max-h-[calc(100dvh-10rem)] md:w-[420px] md:rounded-2xl"
    >
      {children}
    </div>
  );
}
