// pages/api/specific-edits.js
//
// Endpoint for generating a comprehensive set of edits across multiple
// editorial levels. The handler strictly validates input and then defers
// execution to the service layer, returning grouped suggestions and a list
// of any failed chunks.

import { parseSpecificEditsInput } from '../../schemas/specificEditsSchema.js';
import { generateSpecificEdits, generateDeepDiveEdits } from '../../services/specificEditsService.js';
import { createApiHandler } from '../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let payload;
  try {
    payload = parseSpecificEditsInput(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body', details: err.errors });
  }
  
  let suggestions, failedChunks;
  
  // Route to appropriate service based on whether this is a Deep Dive request
  if (payload.strategyCardIds && payload.strategyCardIds.length > 0) {
    // Deep Dive flow: generate strategy-specific Line/Copy edits
    suggestions = await generateDeepDiveEdits(payload);
    failedChunks = [];
  } else {
    // Standard flow: generate comprehensive edits across all types
    const result = await generateSpecificEdits(payload);
    suggestions = result.suggestions;
    failedChunks = result.failedChunks;
  }
  
  // COMPAT: Return both the new envelope and legacy flat paths for backward compatibility
  // This ensures the UI can read either res.suggestions or res.data.suggestions
  return {
    suggestions,               // legacy flat path (client may read res.suggestions)
    failedChunks,             // legacy flat path
    data: { suggestions, failedChunks },     // new envelope path (canonical)
    meta: { version: '1.0', intent: 'sentence_edits' }
  };
});
