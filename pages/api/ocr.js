import formidable from 'formidable';
import fs from 'fs/promises';
export const config = { api: { bodyParser: false } };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const form = formidable({ keepExtensions: true, multiples: false });
  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });
    console.log('FILES:', files);
    const file = files.file?.[0] || files.file;
    if (!file || !file.filepath) {
      console.error('❌ No file path found in uploaded file:', file);
      return res.status(400).json({ error: 'Invalid file upload structure' });
    }
    const buffer = await fs.readFile(file.filepath);
    const base64Image = buffer.toString('base64');
    const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content: base64Image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }],
      }),
    });
    const raw = await visionRes.text();
    console.log('RAW OCR RESPONSE:', raw.slice(0, 300));
    const json = JSON.parse(raw);
    const text = json?.responses?.[0]?.fullTextAnnotation?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    console.error('❌ OCR API Error:', err);
    return res.status(500).json({ error: 'OCR failed', debug: err.message });
  }
}
