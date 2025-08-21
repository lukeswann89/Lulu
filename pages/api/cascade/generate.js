// pages/api/cascade/generate.js
//
// API endpoint for generating cascade edits from an accepted edit. This route
// has a single purpose: given a source edit at a particular level, it
// produces edits at one or more target levels. Validation and delegation
// are handled here; the heavy lifting is in the cascadeService.

import { parseCascadeGenerateInput } from '../../../schemas/cascadeGenerateSchema.js';
import { generateCascadeEdits } from '../../../services/cascadeService.js';
import { createApiHandler } from '../../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let payload;
  try {
    payload = parseCascadeGenerateInput(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body', details: err.errors });
  }
  const { sourceEdit, sourceLevel, targetLevels, originalText, context } = payload;
  
  const cascadeEdits = await generateCascadeEdits(sourceEdit, sourceLevel, targetLevels, originalText, context);
  // Compute metadata for the response
  const totalGenerated = cascadeEdits.length;
  const validOffsets = cascadeEdits.filter(e => e.start !== null).length;
  return {
    success: true,
    cascadeEdits,
    sourceLevel,
    targetLevels,
    metadata: {
      totalGenerated,
      validOffsets,
      timestamp: new Date().toISOString(),
    },
  };
});
