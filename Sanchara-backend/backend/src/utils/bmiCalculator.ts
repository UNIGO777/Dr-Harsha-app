/**
 * BMI utilities.
 *
 * Kept as a pure, dependency-free module so it can be unit tested and reused by
 * assessment/exercise features later. Uses the standard WHO adult categories.
 */

export type BmiCategory =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obese';

export interface BmiResult {
  /** BMI value rounded to one decimal place. */
  bmi: number;
  category: BmiCategory;
}

/**
 * Calculate BMI from weight (kg) and height (cm).
 *
 * @throws {RangeError} if inputs are non-positive or non-finite.
 */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError('weightKg must be a positive finite number');
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new RangeError('heightCm must be a positive finite number');
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;

  return { bmi, category: categorizeBmi(bmi) };
}

/**
 * Map a BMI value to its WHO adult weight-status category.
 */
export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
