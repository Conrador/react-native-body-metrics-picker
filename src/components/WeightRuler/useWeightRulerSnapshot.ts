import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

import type { WeightRulerHandle, WeightRulerLiveSnapshot } from './WeightRuler.types';

const placeholderSnapshot = (): WeightRulerLiveSnapshot => ({
  valueKg: 0,
  valueString: '0.00',
  unit: 'kg',
});

/**
 * Subscribes to a `WeightRuler` ref. The hook handles the case where the consumer is
 * rendered above the `WeightRuler` in JSX — when the ref isn't attached yet on the first
 * commit, one extra render is scheduled in the same commit cycle so the binding happens
 * before paint (no flash of the placeholder snapshot).
 *
 * Pass `syncKey` when remounting the ruler with `key={...}` so the subscription rebinds.
 */
export function useWeightRulerSnapshot(
  rulerRef: RefObject<WeightRulerHandle | null>,
  syncKey?: unknown,
): WeightRulerLiveSnapshot {
  const [snapshot, setSnapshot] = useState<WeightRulerLiveSnapshot>(placeholderSnapshot);
  const [bindAttempt, setBindAttempt] = useState(0);
  const retriedRef = useRef(false);

  useLayoutEffect(() => {
    retriedRef.current = false;
  }, [syncKey]);

  useLayoutEffect(() => {
    const handle = rulerRef.current;
    if (!handle) {
      if (!retriedRef.current) {
        retriedRef.current = true;
        setBindAttempt((n) => n + 1);
      }
      return undefined;
    }
    setSnapshot(handle.getSnapshot());
    return handle.subscribe(setSnapshot);
  }, [rulerRef, syncKey, bindAttempt]);

  return snapshot;
}
