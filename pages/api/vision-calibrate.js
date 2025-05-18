import { formidable } from 'formidable';
import fs from 'fs/promises';
import OpenAI from 'openai';
export const config = {
  api: { bodyParser: false }
};
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const stylePrompt = `
You are a masterful interpreter of scanned handwriting. The handwriting belongs to a literary author with a poetic, psychologically rich style.
Your task is to extract the text and reconstruct it faithfully in the author's voice, prioritising emotional tone, sentence rhythm, and stylistic nuance.
Return only the cleaned text. Do not explain. Write as if it came straight from the author's mind.
`;
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const form = formidable({ multiples: false });
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
    const fileData = await fs.readFile(file.filepath);
    const base64Image = fileData.toString('base64');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: stylePrompt },
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
    const cleanedText = response.choices[0].message.content;
    return res.status(200).json({
      status: 'success',
      cleanedText,
      score: 100,  // Placeholder for real calibration score later
      message: "Lulu has read this scan. 🧠 She's getting to know your handprint."
    });
  } catch (err) {
    console.error('Vision calibration error:', err);
    return res.status(500).json({ error: 'Failed to process with GPT-4o Vision.' });
  }
}