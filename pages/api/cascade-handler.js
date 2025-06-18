// /api/cascade-handler.js
// GPT RECONTEXTUALIZATION API: Handles cascade generation and between-level recontextualization

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Helper function to strip code blocks from GPT responses
function stripCodeBlocks(str) {
  return str
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/g, '')
    .trim();
}

// Helper function to find text positions for cascade edits
function findTextPositions(content, originalText) {
  const positions = [];
  let startIndex = 0;
  
  while (true) {
    const index = content.indexOf(originalText, startIndex);
    if (index === -1) break;
    
    positions.push({
      start: index,
      end: index + originalText.length,
      match: content.substring(index, index + originalText.length)
    });
    
    startIndex = index + 1;
  }
  
  return positions;
}

// Generate cascade edits based on accepted edit
async function generateCascadeEdits(sourceEdit, sourceLevel, targetLevels, originalText, context) {
  const cascadeEdits = [];
  
  console.log('🔄 Generating cascade edits:', {
    sourceLevel,
    targetLevels,
    sourceEdit: sourceEdit.original?.substring(0, 100) + '...'
  });

  for (const targetLevel of targetLevels) {
    const cascadeKey = `${sourceLevel}_to_${targetLevel}`;
    const promptTemplate = CASCADE_PROMPTS[sourceLevel]?.[`to_${targetLevel}`];
    
    if (!promptTemplate) {
      console.warn(`⚠️ No cascade prompt for ${cascadeKey}`);
      continue;
    }

    try {
      // Fill in the prompt template
      const prompt = promptTemplate
        .replace('{sourceOriginal}', sourceEdit.original || '')
        .replace('{sourceRevision}', sourceEdit.suggestion || sourceEdit.revision || '')
        .replace('{sourceWhy}', sourceEdit.why || '');

      const fullPrompt = `${prompt}

CURRENT MANUSCRIPT CONTEXT:
${originalText.substring(0, 2000)}...

EXISTING SUGGESTIONS CONTEXT:
${JSON.stringify(context.existingSuggestions || {}, null, 2)}

Remember to find exact text from the manuscript for the "original" field of each edit.`;

      console.log(`📤 Sending ${cascadeKey} cascade request to OpenAI`);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.3,
      });

      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      
      try {
        const parsedEdits = JSON.parse(result);
        
        if (Array.isArray(parsedEdits)) {
          // Add position information to each edit
          const processedEdits = parsedEdits.map(edit => {
            const positions = findTextPositions(originalText, edit.original || '');
            return {
              ...edit,
              start: positions.length > 0 ? positions[0].start : null,
              end: positions.length > 0 ? positions[0].end : null,
              confidence: positions.length > 0 ? 1.0 : 0.5,
              cascadeSource: {
                level: sourceLevel,
                original: sourceEdit.original,
                suggestion: sourceEdit.suggestion
              },
              state: 'pending'
            };
          });
          
          cascadeEdits.push(...processedEdits);
          console.log(`✅ Generated ${processedEdits.length} ${targetLevel} cascade edits`);
        }
        
      } catch (parseError) {
        console.error(`❌ Failed to parse ${cascadeKey} cascade result:`, parseError);
      }
      
    } catch (error) {
      console.error(`❌ Error generating ${cascadeKey} cascade:`, error);
    }
  }
  
  return cascadeEdits;
}

// Recontextualize existing suggestions after level completion
async function recontextualizeSuggestions(completedLevel, remainingText, existingSuggestions, context) {
  const recontextKey = `after_${completedLevel}`;
  const promptTemplate = RECONTEXTUALIZATION_PROMPTS[recontextKey];
  
  if (!promptTemplate) {
    console.warn(`⚠️ No recontextualization prompt for ${recontextKey}`);
    return existingSuggestions;
  }

  console.log('🔄 Recontextualizing suggestions after:', completedLevel);

  try {
    const prompt = `${promptTemplate}

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    let result = completion.choices[0].message.content.trim();
    if (result.startsWith('```')) result = stripCodeBlocks(result);
    
    const recontextActions = JSON.parse(result);
    
    if (Array.isArray(recontextActions)) {
      console.log(`✅ Generated ${recontextActions.length} recontextualization actions`);
      return recontextActions;
    }
    
  } catch (error) {
    console.error('❌ Error during recontextualization:', error);
  }
  
  // Fallback: return original suggestions if recontextualization fails
  return existingSuggestions;
}

// Main API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    action = 'cascade',
    sourceEdit,
    sourceLevel,
    targetLevels,
    originalText,
    context,
    // Recontextualization params
    completedLevel,
    remainingText,
    existingSuggestions
  } = req.body;

  console.log('🎯 Cascade handler received request:', {
    action,
    sourceLevel,
    targetLevels,
    completedLevel,
    textLength: originalText?.length || remainingText?.length || 0
  });

  try {
    if (action === 'cascade') {
      // Generate cascade edits
      if (!sourceEdit || !sourceLevel || !targetLevels || !originalText) {
        return res.status(400).json({ 
          error: 'Missing required fields for cascade generation',
          required: ['sourceEdit', 'sourceLevel', 'targetLevels', 'originalText']
        });
      }

      const cascadeEdits = await generateCascadeEdits(
        sourceEdit,
        sourceLevel,
        targetLevels,
        originalText,
        context || {}
      );

      return res.status(200).json({
        success: true,
        cascadeEdits,
        sourceLevel,
        targetLevels,
        metadata: {
          totalGenerated: cascadeEdits.length,
          validOffsets: cascadeEdits.filter(e => e.start !== null).length,
          timestamp: new Date().toISOString()
        }
      });

    } else if (action === 'recontextualize') {
      // Recontextualize existing suggestions
      if (!completedLevel || !remainingText || !existingSuggestions) {
        return res.status(400).json({
          error: 'Missing required fields for recontextualization',
          required: ['completedLevel', 'remainingText', 'existingSuggestions']
        });
      }

      const recontextActions = await recontextualizeSuggestions(
        completedLevel,
        remainingText,
        existingSuggestions,
        context || {}
      );

      return res.status(200).json({
        success: true,
        recontextActions,
        completedLevel,
        metadata: {
          totalReviewed: Array.isArray(recontextActions) ? recontextActions.length : 0,
          timestamp: new Date().toISOString()
        }
      });

    } else {
      return res.status(400).json({
        error: 'Invalid action',
        validActions: ['cascade', 'recontextualize']
      });
    }

  } catch (error) {
    console.error('❌ Cascade handler error:', error);
    return res.status(500).json({
      error: 'Cascade processing failed',
      details: error.message
    });
  }
}