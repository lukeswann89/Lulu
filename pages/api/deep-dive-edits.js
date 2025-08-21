// pages/api/deep-dive-edits.js
import { generateDeepDiveEdits } from '../../services/deepDiveService.js';
import { specificEditsSchema } from '../../schemas/specificEditsSchema.js';
import { createApiHandler } from '../../utils/apiHandler.js';

export default createApiHandler(async (req, res) => {
  // This endpoint only accepts POST requests.
  if (req.method !== 'POST') {
    throw new Error('Method not allowed');
  }

  // Validate the payload against our existing schema.
  const payload = specificEditsSchema.parse(req.body);

  // Call the new, dedicated service.
  const suggestions = await generateDeepDiveEdits(payload);

  // The apiHandler will automatically wrap this in the { data, meta } envelope.
  return { suggestions };
});