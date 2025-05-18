import formidable from 'formidable';
import fs from 'fs/promises';
import OpenAI from 'openai';
export const config = {
  api: { bodyParser: false }
};
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const systemPrompt = `
You are an OCR assistant that extracts a single handwritten letter from an image.
Only return the most likely letter (a–z or A–Z). Do not explain. Just give the character.
`;
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const form = formidable({ multiples: false, uploadDir: './public/uploads', keepExtensions: true });
  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    const file = files.file?.[0] || files.file;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageBuffer = await fs.readFile(file.filepath);
    const base64Image = imageBuffer.toString('base64');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });
    const gptGuess = response.choices[0].message.content?.trim();
    return res.status(200).json({ guess: gptGuess });
  } catch (err) {
    console.error('Upload letter error:', err);
    return res.status(500).json({ error: 'Failed to process letter image.' });
  }
}