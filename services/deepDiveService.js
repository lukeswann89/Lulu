// services/deepDiveService.js
import { getOpenAIClient } from '../lib/openai.js';

function buildDeepDivePrompt({ manuscript, strategyCardIds }) {
  return `
    You are Lulu, an expert writing stylist and copy-editor, executing a focused "Deep Dive" edit.
    Your task is to analyze the provided manuscript based on the user's selected strategic goals (${strategyCardIds.join(', ')}) and provide a list of precise, high-impact Line and Copy edits that directly address these goals.

    CRITICAL INSTRUCTIONS:
    1. Your entire response MUST be a single, valid JSON object with a key named "suggestions".
    2. The value of "suggestions" must be a JSON array of edit objects.
    3. Each edit object must have: "original", "suggestion", "why", and "editType" ("Line" or "Copy").
    4. ALL edits MUST directly relate to the strategic goals provided.

    MANUSCRIPT:
    ---
    ${manuscript}
    ---
  `.trim();
}

export async function generateDeepDiveEdits({ text, strategyCardIds, severity, model }) {
  try {
    const openai = getOpenAIClient();
    const prompt = buildDeepDivePrompt({ manuscript: text, strategyCardIds });

    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const rawResponse = completion.choices[0].message.content;
    const result = JSON.parse(rawResponse);

    // The service's job is to return the core data. The handler will wrap it.
    return result.suggestions || [];

  } catch (error) {
    console.error('[SERVER-SIDE] An error occurred in generateDeepDiveEdits:', error);
    throw new Error(`Failed to generate Deep Dive edits: ${error.message}`);
  }
}