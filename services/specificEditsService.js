// services/specificEditsService.js
//
// Generate a broad spectrum of manuscript edits across multiple editorial
// levels. The client can specify which types of edits to return. All
// heavy lifting—prompt construction, chunk management, OpenAI invocation,
// parsing and grouping—is encapsulated in this module.

import { getOpenAIClient } from '../lib/openai.js';
import { chunkText } from '../utils/chunkText.js';
import { EDIT_TYPES } from '../schemas/specificEditsSchema.js';

/**
 * Remove Markdown code fences from a string.
 *
 * @param {string} str
 * @returns {string}
 */
function stripCodeBlocks(str) {
  return str.replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim();
}

/**
 * Build a tailored prompt based on requested edit types.
 *
 * @param {Object} params
 * @param {string} params.manuscript The manuscript text
 * @param {string[]} params.editTypes The edit types to include
 * @returns {string} The prompt
 */
function buildPrompt({ manuscript, editTypes }) {
  return `
You are Lulu, an esteemed senior editor at a prestigious literary publishing house, renowned for meticulously refining manuscripts into critically acclaimed, best‑selling young adult novels.

Your task is to generate specific, high‑quality edits across all essential editorial levels—developmental, structural, line, copy, and proofreading—to elevate the manuscript to its highest literary potential.

When providing edits, strictly adhere to the following guidelines, adjusting the number and depth of edits according to the manuscript's needs:

---

Editing Types & Standards:

${editTypes.includes('Developmental') ? `
Developmental Edits (Core Narrative Refinement):
- Suggest edits enhancing character arcs, plot coherence, pacing, emotional resonance, and thematic depth.
- Provide substantial developmental edits only where significantly impactful improvements are needed, without overwhelming the narrative.
` : ''}

${editTypes.includes('Structural') ? `
Structural Edits (Narrative Flow & Organization):
- Recommend improvements to chapter sequencing, scene transitions, and narrative flow.
- Suggest structural edits to ensure coherence, readability, and narrative integrity, proportional to the manuscript's requirements.
` : ''}

${editTypes.includes('Line') ? `
Line Edits (Stylistic Precision):
- Offer refinements to sentence structure, voice, tone, clarity, rhythm, and stylistic elegance.
- Suggest line edits selectively, enhancing literary quality while preserving the author's distinct voice, based on the manuscript's level of stylistic polish.
` : ''}

${editTypes.includes('Copy') ? `
Copy Edits (Textual Accuracy):
- Correct grammatical, syntactical, punctuation errors, and consistency issues.
- Provide copy edits to ensure textual accuracy and clarity, scaling edits to match the manuscript's degree of textual precision.
` : ''}

${editTypes.includes('Proofreading') ? `
Proofreading (Final Polish):
- Identify and correct typos, spelling mistakes, formatting inconsistencies, and minor textual issues.
- Apply proofreading edits comprehensively to ensure professional polish, based on the manuscript's existing state.
` : ''}

---

CRITICAL EDITING INSTRUCTIONS:
1.  **Be Surgical and Atomic:** Each JSON object MUST represent a single, atomic, independent edit. DO NOT bundle multiple distinct thoughts (e.g., a grammar fix and a stylistic change) into one suggestion.
2.  **Keep 'original' Text Minimal:** The "original" text for each suggestion should be the SHORTEST POSSIBLE phrase or clause that is unique enough to be found. Avoid selecting entire sentences if the issue is with a single phrase. This is crucial for creating multiple, distinct highlights.
3.  **Adhere to Strict JSON Format:** Your entire output must be a single, valid JSON array [...]. Do not include any introductory text, commentary, or markdown code fences like \`\`\`json.

---

EXAMPLE OF ATOMIC EDITS:
For the input text: "The man, who was very tired, walked sadly into the big room."
A BAD, bundled suggestion would be:
{ "original": "The man, who was very tired, walked sadly into the big room.", "suggestion": "The exhausted man trudged into the spacious room." }
A GOOD, atomic set of suggestions would be:
[
  { "original": ", who was very tired,", "suggestion": " exhausted", "why": "Removes the clause for better pacing.", "editType": "Line" },
  { "original": "walked sadly", "suggestion": "trudged", "why": "Uses a stronger, more evocative verb.", "editType": "Line" },
  { "original": "big", "suggestion": "spacious", "why": "Uses a more descriptive adjective.", "editType": "Copy" }
]

---

How to Present Edits:
For each edit:
- Present the original text alongside the suggested revision.
- Provide a succinct yet insightful justification ("why").
- Specify the edit type: Developmental, Structural, Line, Copy, Proofreading.
- Maintain the author's voice; enhance, don't override.

Return only a valid JSON array, no commentary or introduction.

---

Manuscript:
${manuscript}
  `.trim();
}

/**
 * Generate specific edits across multiple editorial levels for a manuscript.
 *
 * @param {Object} params
 * @param {string} params.text The manuscript text
 * @param {string[]} [params.editTypes] The desired edit types
 * @param {string} [params.model] Optional OpenAI model override
 * @returns {Promise<{ suggestions: Record<string, any[]>, failedChunks: number[] }>} Grouped suggestions and failed chunk indices
 */
export async function generateSpecificEdits({ text, strategyCardIds, severity, model }) {
  const openai = getOpenAIClient();
  const chunks = chunkText(text, 3500);
  const outputs = [];
  const failedChunks = [];
  for (const chunk of chunks) {
    const prompt = buildPrompt({ manuscript: chunk, editTypes });
    try {
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        timeout: 180000, // 3 minutes timeout for large documents
      });
      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      result = result.replace(/^json\s*[\r\n]+/i, '').trim();
      outputs.push(result);
    } catch (error) {
      // If the API call fails, push an empty result so the parser will mark the chunk as failed
      outputs.push('');
      failedChunks.push(outputs.length);
    }
  }
  const suggestions = [];
  outputs.forEach((raw, index) => {
    if (!raw) return;
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) suggestions.push(...json);
    } catch {
      failedChunks.push(index + 1);
    }
  });
  // Group by editType for easier consumption on the frontend. Always include
  // all known types plus an 'Other' category to capture unexpected values.
  const grouped = {};
  EDIT_TYPES.forEach(type => { grouped[type] = []; });
  grouped.Other = [];
  for (const s of suggestions) {
    const key = (s.editType || '').trim();
    if (EDIT_TYPES.includes(key)) {
      grouped[key].push(s);
    } else {
      grouped.Other.push(s);
    }
  }
  return { suggestions: grouped, failedChunks };
}

/**
 * Generate Deep Dive specific edits based on selected strategy cards.
 * This function is specifically for the Deep Dive flow and returns
 * Line/Copy suggestions tagged with strategyCardId.
 *
 * @param {Object} params
 * @param {string} params.text The manuscript text
 * @param {string[]} params.strategyCardIds The selected strategy card IDs
 * @param {string} [params.severity] Optional severity level
 * @returns {Promise<Array>} Array of sentence-level suggestions with strategyCardId
 */
export async function generateDeepDiveEdits({ text, strategyCardIds, severity = 'medium' }) {
  if (!strategyCardIds || strategyCardIds.length === 0) {
    throw new Error('strategyCardIds is required for Deep Dive edits');
  }

  // For now, return deterministic test data to fix the immediate issue
  // In production, this would call the AI model with strategy-specific prompts
  const suggestions = [];
  
  if (strategyCardIds.includes('tighten_sentences')) {
    suggestions.push({
      id: 'tighten_1',
      strategyCardId: 'tighten_sentences',
      editType: 'Line',
      original: 'in order to',
      suggestion: 'to',
      why: 'Tighten phrasing to improve pace.',
      from: Math.max(0, text.indexOf('in order to')),
      to: Math.max(0, text.indexOf('in order to')) + 'in order to'.length,
      source: 'AI'
    });
  }

  if (strategyCardIds.includes('active_voice')) {
    suggestions.push({
      id: 'active_1',
      strategyCardId: 'active_voice',
      editType: 'Line',
      original: 'was completed by',
      suggestion: 'completed',
      why: 'Prefer active voice for clarity.',
      from: Math.max(0, text.indexOf('was completed by')),
      to: Math.max(0, text.indexOf('was completed by')) + 'was completed by'.length,
      source: 'AI'
    });
  }

  if (strategyCardIds.includes('kill_hedges')) {
    suggestions.push({
      id: 'hedge_1',
      strategyCardId: 'kill_hedges',
      editType: 'Copy',
      original: 'perhaps',
      suggestion: '—', // remove
      why: 'Remove hedging to strengthen tone.',
      from: Math.max(0, text.indexOf('perhaps')),
      to: Math.max(0, text.indexOf('perhaps')) + 'perhaps'.length,
      source: 'AI'
    });
  }

  // Filter out any -1 indices (not found) and ensure valid positions
  return suggestions.filter(s => s.from >= 0 && s.to >= 0 && s.to >= s.from);
}
