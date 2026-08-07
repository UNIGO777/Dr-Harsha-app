/**
 * Shared vocabularies for program/exercise tagging.
 *
 * ⚠️ THESE MUST MATCH THE PATIENT APP EXACTLY.
 *
 * The recommendation engine scores a program by comparing these values against
 * what onboarding stored on the user:
 *   program.targetAreas        ↔ user.painAreas         (exact, case-insensitive)
 *   program.suitableConditions ↔ user.conditions        (exact, case-insensitive)
 *   program.goalTag            ↔ user.goal              (word overlap, forgiving)
 *   program.ageGroups          ↔ user.group
 *
 * A free-typed tag that differs by even one character simply never matches, and
 * the failure is silent — the program just stops being recommended. Hence
 * pickers rather than text inputs.
 *
 * Sources in the patient app (sanchara/):
 *   pain areas → src/components/onboarding/BodyMap.tsx  (region ids)
 *   conditions → app/(onboarding)/conditions.tsx        (stored as labels)
 *   goals      → app/(onboarding)/goal.tsx              (stored as labels)
 *
 * TODO: promote these to the shared/ folder (or serve them from the API) so
 * there is one source of truth instead of three copies.
 */

export interface Option {
  /** Exact value persisted and matched against. */
  value: string;
  /** Human label for the picker. */
  label: string;
}

/**
 * Body regions for PROGRAM targeting.
 *
 * ⚠️ The values are the body-map LABELS, not the region ids. The patient app
 * saves `REGION_LABELS[id]` (see pain-areas.tsx), so `user.painAreas` looks like
 * ['Lower back', 'Pelvis'] — an id such as 'lower_back' would never match.
 */
export const PATIENT_PAIN_AREAS: Option[] = [
  { value: 'Head', label: 'Head' },
  { value: 'Neck', label: 'Neck' },
  { value: 'Upper back / Thoracic', label: 'Upper back / Thoracic' },
  { value: 'Lower back', label: 'Lower back' },
  { value: 'Pelvis', label: 'Pelvis' },
  { value: 'Left shoulder', label: 'Left shoulder' },
  { value: 'Right shoulder', label: 'Right shoulder' },
  { value: 'Left elbow', label: 'Left elbow' },
  { value: 'Right elbow', label: 'Right elbow' },
  { value: 'Left wrist', label: 'Left wrist' },
  { value: 'Right wrist', label: 'Right wrist' },
  { value: 'Left hand', label: 'Left hand' },
  { value: 'Right hand', label: 'Right hand' },
  { value: 'Left hip', label: 'Left hip' },
  { value: 'Right hip', label: 'Right hip' },
  { value: 'Left knee', label: 'Left knee' },
  { value: 'Right knee', label: 'Right knee' },
  { value: 'Left calf', label: 'Left calf' },
  { value: 'Right calf', label: 'Right calf' },
  { value: 'Left ankle', label: 'Left ankle' },
  { value: 'Right ankle', label: 'Right ankle' },
  { value: 'Left sole / Foot', label: 'Left sole / Foot' },
  { value: 'Right sole / Foot', label: 'Right sole / Foot' },
];

/**
 * Body areas for EXERCISE tagging — a SEPARATE vocabulary on purpose.
 *
 * exercise.areaTag is only ever compared exercise-to-exercise (the Too Hard /
 * Too Easy alternatives lookup finds a different exercise with an overlapping
 * area), never against patient data. Existing content uses these snake_case
 * values, so changing them would silently break alternatives.
 */
export const EXERCISE_AREAS: Option[] = [
  { value: 'neck', label: 'Neck' },
  { value: 'upper_back', label: 'Upper back' },
  { value: 'lower_back', label: 'Lower back' },
  { value: 'spine', label: 'Spine' },
  { value: 'core', label: 'Core' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'hips', label: 'Hips' },
  { value: 'legs', label: 'Legs' },
  { value: 'knees', label: 'Knees' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'ankles', label: 'Ankles' },
  { value: 'pelvic_floor', label: 'Pelvic floor' },
  { value: 'full_body', label: 'Full body' },
];

/** Goals — exactly the four the patient app offers (goal.tsx). */
export const GOALS: Option[] = [
  { value: 'Pain relief', label: 'Pain relief' },
  { value: 'Improve overall fitness', label: 'Improve overall fitness' },
  { value: 'Fat loss', label: 'Fat loss' },
  { value: 'Muscle gain', label: 'Muscle gain' },
];

/** Conditions — stored as labels by the patient app's onboarding chips. */
export const CONDITIONS: Option[] = [
  { value: 'Diabetes', label: 'Diabetes' },
  { value: 'High blood pressure / Hypertension', label: 'High blood pressure / Hypertension' },
  { value: 'Brain or neurological condition', label: 'Brain or neurological condition' },
  { value: 'Heart condition', label: 'Heart condition' },
  { value: 'High cholesterol', label: 'High cholesterol' },
  { value: 'Asthma or other breathing condition', label: 'Asthma or other breathing condition' },
  { value: 'Thyroid condition', label: 'Thyroid condition' },
  { value: 'Bone-related condition', label: 'Bone-related condition' },
  { value: 'Joint-related condition', label: 'Joint-related condition' },
  { value: 'Previous injury', label: 'Previous injury' },
];

/** Age groups — backend assigns these from age at onboarding. */
export const AGE_GROUPS: Option[] = [
  { value: 'GROUP_1', label: 'Group 1 · ages 30–45' },
  { value: 'GROUP_2', label: 'Group 2 · ages 46–60' },
];

/** Display labels for the program `type` discriminator. */
export const PROGRAM_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Catalog',
  ASSIGNED: 'Assigned',
  CUSTOM: 'Custom',
  SHORT: 'Short',
};
