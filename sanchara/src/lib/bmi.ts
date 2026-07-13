/**
 * BMI helpers — mirror the backend's bmiCalculator so the client can show live
 * feedback on the body-metrics onboarding screen without a round-trip. The
 * backend remains the source of truth on submit.
 */

/** BMI = weight(kg) / height(m)^2, rounded to 1 decimal. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
