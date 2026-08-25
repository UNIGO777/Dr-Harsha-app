import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const enrollSchema = z.object({
  programId: objectId,
  /**
   * The DIFFICULTY TIER the patient picks when starting the program
   * ("easy" / "Medium" / "Hard"). Optional for older clients, which fall back
   * to the program's lowest level.
   */
  levelNumber: z.number().int().min(1).max(50).optional(),
});

export const enrollQuerySchema = z.object({
  // ?switch=true pauses an existing active enrollment and starts this one.
  switch: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export const enrollmentIdParamSchema = z.object({ id: objectId });

export type EnrollInput = z.infer<typeof enrollSchema>;
export type EnrollQuery = z.infer<typeof enrollQuerySchema>;
