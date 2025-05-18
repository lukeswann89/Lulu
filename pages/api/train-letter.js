import { formidable } from 'formidable';
import { exec } from 'child_process';
import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = { api: { bodyParser: false } };

const OUTPUT_FOLDER = './public/letters';
const TRAINING_FILE = './data/handwriting-training.json';

function generateLetterBoxes(width, height) {
  const rows = 6;
  const cols = 5;
  const boxWidth = width / cols;
  const boxHeight = height / rows;

  const labels = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const boxes = [];

  let i = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const label = labels[i] || '-';
      boxes.push({
        label,
        x: Math.floor(col * boxWidth),
        y: Math.floor(row * boxHeight),
        width: Math.floor(boxWidth),
        height: Math.floor(boxHeight),
      });
      i++;
    }
  }

  return boxes;
}

async function extractLettersFromImage(imgPath, caseType) {
  const image = sharp(imgPath);
  const metadata = await image.metadata();

  console.log(`🖼 Image size: ${metadata.width} x ${metadata.height}`);

  const boxes = generateLetterBoxes(metadata.width, metadata.height);
  const timestamp = Date.now();
  const letters = [];

  for (const box of boxes) {
    if (box.label === '-') continue;

    const { x: left, y: top, width, height } = box;

    const safeWidth = Math.max(1, Math.min(width, metadata.width - left));
    const safeHeight = Math.max(1, Math.min(height, metadata.height - top));

    if (left < 0 || top < 0 || safeWidth <= 0 || safeHeight <= 0) {
      console.warn(`⚠️ Skipping '${box.label}' — invalid bounds: [${left}, ${top}, ${safeWidth}, ${safeHeight}]`);
      continue;
    }

    try {
      console.log(`🔎 Cropping '${box.label}' at [${left}, ${top}, ${safeWidth}, ${safeHeight}]`);

      const cropped = await image.extract({
        left,
        top,
        width: safeWidth,
        height: safeHeight,
      });

      const filename = `${caseType}-${box.label}-${timestamp}-${uuidv4().slice(0, 6)}.png`;
      const filePath = path.join(OUTPUT_FOLDER, caseType, filename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await cropped.toFile(filePath);

      letters.push({
        label: box.label,
        case: caseType,
        imagePath: `/letters/${caseType}/${filename}`,
        timestamp,
      });
    } catch (cropErr) {
      console.warn(`❌ Failed to crop '${box.label}':`, cropErr.message);
      continue;
    }
  }

  return letters;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ keepExtensions: true, uploadDir: './public/uploads' });

  form.parse(req, async (err, fields, files) => {
    try {
      const uploaded = files.file?.[0];
      const caseType = fields.case?.[0] || 'lower';

      if (!uploaded) return res.status(400).json({ error: 'Missing file' });

      let imagePaths = [];

      if (uploaded.originalFilename.endsWith('.pdf')) {
        const prefix = `pdf_temp_${Date.now()}`;
        const fullPrefix = path.join(process.cwd(), 'public/uploads', prefix);
        const command = `pdftoppm -png "${uploaded.filepath}" "${fullPrefix}"`;

        await new Promise((resolve, reject) => {
          exec(command, (error) => (error ? reject(error) : resolve()));
        });

        const allFiles = await fs.readdir('./public/uploads');
        imagePaths = allFiles
          .filter(f => f.startsWith(path.basename(fullPrefix)) && f.endsWith('.png'))
          .map(f => path.join('./public/uploads', f));
      } else {
        imagePaths = [uploaded.filepath];
      }

      const allLetters = [];
      for (const path of imagePaths) {
        const letters = await extractLettersFromImage(path, caseType);
        allLetters.push(...letters);
      }

      let existing = [];
      try {
        const json = await fs.readFile(TRAINING_FILE, 'utf-8');
        existing = JSON.parse(json);
      } catch (e) {}

      existing.push(...allLetters);
      await fs.writeFile(TRAINING_FILE, JSON.stringify(existing, null, 2));

      res.status(200).json({
        message: `✅ Uploaded and processed ${allLetters.length} letter boxes.`,
        letters: allLetters,
      });
    } catch (err) {
      console.error('❌ train-letter error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
