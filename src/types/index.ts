export type UnitSystem = 'metric' | 'imperial';

export type HeightUnit = 'cm' | 'ft';

export type WeightUnit = 'kg' | 'lb';

export interface WeightValueMetric {
  unitSystem: 'metric';
  kg: number;
}

export interface WeightValueImperial {
  unitSystem: 'imperial';
  lb: number;
}

export type WeightValue = WeightValueMetric | WeightValueImperial;

export interface HeightValueMetric {
  unitSystem: 'metric';
  cm: number;
}

export interface HeightValueImperial {
  unitSystem: 'imperial';
  feet: number;
  inches: number;
}

export type HeightValue = HeightValueMetric | HeightValueImperial;

export interface FeetInches {
  feet: number;
  inches: number;
}

export interface RulerConfig {
  min: number;
  max: number;
  step: number;
  majorTickInterval: number;
}
