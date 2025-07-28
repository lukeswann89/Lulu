import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // --- ARCHITECT'S NOTE: Enhanced Logging ---
  console.log(`[API /get-edits-for-goal] Received request at ${new Date().toISOString()}`);

  if (req.method !== 'POST') {
    console.warn('[API /get-edits-for-goal] Blocked non-POST request.');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { goal, manuscriptText } = req.body;

  // --- ARCHITECT'S NOTE: Enhanced Logging ---
  console.log(`[API /get-edits-for-goal] Processing goal: "${goal ? goal.slice(0, 50) : 'MISSING'}"...`);

  if (!goal || !manuscriptText) {
    console.error('[API /get-edits-for-goal] Bad Request: Missing goal or manuscriptText.');
    return res.status(400).json({ message: 'Bad Request: Both "goal" and "manuscriptText" are required.' });
  }

  const systemPrompt = `
    You are an expert developmental editor named Lulu. Your sole task is to generate the specific,
    non-conflicting, sentence-level edits required to achieve a single, high-level substantive goal.

    Analyze the provided manuscript text in light of this one goal.

    The user's high-level goal is: "${goal}"

    You must return a JSON array of suggestion objects. Each object in the array must have the following structure:
    {
      "original": "The original sentence or phrase from the manuscript.",
      "suggestion": "Your improved version of that sentence or phrase.",
      "why": "A concise, kind explanation of why you made the change, referencing the high-level goal.", 
      "severity": "A string, either 'Critical' or 'Suggested'."
    }

    If no edits are necessary to achieve the goal for the given text, return an empty array.

    // --- ARCHITECT'S NOTE: This is the required addition. ---
    Your entire response must be a single, valid JSON object, and nothing else.
  `;

  try {
    console.log('[API /get-edits-for-goal] Sending request to OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: manuscriptText },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    console.log('[API /get-edits-for-goal] Successfully received response from OpenAI.');

    const responseData = JSON.parse(response.choices[0].message.content);
    const editsArray = Array.isArray(responseData)
        ? responseData
        : responseData.edits || responseData.suggestions || [];

    return res.status(200).json(editsArray);

  } catch (error) {
    // --- ARCHITECT'S NOTE: Detailed Error Logging ---
    console.error("[API /get-edits-for-goal] CRITICAL ERROR during OpenAI interaction:", error);

    // Provide more specific error information to the client if possible
    if (error.response) { // Error from OpenAI API itself
      console.error("[API /get-edits-for-goal] OpenAI API Error Body:", error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }

    // Generic server error
    return res.status(500).json({ message: 'An internal server error occurred while communicating with the AI.' });
  }
} 