import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { ocrText } = req.body;

    const trainingPath = path.join(process.cwd(), 'data', 'handwriting-training.json');
    const correctionsPath = path.join(process.cwd(), 'data', 'corrections.json');
    const wordsPath = path.join(process.cwd(), 'data', 'words.json');

    const [letters, corrections, words] = await Promise.all([
      fs.readFile(trainingPath, 'utf-8').then(JSON.parse).catch(() => []),
      fs.readFile(correctionsPath, 'utf-8').then(JSON.parse).catch(() => []),
      fs.readFile(wordsPath, 'utf-8').then(JSON.parse).catch(() => [])
    ]);

    const recentFixes = corrections.slice(-5).map(c => `"${c.ocr}" → "${c.confirmed}"`).join('\n');
    const wordList = words.slice(0, 20).join(', ');
    const knownLetters = letters.slice(0, 26).map(l => l.label).join(', ');

    const messages = [
      {
        role: 'system',
        content: 'You are a handwriting OCR corrector that fixes messy or misread handwriting. Use context, word examples, and known letter patterns to make smart corrections.'
      },
      {
        role: 'user',
        content: `
OCR Output:
${ocrText}

Known common words: ${wordList}
Known letters: ${knownLetters}
Past corrections:
${recentFixes}

Correct this OCR output. Return only the corrected text, not commentary. If the OCR is ambiguous, use your best judgment. Autocomplete missing words if obvious.
        `.trim()
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.2,
    });

    const correctedText = response.choices?.[0]?.message?.content || '';

    res.status(200).json({ corrected: correctedText });
  } catch (err) {
    console.error('Smart Fix Error:', err);
    res.status(500).json({ error: 'Failed to generate correction.' });
  }
}
