// services/focusEditService.js
//
// Business logic for the Focus Edit endpoint.
//
// In keeping with the "Orchestration, Not Origination" principle, the API
// handler merely delegates to this module. All of the heavy lifting—prompt
// construction, chunk management, OpenAI interaction and result parsing—is
// encapsulated here. This separation makes the service pure and easily
// testable in isolation.

import { getOpenAIClient } from '../lib/openai.js';
import { chunkText } from '../utils/chunkText.js';

/**
 * Remove Markdown code fences from a string. GPT sometimes wraps JSON in
 * ```json fences; those must be stripped before parsing. See the Lulu
 * Codex guidelines on "Strict JSON".
 *
 * @param {string} str The AI response
 * @returns {string} The response without backticks or language specifiers
 */
function stripCodeBlocks(str) {
  return str.replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim();
}

/**
 * Build the prompt for the Focus Edit task.
 *
 * This prompt is a direct adaptation of the original `buildFocusPrompt`
 * function, now isolated inside the service. It encapsulates the editorial
 * philosophy of Lulu: focusing purely on line and copy edits to improve
 * clarity, flow and correctness. See the API Architecture document for the
 * canonical prompt structure.
 *
 * @param {Object} params
 * @param {string} params.manuscript The manuscript chunk to analyse
 * @returns {string} The prompt presented to OpenAI
 */
function buildFocusPrompt({ manuscript }) {
  return `
You are Lulu, an expert writing stylist and copy-editor. Your sole purpose is to help writers achieve "Effortless Flow" in their prose by making their sentences clearer, sharper, and more elegant. You do not perform deep developmental or structural analysis. Your focus is purely on the sentence level.

Your task is to provide precise, high-impact Line and Copy edits.

---

Editing Types & Standards:

Line Edits (Stylistic Precision & Flow):
- Refine sentence structure for better rhythm and clarity.
- Enhance voice and tone by suggesting more evocative or precise language.
- Eliminate awkward phrasing and improve overall readability.

Copy Edits (Grammar & Correctness):
- Correct grammatical errors, punctuation mistakes, and syntax issues.
- Ensure consistency and adherence to standard writing conventions.

---

CRITICAL EDITING INSTRUCTIONS:
1.  **Be Surgical and Atomic:** Each JSON object MUST represent a single, atomic, independent edit.
2.  **Keep 'original' Text Minimal:** The "original" text for each suggestion should be the SHORTEST POSSIBLE unique phrase.
3.  **Adhere to Strict JSON Format:** Your entire output must be a single, valid JSON array [...].
4.  **Add a Source Identifier:** For each suggestion, include a "source" property with the value "AI". This is critical for front-end conflict management.

---

Format all output as a JSON array of suggestions, where each suggestion includes:
- editType: "Line" or "Copy"
- original: the exact text to be changed
- suggestion: the revised text
- why: a short, insightful justification for the change
- source: "AI"

Return only a valid JSON array.

---

Manuscript:
${manuscript}
  `.trim();
}

/**
 * Generate line and copy edit suggestions for a manuscript.
 *
 * @param {Object} params
 * @param {string} params.text The full manuscript text
 * @param {string} [params.model] Optional OpenAI model name
 * @returns {Promise<{ suggestions: any[], failedChunks: number[] }>} The
 *          suggestions and a list of chunk indices that failed to parse
 */
export async function generateFocusEdits({ text, model }) {
  // Split the manuscript into manageable chunks. The limit of 3500
  // characters helps avoid exceeding token limits while allowing enough
  // context for meaningful edits.
  const chunks = chunkText(text, 3500);
  const outputs = [];
  const failedChunks = [];

  try {
    const openai = getOpenAIClient();
    for (const chunk of chunks) {
      const prompt = buildFocusPrompt({ manuscript: chunk });
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });
      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      // Remove any leading "json" line that some models include
      result = result.replace(/^json\s*[\r\n]+/i, '').trim();
      outputs.push(result);
    }
    // Flatten the suggestions across chunks
    const suggestions = [];
    for (const [index, raw] of outputs.entries()) {
      try {
        const json = JSON.parse(raw);
        if (Array.isArray(json)) {
          suggestions.push(...json);
        }
      } catch (e) {
        // If JSON parsing fails, record the failing chunk number for the caller
        failedChunks.push(index + 1);
      }
    }
    return { suggestions, failedChunks };
  } catch (error) {
    // Bubble up errors to the API handler. Logging occurs at handler level.
    throw error;
  }
}
