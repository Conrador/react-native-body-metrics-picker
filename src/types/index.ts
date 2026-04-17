export type UnitSystem = 'metric' | 'imperial';

export type HeightUnit = 'cm' | 'ft';

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
