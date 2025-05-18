import path from 'path';
import fs from 'fs/promises';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guesses, style } = req.body;
  if (!guesses || !style || typeof guesses !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid guesses or style.' });
  }
  const filePath = path.join(process.cwd(), 'public', 'data', 'handprint_progress.json');
  try {
    const json = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(json);
    Object.entries(guesses).forEach(([letter, val]) => {
      if (!data[letter]) return;
      const entry = data[letter][style];
      if (!entry) return;
      entry.confirmed = true;
      entry.sources.Handprint = Math.min(entry.sources.Handprint + 100, 100);
    });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.status(200).json({ success: true, updated: guesses });
  } catch (err) {
    console.error('Failed to confirm batch:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}