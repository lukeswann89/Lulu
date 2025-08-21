// pages/api/focus-edit.js
//
// Thin API handler for the Focus Edit route.
//
// This file is intentionally minimal. According to the "Pure Conduit" and
// "Orchestration, Not Origination" principles, it acts solely as a
// stateless orchestrator: validating input, delegating to the service layer
// and returning the response. All business logic lives in
// `services/focusEditService.js`, while input validation is handled by
// `schemas/focusEditSchema.js`.

import { parseFocusEditInput } from '../../schemas/focusEditSchema.js';
import { generateFocusEdits } from '../../services/focusEditService.js';
import { createApiHandler } from '../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  // Enforce HTTP verb. POST is required for mutable operations.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Validate request body against the schema. Any additional fields are
  // stripped and validation errors are reported to the client.
  let payload;
  try {
    payload = parseFocusEditInput(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body', details: err.errors });
  }
  
  const { suggestions, failedChunks } = await generateFocusEdits(payload);
  return { suggestions, failedChunks };
}); 