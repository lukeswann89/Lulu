import { formidable } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ keepExtensions: true, uploadDir: './public/uploads' });

  form.parse(req, async (err, fields, files) => {
    try {
      const file = files.file?.[0];
      if (!file || !file.originalFilename.endsWith('.pdf')) {
        return res.status(400).json({ error: 'Please upload a PDF file.' });
      }

      const uploadPath = file.filepath;

      // Set output prefix
      const timestamp = Date.now();
      const baseName = `pdf_${timestamp}`;
      const outputPrefix = path.join(process.cwd(), 'public/uploads', baseName);

      // Run Poppler command
      const command = `pdftoppm -png "${uploadPath}" "${outputPrefix}"`;

      exec(command, async (error, stdout, stderr) => {
        if (error) {
          console.error('❌ PDF conversion error:', error);
          return res.status(500).json({ error: 'Failed to convert PDF to images' });
        }

        // List generated files
        const filesInUploads = await fs.readdir(path.join(process.cwd(), 'public/uploads'));
        const imageFiles = filesInUploads
          .filter(name => name.startsWith(baseName) && name.endsWith('.png'))
          .map(name => `/uploads/${name}`);

        res.status(200).json({ images: imageFiles });
      });
    } catch (err) {
      console.error('❌ PDF handler error:', err);
      res.status(500).json({ error: 'Internal error processing PDF' });
    }
  });
}
