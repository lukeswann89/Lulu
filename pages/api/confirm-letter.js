import path from 'path';
import fs from 'fs/promises';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { letter, style, guess } = req.body;
  const filePath = path.join(process.cwd(), 'public', 'data', 'handprint_progress.json');

  try {
    const json = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(json);

    if (!data[letter]) return res.status(404).json({ error: 'Letter not found' });
    const entry = data[letter][style];
    if (!entry) return res.status(404).json({ error: 'Style not found' });

    entry.confirmed = true;
    entry.sources.Handprint = Math.min((entry.sources.Handprint || 0) + 100, 100);
    entry.gptGuess = guess;

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.status(200).json({ success: true, updated: data[letter] });
  } catch (err) {
    console.error('Error updating confirmation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}