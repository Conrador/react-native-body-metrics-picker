import type { FeetInches } from '../../types';

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * INCHES_PER_FOOT + inches;
  return Math.round(totalInches * CM_PER_INCH);
}

export function cmToTotalInches(cm: number): number {
  return Math.round(cm / CM_PER_INCH);
}

export function totalInchesToCm(totalInches: number): number {
  return Math.round(totalInches * CM_PER_INCH);
}
