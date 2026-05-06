import { useLayoutEffect, useState, type RefObject } from 'react';

import type { HeightRulerHandle, HeightRulerLiveSnapshot } from './HeightRuler.types';

const placeholderSnapshot = (): HeightRulerLiveSnapshot => ({
  valueCm: 0,
  valueString: '0',
  unit: 'cm',
});

/** Subscribes to `ref`; pass `syncKey` when remounting the ruler with `key` so the subscription rebinds. */
export function useHeightRulerSnapshot(
  rulerRef: RefObject<HeightRulerHandle | null>,
  syncKey?: unknown,
): HeightRulerLiveSnapshot {
  const [snapshot, setSnapshot] = useState<HeightRulerLiveSnapshot>(placeholderSnapshot);

  useLayoutEffect(() => {
    const handle = rulerRef.current;
    if (!handle) {
      return undefined;
    }
    setSnapshot(handle.getSnapshot());
    return handle.subscribe(setSnapshot);
  }, [rulerRef, syncKey]);

  return snapshot;
}
