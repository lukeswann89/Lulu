// pages/api/cascade/recontextualize.js
//
// API endpoint for recontextualizing existing suggestions after completing a
// particular editing level. By splitting this functionality into its own
// route, we adhere to the "Singular Purpose" principle and reduce
// cognitive load on both developers and clients.

import { parseCascadeRecontextualizeInput } from '../../../schemas/cascadeRecontextualizeSchema.js';
import { recontextualizeSuggestions } from '../../../services/cascadeService.js';
import { createApiHandler } from '../../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let payload;
  try {
    payload = parseCascadeRecontextualizeInput(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body', details: err.errors });
  }
  const { completedLevel, remainingText, existingSuggestions, context } = payload;
  
  const recontextActions = await recontextualizeSuggestions(
    completedLevel,
    remainingText,
    existingSuggestions,
    context,
  );
  const totalReviewed = Array.isArray(recontextActions) ? recontextActions.length : 0;
  return {
    success: true,
    recontextActions,
    completedLevel,
    metadata: {
      totalReviewed,
      timestamp: new Date().toISOString(),
    },
  };
});
