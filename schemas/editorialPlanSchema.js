// schemas/editorialPlanSchema.js
//
// Input contract for the Editorial Plan endpoint.
//
// The editorial planner accepts a manuscript and optional writer notes.
// Validation here ensures that the client supplies at least a manuscript.

import { z } from 'zod';

export const editorialPlanSchema = z.object({
  manuscriptText: z.string().min(1, { message: 'manuscriptText is required' }),
  writerNotes: z.string().optional(),
}).strict();

export function parseEditorialPlanInput(data) {
  return editorialPlanSchema.parse(data);
}
