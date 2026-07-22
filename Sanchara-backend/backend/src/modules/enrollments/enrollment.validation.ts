import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const enrollSchema = z.object({
  programId: objectId,
});

export const enrollQuerySchema = z.object({
  // ?switch=true pauses an existing active enrollment and starts this one.
  switch: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export const enrollmentIdParamSchema = z.object({ id: objectId });

export type EnrollInput = z.infer<typeof enrollSchema>;
export type EnrollQuery = z.infer<typeof enrollQuerySchema>;
