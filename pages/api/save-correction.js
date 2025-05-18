import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { ocr, confirmed } = req.body;
    const correctionsPath = path.join(process.cwd(), 'data', 'corrections.json');
    const existing = await fs.readFile(correctionsPath, 'utf-8').then(JSON.parse).catch(() => []);

    const newEntry = {
      ocr,
      confirmed,
      timestamp: Date.now()
    };

    await fs.writeFile(correctionsPath, JSON.stringify([...existing, newEntry], null, 2));
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save correction.' });
  }
}
