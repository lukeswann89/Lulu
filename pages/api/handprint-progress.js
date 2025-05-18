import path from 'path';
import fs from 'fs/promises';
export default async function handler(req, res) {
  const filePath = path.join(process.cwd(), 'public', 'data', 'handprint_progress.json');
  try {
    const json = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(json);
    res.status(200).json(data);
  } catch (err) {
    console.error('Failed to load handprint progress:', err);
    res.status(500).json({ error: 'Could not read handprint progress data.' });
  }
}