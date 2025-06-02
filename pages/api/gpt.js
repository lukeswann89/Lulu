import OpenAI from 'openai';
import { chunkText } from '../../utils/chunkText';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripCodeBlocks(str) {
  return str
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/g, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const {
    text,
    editType,
    mode,
    thresholdOnly,
    editDepth,
    editProfile,
    writerCue,
    roadmapOnly,
    model
  } = req.body;

  if (!text || !editType || !mode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const editArray = Array.isArray(editType) ? editType : [editType];
  const typeList = editArray.join(', ');

  let prefix = `You are a world-class literary editor.`;
  if (editProfile === 'Creative') prefix += ` Use metaphorical or surreal creativity where appropriate.`;
  if (editProfile?.startsWith('Publisher')) prefix += ` Your goal is to match house style for ${editProfile.split(':')[1].trim()}.`;
  if (editProfile?.startsWith('Reader')) prefix += ` Ensure the tone suits a ${editProfile.split(':')[1].trim()} audience.`;

  let cuePrompt = writerCue
    ? `The author has provided their own editing notes:\n"""${writerCue}"""\nFor each note, 1) identify its intent as a separate actionable suggestion, 2) rewrite it for clarity, 3) briefly explain why your rewrite is stronger, and 4) assign 1–2 writing principles.`
    : '';
  let thresholdPrompt = thresholdOnly ? `Only suggest improvements if the text does not meet a professional literary standard.` : '';
  let roadmapTag = roadmapOnly || mode === 'General Edits' ? 'List proposed changes only. DO NOT revise the text.' : '';
  let depthNote = editDepth ? `Apply edits at a ${editDepth.toLowerCase()} level of intensity.` : '';

  const chunks = chunkText(text);
  const rawOutputs = [];
  const failedChunks = [];

  try {
    for (const chunk of chunks) {
      let prompt = '';

      if (mode === 'Specific Edits') {
        // --- WORLD-CLASS SPECIFIC EDITS PROMPT ---
        prompt = `
You are Lulu, an esteemed senior editor at a prestigious literary publishing house, renowned for meticulously refining manuscripts into critically acclaimed, best-selling young adult novels. Your task is to generate specific, high-quality edits across all essential editorial levels—developmental, structural, line, copy, and proofreading—to elevate the manuscript to its highest literary potential.

When providing edits, strictly adhere to the following guidelines, adjusting the number and depth of edits according to the manuscript's needs:

### Editing Types & Standards:

**Developmental Edits (Core Narrative Refinement):**
- Suggest edits enhancing character arcs, plot coherence, pacing, emotional resonance, and thematic depth.
- Provide substantial developmental edits only where significantly impactful improvements are needed, without overwhelming the narrative.

**Structural Edits (Narrative Flow & Organization):**
- Recommend improvements to chapter sequencing, scene transitions, and narrative flow.
- Suggest structural edits to ensure coherence, readability, and narrative integrity, proportional to the manuscript's requirements.

**Line Edits (Stylistic Precision):**
- Offer refinements to sentence structure, voice, tone, clarity, rhythm, and stylistic elegance.
- Suggest line edits selectively, enhancing literary quality while preserving the author’s distinct voice, based on the manuscript’s level of stylistic polish.

**Copy Edits (Textual Accuracy):**
- Correct grammatical, syntactical, punctuation errors, and consistency issues.
- Provide copy edits to ensure textual accuracy and clarity, scaling edits to match the manuscript's degree of textual precision.

**Proofreading (Final Polish):**
- Identify and correct typos, spelling mistakes, formatting inconsistencies, and minor textual issues.
- Apply proofreading edits comprehensively to ensure professional polish, based on the manuscript’s existing state.

### How to Present Edits:

For each edit:
- Clearly present *Original* text alongside the Suggested Revision.
- Provide succinct yet insightful *Justifications* grounded in literary standards, market appeal, or reader psychology.
- Maintain the author’s voice, enhancing rather than overriding.

${writerCue ? "The author has shared these notes for editorial consideration: " + writerCue : ""}

Manuscript to edit:
${chunk}

Please output an array of edits as JSON in the following format:
[
  {
    "editType": "Developmental" | "Structural" | "Line" | "Copy" | "Proof",
    "original": "...",
    "suggestion": "...",
    "why": "..."
  }
]
Only include necessary and high-value edits, according to the manuscript's needs.
        `;
      } else {
        // --- General Edits & Other Modes (legacy prompt) ---
        prompt = `${prefix}
${cuePrompt}
${depthNote}
Editing types: ${typeList}
${thresholdPrompt}
${roadmapTag}
Provide all output as a JSON array.
Writer's Editing Notes (if any) should be the first group, as:
{ "editType": "Writer's Edit", "own": "Original note", "lulu": "Your rewritten/improved version", "why": "Why is your version stronger?", "principles": ["Principle1", "Principle2"] }
For all other suggestions, each item must contain:
- "editType" (e.g. Developmental, Line, Copy, Proof)
- "recommendation" (the suggestion)
- "priority" (High, Medium, Low)
- "why" (brief justification)
- "principles" (array of 1–2 principles)
Return ONLY a valid JSON array, no other commentary.
Text:
${chunk}`;
      }

      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });

      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      result = result.replace(/^json\s*[\r\n]+/i, '').trim();
      rawOutputs.push(result);
    }

    const parsed = [];
    for (const [i, raw] of rawOutputs.entries()) {
      try {
        const json = JSON.parse(raw);
        if (Array.isArray(json)) parsed.push(...json);
      } catch (e) {
        console.warn('Failed to parse chunk:', raw);
        failedChunks.push(i + 1);
      }
    }

    return res.status(200).json({
      roadmap: mode === 'General Edits' ? parsed : undefined,
      suggestions: mode === 'Specific Edits' ? parsed : undefined,
      failedChunks
    });

  } catch (err) {
    console.error('GPT error:', err);
    return res.status(500).json({ error: 'GPT request failed.' });
  }
}
