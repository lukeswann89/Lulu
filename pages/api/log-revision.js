import fs from 'fs/promises';
import path from 'path';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'revision-log.json');
  try {
    // Ensure logs folder exists
    await fs.mkdir(logDir, { recursive: true });
    // Read current log or start new array
    let existing = [];
    try {
      const data = await fs.readFile(logFile, 'utf-8');
      existing = JSON.parse(data);
    } catch (_) {}
    const { text, editType, mode, rewrittenText, suggestions } = req.body;
    const entry = {
      timestamp: new Date().toISOString(),
      mode,
      editType,
      text,
      output: mode === 'Rewrite' ? rewrittenText : suggestions
    };
    // Append to log and save
    existing.push(entry);
    await fs.writeFile(logFile, JSON.stringify(existing, null, 2));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Log error:', err);
    return res.status(500).json({ error: 'Logging failed' });
  }
}