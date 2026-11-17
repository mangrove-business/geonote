import { useEffect, useState } from 'react';

/** True only after `value` has stayed true for `delayMs` (avoids flashing "Loading…"). */
export function useDelayedFlag(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!value) {
      setDelayed(false);
      return;
    }
    const t = setTimeout(() => setDelayed(true), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return delayed;
}
