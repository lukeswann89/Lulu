/**
 * services/editorialPlanService.js
 */
import { getOpenAIClient } from '../lib/openai.js';

function buildEditorialPlanPrompt(manuscriptText, writerNotes) {
  return `
    You are Lulu, an expert literary editor. Your task is to analyze the provided manuscript and create a high-level strategic editorial plan.

    Focus ONLY on identifying 2-4 core, high-impact **Developmental** (plot, character, theme) and **Structural** (pacing, organization) goals. Do not generate any line edits, copy edits, or proofreading suggestions.

    CRITICAL INSTRUCTIONS:
    1.  Your entire response MUST be a single, valid JSON object containing a key named "editorialPlan".
    2.  The value of "editorialPlan" must be a JSON array of objects.
    3.  Each object in the array represents one strategic goal and must have the following keys: "id", "source", "goal", "type", and "isSelected".
    4.  The "type" must be either "Developmental" or "Structural".
    5.  The "goal" should be a concise, actionable instruction for the writer.
    6.  The "source" should be either "Writer" (if derived from writer notes) or "Lulu" (if derived from your analysis).
    7.  Set "isSelected" to true by default.

    MANUSCRIPT:
    ---
    ${manuscriptText}
    ---

    ${writerNotes ? `WRITER'S NOTES:\n---\n${writerNotes}\n---` : ''}
  `.trim();
}

export async function generateEditorialPlan({ manuscriptText, writerNotes }) {
  try {
    const openai = getOpenAIClient();
    const prompt = buildEditorialPlanPrompt(manuscriptText, writerNotes);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const rawResponse = completion.choices[0].message.content;
    const result = JSON.parse(rawResponse);
    
    // Simplified & direct parsing, aligned with the new prompt.
    const planArray = result.editorialPlan || [];
      
    return planArray;

  } catch (error) {
    console.error('[SERVER-SIDE] An error occurred in generateEditorialPlan service:', error);
    throw new Error(`Failed to generate editorial plan: ${error.message}`);
  }
}