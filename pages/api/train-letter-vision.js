import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

export const config = { api: { bodyParser: false } };
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OUTPUT_FOLDER = './public/letters';
const TRAINING_FILE = './data/handwriting-training.json';
const MALFORMED_FILE = './logs/malformed-boxes.json';

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

async function detectGridBoxes(imagePath) {
  const imageData = await fs.readFile(imagePath);
  const base64 = imageData.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a vision assistant that detects bounding boxes in a 5×6 A–Z handwriting grid image. Return 26 entries for letters a–z, each with x, y, width, and height.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Here is a scanned A–Z letter grid. Return a JSON array like: [{ label: "a", x: 0, y: 0, width: 100, height: 100 }, ..., { label: "z", ... }]',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
              detail: 'low',
            },
          },
        ],
      },
    ],
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content;
  const jsonStart = raw.indexOf('[');
  const jsonEnd = raw.lastIndexOf(']') + 1;
  const json = raw.slice(jsonStart, jsonEnd);
  return JSON.parse(json);
}

async function extractLetters(imagePath, boxes, caseType, timestamp) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const letters = [];
  const failed = [];

  for (const box of boxes) {
    const { label, x, y, width, height } = box;

    const left = Math.floor(x);
    const top = Math.floor(y);
    const safeWidth = Math.max(1, Math.min(width, metadata.width - left));
    const safeHeight = Math.max(1, Math.min(height, metadata.height - top));

    if (left < 0 || top < 0 || safeWidth <= 0 || safeHeight <= 0) {
      failed.push({
        timestamp,
        case: caseType,
        image: `/uploads/${path.basename(imagePath)}`,
        box,
        reason: 'Invalid crop dimensions',
      });
      continue;
    }

    try {
      const cropped = await image.extract({ left, top, width: safeWidth, height: safeHeight });
      const filename = `${caseType}-${label}-${timestamp}-${uuidv4().slice(0, 6)}.png`;
      const filePath = path.join(OUTPUT_FOLDER, caseType, filename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await cropped.toFile(filePath);

      letters.push({
        label,
        case: caseType,
        imagePath: `/letters/${caseType}/${filename}`,
        timestamp,
      });
    } catch (err) {
      console.warn(`❌ Failed to crop '${label}':`, err.message);
      failed.push({
        timestamp,
        case: caseType,
        image: `/uploads/${path.basename(imagePath)}`,
        box,
        reason: err.message,
      });
    }
  }

  if (failed.length > 0) {
    try {
      let existing = [];
      try {
        const json = await fs.readFile(MALFORMED_FILE, 'utf-8');
        existing = JSON.parse(json);
      } catch {}
      existing.push(...failed);
      await fs.mkdir(path.dirname(MALFORMED_FILE), { recursive: true });
      await fs.writeFile(MALFORMED_FILE, JSON.stringify(existing, null, 2));
    } catch (err) {
      console.error('⚠️ Failed to write malformed log:', err.message);
    }
  }

  return letters;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new IncomingForm({ keepExtensions: true, uploadDir: './public/uploads' });

  form.parse(req, async (err, fields, files) => {
    try {
      const uploaded = files.file?.[0];
      const caseType = fields.case?.[0] || 'lower';
      if (!uploaded) return res.status(400).json({ error: 'Missing file' });

      let imagePath = uploaded.filepath;
      if (uploaded.originalFilename.endsWith('.pdf')) {
        const pngs = await convertPdfToPng(uploaded.filepath, './public/uploads');
        if (!pngs.length) throw new Error('PDF conversion failed');
        imagePath = pngs[0];
      }

      const timestamp = Date.now();
      const boxes = await detectGridBoxes(imagePath);
      const letters = await extractLetters(imagePath, boxes, caseType, timestamp);

      let existing = [];
      try {
        const json = await fs.readFile(TRAINING_FILE, 'utf-8');
        existing = JSON.parse(json);
      } catch {}

      existing.push(...letters);
      await fs.mkdir(path.dirname(TRAINING_FILE), { recursive: true });
      await fs.writeFile(TRAINING_FILE, JSON.stringify(existing, null, 2));

      res.status(200).json({
        message: `✅ Vision grid: ${letters.length} letters saved`,
        letters,
      });
    } catch (err) {
      console.error('❌ train-letter-vision error:', err);
      res.status(500).json({ error: err.message || 'Unexpected error' });
    }
  });
}
