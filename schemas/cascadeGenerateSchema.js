// schemas/cascadeGenerateSchema.js
//
// Input validation for the cascade generation endpoint. This schema
// enforces that callers specify the accepted edit, the source level, the
// target levels, and the current manuscript text. Additional context may
// be provided and will be passed through unmodified.

import { z } from 'zod';

// Valid source levels for cascade operations
const SOURCE_LEVELS = ['developmental', 'structural', 'line'];

// Valid target levels. Copy edits can cascade from any level, structural
// edits cascade from developmental, and line edits cascade from both
// developmental and structural levels.
const TARGET_LEVELS = ['structural', 'line', 'copy'];

const sourceEditSchema = z.object({
  original: z.string().min(1, { message: 'sourceEdit.original is required' }),
  suggestion: z.string().optional(),
  revision: z.string().optional(),
  why: z.string().optional(),
});

export const cascadeGenerateSchema = z.object({
  sourceEdit: sourceEditSchema,
  sourceLevel: z.enum(SOURCE_LEVELS),
  targetLevels: z.array(z.enum(TARGET_LEVELS)).min(1, { message: 'targetLevels must contain at least one level' }),
  originalText: z.string().min(1, { message: 'originalText is required' }),
  context: z.record(z.any()).optional(),
}).strict();

export function parseCascadeGenerateInput(data) {
  return cascadeGenerateSchema.parse(data);
}
