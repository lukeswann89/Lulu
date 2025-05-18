import fs from 'fs';
import path from 'path';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { filename, gptText, userRevision } = req.body;
    if (!gptText || !userRevision) {
      return res.status(400).json({ error: 'Missing data in request' });
    }
    const logEntry = {
      filename: filename || 'unknown',
      gptText,
      userRevision,
      timestamp: new Date().toISOString()
    };
    const logPath = path.resolve('./logs/trainer-log.json');
    const existing = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
    existing.push(logEntry);
    fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
    return res.status(200).json({ message: 'Revision logged successfully.' });
  } catch (err) {
    console.error('Log trainer revision error:', err);
    return res.status(500).json({ error: 'Failed to log revision.' });
  }
}