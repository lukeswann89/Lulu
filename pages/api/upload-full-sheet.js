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
You are an OCR assistant reviewing a scanned handwriting sheet.
It contains all 26 lowercase or uppercase letters (A–Z or a–z), each written inside a square box.
Your task is to read the image and return a JSON object with each expected letter as the key (e.g. "a", "b", ..., "z") and the recognized handwritten character as the value.
If the handwriting is clear, return the matching character.
If it's unclear or empty, return "" for that letter.
Only output the raw JSON like this:
{
  "a": "a",
  "b": "b",
  ...
}
Do not include explanations.
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
    const result = response.choices[0].message.content?.trim();
    const jsonGuess = result ? JSON.parse(result) : {};
    res.status(200).json({ guesses: jsonGuess });

  } catch (err) {
    console.error('Failed to process full sheet:', err);
    res.status(500).json({ error: 'Failed to analyze full calibration sheet.' });
  }
}