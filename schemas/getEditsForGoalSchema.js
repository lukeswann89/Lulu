// schemas/getEditsForGoalSchema.js
//
// Input validation for the Get Edits For Goal endpoint. Clients must
// provide both a goal description and the corresponding manuscript text.
// Without a goal or manuscript, the AI cannot generate context‑specific
// edits.

import { z } from 'zod';

export const getEditsForGoalSchema = z.object({
  goal: z.string().min(1, { message: 'goal is required' }),
  manuscriptText: z.string().min(1, { message: 'manuscriptText is required' }),
}).strict();

export function parseGetEditsForGoalInput(data) {
  return getEditsForGoalSchema.parse(data);
}
