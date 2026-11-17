export interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

/** The live region stays mounted so screen readers announce new toasts politely. */
export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 flex flex-col items-center gap-2 px-3"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-[#2B2A28] px-4 py-2.5 text-sm text-white shadow-lg"
        >
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="shrink-0 font-semibold underline underline-offset-2"
              onClick={() => {
                t.action?.onClick();
                onDismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
