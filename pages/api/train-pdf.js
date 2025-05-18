import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-poppler';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), '/public/uploads');
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload error' });

    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const pdfPath = file.filepath;
      const outputDir = path.join(process.cwd(), '/public/uploads', uuidv4());
      await fs.mkdir(outputDir, { recursive: true });

      const options = {
        format: 'jpeg',
        out_dir: outputDir,
        out_prefix: 'page',
        page: null,
      };

      await pdf.convert(pdfPath, options);
      const files = await fs.readdir(outputDir);
      const images = files
        .filter((f) => f.endsWith('.jpg'))
        .map((f) => `/uploads/${path.basename(outputDir)}/${f}`);

      return res.status(200).json({ images });
    } catch (e) {
      return res.status(500).json({ error: 'Conversion failed: ' + e.message });
    }
  });
}
