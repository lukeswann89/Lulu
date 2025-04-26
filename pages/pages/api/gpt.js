export default async function handler(req, res) {
  const { text, editType, mode } = req.body;
  const prompt = `You are Lulu, a world-class literary mentor.
Edit Type: ${editType}
Mode: ${mode}
Text: """
${text}
"""
Return structured suggestions in JSON format like:
[{"original":"original text","suggestion":"new text","why":"reason for change"}]
`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    res.status(200).json({ suggestions: parsed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse AI response.' });
  }
}
