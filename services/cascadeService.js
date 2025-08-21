// services/cascadeService.js
//
// Shared business logic for cascade generation and recontextualization.
//
// This module encapsulates the complex editorial cascade workflow. It
// contains static prompt templates, helper functions for positional
// calculations, and two primary functions—`generateCascadeEdits` and
// `recontextualizeSuggestions`. By isolating this logic, the API handlers
// remain thin and maintain the "Singular Purpose" of each route.

import { getOpenAIClient } from '../lib/openai.js';

// Cascade generation prompts for different edit levels
const CASCADE_PROMPTS = {
  developmental: {
    to_structural: `
You are a senior structural editor. A developmental edit has been accepted. Based on this developmental change, generate specific structural edits that will implement this high-level improvement.

DEVELOPMENTAL EDIT ACCEPTED:
Original: "{sourceOriginal}"
Revised to: "{sourceRevision}"
Reasoning: "{sourceWhy}"

STRUCTURAL CASCADE INSTRUCTIONS:
- Generate 2-4 specific structural edits that implement this developmental change
- Focus on scene organization, chapter flow, pacing, and narrative structure
- Each edit should target specific text passages that need structural revision
- Provide concrete, actionable structural improvements

Output JSON array of structural edits:
[
  {
    "editType": "Structural",
    "original": "exact text needing structural revision",
    "suggestion": "improved structural version",
    "why": "how this implements the developmental change"
  }
]`,
    to_line: `
You are a senior line editor. A developmental edit has been accepted. Generate specific line edits that support this developmental improvement.

DEVELOPMENTAL EDIT ACCEPTED:
Original: "{sourceOriginal}"
Revised to: "{sourceRevision}"
Reasoning: "{sourceWhy}"

LINE EDIT CASCADE INSTRUCTIONS:
- Generate 3-6 specific line edits that enhance the sentences supporting this developmental change
- Focus on clarity, flow, word choice, and sentence structure
- Target specific sentences that can better express the developmental improvement
- Ensure line edits align with the developmental change's intent

Output JSON array of line edits:
[
  {
    "editType": "Line",
    "original": "exact sentence needing line editing",
    "suggestion": "improved line-edited version",
    "why": "how this supports the developmental change"
  }
]`,
    to_copy: `
You are a senior copy editor. A developmental edit has been accepted. Generate copy edits that ensure consistency and correctness around this developmental change.

DEVELOPMENTAL EDIT ACCEPTED:
Original: "{sourceOriginal}"
Revised to: "{sourceRevision}"
Reasoning: "{sourceWhy}"

COPY EDIT CASCADE INSTRUCTIONS:
- Generate 2-4 copy edits that address consistency, grammar, and style issues related to this change
- Focus on character name consistency, timeline accuracy, style guide adherence
- Target specific areas where the developmental change creates consistency needs
- Ensure copy edits maintain manuscript coherence

Output JSON array of copy edits:
[
  {
    "editType": "Copy",
    "original": "exact text needing copy editing",
    "suggestion": "corrected copy-edited version",
    "why": "how this maintains consistency after the developmental change"
  }
]`
  },
  structural: {
    to_line: `
You are a senior line editor. A structural edit has been accepted. Generate line edits that implement this structural improvement at the sentence level.

STRUCTURAL EDIT ACCEPTED:
Original: "{sourceOriginal}"
Revised to: "{sourceRevision}"
Reasoning: "{sourceWhy}"

LINE EDIT CASCADE INSTRUCTIONS:
- Generate 3-6 line edits that improve sentences within the restructured content
- Focus on transitions, flow, clarity, and readability after structural changes
- Target sentences that need refinement to work within the new structure
- Ensure smooth narrative flow in the restructured content

Output JSON array of line edits:
[
  {
    "editType": "Line", 
    "original": "exact sentence needing line editing",
    "suggestion": "improved line-edited version",
    "why": "how this improves flow after structural changes"
  }
]`,
    to_copy: `
You are a senior copy editor. A structural edit has been accepted. Generate copy edits that maintain consistency after this structural change.

STRUCTURAL EDIT ACCEPTED:
Original: "{sourceOriginal}"
Revised to: "{sourceRevision}"
Reasoning: "{sourceWhy}"

COPY EDIT CASCADE INSTRUCTIONS:
- Generate 2-4 copy edits addressing consistency issues created by the structural change
- Focus on pronoun references, verb tenses, character tracking after restructuring
- Target specific areas where structure changes affect grammatical consistency
- Ensure copy edits maintain coherence across the restructured content

Output JSON array of copy edits:
[
  {
    "editType": "Copy",
    "original": "exact text needing copy editing", 
    "suggestion": "corrected copy-edited version",
    "why": "how this maintains consistency after structural changes"
  }
]`
  },
  line: {
    to_copy: `
You are a senior copy editor. Line edits have been accepted. Generate copy edits that ensure correctness and consistency with these line-level improvements.

LINE EDIT ACCEPTED:
Original: "{sourceOriginal}"
Revised to: "{sourceRevision}"
Reasoning: "{sourceWhy}"

COPY EDIT CASCADE INSTRUCTIONS:
- Generate 1-3 copy edits that address grammar, punctuation, and style consistency
- Focus on ensuring the line edits maintain proper grammar and style
- Target areas where line changes might have created copy editing needs
- Maintain style guide consistency after line-level improvements

Output JSON array of copy edits:
[
  {
    "editType": "Copy",
    "original": "exact text needing copy editing",
    "suggestion": "corrected copy-edited version", 
    "why": "how this ensures correctness after line edits"
  }
]`
  }
};

// Recontextualization prompts for between-level analysis
const RECONTEXTUALIZATION_PROMPTS = {
  after_developmental: `
You are a senior editor reviewing a manuscript after developmental edits have been completed. Analyze the remaining suggestions and update them to reflect the new context created by the accepted developmental changes.

CONTEXT:
- Developmental edits have been processed
- Current manuscript state reflects accepted developmental improvements  
- Remaining suggestions may need adjustment for relevance and accuracy

RECONTEXTUALIZATION TASK:
Review all remaining structural, line, and copy edit suggestions. For each suggestion:
1. Determine if it's still relevant after developmental changes
2. Update the suggestion if the context has changed
3. Remove suggestions that are no longer applicable
4. Ensure suggestions don't conflict with accepted developmental edits

Output updated suggestions with "action" field: "keep", "update", or "remove"`,
  after_structural: `
You are a senior editor reviewing remaining suggestions after structural edits have been completed. Update line and copy edit suggestions to reflect the new structural context.

CONTEXT:
- Developmental and structural edits have been processed
- Manuscript structure has been improved and finalized
- Remaining line and copy suggestions need contextual review

RECONTEXTUALIZATION TASK:
Review remaining line and copy edit suggestions. Update them to work within the new structural framework while maintaining their editorial value.

Output updated suggestions with "action" field: "keep", "update", or "remove"`,
  after_line: `
You are a senior copy editor reviewing remaining suggestions after line edits have been completed. Update copy edit suggestions to reflect the improved sentence-level content.

CONTEXT:
- Line editing has been completed
- Sentence clarity and flow have been improved
- Copy edit suggestions need final contextual review

RECONTEXTUALIZATION TASK:
Review remaining copy edit suggestions to ensure they're still needed and accurate after line editing improvements.

Output updated suggestions with "action" field: "keep", "update", or "remove"`
};

/**
 * Strip code fences from GPT responses.
 *
 * @param {string} str
 * @returns {string}
 */
function stripCodeBlocks(str) {
  return str.replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim();
}

/**
 * Find all occurrences of a substring within a larger string.
 *
 * Returns an array of objects containing start and end offsets as well as
 * the matched text. This is used to assign offsets to cascade edits.
 *
 * @param {string} content The full manuscript content
 * @param {string} originalText The substring to search for
 * @returns {Array<{ start: number, end: number, match: string }>} Position info
 */
function findTextPositions(content, originalText) {
  const positions = [];
  let startIndex = 0;
  while (true) {
    const index = content.indexOf(originalText, startIndex);
    if (index === -1) break;
    positions.push({
      start: index,
      end: index + originalText.length,
      match: content.substring(index, index + originalText.length),
    });
    startIndex = index + 1;
  }
  return positions;
}

/**
 * Generate cascade edits based on an accepted edit.
 *
 * For each target level, this function fills the appropriate prompt template,
 * adds context, sends the request to OpenAI, parses the response and
 * calculates positional metadata for each generated edit.
 *
 * @param {Object} sourceEdit The accepted edit (must include `original` and `suggestion` or `revision`)
 * @param {string} sourceLevel The level of the accepted edit (developmental, structural, line)
 * @param {string[]} targetLevels The desired target levels to generate
 * @param {string} originalText The current manuscript text
 * @param {Object} context Additional context (e.g., existing suggestions)
 * @returns {Promise<any[]>} An array of cascade edits with metadata
 */
export async function generateCascadeEdits(sourceEdit, sourceLevel, targetLevels, originalText, context = {}) {
  const cascadeEdits = [];
  const openai = getOpenAIClient();
  for (const targetLevel of targetLevels) {
    const cascadeKey = `${sourceLevel}_to_${targetLevel}`;
    const template = CASCADE_PROMPTS[sourceLevel]?.[`to_${targetLevel}`];
    if (!template) {
      // Skip unsupported cascades rather than throwing
      continue;
    }
    // Fill in the placeholders
    const prompt = template
      .replace('{sourceOriginal}', sourceEdit.original || '')
      .replace('{sourceRevision}', sourceEdit.suggestion || sourceEdit.revision || '')
      .replace('{sourceWhy}', sourceEdit.why || '');
    const fullPrompt = `${prompt}

CURRENT MANUSCRIPT CONTEXT:
${originalText.substring(0, 2000)}...

EXISTING SUGGESTIONS CONTEXT:
${JSON.stringify(context.existingSuggestions || {}, null, 2)}

Remember to find exact text from the manuscript for the "original" field of each edit.`;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.3,
      });
      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      const parsedEdits = JSON.parse(result);
      if (Array.isArray(parsedEdits)) {
        parsedEdits.forEach(edit => {
          const positions = findTextPositions(originalText, edit.original || '');
          cascadeEdits.push({
            ...edit,
            start: positions.length > 0 ? positions[0].start : null,
            end: positions.length > 0 ? positions[0].end : null,
            confidence: positions.length > 0 ? 1.0 : 0.5,
            cascadeSource: {
              level: sourceLevel,
              original: sourceEdit.original,
              suggestion: sourceEdit.suggestion,
            },
            state: 'pending',
          });
        });
      }
    } catch (error) {
      // Log the error at the handler level; here we silently continue
      continue;
    }
  }
  return cascadeEdits;
}

/**
 * Recontextualize existing suggestions after completing a level.
 *
 * Calls OpenAI with a prompt describing the completed level, current
 * manuscript state and existing suggestions. The model returns an array of
 * actions indicating whether to keep, update or remove each suggestion.
 *
 * @param {string} completedLevel The completed level (developmental, structural, line)
 * @param {string} remainingText The current manuscript after processing the level
 * @param {any[]} existingSuggestions Existing suggestions to review
 * @param {Object} context Additional context, such as completed levels
 * @returns {Promise<any[]>} An array of recontextualization actions
 */
export async function recontextualizeSuggestions(completedLevel, remainingText, existingSuggestions, context = {}) {
  const recontextKey = `after_${completedLevel}`;
  const template = RECONTEXTUALIZATION_PROMPTS[recontextKey];
  if (!template) {
    return existingSuggestions;
  }
  const openai = getOpenAIClient();
  const prompt = `${template}

CURRENT MANUSCRIPT STATE:
${remainingText.substring(0, 2000)}...

COMPLETED LEVELS: ${context.completedLevels?.join(', ') || 'None'}

EXISTING SUGGESTIONS TO REVIEW:
${JSON.stringify(existingSuggestions, null, 2)}

For each suggestion, respond with:
{
  "suggestionId": "original_suggestion_index",
  "action": "keep" | "update" | "remove",
  "updatedSuggestion": { /* updated suggestion object if action is "update" */ },
  "reason": "explanation for the action taken"
}

Output as JSON array of recontextualization actions.`;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    let result = completion.choices[0].message.content.trim();
    if (result.startsWith('```')) result = stripCodeBlocks(result);
    const actions = JSON.parse(result);
    if (Array.isArray(actions)) {
      return actions;
    }
  } catch (error) {
    // Fall through to return original suggestions
  }
  return existingSuggestions;
}
