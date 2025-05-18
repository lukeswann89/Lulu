import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { filename, rows = 5, cols = 6 } = req.body;
  if (!filename) return res.status(400).json({ error: 'Missing filename' });
  const srcPath = path.join(process.cwd(), 'public', 'uploads', filename);
  const baseName = path.parse(filename).name;
  const outputDir = path.join(process.cwd(), 'public', 'uploads', baseName);
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const image = sharp(srcPath);
    const metadata = await image.metadata();
    const width = Math.floor(metadata.width / cols);
    const height = Math.floor(metadata.height / rows);
    const croppedPaths = [];
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = col * width;
        const top = row * height;
        const letterName = String.fromCharCode(97 + index); // a-z
        const outputFile = path.join(outputDir, `${letterName}.jpg`);
        await image.extract({ left, top, width, height }).toFile(outputFile);
        croppedPaths.push(`/uploads/${baseName}/${letterName}.jpg`);
        index++;
        if (index >= 26) break;
      }
    }
    res.status(200).json({ success: true, images: croppedPaths });
  } catch (err) {
    console.error('Cropping failed:', err);
    res.status(500).json({ error: 'Failed to crop image' });
  }
}