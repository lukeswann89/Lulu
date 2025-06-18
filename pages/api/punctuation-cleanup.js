import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid text input' 
      });
    }

    // Skip if text is too short or already has punctuation
    if (text.length < 20 || text.match(/[.!?]/)) {
      return res.status(200).json({
        success: true,
        cleanedText: text
      });
    }

    const systemPrompt = `You are a punctuation assistant. Your job is to add proper punctuation and capitalization to speech transcripts.

RULES:
1. Keep all original words exactly as they are - do not change, add, or remove words
2. Only add punctuation marks (periods, commas, question marks, exclamation points)
3. Add paragraph breaks where natural pauses in speech would occur
4. Capitalize the first letter of sentences and proper nouns
5. Return ONLY the corrected text with no additional commentary

EXAMPLE:
Input: "hello my name is john i live in london what is your name"
Output: "Hello, my name is John. I live in London. What is your name?"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Add punctuation to: ${text}` }
      ],
      temperature: 0.3,
      max_tokens: Math.min(text.length * 2, 1000) // Reasonable token limit
    });

    const cleanedText = completion.choices[0].message.content.trim();
    
    // Validate that the response is reasonable
    if (!cleanedText || cleanedText.length < text.length * 0.5) {
      throw new Error('Invalid punctuation response');
    }

    res.status(200).json({
      success: true,
      cleanedText
    });

  } catch (error) {
    console.error('Punctuation cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process punctuation',
      cleanedText: req.body.text // Return original text as fallback
    });
  }
}