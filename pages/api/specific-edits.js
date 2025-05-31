// pages/api/specific-edits.js

import OpenAI from 'openai';
import { chunkText } from '../../utils/chunkText';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EDIT_TYPES = ["Developmental", "Structural", "Line", "Copy", "Proofreading"];

// --- Utility: Remove markdown code blocks if present ---
function stripCodeBlocks(str) {
  return str.replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim();
}

// --- Robust Prompt Builder ---
function buildPrompt({ manuscript, editTypes }) {
  return `
You are Lulu, an esteemed senior editor at a prestigious literary publishing house, renowned for meticulously refining manuscripts into critically acclaimed, best-selling young adult novels.

Your task is to generate specific, high-quality edits across all essential editorial levels—developmental, structural, line, copy, and proofreading—to elevate the manuscript to its highest literary potential.

When providing edits, strictly adhere to the following guidelines, adjusting the number and depth of edits according to the manuscript's needs:

---

Editing Types & Standards:

${editTypes.includes("Developmental") ? `
Developmental Edits (Core Narrative Refinement):
- Suggest edits enhancing character arcs, plot coherence, pacing, emotional resonance, and thematic depth.
- Provide substantial developmental edits only where significantly impactful improvements are needed, without overwhelming the narrative.
` : ''}

${editTypes.includes("Structural") ? `
Structural Edits (Narrative Flow & Organization):
- Recommend improvements to chapter sequencing, scene transitions, and narrative flow.
- Suggest structural edits to ensure coherence, readability, and narrative integrity, proportional to the manuscript's requirements.
` : ''}

${editTypes.includes("Line") ? `
Line Edits (Stylistic Precision):
- Offer refinements to sentence structure, voice, tone, clarity, rhythm, and stylistic elegance.
- Suggest line edits selectively, enhancing literary quality while preserving the author’s distinct voice, based on the manuscript’s level of stylistic polish.
` : ''}

${editTypes.includes("Copy") ? `
Copy Edits (Textual Accuracy):
- Correct grammatical, syntactical, punctuation errors, and consistency issues.
- Provide copy edits to ensure textual accuracy and clarity, scaling edits to match the manuscript's degree of textual precision.
` : ''}

${editTypes.includes("Proofreading") ? `
Proofreading (Final Polish):
- Identify and correct typos, spelling mistakes, formatting inconsistencies, and minor textual issues.
- Apply proofreading edits comprehensively to ensure professional polish, based on the manuscript’s existing state.
` : ''}

---

How to Present Edits:
For each edit:
- Present the original text alongside the suggested revision.
- Provide a succinct yet insightful justification grounded in literary standards, market appeal, or reader psychology.
- Specify the edit type: Developmental, Structural, Line, Copy, Proofreading.
- Maintain the author’s voice; enhance, don’t override.
- Aim for depth, clarity, and actionable guidance, making your edits responsive to the manuscript’s actual needs rather than a predetermined count.

Format all output as a JSON array of suggestions, where each suggestion includes:
- editType: "Developmental", "Structural", "Line", "Copy", or "Proofreading"
- original: the exact text to be changed (as it appears in the manuscript)
- suggestion: the revised text
- why: a short, insightful justification
- principles: (optional) array of relevant writing/editing principles
- start and end: (optional) character offsets for the original text within the manuscript, if possible

Return only a valid JSON array, no commentary or introduction.

---

Manuscript:
${manuscript}
  `.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const {
    text,
    editTypes,
    model
  } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing manuscript text.' });
  }

  // Default to all edit types if not provided
  const editTypeArray = Array.isArray(editTypes) && editTypes.length
    ? editTypes
    : EDIT_TYPES;

  // --- Chunking for long manuscripts ---
  const chunks = chunkText(text, 3500); // ~3500 chars per chunk
  const outputs = [];
  const failedChunks = [];

  try {
    for (const chunk of chunks) {
      const prompt = buildPrompt({
        manuscript: chunk,
        editTypes: editTypeArray,
      });

      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });

      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      result = result.replace(/^json\s*[\r\n]+/i, '').trim();
      outputs.push(result);
    }

    // Parse and flatten suggestions from all chunks
    const suggestions = [];
    for (const [i, raw] of outputs.entries()) {
      try {
        const json = JSON.parse(raw);
        if (Array.isArray(json)) suggestions.push(...json);
      } catch (e) {
        console.warn(`Failed to parse chunk ${i + 1}:`, raw);
        failedChunks.push(i + 1);
      }
    }

    // Group by editType for easy frontend use, always include all edit types
    const grouped = {};
    EDIT_TYPES.forEach(type => grouped[type] = []);
    grouped.Other = [];
    for (const s of suggestions) {
      const key = (s.editType || '').trim();
      if (EDIT_TYPES.includes(key)) grouped[key].push(s);
      else grouped.Other.push(s);
    }

    return res.status(200).json({ suggestions: grouped, failedChunks });

  } catch (err) {
    console.error('GPT error:', err);
    return res.status(500).json({ error: 'GPT request failed.' });
  }
}
