// pages/api/focus-edit.js

import OpenAI from 'openai';
import { chunkText } from '../../utils/chunkText';

function stripCodeBlocks(str) {
  return str.replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim();
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, model } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing manuscript text.' });
  }

  let openai;
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (e) {
    console.error("Failed to initialize OpenAI client:", e);
    return res.status(500).json({ error: 'OpenAI client configuration error.' });
  }

  const chunks = chunkText(text, 3500);
  const outputs = [];
  const failedChunks = [];

  try {
    for (const chunk of chunks) {
      const prompt = buildFocusPrompt({ manuscript: chunk });

      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      result = result.replace(/^json\s*[\r\n]+/i, '').trim();
      outputs.push(result);
    }

    const suggestions = [];
    for (const [i, raw] of outputs.entries()) {
      try {
        const json = JSON.parse(raw);
        if (Array.isArray(json)) {
          suggestions.push(...json);
        }
      } catch (e) {
        console.warn(`Failed to parse chunk ${i + 1}:`, raw);
        failedChunks.push(i + 1);
      }
    }
    
    return res.status(200).json({ suggestions, failedChunks });

  } catch (err) {
    console.error('GPT error in /api/focus-edit:', err);
    return res.status(500).json({ error: 'GPT request failed.' });
  }
} 