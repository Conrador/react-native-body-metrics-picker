import type { UnitSystem, FeetInches } from '../../types';
import { cmToFeetInches } from '../conversions/height';

export function formatHeightMetric(cm: number): string {
  return `${cm} cm`;
}

export function formatHeightImperial(feetInches: FeetInches): string {
  return `${feetInches.feet}'${feetInches.inches}"`;
}

export function formatHeight(cm: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'imperial') {
    return formatHeightImperial(cmToFeetInches(cm));
  }
  return formatHeightMetric(cm);
}
