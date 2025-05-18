import fs from 'fs';
import path from 'path';
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const uploadsPath = path.resolve('./public/uploads');
    const files = fs.readdirSync(uploadsPath);
    const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i));
    return res.status(200).json({ files: imageFiles });
  } catch (err) {
    console.error('Failed to list uploaded files:', err);
    return res.status(500).json({ error: 'Failed to read uploads folder.' });
  }
}