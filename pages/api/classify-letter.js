import OpenAI from 'openai';
import { formidable } from 'formidable';
import fs from 'fs/promises';
import path from 'path';

export const config = { api: { bodyParser: false } };
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ keepExtensions: true, uploadDir: './public/uploads' });

  form.parse(req, async (err, fields, files) => {
    try {
      const inputFile = files.file[0];
      const userLetterPath = inputFile.filepath;

      const caseType = fields.case?.[0] || 'lower';
      const examplesFolder = path.join(process.cwd(), 'public', 'letters', caseType);
      const allExamples = await fs.readdir(examplesFolder);

      // Load up to 2 example images per letter (a–z)
      const letterGroups = {};
      allExamples.forEach((filename) => {
        const match = filename.match(/^([a-zA-Z])[-_]/);
        if (match) {
          const label = match[1].toLowerCase();
          letterGroups[label] = letterGroups[label] || [];
          if (letterGroups[label].length < 2) {
            letterGroups[label].push(`http://127.0.0.1:3000/letters/${caseType}/${filename}`);
          }
        }
      });

      const imageExamples = Object.entries(letterGroups).map(([label, urls]) => ({
        label,
        urls
      }));

      const prompt = [
        {
          role: 'system',
          content: 'You are an expert at interpreting handwritten letters. You are given an unknown handwritten character and a set of example letter images. Your task is to classify the unknown character.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What letter is this handwritten image most likely to be? Use the style examples to help you.' },
            { type: 'image_url', image_url: { url: `http://127.0.0.1:3000/uploads/${inputFile.newFilename}` } },
            ...imageExamples.flatMap(group => group.urls.map(url => ({
              type: 'image_url',
              image_url: { url },
            }))),
            { type: 'text', text: 'Please return only the most likely matching letter as a single character.' }
          ]
        }
      ];

      const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: prompt,
        temperature: 0.2,
      });

      const guess = result.choices[0]?.message?.content?.trim() || '?';
      res.status(200).json({ guess });

    } catch (err) {
      console.error('❌ classify-letter error:', err);
      res.status(500).json({ error: 'Failed to classify letter' });
    }
  });
}
