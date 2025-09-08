import { z } from 'zod';

export const suggestionSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  from: z.number().int().gte(0),
  to: z.number().int().gt(0),
  original: z.string(),
  replacement: z.string(),
  suggestion: z.string(),
  message: z.string(),
  rule: z.string().optional(),
  editType: z.string(),
});

export const suggestionsArraySchema = z.array(suggestionSchema);
