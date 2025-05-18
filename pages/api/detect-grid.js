import { formidable } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import OpenAI from 'openai';

export const config = { api: { bodyParser: false } };
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function convertPdfToPng(pdfPath, outputDir) {
  const base = path.join(outputDir, `pdf_temp_${Date.now()}`);
  const cmd = `pdftoppm -png "${pdfPath}" "${base}"`;

  await new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });

  const files = await fs.readdir(outputDir);
  return files
    .filter((f) => f.startsWith(path.basename(base)) && f.endsWith('.png'))
    .map((f) => path.join(outputDir, f));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ keepExtensions: true, uploadDir: './public/uploads' });

  form.parse(req, async (err, fields, files) => {
    try {
      const uploaded = files.file?.[0];
      if (!uploaded) return res.status(400).json({ error: 'Missing file' });

      // Convert to PNG if needed
      let imagePath = uploaded.filepath;
      if (uploaded.originalFilename.endsWith('.pdf')) {
        const pngs = await convertPdfToPng(uploaded.filepath, './public/uploads');
        if (pngs.length === 0) throw new Error('No pages extracted from PDF');
        imagePath = pngs[0]; // just use first page
      }

      const imageUrl = `http://localhost:3000/uploads/${path.basename(imagePath)}`;

      const messages = [
        {
          role: 'system',
          content: 'You are a vision assistant that can identify grid layout bounding boxes of handwritten letters from A to Z in scanned documents.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a 5x6 A–Z handwritten letter grid. Please return an array of 26 entries formatted like:
[
  { label: "a", x: 0, y: 0, width: 100, height: 100 },
  ...
  { label: "z", x: 800, y: 400, width: 100, height: 100 }
]
Only include letters a–z. Coordinates must be in pixels.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.2,
      });

      const raw = response.choices[0].message.content;
      const jsonStart = raw.indexOf('[');
      const jsonEnd = raw.lastIndexOf(']') + 1;
      const json = raw.slice(jsonStart, jsonEnd);
      const boxes = JSON.parse(json);

      res.status(200).json({ boxes });
    } catch (err) {
      console.error('❌ detect-grid error:', err);
      res.status(500).json({ error: 'Grid detection failed' });
    }
  });
}
