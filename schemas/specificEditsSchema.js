// schemas/specificEditsSchema.js
//
// Input validation for the Specific Edits endpoint. Clients may specify
// which edit types they are interested in; if omitted, all types are
// generated. The schema enforces that the manuscript text is present.

import { z } from 'zod';

// Allowed edit types for this endpoint
export const EDIT_TYPES = ['Developmental', 'Structural', 'Line', 'Copy', 'Proofreading'];

export const specificEditsSchema = z.object({
  text: z.string().min(1, { message: 'text is required' }),
  // Accept an array of strings for the selected goal IDs.
  strategyCardIds: z.array(z.string()).min(1, { message: 'At least one strategyCardId is required.' }),
  // The 'severity' property is also sent from the client.
  severity: z.string().optional(),
  model: z.string().optional(),
}).strict();

export function parseSpecificEditsInput(data) {
  return specificEditsSchema.parse(data);
}
