import fs from 'fs/promises';
import path from 'path';

const trainingPath = path.join(process.cwd(), 'data', 'handwriting-training.json');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { correctedText, accuracy } = req.body;

  // Log correction for now (you can expand this with more metadata later)
  const newEntry = {
    text: correctedText,
    accuracy,
    source: accuracy === 100 ? '100percent' : 'correction',
    timestamp: Date.now()
  };

  try {
    // Load existing data or initialize an empty array
    let existing = [];
    try {
      const file = await fs.readFile(trainingPath, 'utf-8');
      existing = JSON.parse(file);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e; // Ignore if file doesn't exist yet
    }

    existing.push(newEntry);
    await fs.writeFile(trainingPath, JSON.stringify(existing, null, 2));
    res.status(200).json({ status: 'ok', saved: true });
  } catch (err) {
    console.error('Failed to save training data:', err);
    res.status(500).json({ error: 'Failed to save training data' });
  }
}
