// services/getEditsForGoalService.js
//
// Service for generating line‑level edits targeted at a single high‑level goal.
// The AI analyses the provided manuscript text solely in light of the goal
// and returns specific suggestions. All prompts and parsing are contained
// here.

import { getOpenAIClient } from '../lib/openai.js';

/**
 * Build the system prompt for goal‑specific edits.
 *
 * @param {string} goal The high‑level goal provided by the user
 * @returns {string} The constructed system prompt
 */
function buildSystemPrompt(goal) {
  return `
You are an expert developmental editor named Lulu. Your sole task is to generate the specific,
non‑conflicting, sentence‑level edits required to achieve a single, high‑level substantive goal.

Analyze the provided manuscript text in light of this one goal.

The user's high‑level goal is: "${goal}"

You must return a JSON array of suggestion objects. Each object in the array must have the following structure:
{
  "original": "The original sentence or phrase from the manuscript.",
  "suggestion": "Your improved version of that sentence or phrase.",
  "why": "A concise, kind explanation of why you made the change, referencing the high‑level goal.", 
  "severity": "A string, either 'Critical' or 'Suggested'."
}

If no edits are necessary to achieve the goal for the given text, return an empty array.

// Your entire response must be a single, valid JSON object, and nothing else.
  `.trim();
}

/**
 * Generate goal‑specific edits for a manuscript.
 *
 * @param {Object} params
 * @param {string} params.goal The high‑level goal
 * @param {string} params.manuscriptText The manuscript text
 * @returns {Promise<any[]>} An array of suggestion objects
 */
export async function getEditsForGoal({ goal, manuscriptText }) {
  const openai = getOpenAIClient();
  const systemPrompt = buildSystemPrompt(goal);
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: manuscriptText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    const content = response.choices[0].message.content;
    const responseData = JSON.parse(content);
    // Some models wrap the array under a key; normalise to an array
    if (Array.isArray(responseData)) {
      return responseData;
    }
    return responseData.edits || responseData.suggestions || [];
  } catch (error) {
    throw error;
  }
}
