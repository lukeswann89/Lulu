import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
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
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required.' });
    }
    const filePath = path.resolve('./public/uploads', filename);
    const fileData = await fs.readFile(filePath);
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
    return res.status(200).json({ cleanedText });
  } catch (err) {
    console.error('Vision read error:', err);
    return res.status(500).json({ error: 'Failed to process image with GPT-4o Vision.' });
  }
}