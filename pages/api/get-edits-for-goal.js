// pages/api/get-edits-for-goal.js
//
// Endpoint to retrieve edits addressing a single high‑level goal. The
// singular purpose of this route is to return only suggestions relevant
// to the specified goal, aligning with the "Singular Purpose" principle.

import { parseGetEditsForGoalInput } from '../../schemas/getEditsForGoalSchema.js';
import { getEditsForGoal } from '../../services/getEditsForGoalService.js';
import { createApiHandler } from '../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let payload;
  try {
    payload = parseGetEditsForGoalInput(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body', details: err.errors });
  }
  
  const editsArray = await getEditsForGoal(payload);
  return editsArray;
}); 