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
  
if (mode === 'Specific Edits') {
  return res.status(200).json({
    suggestions: [
      {
        editType: "Line",
        original: "Please speak to me,",
        suggestion: "Could you please speak to me?",
        start: 0,
        end: 18,
        why: "Makes it more polite.",
        principles: ["Clarity"],
        state: "pending"
      },
      {
        editType: "Proof",
        original: "their mum's",
        suggestion: "her mother's",
        start: 420,
        end: 430,
        why: "Consistency in possessive.",
        principles: ["Consistency"],
        state: "pending"
      }
    ]
  });
}

  // *** MOCK BLOCK FOR SPECIFIC EDITS TESTING ***
  if (mode === "Specific Edits") {
    return res.status(200).json({
      suggestions: [
        {
          start: 0,
          end: 6,
          editType: "Line",
          original: text.slice(0, 6),
          suggestion: "Kindly",
          why: "Makes it more polite.",
          principles: ["Politeness"],
          state: "pending"
        },
        {
          start: 34,
          end: 40,
          editType: "Proof",
          original: text.slice(34, 40),
          suggestion: "Sylvia",
          why: "Corrects the name.",
          principles: ["Accuracy"],
          state: "pending"
        }
      ]
    });
  }
  // *** END MOCK BLOCK ***

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

  const inlineHint = mode === 'Specific Edits'
    ? 'For each suggestion, in addition to editType, recommendation, etc., include either the exact "original" text, OR { "start": offset, "end": offset } referencing the matching span of text in the input.' : '';

  const chunks = chunkText(text);
  const rawOutputs = [];
  const failedChunks = [];

  try {
    for (const chunk of chunks) {
      // Compose the prompt, including inline reference for Specific Edits
      const prompt = `${prefix}
${cuePrompt}
${depthNote}
Editing types: ${typeList}
${thresholdPrompt}
${roadmapTag}
${inlineHint}
Provide all output as a JSON array.
Writer's Editing Notes (if any) should be the first group, as:
{ "editType": "Writer's Edit", "own": "Original note", "lulu": "Your rewritten/improved version", "why": "Why is your version stronger?", "principles": ["Principle1", "Principle2"] }
For all other suggestions, each item must contain:
- "editType" (e.g. Developmental, Line, Copy, Proof)
- "recommendation" (the suggestion)
- "priority" (High, Medium, Low)
- "why" (brief justification)
- "principles" (array of 1–2 principles)
${mode === 'Specific Edits' ? '- "original": the exact text span, and/or "start"/"end" offsets if possible.' : ''}
Return ONLY a valid JSON array, no other commentary.
Text:
${chunk}`;

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

    // Parse and flatten all roadmap items
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

    // Mark up editType for frontend multi-layer highlighting (Dev/Line/Proof, etc.)
    // Each suggestion's "editType" field should be used by the UI for coloring and badges.

    return res.status(200).json({ roadmap: parsed, failedChunks });

  } catch (err) {
    console.error('GPT error:', err);
    return res.status(500).json({ error: 'GPT request failed.' });
  }
}
