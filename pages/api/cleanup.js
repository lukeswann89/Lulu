export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text } = req.body;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Clean up messy OCR text so it reads like normal typed text.' },
          { role: 'user', content: text },
        ],
        temperature: 0.4,
      }),
    });
    const data = await response.json();
    const cleanedText = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ cleanedText });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ error: 'Failed to clean text' });
  }
}