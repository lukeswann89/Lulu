// schemas/cascadeRecontextualizeSchema.js
//
// Input validation for the cascade recontextualization endpoint. Ensures
// that callers specify the completed level, remaining manuscript text and
// existing suggestions. Additional context (such as a list of completed
// levels) can be provided and will be forwarded to the service layer.

import { z } from 'zod';

const COMPLETED_LEVELS = ['developmental', 'structural', 'line'];

export const cascadeRecontextualizeSchema = z.object({
  completedLevel: z.enum(COMPLETED_LEVELS),
  remainingText: z.string().min(1, { message: 'remainingText is required' }),
  existingSuggestions: z.any(),
  context: z.record(z.any()).optional(),
}).strict();

export function parseCascadeRecontextualizeInput(data) {
  return cascadeRecontextualizeSchema.parse(data);
}
