// pages/api/editorial-plan.js
//
// Thin API handler for generating an editorial plan and pre‑generated edits.
//
// Following our architectural canon, this handler does nothing more than
// enforce the HTTP verb, validate input, invoke the service layer, and
// return the result. Any caught errors are logged and surfaced as generic
// HTTP 500 responses.

import { parseEditorialPlanInput } from '../../schemas/editorialPlanSchema.js';
import { generateEditorialPlan } from '../../services/editorialPlanService.js';
import { createApiHandler } from '../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let payload;
  try {
    payload = parseEditorialPlanInput(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body', details: err.errors });
  }
  
  const editorialPlan = await generateEditorialPlan(payload);
  
  // COMPAT: Return both the new envelope and legacy flat paths for backward compatibility
  // This ensures the UI can read either res.editorialPlan or res.data.editorialPlan
  return {
    editorialPlan,           // legacy flat path (client may read res.editorialPlan)
    data: { editorialPlan }, // new envelope path (canonical)
    meta: { version: '1.0', intent: 'editorial_plan' }
  };
});