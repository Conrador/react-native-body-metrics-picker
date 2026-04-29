import { useLayoutEffect, useState, type RefObject } from 'react';

import type { HeightRulerHandle, HeightRulerLiveSnapshot } from './HeightRuler.types';

const placeholderSnapshot = (): HeightRulerLiveSnapshot => ({
  valueCm: 0,
  valueString: '0',
  unit: 'cm',
});

/**
 * Keeps React state in sync with the native ruler via `ref.subscribe` — no JSX children on the ruler,
 * no `onValueChange` / parent state. When `<HeightRuler key={…} />` remounts, pass the same value as
 * **`syncKey`** so subscription re-attaches to the new handle.
 */
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
