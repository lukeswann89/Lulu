// schemas/focusEditSchema.js
//
// Schema definition for the Focus Edit API.
//
// Lulu's "Secure Membrane" principle mandates declarative input validation at
// the edge of the system. By defining a Zod schema, we ensure that incoming
// requests conform to the expected shape before any business logic runs.
// Should validation fail, the API handler will return a 400 response with
// details. This separation of concerns keeps the API handler thin and
// self‑documenting.

import { z } from 'zod';

/**
 * Zod schema for validating Focus Edit requests.
 *
 * The request body must include a `text` field containing the manuscript
 * content to be edited. A `model` field is optional and allows callers to
 * specify a particular OpenAI model. Additional properties are stripped to
 * prevent accidental parameter injection.
 */
export const focusEditSchema = z.object({
  text: z.string().min(1, { message: 'text is required' }),
  model: z.string().optional(),
}).strict();

/**
 * Validate and parse an incoming payload against the focus edit schema.
 *
 * Returns the parsed data on success. Throws a ZodError on failure.
 *
 * @param {unknown} data The untrusted input to validate
 * @returns {{ text: string, model?: string }} The validated payload
 */
export function parseFocusEditInput(data) {
  return focusEditSchema.parse(data);
}
